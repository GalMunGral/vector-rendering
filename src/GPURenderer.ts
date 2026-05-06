import { Polygon } from "./Polygon";
import { Vector } from "./Vector";

export type Transform = {
  translateX?: number;
  translateY?: number;
  rotation?: number;
  scale?: number;
};
export type EventHander = (type: string, x: number, y: number) => boolean;
export type InteractiveObject = {
  prepare: () => void;
  draw: () => void;
  globalEventHandler?: EventHander;
};
export type InteractiveArea = { polygon: Polygon; eventHandler?: EventHander };
export type DrawFn<Config = unknown> = (
  config?: Config,
  transform?: Transform,
  eventHandler?: EventHander,
  debug?: boolean
) => void;

export class GPURenderer {
  private gl: WebGL2RenderingContext;
  private basicProgram: WebGLProgram;
  private active: InteractiveArea | null = null;
  private interactiveObjects: Array<InteractiveObject> = [];
  private interactiveAreas: Array<InteractiveArea> = [];

  constructor(canvas: HTMLCanvasElement) {
    document.body.style.margin = "0px";
    document.body.style.overflowY = "auto";
    canvas.style.display = "block";
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = 900 * devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = "900px";
    canvas.style.background = "lightgray";

    this.gl = canvas.getContext("webgl2")!;
    this.basicProgram = createWebGLProgram(
      this.gl,
      `#version 300 es
      uniform float viewportWidth;
      uniform float viewportHeight;

      uniform vec2 translation;
      uniform float scale;

      in vec2 pos;
    
      void main() {
        vec2 p =  scale * pos + translation;
        gl_Position = vec4(
          p.x * 2.0 / viewportWidth - 1.0,
          1.0 - p.y * 2.0 / viewportHeight,
          0,
          1.0
        );
        gl_PointSize = 2.0;
      }
    `,
      `#version 300 es
      precision mediump float;
    
      uniform vec4 color;
      out vec4 fragColor;
    
      void main() {
        // color = texture2D(uSampler, texCoord);
        fragColor = color;
      }
    `
    );

    const dispatch = (e: MouseEvent) => {
      const type = e.type;
      const x = e.offsetX * devicePixelRatio;
      const y = e.offsetY * devicePixelRatio;
      let dirty = false;
      for (const area of this.interactiveAreas) {
        if (area.eventHandler && area.polygon.contains(new Vector(x, y))) {
          e.stopImmediatePropagation();
          dirty = area.eventHandler(type, x, y);
          break;
        }
      }
      for (const obj of this.interactiveObjects) {
        if (obj.globalEventHandler) {
          // e.stopImmediatePropagation();
          if (obj.globalEventHandler?.(type, x, y)) {
            dirty = true;
          }
        }
      }
      if (dirty) this.drawScreen();
    };

    canvas.addEventListener("click", dispatch);
    canvas.addEventListener("mouseup", dispatch);
    canvas.addEventListener("mousedown", dispatch);

    canvas.addEventListener("pointermove", (e) => {
      const type = e.type;
      const x = e.offsetX * devicePixelRatio;
      const y = e.offsetY * devicePixelRatio;
      let active: InteractiveArea | null = null;
      let dirty = false;
      for (const area of this.interactiveAreas) {
        if (area.eventHandler && area.polygon.contains(new Vector(x, y))) {
          e.stopImmediatePropagation();
          dirty = area.eventHandler(type, x, y);
          active = area;
          break;
        }
      }
      // TODO: how to determin if the active element has changed
      if (this.active?.polygon != active?.polygon) {
        if (this.active?.eventHandler?.("pointerleave", x, y)) {
          dirty = true;
        }
        if (active?.eventHandler?.("pointerenter", x, y)) {
          dirty = true;
        }
        this.active = active;
      }

      for (const obj of this.interactiveObjects) {
        if (obj.globalEventHandler) {
          // e.stopImmediatePropagation();
          if (obj.globalEventHandler?.(type, x, y)) {
            dirty = true;
          }
        }
      }

      if (dirty) this.drawScreen();
    });

    window.addEventListener("resize", () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.style.width = window.innerWidth + "px";
      this.drawScreen();
    });
  }

  public register(obj: InteractiveObject) {
    this.interactiveObjects.push(obj);
    requestAnimationFrame(() => {
      obj.draw();
    });
  }

  public prepare() {
    for (const obj of this.interactiveObjects) {
      obj.prepare();
    }
  }

  public drawScreen() {
    requestAnimationFrame(() => {
      this.interactiveAreas.length = 0; // clear
      for (const obj of this.interactiveObjects) {
        obj.draw();
      }
    });
  }

  public compilePolygon(
    polygon: Polygon
  ): DrawFn<{ color: [number, number, number, number] }> {
    const gl = this.gl;
    const program = this.basicProgram;
    const { vertices, triangles, paths } = polygon.mesh;

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(vertices.flatMap(({ x, y }) => [x, y])),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, "pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const triangleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuf);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(triangles.flat()),
      gl.STATIC_DRAW
    );

    const lines: Array<[number, number]> = [];
    for (const tri of triangles) {
      lines.push([tri[0], tri[1]]);
      lines.push([tri[1], tri[2]]);
      lines.push([tri[2], tri[0]]);
    }

    const lineBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineBuf);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(lines.flat()),
      gl.STATIC_DRAW
    );

    const viewportWidthUniformLoc = gl.getUniformLocation(
      program,
      "viewportWidth"
    );
    const viewportHeightUniformLoc = gl.getUniformLocation(
      program,
      "viewportHeight"
    );

    const scaleUniformLoc = gl.getUniformLocation(program, "scale");
    const translationUniformLoc = gl.getUniformLocation(program, "translation");
    const colorUniformLoc = gl.getUniformLocation(program, "color");

    return (config, transform, eventHandler, debug = false) => {
      gl.useProgram(program);
      gl.enable(gl.BLEND);
      gl.bindVertexArray(vao);
      gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      gl.uniform1f(viewportWidthUniformLoc, this.gl.canvas.width);
      gl.uniform1f(viewportHeightUniformLoc, this.gl.canvas.height);
      gl.uniform1f(scaleUniformLoc, transform?.scale ?? 1);
      // TODO rotation and scaling
      gl.uniform2fv(
        translationUniformLoc,
        new Float32Array([
          transform?.translateX ?? 0,
          transform?.translateY ?? 0,
        ])
      );

      if (debug) {
        gl.uniform4fv(colorUniformLoc, [0, 0, 0, 1]);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineBuf);
        gl.drawElements(gl.LINES, lines.length * 2, gl.UNSIGNED_SHORT, 0);
        gl.drawArrays(gl.POINTS, 0, vertices.length);
      } else {
        gl.uniform4fv(
          colorUniformLoc,
          new Float32Array(config?.color ?? [0, 0, 0, 0])
        );
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuf);
        gl.drawElements(
          gl.TRIANGLES,
          triangles.length * 3,
          gl.UNSIGNED_SHORT,
          0
        );
      }
      this.interactiveAreas.unshift({ polygon, eventHandler });
    };
  }
}

function compileShader(
  gl: WebGL2RenderingContext,
  shaderSource: string,
  shaderType:
    | WebGL2RenderingContext["VERTEX_SHADER"]
    | WebGL2RenderingContext["FRAGMENT_SHADER"]
): WebGLShader {
  const shader = gl.createShader(shaderType)!;
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    throw "could not compile shader:" + gl.getShaderInfoLog(shader);
  }

  return shader;
}

function createWebGLProgram(
  gl: WebGL2RenderingContext,
  vertexShaderSource: string,
  fragmentShaderSource: string
): WebGLProgram {
  const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(
    gl,
    fragmentShaderSource,
    gl.FRAGMENT_SHADER
  );

  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    throw "program failed to link:" + gl.getProgramInfoLog(program);
  }

  return program;
}
