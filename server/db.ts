import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure neon to use the websocket constructor
neonConfig.webSocketConstructor = ws;

// Add robust connection handling
neonConfig.fetchConnectionCache = true;
neonConfig.pipelineTLS = true;
neonConfig.useSecureWebSocket = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a pool with enhanced configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Increase max connections
  idleTimeoutMillis: 30000, // Longer timeout for idle connections
  connectionTimeoutMillis: 5000, // Timeout after 5s when connecting
  maxUses: 7500 // Recycle connections after 7500 uses
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected database pool error', err);
  // Don't crash on pool errors - let the app attempt to reconnect
});

export const db = drizzle({ client: pool, schema });

// Function to verify database connectivity
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}
