import { StatusBadge, CollaborationStatus } from "@/components/ui/status-badge";

const workflowSteps: { status: CollaborationStatus; description: string }[] = [
  {
    status: "invited",
    description: "Host creates collaboration, guest receives invite link",
  },
  {
    status: "intake_completed",
    description: "Guest submits bio, headshot, topics, and links",
  },
  {
    status: "scheduled",
    description: "Guest books recording time via self-serve scheduling",
  },
  {
    status: "recorded",
    description: "Host marks as recorded after the session",
  },
  {
    status: "editing",
    description: "Editor uploads files and sets delivery date",
  },
  {
    status: "ready",
    description: "Content is ready for posting",
  },
  {
    status: "completed",
    description: "All clips posted, collaboration archived",
  },
];

export function WorkflowSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            A locked workflow that just works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every collaboration follows the same proven path. No configuration
            needed.
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-3xl">
          {/* Vertical Line */}
          <div className="absolute left-4 top-0 h-full w-0.5 bg-border md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-8">
            {workflowSteps.map((step, index) => (
              <div
                key={step.status}
                className={`relative flex items-start gap-6 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Dot */}
                <div className="absolute left-4 z-10 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border-2 border-primary bg-background md:left-1/2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>

                {/* Content */}
                <div
                  className={`ml-10 flex-1 rounded-lg border border-border bg-card p-4 shadow-sm md:ml-0 ${
                    index % 2 === 0 ? "md:mr-[calc(50%+1rem)]" : "md:ml-[calc(50%+1rem)]"
                  }`}
                >
                  <StatusBadge status={step.status} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
