"use client";

import { useEffect, useState } from "react";
import { nowSeconds } from "@lunarlease/shared";

export function useNow(intervalMs = 1_000): bigint {
  const [now, setNow] = useState<bigint>(() => nowSeconds());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(nowSeconds()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
