import { useCallback } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { useEventStream } from "@/hooks/useEventStream";
import type { StreamPayload } from "@/lib/contracts";
import Explorer from "@/pages/Explorer";
import Home from "@/pages/Home";
import Laboratory from "@/pages/Laboratory";
import { useObservatoryStore } from "@/store/observatoryStore";

function ObservatoryRuntime() {
  const setLatestEvent = useObservatoryStore((state) => state.setLatestEvent);
  const setLiveSnapshot = useObservatoryStore((state) => state.setLiveSnapshot);
  const setStreamConnected = useObservatoryStore(
    (state) => state.setStreamConnected,
  );

  const handleMessage = useCallback(
    (payload: StreamPayload) => {
      setLatestEvent(payload.event);
      setLiveSnapshot(payload.snapshot);
    },
    [setLatestEvent, setLiveSnapshot],
  );

  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      setStreamConnected(connected);
    },
    [setStreamConnected],
  );

  useEventStream({
    onMessage: handleMessage,
    onConnectionChange: handleConnectionChange,
  });

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/laboratorio" element={<Laboratory />} />
        <Route path="/explorador" element={<Explorer />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ObservatoryRuntime />
    </BrowserRouter>
  );
}
