"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type View = {
  id: string;
  label: string;
  caption: string;
  src: string;
};

// The three ways the app reads one dataset. Screenshots are the real UI.
const VIEWS: View[] = [
  {
    id: "graph",
    label: "Graph",
    caption:
      "A force-directed map of every typed entity and edge. Filter by node type, click a node to trace its connections.",
    src: "/screenshots/graph.png",
  },
  {
    id: "timeline",
    label: "Timeline",
    caption:
      "Every artifact sorted in time. Watch a feature take shape across issues, pull requests and releases.",
    src: "/screenshots/timeline.png",
  },
  {
    id: "chain",
    label: "Decision chain",
    caption:
      "Walk the evolution spine of any node: the problem that raised it, the feature it concerns, the PR that implemented it, the release that shipped it.",
    src: "/screenshots/chain.png",
  },
];

export function LandingShowcase() {
  const [active, setActive] = useState(VIEWS[0].id);
  const current = VIEWS.find((v) => v.id === active) ?? VIEWS[0];

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Explore the dataset three ways" className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={active === v.id}
            aria-controls="showcase-preview"
            onClick={() => setActive(v.id)}
            className={cn(
              "annotation cursor-pointer rounded-lg border px-3 py-1.5 transition-colors",
              active === v.id
                ? "border-primary bg-accent text-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div
        id="showcase-preview"
        role="tabpanel"
        className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        {VIEWS.map((v) => (
          <Image
            key={v.id}
            src={v.src}
            alt={`${v.label} view of the knowledge graph`}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            priority={v.id === VIEWS[0].id}
            className={cn(
              "object-cover object-top transition-opacity duration-300",
              active === v.id ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{current.caption}</p>
        <Link
          href="/app"
          className="annotation inline-flex shrink-0 items-center gap-1 text-primary hover:underline"
        >
          Open in the workspace
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
