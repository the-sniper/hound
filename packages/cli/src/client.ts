import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".hound");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

interface HoundConfig {
  apiUrl: string;
  apiKey: string;
}

export function getConfig(): HoundConfig {
  const apiUrl = process.env.HOUND_API_URL || "http://localhost:3000";
  const apiKey = process.env.HOUND_API_KEY || "";

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      return {
        apiUrl: process.env.HOUND_API_URL || config.apiUrl || apiUrl,
        apiKey: process.env.HOUND_API_KEY || config.apiKey || apiKey,
      };
    } catch {
      // ignore invalid config
    }
  }

  return { apiUrl, apiKey };
}

export function saveConfig(config: Partial<HoundConfig>): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const existing = fs.existsSync(CONFIG_FILE)
    ? JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"))
    : {};
  const merged = { ...existing, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
}

export async function apiRequest<T>(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<T> {
  const config = getConfig();
  const url = `${config.apiUrl}/api${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(
      `API error (${response.status}): ${(error as Record<string, string>).error || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}
