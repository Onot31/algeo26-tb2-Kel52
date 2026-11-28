import { promises as fs } from "node:fs";
import path from "node:path";
import { matrix, type Matrix } from "mathjs";
import { FEATURE_DIM } from "@/lib/config";
import { imageToVector } from "@/lib/image/initialization";

export type ManifestEntry = { subjectId: string; file: string };
export type Dataset = { X: Matrix; vectors: Float64Array[]; labels: string[]; imageIds: string[] };
export type Split = "train" | "validation";

type Manifest = { split?: Partial<Record<Split, ManifestEntry[]>> };

const DATA_DIR = path.resolve("data");

export async function loadManifest(): Promise<Record<Split, ManifestEntry[]>> {
  const file = path.join(DATA_DIR, "manifest.json");
  let raw: Manifest;
  try {
    raw = JSON.parse(await fs.readFile(file, "utf8")) as Manifest;
  } catch {
    throw new Error(`Tidak bisa membaca ${file} — jalankan dulu: npx tsx src/scripts/build-manifest.ts`);
  }
  const train = raw.split?.train;
  const validation = raw.split?.validation;
  if (!train || !validation) throw new Error("manifest.json tidak punya split.train dan split.validation");
  return { train, validation };
}

export async function loadSplit(split: Split): Promise<Dataset> {
  const entries = (await loadManifest())[split];
  const dir = path.join(DATA_DIR, split);
  const vectors: Float64Array[] = [];
  for (const entry of entries) {
    const buffer = await fs.readFile(path.join(dir, entry.file));
    vectors.push(await imageToVector(buffer));
  }
  const columns = Array.from({ length: FEATURE_DIM }, (_, i) => vectors.map((v) => v[i]));
  return {
    X: matrix(columns),
    vectors,
    labels: entries.map((e) => e.subjectId),
    imageIds: entries.map((e) => e.file),
  };
}
