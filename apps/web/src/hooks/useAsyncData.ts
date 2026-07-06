import { useEffect, useState } from "react";

interface UseAsyncDataState<T> {
  data?: T;
  loading: boolean;
  error?: string;
}

export function useAsyncData<T>(
  loader: () => Promise<T>,
  dependencies: readonly unknown[],
): UseAsyncDataState<T> {
  const [state, setState] = useState<UseAsyncDataState<T>>({
    data: undefined,
    loading: true,
    error: undefined,
  });

  useEffect(() => {
    let cancelled = false;

    setState((current) => ({
      data: current.data,
      loading: true,
      error: undefined,
    }));

    loader()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setState({
          data,
          loading: false,
          error: undefined,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setState({
          data: undefined,
          loading: false,
          error: error instanceof Error ? error.message : "Error desconocido.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return state;
}
