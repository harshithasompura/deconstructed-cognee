import { Workspace } from "@/components/workspace";
import { PRODUCTS } from "@/lib/products";

function Wordmark() {
  const dot = <span className="text-primary">·</span>;
  return (
    <span className="annotation text-[0.8125rem] font-semibold text-foreground">
      DE{dot}CON{dot}STRUCT{dot}ED
    </span>
  );
}

export default function Home() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-5">
        <Wordmark />
        <p className="annotation hidden text-muted-foreground sm:block">
          Understand product evolution, reconstructed from GitHub artifacts
        </p>
      </header>

      <Workspace />

      <footer className="flex shrink-0 flex-col gap-1 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="annotation text-muted-foreground">
          Built on public GitHub artifacts from{" "}
          {PRODUCTS.map((p, i) => (
            <span key={p.id}>
              {i > 0 && " and "}
              <a
                href={`https://github.com/${p.repo}`}
                className="text-foreground underline decoration-border underline-offset-2 hover:decoration-primary"
              >
                {p.repo}
              </a>
            </span>
          ))}{" "}
        </p>
        <p className="annotation text-muted-foreground">
          Powered by{" "}
          <a
            href="https://www.cognee.ai"
            aria-label="Cognee"
            className="inline-flex items-center align-middle opacity-80 hover:opacity-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static footer mark, no next/image needed */}
            <img src="/cognee-logo-black.svg" alt="Cognee" className="h-6 w-auto dark:invert" />
          </a>
        </p>
      </footer>
    </div>
  );
}
