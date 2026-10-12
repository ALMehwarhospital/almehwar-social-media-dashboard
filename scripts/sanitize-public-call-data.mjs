import fs from "node:fs";
import path from "node:path";

export function stripCallData(value) {
  if (Array.isArray(value)) return value.map(stripCallData);
  if (!value || typeof value !== "object") return value;
  const clean = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "inboundCalls") { clean[key] = Array.isArray(item) ? [] : 0; continue; }
    clean[key] = stripCallData(item);
  }
  return clean;
}

const directory = path.resolve("public/data");
for (const file of fs.existsSync(directory) ? fs.readdirSync(directory) : []) {
  const target = path.join(directory, file);
  if (/^inbound-calls.*\.json$/i.test(file)) {
    fs.rmSync(target); // Published data is removed; the private Google Sheet remains intact.
    continue;
  }
  if (!file.endsWith(".json") || !fs.statSync(target).isFile()) continue;
  const original = JSON.parse(fs.readFileSync(target, "utf8"));
  fs.writeFileSync(target, JSON.stringify(stripCallData(original)) + "\n");
}
console.log("Private call-center data excluded from public assets.");
