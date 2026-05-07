import { Font, parse } from "opentype.js";
import { CyclicList } from "polyrender/CyclicList.js";
import { Polygon } from "polyrender/Polygon.js";
import { Vector } from "polyrender/Vector";
import { sampleBezier } from "./Bezier.js";

export const FontBook = {
  NotoSans: parse(await (await fetch("./NotoSans.ttf")).arrayBuffer()),
  NotoSerif: parse(await (await fetch("./NotoSerif.ttf")).arrayBuffer()),
  Zapfino: parse(await (await fetch("./Zapfino.ttf")).arrayBuffer()),
  Vollkorn: parse(await (await fetch("./VollkornSC.ttf")).arrayBuffer()),
  BlackOpsOne: parse(await (await fetch("./BlackOpsOne.ttf")).arrayBuffer()),
};

export function makeText(
  text: string,
  dx: number,
  dy: number,
  size: number,
  font: Font,
  samplingRate: number
): Array<Polygon> {
  const polygons: Array<Polygon> = [];

  for (const path of font.getPaths(text, dx, dy, size)) {
    let start: Vector | null = null;
    let prev: Vector | null = null;
    let pathSet: Array<CyclicList<Vector>> = [];
    let current = new CyclicList<Vector>();

    for (const cmd of path.commands) {
      switch (cmd.type) {
        case "M": {
          start = prev = new Vector(cmd.x, cmd.y);
          break;
        }
        case "L": {
          const p = new Vector(cmd.x, cmd.y);
          current.push(prev!);
          prev = p;
          break;
        }
        case "Q": {
          current.push(
            ...sampleBezier(
              [prev!, new Vector(cmd.x1, cmd.y1), new Vector(cmd.x, cmd.y)],
              samplingRate
            )
          );
          prev = new Vector(cmd.x, cmd.y);
          break;
        }
        case "C": {
          current.push(
            ...sampleBezier(
              [
                prev!,
                new Vector(cmd.x1, cmd.y1),
                new Vector(cmd.x2, cmd.y2),
                new Vector(cmd.x, cmd.y),
              ],
              samplingRate
            )
          );
          prev = new Vector(cmd.x, cmd.y);
          break;
        }
        case "Z": {
          current.push(start!);
          pathSet.push(current);
          current = new CyclicList<Vector>();
          // prev = start;
          prev = null;
          break;
        }
      }
    }
    polygons.push(new Polygon(pathSet));
  }
  return polygons.filter((p) => p.paths.length);
}
