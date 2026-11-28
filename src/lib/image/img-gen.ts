import sharp from "sharp";
import { IMAGE_HEIGHT, IMAGE_WIDTH } from "@/lib/config";

export function range(values: Float64Array): { min: number; max: number } {
  let min = values[0];
  let max = values[0];
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

export async function saveGrayPng(file: string, values: Float64Array, lo: number, hi: number): Promise<void> {
  if (values.length !== IMAGE_WIDTH * IMAGE_HEIGHT) {
    throw new Error(`Vektor ${values.length} entri, butuh ${IMAGE_WIDTH * IMAGE_HEIGHT}`);
  }
  const span = hi - lo;
  const bytes = Buffer.alloc(values.length);
  for (let i = 0; i < values.length; i++) {
    const t = span === 0 ? 0 : (values[i] - lo) / span;
    bytes[i] = Math.min(255, Math.max(0, Math.round(t * 255)));
  }
  await sharp(bytes, { raw: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT, channels: 1 } }).png().toFile(file);
}