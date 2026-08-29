import { sectorVisualStyles, legendStates } from "@/lib/sector-visuals";

export function MoonLegend() {
  return (
    <div className="panel-surface rounded-xl px-3 py-2.5">
      <p className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase">
        Sector states
      </p>
      <ul className="mt-2 space-y-1.5">
        {legendStates.map((state) => {
          const style = sectorVisualStyles[state];
          return (
            <li key={state} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: style.hex }}
              />
              <span className="text-[11px] font-medium text-white/75">{style.label}</span>
              <span className="hidden text-[10px] text-white/35 lg:inline">
                {style.description}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
