/**
 * Express server setup and proxy initialization
 */

import express, { Express } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { ProxyConfig } from "./types.js";
import { HealthChecker } from "./health.js";
import { createRouter } from "./routes.js";

export interface ProxyServerOptions {
  port?: number;
}

/**
 * Build and return an Express app configured as a reverse proxy
 */
export function buildProxy(
  config: ProxyConfig,
  options: ProxyServerOptions = {}
): {
  app: Express;
  healthChecker: HealthChecker;
  listen: (port?: number) => Promise<void>;
  close: () => Promise<void>;
} {
  const app = express();
  const healthChecker = new HealthChecker();

  const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");

  // Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(express.static(publicDir));

  // Register routes with health checker
  for (const route of config.routes) {
    healthChecker.registerRoute(route);
  }

  // Create and attach proxy router
  const { router, getRoutes } = createRouter(config, healthChecker);
  app.get("/api/summary", (_req, res) => {
    const statuses = Array.from(healthChecker.getAllHealth().values());
    res.json({
      success: true,
      data: {
        service: "Relayboard",
        status: "operational",
        routeCount: getRoutes().length,
        upstreamCount: statuses.length,
        healthyCount: statuses.filter((status) => status.healthy).length,
        checkedAt: new Date().toISOString(),
      },
    });
  });

  app.get("/", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  app.use(router);

  // Error handler
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Internal Server Error",
          message: process.env.NODE_ENV === "development" ? err.message : undefined,
        });
      }
    }
  );

  let server: ReturnType<Express["listen"]> | null = null;

  return {
    app,
    healthChecker,
    listen: async (port?: number) => {
      const listenPort = port ?? options.port ?? 3000;

      return new Promise((resolve, reject) => {
        server = app.listen(listenPort, () => {
          console.log(`Reverse proxy listening on port ${listenPort}`);
          resolve();
        });

        server.on("error", reject);
      });
    },
    close: async () => {
      return new Promise((resolve, reject) => {
        if (!server) {
          resolve();
          return;
        }

        healthChecker.destroy();

        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },
  };
}
