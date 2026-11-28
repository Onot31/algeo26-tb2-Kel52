import { DEFAULT_K, IMAGE_HEIGHT, IMAGE_WIDTH } from "@/lib/config";
import { buildPca } from "@/lib/math/pca";
import { loadSplit, type ManifestEntry } from "./dataset";
import type { ModelSnapshot } from "./types";
import { saveUpload } from "./upload";

type Store = {
  current: ModelSnapshot | null;
  error: string | null;
  tail: Promise<void>;
  pending: Promise<ModelSnapshot> | null;
};

const KEY = "__eigentsarStore";
const holder = globalThis as typeof globalThis & { [KEY]?: Store };

function store(): Store {
  if (!holder[KEY]) {
    holder[KEY] = { current: null, error: null, tail: Promise.resolve(), pending: null };
  }
  return holder[KEY];
}

export function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const s = store();
  const run = s.tail.then(job, job);
  s.tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function build(k: number): Promise<ModelSnapshot> {
  const train = await loadSplit("train");
  const model = buildPca(train.X, k);
  const prev = store().current;
  return {
    version: (prev ? prev.version : 0) + 1,
    createdAt: new Date().toISOString(),
    k: model.k,
    r: model.r,
    nImages: train.labels.length,
    nSubjects: new Set(train.labels).size,
    preprocess: {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      grayscale: "bt601",
      scale: "0-255",
      order: "row-major",
    },
    labels: train.labels,
    imageIds: train.imageIds,
    vr: model.vr,
    model,
  };
}

export function rebuild(k: number): Promise<ModelSnapshot> {
  const s = store();
  return enqueue(async () => {
    const next = await build(k);
    s.current = next;
    s.error = null;
    return next;
  }).catch((err) => {
    s.error = err instanceof Error ? err.message : String(err);
    throw err;
  });
}

export function warm(k: number = DEFAULT_K): Promise<ModelSnapshot> {
  const s = store();
  if (s.current) return Promise.resolve(s.current);
  if (s.pending) return s.pending;
  s.pending = rebuild(k).finally(() => {
    s.pending = null;
  });
  return s.pending;
}

export function addImage(
  buffer: Buffer,
  subjectId?: string,
  newSubjectName?: string,
): Promise<{ entry: ManifestEntry; snapshot: ModelSnapshot }> {
  const s = store();
  const k = s.current ? s.current.k : DEFAULT_K;
  return enqueue(async () => {
    const entry = await saveUpload(buffer, subjectId, newSubjectName);
    const next = await build(k);
    s.current = next;
    s.error = null;
    return { entry, snapshot: next };
  }).catch((err) => {
    s.error = err instanceof Error ? err.message : String(err);
    throw err;
  });
}

export function snapshot(): ModelSnapshot {
  const s = store();
  if (!s.current) {
    throw new Error(`Model belum siap${s.error ? `: ${s.error}` : ""}`);
  }
  return s.current;
}