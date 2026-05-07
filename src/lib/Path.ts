import { sampleBezier } from "./Bezier";
import { CyclicList } from "./CyclicList";
import { Polygon } from "./Polygon";
import { Vector } from "./Vector";

const { cos, sin, acos, PI, sqrt } = Math;

export type SvgPathCommands = {
  width: number;
  height: number;
  commands: Array<Command>;
};

export type Command =
  | {
      type: "MOVE_TO";
      x: number;
      y: number;
    }
  | {
      type: "LINE_TO";
      x: number;
      y: number;
    }
  | {
      type: "ELLIPSE_LINE_TO";
      x: number;
      y: number;
    }
  | {
      type: "CUBIC_BEZIER";
      cx1: number;
      cy1: number;
      cx2: number;
      cy2: number;
      x: number;
      y: number;
    }
  | {
      type: "QUADRATIC_BEZIER";
      cx: number;
      cy: number;
      x: number;
      y: number;
    }
  | {
      type: "ELLIPSE";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      rotation: number;
      startAngle: number;
      endAngle: number;
      counterclockwise: boolean;
    }
  | {
      type: "CLOSE_PATH";
    };

export type SvgPath = {
  width: number;
  height: number;
  d: string;
};

export type PathConfig = {
  paths: Array<SvgPath>;
};

export function toPolygon(d: string, samplingRate?: number): Polygon {
  const path = parseSvgPath(d);

  let start: Vector | null = null;
  let prev: Vector | null = null;
  let vertices = new CyclicList<Vector>();

  for (const cmd of path) {
    switch (cmd.type) {
      case "MOVE_TO": {
        const p = new Vector(cmd.x, cmd.y);
        vertices.push(p);
        start = prev = p;
        break;
      }
      case "LINE_TO": {
        const p = new Vector(cmd.x, cmd.y);
        vertices.push(p);
        prev = p;
        break;
      }
      case "QUADRATIC_BEZIER": {
        vertices.push(
          ...sampleBezier(
            [prev!, new Vector(cmd.cx, cmd.cy), new Vector(cmd.x, cmd.y)],
            samplingRate
          )
        );
        prev = new Vector(cmd.x, cmd.y);
        break;
      }
      case "CUBIC_BEZIER": {
        vertices.push(
          ...sampleBezier(
            [
              prev!,
              new Vector(cmd.cx1, cmd.cy1),
              new Vector(cmd.cx2, cmd.cy2),
              new Vector(cmd.x, cmd.y),
            ],
            samplingRate
          )
        );
        prev = new Vector(cmd.x, cmd.y);
        break;
      }
      // TODO
      case "ELLIPSE": {
        // cmd.cx,
        // cmd.cy,
        // cmd.rx,
        // cmd.ry,
        // cmd.rotation,
        // cmd.startAngle,
        // cmd.endAngle,
        break;
      }
      case "CLOSE_PATH": {
        vertices.push(start!);
        // prev = start;
        prev = null;
        break;
      }
    }
  }

  const polygon = new Polygon([vertices]);

  if (polygon.paths.length && !isPathClockwise(polygon.paths[0])) {
    polygon.paths[0].items.reverse();
  }

  return polygon;
}

function isClockwise(a: Vector, b: Vector, c: Vector): boolean {
  return b.sub(a).cross(c.sub(a)) > 0;
}

export function isPathClockwise(cycle: CyclicList<Vector>): boolean {
  let j = 0;
  for (let i = 0; i < cycle.size; ++i) {
    const cur = cycle.get(i);
    const best = cycle.get(j);
    if (cur.x < best.x || (cur.x == best.x && cur.y < best.y)) {
      j = i;
    }
  }
  return isClockwise(cycle.get(j - 1), cycle.get(j), cycle.get(j + 1));
}

function parseSvgPath(d: string): Array<Command> {
  let i = 0;
  let cx: number = 0,
    cy: number = 0,
    x: number = 0,
    y: number = 0;

  let isPrevCubic = false;
  let isPrevQuadratic = false;

  const res = Array<Command>();

  space();
  while (i < d.length) {
    let node = parseCommands();

    if (!node.length) throw [res, d.slice(i), i];
    res.push(...node);
    space();
  }

  function command() {
    let res = d[i++];
    separator();
    return res;
  }

  function parseCommands(): Array<Command> {
    try {
      switch (command()) {
        case "M":
          return moveTo();
        case "m":
          return moveToDelta();
        case "L":
          return lineTo();
        case "l":
          return lineToDelta();
        case "H":
          return hLineTo();
        case "h":
          return hLineToDelta();
        case "V":
          return vLineTo();
        case "v":
          return vLineToDelta();
        case "C":
          return cubicBezier();
        case "c":
          return cubicBezierDelta();
        case "S":
          return smoothCubicBezier();
        case "s":
          return smoothCubicBezierDelta();
        case "Q":
          return quadraticBezier();
        case "q":
          return quadraticBezierDelta();
        case "T":
          return smoothQuadraticBezier();
        case "t":
          return smoothQuadraticBezierDelta();
        case "A":
          return ellipse();
        case "a":
          return ellipseDelta();
        case "Z":
        case "z":
          return closePath();
      }
    } catch (e) {
      console.log(e);
    }
    return [];
  }

  function space() {
    if (i >= d.length) return false;
    while (i < d.length && /\s/.test(d[i])) ++i;
    return true;
  }

  function separator(): boolean {
    space();
    if (i < d.length - 1 && /[\s,]/.test(d[i]) && /[^\s,]/.test(d[i + 1])) {
      ++i;
    }
    space();
    return true;
  }

  function flag(): boolean {
    if (d[i] > "1" || d[i] < "0")
      throw {
        error: "failed to parse flag",
        location: d.slice(i),
        res,
      };
    return d[i++] == "1";
  }

  function number(): number {
    const reg = /[+-]?((0|[1-9]\d*)?\.\d*[1-9]|(0|[1-9]\d*))/y;
    reg.lastIndex = i;
    const match = reg.exec(d);
    if (!match)
      throw {
        error: "failed to parse number",
        location: d.slice(i),
        res,
      };
    i += match[0].length;
    separator();
    return Number(match[0]);
  }

  function moveTo(): Array<Command> {
    const res: Array<Command> = [];
    let first = true;
    do {
      x = number();
      y = number();
      if (first) {
        first = false;
        res.push({ type: "MOVE_TO", x, y });
      } else {
        res.push({ type: "LINE_TO", x, y });
      }
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = false;
    return res;
  }

  function moveToDelta(): Array<Command> {
    const res: Array<Command> = [];
    let first = true;
    do {
      x += number();
      y += number();
      if (first) {
        first = false;
        res.push({ type: "MOVE_TO", x, y });
      } else {
        res.push({ type: "LINE_TO", x, y });
      }
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = false;
    return res;
  }

  function lineTo(): Array<Command> {
    const res: Array<Command> = [];
    do {
      x = number();
      y = number();
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = false;
    return res;
  }

  function lineToDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      x += number();
      y += number();
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = false;
    return res;
  }

  function hLineTo(): Array<Command> {
    const res: Array<Command> = [];
    do {
      x = number();
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = false;
    return res;
  }

  function hLineToDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      x += number();
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = false;
    return res;
  }

  function vLineTo(): Array<Command> {
    const res: Array<Command> = [];
    do {
      y = number();
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = false;
    return res;
  }

  function vLineToDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      y += number();
      res.push({ type: "LINE_TO", x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = false;
    return res;
  }

  function cubicBezier(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let cx1 = number();
      let cy1 = number();
      let cx2 = (cx = number());
      let cy2 = (cy = number());
      x = number();
      y = number();
      res.push({ type: "CUBIC_BEZIER", cx1, cy1, cx2, cy2, x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = true;
    isPrevQuadratic = false;
    return res;
  }

  function cubicBezierDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let cx1 = x + number();
      let cy1 = y + number();
      let cx2 = (cx = x + number());
      let cy2 = (cy = y + number());
      x += number();
      y += number();
      res.push({ type: "CUBIC_BEZIER", cx1, cy1, cx2, cy2, x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = true;
    isPrevQuadratic = false;
    return res;
  }

  function smoothCubicBezier(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let cx1 = isPrevCubic ? 2 * x - cx : x;
      let cy1 = isPrevCubic ? 2 * y - cy : y;
      let cx2 = (cx = number());
      let cy2 = (cy = number());
      x = number();
      y = number();
      res.push({ type: "CUBIC_BEZIER", cx1, cy1, cx2, cy2, x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = true;
    isPrevQuadratic = false;
    return res;
  }

  function smoothCubicBezierDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let cx1 = isPrevCubic ? 2 * x - cx : x;
      let cy1 = isPrevCubic ? 2 * y - cy : y;
      let cx2 = (cx = x + number());
      let cy2 = (cy = y + number());
      x += number();
      y += number();
      res.push({ type: "CUBIC_BEZIER", cx1, cy1, cx2, cy2, x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = true;
    isPrevQuadratic = false;
    return res;
  }

  function quadraticBezier(): Array<Command> {
    const res: Array<Command> = [];
    do {
      cx = number();
      cy = number();
      x = number();
      y = number();
      res.push({ type: "QUADRATIC_BEZIER", cx, cy, x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = true;
    return res;
  }

  function quadraticBezierDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      cx = x + number();
      cy = y + number();
      x += number();
      y += number();
      res.push({ type: "QUADRATIC_BEZIER", cx, cy, x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = true;
    return res;
  }

  function smoothQuadraticBezier(): Array<Command> {
    const res: Array<Command> = [];
    do {
      cx = isPrevQuadratic ? 2 * x - cx : x;
      cy = isPrevQuadratic ? 2 * y - cy : y;
      x = number();
      y = number();
      res.push({ type: "QUADRATIC_BEZIER", cx, cy, x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = true;
    return res;
  }

  function smoothQuadraticBezierDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      cx = isPrevQuadratic ? 2 * x - cx : x;
      cy = isPrevQuadratic ? 2 * y - cy : y;
      x += number();
      y += number();
      res.push({ type: "QUADRATIC_BEZIER", cx, cy, x, y });
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = true;
    return res;
  }

  function angle(ux: number, uy: number, vx: number, vy: number): number {
    let sign = ux * vy - uy * vx > 0 ? 1 : -1;
    return (
      acos(
        (ux * vx + uy * vy) /
          (sqrt(ux ** 2 + uy ** 2) * sqrt(vx ** 2 + vy ** 2))
      ) * sign
    );
  }

  /**
   * https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
   */
  function makeArc(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    rx: number,
    ry: number,
    theta: number,
    largeArc: boolean,
    sweep: boolean
  ): Command {
    let x1$ = (cos(theta) * (x1 - x2)) / 2 + (sin(theta) * (y1 - y2)) / 2;
    let y1$ = (-sin(theta) * (x1 - x2)) / 2 + (cos(theta) * (y1 - y2)) / 2;
    let factor = sqrt(
      (rx ** 2 * ry ** 2 - rx ** 2 * y1$ ** 2 - ry ** 2 * x1$ ** 2) /
        (rx ** 2 * y1$ ** 2 + ry ** 2 * x1$ ** 2)
    );
    if (largeArc == sweep) factor = -factor;
    let cx$ = (factor * rx * y1$) / ry;
    let cy$ = (-factor * ry * x1$) / rx;
    let cx = cos(theta) * cx$ - sin(theta) * cy$ + (x1 + x2) / 2;
    let cy = sin(theta) * cx$ + cos(theta) * cy$ + (y1 + y2) / 2;
    let startAngle = angle(1, 0, x1$ - cx$, y1$ - cy$);
    let delta = angle(x1$ - cx$, y1$ - cy$, -x1$ - cx$, -y1$ - cy$);
    if (sweep && delta < 0) delta += 2 * PI;
    else if (!sweep && delta > 0) delta -= 2 * PI;

    return {
      type: "ELLIPSE",
      cx,
      cy,
      rx,
      ry,
      rotation: theta,
      startAngle,
      endAngle: startAngle + delta,
      counterclockwise: !sweep,
    };
  }

  function ellipse(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let x1 = x;
      let y1 = y;
      let rx = number();
      let ry = number();
      let angle = number();
      let largeArc = flag();
      let sweep = flag();
      x = number();
      y = number();
      res.push(
        makeArc(x1, y1, x, y, rx, ry, (angle * PI) / 180, largeArc, sweep)
      );
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = false;
    return res;
  }

  function ellipseDelta(): Array<Command> {
    const res: Array<Command> = [];
    do {
      let x1 = x;
      let y1 = y;
      let rx = number();
      let ry = number();
      let angle = number();
      let largeArc = flag();
      let sweep = flag();
      x += number();
      y += number();
      res.push(
        makeArc(x1, y1, x, y, rx, ry, (angle * PI) / 180, largeArc, sweep)
      );
    } while (!/[a-zA-Z]/.test(d[i]));
    isPrevCubic = false;
    isPrevQuadratic = false;
    return res;
  }

  function closePath(): Array<Command> {
    isPrevCubic = false;
    isPrevQuadratic = false;
    return [{ type: "CLOSE_PATH" }];
  }

  return res;
}
