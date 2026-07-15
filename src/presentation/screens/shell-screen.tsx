import { Button } from "@/presentation/components/ui/button";

const layers = [
  {
    name: "Presentation",
    description: "Pages, screens, forms, reusable UI components, and previews."
  },
  {
    name: "Application",
    description: "Future use cases, workflows, lifecycle actions, and coordination."
  },
  {
    name: "Domain",
    description: "Future pricing rules, calculations, validation, and historical integrity."
  },
  {
    name: "Infrastructure",
    description: "Future database, authentication, storage, PDF, and external integrations."
  }
];

export function ShellScreen() {
  return (
    <div className="max-w-4xl">
      <div className="rounded-lg border bg-background p-8">
        <p className="text-sm font-medium text-muted-foreground">Cotarion Platform</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-normal">Pricing & Proposals</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Sprint 1 establishes the project foundation, tooling, navigation framework, and layered
          architecture. No business functionality is implemented in this sprint.
        </p>
        <div className="mt-6">
          <Button type="button" variant="outline">
            Foundation only
          </Button>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {layers.map((layer) => (
          <article className="rounded-lg border bg-background p-5" key={layer.name}>
            <h3 className="text-lg font-semibold">{layer.name} Layer</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{layer.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
