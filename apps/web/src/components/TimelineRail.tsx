import type { RecommendationEvent } from "@/lib/contracts";
import { describeEvent, eventAccent, formatDateTime, formatEventType } from "@/lib/format";

interface TimelineRailProps {
  events: RecommendationEvent[];
  currentEventId?: string;
}

export function TimelineRail({ events, currentEventId }: TimelineRailProps) {
  return (
    <div className="space-y-3">
      {events.map((event) => {
        const isActive = currentEventId === event.id;
        return (
          <article
            key={event.id}
            className={`rounded-[22px] border p-4 transition-[background-color,border-color,transform,box-shadow] duration-300 ease-[var(--ease-out-strong)] ${
              isActive
                ? "border-cyan-300/30 bg-cyan-400/12 shadow-[0_16px_40px_-20px_rgba(34,211,238,0.6)]"
                : "border-white/8 bg-white/[0.025] hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className={`inline-flex rounded-full border border-white/10 bg-gradient-to-r px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-slate-200 ${eventAccent(event.type)}`}
                >
                  {formatEventType(event.type)}
                </div>
                <p className="mt-3 text-sm text-slate-100">{describeEvent(event)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {event.customerId ?? "sin cliente"} · {formatDateTime(event.occurredAt)}
                </p>
              </div>
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                  isActive ? "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.7)]" : "bg-slate-600"
                }`}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
