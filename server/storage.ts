import session from "express-session";
import connectPg from "connect-pg-simple";
import { 
  users, type User, type InsertUser,
  bankCredentials, type BankCredential, type InsertBankCredential,
  bankAccounts, type BankAccount, type InsertBankAccount,
  bankTransactions, type BankTransaction, type InsertBankTransaction
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

const PostgresStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Bank credential methods
  getBankCredentials(userId: number): Promise<BankCredential[]>;
  getBankCredential(id: number): Promise<BankCredential | undefined>;
  createBankCredential(credential: InsertBankCredential): Promise<BankCredential>;
  updateBankCredential(id: number, updates: Partial<BankCredential>): Promise<BankCredential | undefined>;
  deleteBankCredential(id: number): Promise<boolean>;
  
  // Bank account methods
  getBankAccounts(userId: number): Promise<BankAccount[]>;
  getBankAccount(id: number): Promise<BankAccount | undefined>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: number, updates: Partial<BankAccount>): Promise<BankAccount | undefined>;
  deleteBankAccount(id: number): Promise<boolean>;
  
  // Bank transaction methods
  getBankTransactions(userId: number, accountId?: number, limit?: number): Promise<BankTransaction[]>;
  getBankTransaction(id: number): Promise<BankTransaction | undefined>;
  createBankTransaction(transaction: InsertBankTransaction): Promise<BankTransaction>;
  updateBankTransaction(id: number, updates: Partial<BankTransaction>): Promise<BankTransaction | undefined>;
  deleteBankTransaction(id: number): Promise<boolean>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    this.sessionStore = new PostgresStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
  }

  // ========== User Methods ==========

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // First try direct match with the provided email
      const [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (user) {
        return user;
      }
      
      // If not found and the email looks sanitized (contains underscores instead of @ and .)
      // we can try to check if there's any other matching algorithm we could implement
      // Currently we're storing the original email in the database, so we don't need
      // complex matching logic, but if needed, we could add it here
      
      // Log for debugging
      console.log(`User lookup for email ${email} - no direct match found`);
      
      return undefined;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // ========== Bank Credential Methods ==========
  
  async getBankCredentials(userId: number): Promise<BankCredential[]> {
    try {
      const credentials = await db
        .select()
        .from(bankCredentials)
        .where(eq(bankCredentials.userId, userId))
        .orderBy(desc(bankCredentials.createdAt));
      return credentials;
    } catch (error) {
      console.error('Error fetching bank credentials:', error);
      return [];
    }
  }
  
  async getBankCredential(id: number): Promise<BankCredential | undefined> {
    try {
      const [credential] = await db
        .select()
        .from(bankCredentials)
        .where(eq(bankCredentials.id, id));
      return credential;
    } catch (error) {
      console.error('Error fetching bank credential:', error);
      return undefined;
    }
  }
  
  async createBankCredential(credential: InsertBankCredential): Promise<BankCredential> {
    try {
      const [created] = await db
        .insert(bankCredentials)
        .values(credential)
        .returning();
      return created;
    } catch (error) {
      console.error('Error creating bank credential:', error);
      throw error;
    }
  }
  
  async updateBankCredential(id: number, updates: Partial<BankCredential>): Promise<BankCredential | undefined> {
    try {
      const [updated] = await db
        .update(bankCredentials)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(bankCredentials.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating bank credential:', error);
      return undefined;
    }
  }
  
  async deleteBankCredential(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(bankCredentials)
        .where(eq(bankCredentials.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting bank credential:', error);
      return false;
    }
  }

  // ========== Bank Account Methods ==========
  
  async getBankAccounts(userId: number): Promise<BankAccount[]> {
    try {
      const accounts = await db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.userId, userId))
        .orderBy(desc(bankAccounts.createdAt));
      return accounts;
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      return [];
    }
  }
  
  async getBankAccount(id: number): Promise<BankAccount | undefined> {
    try {
      const [account] = await db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.id, id));
      return account;
    } catch (error) {
      console.error('Error fetching bank account:', error);
      return undefined;
    }
  }
  
  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    try {
      // Convert date to appropriate format if needed
      const [created] = await db
        .insert(bankAccounts)
        .values({
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
          isoCurrencyCode: account.isoCurrencyCode || 'USD',
          isActive: account.isActive !== undefined ? account.isActive : true,
          isVerified: account.isVerified !== undefined ? account.isVerified : false,
          lastSynced: account.lastSynced,
          metadata: account.metadata,
          plaidAccountId: account.plaidAccountId
        })
        .returning();
      return created;
    } catch (error) {
      console.error('Error creating bank account:', error);
      throw error;
    }
  }
  
  async updateBankAccount(id: number, updates: Partial<BankAccount>): Promise<BankAccount | undefined> {
    try {
      const [updated] = await db
        .update(bankAccounts)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(bankAccounts.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating bank account:', error);
      return undefined;
    }
  }
  
  async deleteBankAccount(id: number): Promise<boolean> {
    try {
      await db
        .delete(bankAccounts)
        .where(eq(bankAccounts.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting bank account:', error);
      return false;
    }
  }

  // ========== Bank Transaction Methods ==========
  
  async getBankTransactions(userId: number, accountId?: number, limit: number = 100): Promise<BankTransaction[]> {
    try {
      let query = db
        .select()
        .from(bankTransactions)
        .where(eq(bankTransactions.userId, userId));
      
      if (accountId) {
        query = query.where(eq(bankTransactions.accountId, accountId));
      }
      
      const transactions = await query
        .orderBy(desc(bankTransactions.date), desc(bankTransactions.createdAt))
        .limit(limit);
      
      return transactions;
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
      return [];
    }
  }
  
  async getBankTransaction(id: number): Promise<BankTransaction | undefined> {
    try {
      const [transaction] = await db
        .select()
        .from(bankTransactions)
        .where(eq(bankTransactions.id, id));
      return transaction;
    } catch (error) {
      console.error('Error fetching bank transaction:', error);
      return undefined;
    }
  }
  
  async createBankTransaction(transaction: InsertBankTransaction): Promise<BankTransaction> {
    try {
      const [created] = await db
        .insert(bankTransactions)
        .values(transaction)
        .returning();
      return created;
    } catch (error) {
      console.error('Error creating bank transaction:', error);
      throw error;
    }
  }
  
  async updateBankTransaction(id: number, updates: Partial<BankTransaction>): Promise<BankTransaction | undefined> {
    try {
      const [updated] = await db
        .update(bankTransactions)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(bankTransactions.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating bank transaction:', error);
      return undefined;
    }
  }
  
  async deleteBankTransaction(id: number): Promise<boolean> {
    try {
      await db
        .delete(bankTransactions)
        .where(eq(bankTransactions.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting bank transaction:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();