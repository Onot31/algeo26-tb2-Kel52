import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve("data");
const IMAGE_RE = /\.(jpe?g|png)$/i;
const EXPECTED = { subjects: 50, train: 550, validation: 100 };

type Entry = { subjectId: string; file: string };

async function collect(split: "train" | "validation"): Promise<Entry[]> {
  const root = path.join(DATA_DIR, split);
  const dirs = await fs.readdir(root, { withFileTypes: true });
  const subjects = dirs
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const entries: Entry[] = [];
  for (const subjectId of subjects) {
    const files = (await fs.readdir(path.join(root, subjectId)))
      .filter((f) => IMAGE_RE.test(f))
      .sort();
    for (const file of files) {
      entries.push({ subjectId, file: `${subjectId}/${file}` });
    }
  }
  return entries;
}

async function main() {
  const train = await collect("train");
  const validation = await collect("validation");
  const subjects = new Set(train.map((e) => e.subjectId));

  console.log(`subjek     : ${subjects.size}`);
  console.log(`train      : ${train.length}`);
  console.log(`validation : ${validation.length}`);

  if (
    subjects.size !== EXPECTED.subjects ||
    train.length !== EXPECTED.train ||
    validation.length !== EXPECTED.validation
  ) {
    console.error(
      `Jumlah tidak sesuai: butuh ${EXPECTED.subjects} subjek, ` +
        `${EXPECTED.train} train, ${EXPECTED.validation} validation.`,
    );
    process.exitCode = 1;
    return;
  }

  const manifest = { split: { train, validation } };
  const out = path.join(DATA_DIR, "manifest.json");
  await fs.writeFile(out, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest ditulis ke ${path.relative(process.cwd(), out)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
