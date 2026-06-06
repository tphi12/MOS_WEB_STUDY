import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

export function launchWordOfficeAddin() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Local Word launcher is disabled in production");
  }

  const frontendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../FE");
  const child = spawn(
    "npm",
    ["run", "office:start"],
    {
      cwd: frontendDirectory,
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();
}
