import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  ArrowRight,
  Brain,
  Users,
  Activity,
} from "lucide-react";
import tachyHealthLogo from "@assets/logo.svg";
import { motion } from "framer-motion";
import { BuildingBackground } from "@/components/home/building-background";

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
    id: "data-smart-tech",
    title: "Daman Intelligence",
    description: "Provider oversight, coding compliance, and DRG readiness",
    icon: Brain,
    path: "/intelligence",
    color: "text-blue-600 dark:text-blue-400",
    borderColor: "hover:border-blue-500/50",
    features: ["Accreditation Scorecards", "SBS V3.0 Compliance", "DRG Readiness", "Rejection Patterns", "Documentation Quality"],
  },
  {
    id: "value-based-healthcare",
    title: "Daman Business",
    description: "Market oversight, employer compliance, and cost intelligence",
    icon: Activity,
    path: "/business",
    color: "text-emerald-600 dark:text-emerald-400",
    borderColor: "hover:border-emerald-500/50",
    features: ["Employer Compliance", "Insurer Health Monitor", "Market Concentration", "Coverage Expansion", "Cost Containment"],
  },
  {
    id: "beneficiary-empowerment",
    title: "Daman Members",
    description: "Beneficiary protection, coverage transparency, and fraud reporting",
    icon: Users,
    path: "/members",
    color: "text-purple-600 dark:text-purple-400",
    borderColor: "hover:border-purple-500/50",
    features: ["Complaints & Disputes", "Coverage Gap Monitor", "Provider Quality", "Report Fraud", "Benefits Awareness"],
  },
  {
    id: "regulatory-compliance",
    title: "Audit & FWA Unit",
    description: "National fraud intelligence command center",
    icon: Shield,
    path: "/fwa",
    color: "text-amber-600 dark:text-amber-400",
    borderColor: "hover:border-amber-500/50",
    features: ["Command Center", "High-Risk Entities", "Flagged Claims", "Online Listening", "Enforcement & Compliance", "Coding Intelligence"],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  },
};

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 dark:text-slate-50 selection:bg-blue-500/30 relative overflow-hidden">
      {/* Animated Building Background */}
      <BuildingBackground />

      {/* Hero Section */}
      <div className="relative z-10 flex-shrink-0 pt-10">
        <div className="container mx-auto px-6 py-20 md:py-32">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
            <motion.div
              className="flex-1 space-y-8"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="flex items-center gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md w-fit px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <img
                  src={tachyHealthLogo}
                  alt="TachyHealth Logo"
                  className="h-8 dark:invert opacity-90"
                  data-testid="img-tachyhealth-logo"
                />
                <div className="h-5 w-px bg-slate-300 dark:bg-slate-700" />
                <span className="text-slate-600 dark:text-slate-400 font-semibold tracking-wide text-xs uppercase">Regulatory Innovation</span>
              </div>

              <div className="space-y-4">
                <h1
                  className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight"
                  data-testid="text-hero-title"
                >
                  TachyHealth<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-emerald-500 to-teal-500 dark:from-blue-400 dark:via-emerald-300 dark:to-emerald-500">
                    Regulatory Hub
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed backdrop-blur-sm bg-white/30 dark:bg-slate-900/30 p-4 rounded-xl border border-white/40 dark:border-slate-800/40">
                  Empowering the Council of Health Insurance (CHI) to shape a sustainable, beneficiary-centered healthcare ecosystem aligned with Saudi Vision 2030 through AI-driven oversight.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button
                  onClick={() => setLocation('/fwa')}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-full font-semibold transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 flex items-center gap-2"
                >
                  Enter Platform
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Pillars Section */}
      <div className="relative z-10 container mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
        <div className="mb-12 text-center md:text-left">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4 text-center">Strategic Pillars (2025-2027)</h2>
          <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-emerald-500 mx-auto rounded-full" />
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto w-full"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {platformModules.map((module) => {
            const IconComponent = module.icon;
            // Map the text color to a background with opacity for the icon container
            const getBgColor = (textCls: string) => {
              if (textCls.includes('blue')) return 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400';
              if (textCls.includes('emerald')) return 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
              if (textCls.includes('purple')) return 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400';
              if (textCls.includes('amber')) return 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400';
              return 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400';
            };

            return (
              <motion.div key={module.id} variants={itemVariants} className="h-full">
                <Card
                  className={`relative overflow-hidden cursor-pointer transition-all duration-300 h-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xl hover:-translate-y-1 group ${module.comingSoon ? "opacity-60" : ""}`}
                  onClick={() => !module.comingSoon && setLocation(module.path)}
                  data-testid={`card-module-${module.id}`}
                >
                  {/* Card hover gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 dark:from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {module.comingSoon && (
                    <div className="absolute top-4 right-4 align-middle">
                      <span className="px-3 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700">
                        Coming Soon
                      </span>
                    </div>
                  )}
                  <CardContent className="p-8 relative z-10 flex flex-col h-full justify-between border-0">
                    <div>
                      <div className="flex items-start gap-5">
                        <div className={`p-4 rounded-2xl ${getBgColor(module.color)} border border-current/10 shadow-sm`}>
                          <IconComponent className="h-7 w-7" />
                        </div>
                        <div className="flex-1 mt-1">
                          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">{module.title}</h3>
                          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{module.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-8 ml-[72px]">
                        {module.features.map((feature) => (
                          <span
                            key={feature}
                            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700/50"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {!module.comingSoon && (
                      <div className={`flex items-center text-sm font-bold ${module.color} ml-[72px] mt-auto`}>
                        <span className="group-hover:mr-2 transition-all">Launch Module</span>
                        <ArrowRight className="h-4 w-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <footer className="py-8 border-t border-slate-200/50 dark:border-slate-800/50 mt-auto bg-white/50 dark:bg-slate-950/80 backdrop-blur-md relative z-10">
        <div className="container mx-auto px-6 text-center flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Powered by TachyHealth AI
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-600">
            <span className="hover:text-slate-700 dark:hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span>&bull;</span>
            <span className="hover:text-slate-700 dark:hover:text-slate-400 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
