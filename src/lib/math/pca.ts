import { matrix, multiply, transpose, type Matrix } from "mathjs";
import { svd } from "./svd";
import { mulVec } from "./matrix";

export type PcaModel = {
  mu: Float64Array;
  Uk: Matrix;
  Z: Matrix;
  S: Float64Array;
  vr: Float64Array;
  k: number;
  r: number;
};

export function buildPca(x: Matrix, k: number): PcaModel {
  const d = x.size()[0];
  const n = x.size()[1];
  if (!(k >= 1 && k <= Math.min(d, n - 1))) {
    throw new Error(`k=${k} tidak valid, pakai 1 sampai ${Math.min(d, n - 1)}`);
  }

  const arr = x.toArray() as number[][];
  const mu = new Float64Array(d);
  for (let i = 0; i < d; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += arr[i][j];
    mu[i] = s / n;
  }

  const centered = Array.from({ length: d }, (_, i) =>
    Array.from({ length: n }, (_, j) => arr[i][j] - mu[i]),
  );
  const a = matrix(centered);

  const { U, S, rank, total } = svd(a, k);
  const z = multiply(transpose(U), a) as Matrix;

  const ratio = new Float64Array(S.length);
  let acc = 0;
  for (let i = 0; i < S.length; i++) {
    acc += S[i] * S[i];
    ratio[i] = acc / total;
  }

  return { mu, Uk: U, Z: z, S, vr: ratio, k: S.length, r: rank };
}

export function project(v: Float64Array, model: PcaModel): Float64Array {
  if (v.length !== model.mu.length) {
    throw new Error(`Panjang vektor tidak sesuai, model butuh ${model.mu.length}`);
  }
  const centered = new Float64Array(v.length);
  for (let i = 0; i < v.length; i++) centered[i] = v[i] - model.mu[i];
  return mulVec(transpose(model.Uk), centered);
}