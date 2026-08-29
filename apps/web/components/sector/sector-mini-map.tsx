import {
  LATITUDE_STEP_DEG,
  LONGITUDE_STEP_DEG,
  sectorBounds,
} from "@lunarlease/shared";
import { sectorVisualStyles } from "@/lib/sector-visuals";

export function SectorMiniMap({ sectorId }: { readonly sectorId: number }) {
  const bounds = sectorBounds(sectorId);
  const x = bounds.lonMin + 180;
  const y = 90 - bounds.latMax;

  return (
    <svg
      viewBox="0 0 360 180"
      role="img"
      aria-label={`Equirectangular position of sector ${sectorId}`}
      className="w-full rounded-xl border border-white/8 bg-black/40"
    >
      <defs>
        <pattern
          id="lunar-minimap-grid"
          width={LONGITUDE_STEP_DEG}
          height={LATITUDE_STEP_DEG}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${LONGITUDE_STEP_DEG} 0 L 0 0 0 ${LATITUDE_STEP_DEG}`}
            fill="none"
            stroke="rgba(143,180,255,0.14)"
            strokeWidth="0.25"
          />
        </pattern>
      </defs>

      <rect width="360" height="180" fill="url(#lunar-minimap-grid)" />

      <line x1="0" y1="90" x2="360" y2="90" stroke="rgba(255,255,255,0.16)" strokeWidth="0.4" />
      <line x1="180" y1="0" x2="180" y2="180" stroke="rgba(255,255,255,0.16)" strokeWidth="0.4" />

      <rect
        x={x}
        y={y}
        width={LONGITUDE_STEP_DEG}
        height={LATITUDE_STEP_DEG}
        fill={sectorVisualStyles.selected.hex}
        fillOpacity="0.85"
      />
      <rect
        x={x - 3}
        y={y - 3}
        width={LONGITUDE_STEP_DEG + 6}
        height={LATITUDE_STEP_DEG + 6}
        fill="none"
        stroke={sectorVisualStyles.selected.hex}
        strokeOpacity="0.45"
        strokeWidth="0.5"
      />

      <text x="4" y="10" fill="rgba(255,255,255,0.32)" fontSize="6">
        90°N
      </text>
      <text x="4" y="176" fill="rgba(255,255,255,0.32)" fontSize="6">
        90°S
      </text>
      <text x="332" y="86" fill="rgba(255,255,255,0.32)" fontSize="6">
        180°E
      </text>
    </svg>
  );
}
