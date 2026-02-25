export type AgentPhase = "A1" | "A2" | "A3";
export type AgentEntityType = "provider" | "patient" | "doctor";

export interface AgentDescriptor {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  metricsRequired: string[];
}

export interface PhaseConfig {
  id: AgentPhase;
  name: string;
  title: string;
  description: string;
  reportType: string;
}

export const phaseConfigs: Record<AgentPhase, PhaseConfig> = {
  A1: {
    id: "A1",
    name: "Analysis & Intelligence",
    title: "Investigation Brief",
    description: "Root cause analysis and intelligence gathering on flagged entities",
    reportType: "investigation_brief"
  },
  A2: {
    id: "A2",
    name: "Categorization & Classification",
    title: "Classification Summary",
    description: "Categorize findings into specific FWA types with evidence",
    reportType: "classification_summary"
  },
  A3: {
    id: "A3",
    name: "Preventive Actions & Recovery",
    title: "Action Plan",
    description: "Preventive measures and recovery action recommendations",
    reportType: "action_plan"
  }
};

export const phaseEntityAgentMatrix: Record<AgentPhase, Record<AgentEntityType, AgentDescriptor[]>> = {
  A1: {
    provider: [
      {
        id: "claims_volume_analyzer",
        name: "Claims Volume Analyzer",
        shortName: "Volume",
        description: "Analyzes claims volume patterns, seasonal trends, and anomalies in billing frequency",
        icon: "BarChart3",
        color: "blue",
        metricsRequired: ["claimsCount", "claimsTimeline", "volumeTrends"]
      },
      {
        id: "billing_pattern_investigator",
        name: "Billing Pattern Investigator",
        shortName: "Billing",
        description: "Investigates billing codes, modifier usage, and charge patterns for irregularities",
        icon: "FileSearch",
        color: "indigo",
        metricsRequired: ["billingCodes", "modifierUsage", "chargeDistribution"]
      },
      {
        id: "network_affiliation_reviewer",
        name: "Network Affiliation Reviewer",
        shortName: "Network",
        description: "Reviews provider network relationships, referral patterns, and affiliation anomalies",
        icon: "Network",
        color: "purple",
        metricsRequired: ["networkConnections", "referralPatterns", "affiliations"]
      },
      {
        id: "specialty_compliance_checker",
        name: "Specialty Compliance Checker",
        shortName: "Compliance",
        description: "Checks if services align with provider specialty and credentialing requirements",
        icon: "ShieldCheck",
        color: "green",
        metricsRequired: ["specialtyServices", "credentialStatus", "scopeOfPractice"]
      }
    ],
    patient: [
      {
        id: "treatment_history_analyzer",
        name: "Treatment History Analyzer",
        shortName: "History",
        description: "Analyzes treatment patterns, care continuity, and service utilization history",
        icon: "History",
        color: "blue",
        metricsRequired: ["treatmentTimeline", "careEpisodes", "serviceHistory"]
      },
      {
        id: "medication_pattern_reviewer",
        name: "Medication Pattern Reviewer",
        shortName: "Medication",
        description: "Reviews prescription patterns, medication adherence, and potential drug interactions",
        icon: "Pill",
        color: "rose",
        metricsRequired: ["prescriptionHistory", "medicationList", "refillPatterns"]
      },
      {
        id: "utilization_trend_investigator",
        name: "Utilization Trend Investigator",
        shortName: "Utilization",
        description: "Investigates healthcare utilization trends, ER visits, and hospitalization patterns",
        icon: "TrendingUp",
        color: "amber",
        metricsRequired: ["utilizationMetrics", "erVisits", "admissions"]
      },
      {
        id: "coverage_gap_detector",
        name: "Coverage Gap Detector",
        shortName: "Coverage",
        description: "Detects gaps in coverage, eligibility issues, and coordination of benefits problems",
        icon: "AlertTriangle",
        color: "orange",
        metricsRequired: ["coverageHistory", "eligibilityStatus", "cobDetails"]
      }
    ],
    doctor: [
      {
        id: "referral_pattern_analyzer",
        name: "Referral Pattern Analyzer",
        shortName: "Referrals",
        description: "Analyzes referral patterns, network utilization, and patient routing behaviors",
        icon: "GitBranch",
        color: "blue",
        metricsRequired: ["referralNetwork", "patientRouting", "specialistConnections"]
      },
      {
        id: "prescription_behavior_reviewer",
        name: "Prescription Behavior Reviewer",
        shortName: "Rx Behavior",
        description: "Reviews prescribing patterns, controlled substance ratios, and medication choices",
        icon: "FileText",
        color: "purple",
        metricsRequired: ["prescribingPatterns", "controlledSubstances", "drugClassUsage"]
      },
      {
        id: "procedure_frequency_investigator",
        name: "Procedure Frequency Investigator",
        shortName: "Procedures",
        description: "Investigates procedure frequencies, complexity patterns, and service intensity",
        icon: "Activity",
        color: "green",
        metricsRequired: ["procedureCounts", "complexityScores", "serviceIntensity"]
      },
      {
        id: "peer_comparison_analyst",
        name: "Peer Comparison Analyst",
        shortName: "Peer Compare",
        description: "Compares practice patterns against specialty peers and regional benchmarks",
        icon: "Users",
        color: "cyan",
        metricsRequired: ["peerMetrics", "benchmarkData", "outlierScores"]
      }
    ]
  },
  A2: {
    provider: [
      {
        id: "upcoding_classifier",
        name: "Upcoding Classifier",
        shortName: "Upcoding",
        description: "Classifies potential upcoding by analyzing E&M levels, procedure complexity, and documentation",
        icon: "ArrowUpCircle",
        color: "rose",
        metricsRequired: ["emLevelDistribution", "complexityRatios", "documentationScores"]
      },
      {
        id: "unbundling_detector",
        name: "Unbundling Detector",
        shortName: "Unbundling",
        description: "Detects improper unbundling of services that should be billed as single procedures",
        icon: "Ungroup",
        color: "amber",
        metricsRequired: ["bundledServices", "cciEdits", "modifierPatterns"]
      },
      {
        id: "phantom_billing_identifier",
        name: "Phantom Billing Identifier",
        shortName: "Phantom",
        description: "Identifies potential phantom billing for services not rendered or patients not seen",
        icon: "Ghost",
        color: "purple",
        metricsRequired: ["serviceVerification", "patientPresence", "impossibleDays"]
      },
      {
        id: "duplicate_claims_finder",
        name: "Duplicate Claims Finder",
        shortName: "Duplicates",
        description: "Finds duplicate or near-duplicate claims suggesting double billing attempts",
        icon: "Copy",
        color: "red",
        metricsRequired: ["claimSimilarity", "datePatterns", "serviceOverlaps"]
      }
    ],
    patient: [
      {
        id: "abuse_pattern_classifier",
        name: "Abuse Pattern Classifier",
        shortName: "Abuse",
        description: "Classifies patterns indicating potential benefit abuse or excessive utilization",
        icon: "AlertOctagon",
        color: "rose",
        metricsRequired: ["utilizationAnomalies", "benefitUsage", "excessiveServices"]
      },
      {
        id: "doctor_shopping_detector",
        name: "Doctor Shopping Detector",
        shortName: "Dr Shopping",
        description: "Detects patterns of visiting multiple providers for similar services or prescriptions",
        icon: "UserSearch",
        color: "amber",
        metricsRequired: ["providerCount", "overlappingPrescriptions", "geographicPatterns"]
      },
      {
        id: "prescription_fraud_identifier",
        name: "Prescription Fraud Identifier",
        shortName: "Rx Fraud",
        description: "Identifies potential prescription fraud through pharmacy patterns and medication volumes",
        icon: "FileWarning",
        color: "red",
        metricsRequired: ["pharmacyHopping", "earlyRefills", "controlledSubstanceVolume"]
      },
      {
        id: "coverage_manipulation_finder",
        name: "Coverage Manipulation Finder",
        shortName: "Coverage Fraud",
        description: "Finds potential manipulation of coverage including false eligibility or identity issues",
        icon: "ShieldX",
        color: "purple",
        metricsRequired: ["eligibilityChanges", "addressPatterns", "identityFlags"]
      }
    ],
    doctor: [
      {
        id: "kickback_risk_classifier",
        name: "Kickback Risk Classifier",
        shortName: "Kickback",
        description: "Classifies potential kickback arrangements through referral concentration and patterns",
        icon: "DollarSign",
        color: "rose",
        metricsRequired: ["referralConcentration", "financialRelationships", "volumeCorrelations"]
      },
      {
        id: "self_referral_detector",
        name: "Self-Referral Detector",
        shortName: "Self-Referral",
        description: "Detects potential Stark Law violations through self-referral to owned entities",
        icon: "RotateCcw",
        color: "amber",
        metricsRequired: ["ownershipInterests", "referralDestinations", "ancillaryUsage"]
      },
      {
        id: "unnecessary_procedure_identifier",
        name: "Unnecessary Procedure Identifier",
        shortName: "Unnecessary",
        description: "Identifies potentially unnecessary procedures based on medical necessity criteria",
        icon: "XCircle",
        color: "red",
        metricsRequired: ["medicalNecessity", "procedureJustification", "outcomeData"]
      },
      {
        id: "documentation_fraud_finder",
        name: "Documentation Fraud Finder",
        shortName: "Doc Fraud",
        description: "Finds patterns suggesting documentation fraud including copy-paste and template abuse",
        icon: "FileX",
        color: "purple",
        metricsRequired: ["documentationSimilarity", "templateUsage", "timePatterns"]
      }
    ]
  },
  A3: {
    provider: [
      {
        id: "recovery_amount_calculator",
        name: "Recovery Amount Calculator",
        shortName: "Recovery",
        description: "Calculates potential recovery amounts based on identified overpayments and fraud",
        icon: "Calculator",
        color: "green",
        metricsRequired: ["overpaymentAmounts", "claimValues", "recoveryPotential"]
      },
      {
        id: "penalty_recommender",
        name: "Penalty Recommender",
        shortName: "Penalties",
        description: "Recommends appropriate penalties based on severity, intent, and regulatory guidelines",
        icon: "Gavel",
        color: "amber",
        metricsRequired: ["violationSeverity", "priorHistory", "regulatoryGuidelines"]
      },
      {
        id: "contract_action_planner",
        name: "Contract Action Planner",
        shortName: "Contract",
        description: "Plans contract actions including termination, suspension, or enhanced monitoring",
        icon: "FileContract",
        color: "blue",
        metricsRequired: ["contractStatus", "performanceMetrics", "riskLevel"]
      },
      {
        id: "monitoring_protocol_designer",
        name: "Monitoring Protocol Designer",
        shortName: "Monitoring",
        description: "Designs ongoing monitoring protocols to prevent future FWA occurrences",
        icon: "Eye",
        color: "purple",
        metricsRequired: ["riskFactors", "monitoringHistory", "alertThresholds"]
      }
    ],
    patient: [
      {
        id: "benefit_restriction_planner",
        name: "Benefit Restriction Planner",
        shortName: "Restrictions",
        description: "Plans appropriate benefit restrictions including lock-in programs and prior auth requirements",
        icon: "Lock",
        color: "amber",
        metricsRequired: ["abuseIndicators", "benefitUsage", "restrictionOptions"]
      },
      {
        id: "case_referral_coordinator",
        name: "Case Referral Coordinator",
        shortName: "Case Referral",
        description: "Coordinates case referrals to appropriate agencies including law enforcement if needed",
        icon: "Share2",
        color: "blue",
        metricsRequired: ["caseClassification", "referralCriteria", "agencyGuidelines"]
      },
      {
        id: "education_program_recommender",
        name: "Education Program Recommender",
        shortName: "Education",
        description: "Recommends member education programs to address unintentional benefit misuse",
        icon: "GraduationCap",
        color: "green",
        metricsRequired: ["misusetype", "educationNeeds", "programAvailability"]
      },
      {
        id: "claims_review_scheduler",
        name: "Claims Review Scheduler",
        shortName: "Claims Review",
        description: "Schedules enhanced claims review protocols for future submissions",
        icon: "CalendarCheck",
        color: "purple",
        metricsRequired: ["reviewPriority", "claimsVolume", "resourceAvailability"]
      }
    ],
    doctor: [
      {
        id: "license_review_coordinator",
        name: "License Review Coordinator",
        shortName: "License",
        description: "Coordinates license review referrals to medical boards when appropriate",
        icon: "Award",
        color: "rose",
        metricsRequired: ["licenseStatus", "violationSeverity", "boardGuidelines"]
      },
      {
        id: "practice_audit_planner",
        name: "Practice Audit Planner",
        shortName: "Audit",
        description: "Plans on-site practice audits to verify billing and documentation practices",
        icon: "ClipboardCheck",
        color: "blue",
        metricsRequired: ["auditPriority", "practiceProfile", "auditScope"]
      },
      {
        id: "peer_review_scheduler",
        name: "Peer Review Scheduler",
        shortName: "Peer Review",
        description: "Schedules peer review of clinical decisions and medical necessity determinations",
        icon: "UserCheck",
        color: "green",
        metricsRequired: ["caseSelection", "reviewerAvailability", "clinicalCriteria"]
      },
      {
        id: "compliance_training_recommender",
        name: "Compliance Training Recommender",
        shortName: "Training",
        description: "Recommends targeted compliance training based on identified deficiencies",
        icon: "BookOpen",
        color: "purple",
        metricsRequired: ["complianceGaps", "trainingModules", "certificationStatus"]
      }
    ]
  }
};

export function getAgentsForPhaseAndEntity(phase: AgentPhase, entityType: AgentEntityType): AgentDescriptor[] {
  return phaseEntityAgentMatrix[phase]?.[entityType] || [];
}

export function getPhaseConfig(phase: AgentPhase): PhaseConfig {
  return phaseConfigs[phase];
}

export function getAllPhases(): AgentPhase[] {
  return ["A1", "A2", "A3"];
}

export function getAllEntityTypes(): AgentEntityType[] {
  return ["provider", "patient", "doctor"];
}
