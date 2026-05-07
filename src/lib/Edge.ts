import { Vector } from "./Vector";

export class Edge {
  constructor(public p1: Vector, public p2: Vector) {}

  public get reversed(): boolean {
    return this.p1.y > this.p2.y;
  }

  public get x1(): number {
    return this.reversed ? this.p2.x : this.p1.x;
  }

  public get y1(): number {
    return this.reversed ? this.p2.y : this.p1.y;
  }

  public get x2(): number {
    return this.reversed ? this.p1.x : this.p2.x;
  }

  public get y2(): number {
    return this.reversed ? this.p1.y : this.p2.y;
  }

  public compare(other: Edge): number {
    return this.y1 == other.y1 ? this.x1 - other.x1 : this.y1 - other.y1;
  }

  public translate(dx: number, dy: number): Edge {
    return new Edge(this.p1.translate(dx, dy), this.p2.translate(dx, dy));
  }

  public rotate(theta: number): Edge {
    return new Edge(this.p1.rotate(theta), this.p2.rotate(theta));
  }

  publicscale(c: number): Edge {
    return new Edge(this.p1.scale(c), this.p2.scale(c));
  }
}
