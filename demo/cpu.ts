import { Font } from "opentype.js";
import { toPolygon } from "polyrender/Path.js";
import { Polygon } from "polyrender/Polygon";
import { makeStroke } from "polyrender/Stroke";
import { FontBook, makeText } from "polyrender/Text";

let PIXELS_PER_FRAME = 5000;
const speedSlider = document.querySelector("#speed") as HTMLInputElement;
const playBtn = document.querySelector("#play") as HTMLButtonElement;
speedSlider.oninput = () => { PIXELS_PER_FRAME = parseInt(speedSlider.value); };

const canvas = document.querySelector("#test") as HTMLCanvasElement;
document.body.style.margin = "0px";
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
canvas.style.width = window.innerWidth + "px";
canvas.style.height = window.innerHeight + "px";
canvas.style.background = "lightgray";
const ctx = canvas.getContext("2d")!;

const tigerSvg = new DOMParser().parseFromString(
  await (
    await fetch(
      "https://upload.wikimedia.org/wikipedia/commons/f/fd/Ghostscript_Tiger.svg"
    )
  ).text(),
  "text/xml"
);

const objects: Array<{ draw: () => void }> = [];
function drawScreen() {
  for (const obj of objects) {
    obj.draw();
  }
}

class Tiger {
  private colors: Array<[number, number, number, number]> = [];
  private polygons: Array<Polygon> = [];

  constructor(private x: number, private y: number) {
    this.prepare();
  }

  private prepare() {
    this.polygons.length = 0;
    this.colors.length = 0;

    tigerSvg.children[0].children[0].querySelectorAll("g").forEach((g) => {
      const pathEl = g.children[0];
      let d = pathEl.getAttribute("d")!;
      const polygon = toPolygon(d, 64).scale(3).translate(this.x, this.y);

      const fill = g.getAttribute("fill");
      if (fill) {
        const color = parseColor(fill).map((x) => Math.round(x * 255)) as [
          number,
          number,
          number,
          number
        ];
        this.polygons.push(polygon);
        this.colors.push(color);
      }

      const stroke = g.getAttribute("stroke");
      if (stroke) {
        const strokeWidth = g.getAttribute("stroke-width") ?? "1";
        const strokeGeometry = makeStroke(
          polygon.paths[0],
          Math.max(0.5, +strokeWidth * devicePixelRatio),
          d.endsWith("z") || d.endsWith("Z")
        );
        const color = parseColor(stroke).map((x) => Math.round(x * 255)) as [
          number,
          number,
          number,
          number
        ];
        for (const poly of strokeGeometry) {
          this.polygons.push(poly);
          this.colors.push(color);
        }
      }
    });
  }

  public draw(imageData: ImageData) {
    for (let i = 0; i < this.polygons.length; ++i) {
      const [r, g, b, a] = this.colors[i];
      this.polygons[i].traverse((x, y) => {
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;
        const i = (y * canvas.width + x) * 4;
        imageData.data[i] = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
        imageData.data[i + 3] = a;
      });
    }
    ctx.putImageData(imageData, 0, 0);
  }

  public *pixels() {
    for (let i = 0; i < this.polygons.length; ++i) {
      const it = this.polygons[i].traverseAsync();
      while (true) {
        const { done, value } = it.next();
        if (done) break;
        yield { color: this.colors[i], point: value };
      }
    }
  }
}

class Text {
  private fontSize = 400;
  private active: Array<boolean> = [];
  private polygons: Array<Polygon> = [];

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
    this.polygons = makeText(
      this.s,
      this.dx,
      this.dy,
      this.size,
      this.font,
      32
    );
  }

  public draw(imageData: ImageData) {
    const [r, g, b, a] = this.color.map((x) => Math.round(x * 255));
    for (let i = 0; i < this.polygons.length; ++i) {
      this.polygons[i].traverse((x, y) => {
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;
        const i = (y * canvas.width + x) * 4;
        imageData.data[i] = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
        imageData.data[i + 3] = a;
      });
    }
    ctx.putImageData(imageData, 0, 0);
  }
}

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
});

const tiger = new Tiger(canvas.width / 2 - 100, canvas.height / 2 + 50);

const pangram = "The quick brown fox jumps over the lazy dog";
const text1 = new Text(pangram, 50, 150, 60, FontBook.NotoSerif, [0, 0, 0, 1]);
const text2 = new Text(pangram.toUpperCase(), 50, 260, 40, FontBook.NotoSerif, [0, 0, 0, 1]);
const text3 = new Text(pangram.toLowerCase(), 50, 350, 25, FontBook.NotoSerif, [0, 0, 0, 1]);

const imageData = new ImageData(canvas.width, canvas.height);
tiger.draw(imageData);
text1.draw(imageData);
text2.draw(imageData);
text3.draw(imageData);

type AnimState = "idle" | "playing" | "paused" | "done";
const BUTTON_LABEL: Record<AnimState, string> = { idle: "Play", playing: "Pause", paused: "Play", done: "Restart" };

let animState: AnimState = "idle";
let pixelIter: ReturnType<typeof tiger.pixels> | null = null;
let animData: ImageData | null = null;

function syncButton() {
  playBtn.textContent = BUTTON_LABEL[animState];
}

function drawChunk() {
  if (animState !== "playing") return;
  let n = PIXELS_PER_FRAME;
  while (n--) {
    const { done, value } = pixelIter!.next();
    if (done) {
      animState = "done";
      ctx.putImageData(animData!, 0, 0);
      syncButton();
      return;
    }
    const { color: [r, g, b, a], point: { x, y } } = value;
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
    const i = (y * canvas.width + x) * 4;
    animData!.data[i] = r;
    animData!.data[i + 1] = g;
    animData!.data[i + 2] = b;
    animData!.data[i + 3] = a;
  }
  ctx.putImageData(animData!, 0, 0);
  requestAnimationFrame(drawChunk);
}

function startAnimation() {
  animState = "playing";
  animData = new ImageData(canvas.width, canvas.height);
  text1.draw(animData);
  text2.draw(animData);
  text3.draw(animData);
  pixelIter = tiger.pixels();
  syncButton();
  requestAnimationFrame(drawChunk);
}

playBtn.onclick = () => {
  switch (animState) {
    case "idle":
    case "done":
      startAnimation();
      break;
    case "playing":
      animState = "paused";
      syncButton();
      break;
    case "paused":
      animState = "playing";
      syncButton();
      requestAnimationFrame(drawChunk);
      break;
  }
};

function parseColor(s: string): [number, number, number, number] {
  if (s.length == 7) {
    const r = parseInt(s.slice(1, 3), 16) / 255;
    const g = parseInt(s.slice(3, 5), 16) / 255;
    const b = parseInt(s.slice(5, 7), 16) / 255;
    return [r, g, b, 1];
  } else {
    const r = parseInt(s.slice(1, 2), 16) / 15;
    const g = parseInt(s.slice(2, 3), 16) / 15;
    const b = parseInt(s.slice(3, 4), 16) / 15;
    return [r, g, b, 1];
  }
}
