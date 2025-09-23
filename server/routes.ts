import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { insertUserSchema, insertPromotionSchema } from "@shared/schema";
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

// Passport configuration
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Authentication required' });
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user?.role === 'admin') {
      return next();
    }
    res.status(403).json({ message: 'Admin access required' });
  };

  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      
      // Log in the user
      req.login(user, (err: any) => {
        if (err) {
          return res.status(500).json({ message: 'Registration successful but login failed' });
        }
        res.json({ user: { ...user, password: undefined } });
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    res.json({ user: { ...req.user, password: undefined } });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: { ...req.user, password: undefined } });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // User routes
  app.get('/api/user/balance', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser((req.user as any).id);
      res.json({
        coinBalance: user?.coinBalance || 0,
        pointBalance: user?.pointBalance || 0,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/user/transactions', requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getUserTransactions((req.user as any).id);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/user/promotions/redeemed', requireAuth, async (req, res) => {
    try {
      const redemptions = await storage.getUserPromotionRedemptions((req.user as any).id);
      res.json(redemptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Promotion routes
  app.get('/api/promotions', async (req, res) => {
    try {
      const promotions = await storage.getActivePromotions();
      res.json(promotions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/promotions/redeem/:id', requireAuth, async (req, res) => {
    try {
      const promotionId = req.params.id;
      const promotions = await storage.getActivePromotions();
      const promotion = promotions.find(p => p.id === promotionId);
      
      if (!promotion) {
        return res.status(404).json({ message: 'Promotion not found or expired' });
      }
      
      // Check if user already redeemed this promotion
      const userRedemptions = await storage.getUserPromotionRedemptions((req.user as any).id);
      const alreadyRedeemed = userRedemptions.some(r => r.promotion.id === promotionId);
      
      if (alreadyRedeemed) {
        return res.status(400).json({ message: 'Promotion already redeemed' });
      }
      
      // Calculate rewards based on promotion type
      let pointsEarned = 0;
      let coinsEarned = 0;
      
      if (promotion.type === 'bonus_points') {
        pointsEarned = promotion.value;
      } else if (promotion.type === 'extra_coins') {
        coinsEarned = promotion.value;
      }
      
      // Redeem promotion
      await storage.redeemPromotion({
        userId: (req.user as any).id,
        promotionId,
        pointsEarned,
        coinsEarned,
      });
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance((req.user as any).id, coinsEarned, pointsEarned);
      
      // Log transaction
      await storage.createTransaction({
        userId: (req.user as any).id,
        type: 'promotion',
        coinsAdded: coinsEarned,
        pointsEarned,
        description: `Redeemed promotion: ${promotion.title}`,
        status: 'completed',
      });
      
      res.json({
        message: 'Promotion redeemed successfully',
        pointsEarned,
        coinsEarned,
        newBalance: {
          coinBalance: updatedUser.coinBalance,
          pointBalance: updatedUser.pointBalance,
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment routes
  app.post('/api/create-payment-intent', requireAuth, async (req, res) => {
    try {
      const { packageType } = req.body;
      
      // Define coin packages
      const packages = {
        starter: { coins: 500, points: 50, price: 5.00 },
        gamer: { coins: 1200, points: 150, price: 10.00 },
        pro: { coins: 2500, points: 400, price: 20.00 },
        elite: { coins: 5500, points: 1000, price: 40.00 },
      };
      
      const pkg = packages[packageType as keyof typeof packages];
      if (!pkg) {
        return res.status(400).json({ message: 'Invalid package type' });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(pkg.price * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId: (req.user as any).id,
          packageType,
          coins: pkg.coins.toString(),
          points: pkg.points.toString(),
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: 'Error creating payment intent: ' + error.message });
    }
  });

  app.post('/api/payment/confirm', requireAuth, async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const { userId, packageType, coins, points } = paymentIntent.metadata;
        
        if (userId !== (req.user as any).id) {
          return res.status(400).json({ message: 'Payment intent user mismatch' });
        }
        
        const coinsToAdd = parseInt(coins);
        const pointsToEarn = parseInt(points);
        
        // Update user balance
        const updatedUser = await storage.updateUserBalance(userId, coinsToAdd, pointsToEarn);
        
        // Log transaction
        await storage.createTransaction({
          userId,
          type: 'purchase',
          amount: (paymentIntent.amount / 100).toString(),
          coinsAdded: coinsToAdd,
          pointsEarned: pointsToEarn,
          description: `Purchased ${packageType} package`,
          stripePaymentIntentId: paymentIntentId,
          status: 'completed',
        });
        
        res.json({
          message: 'Payment confirmed successfully',
          newBalance: {
            coinBalance: updatedUser.coinBalance,
            pointBalance: updatedUser.pointBalance,
          }
        });
      } else {
        res.status(400).json({ message: 'Payment not completed' });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin routes
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(user => ({ ...user, password: undefined }));
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
    try {
      const [salesAnalytics, userAnalytics] = await Promise.all([
        storage.getSalesAnalytics(),
        storage.getUserAnalytics(),
      ]);
      
      res.json({
        ...salesAnalytics,
        ...userAnalytics,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/admin/transactions', requireAdmin, async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/admin/promotions', requireAdmin, async (req, res) => {
    try {
      const promotions = await storage.getAllPromotions();
      res.json(promotions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/admin/promotions', requireAdmin, async (req, res) => {
    try {
      const validatedData = insertPromotionSchema.parse(req.body);
      const promotion = await storage.createPromotion(validatedData);
      
      await storage.logAdminAction({
        adminId: (req.user as any).id,
        action: 'create_promotion',
        description: `Created promotion: ${promotion.title}`,
        metadata: { promotionId: promotion.id },
      });
      
      res.json(promotion);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put('/api/admin/promotions/:id', requireAdmin, async (req, res) => {
    try {
      const promotionId = req.params.id;
      const updates = req.body;
      
      const promotion = await storage.updatePromotion(promotionId, updates);
      
      await storage.logAdminAction({
        adminId: (req.user as any).id,
        action: 'update_promotion',
        description: `Updated promotion: ${promotion.title}`,
        metadata: { promotionId },
      });
      
      res.json(promotion);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/admin/promotions/:id', requireAdmin, async (req, res) => {
    try {
      const promotionId = req.params.id;
      
      await storage.deletePromotion(promotionId);
      
      await storage.logAdminAction({
        adminId: (req.user as any).id,
        action: 'delete_promotion',
        description: `Deleted promotion`,
        metadata: { promotionId },
      });
      
      res.json({ message: 'Promotion deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/admin/topup', requireAdmin, async (req, res) => {
    try {
      const { userId, coins, points, reason } = req.body;
      
      // Validate input
      const coinsToAdd = parseInt(coins) || 0;
      const pointsToAdd = parseInt(points) || 0;
      
      if (coinsToAdd <= 0 && pointsToAdd <= 0) {
        return res.status(400).json({ message: 'Must specify coins or points to add' });
      }
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(userId, coinsToAdd, pointsToAdd);
      
      // Log transaction
      await storage.createTransaction({
        userId,
        type: 'admin_topup',
        coinsAdded: coinsToAdd,
        pointsEarned: pointsToAdd,
        description: `Admin top-up: ${reason || 'No reason provided'}`,
        status: 'completed',
      });
      
      // Log admin action
      await storage.logAdminAction({
        adminId: (req.user as any).id,
        targetUserId: userId,
        action: 'topup',
        description: `Added ${coinsToAdd} coins and ${pointsToAdd} points to user account`,
        metadata: { coins: coinsToAdd, points: pointsToAdd, reason },
      });
      
      res.json({
        message: 'Top-up completed successfully',
        newBalance: {
          coinBalance: updatedUser.coinBalance,
          pointBalance: updatedUser.pointBalance,
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
