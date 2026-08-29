import { SECTOR_READ_CHUNK_SIZE } from "@/hooks/use-sector";
import { TOTAL_SECTORS } from "@lunarlease/shared";

export function ScanNotice() {
  return (
    <p className="text-[11px] leading-relaxed text-white/30">
      V1 discovers sectors by scanning all {TOTAL_SECTORS.toLocaleString()} on-chain
      states in batched <code className="numeric">getSectors</code> calls of{" "}
      {SECTOR_READ_CHUNK_SIZE} ids. This is isolated behind a single hook and will be
      replaced by indexer queries.
    </p>
  );
}
