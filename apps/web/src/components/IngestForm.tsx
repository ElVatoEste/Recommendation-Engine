import { useRef, useState } from "react";

import { Button, Field, Panel, Segmented } from "@/components/ui";
import { observatoryApi } from "@/lib/api";
import { useObservatoryStore } from "@/store/observatoryStore";

interface ItemRow {
  productId: string;
  quantity: string;
  unitPrice: string;
}

const emptyRow = (): ItemRow => ({ productId: "", quantity: "1", unitPrice: "" });

// A compact, structured seed so co-purchase clusters emerge immediately.
const SEED_PRICES: Record<string, number> = {
  bread: 2.5, milk: 1.8, butter: 4.1, cheese: 5.3, eggs: 3.2,
  coffee: 7.5, sugar: 1.2, ham: 4.8, tomato: 0.9, pasta: 1.6,
};
const SEED_ORDERS: Array<[string, ...string[]]> = [
  ["c-1", "bread", "milk", "eggs"], ["c-2", "bread", "milk"],
  ["c-3", "bread", "milk", "butter"], ["c-4", "bread", "butter"],
  ["c-5", "bread", "milk", "cheese"], ["c-6", "coffee", "sugar"],
  ["c-7", "coffee", "sugar", "milk"], ["c-8", "coffee", "milk"],
  ["c-9", "pasta", "tomato", "cheese"], ["c-10", "pasta", "tomato"],
  ["c-11", "bread", "milk", "ham"], ["c-12", "bread", "eggs", "milk"],
];

type Status = { kind: "idle" | "ok" | "error"; message?: string };

export function IngestForm() {
  const setLiveSnapshot = useObservatoryStore((s) => s.setLiveSnapshot);
  const bumpRevision = useObservatoryStore((s) => s.bumpRevision);
  const setSelectedCustomerId = useObservatoryStore((s) => s.setSelectedCustomerId);
  const orderSeq = useRef(1);

  const [mode, setMode] = useState<"purchase" | "feedback">("purchase");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Purchase state
  const [customerId, setCustomerId] = useState("c-1");
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);

  // Feedback state
  const [source, setSource] = useState("bread");
  const [target, setTarget] = useState("milk");
  const [accepted, setAccepted] = useState(true);

  function afterMutate(snapshot: Parameters<typeof setLiveSnapshot>[0], message: string) {
    setLiveSnapshot(snapshot);
    bumpRevision();
    setStatus({ kind: "ok", message });
  }

  async function submitPurchase() {
    const items = rows
      .filter((row) => row.productId.trim())
      .map((row) => ({
        productId: row.productId.trim(),
        quantity: Math.max(Number(row.quantity) || 1, 1),
        unitPrice: row.unitPrice ? Number(row.unitPrice) : undefined,
      }));
    if (!customerId.trim() || items.length === 0) {
      setStatus({ kind: "error", message: "Need a customer and at least one item." });
      return;
    }
    setBusy(true);
    try {
      const result = await observatoryApi.ingestPurchase({
        orderId: `ui-${Date.now()}-${orderSeq.current++}`,
        customerId: customerId.trim(),
        items,
      });
      setSelectedCustomerId(customerId.trim());
      afterMutate(result.snapshot, `Order ingested for ${customerId.trim()}.`);
      setRows([emptyRow()]);
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback() {
    if (!target.trim()) {
      setStatus({ kind: "error", message: "Recommendation product is required." });
      return;
    }
    setBusy(true);
    try {
      const result = await observatoryApi.sendFeedback({
        type: accepted ? "RecommendationAccepted" : "RecommendationIgnored",
        sourceProductId: source.trim() || undefined,
        recommendationProductId: target.trim(),
      });
      afterMutate(result.snapshot, `Feedback recorded: ${accepted ? "accepted" : "ignored"}.`);
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function seed() {
    setBusy(true);
    try {
      const events = SEED_ORDERS.map(([cust, ...ids], index) => ({
        type: "PurchaseCreated",
        orderId: `seed-${Date.now()}-${index}`,
        customerId: cust,
        items: ids.map((productId) => ({
          productId,
          quantity: 1,
          unitPrice: SEED_PRICES[productId] ?? 1,
        })),
      }));
      const result = await observatoryApi.ingestBatch(events);
      afterMutate(result.snapshot, `Seeded ${result.accepted} orders.`);
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Feed the engine"
      hint="Ingest events and watch every ranking react."
      actions={
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as typeof mode)}
          options={[
            { value: "purchase", label: "Purchase" },
            { value: "feedback", label: "Feedback" },
          ]}
        />
      }
    >
      {mode === "purchase" ? (
        <div className="flex flex-col gap-3">
          <Field
            label="Customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="c-1"
          />
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
              Items
            </span>
            {rows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={row.productId}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, productId: e.target.value } : r)),
                    )
                  }
                  placeholder="product"
                  className="min-w-0 flex-1 rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none hover:border-line-strong focus-visible:border-accent"
                />
                <input
                  value={row.quantity}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, quantity: e.target.value } : r)),
                    )
                  }
                  inputMode="numeric"
                  placeholder="qty"
                  className="tnum w-16 rounded-md border border-line bg-panel-2 px-2 py-2 text-sm text-white placeholder:text-neutral-600 outline-none hover:border-line-strong focus-visible:border-accent"
                />
                <input
                  value={row.unitPrice}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, unitPrice: e.target.value } : r)),
                    )
                  }
                  inputMode="decimal"
                  placeholder="price"
                  className="tnum w-20 rounded-md border border-line bg-panel-2 px-2 py-2 text-sm text-white placeholder:text-neutral-600 outline-none hover:border-line-strong focus-visible:border-accent"
                />
                <button
                  type="button"
                  onClick={() =>
                    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
                  }
                  disabled={rows.length <= 1}
                  aria-label="Remove item"
                  className="rounded-md px-2 py-2 text-neutral-500 transition-colors hover:text-neutral-200 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
              className="self-start text-xs text-accent hover:underline"
            >
              + add item
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button onClick={submitPurchase} disabled={busy}>
              Ingest order
            </Button>
            <Button variant="ghost" onClick={seed} disabled={busy}>
              Seed sample
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Source product"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="bread"
            />
            <Field
              label="Recommended"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="milk"
            />
          </div>
          <Segmented
            value={accepted ? "accepted" : "ignored"}
            onChange={(v) => setAccepted(v === "accepted")}
            options={[
              { value: "accepted", label: "Accepted" },
              { value: "ignored", label: "Ignored" },
            ]}
          />
          <div className="pt-1">
            <Button onClick={submitFeedback} disabled={busy}>
              Record feedback
            </Button>
          </div>
        </div>
      )}

      {status.kind !== "idle" && (
        <p
          className={`mt-3 text-xs ${
            status.kind === "ok" ? "text-s-collab" : "text-s-trend"
          }`}
        >
          {status.message}
        </p>
      )}
    </Panel>
  );
}
