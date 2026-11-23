import { matrix, multiply, transpose, type Matrix } from "mathjs";

export function fromColumns(cols: Float64Array[]): Matrix {
  if (cols.length === 0) throw new Error("Tidak ada kolom");
  const rows = cols[0].length;
  for (const c of cols) {
    if (c.length !== rows) throw new Error("Panjang kolom tidak sama");
  }
  return transpose(matrix(cols.map((c) => Array.from(c)))) as Matrix;
}

export function getColumn(m: Matrix, j: number): Float64Array {
  const [rows] = m.size();
  const out = new Float64Array(rows);
  for (let i = 0; i < rows; i++) out[i] = m.get([i, j]) as number;
  return out;
}

export function mulVec(m: Matrix, v: Float64Array): Float64Array {
  if (m.size()[1] !== v.length) {
    throw new Error("Dimensi matriks dan vektor tidak cocok");
  }
  const res = multiply(m, matrix(Array.from(v))) as Matrix;
  return Float64Array.from(res.toArray() as number[]);
}