import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_K, FEATURE_DIM } from "@/lib/config";
import { loadSplit } from "@/lib/model/dataset";
import { getColumn } from "@/lib/math/matrix";
import { buildPca } from "@/lib/math/pca";
import { range, saveGrayPng } from "@/lib/image/img-gen";

const EIGENFACES = 10;

async function main() {
  const outDir = path.resolve("docs");
  await fs.mkdir(outDir, { recursive: true });

  const tLoad = performance.now();
  const { X, labels } = await loadSplit("train");
  console.log(`data       : ${FEATURE_DIM}x${labels.length} dimuat dalam ${(performance.now() - tLoad).toFixed(0)} ms`);

  const tBuild = performance.now();
  const model = buildPca(X, DEFAULT_K);
  console.log(`model      : r=${model.r} k=${model.k} build ${(performance.now() - tBuild).toFixed(0)} ms`);

  for (const i of [0, 4, 9, 19, 39]) {
    if (i < model.k) {
      console.log(`varians    : k=${String(i + 1).padStart(2)} -> ${(model.vr[i] * 100).toFixed(2)}%`);
    }
  }

  await saveGrayPng(path.join(outDir, "mean-face.png"), model.mu, 0, 255);
  for (let i = 0; i < Math.min(EIGENFACES, model.k); i++) {
    const u = getColumn(model.Uk, i);
    const { min, max } = range(u);
    await saveGrayPng(path.join(outDir, `eigenface-${i + 1}.png`), u, min, max);
    console.log(`eigenface  : ${i + 1} sigma=${model.S[i].toFixed(2)} min=${min.toFixed(3)} max=${max.toFixed(3)}`);
  }
  console.log(`gambar     : ditulis ke ${path.relative(process.cwd(), outDir)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
