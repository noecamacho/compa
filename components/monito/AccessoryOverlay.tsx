import { ACCESSORY_LOOK, ACCESSORY_PLACEMENT, type Accessory } from "@/lib/monito/accessories";
import { monitoLayers } from "@/lib/monito/grid";
import { DEFAULT_LOOK } from "@/lib/monito/look";

type Props = { accessories: readonly Accessory[]; size: number };

// The cap's pixels sit in columns 1–15 and rows 1–5 of the monito grid; the box crops to them.
const HAT_BOX = { x: 1, y: 1, width: 15, height: 5 };

// Accessories drawn over a round photo: the same pixels the monito wears, placed and scaled by the photo's size.
// Decorative (the photo already carries the name); the stored photo never changes.
export function AccessoryOverlay({ accessories, size }: Props) {
  return accessories.map((accessory) => {
    const place = ACCESSORY_PLACEMENT[accessory];
    const width = size * place.width;
    const height = (width * HAT_BOX.height) / HAT_BOX.width;
    return (
      <svg
        key={accessory}
        data-accessory={accessory}
        aria-hidden="true"
        viewBox={`${HAT_BOX.x} ${HAT_BOX.y} ${HAT_BOX.width} ${HAT_BOX.height}`}
        width={width}
        height={height}
        shapeRendering="crispEdges"
        className="pointer-events-none absolute block"
        style={{ left: size * place.left, top: size * place.top, transform: `rotate(${place.rotate}deg)`, transformOrigin: "50% 100%" }}
      >
        {monitoLayers({ ...DEFAULT_LOOK, ...ACCESSORY_LOOK[accessory] }, "hat").map(({ layer, d, fill }) => (
          <path key={layer} d={d} fill={fill} />
        ))}
      </svg>
    );
  });
}
