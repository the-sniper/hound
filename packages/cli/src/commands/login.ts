import { Command } from "commander";
import { saveConfig } from "../client";
import readline from "readline";

export const loginCommand = new Command("login")
  .description("Configure Hound API connection")
  .option("--url <url>", "API server URL")
  .option("--key <key>", "API key")
  .action(async (options) => {
    if (options.url || options.key) {
      const config: Record<string, string> = {};
      if (options.url) config.apiUrl = options.url;
      if (options.key) config.apiKey = options.key;
      saveConfig(config);
      console.log("Configuration saved to ~/.hound/config.json");
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const ask = (q: string): Promise<string> =>
      new Promise((resolve) => rl.question(q, resolve));

    const apiUrl = await ask("API URL (http://localhost:3000): ");
    const apiKey = await ask("API Key: ");
    rl.close();

    saveConfig({
      apiUrl: apiUrl || "http://localhost:3000",
      apiKey,
    });
    console.log("Configuration saved to ~/.hound/config.json");
  });
