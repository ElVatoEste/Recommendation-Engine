import { EventFeed } from "@/components/EventFeed";
import { IngestForm } from "@/components/IngestForm";
import { QueryPanel } from "@/components/QueryPanel";

export default function Sandbox() {
  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">
          Algorithm sandbox
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Feed events on the left, then read how every strategy re-ranks on the right.
          Nothing is precomputed: each ingest updates the live engine and every panel refetches.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,380px)_1fr]">
        <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <IngestForm />
          <EventFeed />
        </div>
        <QueryPanel />
      </div>
    </div>
  );
}
