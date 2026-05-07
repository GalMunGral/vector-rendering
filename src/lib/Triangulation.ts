import { CyclicList } from "./CyclicList";
import { Vector } from "./Vector";

const epsilon = 1e-9;
export class Mesh {
  constructor(
    public vertices: Array<Vector>,
    public triangles: Array<[number, number, number]>,
    public paths: Array<CyclicList<Vector>>
  ) {}
}

function isInside(a: Vector, b: Vector, c: Vector, p: Vector) {
  const v0 = b.sub(a);
  const v1 = c.sub(a);
  const v2 = p.sub(a);
  const d00 = v0.dot(v0);
  const d01 = v0.dot(v1);
  const d11 = v1.dot(v1);
  const d20 = v2.dot(v0);
  const d21 = v2.dot(v1);
  const denom = d00 * d11 - d01 * d01;
  const v = (d11 * d20 - d01 * d21) / denom;
  const w = (d00 * d21 - d01 * d20) / denom;
  const u = 1 - v - w;
  return v >= -epsilon && w >= -epsilon && u >= -epsilon;
}

function isClockwise(a: Vector, b: Vector, c: Vector): boolean {
  return b.sub(a).cross(c.sub(a)) > 0;
}

function isPathClockwise(
  vertices: Array<Vector>,
  cycle: CyclicList<number>
): boolean {
  let j = 0;
  for (let i = 0; i < cycle.size; ++i) {
    const cur = vertices[cycle.get(i)];
    const best = vertices[cycle.get(j)];
    if (cur.x < best.x || (cur.x == best.x && cur.y < best.y)) {
      j = i;
    }
  }
  return isClockwise(
    vertices[cycle.get(j - 1)],
    vertices[cycle.get(j)],
    vertices[cycle.get(j + 1)]
  );
}

function simplify(
  vertices: Array<Vector>,
  cycles: Array<CyclicList<number>>
): Array<CyclicList<number>> {
  const outerCycles: Array<CyclicList<number>> = [];
  const innerCycles: Array<CyclicList<number>> = [];

  for (const cycle of cycles) {
    if (isPathClockwise(vertices, cycle)) {
      outerCycles.push(cycle);
    } else {
      let j = 0;
      for (let i = 0; i < cycle.size; ++i) {
        const best = vertices[cycle.get(j)];
        const cur = vertices[cycle.get(i)];
        if (cur.x > best.x || (cur.x == best.x && cur.y > best.y)) {
          j = i;
        }
      }
      cycle.rotate(j);
      innerCycles.push(cycle);
    }
  }

  innerCycles.sort((a, b) => vertices[a.get(0)].x - vertices[b.get(0)].x);

  while (innerCycles.length) {
    const inner = innerCycles.pop()!;
    const o = vertices[inner.get(0)];

    let outer: CyclicList<number> | null = null;
    let j = -1;
    let minX = Infinity;

    for (const cycle of outerCycles) {
      for (let i = 0; i < cycle.size; ++i) {
        const p1 = vertices[cycle.get(i)];
        const p2 = vertices[cycle.get(i + 1)];
        if (p1.y <= o.y && p2.y >= o.y) {
          const k = (p2.x - p1.x) / (p2.y - p1.y);
          const x = p1.x + k * (o.y - p1.y);
          if (x > o.x && x < minX) {
            outer = cycle;
            j = i;
            minX = x;
          }
        }
      }
    }

    if (!outer) {
      console.error("found a hole not contained in any polygon");
      continue; // just ignore this path
    }

    const c = new Vector(minX, o.y);
    const m = vertices[outer.get(j)];

    for (let i = 0; i < outer.size; ++i) {
      const best = vertices[outer.get(j)];
      const cur = vertices[outer.get(i)];
      if (isInside(o, m, c, cur) && cur.normalize().x > best.normalize().x) {
        j = i;
      }
    }

    outer.insert(j + 1, ...inner, inner.get(0), outer.get(j));
  }

  return outerCycles;
}

function triangulateComponent(
  vertices: Array<Vector>,
  indexPath: CyclicList<number>,
  triangles: Array<[number, number, number]>
): void {
  const N = indexPath.size;

  let ears: Array<number> = [];
  for (let i = 0; i < N; ++i) {
    if (isEar(i)) ears.push(i);
  }

  while (indexPath.size > 3 && ears.length) {
    let j = Math.floor(Math.random() * ears.length);
    const i = ears[j];
    ears.splice(j, 1);

    // const i = ears.pop()!;
    // const i = ears.shift()!;

    triangles.push([
      indexPath.get(i - 1),
      indexPath.get(i),
      indexPath.get(i + 1),
    ]);

    ears = ears
      .filter((j) => j != mod(i - 1) && j != mod(i + 1))
      .map((j) => (j < i ? j : j - 1));

    indexPath.delete(i);

    if (isEar(i - 1)) {
      ears.push(mod(i - 1));
    }
    if (isEar(i)) {
      ears.push(mod(i));
    }
  }

  if (indexPath.size == 3) {
    triangles.push([indexPath.get(0), indexPath.get(1), indexPath.get(2)]);
  }

  function mod(i: number): number {
    const N = indexPath.size;
    i %= N;
    if (i < 0) i += N;
    return i;
  }

  function isEar(i: number): boolean {
    if (
      !isClockwise(
        vertices[indexPath.get(i - 1)],
        vertices[indexPath.get(i)],
        vertices[indexPath.get(i + 1)]
      )
    ) {
      return false;
    }

    const prev = indexPath.get(i - 1);
    const cur = indexPath.get(i);
    const next = indexPath.get(i + 1);

    for (const idx of indexPath) {
      if (
        idx != cur &&
        idx != prev &&
        idx != next &&
        isInside(vertices[prev], vertices[cur], vertices[next], vertices[idx])
      ) {
        return false;
      }
    }
    return true;
  }
}

export function triangulate(paths: Array<CyclicList<Vector>>) {
  const vertices: Array<Vector> = [];
  const triangles: Array<[number, number, number]> = [];

  const cycles: Array<CyclicList<number>> = [];

  for (const path of paths) {
    if (path.size < 3) continue; // TODO:...
    const cycle = new CyclicList<number>();
    for (const p of path) {
      cycle.push(vertices.length);
      vertices.push(p);
    }
    cycles.push(cycle);
  }

  const simplified = simplify(vertices, cycles); // eliminate holes

  for (const cycle of simplified) {
    triangulateComponent(vertices, cycle, triangles);
  }

  return new Mesh(vertices, triangles, paths);
}
