// Exporte une animation en MP4 (1920×1080, 30 i/s) image par image, avec une bande-son facultative.
// Usage :
//   node marketing/motion/render-video.mjs                                  → explisite-motion.mp4 (24 s, muet)
//   node marketing/motion/render-video.mjs --html explisite-15s.html --audio explisite-15s.wav explisite-15s.mp4
// Nécessite Playwright (PLAYWRIGHT_MODULE pour un chemin précis) et ffmpeg (FFMPEG, sinon « ffmpeg »).
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
const html = path.resolve(here, opt("--html") || "explisite-motion.html");
const audio = opt("--audio");
const out = path.resolve(here, args[0] || path.basename(html, ".html") + ".mp4");
const FPS = Number(process.env.FPS) || 30;
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(html).href + "?export");
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.__duration);
const frames = Math.round(duration * FPS);

const input = ["-f", "image2pipe", "-framerate", String(FPS), "-i", "-"];
if (audio) input.push("-i", path.resolve(here, audio));
const ff = spawn(process.env.FFMPEG || "ffmpeg", [
  "-y", "-loglevel", "error", ...input,
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
  ...(audio ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : []),
  "-movflags", "+faststart", out,
], { stdio: ["pipe", "inherit", "inherit"] });

for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.__render(t), i / FPS);
  const png = await page.locator("#stage").screenshot({ type: "png" });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % (FPS * 2) === 0) process.stdout.write(`\r${Math.round((i / frames) * 100)} %`);
}
ff.stdin.end();
await new Promise((r, j) => ff.on("close", (c) => (c ? j(new Error("ffmpeg " + c)) : r())));
await browser.close();
console.log(`\r100 % → ${path.relative(process.cwd(), out)}`);
