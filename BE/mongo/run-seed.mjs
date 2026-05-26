import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function loadEnvFile() {
  try {
    const lines = readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trimStart().startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (key && !process.env[key]) process.env[key] = value;
    }
  } catch {
    // Environment variables from the shell or hosting platform are enough.
  }
}

loadEnvFile();

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/mos_web_study";
const escapedUri = uri.replace(/"/g, '\\"');
const result = spawnSync(`mongosh "${escapedUri}" --apiVersion 1 mongo/seed.js`, {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
