import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileCheck,
  Shield,
  Code,
  BarChart3,
  ArrowRight,
  Brain,
  Users
} from "lucide-react";
import tachyHealthLogo from "@assets/logo.svg";

interface PlatformModule {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
  borderColor: string;
  features: string[];
  comingSoon?: boolean;
}

const platformModules: PlatformModule[] = [
  {
    id: "audit-fwa",
    title: "Audit & FWA Detection",
    description: "Core module for claims analysis, scoring FWA probability, and flagging outliers",
    icon: Shield,
    path: "/fwa",
    color: "bg-[#d946ef]/10 text-[#d946ef]",
    borderColor: "hover:border-[#d946ef]/50",
    features: ["Risk Scoring", "Outlier Analysis", "Correction Workflows"],
  },
  {
    id: "daman-intelligence",
    title: "Daman Intelligence",
    description: "Provider-facing intelligence including benchmarking and self-audit capabilities",
    icon: Brain,
    path: "/intelligence",
    color: "bg-[#8b5cf6]/10 text-[#8b5cf6]",
    borderColor: "hover:border-[#8b5cf6]/50",
    features: ["Provider Scorecards", "Rejection Decoder", "Self-Audit"],
  },
  {
    id: "daman-business",
    title: "Daman Business",
    description: "Employer and payer-facing dashboards for profiling and policy simulation",
    icon: BarChart3,
    path: "/business",
    color: "bg-primary/10 text-primary",
    borderColor: "hover:border-primary/50",
    features: ["Employer Profiling", "AI Policy Tool", "Digital Broker"],
  },
  {
    id: "daman-members",
    title: "Daman Members",
    description: "Patient-facing portal for simple interaction, feedback, and education",
    icon: Users,
    path: "/members",
    color: "bg-[#0d9488]/10 text-[#0d9488]",
    borderColor: "hover:border-[#0d9488]/50",
    features: ["Patient Education", "Fraud Reporting", "Feedback Chatbot"],
  },
];

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #d946ef 0%, #28AAE2 50%, #0d9488 100%)",
          }}
        />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 text-white">
              <div className="mb-6">
                <img
                  src={tachyHealthLogo}
                  alt="TachyHealth Logo"
                  className="h-12 brightness-0 invert"
                  data-testid="img-tachyhealth-logo"
                />
              </div>
              <h1
                className="text-4xl md:text-5xl font-bold mb-4 tracking-tight"
                data-testid="text-hero-title"
              >
                Welcome to our platform!
              </h1>
              <p className="text-lg md:text-xl text-white/90 max-w-xl">
                We thrive to support your transformation and automation journey by creating
                value-based healthcare solutions powered by artificial intelligence and data science.
              </p>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <div className="w-48 h-48 md:w-60 md:h-60 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="text-6xl md:text-7xl font-bold text-white/80">
                    iHop
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {platformModules.map((module) => {
            const IconComponent = module.icon;
            return (
              <Card
                key={module.id}
                className={`relative overflow-visible cursor-pointer transition-all duration-300 hover-elevate ${module.borderColor} ${module.comingSoon ? "opacity-60" : ""}`}
                onClick={() => !module.comingSoon && setLocation(module.path)}
                data-testid={`card-module-${module.id}`}
              >
                {module.comingSoon && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 text-xs font-medium bg-muted rounded-full">
                      Coming Soon
                    </span>
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${module.color}`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold mb-2">{module.title}</h2>
                      <p className="text-muted-foreground mb-4">{module.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {module.features.map((feature) => (
                          <span
                            key={feature}
                            className="px-2 py-1 text-xs font-medium bg-muted rounded-md"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                      {!module.comingSoon && (
                        <div className="flex items-center text-sm font-medium text-primary">
                          Enter Module
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>Powered by TachyHealth AI</p>
        </footer>
      </div>
    </div>
  );
}
