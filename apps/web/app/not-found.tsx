import Link from "next/link";
import { TOTAL_SECTORS } from "@lunarlease/shared";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="numeric text-5xl font-semibold text-white/15">404</p>
      <h1 className="text-xl font-semibold text-white/90">Out of range</h1>
      <p className="text-sm leading-relaxed text-white/45">
        That page does not exist. Sector ids run from 0 to {TOTAL_SECTORS - 1}.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
      >
        Back to the Moon
      </Link>
    </div>
  );
}
