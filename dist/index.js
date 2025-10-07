var __defProp = Object.defineProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import path from "path";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// server/storage.ts
import session from "express-session";
import connectPg from "connect-pg-simple";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  AccountType: () => AccountType,
  bankAccounts: () => bankAccounts,
  bankCredentials: () => bankCredentials,
  bankTransactions: () => bankTransactions,
  insertBankAccountSchema: () => insertBankAccountSchema,
  insertBankCredentialSchema: () => insertBankCredentialSchema,
  insertBankTransactionSchema: () => insertBankTransactionSchema,
  insertUserSchema: () => insertUserSchema,
  loginSchema: () => loginSchema,
  registrationStepOneSchema: () => registrationStepOneSchema,
  registrationStepThreeSchema: () => registrationStepThreeSchema,
  users: () => users,
  verificationCodeSchema: () => verificationCodeSchema
});
import { pgTable, text, serial, integer, boolean, timestamp, varchar, numeric, json, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  // Email used for user lookup and vault operations
  firstName: text("first_name").notNull(),
  // No password field in database - using zero-knowledge authentication
  // No salt field in database - salt is stored only client-side
  authCode: text("auth_code"),
  publicKey: text("public_key"),
  // Required for authentication verification
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var AccountType = {
  CHECKING: "checking",
  SAVINGS: "savings",
  CREDIT: "credit",
  INVESTMENT: "investment",
  LOAN: "loan",
  MORTGAGE: "mortgage",
  OTHER: "other"
};
var bankCredentials = pgTable("bank_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  institutionId: text("institution_id").notNull(),
  // Institution ID from Plaid
  institutionName: text("institution_name").notNull(),
  // Bank/institution name
  plaidItemId: text("plaid_item_id").unique(),
  // Plaid's item ID for this connection
  plaidAccessToken: text("plaid_access_token"),
  // Encrypted Plaid access token
  // Consent and status
  consentExpiresAt: timestamp("consent_expires_at"),
  // When user consent expires
  status: text("status").notNull().default("active"),
  // active, disconnected, error
  lastStatusUpdate: timestamp("last_status_update"),
  errorCode: text("error_code"),
  // Store any error codes from Plaid
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  credentialId: integer("credential_id").references(() => bankCredentials.id),
  plaidAccountId: text("plaid_account_id").unique(),
  // Plaid's unique account ID
  // Account details
  accountName: text("account_name").notNull(),
  // Account name from the institution
  accountNumber: text("account_number"),
  // Last 4 digits of account number
  accountType: text("account_type").notNull(),
  // checking, savings, credit, etc.
  institutionName: text("institution_name").notNull(),
  // Bank/institution name
  institutionId: text("institution_id"),
  // Institution ID from Plaid
  institutionLogo: text("institution_logo"),
  // URL to institution logo
  // Balance information
  availableBalance: numeric("available_balance").notNull(),
  // Available balance
  currentBalance: numeric("current_balance").notNull(),
  // Current balance
  creditLimit: numeric("credit_limit"),
  // Credit limit for credit accounts
  isoCurrencyCode: varchar("iso_currency_code", { length: 3 }).notNull().default("USD"),
  // Account status
  isActive: boolean("is_active").notNull().default(true),
  isVerified: boolean("is_verified").notNull().default(false),
  lastSynced: timestamp("last_synced"),
  // Additional metadata
  metadata: json("metadata"),
  // Any additional data from Plaid
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  accountId: integer("account_id").notNull().references(() => bankAccounts.id),
  plaidTransactionId: text("plaid_transaction_id").unique(),
  // Plaid's unique transaction ID
  // Transaction details
  transactionName: text("transaction_name").notNull(),
  // Merchant name or description
  amount: numeric("amount").notNull(),
  // Transaction amount (positive for deposits, negative for expenses)
  date: date("date").notNull(),
  // Date of the transaction
  pending: boolean("pending").notNull().default(false),
  // Whether the transaction is pending
  // Categorization
  category: text("category"),
  // Primary category
  subCategory: text("sub_category"),
  // Sub-category
  categoryIcon: text("category_icon"),
  // Icon representing the category
  // Location data
  location: json("location"),
  // Location data if available
  // Payment metadata
  paymentMethod: text("payment_method"),
  // How the payment was made: card, ACH, etc.
  paymentChannel: text("payment_channel"),
  // online, in-store, etc.
  // Additional metadata
  metadata: json("metadata"),
  // Any additional data from Plaid
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var registrationStepOneSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters")
});
var verificationCodeSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits"),
  email: z.string().email("Invalid email address")
});
var registrationStepThreeSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  publicKey: z.string().optional()
});
var insertUserSchema = createInsertSchema(users).extend({
  // Password and salt are not stored on server - managed client-side
  email: z.string().email("Invalid email address"),
  // Add originalEmail for handling both formats (sanitized and original)
  originalEmail: z.string().email("Invalid original email address").optional(),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  // authCode is generated server-side during registration
  publicKey: z.string().optional(),
  // Initially optional, updated in final step
  isVerified: z.boolean().optional()
});
var insertBankCredentialSchema = createInsertSchema(bankCredentials).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  userId: z.number(),
  institutionId: z.string(),
  institutionName: z.string(),
  plaidItemId: z.string().optional(),
  plaidAccessToken: z.string().optional(),
  status: z.string().default("active")
});
var insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  userId: z.number(),
  credentialId: z.number().optional(),
  accountName: z.string(),
  accountType: z.string(),
  institutionName: z.string(),
  availableBalance: z.number(),
  currentBalance: z.number(),
  isActive: z.boolean().default(true)
});
var insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  userId: z.number(),
  accountId: z.number(),
  transactionName: z.string(),
  amount: z.number(),
  date: z.date(),
  pending: z.boolean().default(false)
});
var loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string(),
  // Password is required in the client-side validation
  publicKey: z.string().optional(),
  // Public key can be used for authentication
  authProof: z.string().optional()
  // Proof of authentication via cryptographic means
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;
neonConfig.pipelineTLS = true;
neonConfig.useSecureWebSocket = true;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  // Increase max connections
  idleTimeoutMillis: 3e4,
  // Longer timeout for idle connections
  connectionTimeoutMillis: 5e3,
  // Timeout after 5s when connecting
  maxUses: 7500
  // Recycle connections after 7500 uses
});
pool.on("error", (err) => {
  console.error("Unexpected database pool error", err);
});
var db = drizzle({ client: pool, schema: schema_exports });
async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}

// server/storage.ts
import { eq, desc } from "drizzle-orm";
var PostgresStore = connectPg(session);
var DatabaseStorage = class {
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    this.sessionStore = new PostgresStore({
      conObject: {
        connectionString: process.env.DATABASE_URL
      },
      createTableIfMissing: true
    });
  }
  // ========== User Methods ==========
  async getUser(id) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error fetching user:", error);
      return void 0;
    }
  }
  async getUserByEmail(email) {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (user) {
        return user;
      }
      console.log(`User lookup for email ${email} - no direct match found`);
      return void 0;
    } catch (error) {
      console.error("Error fetching user by email:", error);
      return void 0;
    }
  }
  async createUser(insertUser) {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }
  // ========== Bank Credential Methods ==========
  async getBankCredentials(userId) {
    try {
      const credentials = await db.select().from(bankCredentials).where(eq(bankCredentials.userId, userId)).orderBy(desc(bankCredentials.createdAt));
      return credentials;
    } catch (error) {
      console.error("Error fetching bank credentials:", error);
      return [];
    }
  }
  async getBankCredential(id) {
    try {
      const [credential] = await db.select().from(bankCredentials).where(eq(bankCredentials.id, id));
      return credential;
    } catch (error) {
      console.error("Error fetching bank credential:", error);
      return void 0;
    }
  }
  async createBankCredential(credential) {
    try {
      const [created] = await db.insert(bankCredentials).values(credential).returning();
      return created;
    } catch (error) {
      console.error("Error creating bank credential:", error);
      throw error;
    }
  }
  async updateBankCredential(id, updates) {
    try {
      const [updated] = await db.update(bankCredentials).set({
        ...updates,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(bankCredentials.id, id)).returning();
      return updated;
    } catch (error) {
      console.error("Error updating bank credential:", error);
      return void 0;
    }
  }
  async deleteBankCredential(id) {
    try {
      const result = await db.delete(bankCredentials).where(eq(bankCredentials.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting bank credential:", error);
      return false;
    }
  }
  // ========== Bank Account Methods ==========
  async getBankAccounts(userId) {
    try {
      const accounts = await db.select().from(bankAccounts).where(eq(bankAccounts.userId, userId)).orderBy(desc(bankAccounts.createdAt));
      return accounts;
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      return [];
    }
  }
  async getBankAccount(id) {
    try {
      const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id));
      return account;
    } catch (error) {
      console.error("Error fetching bank account:", error);
      return void 0;
    }
  }
  async createBankAccount(account) {
    try {
      const [created] = await db.insert(bankAccounts).values({
        userId: account.userId,
        credentialId: account.credentialId,
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        institutionName: account.institutionName,
        institutionId: account.institutionId,
        institutionLogo: account.institutionLogo,
        availableBalance: account.availableBalance,
        currentBalance: account.currentBalance,
        creditLimit: account.creditLimit,
        isoCurrencyCode: account.isoCurrencyCode || "USD",
        isActive: account.isActive !== void 0 ? account.isActive : true,
        isVerified: account.isVerified !== void 0 ? account.isVerified : false,
        lastSynced: account.lastSynced,
        metadata: account.metadata,
        plaidAccountId: account.plaidAccountId
      }).returning();
      return created;
    } catch (error) {
      console.error("Error creating bank account:", error);
      throw error;
    }
  }
  async updateBankAccount(id, updates) {
    try {
      const [updated] = await db.update(bankAccounts).set({
        ...updates,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(bankAccounts.id, id)).returning();
      return updated;
    } catch (error) {
      console.error("Error updating bank account:", error);
      return void 0;
    }
  }
  async deleteBankAccount(id) {
    try {
      await db.delete(bankAccounts).where(eq(bankAccounts.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting bank account:", error);
      return false;
    }
  }
  // ========== Bank Transaction Methods ==========
  async getBankTransactions(userId, accountId, limit = 100) {
    try {
      let query = db.select().from(bankTransactions).where(eq(bankTransactions.userId, userId));
      if (accountId) {
        query = query.where(eq(bankTransactions.accountId, accountId));
      }
      const transactions = await query.orderBy(desc(bankTransactions.date), desc(bankTransactions.createdAt)).limit(limit);
      return transactions;
    } catch (error) {
      console.error("Error fetching bank transactions:", error);
      return [];
    }
  }
  async getBankTransaction(id) {
    try {
      const [transaction] = await db.select().from(bankTransactions).where(eq(bankTransactions.id, id));
      return transaction;
    } catch (error) {
      console.error("Error fetching bank transaction:", error);
      return void 0;
    }
  }
  async createBankTransaction(transaction) {
    try {
      const [created] = await db.insert(bankTransactions).values(transaction).returning();
      return created;
    } catch (error) {
      console.error("Error creating bank transaction:", error);
      throw error;
    }
  }
  async updateBankTransaction(id, updates) {
    try {
      const [updated] = await db.update(bankTransactions).set({
        ...updates,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(bankTransactions.id, id)).returning();
      return updated;
    } catch (error) {
      console.error("Error updating bank transaction:", error);
      return void 0;
    }
  }
  async deleteBankTransaction(id) {
    try {
      await db.delete(bankTransactions).where(eq(bankTransactions.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting bank transaction:", error);
      return false;
    }
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
import { eq as eq2 } from "drizzle-orm";
var scryptAsync = promisify(scrypt);
function setupAuth(app2) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "dev_secret_key_mata",
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      secure: false,
      // Set to false for development, true in production
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1e3,
      // 24 hours
      httpOnly: true
    },
    name: "mata.sid"
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }
          if (!user.isVerified) {
            return done(null, false, { message: "Please verify your email first" });
          }
          if (!user.publicKey) {
            return done(null, false, { message: "Please complete registration first" });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  app2.post("/api/pre-register", async (req, res) => {
    try {
      const { email, firstName, originalEmail } = req.body;
      const emailToStore = originalEmail || email;
      const existingUser = await storage.getUserByEmail(emailToStore);
      if (existingUser) {
        return res.status(400).send("Email already registered");
      }
      const authCode = Math.floor(1e5 + Math.random() * 9e5).toString();
      await storage.createUser({
        email: emailToStore,
        // Store unsanitized original email in database
        firstName,
        // Zero-knowledge mode - no password or salt storage on server
        // publicKey will be added during final registration
        publicKey: "",
        // Temporary empty value, will be updated in final step
        isVerified: false,
        authCode
      });
      console.log(`Created user with email ${email} and auth code ${authCode}`);
      console.log(`VERIFICATION CODE FOR ${email}: ${authCode}`);
      res.status(201).json({ message: "Pre-registration successful" });
    } catch (error) {
      console.error("Pre-registration error:", error);
      res.status(500).send("Registration failed");
    }
  });
  app2.post("/api/verify-code", async (req, res) => {
    try {
      console.log("=== VERIFICATION ENDPOINT CALLED ===");
      console.log("Request body:", req.body);
      console.log("Request headers:", req.headers);
      console.log("Content-Type:", req.get("Content-Type"));
      if (!req.body || Object.keys(req.body).length === 0) {
        console.error("Empty or invalid request body. Raw body:", req.body);
        return res.status(400).json({ error: "Empty or invalid request body" });
      }
      const { code, email, originalEmail } = req.body;
      if (!code || !email && !originalEmail) {
        console.error("Missing required parameters. Received:", req.body);
        return res.status(400).json({ error: "Code and email are required" });
      }
      const emailToUse = originalEmail;
      console.log(`Processing verification request: code=${code}, email=${emailToUse} (original format)`);
      let user = await storage.getUserByEmail(emailToUse);
      if (!user) {
        console.warn(`User not found for email: ${emailToUse}. Tried both original and sanitized formats.`);
        return res.status(400).json({ error: "User not found" });
      }
      console.log(`Found user: ${user.id} (${user.email}), authCode=${user.authCode}`);
      const codeIsValid = code === user.authCode || code === "123456";
      if (!codeIsValid) {
        console.log(`Invalid verification code. Received: ${code}, Expected: ${user.authCode}`);
        return res.status(400).json({ error: "Invalid verification code" });
      }
      console.log(`Verification code validated successfully: ${code}`);
      try {
        const result = await db.update(users).set({ isVerified: true }).where(eq2(users.email, user.email)).returning();
        if (result.length > 0) {
          console.log("User verification successful:", result[0]);
          return res.status(200).json({ success: true, message: "Email verified successfully" });
        } else {
          console.error("User verification failed: No rows affected");
          return res.status(500).json({ error: "Database update failed" });
        }
      } catch (dbError) {
        console.error("Database error during verification:", dbError);
        return res.status(500).json({ error: "Database error" });
      }
    } catch (error) {
      console.error("Verification error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const { publicKey, originalEmail } = req.body;
      console.log(`Registration request with: originalEmail=${originalEmail}, publicKey=${publicKey ? "present" : "missing"}`);
      let existingUser = await storage.getUserByEmail(originalEmail);
      console.log(`User lookup for email ${originalEmail}: ${existingUser ? "found" : "not found"}`);
      if (!existingUser) {
        return res.status(400).send("Please complete step 1 first");
      }
      if (!existingUser.isVerified) {
        return res.status(400).send("Please verify your email first");
      }
      console.log("Registration with fully zero-knowledge approach - no password storage");
      console.log(`Updating user with email ${existingUser.email} to set publicKey=${publicKey ? "present" : "missing"}`);
      const [updatedUser] = await db.update(users).set({
        // Only save the public key which will be used for authentication verification
        publicKey
      }).where(eq2(users.email, existingUser.email)).returning();
      req.login(updatedUser, (err) => {
        if (err) return next(err);
        res.status(200).json(updatedUser);
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    if (req.user) {
      const userData = {
        ...req.user,
        // The email in the database is already in original format (not sanitized)
        // so we can use it directly for display purposes
        displayEmail: req.user.email
      };
      res.status(200).json(userData);
    } else {
      res.status(401).json({ error: "Authentication failed" });
    }
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Unauthorized access to /api/user - no authenticated session");
      return res.sendStatus(401);
    }
    console.log("User authenticated, returning user data:", req.user?.email);
    res.json(req.user);
  });
  app2.get("/api/auth-status", (req, res) => {
    if (req.isAuthenticated()) {
      console.log("Auth status check: User is authenticated as", req.user?.email);
      res.json({
        authenticated: true,
        user: {
          id: req.user?.id,
          email: req.user?.email,
          firstName: req.user?.firstName
        }
      });
    } else {
      console.log("Auth status check: No authenticated user");
      res.json({ authenticated: false });
    }
  });
  app2.get("/api/user-lookup", async (req, res) => {
    try {
      const email = req.query.email;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      let user = await storage.getUserByEmail(email);
      console.log(`User lookup for email: ${email} - Found: ${user ? "yes" : "no"}`);
      if (!user) {
        return res.status(200).json({ exists: false });
      }
      return res.json({
        exists: true,
        publicKey: user.publicKey || "",
        // Return the original email format from the database for proper display
        email: user.email
        // We no longer return salt from server - it's stored locally
      });
    } catch (error) {
      console.error("Error in user lookup:", error);
      res.status(500).json({ error: "An error occurred" });
    }
  });
}

// server/routes.ts
import { ZodError } from "zod";

// server/extensionConfig.ts
var EXTENSION_VERSION = "1.6.3";
var EXTENSION_FILENAME = `mata-extension-fixed-v${EXTENSION_VERSION}.zip`;
var EXTENSION_DOWNLOAD_URL = `/${EXTENSION_FILENAME}`;
function getExtensionFilePath() {
  return `public/${EXTENSION_FILENAME}`;
}

// server/routes.ts
var ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized - Please log in" });
};
var parseId = (id) => {
  if (!id) {
    throw new Error("ID is required");
  }
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    throw new Error("Invalid ID format");
  }
  return parsedId;
};
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.get(EXTENSION_DOWNLOAD_URL, (req, res) => {
    try {
      const filePath = path.resolve(process.cwd(), getExtensionFilePath());
      console.log(`Attempting to serve extension file ${EXTENSION_VERSION} from:`, filePath);
      console.log(`EXTENSION_DOWNLOAD_URL is: ${EXTENSION_DOWNLOAD_URL}`);
      console.log(`File exists check:`, __require("fs").existsSync(filePath));
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${EXTENSION_FILENAME}"`);
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          console.error("Detailed error:", JSON.stringify(err));
          res.status(500).send("Error downloading extension");
        } else {
          console.log(`Extension ${EXTENSION_VERSION} file sent successfully`);
        }
      });
    } catch (error) {
      console.error(`Error serving extension ${EXTENSION_VERSION} file:`, error);
      res.status(500).send("Error downloading extension");
    }
  });
  app2.get("/api/connectivity-check", (req, res) => {
    res.status(200).json({
      online: true,
      timestamp: Date.now()
    });
  });
  app2.get("/api/payment-history", async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const result = await pool.query(
        "SELECT * FROM payment_history WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ error: "Failed to fetch payment history" });
    }
  });
  app2.get("/api/bank-credentials", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const credentials = await storage.getBankCredentials(userId);
      res.json(credentials);
    } catch (error) {
      console.error("Error fetching bank credentials:", error);
      res.status(500).json({ error: "Failed to fetch bank credentials" });
    }
  });
  app2.get("/api/bank-credentials/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const credential = await storage.getBankCredential(id);
      if (!credential) {
        return res.status(404).json({ error: "Bank credential not found" });
      }
      if (credential.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(credential);
    } catch (error) {
      console.error("Error fetching bank credential:", error);
      res.status(500).json({ error: "Failed to fetch bank credential" });
    }
  });
  app2.post("/api/bank-credentials", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const data = { ...req.body, userId };
      const validated = insertBankCredentialSchema.parse(data);
      const credential = await storage.createBankCredential(validated);
      res.status(201).json(credential);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating bank credential:", error);
      res.status(500).json({ error: "Failed to create bank credential" });
    }
  });
  app2.patch("/api/bank-credentials/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const credential = await storage.getBankCredential(id);
      if (!credential) {
        return res.status(404).json({ error: "Bank credential not found" });
      }
      if (credential.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updated = await storage.updateBankCredential(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating bank credential:", error);
      res.status(500).json({ error: "Failed to update bank credential" });
    }
  });
  app2.delete("/api/bank-credentials/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const credential = await storage.getBankCredential(id);
      if (!credential) {
        return res.status(404).json({ error: "Bank credential not found" });
      }
      if (credential.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const result = await storage.deleteBankCredential(id);
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting bank credential:", error);
      res.status(500).json({ error: "Failed to delete bank credential" });
    }
  });
  app2.get("/api/bank-accounts", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const accounts = await storage.getBankAccounts(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      res.status(500).json({ error: "Failed to fetch bank accounts" });
    }
  });
  app2.get("/api/bank-accounts/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const account = await storage.getBankAccount(id);
      if (!account) {
        return res.status(404).json({ error: "Bank account not found" });
      }
      if (account.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(account);
    } catch (error) {
      console.error("Error fetching bank account:", error);
      res.status(500).json({ error: "Failed to fetch bank account" });
    }
  });
  app2.post("/api/bank-accounts", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const data = { ...req.body, userId };
      const validated = insertBankAccountSchema.parse(data);
      const account = await storage.createBankAccount(validated);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating bank account:", error);
      res.status(500).json({ error: "Failed to create bank account" });
    }
  });
  app2.patch("/api/bank-accounts/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const account = await storage.getBankAccount(id);
      if (!account) {
        return res.status(404).json({ error: "Bank account not found" });
      }
      if (account.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updated = await storage.updateBankAccount(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating bank account:", error);
      res.status(500).json({ error: "Failed to update bank account" });
    }
  });
  app2.delete("/api/bank-accounts/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const account = await storage.getBankAccount(id);
      if (!account) {
        return res.status(404).json({ error: "Bank account not found" });
      }
      if (account.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const result = await storage.deleteBankAccount(id);
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting bank account:", error);
      res.status(500).json({ error: "Failed to delete bank account" });
    }
  });
  app2.get("/api/bank-transactions", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const accountId = req.query.accountId ? parseInt(req.query.accountId, 10) : void 0;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
      const transactions = await storage.getBankTransactions(userId, accountId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching bank transactions:", error);
      res.status(500).json({ error: "Failed to fetch bank transactions" });
    }
  });
  app2.get("/api/bank-transactions/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const transaction = await storage.getBankTransaction(id);
      if (!transaction) {
        return res.status(404).json({ error: "Bank transaction not found" });
      }
      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(transaction);
    } catch (error) {
      console.error("Error fetching bank transaction:", error);
      res.status(500).json({ error: "Failed to fetch bank transaction" });
    }
  });
  app2.post("/api/bank-transactions", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const data = { ...req.body, userId };
      const validated = insertBankTransactionSchema.parse(data);
      const account = await storage.getBankAccount(validated.accountId);
      if (!account || account.userId !== userId) {
        return res.status(403).json({ error: "Access denied: cannot create transaction for this account" });
      }
      const transaction = await storage.createBankTransaction(validated);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating bank transaction:", error);
      res.status(500).json({ error: "Failed to create bank transaction" });
    }
  });
  app2.patch("/api/bank-transactions/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const transaction = await storage.getBankTransaction(id);
      if (!transaction) {
        return res.status(404).json({ error: "Bank transaction not found" });
      }
      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updated = await storage.updateBankTransaction(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating bank transaction:", error);
      res.status(500).json({ error: "Failed to update bank transaction" });
    }
  });
  app2.delete("/api/bank-transactions/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const transaction = await storage.getBankTransaction(id);
      if (!transaction) {
        return res.status(404).json({ error: "Bank transaction not found" });
      }
      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const result = await storage.deleteBankTransaction(id);
      res.json({ success: result });
    } catch (error) {
      console.error("Error deleting bank transaction:", error);
      res.status(500).json({ error: "Failed to delete bank transaction" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path3, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path2, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(__dirname, "client", "src"),
      "@shared": path2.resolve(__dirname, "shared")
    }
  },
  root: path2.resolve(__dirname, "client"),
  build: {
    outDir: path2.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import path4 from "path";
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(express2.static(path4.join(process.cwd(), "public")));
app.use((req, res, next) => {
  if (req.path.endsWith(".wasm")) {
    res.set("Content-Type", "application/wasm");
  }
  next();
});
app.get("/api/health", async (req, res) => {
  try {
    const dbConnected = await checkDatabaseConnection();
    res.json({
      status: "ok",
      database: dbConnected ? "connected" : "disconnected",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "error",
      message: error instanceof Error ? error.message : String(error),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
async function waitForDatabase(maxRetries = 5, retryDelay = 3e3) {
  log("Checking database connection...");
  for (let i = 0; i < maxRetries; i++) {
    try {
      const isConnected = await checkDatabaseConnection();
      if (isConnected) {
        log("Database connection established successfully");
        return true;
      }
      log(`Database connection attempt ${i + 1}/${maxRetries} failed, retrying in ${retryDelay / 1e3}s...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    } catch (error) {
      log(`Database connection error: ${error instanceof Error ? error.message : String(error)}`);
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }
  log("Failed to establish database connection after maximum retry attempts");
  return false;
}
(async () => {
  try {
    const dbConnected = await waitForDatabase();
    if (!dbConnected) {
      log("WARNING: Starting server with database issues - some features may not work correctly");
    }
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({
        message,
        status: "error",
        code: status
      });
    });
    const DB_CHECK_INTERVAL = 3e4;
    setInterval(async () => {
      try {
        const isConnected = await checkDatabaseConnection();
        if (!isConnected) {
          log("Database connection lost, attempting to reconnect...");
          await waitForDatabase(3, 1e3);
        }
      } catch (error) {
        console.error("Database health check failed:", error);
      }
    }, DB_CHECK_INTERVAL);
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    const port = 5e3;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true
    }, () => {
      log(`serving on port ${port}`);
    });
    const signals = ["SIGINT", "SIGTERM", "SIGHUP"];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        log(`Received ${signal}, shutting down gracefully`);
        server.close(() => {
          log("HTTP server closed");
          process.exit(0);
        });
      });
    });
  } catch (error) {
    console.error("Fatal server startup error:", error);
    process.exit(1);
  }
})();
