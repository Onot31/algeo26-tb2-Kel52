import { matrix, type Matrix } from "mathjs";
import { jacobi } from "./jacobi";
import { fromColumns, getColumn, mulVec } from "./matrix";

export function svd(input: Matrix, k: number) : { U: Matrix, S: Float64Array, V: Matrix, rank: number, total: number } {
  const a = input.toArray() as number[][];
  const d = a.length;
  const n = a[0].length;
  const G: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let p = 0; p < n; p++) {
    for (let q = p; q < n; q++) {
      let s = 0;
      for (let i = 0; i < d; i++) s += a[i][p] * a[i][q];
      G[p][q] = s;
      G[q][p] = s;
    }
  }

  const { values, vectors } = jacobi(matrix(G));
  const lambdaMax = values[0];
  if (!(lambdaMax > 0)) {
    throw new Error("Tidak terdapat variansi pada matriks");
  }

  let rank = 0;
  let total = 0;
  while (rank < n && values[rank] > 1e-8 * lambdaMax) {
    total += values[rank];
    rank++;
  }

  const take = Math.min(k, rank);
  const S = new Float64Array(take);
  const uCols: Float64Array[] = [];
  const vCols: Float64Array[] = [];
  for (let i = 0; i < take; i++) {
    const sigma = Math.sqrt(values[i]);
    S[i] = sigma;
    const v = getColumn(vectors, i);
    const u = mulVec(input, v);
    for (let j = 0; j < u.length; j++) u[j] /= sigma;
    uCols.push(u);
    vCols.push(v);
  }

  return { U: fromColumns(uCols), S, V: fromColumns(vCols), rank, total };
}