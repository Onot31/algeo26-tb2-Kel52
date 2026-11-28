import { promises as fs } from "node:fs";
import path from "node:path";
import { matrix, type Matrix } from "mathjs";
import { FEATURE_DIM } from "@/lib/config";
import { imageToVector } from "@/lib/image/initialization";

export type ManifestEntry = { subjectId: string; file: string };
export type Dataset = { X: Matrix; vectors: Float64Array[]; labels: string[]; imageIds: string[] };
export type Split = "train" | "validation";

type Manifest = { split?: Partial<Record<Split, ManifestEntry[]>> };
type Source = { entry: ManifestEntry; dir: string; id: string };

const DATA_DIR = path.resolve("data");

export function uploadsDir(): string {
  return path.join(DATA_DIR, "uploads");
}

export function extraFile(): string {
  return path.join(uploadsDir(), "extra-manifest.json");
}

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

export async function loadExtra(): Promise<ManifestEntry[]> {
  let raw: { entries?: ManifestEntry[] };
  try {
    raw = JSON.parse(await fs.readFile(extraFile(), "utf8")) as { entries?: ManifestEntry[] };
  } catch {
    return [];
  }
  return Array.isArray(raw.entries) ? raw.entries : [];
}

async function sources(split: Split): Promise<Source[]> {
  const base = path.join(DATA_DIR, split);
  const official = (await loadManifest())[split].map((entry) => ({
    entry,
    dir: base,
    id: `${split}/${entry.file}`,
  }));
  if (split !== "train") return official;
  const extra = (await loadExtra()).map((entry) => ({
    entry,
    dir: uploadsDir(),
    id: `uploads/${entry.file}`,
  }));
  return [...official, ...extra];
}

export async function loadSplit(split: Split): Promise<Dataset> {
  const list = await sources(split);
  const vectors: Float64Array[] = [];
  for (const item of list) {
    const buffer = await fs.readFile(path.join(item.dir, item.entry.file));
    vectors.push(await imageToVector(buffer));
  }
  const columns = Array.from({ length: FEATURE_DIM }, (_, i) => vectors.map((v) => v[i]));
  return {
    X: matrix(columns),
    vectors,
    labels: list.map((item) => item.entry.subjectId),
    imageIds: list.map((item) => item.id),
  };
}

export async function knownSubjects(): Promise<string[]> {
  return Array.from(new Set((await sources("train")).map((item) => item.entry.subjectId)));
}