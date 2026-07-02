"use client";

import { NODE_STYLE } from "@/lib/node-style";
import type { GraphData, GraphNode } from "@/types/graph";

// graph_model date fields (lib/graph-schema.ts) — real node properties,
// creation-ish first so an artifact sorts by when it appeared.
const DATE_KEYS = [
  "raised_on",
  "created_on",
  "started_on",
  "published_on",
  "merged_on",
  "closed_on",
];

function nodeDate(node: GraphNode): string | null {
  for (const key of DATE_KEYS) {
    const value = node.metadata[key];
    if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
      return value.slice(0, 10);
    }
  }
  return null;
}

export function Timeline({
  data,
  selectedId,
  onSelect,
}: {
  data: GraphData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const dated = data.nodes
    .map((node) => ({ node, date: nodeDate(node) }))
    .filter((item): item is { node: GraphNode; date: string } => item.date !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  const undatedCount = data.nodes.length - dated.length;

  let lastMonth = "";

  return (
    <div className="absolute inset-0 overflow-y-auto bg-background/60">
      <ol className="mx-auto flex max-w-2xl flex-col px-6 py-6 lg:mx-0 lg:ml-10">
        {dated.map(({ node, date }) => {
          const month = date.slice(0, 7);
          const header = month !== lastMonth;
          lastMonth = month;
          const style = NODE_STYLE[node.type];
          const active = node.id === selectedId;
          return (
            <li key={node.id} className="flex flex-col">
              {header && (
                <h3 className="annotation mt-5 border-b border-border pb-1 text-muted-foreground first:mt-0">
                  {month}
                </h3>
              )}
              <button
                onClick={() => onSelect(active ? null : node.id)}
                aria-pressed={active}
                className={`flex items-baseline gap-3 border-l-2 py-1.5 pl-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                  active
                    ? "border-primary bg-card"
                    : "border-transparent hover:border-border hover:bg-card/60"
                }`}
              >
                <span className="annotation w-20 shrink-0 text-muted-foreground tabular-nums">
                  {date}
                </span>
                <span
                  aria-hidden
                  className="size-2 shrink-0 translate-y-[-1px] self-center rounded-full"
                  style={{ background: style.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{node.label}</span>
                <span className="annotation hidden shrink-0 text-muted-foreground sm:block">
                  {style.label}
                </span>
              </button>
            </li>
          );
        })}
        {undatedCount > 0 && (
          <li className="annotation mt-5 text-muted-foreground">
            {undatedCount} artifact{undatedCount === 1 ? "" : "s"} carry no date
            and appear only in the graph.
          </li>
        )}
        {dated.length === 0 && (
          <li className="annotation text-muted-foreground">
            No dated artifacts in memory yet — the graph view shows everything.
          </li>
        )}
      </ol>
    </div>
  );
}
