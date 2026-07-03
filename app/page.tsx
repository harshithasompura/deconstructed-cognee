import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingShowcase } from "@/components/landing-showcase";
import { PRODUCTS } from "@/lib/products";

const REPO_URL = "https://github.com/harshithasompura/deconstructed-cognee";
const AUTHOR_URL = "https://github.com/harshithasompura";

function Wordmark() {
  const dot = <span className="text-primary">·</span>;
  return (
    <span className="annotation text-sm font-semibold text-foreground">
      DE{dot}CON{dot}STRUCT{dot}ED
    </span>
  );
}

export default function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-16 sm:py-20">
      <section className="flex flex-col gap-6">
        <a
          href="https://www.wemakedevs.org/"
          className="inline-flex items-center gap-2 self-start opacity-90 hover:opacity-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static hackathon mark */}
          <img src="/wemakedevs-logo.svg" alt="WeMakeDevs" className="h-6 w-auto" />
          <span className="annotation text-muted-foreground">Built for the WeMakeDevs x Cognee hackathon</span>
        </a>

        <Wordmark />

        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Reconstruct how a product evolved,
          <br className="hidden sm:block" /> from its public artifacts.
        </h1>

        <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
          Deconstructed turns a product&apos;s GitHub history (issues,
          discussions, pull requests, releases) into a typed knowledge graph in{" "}
          <a
            href="https://www.cognee.ai"
            className="text-foreground underline decoration-border underline-offset-2 hover:decoration-primary"
          >
            Cognee Cloud
          </a>
          , then reconstructs the decision chain behind any part of it: the
          problem that raised it, the feature it concerns, the pull request that
          implemented it, the release that shipped it.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/app">
              Enter the workspace
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={REPO_URL}>
              <GitBranch data-icon="inline-start" />
              View on GitHub
            </a>
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <p className="annotation text-muted-foreground">Dataset, explored three ways</p>
        <LandingShowcase />
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <p className="annotation text-muted-foreground">Ask a question, get a reconstructed answer</p>
        <ul className="flex flex-col gap-2">
          {PRODUCTS[0].questions.map((q) => (
            <li
              key={q}
              className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground"
            >
              {q}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Answered with Cognee&apos;s{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[0.8125rem]">GRAPH_COMPLETION</code>{" "}
          over the connected artifacts, not a single document.
        </p>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-8">
        <p className="annotation text-muted-foreground">
          Three products, one ontology, no per-product code
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {PRODUCTS.map((p) => (
            <a
              key={p.id}
              href={`https://github.com/${p.repo}`}
              className="text-sm text-foreground underline decoration-border underline-offset-2 hover:decoration-primary"
            >
              {p.name}
            </a>
          ))}
        </div>
      </section>

      <footer className="annotation border-t border-border pt-8 text-muted-foreground">
        Built by{" "}
        <a
          href={AUTHOR_URL}
          className="text-foreground underline decoration-border underline-offset-2 hover:decoration-primary"
        >
          Harshitha Sompura
        </a>
        {" · "}
        Powered by{" "}
        <a
          href="https://www.cognee.ai"
          className="text-foreground underline decoration-border underline-offset-2 hover:decoration-primary"
        >
          Cognee Cloud
        </a>
      </footer>
    </main>
  );
}
