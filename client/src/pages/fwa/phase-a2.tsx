import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Code,
  Building,
  UserCog,
  Users,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const fwaCategories = [
  {
    name: "Coding Abuse",
    icon: Code,
    color: "orange",
    description: "Fraudulent billing practices through code manipulation",
    count: 45,
    percentage: 38,
    subCategories: [
      { name: "Upcoding", description: "Billing for higher-level services", count: 18 },
      { name: "Unbundling", description: "Separating bundled procedures", count: 12 },
      { name: "Code manipulation", description: "Incorrect code usage", count: 9 },
      { name: "Phantom billing codes", description: "Billing for services not rendered", count: 6 },
    ],
  },
  {
    name: "Management Abuse",
    icon: Building,
    color: "teal",
    description: "Administrative fraud and policy violations",
    count: 32,
    percentage: 27,
    subCategories: [
      { name: "Administrative fraud patterns", description: "Systematic administrative manipulation", count: 14 },
      { name: "Policy violations", description: "Non-compliance with policies", count: 8 },
      { name: "Resource misallocation", description: "Improper resource usage", count: 6 },
      { name: "Systematic abuse patterns", description: "Repeated abuse behaviors", count: 4 },
    ],
  },
  {
    name: "Physician Abuse",
    icon: UserCog,
    color: "rose",
    description: "Provider-level fraud and documentation issues",
    count: 25,
    percentage: 21,
    subCategories: [
      { name: "Documentation fraud", description: "Falsified medical records", count: 10 },
      { name: "Medical necessity violations", description: "Unnecessary procedures", count: 7 },
      { name: "Signature fraud", description: "Forged or unauthorized signatures", count: 5 },
      { name: "Credential misrepresentation", description: "False credentials", count: 3 },
    ],
  },
  {
    name: "Patient Abuse",
    icon: Users,
    color: "indigo",
    description: "Patient-side fraud and collusion",
    count: 17,
    percentage: 14,
    subCategories: [
      { name: "Family shopping", description: "Sharing insurance credentials", count: 6 },
      { name: "Phantom visiting", description: "Claiming services not received", count: 5 },
      { name: "Provider-patient collusion", description: "Joint fraud schemes", count: 4 },
      { name: "Credit utilization fraud", description: "Insurance benefit abuse", count: 2 },
    ],
  },
];

const colorMap: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  orange: { bg: "bg-orange-100", text: "text-orange-800", darkBg: "dark:bg-orange-900", darkText: "dark:text-orange-200" },
  teal: { bg: "bg-teal-100", text: "text-teal-800", darkBg: "dark:bg-teal-900", darkText: "dark:text-teal-200" },
  rose: { bg: "bg-rose-100", text: "text-rose-800", darkBg: "dark:bg-rose-900", darkText: "dark:text-rose-200" },
  indigo: { bg: "bg-indigo-100", text: "text-indigo-800", darkBg: "dark:bg-indigo-900", darkText: "dark:text-indigo-200" },
};

function CategoryCard({ category }: { category: typeof fwaCategories[0] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = colorMap[category.color];

  return (
    <Card className="overflow-hidden" data-testid={`category-card-${category.name.toLowerCase().replace(/\s/g, "-")}`}>
      <CardHeader
        className="cursor-pointer hover-elevate"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors.bg} ${colors.darkBg}`}>
              <category.icon className={`w-5 h-5 ${colors.text} ${colors.darkText}`} />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {category.name}
                <Badge className={`${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}>
                  {category.count} cases
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold">{category.percentage}%</p>
              <p className="text-xs text-muted-foreground">of total</p>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0 border-t">
          <div className="space-y-3 pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Sub-Categories</p>
            {category.subCategories.map((sub) => (
              <div key={sub.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{sub.name}</p>
                  <p className="text-xs text-muted-foreground">{sub.description}</p>
                </div>
                <Badge variant="secondary">{sub.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function PhaseA2() {
  const totalCases = fwaCategories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Phase A2</Badge>
          </div>
          <h1 className="text-2xl font-bold" data-testid="page-title">FWA Categorization & Classification</h1>
          <p className="text-muted-foreground">
            Consume A1 insights and categorize findings into specific FWA types
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/fwa/cases">
            View All Cases
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-purple-600" />
            Agent Responsibilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-medium shrink-0">1</span>
              Map each finding from A1 to appropriate FWA category
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-medium shrink-0">2</span>
              Assign severity scores per category
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-medium shrink-0">3</span>
              Identify multi-category fraud patterns
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-medium shrink-0">4</span>
              Generate evidence packages per FWA type
            </li>
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-medium shrink-0">5</span>
              Prioritize cases by risk level
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-bold text-purple-600">{totalCases}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Categorized Cases</p>
          </CardContent>
        </Card>
        {fwaCategories.map((cat) => {
          const colors = colorMap[cat.color];
          return (
            <Card key={cat.name}>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <cat.icon className={`w-4 h-4 ${colors.text} ${colors.darkText}`} />
                  <span className="text-sm font-medium">{cat.name.split(" ")[0]}</span>
                </div>
                <p className="text-2xl font-bold">{cat.count}</p>
                <Progress value={cat.percentage} className="h-1 mt-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">FWA Categories Breakdown</h2>
        {fwaCategories.map((category) => (
          <CategoryCard key={category.name} category={category} />
        ))}
      </div>
    </div>
  );
}
