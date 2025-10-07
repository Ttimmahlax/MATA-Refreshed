import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Explicitly serve static files from 'public' directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Set correct MIME type for WebAssembly files
app.use((req, res, next) => {
  if (req.path.endsWith('.wasm')) {
    res.set('Content-Type', 'application/wasm');
  }
  next();
});

// Add route to check database connectivity
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await checkDatabaseConnection();
    res.json({
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'error',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Database connection recovery
async function waitForDatabase(maxRetries = 5, retryDelay = 3000): Promise<boolean> {
  log('Checking database connection...');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const isConnected = await checkDatabaseConnection();
      if (isConnected) {
        log('Database connection established successfully');
        return true;
      }
      log(`Database connection attempt ${i+1}/${maxRetries} failed, retrying in ${retryDelay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    } catch (error) {
      log(`Database connection error: ${error instanceof Error ? error.message : String(error)}`);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  log('Failed to establish database connection after maximum retry attempts');
  return false;
}

(async () => {
  try {
    // Verify database connection before starting routes
    const dbConnected = await waitForDatabase();
    if (!dbConnected) {
      log('WARNING: Starting server with database issues - some features may not work correctly');
    }
    
    const server = await registerRoutes(app);

    // Enhanced error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      // Log the full error with stack trace
      console.error('Server error:', err);
      
      // Send a cleaner response to the client
      res.status(status).json({ 
        message,
        status: 'error',
        code: status
      });
      
      // Don't throw the error - this would crash the server
      // Just log it above and continue
    });

    // Set up database reconnection checking
    const DB_CHECK_INTERVAL = 30000; // 30 seconds
    setInterval(async () => {
      try {
        const isConnected = await checkDatabaseConnection();
        if (!isConnected) {
          log('Database connection lost, attempting to reconnect...');
          await waitForDatabase(3, 1000);
        }
      } catch (error) {
        console.error('Database health check failed:', error);
      }
    }, DB_CHECK_INTERVAL);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
    
    // Handle graceful shutdown
    const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
    signals.forEach(signal => {
      process.on(signal, async () => {
        log(`Received ${signal}, shutting down gracefully`);
        server.close(() => {
          log('HTTP server closed');
          process.exit(0);
        });
      });
    });
  } catch (error) {
    console.error('Fatal server startup error:', error);
    process.exit(1);
  }
})();
