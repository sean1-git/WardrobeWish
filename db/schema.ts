import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleSubject: text("google_subject").unique(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  csrfHash: text("csrf_hash").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [index("sessions_expiry_idx").on(table.expiresAt)]);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [index("rate_limits_expiry_idx").on(table.expiresAt)]);

export const oauthFlows = sqliteTable("oauth_flows", {
  stateHash: text("state_hash").primaryKey(),
  sessionHash: text("session_hash").notNull().references(() => sessions.tokenHash, { onDelete: "cascade" }),
  verifier: text("verifier").notNull(),
  nonceHash: text("nonce_hash").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [index("oauth_expiry_idx").on(table.expiresAt)]);
