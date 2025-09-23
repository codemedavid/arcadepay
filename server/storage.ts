import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import { eq, desc, and, gte, lte, count, sql } from "drizzle-orm";

// Configure for Supabase compatibility
neonConfig.pipelineConnect = false;
import { 
  users, 
  transactions, 
  promotions, 
  promotionRedemptions,
  adminActions,
  type User, 
  type InsertUser,
  type Transaction,
  type InsertTransaction,
  type Promotion,
  type InsertPromotion,
  type InsertPromotionRedemption,
  type InsertAdminAction,
  type AdminAction
} from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const connectionSql = neon(process.env.DATABASE_URL);
const db = drizzle(connectionSql);

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: string, coinDelta: number, pointDelta: number): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  
  // Promotion operations
  createPromotion(promotion: InsertPromotion): Promise<Promotion>;
  getActivePromotions(): Promise<Promotion[]>;
  getAllPromotions(): Promise<Promotion[]>;
  updatePromotion(id: string, updates: Partial<Promotion>): Promise<Promotion>;
  deletePromotion(id: string): Promise<void>;
  redeemPromotion(redemption: InsertPromotionRedemption): Promise<void>;
  getUserPromotionRedemptions(userId: string): Promise<{ promotion: Promotion; redeemedAt: Date }[]>;
  
  // Admin operations
  logAdminAction(action: InsertAdminAction): Promise<void>;
  getAdminActions(): Promise<Array<AdminAction & { admin: User; targetUser?: User }>>;
  
  // Analytics
  getSalesAnalytics(): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    averageTransaction: number;
  }>;
  
  getUserAnalytics(): Promise<{
    totalUsers: number;
    activeUsers: number;
  }>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserBalance(userId: string, coinDelta: number, pointDelta: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const newCoinBalance = user.coinBalance + coinDelta;
    const newPointBalance = user.pointBalance + pointDelta;
    
    const result = await db
      .update(users)
      .set({ 
        coinBalance: newCoinBalance, 
        pointBalance: newPointBalance 
      })
      .where(eq(users.id, userId))
      .returning();
      
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction).returning();
    return result[0];
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
  }

  async createPromotion(promotion: InsertPromotion): Promise<Promotion> {
    const result = await db.insert(promotions).values(promotion).returning();
    return result[0];
  }

  async getActivePromotions(): Promise<Promotion[]> {
    const now = new Date();
    return await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.isActive, true),
          lte(promotions.startDate, now),
          gte(promotions.endDate, now)
        )
      )
      .orderBy(desc(promotions.createdAt));
  }

  async getAllPromotions(): Promise<Promotion[]> {
    return await db.select().from(promotions).orderBy(desc(promotions.createdAt));
  }

  async updatePromotion(id: string, updates: Partial<Promotion>): Promise<Promotion> {
    const result = await db
      .update(promotions)
      .set(updates)
      .where(eq(promotions.id, id))
      .returning();
    return result[0];
  }

  async deletePromotion(id: string): Promise<void> {
    await db.delete(promotions).where(eq(promotions.id, id));
  }

  async redeemPromotion(redemption: InsertPromotionRedemption): Promise<void> {
    await db.transaction(async (tx) => {
      // Create redemption record
      await tx.insert(promotionRedemptions).values(redemption);
      
      // Update promotion redemption count
      const currentPromo = await tx.select().from(promotions).where(eq(promotions.id, redemption.promotionId)).limit(1);
      if (currentPromo[0]) {
        await tx
          .update(promotions)
          .set({ 
            currentRedemptions: (currentPromo[0].currentRedemptions || 0) + 1 
          })
          .where(eq(promotions.id, redemption.promotionId));
      }
    });
  }

  async getUserPromotionRedemptions(userId: string): Promise<{ promotion: Promotion; redeemedAt: Date }[]> {
    const result = await db
      .select({
        promotion: promotions,
        redeemedAt: promotionRedemptions.redeemedAt,
      })
      .from(promotionRedemptions)
      .innerJoin(promotions, eq(promotionRedemptions.promotionId, promotions.id))
      .where(eq(promotionRedemptions.userId, userId))
      .orderBy(desc(promotionRedemptions.redeemedAt));
      
    return result.map(r => ({ promotion: r.promotion, redeemedAt: r.redeemedAt! }));
  }

  async logAdminAction(action: InsertAdminAction): Promise<void> {
    await db.insert(adminActions).values(action);
  }

  async getAdminActions(): Promise<Array<AdminAction & { admin: User; targetUser?: User }>> {
    const result = await db
      .select()
      .from(adminActions)
      .orderBy(desc(adminActions.createdAt));
      
    const enrichedResults = [];
    for (const action of result) {
      const admin = await db.select().from(users).where(eq(users.id, action.adminId)).limit(1);
      let targetUser = undefined;
      if (action.targetUserId) {
        const target = await db.select().from(users).where(eq(users.id, action.targetUserId)).limit(1);
        targetUser = target[0];
      }
      
      enrichedResults.push({
        ...action,
        admin: admin[0],
        targetUser,
      });
    }
    
    return enrichedResults;
  }

  async getSalesAnalytics(): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    averageTransaction: number;
  }> {
    const purchaseTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.type, "purchase"));
      
    const totalRevenue = purchaseTransactions.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const totalTransactions = purchaseTransactions.length;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    return {
      totalRevenue,
      totalTransactions,
      averageTransaction,
    };
  }

  async getUserAnalytics(): Promise<{
    totalUsers: number;
    activeUsers: number;
  }> {
    const totalUsers = await db.select({ count: count() }).from(users);
    const activeUsers = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.coinBalance, 1));
      
    return {
      totalUsers: totalUsers[0].count,
      activeUsers: activeUsers[0].count,
    };
  }
}

export const storage = new DbStorage();
