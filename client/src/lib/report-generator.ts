export interface ClaimData {
  id: string;
  claimNumber: string;
  patientName: string;
  patientGender: string;
  patientAge: number;
  providerName: string;
  registrationDate: string;
  amount: number;
  outlierScore: number;
  icdDescription?: string;
  claimType: string;
  lengthOfStay: number;
  hospitalName?: string;
  hospital?: string;
  engineViolations?: Array<{ type: string; code: string; details: string; category?: string }>;
}

export interface ProviderData {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  aiScore: number;
  mlFlags?: Array<{ feature: string; importance?: number; value: string; benchmark: string; interpretation?: string }>;
  costPerClaim?: number;
  totalClaimedAmount?: number;
  numberOfClaims?: number;
  outlierClaimsCount?: number;
}

export interface HospitalInfo {
  name: string;
  claims?: number;
  amount?: number;
  outlierRate?: number;
}

export interface ReportData {
  hospitalName: string;
  reportDate: string;
  reviewPeriod: string;
  summary: {
    totalClaims: number;
    totalAmount: number;
    technicalIssues: number;
    medicalReviews: number;
    mlFlags: number;
    outlierRate: number;
  };
  insights: {
    id: string;
    engineCode: string;
    title: string;
    severity: string;
    category: string;
    subcategory: string;
    description: string;
    metric: string;
    benchmark: string;
    variance: string;
    recommendation: string;
    claims: {
      claimNumber: string;
      patientName: string;
      patientGender: string;
      patientAge: number;
      providerName: string;
      date: string;
      amount: number;
      outlierScore: number;
      violationCode: string;
      violationDetails: string;
      diagnosis: string;
      claimType: string;
      lengthOfStay: number;
    }[];
    totalAmount: number;
    avgOutlierScore: number;
  }[];
  providers: {
    id: string;
    name: string;
    specialty: string;
    hospital: string;
    aiScore: number;
    metrics: {
      currentCPM: number;
      benchmarkCPM: number;
      cpmVariance: number;
      rejectionRate: number;
      totalUtilizations: number;
      costPerClaim: number;
      totalClaimedAmount: number;
      numberOfClaims: number;
    };
    quarterlyTrend: {
      quarter: string;
      year: number;
      cpm: number;
      memberCount: number;
    }[];
    mlFlags: {
      feature: string;
      importance: number;
      value: string;
      benchmark: string;
      interpretation: string;
    }[];
  }[];
  networkComparison: {
    networkClass: string;
    networkClassName: string;
    providers: {
      name: string;
      specialty: string;
      currentCPM: number;
      rejectionRate: number;
      costPerClaim: number;
      utilizations: number;
    }[];
  }[];
}

export function generateReportData(
  hospital: HospitalInfo,
  insights: any[],
  selectedClaimIds: Set<string>,
  allClaims: ClaimData[],
  allProviders: ProviderData[]
): ReportData {
  const hospitalClaims = allClaims.filter((c) => {
    const claimHospital = c.hospitalName || c.hospital || "";
    return claimHospital.toLowerCase().includes(hospital.name.toLowerCase().split(" ")[0]);
  });

  const hospitalProviders = allProviders.filter((p) =>
    p.hospital.toLowerCase().includes(hospital.name.toLowerCase().split(" ")[0])
  );

  const totalAmount = hospitalClaims.reduce((sum, c) => sum + c.amount, 0);
  const highRiskCount = hospitalClaims.filter((c) => c.outlierScore >= 0.7).length;

  // Helper to build claim data from ID
  const buildClaimData = (id: string) => {
    const claim = allClaims.find((c) => c.id === id);
    if (!claim) return null;
    const violation = claim.engineViolations?.[0];
    return {
      claimNumber: claim.claimNumber,
      patientName: claim.patientName,
      patientGender: claim.patientGender,
      patientAge: claim.patientAge,
      providerName: claim.providerName,
      date: claim.registrationDate,
      amount: claim.amount,
      outlierScore: claim.outlierScore,
      violationCode: violation?.code || "",
      violationDetails: violation?.details || "",
      diagnosis: claim.icdDescription || "",
      claimType: claim.claimType,
      lengthOfStay: claim.lengthOfStay,
    };
  };

  // When claims are selected, build insights from selected claims directly
  // Otherwise, use the insight structure as provided
  const hasSelection = selectedClaimIds.size > 0;
  
  let reportInsights: any[];
  
  if (hasSelection) {
    // Build a single "Selected Claims" insight containing all selected claims
    const selectedClaimsArray = Array.from(selectedClaimIds);
    const claims = selectedClaimsArray
      .map(buildClaimData)
      .filter((c): c is NonNullable<typeof c> => c !== null);
    
    // Warn if some selections couldn't be mapped
    if (claims.length < selectedClaimsArray.length) {
      console.warn(`Export: ${selectedClaimsArray.length - claims.length} selected claims could not be mapped to claim data`);
    }
    
    // If no claims could be mapped, return empty report structure
    if (claims.length === 0) {
      return {
        hospitalName: hospital.name,
        reportDate: new Date().toISOString().split("T")[0],
        reviewPeriod: "Last 6 Months",
        summary: {
          totalClaims: 0,
          totalAmount: 0,
          technicalIssues: 0,
          medicalReviews: 0,
          mlFlags: 0,
          outlierRate: 0,
        },
        insights: [],
        providers: [],
        networkComparison: [],
      };
    }
    
    const totalSelectedAmount = claims.reduce((sum, c: any) => sum + c.amount, 0);
    const avgScore = claims.reduce((sum, c: any) => sum + c.outlierScore, 0) / Math.max(claims.length, 1);
    
    // Find which insights the selected claims belong to for categorization
    const insightCategories = new Set<string>();
    insights.forEach((insight) => {
      const allIds = [...(insight.primaryClaimIds || []), ...(insight.additionalClaimIds || [])];
      if (allIds.some((id: string) => selectedClaimIds.has(id))) {
        insightCategories.add(insight.title);
      }
    });
    
    reportInsights = [{
      id: "selected-claims",
      engineCode: "SELECTED",
      title: `Selected Claims for Export (${claims.length} claims)`,
      severity: "high",
      category: "export",
      subcategory: "selected",
      description: `User-selected claims from categories: ${Array.from(insightCategories).join(", ") || "Various"}`,
      metric: `${claims.length} claims selected`,
      benchmark: "N/A",
      variance: "N/A",
      recommendation: "Review all selected claims for negotiation evidence.",
      claims,
      totalAmount: totalSelectedAmount,
      avgOutlierScore: avgScore,
    }];
  } else {
    // No selection - include all claims from insights
    reportInsights = insights.map((insight) => {
      const primaryIds = insight.primaryClaimIds || [];
      const additionalIds = insight.additionalClaimIds || [];
      const allClaimIds = [...primaryIds, ...additionalIds];
      
      const claims = allClaimIds
        .map(buildClaimData)
        .filter((c): c is NonNullable<typeof c> => c !== null);

      const totalInsightAmount = claims.reduce((sum, c: any) => sum + c.amount, 0);
      const avgScore = claims.reduce((sum, c: any) => sum + c.outlierScore, 0) / Math.max(claims.length, 1);

      return {
        id: insight.id,
        engineCode: insight.engineCode,
        title: insight.title,
        severity: insight.severity,
        category: insight.category,
        subcategory: insight.subcategory,
        description: insight.description,
        metric: insight.metric,
        benchmark: insight.benchmark,
        variance: insight.variance,
        recommendation: insight.recommendation,
        claims,
        totalAmount: totalInsightAmount,
        avgOutlierScore: avgScore,
      };
    });
  }

  const reportProviders = hospitalProviders.map((provider) => {
    return {
      id: provider.id,
      name: provider.name,
      specialty: provider.specialty,
      hospital: provider.hospital,
      aiScore: provider.aiScore,
      metrics: {
        currentCPM: 0,
        benchmarkCPM: 0,
        cpmVariance: 0,
        rejectionRate: 0,
        totalUtilizations: 0,
        costPerClaim: provider.costPerClaim || 0,
        totalClaimedAmount: provider.totalClaimedAmount || 0,
        numberOfClaims: provider.numberOfClaims || 0,
      },
      quarterlyTrend: [],
      mlFlags: (provider.mlFlags || []).map(f => ({
        feature: f.feature,
        importance: f.importance || 0,
        value: f.value,
        benchmark: f.benchmark,
        interpretation: f.interpretation || "",
      })),
    };
  });

  const networkClassGroups = new Map<string, typeof reportProviders>();
  reportProviders.forEach((provider) => {
    const networkClass = "tier2";
    if (!networkClassGroups.has(networkClass)) {
      networkClassGroups.set(networkClass, []);
    }
    networkClassGroups.get(networkClass)!.push(provider);
  });

  const networkComparison = Array.from(networkClassGroups.entries()).map(([classId, providers]) => {
    return {
      networkClass: classId,
      networkClassName: classId,
      providers: providers.map((p) => ({
        name: p.name,
        specialty: p.specialty,
        currentCPM: p.metrics.currentCPM,
        rejectionRate: p.metrics.rejectionRate,
        costPerClaim: p.metrics.costPerClaim,
        utilizations: p.metrics.totalUtilizations,
      })),
    };
  });

  // Filter to only insights with claims for the report
  const insightsWithClaims = reportInsights.filter(i => i.claims.length > 0);
  
  // Calculate summary based on included claims only
  const includedClaimCount = insightsWithClaims.reduce((sum, i) => sum + i.claims.length, 0);
  const includedAmount = insightsWithClaims.reduce((sum, i) => sum + i.totalAmount, 0);
  
  // For selected claims, calculate high-risk count from selected claims
  let selectedHighRiskCount = highRiskCount;
  if (hasSelection) {
    const selectedClaimsData = Array.from(selectedClaimIds)
      .map(id => allClaims.find(c => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c !== null);
    selectedHighRiskCount = selectedClaimsData.filter(c => c.outlierScore >= 0.7).length;
  }
  
  return {
    hospitalName: hospital.name,
    reportDate: new Date().toISOString().split("T")[0],
    reviewPeriod: "Last 6 Months",
    summary: {
      totalClaims: hasSelection ? includedClaimCount : hospitalClaims.length,
      totalAmount: hasSelection ? includedAmount : totalAmount,
      technicalIssues: hasSelection ? 1 : insightsWithClaims.filter((i) => i.subcategory === "technical").length,
      medicalReviews: hasSelection ? 0 : insightsWithClaims.filter((i) => i.subcategory === "medical").length,
      mlFlags: hasSelection ? 0 : insightsWithClaims.filter((i) => i.subcategory === "ml-flag").length,
      outlierRate: hasSelection 
        ? (selectedHighRiskCount / Math.max(includedClaimCount, 1)) * 100
        : (highRiskCount / Math.max(hospitalClaims.length, 1)) * 100,
    },
    insights: insightsWithClaims,
    providers: reportProviders,
    networkComparison,
  };
}

export function generateCSVReport(reportData: ReportData): string {
  const lines: string[] = [];

  lines.push("FWA RECONCILIATION REPORT");
  lines.push("");
  lines.push(`Provider:,${reportData.hospitalName}`);
  lines.push(`Report Date:,${reportData.reportDate}`);
  lines.push(`Review Period:,${reportData.reviewPeriod}`);
  lines.push("");

  lines.push("EXECUTIVE SUMMARY");
  lines.push(`Total Claims:,${reportData.summary.totalClaims}`);
  lines.push(`Total Amount:,$${reportData.summary.totalAmount.toLocaleString()}`);
  lines.push(`Technical Issues:,${reportData.summary.technicalIssues}`);
  lines.push(`Medical Reviews:,${reportData.summary.medicalReviews}`);
  lines.push(`ML Flags:,${reportData.summary.mlFlags}`);
  lines.push(`Outlier Rate:,${reportData.summary.outlierRate.toFixed(2)}%`);
  lines.push("");

  lines.push("ENGINE FINDINGS & INSIGHTS");
  lines.push("");

  // Only include insights that have claims
  const insightsWithClaims = reportData.insights.filter(insight => insight.claims.length > 0);
  
  if (insightsWithClaims.length === 0) {
    lines.push("No claims selected for export or no matching claims found.");
    lines.push("");
  }

  insightsWithClaims.forEach((insight) => {
    lines.push(`${insight.engineCode} - ${insight.title}`);
    lines.push(`Severity:,${insight.severity}`);
    lines.push(`Category:,${insight.category} (${insight.subcategory})`);
    lines.push(`Description:,${insight.description}`);
    lines.push(`Metric:,${insight.metric}`);
    lines.push(`Benchmark:,${insight.benchmark}`);
    lines.push(`Variance:,${insight.variance}`);
    lines.push(`Recommendation:,"${insight.recommendation}"`);
    lines.push(`Total Amount:,$${insight.totalAmount.toLocaleString()}`);
    lines.push(`Avg Outlier Score:,${insight.avgOutlierScore.toFixed(2)}`);
    lines.push(`Claims Included:,${insight.claims.length}`);
    lines.push("");

    lines.push("Claim Number,Patient Name,Gender,Age,Provider,Date,Amount,Outlier Score,Violation Code,Diagnosis,Claim Type,LOS");
    insight.claims.forEach((claim: any) => {
      lines.push(`${claim.claimNumber},${claim.patientName},${claim.patientGender},${claim.patientAge},${claim.providerName},${claim.date},$${claim.amount.toLocaleString()},${claim.outlierScore.toFixed(2)},${claim.violationCode},"${claim.diagnosis}",${claim.claimType},${claim.lengthOfStay}`);
    });
    lines.push("");
  });

  lines.push("PROVIDER PERFORMANCE ANALYSIS");
  lines.push("");
  lines.push("Provider,Specialty,AI Score,Current CPM,Benchmark CPM,CPM Variance,Rejection Rate,Total Utilizations,Cost Per Claim,Total Claimed");

  reportData.providers.forEach((provider) => {
    lines.push(`${provider.name},${provider.specialty},${provider.aiScore.toFixed(2)},$${provider.metrics.currentCPM},$${provider.metrics.benchmarkCPM},${provider.metrics.cpmVariance.toFixed(1)}%,${(provider.metrics.rejectionRate * 100).toFixed(1)}%,${provider.metrics.totalUtilizations},$${provider.metrics.costPerClaim.toLocaleString()},$${provider.metrics.totalClaimedAmount.toLocaleString()}`);
  });
  lines.push("");

  lines.push("NETWORK CLASS COMPARISON");
  lines.push("");

  reportData.networkComparison.forEach((network) => {
    lines.push(network.networkClassName);
    lines.push("Provider,Specialty,Current CPM,Rejection Rate,Cost Per Claim,Utilizations");
    network.providers.forEach((p) => {
      lines.push(`${p.name},${p.specialty},$${p.currentCPM},${(p.rejectionRate * 100).toFixed(1)}%,$${p.costPerClaim.toLocaleString()},${p.utilizations}`);
    });
    lines.push("");
  });

  lines.push("ML MODEL FLAGS BY PROVIDER");
  lines.push("");
  lines.push("Provider,Feature,Importance,Value,Benchmark,Interpretation");

  reportData.providers.forEach((provider) => {
    provider.mlFlags.forEach((flag) => {
      lines.push(`${provider.name},${flag.feature},${flag.importance.toFixed(2)},${flag.value},${flag.benchmark},"${flag.interpretation}"`);
    });
  });

  return lines.join("\n");
}

export function downloadReport(filename: string, content: string, type: "csv" | "txt" = "csv") {
  const mimeType = type === "csv" ? "text/csv;charset=utf-8;" : "text/plain;charset=utf-8;";
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.${type}`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generatePrintStyles(): string {
  return `
    @media print {
      @page {
        size: A4 portrait;
        margin: 1cm;
      }
      
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .print\\:hidden {
        display: none !important;
      }
      
      .print\\:block {
        display: block !important;
      }
      
      .print\\:break-before {
        break-before: page;
      }
      
      .print\\:break-inside-avoid {
        break-inside: avoid;
      }
    }
  `;
}

export function generateFullExportReport(
  selectedClaimIds: string[],
  providers: ProviderData[],
  insights: any[],
  allClaims: ClaimData[] = []
): string {
  const lines: string[] = [];
  const now = new Date();
  
  lines.push("FWA AGENTIC WORKFLOW - FULL EXPORT REPORT");
  lines.push("=========================================");
  lines.push("");
  lines.push(`Report Generated: ${now.toISOString()}`);
  lines.push(`Selected Providers: ${providers.length}`);
  lines.push("");
  
  lines.push("EXECUTIVE SUMMARY");
  lines.push("-----------------");
  
  const relevantClaims = allClaims.filter((c) => selectedClaimIds.includes(c.id));
  const totalAmount = relevantClaims.reduce((sum, c) => sum + c.amount, 0);
  const highRiskClaims = relevantClaims.filter((c) => c.outlierScore >= 0.7);
  const technicalViolations = relevantClaims.filter((c) => 
    c.engineViolations?.some((v) => v.category === "technical")
  ).length;
  
  lines.push(`Total Claims Analyzed: ${relevantClaims.length}`);
  lines.push(`Total Amount at Issue: $${totalAmount.toLocaleString()}`);
  lines.push(`High Risk Claims: ${highRiskClaims.length} (${((highRiskClaims.length / Math.max(relevantClaims.length, 1)) * 100).toFixed(1)}%)`);
  lines.push(`Technical Violations: ${technicalViolations}`);
  lines.push("");
  
  lines.push("PROVIDERS INCLUDED");
  lines.push("------------------");
  lines.push("Provider ID,Provider Name,Specialty,Hospital,AI Score,Total Claimed,Outliers");
  
  providers.forEach((provider) => {
    lines.push(`${provider.id},${provider.name},${provider.specialty},${provider.hospital},${(provider.aiScore || 0).toFixed(2)},$${(provider.totalClaimedAmount || 0).toLocaleString()},${provider.outlierClaimsCount || 0}`);
  });
  lines.push("");
  
  lines.push("CLAIM EVIDENCE");
  lines.push("--------------");
  lines.push("Claim Number,Patient,Gender,Age,Provider,Date,Amount,Outlier Score,Claim Type,Diagnosis,LOS,Violations");
  
  relevantClaims.forEach((claim) => {
    const violations = claim.engineViolations?.map((v) => v.code).join("; ") || "None";
    lines.push(`${claim.claimNumber},${claim.patientName},${claim.patientGender},${claim.patientAge},${claim.providerName},${claim.registrationDate},$${claim.amount.toLocaleString()},${claim.outlierScore.toFixed(2)},${claim.claimType},"${claim.icdDescription || ""}",${claim.lengthOfStay},"${violations}"`);
  });
  lines.push("");
  
  lines.push("ENGINE VIOLATIONS DETAIL");
  lines.push("------------------------");
  
  relevantClaims.forEach((claim) => {
    if (claim.engineViolations && claim.engineViolations.length > 0) {
      lines.push(`Claim ${claim.claimNumber}:`);
      claim.engineViolations.forEach((v: any) => {
        lines.push(`  - [${v.code}] ${v.description || "Violation detected"}`);
        lines.push(`    Severity: ${v.severity || "N/A"} | Category: ${v.category || "N/A"}`);
        lines.push(`    Details: ${v.details}`);
        lines.push(`    Action: ${v.action || "Review required"}`);
      });
      lines.push("");
    }
  });
  
  lines.push("ML MODEL FLAGS");
  lines.push("--------------");
  
  providers.forEach((provider) => {
    if (provider.mlFlags && provider.mlFlags.length > 0) {
      lines.push(`${provider.name}:`);
      provider.mlFlags.forEach((flag) => {
        lines.push(`  - ${flag.feature}: ${flag.value} (benchmark: ${flag.benchmark})`);
        lines.push(`    Importance: ${(flag.importance || 0).toFixed(2)} | ${flag.interpretation || ""}`);
      });
      lines.push("");
    }
  });
  
  lines.push("--- END OF REPORT ---");
  
  return lines.join("\n");
}

export function generatePrintSummary(
  selectedClaimIds: string[],
  providers: ProviderData[],
  insights: any[],
  allClaims: ClaimData[] = []
): string {
  const lines: string[] = [];
  const now = new Date();
  
  const relevantClaims = allClaims.filter((c) => selectedClaimIds.includes(c.id));
  const totalAmount = relevantClaims.reduce((sum, c) => sum + c.amount, 0);
  const highRiskClaims = relevantClaims.filter((c) => c.outlierScore >= 0.7);
  
  lines.push("FWA INVESTIGATION SUMMARY");
  lines.push("=========================");
  lines.push("");
  lines.push(`Date: ${now.toLocaleDateString()}`);
  lines.push(`Time: ${now.toLocaleTimeString()}`);
  lines.push("");
  
  lines.push("INVESTIGATION SCOPE");
  lines.push("-------------------");
  lines.push(`Providers Under Review: ${providers.length}`);
  providers.forEach((p) => {
    lines.push(`  - ${p.name} (${p.id}) - ${p.specialty}`);
  });
  lines.push("");
  
  lines.push("KEY FINDINGS");
  lines.push("------------");
  lines.push(`Total Claims Reviewed: ${relevantClaims.length}`);
  lines.push(`Total Amount at Issue: $${totalAmount.toLocaleString()}`);
  lines.push(`High Risk Claims (70%+ outlier): ${highRiskClaims.length}`);
  lines.push(`Outlier Rate: ${((highRiskClaims.length / Math.max(relevantClaims.length, 1)) * 100).toFixed(1)}%`);
  lines.push("");
  
  const violationTypes = new Map<string, number>();
  relevantClaims.forEach((claim) => {
    claim.engineViolations?.forEach((v) => {
      violationTypes.set(v.type, (violationTypes.get(v.type) || 0) + 1);
    });
  });
  
  if (violationTypes.size > 0) {
    lines.push("VIOLATION BREAKDOWN");
    lines.push("-------------------");
    Array.from(violationTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        lines.push(`  - ${type.replace(/_/g, " ").toUpperCase()}: ${count} occurrences`);
      });
    lines.push("");
  }
  
  lines.push("TOP 5 HIGHEST VALUE CLAIMS");
  lines.push("--------------------------");
  const topClaims = [...relevantClaims]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  
  topClaims.forEach((claim, idx) => {
    lines.push(`${idx + 1}. ${claim.claimNumber} - $${claim.amount.toLocaleString()}`);
    lines.push(`   Patient: ${claim.patientName} | Provider: ${claim.providerName}`);
    lines.push(`   Diagnosis: ${claim.icdDescription || ""}`);
    lines.push(`   Outlier Score: ${claim.outlierScore.toFixed(2)}`);
  });
  lines.push("");
  
  lines.push("RECOMMENDATIONS");
  lines.push("---------------");
  lines.push("1. Initiate detailed medical review for all high-risk claims");
  lines.push("2. Request supporting documentation from providers");
  lines.push("3. Schedule provider reconciliation meeting within 30 days");
  lines.push("4. Consider pattern analysis for repeat violations");
  lines.push("5. Escalate to SIU if fraud indicators confirmed");
  lines.push("");
  
  lines.push("--- END OF SUMMARY ---");
  
  return lines.join("\n");
}
