import { useEffect } from "react";

import { buildStreamUrl } from "@/lib/api";
import type { StreamPayload } from "@/lib/contracts";

interface UseEventStreamOptions {
  onMessage?: (payload: StreamPayload) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useEventStream({
  onMessage,
  onConnectionChange,
}: UseEventStreamOptions): void {
  useEffect(() => {
    const source = new EventSource(buildStreamUrl("/events/stream"));

    source.onopen = () => {
      onConnectionChange?.(true);
    };

    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as StreamPayload;
      onMessage?.(payload);
    };

    source.onerror = () => {
      onConnectionChange?.(false);
    };

    return () => {
      onConnectionChange?.(false);
      source.close();
    };
  }, [onConnectionChange, onMessage]);
}
