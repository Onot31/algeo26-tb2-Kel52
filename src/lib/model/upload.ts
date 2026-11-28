import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { extraFile, knownSubjects, loadExtra, uploadsDir, type ManifestEntry } from "./dataset";

const NAME = /^[A-Za-z0-9_-]{1,32}$/;

function kind(buffer: Buffer): string {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "png";
  throw new Error("Masukan bukan JPEG atau PNG");
}

export async function saveUpload(buffer: Buffer, subjectId?: string, newSubjectName?: string): Promise<ManifestEntry> {
  if (subjectId && newSubjectName) throw new Error("Pilih salah satu: subjectId atau newSubjectName");
  if (!subjectId && !newSubjectName) throw new Error("subjectId atau newSubjectName wajib diisi");

  const ext = kind(buffer);
  const subjects = await knownSubjects();
  const isNew = Boolean(newSubjectName);
  const subject = newSubjectName ?? subjectId;
  if (!subject || !NAME.test(subject)) {
    throw new Error(`Nama "${subject ?? ""}" tidak valid: huruf, angka, _ atau -, panjang 1 sampai 32`);
  }
  if (isNew && subjects.includes(subject)) {
    throw new Error(`Subjek "${subject}" sudah ada, pakai subjectId`);
  }
  if (!isNew && !subjects.includes(subject)) {
    throw new Error(`Subjek "${subject}" tidak terdaftar di data training`);
  }

  const hash = createHash("sha1").update(buffer).digest("hex").slice(0, 12);
  const file = `${subject}/${subject}_${hash}.${ext}`;
  const target = path.join(uploadsDir(), file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  try {
    await fs.writeFile(target, buffer, { flag: "wx" });
  } catch {
    throw new Error("Citra yang sama sudah ditambahkan sebelumnya");
  }

  const entries = await loadExtra();
  const next: ManifestEntry[] = [...entries, { subjectId: subject, file }];
  await fs.writeFile(extraFile(), `${JSON.stringify({ entries: next }, null, 2)}\n`, "utf8");
  return { subjectId: subject, file };
}