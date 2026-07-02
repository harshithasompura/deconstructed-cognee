"use client";

import { buildChain, nodeDateLabel, nodeUrl } from "@/lib/chain";
import { NODE_STYLE } from "@/lib/node-style";
import type { GraphData } from "@/types/graph";

export function ChainView({
  data,
  selectedId,
  onSelect,
}: {
  data: GraphData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { stages } = buildChain(selectedId, data);

  if (stages.length === 0) {
    return (
      <div className="absolute inset-0 grid place-items-center">
        <p className="annotation max-w-xs text-center text-muted-foreground">
          Select a node in the graph or timeline to reconstruct its decision
          chain — the connected evidence, from problem to shipped.
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto bg-background/60">
      <ol className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8 lg:mx-0 lg:ml-10">
        {stages.map((stage, si) => (
          <li key={stage.rank} className="relative flex flex-col">
            <h3 className="annotation mb-2 text-muted-foreground">
              {stage.heading}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {stage.nodes.map((node) => {
                const style = NODE_STYLE[node.type];
                const active = node.id === selectedId;
                const url = nodeUrl(node);
                const date = nodeDateLabel(node);
                return (
                  <li key={node.id}>
                    <div
                      className={`group flex items-baseline gap-3 border-l-2 py-1.5 pl-3 transition-colors ${
                        active
                          ? "border-primary bg-card"
                          : "border-transparent hover:border-border hover:bg-card/60"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="size-2 shrink-0 translate-y-[3px] rounded-full"
                        style={{ background: style.color }}
                      />
                      <button
                        onClick={() => onSelect(active ? null : node.id)}
                        aria-pressed={active}
                        className="min-w-0 flex-1 cursor-pointer text-left text-sm focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <span className="truncate">{node.label}</span>
                        {typeof node.metadata.title === "string" &&
                          node.metadata.title !== node.label && (
                            <span className="ml-2 text-muted-foreground">
                              {node.metadata.title}
                            </span>
                          )}
                      </button>
                      {date && (
                        <span className="annotation shrink-0 text-muted-foreground tabular-nums">
                          {date}
                        </span>
                      )}
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on GitHub"
                          className="annotation shrink-0 cursor-pointer text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary group-hover:opacity-100"
                        >
                          ↗
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {si < stages.length - 1 && (
              <span
                aria-hidden
                className="mt-3 ml-[3px] block h-4 w-px bg-border"
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
