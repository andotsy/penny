import { copyFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const presentationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.resolve(presentationRoot, "..", "cad", "v10_out");
const destinationRoot = path.join(presentationRoot, "public", "models");
const modelFiles = ["v10_chassis.stl", "v10_cover.stl", "v10_clip.stl", "v10_battery.stl", "v10_electronics.stl", "v10_refill.stl"];

await mkdir(destinationRoot, { recursive: true });

for (const file of modelFiles) {
  const source = path.join(sourceRoot, file);
  const destination = path.join(destinationRoot, file);
  const sourceStats = await stat(source).catch(() => null);

  // Standalone repo (this one): there is no ../cad tree — the STLs are committed straight
  // into public/models. Only re-sync when a CAD export actually exists; otherwise trust the
  // committed copy, and only complain if it's missing too.
  if (!sourceStats?.isFile() || sourceStats.size === 0) {
    const destStats = await stat(destination).catch(() => null);
    if (destStats?.isFile() && destStats.size > 0) {
      console.log(`kept committed ${file} (${(destStats.size / 1_000_000).toFixed(1)} MB)`);
      continue;
    }
    throw new Error(`Missing model: no CAD export at ${source} and no committed copy at ${destination}.`);
  }

  await copyFile(source, destination);
  console.log(`synced ${file} (${(sourceStats.size / 1_000_000).toFixed(1)} MB)`);
}
