"use client";

import Graph from "graphology";
import { useEffect, useRef } from "react";
import Sigma from "sigma";
import { EDGE_COLOR, EDGE_COLOR_ACTIVE, NODE_STYLE } from "@/lib/node-style";
import type { GraphData } from "@/types/graph";

const DIMMED = "#E4E4E4";

export default function GraphCanvas({
  data,
  selectedId,
  onSelect,
}: {
  data: GraphData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  // refs so hover/selection changes don't tear down the renderer
  const focusRef = useRef<{ hovered: string | null; selected: string | null }>({
    hovered: null,
    selected: selectedId,
  });
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const graph = new Graph({ multi: true });
    const degree = new Map<string, number>();
    for (const edge of data.edges) {
      degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
      degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
    }
    for (const node of data.nodes) {
      graph.addNode(node.id, {
        x: node.x,
        y: node.y,
        size: 4 + Math.min(9, Math.sqrt(degree.get(node.id) ?? 0) * 2),
        label: node.label,
        color: NODE_STYLE[node.type].color,
      });
    }
    for (const edge of data.edges) {
      if (graph.hasNode(edge.from) && graph.hasNode(edge.to)) {
        graph.addEdge(edge.from, edge.to, { color: EDGE_COLOR, size: 1 });
      }
    }

    const sigma = new Sigma(graph, container, {
      labelFont: "IBM Plex Mono, monospace",
      labelSize: 11,
      labelColor: { color: "#111111" },
      labelRenderedSizeThreshold: 6,
    });

    const focused = () => focusRef.current.hovered ?? focusRef.current.selected;

    // ponytail: neighbors() per render is O(degree); fine below ~1k nodes
    sigma.setSetting("nodeReducer", (node, attrs) => {
      const focus = focused();
      if (!focus || node === focus || graph.areNeighbors(focus, node)) {
        return attrs;
      }
      return { ...attrs, color: DIMMED, label: null };
    });
    sigma.setSetting("edgeReducer", (edge, attrs) => {
      const focus = focused();
      if (!focus) return attrs;
      return graph.extremities(edge).includes(focus)
        ? { ...attrs, color: EDGE_COLOR_ACTIVE, size: 1.5 }
        : { ...attrs, color: "#F0F0F0" };
    });

    sigma.on("clickNode", ({ node }) => onSelectRef.current(node));
    sigma.on("clickStage", () => onSelectRef.current(null));
    sigma.on("enterNode", ({ node }) => {
      focusRef.current.hovered = node;
      container.style.cursor = "pointer";
      sigma.refresh({ skipIndexation: true });
    });
    sigma.on("leaveNode", () => {
      focusRef.current.hovered = null;
      container.style.cursor = "default";
      sigma.refresh({ skipIndexation: true });
    });

    sigmaRef.current = sigma;
    return () => {
      sigma.kill();
      sigmaRef.current = null;
    };
  }, [data]);

  useEffect(() => {
    focusRef.current.selected = selectedId;
    sigmaRef.current?.refresh({ skipIndexation: true });
  }, [selectedId]);

  // Canvas nodes aren't keyboard-reachable; the timeline and chain tabs are
  // the accessible, button-per-node equivalents over the same data.
  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Knowledge graph of connected artifacts. Use the timeline or chain tabs for a keyboard-navigable view of the same data."
      className="absolute inset-0"
    />
  );
}
