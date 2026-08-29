import type { SectorVisualState } from "@lunarlease/shared";

export interface SectorVisualStyle {
  readonly label: string;
  readonly hex: string;
  readonly rgb: readonly [number, number, number];
  readonly overlayAlpha: number;
  readonly description: string;
  readonly badgeClassName: string;
}

export const sectorVisualStyles: Record<SectorVisualState, SectorVisualStyle> = {
  unclaimed: {
    label: "Unclaimed",
    hex: "#64748b",
    rgb: [100, 116, 139],
    overlayAlpha: 0.06,
    description: "Available for primary acquisition",
    badgeClassName: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  },
  owned: {
    label: "Owned",
    hex: "#38bdf8",
    rgb: [56, 189, 248],
    overlayAlpha: 0.46,
    description: "Claimed, not currently rented",
    badgeClassName: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  },
  rented: {
    label: "Rented",
    hex: "#a855f7",
    rgb: [168, 85, 247],
    overlayAlpha: 0.55,
    description: "Active ERC-4907 usage rights",
    badgeClassName: "border-purple-400/40 bg-purple-400/10 text-purple-200",
  },
  forSale: {
    label: "For sale",
    hex: "#f59e0b",
    rgb: [245, 158, 11],
    overlayAlpha: 0.55,
    description: "Listed on the secondary market",
    badgeClassName: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  },
  selected: {
    label: "Selected",
    hex: "#fde047",
    rgb: [253, 224, 71],
    overlayAlpha: 0.7,
    description: "Currently focused sector",
    badgeClassName: "border-yellow-300/50 bg-yellow-300/10 text-yellow-100",
  },
};

export const legendStates: readonly SectorVisualState[] = [
  "unclaimed",
  "owned",
  "rented",
  "forSale",
  "selected",
];
