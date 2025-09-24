import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, and, gte, lte, count, sql } from "drizzle-orm";
import { 
  users, 
  transactions, 
  promotions, 
  promotionRedemptions,
  rewards,
  rewardRedemptions,
  adminActions,
  type User, 
  type InsertUser,
  type Transaction,
  type InsertTransaction,
  type Promotion,
  type InsertPromotion,
  type InsertPromotionRedemption,
  type Reward,
  type InsertReward,
  type RewardRedemption,
  type InsertRewardRedemption,
  type InsertAdminAction,
  type AdminAction
} from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

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
  getTransactionsFiltered(filters: {
    startDate?: Date;
    endDate?: Date;
    type?: string;
    status?: string;
    userId?: string;
  }): Promise<Transaction[]>;
  
  // Promotion operations
  createPromotion(promotion: InsertPromotion): Promise<Promotion>;
  getActivePromotions(): Promise<Promotion[]>;
  getAllPromotions(): Promise<Promotion[]>;
  updatePromotion(id: string, updates: Partial<Promotion>): Promise<Promotion>;
  deletePromotion(id: string): Promise<void>;
  redeemPromotion(redemption: InsertPromotionRedemption): Promise<void>;
  getUserPromotionRedemptions(userId: string): Promise<{ promotion: Promotion; redeemedAt: Date }[]>;
  
  // Reward operations
  createReward(reward: InsertReward): Promise<Reward>;
  getActiveRewards(): Promise<Reward[]>;
  getAllRewards(): Promise<Reward[]>;
  getRewardById(id: string): Promise<Reward | undefined>;
  updateReward(id: string, updates: Partial<Reward>): Promise<Reward>;
  deleteReward(id: string): Promise<void>;
  redeemReward(redemption: InsertRewardRedemption): Promise<RewardRedemption>;
  getUserRewardRedemptions(userId: string): Promise<Array<RewardRedemption & { reward: Reward }>>;
  getAllRewardRedemptions(): Promise<Array<RewardRedemption & { reward: Reward; user: User }>>;
  updateRewardRedemptionStatus(id: string, status: string, notes?: string): Promise<void>;
  
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

  async getTransactionsFiltered(filters: {
    startDate?: Date;
    endDate?: Date;
    type?: string;
    status?: string;
    userId?: string;
  }): Promise<Transaction[]> {
    const conditions: any[] = [];
    if (filters.startDate) {
      conditions.push(gte(transactions.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(transactions.createdAt, filters.endDate));
    }
    if (filters.type) {
      conditions.push(eq(transactions.type, filters.type));
    }
    if (filters.status) {
      conditions.push(eq(transactions.status, filters.status));
    }
    if (filters.userId) {
      conditions.push(eq(transactions.userId, filters.userId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await db
      .select()
      .from(transactions)
      .where(whereClause as any)
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

  // Reward operations
  async createReward(reward: InsertReward): Promise<Reward> {
    const [newReward] = await db.insert(rewards).values({
      ...reward,
      updatedAt: new Date(),
    }).returning();
    return newReward;
  }

  async getActiveRewards(): Promise<Reward[]> {
    return await db
      .select()
      .from(rewards)
      .where(and(eq(rewards.isActive, true), gte(rewards.stock, 1)))
      .orderBy(desc(rewards.pointsRequired));
  }

  async getAllRewards(): Promise<Reward[]> {
    return await db
      .select()
      .from(rewards)
      .orderBy(desc(rewards.createdAt));
  }

  async getRewardById(id: string): Promise<Reward | undefined> {
    const [reward] = await db
      .select()
      .from(rewards)
      .where(eq(rewards.id, id));
    return reward;
  }

  async updateReward(id: string, updates: Partial<Reward>): Promise<Reward> {
    const [updatedReward] = await db
      .update(rewards)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(rewards.id, id))
      .returning();
    return updatedReward;
  }

  async deleteReward(id: string): Promise<void> {
    await db.delete(rewards).where(eq(rewards.id, id));
  }

  async redeemReward(redemption: InsertRewardRedemption): Promise<RewardRedemption> {
    return await db.transaction(async (tx) => {
      // Check if reward exists and has stock
      const reward = await tx
        .select()
        .from(rewards)
        .where(eq(rewards.id, redemption.rewardId))
        .limit(1);
      
      if (!reward[0]) {
        throw new Error('Reward not found');
      }
      
      if (reward[0].stock <= 0) {
        throw new Error('Reward out of stock');
      }

      // Check if user has enough points
      const user = await tx
        .select()
        .from(users)
        .where(eq(users.id, redemption.userId))
        .limit(1);
      
      if (!user[0] || user[0].pointBalance < redemption.pointsSpent) {
        throw new Error('Insufficient points');
      }

      // Create redemption record
      const [newRedemption] = await tx
        .insert(rewardRedemptions)
        .values(redemption)
        .returning();

      // Update user points
      await tx
        .update(users)
        .set({
          pointBalance: user[0].pointBalance - redemption.pointsSpent,
        })
        .where(eq(users.id, redemption.userId));

      // Update reward stock
      await tx
        .update(rewards)
        .set({
          stock: reward[0].stock - 1,
        })
        .where(eq(rewards.id, redemption.rewardId));

      // Create transaction record
      await tx.insert(transactions).values({
        userId: redemption.userId,
        type: 'reward_redemption',
        coinsAdded: 0,
        pointsEarned: -redemption.pointsSpent,
        description: `Redeemed reward: ${reward[0].title}`,
        status: 'completed',
        metadata: { rewardId: redemption.rewardId, redemptionId: newRedemption.id },
      });

      return newRedemption;
    });
  }

  async getUserRewardRedemptions(userId: string): Promise<Array<RewardRedemption & { reward: Reward }>> {
    return await db
      .select({
        id: rewardRedemptions.id,
        userId: rewardRedemptions.userId,
        rewardId: rewardRedemptions.rewardId,
        pointsSpent: rewardRedemptions.pointsSpent,
        status: rewardRedemptions.status,
        redemptionCode: rewardRedemptions.redemptionCode,
        claimedAt: rewardRedemptions.claimedAt,
        completedAt: rewardRedemptions.completedAt,
        notes: rewardRedemptions.notes,
        reward: {
          id: rewards.id,
          title: rewards.title,
          description: rewards.description,
          imageUrl: rewards.imageUrl,
          pointsRequired: rewards.pointsRequired,
          stock: rewards.stock,
          isActive: rewards.isActive,
          category: rewards.category,
          emoji: rewards.emoji,
          createdAt: rewards.createdAt,
          updatedAt: rewards.updatedAt,
        },
      })
      .from(rewardRedemptions)
      .innerJoin(rewards, eq(rewardRedemptions.rewardId, rewards.id))
      .where(eq(rewardRedemptions.userId, userId))
      .orderBy(desc(rewardRedemptions.claimedAt));
  }

  async getAllRewardRedemptions(): Promise<Array<RewardRedemption & { reward: Reward; user: User }>> {
    return await db
      .select({
        id: rewardRedemptions.id,
        userId: rewardRedemptions.userId,
        rewardId: rewardRedemptions.rewardId,
        pointsSpent: rewardRedemptions.pointsSpent,
        status: rewardRedemptions.status,
        redemptionCode: rewardRedemptions.redemptionCode,
        claimedAt: rewardRedemptions.claimedAt,
        completedAt: rewardRedemptions.completedAt,
        notes: rewardRedemptions.notes,
        reward: {
          id: rewards.id,
          title: rewards.title,
          description: rewards.description,
          imageUrl: rewards.imageUrl,
          pointsRequired: rewards.pointsRequired,
          stock: rewards.stock,
          isActive: rewards.isActive,
          category: rewards.category,
          emoji: rewards.emoji,
          createdAt: rewards.createdAt,
          updatedAt: rewards.updatedAt,
        },
        user: {
          id: users.id,
          email: users.email,
          username: users.username,
          password: users.password,
          role: users.role,
          coinBalance: users.coinBalance,
          pointBalance: users.pointBalance,
          level: users.level,
          createdAt: users.createdAt,
        },
      })
      .from(rewardRedemptions)
      .innerJoin(rewards, eq(rewardRedemptions.rewardId, rewards.id))
      .innerJoin(users, eq(rewardRedemptions.userId, users.id))
      .orderBy(desc(rewardRedemptions.claimedAt));
  }

  async updateRewardRedemptionStatus(id: string, status: string, notes?: string): Promise<void> {
    const updates: any = { status };
    if (status === 'completed') {
      updates.completedAt = new Date();
    }
    if (notes) {
      updates.notes = notes;
    }
    
    await db
      .update(rewardRedemptions)
      .set(updates)
      .where(eq(rewardRedemptions.id, id));
  }
}

export const storage = new DbStorage();
