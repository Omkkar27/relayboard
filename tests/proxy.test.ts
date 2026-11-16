/**
 * Integration tests for the reverse proxy
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express, { Express } from "express";
import { buildProxy } from "../src/server.js";
import { ProxyConfig } from "../src/types.js";

describe("Reverse Proxy Integration Tests", () => {
  let upstreamApp: Express;
  let upstreamPort: number;
  let upstreamUrl: string;
  let upstreamServer: ReturnType<Express["listen"]>;

  beforeAll(async () => {
    // Create upstream server that echoes request headers
    upstreamApp = express();
    upstreamApp.use(express.json());

    upstreamApp.all("*", (req, res) => {
      const responseHeaders: Record<string, string> = {};

      // Echo back all request headers as x-received-* headers
      for (const [key, value] of Object.entries(req.headers)) {
        if (key === "host" || key === "content-length") {
          continue;
        }

        const headerName = `x-received-${key}`;
        responseHeaders[headerName] =
          typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : "";
      }

      // Also echo the original request path
      res.json({
        path: req.path,
        ...responseHeaders,
      });
    });

    // Start upstream server on random port
    await new Promise<void>((resolve, reject) => {
      upstreamServer = upstreamApp.listen(0, () => {
        const address = upstreamServer.address();
        if (address && typeof address !== "string") {
          upstreamPort = address.port;
          upstreamUrl = `http://localhost:${upstreamPort}`;
          resolve();
        } else {
          reject(new Error("Failed to get server address"));
        }
      });

      upstreamServer.on("error", reject);
    });
  });

  afterAll(async () => {
    return new Promise<void>((resolve, reject) => {
      upstreamServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });

  it("should route requests with path prefix matching", async () => {
    const config: ProxyConfig = {
      routes: [
        {
          match: { pathPrefix: "/api" },
          upstream: upstreamUrl,
        },
      ],
    };

    const { app, close } = buildProxy(config);

    try {
      const response = await request(app).get("/api/users");

      expect(response.status).toBe(200);
      expect(response.body.path).toBe("/api/users");
    } finally {
      await close();
    }
  });

  it("should strip path prefix when configured", async () => {
    const config: ProxyConfig = {
      routes: [
        {
          match: { pathPrefix: "/api" },
          upstream: upstreamUrl,
          stripPrefix: true,
        },
      ],
    };

    const { app, close } = buildProxy(config);

    try {
      const response = await request(app).get("/api/users");

      expect(response.status).toBe(200);
      expect(response.body.path).toBe("/users");
    } finally {
      await close();
    }
  });

  it("should route requests with host matching", async () => {
    const config: ProxyConfig = {
      routes: [
        {
          match: { host: "app.local" },
          upstream: upstreamUrl,
        },
      ],
    };

    const { app, close } = buildProxy(config);

    try {
      const response = await request(app)
        .get("/test")
        .set("Host", "app.local");

      expect(response.status).toBe(200);
      expect(response.body.path).toBe("/test");
    } finally {
      await close();
    }
  });

  it("should add request headers to upstream request", async () => {
    const config: ProxyConfig = {
      routes: [
        {
          match: { pathPrefix: "/" },
          upstream: upstreamUrl,
          addRequestHeaders: {
            "x-custom-header": "custom-value",
            "x-another": "value123",
          },
        },
      ],
    };

    const { app, close } = buildProxy(config);

    try {
      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(response.body["x-received-x-custom-header"]).toBe("custom-value");
      expect(response.body["x-received-x-another"]).toBe("value123");
    } finally {
      await close();
    }
  });

  it("should remove request headers from upstream request", async () => {
    const config: ProxyConfig = {
      routes: [
        {
          match: { pathPrefix: "/" },
          upstream: upstreamUrl,
          removeRequestHeaders: ["x-secret", "authorization"],
        },
      ],
    };

    const { app, close } = buildProxy(config);

    try {
      const response = await request(app)
        .get("/test")
        .set("x-secret", "secret-value")
        .set("authorization", "Bearer token");

      expect(response.status).toBe(200);
      expect(response.body["x-received-x-secret"]).toBeUndefined();
      expect(response.body["x-received-authorization"]).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("should add response headers to client response", async () => {
    const config: ProxyConfig = {
      routes: [
        {
          match: { pathPrefix: "/" },
          upstream: upstreamUrl,
          addResponseHeaders: {
            "x-proxy-version": "1.0.0",
            "x-custom-response": "added-by-proxy",
          },
        },
      ],
    };

    const { app, close } = buildProxy(config);

    try {
      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(response.get("x-proxy-version")).toBe("1.0.0");
      expect(response.get("x-custom-response")).toBe("added-by-proxy");
    } finally {
      await close();
    }
  });

  it("should remove response headers from client response", async () => {
    const config: ProxyConfig = {
      routes: [
        {
          match: { pathPrefix: "/" },
          upstream: upstreamUrl,
          removeResponseHeaders: ["content-type"],
        },
      ],
    };

    const { app, close } = buildProxy(config);

    try {
      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(response.get("content-type")).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("should return 404 when no route matches", async () => {
    const config: ProxyConfig = {
      routes: [
        {
          match: { pathPrefix: "/api" },
          upstream: upstreamUrl,
        },
      ],
    };

    const { app, close } = buildProxy(config);

    try {
      const response = await request(app).get("/unknown");

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/No matching route/i);
    } finally {
      await close();
    }
  });

  it("should list all routes via management endpoint", async () => {
    const config: ProxyConfig = {
      routes: [
        {
          match: { pathPrefix: "/api" },
          upstream: upstreamUrl,
        },
        {
          match: { pathPrefix: "/docs" },
          upstream: upstreamUrl,
        },
      ],
    };

    const { app, close } = buildProxy(config);

    try {
      const response = await request(app).get("/_proxy/routes");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].match.pathPrefix).toBe("/api");
      expect(response.body.data[1].match.pathPrefix).toBe("/docs");
    } finally {
      await close();
    }
  });

  it("should check health via management endpoint", async () => {
    const config: ProxyConfig = {
      routes: [
        {
          match: { pathPrefix: "/api" },
          upstream: upstreamUrl,
        },
      ],
    };

    const { app, close } = buildProxy(config);

    try {
      const response = await request(app).get("/_proxy/health");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("ok");
      expect(response.body.data.upstreamCount).toBeGreaterThanOrEqual(1);
      expect(response.body.data.healthyCount).toBeGreaterThanOrEqual(0);
    } finally {
      await close();
    }
  });

  it("should forward upstream 5xx errors as-is", async () => {
    // Create an upstream that returns 502
    const errorUpstreamApp = express();
    errorUpstreamApp.all("*", (req, res) => {
      res.status(502).json({
        error: "Bad Gateway",
        message: "Upstream error",
      });
    });

    let errorUpstreamServer: ReturnType<Express["listen"]>;
    let errorUpstreamPort: number;

    await new Promise<void>((resolve, reject) => {
      errorUpstreamServer = errorUpstreamApp.listen(0, () => {
        const address = errorUpstreamServer.address();
        if (address && typeof address !== "string") {
          errorUpstreamPort = address.port;
          resolve();
        } else {
          reject(new Error("Failed to get server address"));
        }
      });

      errorUpstreamServer.on("error", reject);
    });

    try {
      const errorUpstreamUrl = `http://localhost:${errorUpstreamPort}`;

      const config: ProxyConfig = {
        routes: [
          {
            match: { pathPrefix: "/" },
            upstream: errorUpstreamUrl,
          },
        ],
      };

      const { app, close } = buildProxy(config);

      try {
        const response = await request(app).get("/test");

        expect(response.status).toBe(502);
        expect(response.body.error).toBe("Bad Gateway");
      } finally {
        await close();
      }
    } finally {
      return new Promise<void>((resolve, reject) => {
        errorUpstreamServer.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  });

  it("should preserve query strings when routing", async () => {
    const config: ProxyConfig = {
      routes: [
        {
          match: { pathPrefix: "/api" },
          upstream: upstreamUrl,
          stripPrefix: true,
        },
      ],
    };

    const { app, close } = buildProxy(config);

    try {
      const response = await request(app).get("/api/users?page=2&limit=10");

      expect(response.status).toBe(200);
      expect(response.body.path).toBe("/users");
    } finally {
      await close();
    }
  });

  it("should handle multiple routes with different prefixes", async () => {
    const config: ProxyConfig = {
      routes: [
        {
          match: { pathPrefix: "/api" },
          upstream: upstreamUrl,
          stripPrefix: true,
        },
        {
          match: { pathPrefix: "/static" },
          upstream: upstreamUrl,
          stripPrefix: false,
        },
      ],
    };

    const { app, close } = buildProxy(config);

    try {
      const apiResponse = await request(app).get("/api/data");
      expect(apiResponse.status).toBe(200);
      expect(apiResponse.body.path).toBe("/data");

      const staticResponse = await request(app).get("/static/file.js");
      expect(staticResponse.status).toBe(200);
      expect(staticResponse.body.path).toBe("/static/file.js");
    } finally {
      await close();
    }
  });
});
