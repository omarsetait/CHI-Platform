import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  BarChart3,
  ArrowRight,
  Brain,
  Users,
  Activity,
  Database,
  Lock
} from "lucide-react";
import tachyHealthLogo from "@assets/logo.svg";
import { motion } from "framer-motion";

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
    title: "Audit & FWA Unit",
    description: "National fraud intelligence command center",
    icon: Shield,
    path: "/fwa",
    color: "text-amber-500",
    borderColor: "hover:border-amber-500/50",
    features: ["Command Center", "High-Risk Entities", "Flagged Claims", "Online Listening", "Enforcement & Compliance", "Coding Intelligence"],
  },
  {
    id: "daman-intelligence",
    title: "Daman Intelligence",
    description: "Provider oversight, coding compliance, and DRG readiness",
    icon: Brain,
    path: "/intelligence",
    color: "text-blue-500",
    borderColor: "hover:border-blue-500/50",
    features: ["Accreditation Scorecards", "SBS V3.0 Compliance", "DRG Readiness", "Rejection Patterns", "Documentation Quality"],
  },
  {
    id: "daman-business",
    title: "Daman Business",
    description: "Market oversight, employer compliance, and cost intelligence",
    icon: Activity,
    path: "/business",
    color: "text-emerald-500",
    borderColor: "hover:border-emerald-500/50",
    features: ["Employer Compliance", "Insurer Health Monitor", "Market Concentration", "Coverage Expansion", "Cost Containment"],
  },
  {
    id: "daman-members",
    title: "Daman Members",
    description: "Beneficiary protection, coverage transparency, and fraud reporting",
    icon: Users,
    path: "/members",
    color: "text-purple-500",
    borderColor: "hover:border-purple-500/50",
    features: ["Complaints & Disputes", "Coverage Gap Monitor", "Provider Quality", "Report Fraud", "Benefits Awareness"],
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
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-50 selection:bg-blue-500/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden flex-shrink-0">
        {/* Futuristic Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950" />
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 rounded-full bg-blue-600/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-96 h-96 rounded-full bg-emerald-600/10 blur-[100px]" />

        <div className="relative z-10 container mx-auto px-6 py-20 md:py-32">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
            <motion.div
              className="flex-1 space-y-8"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="flex items-center gap-4">
                <img
                  src={tachyHealthLogo}
                  alt="TachyHealth Logo"
                  className="h-10 brightness-0 invert opacity-80"
                  data-testid="img-tachyhealth-logo"
                />
                <div className="h-6 w-px bg-slate-700" />
                <span className="text-slate-400 font-medium tracking-wide text-sm uppercase">Regulatory Innovation</span>
              </div>

              <div className="space-y-4">
                <h1
                  className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-300 to-emerald-500 leading-tight"
                  data-testid="text-hero-title"
                >
                  TachyHealth<br />Regulatory Hub
                </h1>
                <p className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed">
                  Empowering the Council of Health Insurance (CHI) to shape a sustainable, beneficiary-centered healthcare ecosystem aligned with Saudi Vision 2030 through AI-driven oversight.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button
                  onClick={() => setLocation('/fwa')}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center gap-2"
                >
                  Enter Platform
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-full font-semibold border border-slate-700 transition-all backdrop-blur-sm">
                  View Demo Strategy
                </button>
              </div>
            </motion.div>

            <motion.div
              className="flex-1 w-full max-w-lg relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              {/* Decorative Abstract Visualization */}
              <div className="aspect-square rounded-full border border-slate-800/60 flex items-center justify-center relative shadow-[0_0_100px_rgba(16,185,129,0.05)]">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-emerald-500/5 rounded-full" />
                <div className="w-3/4 h-3/4 rounded-full border border-slate-700/50 flex items-center justify-center relative overflow-hidden backdrop-blur-3xl animate-[spin_60s_linear_infinite]">
                  {/* Inner rotating rings */}
                  <div className="absolute inset-2 border border-dashed border-blue-500/20 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                  <div className="absolute inset-8 border border-slate-700/30 rounded-full" />
                </div>
                {/* Center static eye/hub indicator */}
                <div className="absolute inset-0 m-auto w-32 h-32 rounded-full bg-slate-900 border border-slate-700 shadow-[0_0_50px_rgba(59,130,246,0.2)] flex flex-col items-center justify-center gap-2 z-20">
                  <Database className="w-8 h-8 text-blue-400" />
                  <span className="text-xs font-bold text-slate-300 tracking-wider">CHI CORE</span>
                </div>
                {/* Orbiting nodes */}
                <div className="absolute top-0 w-12 h-12 -mt-6 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg text-emerald-400 z-10"><Shield className="w-6 h-6" /></div>
                <div className="absolute bottom-0 w-12 h-12 -mb-6 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg text-blue-400 z-10"><Brain className="w-6 h-6" /></div>
                <div className="absolute left-0 w-12 h-12 -ml-6 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg text-amber-400 z-10"><Lock className="w-6 h-6" /></div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Pillars Section */}
      <div className="relative z-10 container mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
        <div className="mb-12 text-center md:text-left">
          <h2 className="text-3xl font-bold text-slate-100 mb-4 text-center">Strategic Pillars (2025-2027)</h2>
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
              if (textCls.includes('blue')) return 'bg-blue-500/10';
              if (textCls.includes('emerald')) return 'bg-emerald-500/10';
              if (textCls.includes('purple')) return 'bg-purple-500/10';
              if (textCls.includes('amber')) return 'bg-amber-500/10';
              return 'bg-blue-500/10';
            };

            return (
              <motion.div key={module.id} variants={itemVariants} className="h-full">
                <Card
                  className={`relative overflow-hidden cursor-pointer transition-all duration-300 h-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 hover:border-slate-600 hover:shadow-2xl hover:-translate-y-1 group ${module.comingSoon ? "opacity-60" : ""}`}
                  onClick={() => !module.comingSoon && setLocation(module.path)}
                  data-testid={`card-module-${module.id}`}
                >
                  {/* Card hover gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {module.comingSoon && (
                    <div className="absolute top-4 right-4 align-middle">
                      <span className="px-3 py-1 text-xs font-semibold bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                        Coming Soon
                      </span>
                    </div>
                  )}
                  <CardContent className="p-8 relative z-10 flex flex-col h-full justify-between border-0">
                    <div>
                      <div className="flex items-start gap-5">
                        <div className={`p-4 rounded-2xl ${getBgColor(module.color)} ${module.color} border border-current/20 shadow-inner`}>
                          <IconComponent className="h-7 w-7" />
                        </div>
                        <div className="flex-1 mt-1">
                          <h3 className="text-2xl font-bold text-slate-100 mb-3 group-hover:text-white transition-colors">{module.title}</h3>
                          <p className="text-slate-400 text-sm leading-relaxed mb-6 group-hover:text-slate-300 transition-colors">{module.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-8 ml-[72px]">
                        {module.features.map((feature) => (
                          <span
                            key={feature}
                            className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-slate-300 rounded-lg border border-slate-700/50"
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

      <footer className="py-8 border-t border-slate-800/50 mt-auto bg-slate-950/80 backdrop-blur-md relative z-10">
        <div className="container mx-auto px-6 text-center flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Powered by TachyHealth AI
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span>&bull;</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
