import { CyclicList } from "./CyclicList";
import { Edge } from "./Edge";
import { Mesh, triangulate } from "./Triangulation";
import { Vector } from "./Vector";

class ActiveEdge {
  constructor(
    public maxY: number,
    public x: number,
    public k: number,
    public reversed: boolean
  ) {}
}

class BoundingBox {
  constructor(
    public left: number,
    public right: number,
    public top: number,
    public bottom: number
  ) {}
}

export class Polygon {
  private _visibleEdges: Array<Edge> | null = null;
  private _triangularMesh: Mesh;
  private _boundingBox: BoundingBox;
  public paths: Array<CyclicList<Vector>>;

  constructor(paths: Array<CyclicList<Vector>>) {
    this.paths = paths
      .map(function dedupe(path) {
        const res = new CyclicList<Vector>();
        let prev = path.get(-1);
        for (const p of path) {
          if (!p.equals(prev)) res.push(p);
          prev = p;
        }
        return res;
      })
      .filter((p) => p.size > 0);
  }

  public get boundingBox(): BoundingBox {
    if (!this._boundingBox) {
      let left = Infinity;
      let right = -Infinity;
      let top = Infinity;
      let bottom = -Infinity;
      for (const path of this.paths) {
        for (const { x, y } of path) {
          left = Math.min(left, Math.floor(x));
          right = Math.max(right, Math.floor(x));
          top = Math.min(top, Math.floor(y));
          bottom = Math.max(bottom, Math.floor(y));
        }
      }
      this._boundingBox = new BoundingBox(left, right, top, bottom);
    }
    return this._boundingBox;
  }

  public get mesh(): Mesh {
    if (!this._triangularMesh) {
      this._triangularMesh = triangulate(this.paths);
    }
    return this._triangularMesh;
  }

  private get visibleEdges(): Array<Edge> {
    if (!this._visibleEdges) {
      const edges: Array<Edge> = [];
      for (const path of this.paths) {
        const n = path.size;
        for (let i = 0; i < n; ++i) {
          edges.push(new Edge(path.get(i), path.get(i + 1)));
        }
      }
      this._visibleEdges = edges
        .filter(({ y1, y2 }) => Math.ceil(y1) < y2) // ignore edges that don't cross any scan lines
        .sort((e1, e2) => e1.compare(e2));
    }
    return this._visibleEdges;
  }

  public contains({ x, y }: Vector): boolean {
    // fix: check bounding box first
    const { left, right, top, bottom } = this.boundingBox;
    if (x < left || x > right || y < top || y > bottom) return false;

    let winding = 0;
    let intersecitons = 0;
    for (const { x1, y1, x2, y2, reversed } of this.visibleEdges) {
      if (y1 > y) break;
      if (y2 <= y) continue;
      const k = (x2 - x1) / (y2 - y1);
      const z = x1 + k * (y - y1);
      if (z > x) {
        winding += reversed ? -1 : 1;
        intersecitons++;
      }
    }
    // return winding != 0;
    return intersecitons % 2 == 1;
  }

  public traverse(fn: (x: number, y: number) => void): void {
    if (!this.visibleEdges.length) return;
    let y = Math.ceil(this.visibleEdges[0].y1) - 1;
    let active: Array<ActiveEdge> = [];
    let i = 0;
    do {
      if (active.length & 1) {
        throw "Odd number of intersections. The path is not closed!";
      }
      for (let i = 0, winding = 0; i < active.length; ++i) {
        if (winding) {
          for (let x = Math.ceil(active[i - 1].x); x < active[i].x; ++x) {
            fn(x, y);
          }
        }
        winding += active[i].reversed ? -1 : 1;
      }
      ++y;
      active = active.filter((e) => e.maxY > y);
      for (const edge of active) {
        edge.x += edge.k;
      }
      while (i < this.visibleEdges.length && this.visibleEdges[i].y1 <= y) {
        const { x1, y1, x2, y2, reversed } = this.visibleEdges[i++];
        const k = (x2 - x1) / (y2 - y1);
        active.push(new ActiveEdge(y2, x1 + k * (y - y1), k, reversed));
      }
      active.sort((e1, e2) => e1.x - e2.x);
    } while (active.length || i < this.visibleEdges.length);
  }

  public *traverseAsync() {
    if (!this.visibleEdges.length) return;
    let y = Math.ceil(this.visibleEdges[0].y1) - 1;
    let active: Array<ActiveEdge> = [];
    let i = 0;
    do {
      if (active.length & 1) {
        throw "Odd number of intersections. The path is not closed!";
      }
      for (let i = 0, winding = 0; i < active.length; ++i) {
        if (winding) {
          for (let x = Math.ceil(active[i - 1].x); x < active[i].x; ++x) {
            yield new Vector(x, y);
          }
        }
        winding += active[i].reversed ? -1 : 1;
      }
      ++y;
      active = active.filter((e) => e.maxY > y);
      for (const edge of active) {
        edge.x += edge.k;
      }
      while (i < this.visibleEdges.length && this.visibleEdges[i].y1 <= y) {
        const { x1, y1, x2, y2, reversed } = this.visibleEdges[i++];
        const k = (x2 - x1) / (y2 - y1);
        active.push(new ActiveEdge(y2, x1 + k * (y - y1), k, reversed));
      }
      active.sort((e1, e2) => e1.x - e2.x);
    } while (active.length || i < this.visibleEdges.length);
  }

  public translate(dx: number, dy: number): Polygon {
    return new Polygon(
      this.paths.map((path) => path.map((p) => p.translate(dx, dy)))
    );
  }

  public rotate(theta: number): Polygon {
    return new Polygon(
      this.paths.map((path) => path.map((p) => p.rotate(theta)))
    );
  }

  public scale(c: number): Polygon {
    return new Polygon(this.paths.map((path) => path.map((p) => p.scale(c))));
  }
}
