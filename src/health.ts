/**
 * Health checking for upstream servers
 */

import http from "http";
import https from "https";
import { RouteConfig, UpstreamHealth } from "./types.js";

/**
 * Manages health checking of upstream servers
 * Periodically polls health endpoints and tracks status
 */
export class HealthChecker {
  private healthStatus = new Map<string, UpstreamHealth>();
  private timers = new Map<string, NodeJS.Timeout>();

  constructor() {
    // Initialize with all upstreams as healthy by default
  }

  /**
   * Register a route for health checking
   */
  registerRoute(route: RouteConfig): void {
    if (!route.healthCheck) {
      // No health check configured, assume healthy
      this.healthStatus.set(route.upstream, {
        url: route.upstream,
        healthy: true,
      });
      return;
    }

    // Initialize as healthy
    this.healthStatus.set(route.upstream, {
      url: route.upstream,
      healthy: true,
    });

    // Start health check interval
    this.startHealthCheck(route);
  }

  /**
   * Unregister a route (stop its health check)
   */
  unregisterRoute(route: RouteConfig): void {
    const timer = this.timers.get(route.upstream);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(route.upstream);
    }
  }

  /**
   * Get health status of an upstream
   */
  isHealthy(upstream: string): boolean {
    const status = this.healthStatus.get(upstream);
    return status?.healthy ?? true;
  }

  /**
   * Get full health information for an upstream
   */
  getHealth(upstream: string): UpstreamHealth {
    return (
      this.healthStatus.get(upstream) ?? {
        url: upstream,
        healthy: true,
      }
    );
  }

  /**
   * Get all health statuses
   */
  getAllHealth(): Map<string, UpstreamHealth> {
    return new Map(this.healthStatus);
  }

  /**
   * Manually check health of an upstream
   */
  async checkUpstreamHealth(
    upstream: string,
    healthPath: string
  ): Promise<boolean> {
    try {
      const url = new URL(healthPath, upstream);
      const protocol = url.protocol === "https:" ? https : http;

      return await new Promise((resolve) => {
        const request = protocol.get(url.toString(), { timeout: 5000 }, (res) => {
          const statusCode = res.statusCode || 500;
          request.destroy();
          resolve(statusCode >= 200 && statusCode < 300);
        });

        request.on("error", () => {
          request.destroy();
          resolve(false);
        });

        request.on("timeout", () => {
          request.destroy();
          resolve(false);
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Start health check interval for a route
   */
  private startHealthCheck(route: RouteConfig): void {
    if (!route.healthCheck) {
      return;
    }

    const interval = route.healthCheck.intervalMs ?? 10000;

    // Perform initial check
    this.performHealthCheck(route);

    // Set up periodic checks
    const timer = setInterval(() => {
      this.performHealthCheck(route);
    }, interval);

    this.timers.set(route.upstream, timer);
  }

  /**
   * Perform a single health check and update status
   */
  private async performHealthCheck(route: RouteConfig): Promise<void> {
    if (!route.healthCheck) {
      return;
    }

    try {
      const healthy = await this.checkUpstreamHealth(
        route.upstream,
        route.healthCheck.path
      );

      const current = this.healthStatus.get(route.upstream);
      if (current) {
        this.healthStatus.set(route.upstream, {
          ...current,
          healthy,
          lastCheck: Date.now(),
          error: undefined,
        });
      }
    } catch (error) {
      const current = this.healthStatus.get(route.upstream);
      if (current) {
        this.healthStatus.set(route.upstream, {
          ...current,
          healthy: false,
          lastCheck: Date.now(),
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Destroy all timers (for cleanup)
   */
  destroy(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }
}
