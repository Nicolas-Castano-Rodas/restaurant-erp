import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const directory = "src/generated/prisma";
const stamp = join(directory, ".generation-stamp");
const hash = createHash("sha256");
for (const file of ["prisma/schema.prisma", "prisma.config.ts", "node_modules/prisma/package.json", "node_modules/@prisma/client/package.json"]) {
  hash.update(file);
  hash.update(readFileSync(file));
}
const fingerprint = hash.digest("hex");
if (existsSync(join(directory, "client.ts")) && existsSync(stamp) && readFileSync(stamp, "utf8") === fingerprint) {
  console.log("Prisma Client is up to date.");
} else {
  const cli = join("node_modules", "prisma", "build", "index.js");
  const result = spawnSync(process.execPath, [cli, "generate"], { stdio: "inherit" });
  if (result.error || result.status !== 0) {
    console.error("Prisma generation failed. Run npm install and retry.");
    process.exitCode = 1;
  } else {
    writeFileSync(stamp, fingerprint);
  }
}
