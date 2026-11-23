import { rmSync } from "node:fs";

rmSync(".next", { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
console.log("Next.js cache cleared.");
