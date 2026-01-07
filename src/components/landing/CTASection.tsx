import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="bg-primary py-24">
      <div className="container mx-auto px-4 text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-foreground md:text-4xl">
          Ready to simplify your collaborations?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
          Start managing your content collaborations with clarity. Free forever,
          no credit card required.
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="mt-8"
          asChild
        >
          <Link to="/auth?mode=signup">
            Create Your Workspace
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
