/**
 * Express router setup - handles both proxy routes and management endpoints
 */

import { Router, Request, Response } from "express";
import { ProxyConfig, RouteConfig, RouteInfo } from "./types.js";
import { HealthChecker } from "./health.js";
import { matchRoute, stripPathPrefix } from "./router.js";
import { forwardRequest } from "./proxy.js";

/**
 * Create Express router with proxy and management endpoints
 */
export function createRouter(
  config: ProxyConfig,
  healthChecker: HealthChecker
): { router: Router; getRoutes: () => RouteConfig[]; addRoute: (route: RouteConfig) => void; removeRoute: (index: number) => void } {
  const router = Router();
  let currentRoutes = [...config.routes];

  /**
   * Management endpoint: List all routes and their health status
   */
  router.get("/_proxy/routes", (req: Request, res: Response) => {
    const routeInfos: RouteInfo[] = currentRoutes.map((route, index) => ({
      ...route,
      index,
      upstreamHealth: healthChecker.getHealth(route.upstream),
    }));

    res.json({
      success: true,
      data: routeInfos,
    });
  });

  /**
   * Management endpoint: Add a new route at runtime
   */
  router.post("/_proxy/routes", (req: Request, res: Response) => {
    try {
      const newRoute = req.body as RouteConfig;

      // Basic validation
      if (!newRoute.match || !newRoute.upstream) {
        return res.status(400).json({
          success: false,
          error: "Invalid route: must have 'match' and 'upstream'",
        });
      }

      if (!newRoute.match.host && !newRoute.match.pathPrefix) {
        return res.status(400).json({
          success: false,
          error: "Invalid route: must have 'host' or 'pathPrefix' in match",
        });
      }

      // Add route to immutable copy
      currentRoutes = [...currentRoutes, newRoute];
      healthChecker.registerRoute(newRoute);

      res.status(201).json({
        success: true,
        data: {
          route: newRoute,
          index: currentRoutes.length - 1,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Management endpoint: Remove a route by index
   */
  router.delete("/_proxy/routes/:index", (req: Request, res: Response) => {
    const index = parseInt(req.params.index, 10);

    if (isNaN(index) || index < 0 || index >= currentRoutes.length) {
      return res.status(404).json({
        success: false,
        error: "Route not found",
      });
    }

    const removed = currentRoutes[index];
    currentChecker.unregisterRoute(removed);

    // Create immutable copy
    currentRoutes = currentRoutes.filter((_, i) => i !== index);

    res.json({
      success: true,
      message: "Route removed",
      data: removed,
    });
  });

  /**
   * Management endpoint: Check proxy health
   */
  router.get("/_proxy/health", (req: Request, res: Response) => {
    const allHealth = healthChecker.getAllHealth();
    const healthyCount = Array.from(allHealth.values()).filter(
      (h) => h.healthy
    ).length;

    res.json({
      success: true,
      data: {
        status: "ok",
        upstreamCount: allHealth.size,
        healthyCount,
        unhealthyUpstreams: Array.from(allHealth.values())
          .filter((h) => !h.healthy)
          .map((h) => ({ url: h.url, error: h.error })),
      },
    });
  });

  // Store reference for route removal
  let currentChecker = healthChecker;

  /**
   * Main proxy handler - forwards matching requests to upstreams
   */
  router.all("*", async (req: Request, res: Response, next) => {
    const result = matchRoute(currentRoutes, req);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "No matching route found",
      });
    }

    const { route, matchedPrefix } = result;

    // Check upstream health
    if (!healthChecker.isHealthy(route.upstream)) {
      return res.status(502).json({
        success: false,
        error: "Upstream server is unhealthy",
      });
    }

    // Construct forward path
    let forwardPath = req.originalUrl || req.url;

    // Remove query string if present
    const queryIndex = forwardPath.indexOf("?");
    const pathOnly = queryIndex > -1
      ? forwardPath.substring(0, queryIndex)
      : forwardPath;

    // Strip matched prefix if configured
    const finalPath = route.stripPrefix && matchedPrefix
      ? stripPathPrefix(pathOnly, matchedPrefix)
      : pathOnly;

    // Append query string back if present
    const finalPathWithQuery = queryIndex > -1
      ? finalPath + forwardPath.substring(queryIndex)
      : finalPath;

    try {
      await forwardRequest(req, res, route, finalPathWithQuery);
    } catch (error) {
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: "Proxy error",
          message: (error as Error).message,
        });
      }
    }
  });

  return {
    router,
    getRoutes: () => [...currentRoutes],
    addRoute: (route: RouteConfig) => {
      currentRoutes = [...currentRoutes, route];
      healthChecker.registerRoute(route);
    },
    removeRoute: (index: number) => {
      if (index >= 0 && index < currentRoutes.length) {
        const removed = currentRoutes[index];
        healthChecker.unregisterRoute(removed);
        currentRoutes = currentRoutes.filter((_, i) => i !== index);
      }
    },
  };
}
