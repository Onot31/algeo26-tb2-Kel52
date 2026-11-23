import { matrix, type Matrix } from "mathjs";

export function jacobi(input: Matrix): { values: Float64Array; vectors: Matrix } {
  const maxSweeps = 25;
  const epsRel = 1e-10;
  const a = input.toArray() as number[][];
  const n = a.length;
  const D = a.map((row) => row.slice());
  const Q: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),);
  let scaleSq = 0;
  for (const row of a) {
    for (const x of row) scaleSq += x * x;
  }
  const scale = Math.sqrt(scaleSq) || 1;
  let converged = false;

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) off += D[p][q] * D[p][q];
    }
    if (Math.sqrt(2 * off) <= epsRel * scale) {
      converged = true;
      break;
    }

    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const Dpq = D[p][q];
        if (Math.abs(Dpq) <= 1e-15 * scale) continue;
        const Dpp = D[p][p];
        const Dqq = D[q][q];
        const theta = 0.5 * Math.atan2(2 * Dpq, Dqq - Dpp);
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        D[p][p] = c * c * Dpp - 2 * c * s * Dpq + s * s * Dqq;
        D[q][q] = s * s * Dpp + 2 * c * s * Dpq + c * c * Dqq;
        D[p][q] = 0;
        D[q][p] = 0;
        for (let k = 0; k < n; k++) {
          if (k === p || k === q) continue;
          const Dkp = D[k][p];
          const Dkq = D[k][q];
          D[k][p] = c * Dkp - s * Dkq;
          D[k][q] = s * Dkp + c * Dkq;
          D[p][k] = D[k][p];
          D[q][k] = D[k][q];
        }
        for (let k = 0; k < n; k++) {
          const Qkp = Q[k][p];
          const Qkq = Q[k][q];
          Q[k][p] = c * Qkp - s * Qkq;
          Q[k][q] = s * Qkp + c * Qkq;
        }
      }
    }
  }

  if (!converged) throw new Error(`Jacobi tidak konvergen dalam ${maxSweeps} sweep`);

  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => D[j][j] - D[i][i]);
  const eps = 1e-8 * Math.max(scale, 1);
  const values = new Float64Array(n);
  const vectors = Array.from({ length: n }, () => new Array<number>(n));
  for (let j = 0; j < n; j++) {
    const idx = order[j];
    const value = D[idx][idx];
    values[j] = value < 0 && -value <= eps ? 0 : value;
    for (let i = 0; i < n; i++) vectors[i][j] = Q[i][idx];
  }
  return { values, vectors: matrix(vectors) };
}