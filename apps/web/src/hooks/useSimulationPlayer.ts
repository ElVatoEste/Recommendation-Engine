import { useEffect, useMemo, useState } from "react";

import type { SimulationStep } from "@/lib/simulation";

export function useSimulationPlayer(steps: SimulationStep[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setPlaying(false);
  }, [steps.length]);

  useEffect(() => {
    if (!playing || steps.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((previous) => {
        if (previous >= steps.length - 1) {
          setPlaying(false);
          return previous;
        }

        return previous + 1;
      });
    }, 1800);

    return () => window.clearInterval(timer);
  }, [playing, steps.length]);

  const currentStep = useMemo(
    () => steps[Math.min(currentIndex, Math.max(steps.length - 1, 0))],
    [currentIndex, steps],
  );

  return {
    currentIndex,
    currentStep,
    playing,
    setCurrentIndex,
    setPlaying,
    next: () => setCurrentIndex((value) => Math.min(value + 1, steps.length - 1)),
    previous: () => setCurrentIndex((value) => Math.max(value - 1, 0)),
    reset: () => {
      setCurrentIndex(0);
      setPlaying(false);
    },
  };
}
