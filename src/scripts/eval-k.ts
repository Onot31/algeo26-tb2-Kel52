import { promises as fs } from "node:fs";
import path from "node:path";
import { loadSplit } from "@/lib/model/dataset";
import { getColumn } from "@/lib/math/matrix";
import { buildPca, project } from "@/lib/math/pca";

const KS = [10, 20, 30, 40, 60, 80, 120];

function distSq(a: Float64Array, b: Float64Array) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

async function main() {
  const train = await loadSplit("train");
  const val = await loadSplit("validation");
  const n = train.labels.length;
  const subjects = Array.from(new Set(train.labels));
  const rows = ["k,accuracy_percent,build_ms,mean_query_ms"];

  for (const k of KS) {
    const tBuild = performance.now();
    const model = buildPca(train.X, k);
    const buildMs = performance.now() - tBuild;

    const zTrain: Float64Array[] = [];
    for (let j = 0; j < n; j++) zTrain.push(getColumn(model.Z, j));

    const centroids: { label: string; z: Float64Array }[] = [];
    for (const s of subjects) {
      const z = new Float64Array(k);
      let c = 0;
      for (let j = 0; j < n; j++) {
        if (train.labels[j] !== s) continue;
        for (let i = 0; i < k; i++) z[i] += zTrain[j][i];
        c++;
      }
      for (let i = 0; i < k; i++) z[i] /= c;
      centroids.push({ label: s, z });
    }

    let centroidHit = 0;
    let nnHit = 0;
    let queryMs = 0;
    for (let q = 0; q < val.vectors.length; q++) {
      const t0 = performance.now();
      const z = project(val.vectors[q], model);
      let bestC = Infinity;
      let labelC = "";
      for (const c of centroids) {
        const d = distSq(z, c.z);
        if (d < bestC) {
          bestC = d;
          labelC = c.label;
        }
      }
      let bestN = Infinity;
      let labelN = "";
      for (let j = 0; j < n; j++) {
        const d = distSq(z, zTrain[j]);
        if (d < bestN) {
          bestN = d;
          labelN = train.labels[j];
        }
      }
      queryMs += performance.now() - t0;
      if (labelC === val.labels[q]) centroidHit++;
      if (labelN === val.labels[q]) nnHit++;
    }

    const zSelf = project(train.vectors[0], model);
    const near = zTrain
      .map((z, j) => ({ j, d: distSq(zSelf, z) }))
      .sort((a, b) => a.d - b.d);

    const acc = (100 * centroidHit) / val.vectors.length;
    rows.push(`${k},${acc.toFixed(2)},${buildMs.toFixed(0)},${(queryMs / val.vectors.length).toFixed(2)}`);
    console.log(
      `k=${String(k).padStart(3)} r=${model.r} vr=${(100 * model.vr[k - 1]).toFixed(2)}% centroid=${acc.toFixed(1)}% (${centroidHit}/${val.vectors.length}) 1NN=${((100 * nnHit) / val.vectors.length).toFixed(1)}% build=${(buildMs / 1000).toFixed(1)}s query=${(queryMs / val.vectors.length).toFixed(2)}ms`,
    );
    console.log(
      `          sanity: train[0] sebagai kueri -> terdekat train[${near[0].j}] jarak=${Math.sqrt(near[0].d).toExponential(2)}, kedua train[${near[1].j}] jarak=${Math.sqrt(near[1].d).toFixed(1)}`,
    );
  }

  const file = path.join(path.resolve("docs"), "experiments.csv");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${rows.join("\n")}\n`, "utf8");
  console.log(`csv: ${path.relative(process.cwd(), file)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
