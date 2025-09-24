import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import session from "express-session";
import pgSession from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { insertUserSchema, insertPromotionSchema, insertRewardSchema } from "@shared/schema";
import { z } from "zod";

const PgSession = pgSession(session);


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
  // Session configuration with PostgreSQL store
  app.use(session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    console.log('Auth check:', {
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      user: req.user ? { id: req.user.id, email: req.user.email } : null,
      cookies: req.headers.cookie
    });
    
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

  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return res.status(500).json({ message: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Invalid email or password' });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: 'Login failed' });
        }
        res.json({ user: { ...user, password: undefined } });
      });
    })(req, res, next);
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
    console.log('Auth me check:', {
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      user: req.user ? { id: req.user.id, email: req.user.email } : null,
      session: req.session ? { 
        cookie: req.session.cookie,
        passport: req.session.passport 
      } : null,
      cookies: req.headers.cookie
    });
    
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
      const { startDate, endDate, type, status, userId } = req.query as Record<string, string | undefined>;
      const hasAnyFilter = startDate || endDate || type || status || userId;

      if (!hasAnyFilter) {
        const transactions = await storage.getAllTransactions();
        return res.json(transactions);
      }

      const parsedStart = startDate ? new Date(startDate) : undefined;
      const parsedEnd = endDate ? new Date(endDate) : undefined;

      const transactions = await storage.getTransactionsFiltered({
        startDate: parsedStart,
        endDate: parsedEnd,
        type: type || undefined,
        status: status || undefined,
        userId: userId || undefined,
      });

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
      const { userId, coins, amount, reason } = req.body;
      
      // Validate and normalize input
      const coinsToAdd = Number.isFinite(Number(coins)) ? parseInt(coins) : 0;
      const amountPesos = Number.isFinite(Number(amount)) ? parseFloat(amount) : 0;
      
      if ((coinsToAdd || 0) <= 0 && (amountPesos || 0) <= 0) {
        return res.status(400).json({ message: 'Must specify amount and/or coins to add' });
      }
      
      // Compute points: 1 point per ₱50 spent
      const pointsToAdd = Math.floor((amountPesos || 0) / 50);
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(userId, coinsToAdd || 0, pointsToAdd);
      
      // Log transaction as a cashier purchase
      await storage.createTransaction({
        userId,
        type: 'purchase',
        amount: amountPesos ? amountPesos.toFixed(2) : undefined,
        coinsAdded: coinsToAdd || 0,
        pointsEarned: pointsToAdd,
        description: `Cashier purchase: ₱${(amountPesos || 0).toFixed(2)} for ${coinsToAdd || 0} coins${reason ? ` — ${reason}` : ''}`,
        status: 'completed',
      });
      
      // Log admin action
      await storage.logAdminAction({
        adminId: (req.user as any).id,
        targetUserId: userId,
        action: 'topup',
        description: `Processed cashier purchase of ₱${(amountPesos || 0).toFixed(2)} awarding ${pointsToAdd} points and ${coinsToAdd || 0} coins`,
        metadata: { coins: coinsToAdd || 0, amount: amountPesos || 0, computedPoints: pointsToAdd, reason },
      });
      
      res.json({
        message: 'Top-up recorded as purchase and points awarded',
        computedPoints: pointsToAdd,
        newBalance: {
          coinBalance: updatedUser.coinBalance,
          pointBalance: updatedUser.pointBalance,
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reward routes
  app.get('/api/rewards', async (req, res) => {
    try {
      const rewards = await storage.getActiveRewards();
      res.json(rewards);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/rewards/:id', async (req, res) => {
    try {
      const reward = await storage.getRewardById(req.params.id);
      if (!reward) {
        return res.status(404).json({ message: 'Reward not found' });
      }
      res.json(reward);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/rewards/redeem/:id', requireAuth, async (req, res) => {
    try {
      const reward = await storage.getRewardById(req.params.id);
      if (!reward) {
        return res.status(404).json({ message: 'Reward not found' });
      }
      
      if (!reward.isActive || reward.stock <= 0) {
        return res.status(400).json({ message: 'Reward not available' });
      }

      const redemption = await storage.redeemReward({
        userId: (req.user as any).id,
        rewardId: req.params.id,
        pointsSpent: reward.pointsRequired,
        status: 'pending',
        redemptionCode: `RWD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      });

      res.json(redemption);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/user/rewards/redemptions', requireAuth, async (req, res) => {
    try {
      const redemptions = await storage.getUserRewardRedemptions((req.user as any).id);
      res.json(redemptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin reward routes
  app.get('/api/admin/rewards', requireAdmin, async (req, res) => {
    try {
      const rewards = await storage.getAllRewards();
      res.json(rewards);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/admin/rewards', requireAdmin, async (req, res) => {
    try {
      const validatedData = insertRewardSchema.parse(req.body);
      const reward = await storage.createReward(validatedData);
      
      // Log admin action
      await storage.logAdminAction({
        adminId: (req.user as any).id,
        action: 'create_reward',
        description: `Created reward: ${reward.title}`,
        metadata: { rewardId: reward.id },
      });

      res.json(reward);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put('/api/admin/rewards/:id', requireAdmin, async (req, res) => {
    try {
      const reward = await storage.updateReward(req.params.id, req.body);
      
      // Log admin action
      await storage.logAdminAction({
        adminId: (req.user as any).id,
        action: 'update_reward',
        description: `Updated reward: ${reward.title}`,
        metadata: { rewardId: reward.id },
      });

      res.json(reward);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/admin/rewards/:id', requireAdmin, async (req, res) => {
    try {
      const reward = await storage.getRewardById(req.params.id);
      if (!reward) {
        return res.status(404).json({ message: 'Reward not found' });
      }

      await storage.deleteReward(req.params.id);
      
      // Log admin action
      await storage.logAdminAction({
        adminId: (req.user as any).id,
        action: 'delete_reward',
        description: `Deleted reward: ${reward.title}`,
        metadata: { rewardId: reward.id },
      });

      res.json({ message: 'Reward deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/admin/rewards/redemptions', requireAdmin, async (req, res) => {
    try {
      const redemptions = await storage.getAllRewardRedemptions();
      res.json(redemptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put('/api/admin/rewards/redemptions/:id/status', requireAdmin, async (req, res) => {
    try {
      const { status, notes } = req.body;
      await storage.updateRewardRedemptionStatus(req.params.id, status, notes);
      
      // Log admin action
      await storage.logAdminAction({
        adminId: (req.user as any).id,
        action: 'update_reward_redemption',
        description: `Updated reward redemption status to: ${status}`,
        metadata: { redemptionId: req.params.id, status, notes },
      });

      res.json({ message: 'Redemption status updated successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin claim reward for user
  app.post('/api/admin/rewards/claim', requireAdmin, async (req, res) => {
    try {
      const { userId, rewardId } = req.body;
      
      if (!userId || !rewardId) {
        return res.status(400).json({ message: 'User ID and Reward ID are required' });
      }

      // Get reward details
      const reward = await storage.getRewardById(rewardId);
      if (!reward) {
        return res.status(404).json({ message: 'Reward not found' });
      }
      
      if (!reward.isActive || reward.stock <= 0) {
        return res.status(400).json({ message: 'Reward not available' });
      }

      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.pointBalance < reward.pointsRequired) {
        return res.status(400).json({ message: 'User has insufficient points' });
      }

      // Claim the reward
      const redemption = await storage.redeemReward({
        userId: userId,
        rewardId: rewardId,
        pointsSpent: reward.pointsRequired,
        status: 'completed', // Admin claims are automatically completed
        redemptionCode: `ADMIN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      });

      // Log admin action
      await storage.logAdminAction({
        adminId: (req.user as any).id,
        targetUserId: userId,
        action: 'admin_reward_claim',
        description: `Claimed reward "${reward.title}" for user ${user.username} (${user.email})`,
        metadata: { 
          rewardId: reward.id, 
          rewardTitle: reward.title,
          pointsSpent: reward.pointsRequired,
          redemptionId: redemption.id,
          redemptionCode: redemption.redemptionCode
        },
      });

      res.json({
        message: 'Reward claimed successfully for user',
        redemption: {
          ...redemption,
          reward,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          }
        }
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
