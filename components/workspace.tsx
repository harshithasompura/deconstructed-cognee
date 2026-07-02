"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AskPanel } from "@/components/ask-panel";
import { ChainView } from "@/components/chain-view";
import { Timeline } from "@/components/timeline";
import { NODE_STYLE } from "@/lib/node-style";
import { getProduct, PRODUCTS } from "@/lib/products";
import type { GraphData, GraphNode } from "@/types/graph";

const GraphCanvas = dynamic(() => import("@/components/graph-canvas"), {
  ssr: false,
});

type GraphState =
  | { status: "loading" | "unconfigured" | "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; data: GraphData };

type View = "graph" | "timeline" | "chain";

export function Workspace() {
  const [productId, setProductId] = useState(() => {
    if (typeof window !== "undefined") {
      const fromUrl = new URLSearchParams(window.location.search).get("product");
      if (fromUrl && getProduct(fromUrl)) return fromUrl;
    }
    return PRODUCTS[0].id;
  });
  const [view, setView] = useState<View>("graph");
  const [graph, setGraph] = useState<GraphState>({ status: "loading" });
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const product = getProduct(productId) ?? PRODUCTS[0];
  const data = graph.status === "ready" ? graph.data : null;

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("product", productId);
    window.history.replaceState(null, "", url);

    let cancelled = false;
    setGraph({ status: "loading" });
    setSelected(null);
    fetch(`/api/graph?product=${productId}`)
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (res.status === 503) setGraph({ status: "unconfigured" });
        else if (!res.ok)
          setGraph({ status: "error", message: String(body.error ?? res.status) });
        else if (body.nodes.length === 0) setGraph({ status: "empty" });
        else setGraph({ status: "ready", data: body });
      })
      .catch((err) => {
        if (!cancelled) setGraph({ status: "error", message: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [productId, reloadKey]);

  const selectNodeById = (id: string | null) =>
    setSelected(id ? (data?.nodes.find((n) => n.id === id) ?? null) : null);

  const typeCounts = new Map<string, number>();
  for (const node of data?.nodes ?? []) {
    typeCounts.set(node.type, (typeCounts.get(node.type) ?? 0) + 1);
  }

  // All four variants written out — Tailwind JIT needs static class strings
  const gridCols =
    leftOpen && rightOpen
      ? "lg:grid-cols-[280px_minmax(0,1fr)_360px]"
      : leftOpen
        ? "lg:grid-cols-[280px_minmax(0,1fr)]"
        : rightOpen
          ? "lg:grid-cols-[minmax(0,1fr)_360px]"
          : "lg:grid-cols-[minmax(0,1fr)]";

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-y-auto lg:grid lg:overflow-visible ${gridCols}`}
    >
      {/* Product rail */}
      {leftOpen && (
      <aside className="flex flex-col gap-7 border-b border-border bg-surface p-5 lg:border-b-0 lg:border-r lg:overflow-y-auto">
        <section aria-label="Product">
          <h2 className="annotation mb-3 text-muted-foreground">Product</h2>
          <div className="flex gap-2 lg:flex-col">
            {PRODUCTS.map((p) => {
              const active = p.id === productId;
              return (
                <button
                  key={p.id}
                  onClick={() => setProductId(p.id)}
                  aria-pressed={active}
                  className={`flex-1 border-l-2 px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary lg:flex-none ${
                    active
                      ? "border-primary bg-card"
                      : "border-transparent hover:border-border hover:bg-card/60"
                  }`}
                >
                  <span className="block text-sm font-semibold">{p.name}</span>
                  <span className="annotation block text-muted-foreground">
                    {p.repo}
                  </span>
                  <span className="mt-1 hidden text-xs text-foreground/70 lg:block">
                    {p.tagline}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Node types" className="hidden lg:block">
          <h2 className="annotation mb-3 text-muted-foreground">Node types</h2>
          <ul className="flex flex-col gap-1.5">
            {Object.entries(NODE_STYLE).map(([type, style]) => {
              const count = typeCounts.get(type) ?? 0;
              return (
                <li
                  key={type}
                  className={`annotation flex items-center gap-2 ${
                    data && count === 0 ? "opacity-35" : ""
                  }`}
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: style.color }}
                  />
                  <span className="flex-1 text-foreground">{style.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {data ? count : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="Selection" className="hidden lg:block">
          <h2 className="annotation mb-3 text-muted-foreground">Selection</h2>
          {selected ? (
            <div className="border-l-2 border-primary bg-card px-3 py-2.5">
              <p className="annotation flex items-center gap-2 text-muted-foreground">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: NODE_STYLE[selected.type].color }}
                />
                {NODE_STYLE[selected.type].label}
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug">
                {selected.label}
              </p>
              <dl className="mt-2 flex flex-col gap-1">
                {Object.entries(selected.metadata)
                  .filter(([k, v]) => typeof v !== "object" && !/^(id|name|label)$/.test(k))
                  .slice(0, 6)
                  .map(([k, v]) => (
                    <div key={k} className="annotation flex gap-2">
                      <dt className="shrink-0 text-muted-foreground">{k}</dt>
                      <dd className="truncate text-foreground">{String(v)}</dd>
                    </div>
                  ))}
              </dl>
              {typeof selected.metadata.html_url === "string" ||
              typeof selected.metadata.url === "string" ? (
                <a
                  href={String(selected.metadata.html_url ?? selected.metadata.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="annotation mt-2 inline-block text-primary hover:underline"
                >
                  View on GitHub ↗
                </a>
              ) : null}
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Click a node in the graph or timeline to inspect it here.
            </p>
          )}
        </section>
      </aside>
      )}

      {/* Canvas */}
      <main className="flex min-h-[480px] flex-1 flex-col lg:min-h-0">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLeftOpen((v) => !v)}
              aria-expanded={leftOpen}
              title="Toggle product rail"
              className={`annotation transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                leftOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ◧
            </button>
            <div role="tablist" aria-label="View" className="flex gap-1">
              {(["graph", "timeline", "chain"] as View[]).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`annotation px-2.5 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                    view === v
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="annotation text-muted-foreground tabular-nums">
              {data
                ? `${data.nodes.length} nodes / ${data.edges.length} edges`
                : "memory offline"}
            </p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              disabled={graph.status === "loading"}
              aria-label="Refresh graph"
              title="Refresh graph"
              className="annotation text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary"
            >
              ↻
            </button>
            <button
              onClick={() => setRightOpen((v) => !v)}
              aria-expanded={rightOpen}
              title="Toggle ask panel"
              className={`annotation transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                rightOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ◨
            </button>
          </div>
        </div>

        <div className="dot-grid relative flex-1">
          {graph.status === "loading" && (
            <CanvasNote title="Loading memory">
              <p>Fetching knowledge graph for {product.name}…</p>
            </CanvasNote>
          )}
          {graph.status === "unconfigured" && (
            <CanvasNote title="Memory not connected">
              <ol className="flex list-none flex-col gap-1">
                <li>01&ensp;cp .env.example .env → add COGNEE_API_KEY</li>
                <li>02&ensp;npx tsx scripts/validate-cognee.ts</li>
                <li>03&ensp;npm run ingest</li>
              </ol>
              <p className="mt-2 text-muted-foreground">
                Then reload. The graph builds from live data only — nothing here
                is mocked.
              </p>
            </CanvasNote>
          )}
          {graph.status === "empty" && (
            <CanvasNote title={`No memory for ${product.name}`}>
              <p>npm run ingest -- {product.id}</p>
            </CanvasNote>
          )}
          {graph.status === "error" && (
            <CanvasNote title="Memory unreachable">
              <p className="text-muted-foreground">{graph.message}</p>
            </CanvasNote>
          )}
          {data && view === "graph" && (
            <GraphCanvas
              data={data}
              selectedId={selected?.id ?? null}
              onSelect={selectNodeById}
            />
          )}
          {data && view === "timeline" && (
            <Timeline
              data={data}
              selectedId={selected?.id ?? null}
              onSelect={selectNodeById}
            />
          )}
          {data && view === "chain" && (
            <ChainView
              data={data}
              selectedId={selected?.id ?? null}
              onSelect={selectNodeById}
            />
          )}
        </div>
      </main>

      {/* Ask rail */}
      {rightOpen && (
        <aside className="border-t border-border bg-surface p-5 lg:overflow-y-auto lg:border-l lg:border-t-0">
          <AskPanel product={product} />
        </aside>
      )}
    </div>
  );
}

function CanvasNote({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute left-6 top-6 max-w-sm border-l-2 border-primary bg-background/95 py-3 pl-4 pr-5">
      <h3 className="annotation font-semibold">{title}</h3>
      <div className="annotation mt-2 normal-case tracking-normal text-foreground">
        {children}
      </div>
    </div>
  );
}
