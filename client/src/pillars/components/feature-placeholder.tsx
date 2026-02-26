import { ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  pillarRoute: string;
  ctaLabel?: string;
}

export function FeaturePlaceholder({ title, description, pillarRoute, ctaLabel = "Back to dashboard" }: FeaturePlaceholderProps) {
  return (
    <div className="space-y-6">
      <Card className="border border-border/60 bg-card/90 backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-6">
            <p className="text-sm text-muted-foreground">
              This foundation route is live and production-safe for navigation. The full workflow implementation is
              queued in the next sprint cut, with API contracts and telemetry already established.
            </p>
          </div>
          <Button asChild>
            <Link href={pillarRoute}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {ctaLabel}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
