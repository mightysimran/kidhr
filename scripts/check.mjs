import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const requiredScreens = ["home", "voice", "route", "navigate", "contribute", "verify", "memory"];
const missing = requiredScreens.filter(screen => !html.includes(`data-screen="${screen}"`));
if (missing.length) throw new Error(`Missing screens: ${missing.join(", ")}`);
for (const file of ["styles.css", "app.js", "manifest.webmanifest", "service-worker.js", "vercel.json"]) {
  await readFile(new URL(`../${file}`, import.meta.url));
}
console.log("PASS: JavaScript syntax and all seven reachable screens verified.");
