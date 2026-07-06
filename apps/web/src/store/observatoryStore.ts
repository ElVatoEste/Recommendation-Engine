import { create } from "zustand";

import type { EngineSnapshot, RecommendationEvent } from "@/lib/contracts";

interface ObservatoryState {
  selectedProductId: string;
  selectedCustomerId: string;
  latestEvent?: RecommendationEvent;
  liveSnapshot?: EngineSnapshot;
  streamConnected: boolean;
  /** Bumps on every ingested event so queries can refetch against fresh state. */
  revision: number;
  setSelectedProductId: (productId: string) => void;
  setSelectedCustomerId: (customerId: string) => void;
  setLatestEvent: (event?: RecommendationEvent) => void;
  setLiveSnapshot: (snapshot?: EngineSnapshot) => void;
  setStreamConnected: (connected: boolean) => void;
  bumpRevision: () => void;
}

export const useObservatoryStore = create<ObservatoryState>((set) => ({
  selectedProductId: "bread",
  selectedCustomerId: "customer-1",
  latestEvent: undefined,
  liveSnapshot: undefined,
  streamConnected: false,
  revision: 0,
  setSelectedProductId: (selectedProductId) => set({ selectedProductId }),
  setSelectedCustomerId: (selectedCustomerId) => set({ selectedCustomerId }),
  setLatestEvent: (latestEvent) => set({ latestEvent }),
  setLiveSnapshot: (liveSnapshot) => set({ liveSnapshot }),
  setStreamConnected: (streamConnected) => set({ streamConnected }),
  bumpRevision: () => set((state) => ({ revision: state.revision + 1 })),
}));
