import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { requireDisposableDatabase } from "./scripts/demo-fixture";

requireDisposableDatabase("test");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://localhost:3100", trace: "off", screenshot: "off", video: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run start -- --hostname localhost --port 3100", url: "http://localhost:3100/api/health", reuseExistingServer: false, timeout: 90000 },
});
