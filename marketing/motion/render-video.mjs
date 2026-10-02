// Exporte l'animation en MP4 (1920×1080, 30 i/s) image par image.
// Usage : node marketing/motion/render-video.mjs [sortie.mp4]
// Nécessite Playwright (PLAYWRIGHT_MODULE pour un chemin précis) et ffmpeg (FFMPEG, sinon « ffmpeg »).
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || path.join(here, "explisite-motion.mp4"));
const FPS = Number(process.env.FPS) || 30;
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "explisite-motion.html")).href + "?export");
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.__duration);
const frames = Math.round(duration * FPS);

const ff = spawn(process.env.FFMPEG || "ffmpeg", [
  "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
], { stdio: ["pipe", "inherit", "inherit"] });

for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.__render(t), i / FPS);
  const png = await page.locator("#stage").screenshot({ type: "png" });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % (FPS * 2) === 0) process.stdout.write(`\r${Math.round((i / frames) * 100)} %`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log(`\r✓ ${out}`);
