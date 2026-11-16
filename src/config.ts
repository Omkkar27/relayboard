/**
 * Configuration loading and validation
 */

import fs from "fs";
import path from "path";
import { ProxyConfig, RouteConfig } from "./types.js";

/**
 * Load and validate proxy configuration from a JSON file
 */
export function loadConfig(filePath: string): ProxyConfig {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Configuration file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  let config: unknown;

  try {
    config = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse configuration file: ${(error as Error).message}`,
    );
  }

  validateConfig(config);
  return config as ProxyConfig;
}

/**
 * Validate proxy configuration structure
 */
export function validateConfig(config: unknown): asserts config is ProxyConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Configuration must be an object");
  }

  const cfg = config as Record<string, unknown>;

  if (!Array.isArray(cfg.routes)) {
    throw new Error("Configuration must have a 'routes' array");
  }

  if (cfg.routes.length === 0) {
    throw new Error("At least one route must be configured");
  }

  cfg.routes.forEach((route, index) => {
    validateRoute(route, index);
  });
}

/**
 * Validate individual route configuration
 */
function validateRoute(route: unknown, index: number): void {
  if (!route || typeof route !== "object") {
    throw new Error(`Route ${index} must be an object`);
  }

  const r = route as Record<string, unknown>;

  // Validate match
  if (!r.match || typeof r.match !== "object") {
    throw new Error(`Route ${index}: must have a 'match' object`);
  }

  const match = r.match as Record<string, unknown>;
  if (!match.host && !match.pathPrefix) {
    throw new Error(
      `Route ${index}: match must have at least 'host' or 'pathPrefix'`,
    );
  }

  if (match.host && typeof match.host !== "string") {
    throw new Error(`Route ${index}: match.host must be a string`);
  }

  if (match.pathPrefix && typeof match.pathPrefix !== "string") {
    throw new Error(`Route ${index}: match.pathPrefix must be a string`);
  }

  // Validate upstream
  if (!r.upstream || typeof r.upstream !== "string") {
    throw new Error(`Route ${index}: must have a 'upstream' string`);
  }

  try {
    new URL(r.upstream);
  } catch {
    throw new Error(
      `Route ${index}: upstream must be a valid URL: ${r.upstream}`,
    );
  }

  // Validate optional fields
  if (r.stripPrefix !== undefined && typeof r.stripPrefix !== "boolean") {
    throw new Error(`Route ${index}: stripPrefix must be a boolean`);
  }

  if (
    r.addRequestHeaders !== undefined &&
    (typeof r.addRequestHeaders !== "object" || r.addRequestHeaders === null)
  ) {
    throw new Error(`Route ${index}: addRequestHeaders must be an object`);
  }

  if (
    r.removeRequestHeaders !== undefined &&
    !Array.isArray(r.removeRequestHeaders)
  ) {
    throw new Error(`Route ${index}: removeRequestHeaders must be an array`);
  }

  if (
    r.addResponseHeaders !== undefined &&
    (typeof r.addResponseHeaders !== "object" || r.addResponseHeaders === null)
  ) {
    throw new Error(`Route ${index}: addResponseHeaders must be an object`);
  }

  if (
    r.removeResponseHeaders !== undefined &&
    !Array.isArray(r.removeResponseHeaders)
  ) {
    throw new Error(`Route ${index}: removeResponseHeaders must be an array`);
  }

  // Validate health check
  if (r.healthCheck !== undefined) {
    validateHealthCheck(r.healthCheck, index);
  }
}

/**
 * Validate health check configuration
 */
function validateHealthCheck(
  healthCheck: unknown,
  routeIndex: number,
): asserts healthCheck is Record<string, unknown> {
  if (!healthCheck || typeof healthCheck !== "object") {
    throw new Error(`Route ${routeIndex}: healthCheck must be an object`);
  }

  const hc = healthCheck as Record<string, unknown>;

  if (!hc.path || typeof hc.path !== "string") {
    throw new Error(`Route ${routeIndex}: healthCheck.path must be a string`);
  }

  if (
    hc.intervalMs !== undefined &&
    (typeof hc.intervalMs !== "number" || hc.intervalMs <= 0)
  ) {
    throw new Error(`Route ${routeIndex}: healthCheck.intervalMs must be > 0`);
  }
}
