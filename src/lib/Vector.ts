const { max, abs, sqrt, sin, cos } = Math;

export class Vector {
  constructor(public x: number, public y: number) {
    if (isNaN(x) || isNaN(y)) {
      throw new Error("invalid coordinates!");
    }
  }

  public clone(): Vector {
    return new Vector(this.x, this.y);
  }

  public equals(other: Vector): boolean {
    return max(abs(this.x - other.x), abs(this.y - other.y)) < 1e-9;
  }

  public norm(): number {
    return sqrt(this.x ** 2 + this.y ** 2);
  }

  public add(other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  public sub(other: Vector): Vector {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  public scale(c: number): Vector {
    return new Vector(this.x * c, this.y * c);
  }

  public dot(other: Vector): number {
    return this.x * other.x + this.y * other.y;
  }

  public cross(other: Vector): number {
    return this.x * other.y - this.y * other.x;
  }

  public normalize(): Vector {
    const n = this.norm();
    if (n == 0) throw "Can't normalize zero vector!";
    return this.scale(1 / n);
  }

  public dist(other: Vector): number {
    return other.sub(this).norm();
  }

  public translate(dx: number, dy: number): Vector {
    return new Vector(this.x + dx, this.y + dy);
  }

  public rotate(theta: number): Vector {
    return new Vector(
      this.x * cos(theta) - this.y * sin(theta),
      this.x * sin(theta) + this.y * cos(theta)
    );
  }

  public interpolate(other: Vector, t: number): Vector {
    return new Vector(
      (1 - t) * this.x + t * other.x,
      (1 - t) * this.y + t * other.y
    );
  }
}
