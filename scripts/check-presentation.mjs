import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const index = await readFile(path.join(root, "index.html"), "utf8");

const modelFiles = ["v10_chassis.stl", "v10_cover.stl", "v10_clip.stl", "v10_battery.stl", "v10_electronics.stl", "v10_refill.stl"];
for (const file of modelFiles) {
  const modelPath = path.join(root, "public", "models", file);
  const modelStats = await stat(modelPath).catch(() => null);
  if (!modelStats?.isFile() || modelStats.size < 84) {
    throw new Error(`Invalid or missing viewer model: ${modelPath}`);
  }
}

const mediaReferences = [...index.matchAll(/(?:src|data-fallback-src)="\.\/media\/([^"]+)"/g)]
  .map((match) => match[1]);

for (const file of new Set(mediaReferences)) {
  const mediaPath = path.join(root, "public", "media", file);
  const mediaStats = await stat(mediaPath).catch(() => null);
  if (!mediaStats?.isFile() || mediaStats.size < 64) {
    throw new Error(`Invalid or missing media: ${mediaPath}`);
  }
}

const slideCount = (index.match(/<section class="slide/g) || []).length;
if (slideCount !== 19) {
  throw new Error(`Expected 19 slides, found ${slideCount}`);
}

console.log(`presentation check passed: ${slideCount} slides, ${modelFiles.length} models, ${new Set(mediaReferences).size} media slots`);
