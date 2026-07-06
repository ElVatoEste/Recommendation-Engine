import { useCallback } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { useEventStream } from "@/hooks/useEventStream";
import type { StreamPayload } from "@/lib/contracts";
import Explorer from "@/pages/Explorer";
import Laboratory from "@/pages/Laboratory";
import Sandbox from "@/pages/Sandbox";
import { useObservatoryStore } from "@/store/observatoryStore";

function ObservatoryRuntime() {
  const setLatestEvent = useObservatoryStore((state) => state.setLatestEvent);
  const setLiveSnapshot = useObservatoryStore((state) => state.setLiveSnapshot);
  const setStreamConnected = useObservatoryStore(
    (state) => state.setStreamConnected,
  );
  const bumpRevision = useObservatoryStore((state) => state.bumpRevision);

  const handleMessage = useCallback(
    (payload: StreamPayload) => {
      setLatestEvent(payload.event);
      setLiveSnapshot(payload.snapshot);
      bumpRevision();
    },
    [setLatestEvent, setLiveSnapshot, bumpRevision],
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
        <Route path="/" element={<Sandbox />} />
        <Route path="/explorador" element={<Explorer />} />
        <Route path="/laboratorio" element={<Laboratory />} />
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
