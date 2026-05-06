import  { DrawFn, Renderer } from "polyrender/Renderer";
import { toPolygon } from "polyrender/Path.js";
import { FontBook, makeText } from "polyrender/Text";
import { parseColor } from "./util";
import { makeStrokeCombined } from "polyrender/Stroke";
import { Font } from "opentype.js";

// let sampleRate = 5;
let debug = false;

const tigerSvg = new DOMParser().parseFromString(
  await (
    await fetch(
      "https://upload.wikimedia.org/wikipedia/commons/f/fd/Ghostscript_Tiger.svg"
    )
  ).text(),
  "text/xml"
);

class Tiger {
  private colors: Array<[number, number, number, number]> = [];
  private active: Array<boolean> = [];
  private drawFns: Array<DrawFn> = [];

  constructor(private x: number, private y: number) {
    this.prepare();
  }

  public prepare() {
    this.drawFns.length = 0;
    this.colors.length = 0;
    tigerSvg.children[0].children[0].querySelectorAll("g").forEach((g) => {
      const pathEl = g.children[0];
      let d = pathEl.getAttribute("d")!;

      // TODO: how to handle self-intersecting polygons?
      if (pathEl.id == "path464") {
        d =
          "M 20.895 54.407 c 1.542 1.463 28.505 30.393 28.505 30.393 c 35.2 36.6 7.2 2.4 7.2 2.4 c -7.6 -4.8 -16.8 -23.6 -16.8 -23.6 c -1.2 -2.8 14 7.2 14 7.2 c 4 0.8 17.6 20 17.6 20 c -6.8 -2.4 -2 4.8 -2 4.8 c 2.8 2 23.201 17.6 23.201 17.6 c 3.6 4 7.599 5.6 7.599 5.6 c 14 -5.2 7.6 8 7.6 8 c 2.4 6.8 8 -4.8 8 -4.8 c 11.2 -16.8 -5.2 -14.4 -5.2 -14.4 c -30 2.8 -36.8 -13.2 -36.8 -13.2 c -2.4 -2.4 6.4 0 6.4 0 c 8.401 2 -7.2 -12.4 -7.2 -12.4 c 2.4 0 11.6 6.8 11.6 6.8 c 10.401 9.2 12.401 7.2 12.401 7.2 c 17.999 -8.8 28.399 -1.2 28.399 -1.2 c 2 1.6 -3.6 8.4 -2 13.6 s 6.4 17.6 6.4 17.6 c -2.4 1.6 -2 12.4 -2 12.4 c 16.8 23.2 7.2 21.2 7.2 21.2 c -15.6 -0.4 -0.8 7.2 -0.8 7.2 c 3.2 2 12 9.2 12 9.2 c -2.8 -1.2 -4.4 4 -4.4 4 c 4.8 4 2 8.8 2 8.8 c -6 1.2 -7.2 5.2 -7.2 5.2 c 6.8 8 -3.2 8.4 -3.2 8.4 c 3.6 4.4 -1.2 16.4 -1.2 16.4 c -4.8 0 -11.2 5.6 -11.2 5.6 c 2.4 4.8 -8 10.4 -8 10.4 c -8.4 1.6 -5.6 8.4 -5.6 8.4 c -7.999 6 -10.399 22 -10.399 22 c -0.8 10.4 -3.2 13.6 2 11.6 c 5.199 -2 4.399 -14.4 4.399 -14.4 c -4.799 -15.6 38 -31.6 38 -31.6 c 4 -1.6 4.8 -6.8 4.8 -6.8 c 2 0.4 10.8 8 10.8 8 c 7.6 11.2 8 2 8 2 c 1.2 -3.6 -0.4 -9.6 -0.4 -9.6 c 6 -21.6 -8 -28 -8 -28 c -10 -33.6 4 -25.2 4 -25.2 c 2.8 5.6 13.6 10.8 13.6 10.8 l 3.6 -2.4 c -1.6 -4.8 6.8 -10.8 6.8 -10.8 c 2.8 6.4 8.8 -1.6 8.8 -1.6 c 3.6 -24.4 16 -10 16 -10 c 4 1.2 5.2 -5.6 5.2 -5.6 c 3.6 -10.4 0 -24 0 -24 c 3.6 -0.4 13.2 5.6 13.2 5.6 c 2.8 -3.6 -6.4 -20.4 -2.4 -18 s 8.4 4 8.4 4 c 0.8 -2 -9.2 -14.4 -9.2 -14.4 c -4.4 -2.8 -9.6 -23.2 -9.6 -23.2 c 7.2 3.6 -2.8 -11.6 -2.8 -11.6 c 0 -3.2 6 -14.4 6 -14.4 c -0.8 -6.8 0 -6.4 0 -6.4 c 2.8 1.2 10.8 2.8 4 -3.6 s 0.8 -11.2 0.8 -11.2 c 4.4 -2.8 -9.2 -2.4 -9.2 -2.4 c -5.2 -4.4 -4.8 -8.4 -4.8 -8.4 c 8 2 -6.4 -12.4 -8.8 -16 s 7.2 -8.8 7.2 -8.8 c 13.2 -3.6 1.6 -6.8 1.6 -6.8 c -19.6 0.4 -8.8 -10.4 -8.8 -10.4 c 6 0.4 4.4 -2 4.4 -2 c -5.2 -1.2 -14.8 -7.6 -14.8 -7.6 c -4 -3.6 -0.4 -2.8 -0.4 -2.8 c 16.8 1.2 -12 -10 -12 -10 c 8 0 -10 -10.4 -10 -10.4 c -2 -1.6 -5.2 -9.2 -5.2 -9.2 c -6 -5.2 -10.8 -12 -10.8 -12 c -0.4 -4.4 -5.2 -9.2 -5.2 -9.2 c -11.6 -13.6 -17.2 -13.2 -17.2 -13.2 c -14.8 -3.6 -20 -2.8 -20 -2.8 l -52.8 4.4 c -26.4 12.8 -18.6 33.8 -18.6 33.8 c 6.4 8.4 15.6 4.6 15.6 4.6 c 4.6 -6.2 16.2 -4 16.2 -4 c 20.401 3.2 17.801 -0.4 17.801 -0.4 c -2.4 -4.6 -18.601 -10.8 -18.801 -11.4 s -9 -4 -9 -4 c -3 -1.2 -7.4 -10.4 -7.4 -10.4 c -3.2 -3.4 12.6 2.4 12.6 2.4 c -1.2 1 6.2 5 6.2 5 c 17.401 -1 28.001 9.8 28.001 9.8 c 10.799 16.6 10.999 8.4 10.999 8.4 c 2.8 -9.4 -9 -30.6 -9 -30.6 c 0.4 -2 8.6 4.6 8.6 4.6 c 1.4 -2 2.2 3.8 2.2 3.8 c 0.2 2.4 4 10.4 4 10.4 c 2.8 13 6.4 5.6 6.4 5.6 l 4.6 9.4 c 1.4 2.6 -4.6 10.2 -4.6 10.2 c -0.2 2.8 0.6 2.6 -5 10.2 s -2.2 12 -2.2 12 c -1.4 6.6 7.4 6.2 7.4 6.2 c 2.6 2.2 6 2.2 6 2.2 c 1.8 2 4.2 1.4 4.2 1.4 c 1.6 -3.8 7.8 -1.8 7.8 -1.8 c 1.4 -2.4 9.6 -2.8 9.6 -2.8 c 1 -2.6 1.4 -4.2 4.8 -4.8 s -21.2 -43.6 -21.2 -43.6 c 6.4 -0.8 -1.8 -13.2 -1.8 -13.2 c -2.2 -6.6 9.2 8 11.4 9.4 s 3.2 3.6 1.6 3.4 s -3.4 2 -2 2.2 s 14.4 15.2 17.8 25.4 s 9.4 14.2 15.6 20.2 s 5.4 30.2 5.4 30.2 c -0.4 8.8 5.6 19.4 5.6 19.4 c 2 3.8 -2.2 22 -2.2 22 c -2 2.2 -0.6 3 -0.6 3 c 1 1.2 7.8 14.4 7.8 14.4 c -1.8 -0.2 1.8 3.4 1.8 3.4 c 5.2 6 -1.2 3 -1.2 3 c -6 -1.6 1 8.2 1 8.2 c 1.2 1.8 -7.8 -2.8 -7.8 -2.8 c -9.2 -0.6 2.4 6.6 2.4 6.6 c 8.6 7.2 -2.8 2.8 -2.8 2.8 c -4.6 -1.8 -1.4 5 -1.4 5 c 3.2 1.6 20.4 8.6 20.4 8.6 c 0.4 3.8 -2.6 8.8 -2.6 8.8 c 0.4 4 -1.8 7.4 -1.8 7.4 c -1.2 8.2 -1.8 9 -1.8 9 c -4.2 0.2 -11.6 14 -11.6 14 c -1.8 2.6 -12 14.6 -12 14.6 c -2 7 -20 -0.2 -20 -0.2 c -6.6 3.4 -4.6 0 -4.6 0 c -0.4 -2.2 4.4 -8.2 4.4 -8.2 c 7 -2.6 4.4 -13.4 4.4 -13.4 c 4 -1.4 -7.2 -4.2 -7 -5.4 s 6 -2.6 6 -2.6 c 8 -2 3.6 -4.4 3.6 -4.4 c -0.6 -4 2.4 -9.6 2.4 -9.6 c 11.6 -0.8 0 -17 0 -17 c -10.8 -7.6 -11.8 -13.4 -11.8 -13.4 c 12.6 -8.2 4.4 -20.6 4.6 -24.2 s 1.4 -25.2 1.4 -25.2 c -2 -6.2 -5 -19.8 -5 -19.8 c 2.2 -5.2 9.6 -17.8 9.6 -17.8 c 2.8 -4.2 11.6 -9 9.4 -12 s -10 -1.2 -10 -1.2 c -7.8 -1.4 -7.2 3.8 -7.2 3.8 c -1.6 1 -2.4 6 -2.4 6 c -0.72 7.933 -9.6 14.2 -9.6 14.2 c -11.2 6.2 -2 10.2 -2 10.2 c 6 6.6 -3.8 6.8 -3.8 6.8 c -11 -1.8 -2.8 8.4 -2.8 8.4 c 10.8 12.8 7.8 15.6 7.8 15.6 c -10.2 1 2.4 10.2 2.4 10.2 s -0.8 -2 -0.6 -0.2 s 3.2 6 4 8 s -3.2 2.2 -3.2 2.2 c 0.6 9.6 -14.8 5.4 -14.8 5.4 l -1.6 0.2 c -1.6 0.2 -12.8 -0.6 -18.6 -2.8 s -12.599 -2.2 -12.599 -2.2 s -4 1.8 -11.601 1.6 c -7.6 -0.2 -15.6 2.6 -15.6 2.6 c -4.4 -0.4 4.2 -4.8 4.4 -4.6 s 5.8 -5.4 -2.2 -4.8 c -21.797 1.635 -32.6 -8.6 -32.6 -8.6 c -2 -1.4 -4.6 -4.2 -4.6 -4.2 c -10 -2 1.4 12.4 1.4 12.4 c 1.2 1.4 -0.2 2.4 -0.2 2.4 c -0.8 -1.6 -8.6 -7 -8.6 -7 c -2.811 -0.973 -4.4 -3.2 -6.505 -4.793 z";
      } else if (pathEl.id == "path388") {
        d =
          "m 50.6 84 s -20.4 -19.2 -28.4 -20 c 0 0 -33.2 -3 -49.2 14 c 0 0 17.6 -20.4 45.2 -14.8 c 0 0 -21.6 -4.4 -34 -1.2 l -26.4 14 l -2.8 4.8 s 4 -14.8 22.4 -20.8 c 0 0 21.6 -3 33.6 0 c 0 0 -21.6 -6.8 -31.6 -4.8 c 0 0 -30.4 -2.4 -43.2 24 c 0 0 4 -14.4 18.8 -21.6 c 0 0 13.6 -8.8 34 -6 c 0 0 14 2.4 19.6 5.6 s 4 -0.4 -4.4 -5.2 c 0 0 -5.6 -10 -19.6 -9.6 c 0 0 -39.6 4.6 -53.2 15.6 c 0 0 13.6 -11.2 24 -14 c 0 0 22.4 -8 30.8 -7.2 c 0 0 24.8 1 32.4 -3 c 0 0 -11.2 5 -8 8.2 s 10 10.8 10 12 s 24.2 23.3 27.8 27.7 l 2.2 2.3 z";
      } else if (pathEl.id == "path528") {
        d =
          "m 2.2 -58 s -9.238 -2.872 -20.4 22.8 c 0 0 -2.4 5.2 -4.8 7.2 s -13.6 5.6 -15.6 9.6 l -10.4 16 s 14.8 -16 18 -18.4 c 0 0 8 -8.4 4.8 -1.6 c 0 0 -14 10.8 -12.8 20 c 0 0 -5.6 14.4 -6.4 16.4 c 0 0 16 -32 18.4 -33.2 s 3.6 -1.2 2.4 2.4 s -3.4 18.8 -4.4 22 c 0 0 8 -20.4 7.2 -23.6 c 0 0 3.2 -3.6 5.6 1.6 l -1.2 16 l 4.4 12 s -2.4 -11.2 -0.8 -26.8 c 0 0 -2 -10.4 2 -4.8 s 11.8 11.4 13.6 16.4 c 0 0 -5.2 -17.6 -14.4 -22.4 l -4 6 l -1.2 -2 s -3.6 -0.8 0.8 -7.6 s 4 -7.6 4 -7.6 s 6.4 7.2 8 7.2 c 0 0 13.2 -7.6 14.4 16.8 c 0 0 6.8 -14.4 -2.4 -21.2 c 0 0 -14.8 -2 -13.6 -7.2 l 7.2 -12.4 c 3.6 -5.2 2 -2.4 2 -2.4 z";
      } else if (pathEl.id == "path496") {
        d =
          "m -109 131.05 c 2.6 3.95 5.8 8.15 8 10.55 c 4.4 4.8 12.8 11.2 14.4 11.2 s 4.8 3.2 6.8 2.4 s 4.8 -2.4 5.2 -5.6 s -2.4 -5.6 -2.4 -5.6 c -3.066 -1.53 -5.806 -5.02 -7.385 -7.35 c 0 0 0.185 2.55 -5.015 1.75 s -10.4 -3.6 -12 -6.8 s -4 -5.6 -2.4 -2 s 4 7.2 5.6 7.6 s 1.2 1.6 -1.2 1.2 s -5.2 -0.8 -8.6 -6.4 z";
      } else if (pathEl.id == "path444") {
        d =
          "m 33.2 -114 s -14.8 1.8 -19.2 3 s -23 8.8 -26 10.8 c 0 0 -13.4 5.4 -30.4 25.4 c 0 0 7.6 -3.4 9.8 -6.2 c 0 0 13.6 -12.6 13.4 -10 c 0 0 12.2 -8.6 11.6 -6.4 c 0 0 24.4 -11.2 22.4 -8 c 0 0 21.6 -4.6 20.6 -2.6 c 0 0 18.8 4.4 16 4.6 c 0 0 -5.8 1.2 0.6 4.8 c 0 0 -3.4 4.4 -8.8 0.4 s -2.4 -1.8 -7.4 -0.8 c 0 0 -2.6 0.8 -7.2 -3.2 c 0 0 -5.6 -4.6 -14.4 -1 c 0 0 -30.6 12.6 -32.6 13.2 c 0 0 -3.6 2.8 -6 6.4 c 0 0 -5.8 4.4 -8.8 5.8 c 0 0 -12.8 11.6 -14 13 c 0 0 -3.4 5.2 -4.2 5.6 c 0 0 6.4 -3.8 8.4 -5.8 c 0 0 14 -10 19.4 -10.8 c 0 0 4.4 -3 5.2 -4.4 c 0 0 14.4 -9.2 18.6 -9.2 c 0 0 9.2 5.2 11.6 -1.8 c 0 0 5.8 -1.8 11.4 -0.6 c 0 0 3.2 -2.6 2.4 -4.8 c 0 0 1.6 -1.8 2.6 2 c 0 0 3.4 3.6 8.2 1.6 c 0 0 4 -0.2 2 2.2 c 0 0 -4.4 3.8 -16.2 4 c 0 0 -12.4 0.6 -28.8 8.2 c 0 0 -29.8 10.4 -39 20.8 c 0 0 -6.4 8.8 -11.8 10 c 0 0 -5.8 0.8 -11.8 8.2 c 0 0 9.8 -5.8 18.8 -5.8 c 0 0 4 -2.4 0.2 1.2 c 0 0 -3.6 7.6 -2 13 c 0 0 -0.6 5.2 -1.4 6.8 c 0 0 -7.8 12.8 -7.8 15.2 s 1.2 12.2 1.6 12.8 s -1 -1.6 2.8 0.8 s 6.6 4 7.4 6.8 s -2 -5.4 -2.2 -7.2 s -4.4 -9 -3.6 -11.4 c 0 0 0.4 1.4 1.8 2.4 c 0 0 -0.6 -0.6 0 -4.2 c 0 0 0.8 -5.2 2.2 -8.4 s 3.4 -7 3.8 -7.8 s 0.4 -6.6 1.8 -4 l 3.4 2.6 s -2.8 -2.6 -0.6 -4.8 c 0 0 -1 -5.6 0.8 -8.2 c 0 0 7 -8.4 8.6 -9.4 s 0.2 -0.6 0.2 -0.6 s 6 -4.2 0.2 -2.6 c 0 0 -4 1.6 -7 1.6 c 0 0 -7.6 2 -3.6 -2.2 s 14 -9.6 17.8 -9.4 l 0.8 1.6 l 11.2 -2.4 l -1.2 0.8 s 0.2 0.4 4 -0.6 s 10 1 11.4 -0.8 s 4.8 -2.8 4.4 -1.4 s -0.6 3.4 -0.6 3.4 s 5 -5.8 4.4 -3.6 s -8.8 7.4 -10.2 13.6 l 10.4 -8.2 l 3.6 -3 s 3.6 2.2 3.8 0.6 s 4.8 -7.4 6 -7.2 s 3.2 -2.6 3 0 s 7.4 8 7.4 8 s 3.2 -1.8 4.6 -0.4 s 5.6 -19.8 5.6 -19.8 l 25 -10.6 l 43.6 -3.4 l -16.999 -6.8 l -61.001 -11.4 z";
      }

      const polygon = toPolygon(d).scale(3).translate(this.x, this.y);
      if (polygon.paths.length == 0) return;

      const fill = g.getAttribute("fill");
      if (fill) {
        const color = parseColor(fill);
        this.drawFns.push(renderer.compilePolygon(polygon));
        this.colors.push(color);
      }
      const stroke = g.getAttribute("stroke");
      if (stroke) {
        const strokeWidth = g.getAttribute("stroke-width") ?? "1";
        const strokeGeometry = makeStrokeCombined(
          polygon.paths[0],
          +strokeWidth * devicePixelRatio,
          d.endsWith("z") || d.endsWith("Z")
        );
        const color = parseColor(stroke);
        this.drawFns.push(renderer.compilePolygon(strokeGeometry));
        this.colors.push(color);
      }
    });
    this.active = this.colors.map(() => false);
  }

  public draw() {
    for (let i = 0; i < this.drawFns.length; ++i) {
      this.drawFns[i](
        {
          color: this.active[i] ? [1, 0, 0, 1] : this.colors[i],
        },
        {
          // scale: this.active[i] ? 1.05 : 1,
          // translateY: this.active[i] ? -10 : 0,
        },
        (type) => {
          switch (type) {
            case "click": {
              // location.href = "./cpu";
              // return true;
              return false;
            }
            case "pointerenter": {
              if (!this.active[i]) {
                this.active[i] = true;
                return true;
              }
              return false;
            }
            case "pointerleave": {
              if (this.active[i]) {
                this.active[i] = false;
                return true;
              }
              return false;
            }
            default:
              return false;
          }
        },
        debug
      );
    }
  }
}

class Text {
  // private fontSize = 400;
  private active: Array<boolean> = [];
  private drawFns: Array<DrawFn> = [];

  constructor(
    private s: string,
    private dx: number,
    private dy: number,
    private size: number,
    private font: Font = FontBook.NotoSerif,
    private color: [number, number, number, number] = [0, 0, 0, 1],
    private onClick?: () => boolean
  ) {
    this.active = Array(s.length).fill(false);
    this.prepare();
  }

  public prepare() {
    const polygons = (this.drawFns = makeText(
      this.s,
      this.dx,
      this.dy,
      this.size,
      this.font,
      32
    ).map((polygon) => renderer.compilePolygon(polygon)));
  }

  public draw() {
    for (const [i, draw] of this.drawFns.entries()) {
      draw(
        { color: this.active.some((a) => a) ? [0.5, 0.5, 0.5, 1] : this.color },
        {
          // scale: this.active[i] ? 1.1 : 1,
        },
        (type) => {
          switch (type) {
            case "pointerenter": {
              this.active[i] = true;
              return true;
            }
            case "pointerleave": {
              this.active[i] = false;
              return true;
            }
            case "click": {
              return this.onClick?.() ?? false;
            }
            default:
              return false;
          }
        },
        debug
      );
    }
  }
}

const canvas = document.querySelector("#test") as HTMLCanvasElement;
const renderer = new Renderer(canvas);

renderer.register(new Tiger(canvas.width / 2, canvas.height / 2));

const pangram = "The quick brown fox jumps over the lazy dog";
renderer.register(new Text(pangram, 50, 150, 60, FontBook.NotoSerif, [0, 0, 0, 1]));
renderer.register(new Text(pangram.toUpperCase(), 50, 260, 40, FontBook.NotoSerif, [0, 0, 0, 1]));
renderer.register(new Text(pangram.toLowerCase(), 50, 350, 25, FontBook.NotoSerif, [0, 0, 0, 1]));
