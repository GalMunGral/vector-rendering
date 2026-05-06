# 2D Vector Path Rendering

**Live demo:** https://galmungral.github.io/vector-rendering/compare.html

## Rhetorical Design

### Purpose

This project continues from [gui-first-principles](https://github.com/GalMunGral/gui-first-principles), which implements a GUI renderer from scratch using CPU scanline rasterization. The question it raises is: what does introducing dedicated graphics hardware change? GPU hardware was designed for triangle mesh rasterization — a 3D rendering model — not for 2D vector graphics. Mapping 2D vector paths onto that model is not straightforward, and this project illustrates the tradeoffs involved.

### Strategy

Three rendering approaches are implemented and compared. The first is a CPU baseline with no GPU involvement. The second offloads compositing — alpha blending of layers — to the GPU, a straightforward optimization that requires no change to the rasterization algorithm. The third goes further: the CPU triangulates the paths so they can be rasterized directly by the GPU. This approach exploits the GPU's native model but introduces an impedance mismatch — GPU hardware expects triangle meshes, not vector paths — making triangulation an unavoidable preprocessing step that adds complexity and overhead.