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

  if (!sourceStats?.isFile() || sourceStats.size === 0) {
    throw new Error(`Missing CAD export: ${source}. Run scripts/01_cad_build.sh first.`);
  }

  await copyFile(source, destination);
  console.log(`synced ${file} (${(sourceStats.size / 1_000_000).toFixed(1)} MB)`);
}
