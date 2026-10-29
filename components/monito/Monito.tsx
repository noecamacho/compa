import { GRID_HEIGHT, GRID_WIDTH, monitoLayers } from "@/lib/monito/grid";
import type { MonitoLook } from "@/lib/monito/look";

type Props = { look: MonitoLook; px?: number; label?: string; className?: string };

// Full-body pixel-art monito; `px` is the size of one cell (README: 16×20 cells, scaled with px).
export function Monito({ look, px = 10, label = "Monito", className }: Props) {
  const width = GRID_WIDTH * px;
  const height = GRID_HEIGHT * px;
  return (
    <svg
      viewBox={`0 0 ${GRID_WIDTH} ${GRID_HEIGHT}`}
      width={width}
      height={height}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      // The look as data, so screens (and tests) can tell two monitos apart without reading the pixels.
      data-look={JSON.stringify(look)}
      className={className}
      style={{ display: "block" }}
    >
      {monitoLayers(look).map(({ layer, d, fill }) => (
        <path key={layer} d={d} fill={fill} />
      ))}
    </svg>
  );
}
