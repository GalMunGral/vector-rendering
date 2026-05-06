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

export class Renderer {
  private gl: WebGL2RenderingContext;
  private basicProgram: WebGLProgram;
  private active: InteractiveArea | null = null;
  private interactiveObjects: Array<InteractiveObject> = [];
  private interactiveAreas: Array<InteractiveArea> = [];

  constructor(canvas: HTMLCanvasElement) {
    document.body.style.margin = "0px";
    canvas.style.display = "block";
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    canvas.style.background = "lightgray";

    this.gl = canvas.getContext("webgl2")!;
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.basicProgram = createWebGLProgram(
      this.gl,
      `#version 300 es
      uniform float viewportWidth;
      uniform float viewportHeight;

      uniform vec2 transformOrigin;
      uniform vec2 translation;
      uniform float scale;

      in vec2 pos;
      in vec2 uv;

      out vec2 texCoord;
    
      void main() {
        vec2 p =  scale * (pos - transformOrigin) + transformOrigin + translation;
        gl_Position = vec4(
          p.x * 2.0 / viewportWidth - 1.0,
          1.0 - p.y * 2.0 / viewportHeight,
          0,
          1.0
        );
        texCoord = uv;
        gl_PointSize = 2.0;
      }
    `,
      `#version 300 es
      precision mediump float;
      uniform sampler2D sampler;
    
      uniform vec4 color;
      uniform int debug;

      in vec2 texCoord;
      out vec4 fragColor;
    
      void main() {
        fragColor = debug != 0 ? color : texture(sampler, texCoord).a * color;
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
      canvas.height = window.innerHeight * devicePixelRatio;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
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
    const { left, right, top, bottom } = polygon.boundingBox;

    const width = right - left + 1;
    const height = bottom - top + 1;
    const raster = new ImageData(width, height);

    const triangles = [0, 2, 3, 0, 3, 1];

    polygon.traverse((x, y) => {
      raster.data[((y - top) * width + (x - left)) * 4 + 3] = 255;
    });

    const texture = loadTexture(gl, raster);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([left, top, right, top, left, bottom, right, bottom]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, "pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
      gl.STATIC_DRAW
    );

    const uvLoc = gl.getAttribLocation(program, "uv");
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    const triangleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuf);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(triangles),
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

    const originUniformLoc = gl.getUniformLocation(program, "transformOrigin");
    const origin = new Float32Array([(left + right) / 2, (top + bottom) / 2]);
    const scaleUniformLoc = gl.getUniformLocation(program, "scale");
    const translationUniformLoc = gl.getUniformLocation(program, "translation");
    const colorUniformLoc = gl.getUniformLocation(program, "color");
    const samplerUniformLoc = gl.getUniformLocation(program, "sampler");
    const debugUniformLoc = gl.getUniformLocation(program, "debug");

    return (config, transform, eventHandler, debug = false) => {
      gl.useProgram(program);
      gl.enable(gl.BLEND);
      gl.bindVertexArray(vao);
      gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      gl.uniform2fv(originUniformLoc, origin);
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

      // gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(samplerUniformLoc, 0);

      const lines = [0, 1, 0, 2, 0, 3, 1, 3, 2, 3];
      const lineBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineBuf);
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(lines),
        gl.STATIC_DRAW
      );

      if (debug) {
        gl.uniform1i(debugUniformLoc, 1);
        gl.uniform4fv(colorUniformLoc, [0, 0, 0, 1]);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineBuf);
        gl.drawElements(gl.LINES, lines.length, gl.UNSIGNED_SHORT, 0);
      } else {
        gl.uniform1i(debugUniformLoc, 0);
        gl.uniform4fv(
          colorUniformLoc,
          new Float32Array(config?.color ?? [0, 0, 0, 0])
        );
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuf);
        gl.drawElements(gl.TRIANGLES, triangles.length, gl.UNSIGNED_SHORT, 0);
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

function loadTexture(gl: WebGL2RenderingContext, img: ImageData) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const level = 0;
  const internalFormat = gl.RGBA;
  const width = img.width;
  const height = img.height;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    img
  );

  if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
    // Yes, it's a power of 2. Generate mips.
    gl.generateMipmap(gl.TEXTURE_2D);
  } else {
    // No, it's not a power of 2. Turn off mips and set
    // wrapping to clamp to edge
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }

  return texture;
}

function isPowerOf2(value: number) {
  return (value & (value - 1)) === 0;
}
