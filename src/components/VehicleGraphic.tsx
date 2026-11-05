import { BODY_TYPE_LABELS } from '../data/vehicles';
import type { BodyType } from '../domain/schemas';

const OUTLINE = '#0f172a';
const GLASS = '#bfdbfe';

interface Shape {
  body: string;
  windows: string[];
  wheels: [number, number];
}

const SHAPES: Record<Exclude<BodyType, 'motorcycle'>, Shape> = {
  sedan: {
    body: 'M8 44V37Q8 32 14 31L30 28 42 17Q44 15 48 15H72Q76 15 79 18L88 27 104 30Q112 32 112 38V44Z',
    windows: ['M36 28 45 19H58V28Z', 'M61 19H72Q75 19 77 21L83 28H61Z'],
    wheels: [30, 92],
  },
  coupe: {
    body: 'M6 44V38Q6 33 12 32L32 29 48 18Q50 17 54 17H70Q74 17 77 20L88 29 106 32Q114 34 114 39V44Z',
    windows: ['M40 29 51 20H72Q74 20 76 22L83 29Z'],
    wheels: [28, 94],
  },
  hatchback: {
    body: 'M10 44V36Q10 31 16 30L30 28 42 16Q44 14 48 14H92Q97 14 99 19L104 30Q110 32 110 38V44Z',
    windows: ['M36 28 45 18H62V28Z', 'M65 18H90Q93 18 94 21L97 28H65Z'],
    wheels: [30, 90],
  },
  suv: {
    body: 'M8 44V33Q8 29 13 28L26 26 36 13Q38 11 42 11H100Q106 11 108 16L112 28V44Z',
    windows: ['M32 26 40 15H62V26Z', 'M65 15H84V26H65Z', 'M87 15H100Q103 15 104 18L106 26H87Z'],
    wheels: [30, 92],
  },
  truck: {
    body: 'M6 44V33Q6 29 11 28L24 26 32 13Q34 11 38 11H62Q66 11 66 15V28H114V44Z',
    windows: ['M29 26 36 15H61V26Z'],
    wheels: [26, 94],
  },
  van: {
    body: 'M6 44V32Q6 28 10 27L20 12Q22 9 26 9H106Q112 9 112 15V44Z',
    windows: ['M14 27 24 13H44V27Z', 'M48 13H72V27H48Z', 'M76 13H104Q107 13 107 16V27H76Z'],
    wheels: [28, 92],
  },
};

function Wheel({ x, radius = 8 }: { x: number; radius?: number }) {
  const y = radius === 8 ? 44 : 41;
  return (
    <g>
      <circle cx={x} cy={y} r={radius} fill="#1e293b" />
      <circle cx={x} cy={y} r={radius * 0.45} fill="#cbd5e1" />
    </g>
  );
}

function Motorcycle({ color }: { color: string }) {
  return (
    <>
      <Wheel x={28} radius={11} />
      <Wheel x={92} radius={11} />
      <path d="M28 41 50 30H72L92 41M72 30 84 14" fill="none" stroke="#475569" strokeWidth="3" />
      <path d="M78 13H90" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M46 26Q50 16 62 16H72Q78 16 78 24L74 30H50Z"
        fill={color}
        stroke={OUTLINE}
        strokeOpacity="0.5"
      />
      <path d="M26 24H48Q50 24 50 27V29H30Q26 29 26 24Z" fill="#1e293b" />
    </>
  );
}

export function VehicleGraphic({
  bodyType,
  color,
  className = '',
}: {
  bodyType: BodyType;
  color: string;
  className?: string;
}) {
  const label = `${BODY_TYPE_LABELS[bodyType]} illustration`;
  return (
    <svg viewBox="0 0 120 56" role="img" aria-label={label} className={className}>
      {bodyType === 'motorcycle' ? (
        <Motorcycle color={color} />
      ) : (
        <>
          <path
            d={SHAPES[bodyType].body}
            fill={color}
            stroke={OUTLINE}
            strokeOpacity="0.5"
            strokeLinejoin="round"
          />
          {SHAPES[bodyType].windows.map((window) => (
            <path key={window} d={window} fill={GLASS} stroke={OUTLINE} strokeOpacity="0.3" />
          ))}
          <Wheel x={SHAPES[bodyType].wheels[0]} />
          <Wheel x={SHAPES[bodyType].wheels[1]} />
        </>
      )}
    </svg>
  );
}
