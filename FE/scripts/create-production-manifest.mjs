import { readFile, writeFile } from "node:fs/promises";

const productionUrl = process.env.WORDIE_WEB_URL?.replace(/\/$/, "");
if (!productionUrl?.startsWith("https://")) {
  throw new Error("Set WORDIE_WEB_URL to the HTTPS Vercel URL before generating the production manifest.");
}

const source = await readFile(new URL("../wordie-office-addin.xml", import.meta.url), "utf8");
const manifest = source.replaceAll("https://localhost:5173", productionUrl);
await writeFile(new URL("../wordie-office-addin.production.xml", import.meta.url), manifest);

console.log(`Created wordie-office-addin.production.xml for ${productionUrl}`);
