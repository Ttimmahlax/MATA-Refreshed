import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from 'path';
import { setupAuth } from "./auth";
import { pool } from "./db";
import { storage } from "./storage";
import { 
  insertBankCredentialSchema, 
  insertBankAccountSchema, 
  insertBankTransactionSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { 
  EXTENSION_VERSION, 
  EXTENSION_FILENAME, 
  EXTENSION_DOWNLOAD_URL,
  getExtensionFilePath 
} from "./extensionConfig";

// Auth middleware to ensure the user is logged in
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized - Please log in' });
};

// Parse numeric IDs from params
const parseId = (id: string | undefined): number => {
  if (!id) {
    throw new Error('ID is required');
  }
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    throw new Error('Invalid ID format');
  }
  return parsedId;
};

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // We've removed all compatibility routes for previous extension versions
  // Users will now only be able to download the current version
  
  // Direct download endpoint for easy access - directly serves the extension file
  app.get('/download-extension', (req: Request, res: Response) => {
    res.redirect(302, EXTENSION_DOWNLOAD_URL);
  });
  
  // Current version extension endpoint (v${EXTENSION_VERSION})
  app.get(EXTENSION_DOWNLOAD_URL, (req: Request, res: Response) => {
    try {
      const filePath = path.resolve(process.cwd(), getExtensionFilePath());
      console.log(`Attempting to serve extension file ${EXTENSION_VERSION} from:`, filePath);
      console.log(`EXTENSION_DOWNLOAD_URL is: ${EXTENSION_DOWNLOAD_URL}`);
      console.log(`User agent: ${req.headers['user-agent']}`);
      console.log(`File exists check:`, require('fs').existsSync(filePath));
      
      // Set appropriate content type and headers for zip file
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${EXTENSION_FILENAME}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          console.error('Detailed error:', JSON.stringify(err));
          res.status(500).send('Error downloading extension');
        } else {
          console.log(`Extension ${EXTENSION_VERSION} file sent successfully to ${req.ip}`);
        }
      });
    } catch (error) {
      console.error(`Error serving extension ${EXTENSION_VERSION} file:`, error);
      res.status(500).send('Error downloading extension');
    }
  });

  // Simple connectivity check endpoint - does not require authentication
  // Used by the client to verify network connectivity when receiving 401 errors
  app.get('/api/connectivity-check', (req: Request, res: Response) => {
    res.status(200).json({ 
      online: true, 
      timestamp: Date.now() 
    });
  });
  
  // Payment History API endpoint
  app.get('/api/payment-history', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Query the payment_history table for records matching the user ID
      const result = await pool.query(
        'SELECT * FROM payment_history WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      res.status(500).json({ error: 'Failed to fetch payment history' });
    }
  });

  // ========== Bank Credential Endpoints ==========
  
  // Get all bank credentials for a user
  app.get('/api/bank-credentials', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const credentials = await storage.getBankCredentials(userId);
      res.json(credentials);
    } catch (error) {
      console.error('Error fetching bank credentials:', error);
      res.status(500).json({ error: 'Failed to fetch bank credentials' });
    }
  });
  
  // Get a specific bank credential
  app.get('/api/bank-credentials/:id', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      const credential = await storage.getBankCredential(id);
      
      if (!credential) {
        return res.status(404).json({ error: 'Bank credential not found' });
      }
      
      // Ensure user only accesses their own credentials
      if (credential.userId !== (req.user as any).id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(credential);
    } catch (error) {
      console.error('Error fetching bank credential:', error);
      res.status(500).json({ error: 'Failed to fetch bank credential' });
    }
  });
  
  // Create a new bank credential
  app.post('/api/bank-credentials', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const data = { ...req.body, userId };
      
      // Validate with Zod schema
      const validated = insertBankCredentialSchema.parse(data);
      
      const credential = await storage.createBankCredential(validated);
      res.status(201).json(credential);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating bank credential:', error);
      res.status(500).json({ error: 'Failed to create bank credential' });
    }
  });
  
  // Update a bank credential
  app.patch('/api/bank-credentials/:id', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      const credential = await storage.getBankCredential(id);
      
      if (!credential) {
        return res.status(404).json({ error: 'Bank credential not found' });
      }
      
      // Ensure user only updates their own credentials
      if (credential.userId !== (req.user as any).id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updated = await storage.updateBankCredential(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating bank credential:', error);
      res.status(500).json({ error: 'Failed to update bank credential' });
    }
  });
  
  // Delete a bank credential
  app.delete('/api/bank-credentials/:id', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      const credential = await storage.getBankCredential(id);
      
      if (!credential) {
        return res.status(404).json({ error: 'Bank credential not found' });
      }
      
      // Ensure user only deletes their own credentials
      if (credential.userId !== (req.user as any).id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const result = await storage.deleteBankCredential(id);
      res.json({ success: result });
    } catch (error) {
      console.error('Error deleting bank credential:', error);
      res.status(500).json({ error: 'Failed to delete bank credential' });
    }
  });
  
  // ========== Bank Account Endpoints ==========
  
  // Get all bank accounts for a user
  app.get('/api/bank-accounts', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const accounts = await storage.getBankAccounts(userId);
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      res.status(500).json({ error: 'Failed to fetch bank accounts' });
    }
  });
  
  // Get a specific bank account
  app.get('/api/bank-accounts/:id', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      const account = await storage.getBankAccount(id);
      
      if (!account) {
        return res.status(404).json({ error: 'Bank account not found' });
      }
      
      // Ensure user only accesses their own accounts
      if (account.userId !== (req.user as any).id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(account);
    } catch (error) {
      console.error('Error fetching bank account:', error);
      res.status(500).json({ error: 'Failed to fetch bank account' });
    }
  });
  
  // Create a new bank account
  app.post('/api/bank-accounts', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const data = { ...req.body, userId };
      
      // Validate with Zod schema
      const validated = insertBankAccountSchema.parse(data);
      
      const account = await storage.createBankAccount(validated);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating bank account:', error);
      res.status(500).json({ error: 'Failed to create bank account' });
    }
  });
  
  // Update a bank account
  app.patch('/api/bank-accounts/:id', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      const account = await storage.getBankAccount(id);
      
      if (!account) {
        return res.status(404).json({ error: 'Bank account not found' });
      }
      
      // Ensure user only updates their own accounts
      if (account.userId !== (req.user as any).id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updated = await storage.updateBankAccount(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating bank account:', error);
      res.status(500).json({ error: 'Failed to update bank account' });
    }
  });
  
  // Delete a bank account
  app.delete('/api/bank-accounts/:id', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      const account = await storage.getBankAccount(id);
      
      if (!account) {
        return res.status(404).json({ error: 'Bank account not found' });
      }
      
      // Ensure user only deletes their own accounts
      if (account.userId !== (req.user as any).id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const result = await storage.deleteBankAccount(id);
      res.json({ success: result });
    } catch (error) {
      console.error('Error deleting bank account:', error);
      res.status(500).json({ error: 'Failed to delete bank account' });
    }
  });
  
  // ========== Bank Transaction Endpoints ==========
  
  // Get transactions for a user (optionally filtered by account)
  app.get('/api/bank-transactions', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const accountId = req.query.accountId ? parseInt(req.query.accountId as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      
      const transactions = await storage.getBankTransactions(userId, accountId, limit);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
      res.status(500).json({ error: 'Failed to fetch bank transactions' });
    }
  });
  
  // Get a specific transaction
  app.get('/api/bank-transactions/:id', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      const transaction = await storage.getBankTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ error: 'Bank transaction not found' });
      }
      
      // Ensure user only accesses their own transactions
      if (transaction.userId !== (req.user as any).id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(transaction);
    } catch (error) {
      console.error('Error fetching bank transaction:', error);
      res.status(500).json({ error: 'Failed to fetch bank transaction' });
    }
  });
  
  // Create a new transaction
  app.post('/api/bank-transactions', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const data = { ...req.body, userId };
      
      // Validate with Zod schema
      const validated = insertBankTransactionSchema.parse(data);
      
      // Ensure the account belongs to the user
      const account = await storage.getBankAccount(validated.accountId);
      if (!account || account.userId !== userId) {
        return res.status(403).json({ error: 'Access denied: cannot create transaction for this account' });
      }
      
      const transaction = await storage.createBankTransaction(validated);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating bank transaction:', error);
      res.status(500).json({ error: 'Failed to create bank transaction' });
    }
  });
  
  // Update a transaction
  app.patch('/api/bank-transactions/:id', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      const transaction = await storage.getBankTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ error: 'Bank transaction not found' });
      }
      
      // Ensure user only updates their own transactions
      if (transaction.userId !== (req.user as any).id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updated = await storage.updateBankTransaction(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating bank transaction:', error);
      res.status(500).json({ error: 'Failed to update bank transaction' });
    }
  });
  
  // Delete a transaction
  app.delete('/api/bank-transactions/:id', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      const transaction = await storage.getBankTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ error: 'Bank transaction not found' });
      }
      
      // Ensure user only deletes their own transactions
      if (transaction.userId !== (req.user as any).id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const result = await storage.deleteBankTransaction(id);
      res.json({ success: result });
    } catch (error) {
      console.error('Error deleting bank transaction:', error);
      res.status(500).json({ error: 'Failed to delete bank transaction' });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
