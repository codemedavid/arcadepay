import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // "user" or "admin"
  coinBalance: integer("coin_balance").notNull().default(0),
  pointBalance: integer("point_balance").notNull().default(0),
  level: integer("level").notNull().default(1),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // "purchase", "promotion", "admin_topup"
  amount: decimal("amount", { precision: 10, scale: 2 }), // For purchases
  coinsAdded: integer("coins_added").notNull().default(0),
  pointsEarned: integer("points_earned").notNull().default(0),
  description: text("description").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: text("status").notNull().default("completed"), // "pending", "completed", "failed"
  metadata: jsonb("metadata"), // For additional data
  createdAt: timestamp("created_at").defaultNow(),
});

export const promotions = pgTable("promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "bonus_points", "extra_coins", "discount", "free_credits"
  value: integer("value").notNull(), // Percentage or fixed amount
  isActive: boolean("is_active").notNull().default(true),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").notNull().default(0),
  emoji: text("emoji").default("🎮"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const promotionRedemptions = pgTable("promotion_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  promotionId: varchar("promotion_id").references(() => promotions.id).notNull(),
  pointsEarned: integer("points_earned").notNull().default(0),
  coinsEarned: integer("coins_earned").notNull().default(0),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

export const adminActions = pgTable("admin_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => users.id).notNull(),
  targetUserId: varchar("target_user_id").references(() => users.id),
  action: text("action").notNull(), // "topup", "reset_balance", "suspend_user", etc.
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  coinBalance: true,
  pointBalance: true,
  level: true,
  stripeCustomerId: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertPromotionSchema = createInsertSchema(promotions).omit({
  id: true,
  createdAt: true,
  currentRedemptions: true,
});

export const insertPromotionRedemptionSchema = createInsertSchema(promotionRedemptions).omit({
  id: true,
  redeemedAt: true,
});

export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotionRedemption = z.infer<typeof insertPromotionRedemptionSchema>;
export type PromotionRedemption = typeof promotionRedemptions.$inferSelect;
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;
export type AdminAction = typeof adminActions.$inferSelect;
