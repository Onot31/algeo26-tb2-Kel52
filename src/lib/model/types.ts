import type { PcaModel } from "@/lib/math/pca";

export type Preprocess = {
  width: number;
  height: number;
  grayscale: string;
  scale: string;
  order: string;
};

export type ModelSnapshot = {
  version: number;
  createdAt: string;
  k: number;
  r: number;
  nImages: number;
  nSubjects: number;
  preprocess: Preprocess;
  labels: string[];
  imageIds: string[];
  vr: Float64Array;
  model: PcaModel;
};