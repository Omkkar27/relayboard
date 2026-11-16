/**
 * Request forwarding logic - sends requests to upstream servers
 */

import http from "http";
import https from "https";
import { Request, Response } from "express";
import { RouteConfig } from "./types.js";

/**
 * List of hop-by-hop headers that should not be forwarded
 */
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
  "content-length",
]);

/**
 * Copy headers from source to destination, filtering hop-by-hop headers
 */
function copyHeaders(
  source: Record<string, string | string[]>,
  destination: Record<string, string>
): void {
  for (const [key, value] of Object.entries(source)) {
    const lowerKey = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lowerKey)) {
      continue;
    }

    if (typeof value === "string") {
      destination[lowerKey] = value;
    } else if (Array.isArray(value)) {
      destination[lowerKey] = value.join(", ");
    }
  }
}

/**
 * Apply header modifications (add and remove)
 */
function applyHeaderModifications(
  headers: Record<string, string>,
  addHeaders?: Record<string, string>,
  removeHeaders?: string[]
): Record<string, string> {
  const modified = { ...headers };

  // Remove headers
  if (removeHeaders) {
    for (const header of removeHeaders) {
      delete modified[header.toLowerCase()];
    }
  }

  // Add headers
  if (addHeaders) {
    for (const [key, value] of Object.entries(addHeaders)) {
      modified[key.toLowerCase()] = value;
    }
  }

  return modified;
}

/**
 * Forward an incoming request to an upstream server
 */
export async function forwardRequest(
  req: Request,
  res: Response,
  route: RouteConfig,
  forwardPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const upstreamUrl = new URL(forwardPath, route.upstream);
      const protocol = upstreamUrl.protocol === "https:" ? https : http;

      // Prepare request headers
      const forwardHeaders: Record<string, string> = {};
      copyHeaders(req.headers as Record<string, string | string[]>, forwardHeaders);

      // Apply request header modifications
      const finalHeaders = applyHeaderModifications(
        forwardHeaders,
        route.addRequestHeaders,
        route.removeRequestHeaders
      );

      // Add host header
      finalHeaders["host"] = upstreamUrl.host;

      // Make the upstream request
      const upstreamReq = protocol.request(
        upstreamUrl,
        {
          method: req.method,
          headers: finalHeaders,
          timeout: 30000,
        },
        (upstreamRes) => {
          // Set response status code
          res.status(upstreamRes.statusCode || 500);

          // Copy response headers
          const responseHeaders: Record<string, string> = {};
          copyHeaders(
            upstreamRes.headers as Record<string, string | string[]>,
            responseHeaders
          );

          // Apply response header modifications
          const finalResponseHeaders = applyHeaderModifications(
            responseHeaders,
            route.addResponseHeaders,
            route.removeResponseHeaders
          );

          // Set response headers
          for (const [key, value] of Object.entries(finalResponseHeaders)) {
            res.setHeader(key, value);
          }

          // Pipe response body
          upstreamRes.pipe(res);

          upstreamRes.on("error", (error) => {
            if (!res.headersSent) {
              res.status(502).json({
                error: "Bad Gateway",
                message: "Error reading upstream response",
              });
            }
            reject(error);
          });

          upstreamRes.on("end", () => {
            resolve();
          });
        }
      );

      // Handle errors
      upstreamReq.on("error", (error) => {
        if (!res.headersSent) {
          res.status(502).json({
            error: "Bad Gateway",
            message: "Failed to reach upstream server",
            details: (error as Error).message,
          });
        }
        reject(error);
      });

      upstreamReq.on("timeout", () => {
        upstreamReq.destroy();
        if (!res.headersSent) {
          res.status(504).json({
            error: "Gateway Timeout",
            message: "Upstream server did not respond in time",
          });
        }
        reject(new Error("Upstream request timeout"));
      });

      // Pipe request body
      req.pipe(upstreamReq);

      // Handle request errors
      req.on("error", (error) => {
        upstreamReq.destroy();
        if (!res.headersSent) {
          res.status(400).json({
            error: "Bad Request",
            message: "Error reading request body",
          });
        }
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}
