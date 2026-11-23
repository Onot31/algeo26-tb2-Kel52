import sharp from "sharp";
import { IMAGE_WIDTH, IMAGE_HEIGHT, FEATURE_DIM } from "@/lib/config";

export async function imageToVector(buffer: Buffer): Promise<Float64Array> {
  let raw: Buffer;
  try {
    const out = await sharp(buffer)
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    raw = out.data;
  } catch {
    throw new Error("File gambar tidak dapat dibaca");
  }

  if (raw.length !== FEATURE_DIM * 3) {
    throw new Error("Hasil decode tidak sesuai 64x80 RGB");
  }

  const vec = new Float64Array(FEATURE_DIM);
  for (let y = 0; y < IMAGE_HEIGHT; y++) {
    for (let x = 0; x < IMAGE_WIDTH; x++) {
      const i = (y * IMAGE_WIDTH + x) * 3;
      vec[y * IMAGE_WIDTH + x] =
        0.299 * raw[i] + 0.587 * raw[i + 1] + 0.114 * raw[i + 2];
    }
  }
  return vec;
}