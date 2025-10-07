import { pgTable, text, serial, integer, boolean, timestamp, varchar, numeric, foreignKey, json, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(), // Email used for user lookup and vault operations
  firstName: text("first_name").notNull(),
  // No password field in database - using zero-knowledge authentication
  // No salt field in database - salt is stored only client-side
  authCode: text("auth_code"),
  publicKey: text("public_key"), // Required for authentication verification
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bank Account types (based on Plaid account types)
export const AccountType = {
  CHECKING: "checking",
  SAVINGS: "savings",
  CREDIT: "credit",
  INVESTMENT: "investment",
  LOAN: "loan",
  MORTGAGE: "mortgage",
  OTHER: "other"
} as const;

// Bank credentials (relation between user and institution)
export const bankCredentials = pgTable("bank_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  institutionId: text("institution_id").notNull(), // Institution ID from Plaid
  institutionName: text("institution_name").notNull(), // Bank/institution name
  plaidItemId: text("plaid_item_id").unique(), // Plaid's item ID for this connection
  plaidAccessToken: text("plaid_access_token"), // Encrypted Plaid access token
  
  // Consent and status
  consentExpiresAt: timestamp("consent_expires_at"), // When user consent expires
  status: text("status").notNull().default("active"), // active, disconnected, error
  lastStatusUpdate: timestamp("last_status_update"),
  errorCode: text("error_code"), // Store any error codes from Plaid
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Bank account schema
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  credentialId: integer("credential_id").references(() => bankCredentials.id),
  plaidAccountId: text("plaid_account_id").unique(), // Plaid's unique account ID
  
  // Account details
  accountName: text("account_name").notNull(), // Account name from the institution
  accountNumber: text("account_number"), // Last 4 digits of account number
  accountType: text("account_type").notNull(), // checking, savings, credit, etc.
  institutionName: text("institution_name").notNull(), // Bank/institution name
  institutionId: text("institution_id"), // Institution ID from Plaid
  institutionLogo: text("institution_logo"), // URL to institution logo
  
  // Balance information
  availableBalance: numeric("available_balance").notNull(), // Available balance
  currentBalance: numeric("current_balance").notNull(), // Current balance
  creditLimit: numeric("credit_limit"), // Credit limit for credit accounts
  isoCurrencyCode: varchar("iso_currency_code", { length: 3 }).notNull().default("USD"),
  
  // Account status
  isActive: boolean("is_active").notNull().default(true),
  isVerified: boolean("is_verified").notNull().default(false),
  lastSynced: timestamp("last_synced"),
  
  // Additional metadata
  metadata: json("metadata"), // Any additional data from Plaid
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Transactions schema
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  accountId: integer("account_id").notNull().references(() => bankAccounts.id),
  plaidTransactionId: text("plaid_transaction_id").unique(), // Plaid's unique transaction ID
  
  // Transaction details
  transactionName: text("transaction_name").notNull(), // Merchant name or description
  amount: numeric("amount").notNull(), // Transaction amount (positive for deposits, negative for expenses)
  date: date("date").notNull(), // Date of the transaction
  pending: boolean("pending").notNull().default(false), // Whether the transaction is pending
  
  // Categorization
  category: text("category"), // Primary category
  subCategory: text("sub_category"), // Sub-category
  categoryIcon: text("category_icon"), // Icon representing the category
  
  // Location data
  location: json("location"), // Location data if available
  
  // Payment metadata
  paymentMethod: text("payment_method"), // How the payment was made: card, ACH, etc.
  paymentChannel: text("payment_channel"), // online, in-store, etc.
  
  // Additional metadata
  metadata: json("metadata"), // Any additional data from Plaid
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Schema for initial registration (step 1)
export const registrationStepOneSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
});

// Schema for verification code (step 2)
export const verificationCodeSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits"),
  email: z.string().email("Invalid email address"),
});

// Schema for final registration step (step 3)
export const registrationStepThreeSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  publicKey: z.string().optional(),
});

// Schema for complete user data
export const insertUserSchema = createInsertSchema(users)
  .extend({
    // Password and salt are not stored on server - managed client-side
    email: z.string().email("Invalid email address"),
    // Add originalEmail for handling both formats (sanitized and original)
    originalEmail: z.string().email("Invalid original email address").optional(),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    // authCode is generated server-side during registration
    publicKey: z.string().optional(), // Initially optional, updated in final step
    isVerified: z.boolean().optional(),
  });

// Bank account schema validation
export const insertBankCredentialSchema = createInsertSchema(bankCredentials)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    userId: z.number(),
    institutionId: z.string(),
    institutionName: z.string(),
    plaidItemId: z.string().optional(),
    plaidAccessToken: z.string().optional(),
    status: z.string().default("active"),
  });

export const insertBankAccountSchema = createInsertSchema(bankAccounts)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    userId: z.number(),
    credentialId: z.number().optional(),
    accountName: z.string(),
    accountType: z.string(),
    institutionName: z.string(),
    availableBalance: z.number(),
    currentBalance: z.number(),
    isActive: z.boolean().default(true),
  });

export const insertBankTransactionSchema = createInsertSchema(bankTransactions)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    userId: z.number(),
    accountId: z.number(),
    transactionName: z.string(),
    amount: z.number(),
    date: z.date(),
    pending: z.boolean().default(false),
  });

// Response types
export type BankCredential = typeof bankCredentials.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type BankTransaction = typeof bankTransactions.$inferSelect;

// Insert types
export type InsertBankCredential = z.infer<typeof insertBankCredentialSchema>;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;

// Export user types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string(), // Password is required in the client-side validation
  publicKey: z.string().optional(), // Public key can be used for authentication
  authProof: z.string().optional(), // Proof of authentication via cryptographic means
});

export type LoginData = z.infer<typeof loginSchema>;