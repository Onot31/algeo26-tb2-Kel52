import { promises as fs } from "node:fs";
import path from "node:path";
import { extraFile, loadSplit } from "@/lib/model/dataset";
import { addImage, snapshot, warm } from "@/lib/model/store";

async function main() {
  const t0 = performance.now();
  const a = await warm();
  console.log(`awal       : v${a.version} k=${a.k} r=${a.r} nImages=${a.nImages} nSubjects=${a.nSubjects}`);

  const bytes = await fs.readFile(path.resolve("data", "validation", "s01", "s01_10.jpg"));
  const b = await addImage(bytes, undefined, "uji-baru");
  console.log(`subjek baru: v${b.snapshot.version} r=${b.snapshot.r} nImages=${b.snapshot.nImages} nSubjects=${b.snapshot.nSubjects} file=${b.entry.file} ${(performance.now() - t0) / 1000}s`);

  try {
    await addImage(bytes, undefined, "uji-baru");
  } catch (err) {
    console.log(`duplikat   : ${err instanceof Error ? err.message : String(err)}`);
  }

  const c = await addImage(bytes, "s02");
  console.log(`subjek lama: v${c.snapshot.version} r=${c.snapshot.r} nImages=${c.snapshot.nImages} nSubjects=${c.snapshot.nSubjects} file=${c.entry.file}`);

  for (const bad of ["../../etc/passwd", "x".repeat(33), "s01", "s99?x"]) {
    try {
      await addImage(bytes, undefined, bad);
      console.log(`LOLOS: ${bad}`);
    } catch (err) {
      console.log(`tolak      : "${bad.slice(0, 16)}" -> ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  try {
    await addImage(Buffer.from("halo ini bukan gambar"), undefined, "uji-tolak");
  } catch (err) {
    console.log(`tolak      : bukan gambar -> ${err instanceof Error ? err.message : String(err)}`);
  }

  const train = await loadSplit("train");
  const val = await loadSplit("validation");
  const raw = JSON.parse(await fs.readFile(extraFile(), "utf8")) as { entries: unknown[] };
  console.log(`dataset    : X=${JSON.stringify(train.X.size())} labels=${train.labels.length} ids[0]=${train.imageIds[0]} ids[terakhir]=${train.imageIds[train.imageIds.length - 1]}`);
  console.log(`validation : X=${JSON.stringify(val.X.size())} (tetap ${val.labels.length} citra, subjek=${new Set(val.labels).size})`);
  console.log(`ekstra     : ${raw.entries.length} entri di ${path.relative(process.cwd(), extraFile())}`);
  console.log(`store      : v${snapshot().version} nImages=${snapshot().nImages} r=${snapshot().r}`);
  console.log(`total ${(performance.now() - t0) / 1000}s`);
}

void main();