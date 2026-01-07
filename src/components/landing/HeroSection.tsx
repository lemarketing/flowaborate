import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const benefits = [
  "No billing or paywalls",
  "Guests never pay",
  "Email notifications only",
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-16">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBg}
          alt=""
          className="h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      <div className="container relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
          Free forever — no credit card required
        </div>

        <h1 className="mt-8 max-w-4xl font-serif text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
          The calm way to manage{" "}
          <span className="text-primary">collaborative content</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          Flowaborate handles the logistics of scheduling, intake, and
          follow-through — so you can focus on creating great content together.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link to="/auth?mode=signup">
              Start for Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/how-it-works">See How It Works</Link>
          </Button>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
          {benefits.map((benefit) => (
            <div
              key={benefit}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {benefit}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
