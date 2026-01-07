import {
  Calendar,
  ClipboardCheck,
  FileText,
  Link as LinkIcon,
  Mail,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "Role-Based Workflow",
    description:
      "Hosts, Guests, and Editors each see exactly what they need — nothing more, nothing less.",
  },
  {
    icon: ClipboardCheck,
    title: "Guided Intake",
    description:
      "Guests complete a simple intake with bio, headshot, topics, and links. Auto-generates a press kit.",
  },
  {
    icon: Calendar,
    title: "Self-Serve Scheduling",
    description:
      "Guests book recording times and reschedule within your limits. No back-and-forth emails.",
  },
  {
    icon: FileText,
    title: "File Handoff",
    description:
      "Editors upload file references and update delivery dates. Links only — no large file storage.",
  },
  {
    icon: Mail,
    title: "Calm Notifications",
    description:
      "Email alerts only when action is needed. No noisy dashboards or constant pings.",
  },
  {
    icon: LinkIcon,
    title: "External Storage Ready",
    description:
      "Connect your Google Drive for file references. We store links and metadata only.",
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-card py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            Everything you need, nothing you don't
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            An opinionated workflow that handles the logistics so you can focus
            on creating.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-border bg-background transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <feature.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
