/**
 * Request routing logic - matches incoming requests to routes
 */

import { Request } from "express";
import { RouteConfig } from "./types.js";

/**
 * Find the first matching route for a request
 * Returns the route and the matched prefix if applicable
 */
export function matchRoute(
  routes: RouteConfig[],
  req: Request
): { route: RouteConfig; matchedPrefix?: string } | null {
  const host = req.get("host");
  const path = req.path;

  for (const route of routes) {
    const match = route.match;

    // Check host match
    if (match.host) {
      if (!host || !hostMatches(host, match.host)) {
        continue;
      }
    }

    // Check path prefix match
    if (match.pathPrefix) {
      if (!pathMatches(path, match.pathPrefix)) {
        continue;
      }
      return { route, matchedPrefix: match.pathPrefix };
    }

    // Only host was specified and matched
    if (match.host) {
      return { route };
    }
  }

  return null;
}

/**
 * Check if a host matches the configured host pattern
 * Supports exact matches and wildcard patterns
 */
function hostMatches(actual: string, pattern: string): boolean {
  // Remove port from actual host for comparison
  const actualHost = actual.split(":")[0];

  // Exact match
  if (pattern === actualHost) {
    return true;
  }

  // Wildcard support (e.g., "*.example.com" matches "api.example.com")
  if (pattern.startsWith("*.")) {
    const suffix = pattern.substring(1); // remove leading "*"
    return actualHost.endsWith(suffix);
  }

  return false;
}

/**
 * Check if a path starts with the given prefix
 */
function pathMatches(path: string, prefix: string): boolean {
  if (prefix === "/") {
    return true;
  }

  // Ensure prefix starts with /
  const normalizedPrefix = prefix.startsWith("/") ? prefix : "/" + prefix;

  return (
    path === normalizedPrefix || path.startsWith(normalizedPrefix + "/")
  );
}

/**
 * Strip the matched prefix from a path
 */
export function stripPathPrefix(path: string, prefix: string): string {
  if (prefix === "/") {
    return path;
  }

  const normalizedPrefix = prefix.startsWith("/") ? prefix : "/" + prefix;

  if (path === normalizedPrefix) {
    return "/";
  }

  if (path.startsWith(normalizedPrefix + "/")) {
    return path.substring(normalizedPrefix.length);
  }

  return path;
}
