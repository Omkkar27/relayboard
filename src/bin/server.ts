/**
 * CLI entry point for the reverse proxy server
 */

import { buildProxy } from "../server.js";
import { loadConfig } from "../config.js";

async function main(): Promise<void> {
  try {
    // Get configuration file path from command line or use default
    const configPath = process.argv[2] || "config.json";

    // Load configuration
    const config = loadConfig(configPath);

    // Build proxy server
    const { listen, close } = buildProxy(config);

    // Get port from environment variable or use default
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3100;

    // Start listening
    await listen(port);

    // Handle graceful shutdown
    const signals = ["SIGINT", "SIGTERM"];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`\nReceived ${signal}, shutting down gracefully...`);
        try {
          await close();
          process.exit(0);
        } catch (error) {
          console.error("Error during shutdown:", error);
          process.exit(1);
        }
      });
    }
  } catch (error) {
    console.error("Failed to start proxy server:", error);
    process.exit(1);
  }
}

main();
