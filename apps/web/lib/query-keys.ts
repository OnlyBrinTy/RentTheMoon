import type { QueryClient } from "@tanstack/react-query";

const contractReadKeys = ["readContract", "readContracts", "balance", "lunarlease"];

export function invalidateContractReads(queryClient: QueryClient): void {
  for (const key of contractReadKeys) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}
