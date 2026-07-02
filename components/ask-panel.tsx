"use client";

import { useEffect, useState } from "react";
import { Markdown } from "@/components/markdown";
import { CROSS_PRODUCT_QUESTION, type Product } from "@/lib/products";

type Scope = "product" | "all";
type AskState =
  | { status: "idle" | "loading" }
  | { status: "answered"; answer: string }
  | { status: "error"; message: string; unconfigured?: boolean };

export function AskPanel({ product }: { product: Product }) {
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState<Scope>("product");
  const [state, setState] = useState<AskState>({ status: "idle" });
  const [showChips, setShowChips] = useState(true);

  // different product, different questions — stale answers would lie
  useEffect(() => {
    setQuestion("");
    setScope("product");
    setState({ status: "idle" });
    setShowChips(true);
  }, [product.id]);

  async function ask(text: string, askScope: Scope) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: askScope === "all" ? "all" : product.id,
          question: trimmed,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setState({
          status: "error",
          message: String(body.error ?? res.status),
          unconfigured: res.status === 503,
        });
      } else {
        setState({ status: "answered", answer: body.answer });
        setShowChips(false); // answer is the payload — tuck suggestions away
      }
    } catch (err) {
      setState({ status: "error", message: String(err) });
    }
  }

  const chips: { text: string; scope: Scope }[] = [
    ...product.questions.map((text) => ({ text, scope: "product" as Scope })),
    { text: CROSS_PRODUCT_QUESTION, scope: "all" as Scope },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="annotation text-muted-foreground">Ask the memory</h2>
        <p className="mt-1 text-xs leading-relaxed text-foreground/70">
          Answers traverse the knowledge graph — issues, discussions, pull
          requests and releases connected — not a single document.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question, scope);
        }}
        className="flex flex-col gap-2"
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(question, scope);
            }
          }}
          rows={3}
          placeholder={`Why does a feature of ${product.name} exist?`}
          aria-label="Question"
          className="resize-none border border-border bg-card px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2">
          <div role="radiogroup" aria-label="Scope" className="flex gap-1">
            {(
              [
                ["product", product.name],
                ["all", "All products"],
              ] as [Scope, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={scope === value}
                onClick={() => setScope(value)}
                className={`annotation px-2 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                  scope === value
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={state.status === "loading" || !question.trim()}
            className="annotation bg-primary px-3.5 py-1.5 font-semibold text-primary-foreground transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {state.status === "loading" ? "Asking…" : "Ask"}
          </button>
        </div>
      </form>

      {state.status === "loading" && (
        <div className="border-l-2 border-border bg-card px-3 py-2.5">
          <p className="annotation text-muted-foreground">
            Traversing the graph…
          </p>
        </div>
      )}
      {state.status === "answered" && (
        <div className="flex min-h-0 flex-col border-l-2 border-primary bg-card px-3 py-2.5">
          <h3 className="annotation shrink-0 text-muted-foreground">Answer</h3>
          <div className="mt-1.5 max-h-[45vh] overflow-y-auto">
            <Markdown text={state.answer} />
          </div>
        </div>
      )}
      {state.status === "error" && (
        <div className="border-l-2 border-destructive bg-card px-3 py-2.5">
          <h3 className="annotation text-destructive">
            {state.unconfigured ? "Memory not connected" : "Ask failed"}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground/70">
            {state.unconfigured
              ? "Add COGNEE_API_KEY to .env, then validate and ingest. Steps are on the canvas."
              : state.message}
          </p>
        </div>
      )}

      <div>
        <button
          onClick={() => setShowChips((v) => !v)}
          aria-expanded={showChips}
          className="annotation mb-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          Try {showChips ? "▾" : "▸"}
        </button>
        {showChips && (
          <ul className="flex flex-col gap-1.5">
            {chips.map((chip) => (
              <li key={chip.text}>
                <button
                  onClick={() => {
                    setQuestion(chip.text);
                    setScope(chip.scope);
                    ask(chip.text, chip.scope);
                  }}
                  className="w-full border border-border bg-card px-3 py-2 text-left text-xs leading-relaxed transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {chip.text}
                  {chip.scope === "all" && (
                    <span className="annotation mt-1 block text-primary">
                      across all products
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
