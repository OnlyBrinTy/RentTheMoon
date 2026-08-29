import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "@/components/ui/card";

export function SectorHistoryPlaceholder({
  sectorId,
}: {
  readonly sectorId: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Activity history</CardTitle>
          <CardSubtitle>
            Acquisitions, rentals, listings and sales for sector #{sectorId}
          </CardSubtitle>
        </div>
        <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white/45 uppercase">
          placeholder
        </span>
      </CardHeader>
      <CardBody>
        <div className="rounded-xl border border-dashed border-white/12 bg-black/20 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-white/70">
            Indexer-backed history is not wired up yet
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-white/40">
            This component is a deliberate placeholder. Once the Ponder indexer ships it
            will render the event stream for this sector — SectorAcquired,
            RentalPriceChanged, RentAvailabilityChanged, SectorRented, SectorListed,
            SectorListingCancelled and SectorSold — newest first.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

export function RecentActivityPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recent activity</CardTitle>
          <CardSubtitle>Marketplace-wide event feed</CardSubtitle>
        </div>
        <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white/45 uppercase">
          placeholder
        </span>
      </CardHeader>
      <CardBody>
        <div className="rounded-xl border border-dashed border-white/12 bg-black/20 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-white/70">Awaiting the indexer</p>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-white/40">
            A chronological feed of acquisitions, rentals and sales across all 2,592
            sectors will appear here once Ponder is indexing contract events.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
