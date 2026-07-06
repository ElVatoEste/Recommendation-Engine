import { useMemo } from "react";

import { Panel, Empty } from "@/components/ui";
import { useAsyncData } from "@/hooks/useAsyncData";
import { observatoryApi } from "@/lib/api";
import { describeEvent, formatDateTime, formatEventType } from "@/lib/format";
import { useObservatoryStore } from "@/store/observatoryStore";

export function EventFeed({ limit = 12 }: { limit?: number }) {
  const { latestEvent, revision } = useObservatoryStore();
  const { data } = useAsyncData(() => observatoryApi.events(limit), [revision]);

  const events = useMemo(() => {
    const incoming = [...(data?.events ?? [])].reverse();
    if (!latestEvent) return incoming;
    return [
      latestEvent,
      ...incoming.filter((e) => e.id !== latestEvent.id),
    ].slice(0, limit);
  }, [data?.events, latestEvent, limit]);

  return (
    <Panel title="Event feed" hint="Newest first, live over SSE">
      {events.length === 0 ? (
        <Empty>No events yet. Ingest an order to start.</Empty>
      ) : (
        <ol className="flex flex-col">
          {events.map((event, index) => (
            <li
              key={event.id}
              className={`flex items-baseline gap-3 border-b border-line/60 py-2 last:border-b-0 ${
                index === 0 && latestEvent?.id === event.id ? "flash" : ""
              }`}
            >
              <span className="tnum shrink-0 text-[11px] text-neutral-600">
                {formatDateTime(event.occurredAt).slice(-8)}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-accent">
                  {formatEventType(event.type)}
                </span>
                <p className="truncate text-sm text-neutral-200">
                  {describeEvent(event)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
