import { CyclicList } from "./CyclicList.js";
import { Polygon } from "./Polygon.js";
import { Vector } from "./Vector.js";

export function sampleCircle(samplingRate: number): Polygon {
  const res = new CyclicList<Vector>();
  for (let i = 0; i < samplingRate; ++i) {
    const theta = i * ((2 * Math.PI) / samplingRate);
    res.push(new Vector(Math.cos(theta), Math.sin(theta)));
  }
  return new Polygon([res]);
}

export function makeStrokeCombined(
  points: CyclicList<Vector>,
  lineWidth: number,
  closed = false
) {
  const polygons = makeStroke(points, lineWidth, closed);
  return new Polygon([...polygons.flatMap((p) => p.paths)]);
}

export function makeStroke(
  points: CyclicList<Vector>,
  lineWidth: number,
  closed = false
): Array<Polygon> {
  if (points.size < 2) return [];

  const res: Array<Polygon> = [];

  for (let i = 0; i < points.size; ++i) {
    const { x, y } = points.get(i);
    const rate = Math.max(20, Math.round(lineWidth / 4));
    res.push(sampleCircle(rate).scale(lineWidth).translate(x, y));
  }

  const n = points.size;
  const end = closed ? n : n - 1;

  for (let i = 0; i < end; ++i) {
    const p1 = points.get(i);
    const p2 = points.get(i + 1);

    const e = p2
      .sub(p1)
      .normalize()
      .rotate(Math.PI / 2);

    res.push(
      new Polygon([
        new CyclicList([
          p1.add(e.scale(lineWidth)),
          p1.add(e.scale(-lineWidth)),
          p2.add(e.scale(-lineWidth)),
          p2.add(e.scale(lineWidth)),
        ]),
      ])
    );
  }

  return res;
}
