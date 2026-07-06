import { create } from "zustand";

import type { EngineSnapshot, RecommendationEvent } from "@/lib/contracts";

interface ObservatoryState {
  selectedProductId: string;
  selectedCustomerId: string;
  latestEvent?: RecommendationEvent;
  liveSnapshot?: EngineSnapshot;
  streamConnected: boolean;
  setSelectedProductId: (productId: string) => void;
  setSelectedCustomerId: (customerId: string) => void;
  setLatestEvent: (event?: RecommendationEvent) => void;
  setLiveSnapshot: (snapshot?: EngineSnapshot) => void;
  setStreamConnected: (connected: boolean) => void;
}

export const useObservatoryStore = create<ObservatoryState>((set) => ({
  selectedProductId: "bread",
  selectedCustomerId: "customer-1",
  latestEvent: undefined,
  liveSnapshot: undefined,
  streamConnected: false,
  setSelectedProductId: (selectedProductId) => set({ selectedProductId }),
  setSelectedCustomerId: (selectedCustomerId) => set({ selectedCustomerId }),
  setLatestEvent: (latestEvent) => set({ latestEvent }),
  setLiveSnapshot: (liveSnapshot) => set({ liveSnapshot }),
  setStreamConnected: (streamConnected) => set({ streamConnected }),
}));
