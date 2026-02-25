export interface DemoProvider {
  id: string;
  providerId: string;
  providerName: string;
  providerType: string;
  specialty: string;
  organization: string;
  riskScore: string;
  riskLevel: string;
  totalClaims: number;
  flaggedClaims: number;
  denialRate: string;
  avgClaimAmount: string;
  totalExposure: string;
  claimsPerMonth: string;
  cpmTrend: string;
  cpmPeerAverage: string;
  fwaCaseCount: number;
  reasons: string[];
  lastFlaggedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DemoPatient {
  id: string;
  patientId: string;
  patientName: string;
  memberId: string;
  dateOfBirth: Date;
  gender: string;
  riskScore: string;
  riskLevel: string;
  totalClaims: number;
  flaggedClaims: number;
  totalAmount: string;
  avgClaimAmount: string;
  visitCount: number;
  uniqueProviders: number;
  primaryDiagnosis: string;
  fwaCaseCount: number;
  reasons: string[];
  lastClaimDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DemoDoctor {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  licenseNumber: string;
  practiceType: string;
  organization: string;
  riskScore: string;
  riskLevel: string;
  totalClaims: number;
  flaggedClaims: number;
  denialRate: string;
  avgClaimAmount: string;
  totalExposure: string;
  referralCount: number;
  uniquePatients: number;
  fwaCaseCount: number;
  reasons: string[];
  lastFlaggedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DemoFwaCase {
  id: string;
  caseId: string;
  entityId: string;
  entityType: "provider" | "patient" | "doctor";
  entityName: string;
  caseType: string;
  status: string;
  priority: string;
  phase: "A1" | "A2" | "A3";
  exposureAmount: string;
  recoveryAmount: string;
  assignedTo: string;
  findings: any[];
  recommendations: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DemoPreAuthClaim {
  id: string;
  claimId: string;
  patientName: string;
  patientId: string;
  providerId: string;
  providerName: string;
  serviceType: string;
  diagnosisCode: string;
  procedureCode: string;
  requestedAmount: string;
  status: string;
  workflowPhase: number;
  riskScore: string;
  signals: any[];
  createdAt: Date;
  updatedAt: Date;
}

export const demoProviders: DemoProvider[] = [
  {
    id: "prov-1",
    providerId: "FAC-001",
    providerName: "King Faisal Specialist Hospital",
    providerType: "Hospital",
    specialty: "Multi-Specialty",
    organization: "Ministry of Health",
    riskScore: "87.50",
    riskLevel: "critical",
    totalClaims: 4532,
    flaggedClaims: 847,
    denialRate: "18.69",
    avgClaimAmount: "8520.00",
    totalExposure: "7217640.00",
    claimsPerMonth: "378.50",
    cpmTrend: "12.30",
    cpmPeerAverage: "285.00",
    fwaCaseCount: 12,
    reasons: ["Coding FWA: Upcoding", "Coding FWA: Unbundling", "Physician FWA: Kickbacks"],
    lastFlaggedDate: new Date("2025-12-15"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "prov-2",
    providerId: "FAC-002",
    providerName: "Saudi German Hospital Riyadh",
    providerType: "Hospital",
    specialty: "General Hospital",
    organization: "Saudi German Health Group",
    riskScore: "72.30",
    riskLevel: "high",
    totalClaims: 3218,
    flaggedClaims: 438,
    denialRate: "13.61",
    avgClaimAmount: "6890.00",
    totalExposure: "3017820.00",
    claimsPerMonth: "268.17",
    cpmTrend: "8.50",
    cpmPeerAverage: "245.00",
    fwaCaseCount: 8,
    reasons: ["Coding FWA: Duplicate Claims", "Management FWA: Billing Fraud"],
    lastFlaggedDate: new Date("2025-12-10"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "prov-3",
    providerId: "FAC-003",
    providerName: "Al-Nahdi Medical Pharmacy",
    providerType: "Pharmacy",
    specialty: "Retail Pharmacy",
    organization: "Al-Nahdi Medical Company",
    riskScore: "65.80",
    riskLevel: "high",
    totalClaims: 8956,
    flaggedClaims: 724,
    denialRate: "8.08",
    avgClaimAmount: "285.00",
    totalExposure: "206340.00",
    claimsPerMonth: "746.33",
    cpmTrend: "15.20",
    cpmPeerAverage: "520.00",
    fwaCaseCount: 5,
    reasons: ["Management FWA: Phantom Billing", "Coding FWA: Drug Switching"],
    lastFlaggedDate: new Date("2025-12-08"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "prov-4",
    providerId: "FAC-004",
    providerName: "Dallah Health Clinic",
    providerType: "Clinic",
    specialty: "Primary Care",
    organization: "Dallah Healthcare Group",
    riskScore: "52.40",
    riskLevel: "medium",
    totalClaims: 1289,
    flaggedClaims: 131,
    denialRate: "10.16",
    avgClaimAmount: "450.00",
    totalExposure: "58950.00",
    claimsPerMonth: "107.42",
    cpmTrend: "-3.20",
    cpmPeerAverage: "125.00",
    fwaCaseCount: 3,
    reasons: ["Physician FWA: Self-Referral"],
    lastFlaggedDate: new Date("2025-11-28"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "prov-5",
    providerId: "FAC-005",
    providerName: "Dr. Sulaiman Al Habib Medical Center",
    providerType: "Hospital",
    specialty: "Multi-Specialty",
    organization: "HMG Healthcare",
    riskScore: "48.20",
    riskLevel: "medium",
    totalClaims: 5678,
    flaggedClaims: 318,
    denialRate: "5.60",
    avgClaimAmount: "7250.00",
    totalExposure: "2305500.00",
    claimsPerMonth: "473.17",
    cpmTrend: "2.10",
    cpmPeerAverage: "450.00",
    fwaCaseCount: 4,
    reasons: ["Coding FWA: Modifier Misuse"],
    lastFlaggedDate: new Date("2025-11-15"),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const demoPatients: DemoPatient[] = [
  {
    id: "pat-1",
    patientId: "PAT-1001",
    patientName: "Mohammed Al-Rashid",
    memberId: "MEM-2024-00145",
    dateOfBirth: new Date("1975-03-15"),
    gender: "Male",
    riskScore: "82.50",
    riskLevel: "critical",
    totalClaims: 156,
    flaggedClaims: 42,
    totalAmount: "287500.00",
    avgClaimAmount: "1843.27",
    visitCount: 89,
    uniqueProviders: 23,
    primaryDiagnosis: "Chronic Pain Syndrome",
    fwaCaseCount: 4,
    reasons: ["Patient FWA: Doctor Shopping", "Patient FWA: Prescription Fraud"],
    lastClaimDate: new Date("2025-12-28"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "pat-2",
    patientId: "PAT-1002",
    patientName: "Fatima Al-Zahrani",
    memberId: "MEM-2024-00289",
    dateOfBirth: new Date("1988-07-22"),
    gender: "Female",
    riskScore: "71.30",
    riskLevel: "high",
    totalClaims: 98,
    flaggedClaims: 28,
    totalAmount: "145680.00",
    avgClaimAmount: "1486.53",
    visitCount: 52,
    uniqueProviders: 15,
    primaryDiagnosis: "Fibromyalgia",
    fwaCaseCount: 3,
    reasons: ["Patient FWA: Benefit Abuse", "Patient FWA: Excessive ER Visits"],
    lastClaimDate: new Date("2025-12-25"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "pat-3",
    patientId: "PAT-1003",
    patientName: "Abdullah Al-Saud",
    memberId: "MEM-2024-00456",
    dateOfBirth: new Date("1965-11-08"),
    gender: "Male",
    riskScore: "64.80",
    riskLevel: "high",
    totalClaims: 234,
    flaggedClaims: 31,
    totalAmount: "523450.00",
    avgClaimAmount: "2237.39",
    visitCount: 124,
    uniqueProviders: 8,
    primaryDiagnosis: "Type 2 Diabetes",
    fwaCaseCount: 2,
    reasons: ["Patient FWA: Duplicate Claims from Multiple Providers"],
    lastClaimDate: new Date("2025-12-20"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "pat-4",
    patientId: "PAT-1004",
    patientName: "Noura Al-Qahtani",
    memberId: "MEM-2024-00612",
    dateOfBirth: new Date("1992-04-30"),
    gender: "Female",
    riskScore: "45.20",
    riskLevel: "medium",
    totalClaims: 67,
    flaggedClaims: 12,
    totalAmount: "89340.00",
    avgClaimAmount: "1333.43",
    visitCount: 34,
    uniqueProviders: 6,
    primaryDiagnosis: "Anxiety Disorder",
    fwaCaseCount: 1,
    reasons: ["Patient FWA: Prescription Hoarding"],
    lastClaimDate: new Date("2025-12-18"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "pat-5",
    patientId: "PAT-1005",
    patientName: "Khalid Al-Harbi",
    memberId: "MEM-2024-00789",
    dateOfBirth: new Date("1980-09-12"),
    gender: "Male",
    riskScore: "38.90",
    riskLevel: "low",
    totalClaims: 45,
    flaggedClaims: 5,
    totalAmount: "67250.00",
    avgClaimAmount: "1494.44",
    visitCount: 28,
    uniqueProviders: 4,
    primaryDiagnosis: "Hypertension",
    fwaCaseCount: 0,
    reasons: [],
    lastClaimDate: new Date("2025-12-15"),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const demoDoctors: DemoDoctor[] = [
  {
    id: "doc-1",
    doctorId: "DOC-001",
    doctorName: "Dr. Ahmad Al-Farhan",
    specialty: "Pain Management",
    licenseNumber: "SCFHS-PM-2018-4521",
    practiceType: "Specialist",
    organization: "King Faisal Specialist Hospital",
    riskScore: "78.50",
    riskLevel: "high",
    totalClaims: 2847,
    flaggedClaims: 512,
    denialRate: "17.98",
    avgClaimAmount: "1250.00",
    totalExposure: "640000.00",
    referralCount: 892,
    uniquePatients: 456,
    fwaCaseCount: 7,
    reasons: ["Physician FWA: Excessive Opioid Prescribing", "Physician FWA: Self-Referral"],
    lastFlaggedDate: new Date("2025-12-20"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "doc-2",
    doctorId: "DOC-002",
    doctorName: "Dr. Saleh Al-Mutairi",
    specialty: "Orthopedic Surgery",
    licenseNumber: "SCFHS-OS-2015-2341",
    practiceType: "Surgeon",
    organization: "Saudi German Hospital",
    riskScore: "68.30",
    riskLevel: "high",
    totalClaims: 1567,
    flaggedClaims: 287,
    denialRate: "18.31",
    avgClaimAmount: "4500.00",
    totalExposure: "1291500.00",
    referralCount: 234,
    uniquePatients: 189,
    fwaCaseCount: 5,
    reasons: ["Physician FWA: Unnecessary Procedures", "Coding FWA: Upcoding"],
    lastFlaggedDate: new Date("2025-12-15"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "doc-3",
    doctorId: "DOC-003",
    doctorName: "Dr. Layla Al-Shammari",
    specialty: "Dermatology",
    licenseNumber: "SCFHS-DM-2019-7823",
    practiceType: "Specialist",
    organization: "Dallah Health Clinic",
    riskScore: "54.20",
    riskLevel: "medium",
    totalClaims: 1234,
    flaggedClaims: 98,
    denialRate: "7.94",
    avgClaimAmount: "850.00",
    totalExposure: "83300.00",
    referralCount: 156,
    uniquePatients: 567,
    fwaCaseCount: 2,
    reasons: ["Coding FWA: Bundling Issues"],
    lastFlaggedDate: new Date("2025-11-28"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "doc-4",
    doctorId: "DOC-004",
    doctorName: "Dr. Omar Al-Dosari",
    specialty: "Cardiology",
    licenseNumber: "SCFHS-CD-2012-1456",
    practiceType: "Specialist",
    organization: "Dr. Sulaiman Al Habib Medical Center",
    riskScore: "42.10",
    riskLevel: "medium",
    totalClaims: 2156,
    flaggedClaims: 167,
    denialRate: "7.75",
    avgClaimAmount: "2100.00",
    totalExposure: "350700.00",
    referralCount: 312,
    uniquePatients: 789,
    fwaCaseCount: 2,
    reasons: ["Coding FWA: Modifier Misuse"],
    lastFlaggedDate: new Date("2025-11-20"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "doc-5",
    doctorId: "DOC-005",
    doctorName: "Dr. Hana Al-Otaibi",
    specialty: "Family Medicine",
    licenseNumber: "SCFHS-FM-2020-9234",
    practiceType: "Primary Care",
    organization: "National Guard Health Affairs",
    riskScore: "28.50",
    riskLevel: "low",
    totalClaims: 3456,
    flaggedClaims: 123,
    denialRate: "3.56",
    avgClaimAmount: "320.00",
    totalExposure: "39360.00",
    referralCount: 567,
    uniquePatients: 1234,
    fwaCaseCount: 1,
    reasons: [],
    lastFlaggedDate: new Date("2025-10-15"),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const demoFwaCases: DemoFwaCase[] = [
  {
    id: "case-1",
    caseId: "FWA-2025-001",
    entityId: "FAC-001",
    entityType: "provider",
    entityName: "King Faisal Specialist Hospital",
    caseType: "Upcoding Scheme",
    status: "under_investigation",
    priority: "critical",
    phase: "A2",
    exposureAmount: "2450000.00",
    recoveryAmount: "0.00",
    assignedTo: "FWA Unit Team A",
    findings: [
      { title: "Systematic E&M Upcoding", severity: "critical", confidence: 0.94 },
      { title: "Documentation Deficiencies", severity: "high", confidence: 0.87 }
    ],
    recommendations: [
      { action: "Initiate formal investigation", priority: "high" },
      { action: "Request complete medical records", priority: "high" }
    ],
    createdAt: new Date("2025-11-01"),
    updatedAt: new Date("2025-12-28")
  },
  {
    id: "case-2",
    caseId: "FWA-2025-002",
    entityId: "PAT-1001",
    entityType: "patient",
    entityName: "Mohammed Al-Rashid",
    caseType: "Doctor Shopping",
    status: "recovery_initiated",
    priority: "high",
    phase: "A3",
    exposureAmount: "125000.00",
    recoveryAmount: "45000.00",
    assignedTo: "FWA Unit Team B",
    findings: [
      { title: "Multiple Provider Visits for Same Condition", severity: "high", confidence: 0.89 },
      { title: "Overlapping Prescriptions", severity: "high", confidence: 0.92 }
    ],
    recommendations: [
      { action: "Lock-in program enrollment", priority: "high" },
      { action: "Recovery of overpayments", priority: "high" }
    ],
    createdAt: new Date("2025-10-15"),
    updatedAt: new Date("2025-12-20")
  },
  {
    id: "case-3",
    caseId: "FWA-2025-003",
    entityId: "DOC-001",
    entityType: "doctor",
    entityName: "Dr. Ahmad Al-Farhan",
    caseType: "Kickback Arrangement",
    status: "pending_action",
    priority: "critical",
    phase: "A2",
    exposureAmount: "890000.00",
    recoveryAmount: "0.00",
    assignedTo: "FWA Unit Team A",
    findings: [
      { title: "Concentrated Referral Pattern", severity: "critical", confidence: 0.91 },
      { title: "Financial Relationship Evidence", severity: "high", confidence: 0.85 }
    ],
    recommendations: [
      { action: "Refer to regulatory authority", priority: "high" },
      { action: "Contract suspension review", priority: "high" }
    ],
    createdAt: new Date("2025-09-20"),
    updatedAt: new Date("2025-12-15")
  },
  {
    id: "case-4",
    caseId: "FWA-2025-004",
    entityId: "FAC-003",
    entityType: "provider",
    entityName: "Al-Nahdi Medical Pharmacy",
    caseType: "Phantom Billing",
    status: "closed_recovered",
    priority: "high",
    phase: "A3",
    exposureAmount: "178000.00",
    recoveryAmount: "156000.00",
    assignedTo: "FWA Unit Team C",
    findings: [
      { title: "Billing for Non-Dispensed Medications", severity: "high", confidence: 0.96 },
      { title: "Inventory Discrepancies", severity: "medium", confidence: 0.88 }
    ],
    recommendations: [
      { action: "Enhanced monitoring implemented", priority: "medium" },
      { action: "Quarterly audits scheduled", priority: "medium" }
    ],
    createdAt: new Date("2025-06-10"),
    updatedAt: new Date("2025-11-30")
  },
  {
    id: "case-5",
    caseId: "FWA-2025-005",
    entityId: "DOC-002",
    entityType: "doctor",
    entityName: "Dr. Saleh Al-Mutairi",
    caseType: "Unnecessary Procedures",
    status: "under_investigation",
    priority: "high",
    phase: "A1",
    exposureAmount: "567000.00",
    recoveryAmount: "0.00",
    assignedTo: "FWA Unit Team B",
    findings: [
      { title: "High Procedure Rate vs Peers", severity: "high", confidence: 0.82 },
      { title: "Questionable Medical Necessity", severity: "medium", confidence: 0.76 }
    ],
    recommendations: [
      { action: "Medical record review", priority: "high" },
      { action: "Peer comparison analysis", priority: "medium" }
    ],
    createdAt: new Date("2025-11-20"),
    updatedAt: new Date("2025-12-28")
  }
];

export const demoPreAuthClaims: DemoPreAuthClaim[] = [
  {
    id: "preauth-1",
    claimId: "PA-2025-00145",
    patientName: "Abdullah Al-Saud",
    patientId: "PAT-1003",
    providerId: "FAC-001",
    providerName: "King Faisal Specialist Hospital",
    serviceType: "Cardiac Surgery",
    diagnosisCode: "I25.10",
    procedureCode: "33533",
    requestedAmount: "185000.00",
    status: "approved",
    workflowPhase: 6,
    riskScore: "32.5",
    signals: [
      { agent: "regulatory_compliance", signal: "approve", confidence: 0.95 },
      { agent: "clinical_necessity", signal: "approve", confidence: 0.92 },
      { agent: "coverage_eligibility", signal: "approve", confidence: 0.98 }
    ],
    createdAt: new Date("2025-12-20"),
    updatedAt: new Date("2025-12-22")
  },
  {
    id: "preauth-2",
    claimId: "PA-2025-00146",
    patientName: "Fatima Al-Zahrani",
    patientId: "PAT-1002",
    providerId: "FAC-002",
    providerName: "Saudi German Hospital",
    serviceType: "Spinal Fusion",
    diagnosisCode: "M54.5",
    procedureCode: "22612",
    requestedAmount: "125000.00",
    status: "pending_review",
    workflowPhase: 4,
    riskScore: "68.2",
    signals: [
      { agent: "regulatory_compliance", signal: "approve", confidence: 0.88 },
      { agent: "clinical_necessity", signal: "review", confidence: 0.65 },
      { agent: "past_patterns", signal: "escalate", confidence: 0.78 }
    ],
    createdAt: new Date("2025-12-25"),
    updatedAt: new Date("2025-12-27")
  },
  {
    id: "preauth-3",
    claimId: "PA-2025-00147",
    patientName: "Mohammed Al-Rashid",
    patientId: "PAT-1001",
    providerId: "DOC-001",
    providerName: "Dr. Ahmad Al-Farhan",
    serviceType: "Pain Management Procedure",
    diagnosisCode: "G89.29",
    procedureCode: "64483",
    requestedAmount: "8500.00",
    status: "rejected",
    workflowPhase: 6,
    riskScore: "89.4",
    signals: [
      { agent: "past_patterns", signal: "reject", confidence: 0.92 },
      { agent: "disclosure_check", signal: "reject", confidence: 0.88 },
      { agent: "clinical_necessity", signal: "reject", confidence: 0.85 }
    ],
    createdAt: new Date("2025-12-26"),
    updatedAt: new Date("2025-12-28")
  },
  {
    id: "preauth-4",
    claimId: "PA-2025-00148",
    patientName: "Noura Al-Qahtani",
    patientId: "PAT-1004",
    providerId: "FAC-004",
    providerName: "Dallah Health Clinic",
    serviceType: "Mental Health Therapy",
    diagnosisCode: "F41.1",
    procedureCode: "90837",
    requestedAmount: "2400.00",
    status: "processing",
    workflowPhase: 2,
    riskScore: "28.1",
    signals: [
      { agent: "regulatory_compliance", signal: "approve", confidence: 0.96 }
    ],
    createdAt: new Date("2025-12-28"),
    updatedAt: new Date("2025-12-28")
  },
  {
    id: "preauth-5",
    claimId: "PA-2025-00149",
    patientName: "Khalid Al-Harbi",
    patientId: "PAT-1005",
    providerId: "DOC-004",
    providerName: "Dr. Omar Al-Dosari",
    serviceType: "Cardiac Catheterization",
    diagnosisCode: "I25.11",
    procedureCode: "93458",
    requestedAmount: "45000.00",
    status: "pending_review",
    workflowPhase: 3,
    riskScore: "41.5",
    signals: [
      { agent: "regulatory_compliance", signal: "approve", confidence: 0.94 },
      { agent: "coverage_eligibility", signal: "approve", confidence: 0.91 }
    ],
    createdAt: new Date("2025-12-27"),
    updatedAt: new Date("2025-12-28")
  }
];

export function seedAllDemoData() {
  return {
    providers: demoProviders,
    patients: demoPatients,
    doctors: demoDoctors,
    fwaCases: demoFwaCases,
    preAuthClaims: demoPreAuthClaims
  };
}

export function getProviderById(id: string): DemoProvider | undefined {
  return demoProviders.find(p => p.providerId === id || p.id === id);
}

export function getPatientById(id: string): DemoPatient | undefined {
  return demoPatients.find(p => p.patientId === id || p.id === id);
}

export function getDoctorById(id: string): DemoDoctor | undefined {
  return demoDoctors.find(d => d.doctorId === id || d.id === id);
}

export function getEntityData(entityType: string, entityId: string): any {
  switch (entityType) {
    case "provider":
      return getProviderById(entityId);
    case "patient":
      return getPatientById(entityId);
    case "doctor":
      return getDoctorById(entityId);
    default:
      return null;
  }
}

export function getDemoStats() {
  return {
    totalProviders: demoProviders.length,
    highRiskProviders: demoProviders.filter(p => p.riskLevel === "critical" || p.riskLevel === "high").length,
    totalPatients: demoPatients.length,
    highRiskPatients: demoPatients.filter(p => p.riskLevel === "critical" || p.riskLevel === "high").length,
    totalDoctors: demoDoctors.length,
    highRiskDoctors: demoDoctors.filter(d => d.riskLevel === "critical" || d.riskLevel === "high").length,
    activeFwaCases: demoFwaCases.filter(c => c.status !== "closed_recovered").length,
    totalExposure: demoFwaCases.reduce((sum, c) => sum + parseFloat(c.exposureAmount), 0),
    totalRecovered: demoFwaCases.reduce((sum, c) => sum + parseFloat(c.recoveryAmount), 0),
    pendingPreAuth: demoPreAuthClaims.filter(c => c.status === "pending_review" || c.status === "processing").length,
    totalClaims: demoClaims.length,
    flaggedClaims: demoClaims.filter(c => c.flags && c.flags.length > 0).length,
    totalRules: demoClaimsRules.length,
    activeRules: demoClaimsRules.filter(r => r.status === "active").length,
    totalContracts: demoProviderContracts.length,
    activeContracts: demoProviderContracts.filter(c => c.status === "active").length
  };
}

// Demo Claims (for Claims Management module)
export interface DemoClaim {
  id: string;
  claimId: string;
  providerId: string;
  providerName: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  serviceDate: Date;
  submissionDate: Date;
  claimAmount: string;
  approvedAmount: string;
  status: "pending" | "approved" | "denied" | "flagged" | "under_review";
  claimType: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  flags: string[];
  ruleViolations: string[];
  adjudicationPhase: number;
  aiConfidence: number;
  notes: string;
}

export const demoClaims: DemoClaim[] = [
  {
    id: "claim-001",
    claimId: "CLM-2025-001847",
    providerId: "provider-001",
    providerName: "King Faisal Specialist Hospital",
    patientId: "patient-001",
    patientName: "Abdullah Al-Rashid",
    doctorId: "doctor-001",
    doctorName: "Dr. Ahmed Al-Farsi",
    serviceDate: new Date("2025-12-15"),
    submissionDate: new Date("2025-12-18"),
    claimAmount: "45750",
    approvedAmount: "0",
    status: "flagged",
    claimType: "Inpatient Surgery",
    diagnosisCodes: ["K80.10", "K81.0"],
    procedureCodes: ["47562", "47563"],
    flags: ["Upcoding suspected", "High claim amount"],
    ruleViolations: ["RULE-003", "RULE-007"],
    adjudicationPhase: 3,
    aiConfidence: 0.87,
    notes: "Cholecystectomy with possible unbundling of services"
  },
  {
    id: "claim-002",
    claimId: "CLM-2025-001923",
    providerId: "provider-002",
    providerName: "Saudi German Hospital",
    patientId: "patient-002",
    patientName: "Fatima Al-Ghamdi",
    doctorId: "doctor-002",
    doctorName: "Dr. Layla Al-Saud",
    serviceDate: new Date("2025-12-20"),
    submissionDate: new Date("2025-12-22"),
    claimAmount: "28500",
    approvedAmount: "28500",
    status: "approved",
    claimType: "Oncology Treatment",
    diagnosisCodes: ["C50.911"],
    procedureCodes: ["96413", "96415"],
    flags: [],
    ruleViolations: [],
    adjudicationPhase: 6,
    aiConfidence: 0.95,
    notes: "Chemotherapy administration - pre-authorized"
  },
  {
    id: "claim-003",
    claimId: "CLM-2025-002104",
    providerId: "provider-003",
    providerName: "Dr. Sulaiman Al-Habib Medical Group",
    patientId: "patient-003",
    patientName: "Mohammed Al-Zahrani",
    doctorId: "doctor-003",
    doctorName: "Dr. Khalid Al-Mutairi",
    serviceDate: new Date("2025-12-22"),
    submissionDate: new Date("2025-12-24"),
    claimAmount: "156000",
    approvedAmount: "0",
    status: "under_review",
    claimType: "Cardiac Surgery",
    diagnosisCodes: ["I25.10", "I25.2"],
    procedureCodes: ["33533", "33534", "33535"],
    flags: ["Procedure complexity mismatch", "Multiple procedures same day"],
    ruleViolations: ["RULE-012", "RULE-015"],
    adjudicationPhase: 4,
    aiConfidence: 0.72,
    notes: "CABG procedure - requires clinical governance review"
  },
  {
    id: "claim-004",
    claimId: "CLM-2025-002287",
    providerId: "provider-004",
    providerName: "National Guard Health Affairs",
    patientId: "patient-004",
    patientName: "Nora Al-Otaibi",
    doctorId: "doctor-004",
    doctorName: "Dr. Sara Al-Dosari",
    serviceDate: new Date("2025-12-28"),
    submissionDate: new Date("2025-12-30"),
    claimAmount: "8750",
    approvedAmount: "0",
    status: "denied",
    claimType: "Outpatient Physical Therapy",
    diagnosisCodes: ["M54.5"],
    procedureCodes: ["97110", "97140", "97530"],
    flags: ["Excessive sessions", "Missing documentation"],
    ruleViolations: ["RULE-021", "RULE-022"],
    adjudicationPhase: 6,
    aiConfidence: 0.91,
    notes: "Denied - exceeds coverage limits without medical necessity documentation"
  },
  {
    id: "claim-005",
    claimId: "CLM-2025-002445",
    providerId: "provider-005",
    providerName: "Al-Noor Specialist Hospital",
    patientId: "patient-005",
    patientName: "Hassan Al-Shammari",
    doctorId: "doctor-005",
    doctorName: "Dr. Omar Al-Qahtani",
    serviceDate: new Date("2025-12-30"),
    submissionDate: new Date("2026-01-02"),
    claimAmount: "67500",
    approvedAmount: "0",
    status: "pending",
    claimType: "Emergency Care",
    diagnosisCodes: ["I21.4", "I50.9"],
    procedureCodes: ["92920", "93458"],
    flags: [],
    ruleViolations: [],
    adjudicationPhase: 2,
    aiConfidence: 0.88,
    notes: "STEMI with PCI - awaiting analysis phase completion"
  }
];

// Demo Claims Rules (for Clinical Governance)
export interface DemoClaimsRule {
  id: string;
  ruleId: string;
  ruleName: string;
  category: "coding" | "billing" | "medical_necessity" | "documentation" | "compliance";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "inactive" | "testing";
  triggerConditions: string[];
  actions: string[];
  violationCount: number;
  lastTriggered: Date | null;
  createdAt: Date;
}

export const demoClaimsRules: DemoClaimsRule[] = [
  {
    id: "rule-001",
    ruleId: "RULE-003",
    ruleName: "High-Value Claim Threshold",
    category: "billing",
    description: "Flag claims exceeding SAR 50,000 for manual review",
    severity: "high",
    status: "active",
    triggerConditions: ["claim_amount > 50000", "no_pre_authorization"],
    actions: ["flag_for_review", "notify_supervisor", "require_documentation"],
    violationCount: 127,
    lastTriggered: new Date("2025-12-28"),
    createdAt: new Date("2024-01-15")
  },
  {
    id: "rule-002",
    ruleId: "RULE-007",
    ruleName: "Upcoding Detection - E&M Codes",
    category: "coding",
    description: "Detect potential upcoding of evaluation and management codes",
    severity: "critical",
    status: "active",
    triggerConditions: ["e&m_code_level_4_or_5", "documentation_score < 0.7"],
    actions: ["flag_for_audit", "calculate_overpayment", "add_to_fwa_watchlist"],
    violationCount: 89,
    lastTriggered: new Date("2025-12-30"),
    createdAt: new Date("2024-02-20")
  },
  {
    id: "rule-003",
    ruleId: "RULE-012",
    ruleName: "Multiple Procedures Same Day",
    category: "medical_necessity",
    description: "Review claims with 3+ procedures on same service date",
    severity: "medium",
    status: "active",
    triggerConditions: ["procedure_count >= 3", "same_service_date"],
    actions: ["clinical_review_required", "request_operative_notes"],
    violationCount: 234,
    lastTriggered: new Date("2025-12-29"),
    createdAt: new Date("2024-03-10")
  },
  {
    id: "rule-004",
    ruleId: "RULE-015",
    ruleName: "Unbundling Detection - Surgical Packages",
    category: "coding",
    description: "Detect unbundling of surgical procedures that should be billed together",
    severity: "high",
    status: "active",
    triggerConditions: ["procedure_in_surgical_bundle", "billed_separately"],
    actions: ["recalculate_payment", "apply_bundling_edit", "notify_provider"],
    violationCount: 156,
    lastTriggered: new Date("2025-12-27"),
    createdAt: new Date("2024-04-05")
  },
  {
    id: "rule-005",
    ruleId: "RULE-021",
    ruleName: "Session Limit Exceeded",
    category: "compliance",
    description: "Flag therapy claims exceeding annual session limits",
    severity: "medium",
    status: "active",
    triggerConditions: ["therapy_sessions > annual_limit", "no_extension_approved"],
    actions: ["deny_claim", "notify_member", "offer_appeal_process"],
    violationCount: 78,
    lastTriggered: new Date("2025-12-30"),
    createdAt: new Date("2024-05-12")
  }
];

// Demo QA Findings
export interface DemoQAFinding {
  id: string;
  findingId: string;
  claimId: string;
  ruleId: string;
  findingType: "coding_error" | "documentation_gap" | "policy_violation" | "fwa_indicator";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendation: string;
  status: "open" | "resolved" | "escalated" | "disputed";
  assignedTo: string;
  createdAt: Date;
  resolvedAt: Date | null;
}

export const demoQAFindings: DemoQAFinding[] = [
  {
    id: "qa-001",
    findingId: "QA-2025-0847",
    claimId: "CLM-2025-001847",
    ruleId: "RULE-007",
    findingType: "coding_error",
    severity: "high",
    description: "CPT code 47563 billed alongside 47562 without modifier 59 justification",
    recommendation: "Request documentation supporting separate procedure or deny secondary code",
    status: "open",
    assignedTo: "Sarah Al-Mahmoud",
    createdAt: new Date("2025-12-19"),
    resolvedAt: null
  },
  {
    id: "qa-002",
    findingId: "QA-2025-0912",
    claimId: "CLM-2025-002104",
    ruleId: "RULE-012",
    findingType: "documentation_gap",
    severity: "medium",
    description: "Operative notes incomplete for multi-vessel CABG procedure",
    recommendation: "Request complete operative notes before processing",
    status: "escalated",
    assignedTo: "Dr. Ahmed Al-Rashid",
    createdAt: new Date("2025-12-25"),
    resolvedAt: null
  },
  {
    id: "qa-003",
    findingId: "QA-2025-0978",
    claimId: "CLM-2025-002287",
    ruleId: "RULE-021",
    findingType: "policy_violation",
    severity: "medium",
    description: "Physical therapy sessions exceed annual limit of 24 without prior approval",
    recommendation: "Deny claim - member exceeded coverage; offer appeal process",
    status: "resolved",
    assignedTo: "Fatima Al-Harbi",
    createdAt: new Date("2025-12-31"),
    resolvedAt: new Date("2026-01-02")
  }
];

// Demo Provider Contracts (for Provider Relations)
export interface DemoProviderContract {
  id: string;
  contractId: string;
  providerId: string;
  providerName: string;
  contractType: "standard" | "preferred" | "exclusive" | "specialty";
  effectiveDate: Date;
  expirationDate: Date;
  status: "active" | "expired" | "pending_renewal" | "terminated";
  reimbursementRate: number;
  capitation: boolean;
  annualVolume: string;
  performanceScore: number;
  lastAuditDate: Date | null;
  terms: string[];
}

export const demoProviderContracts: DemoProviderContract[] = [
  {
    id: "contract-001",
    contractId: "CON-2024-0145",
    providerId: "provider-001",
    providerName: "King Faisal Specialist Hospital",
    contractType: "preferred",
    effectiveDate: new Date("2024-01-01"),
    expirationDate: new Date("2026-12-31"),
    status: "active",
    reimbursementRate: 92,
    capitation: false,
    annualVolume: "45000000",
    performanceScore: 78,
    lastAuditDate: new Date("2025-06-15"),
    terms: ["Quarterly performance review", "FWA compliance clause", "30-day payment terms"]
  },
  {
    id: "contract-002",
    contractId: "CON-2024-0189",
    providerId: "provider-002",
    providerName: "Saudi German Hospital",
    contractType: "standard",
    effectiveDate: new Date("2024-03-01"),
    expirationDate: new Date("2025-02-28"),
    status: "pending_renewal",
    reimbursementRate: 85,
    capitation: false,
    annualVolume: "28000000",
    performanceScore: 91,
    lastAuditDate: new Date("2025-09-20"),
    terms: ["Annual renewal option", "Quality metrics bonus", "45-day payment terms"]
  },
  {
    id: "contract-003",
    contractId: "CON-2024-0256",
    providerId: "provider-003",
    providerName: "Dr. Sulaiman Al-Habib Medical Group",
    contractType: "exclusive",
    effectiveDate: new Date("2024-06-01"),
    expirationDate: new Date("2027-05-31"),
    status: "active",
    reimbursementRate: 95,
    capitation: true,
    annualVolume: "75000000",
    performanceScore: 94,
    lastAuditDate: new Date("2025-11-10"),
    terms: ["Exclusive specialty network", "Capitated payments", "Risk-sharing arrangement"]
  }
];

// Demo Provider Communications
export interface DemoProviderCommunication {
  id: string;
  communicationId: string;
  providerId: string;
  providerName: string;
  type: "letter" | "email" | "call" | "meeting" | "audit_notice";
  subject: string;
  status: "sent" | "delivered" | "read" | "responded" | "escalated";
  priority: "low" | "medium" | "high" | "urgent";
  sentAt: Date;
  respondedAt: Date | null;
  content: string;
  attachments: string[];
}

export const demoProviderCommunications: DemoProviderCommunication[] = [
  {
    id: "comm-001",
    communicationId: "COMM-2025-4521",
    providerId: "provider-001",
    providerName: "King Faisal Specialist Hospital",
    type: "audit_notice",
    subject: "Notice of Claims Audit - December 2025",
    status: "delivered",
    priority: "high",
    sentAt: new Date("2025-12-20"),
    respondedAt: null,
    content: "Formal notice of scheduled claims audit covering Q4 2025 submissions",
    attachments: ["audit_scope.pdf", "document_request_list.pdf"]
  },
  {
    id: "comm-002",
    communicationId: "COMM-2025-4587",
    providerId: "provider-003",
    providerName: "Dr. Sulaiman Al-Habib Medical Group",
    type: "letter",
    subject: "Contract Performance Review - Q3 2025",
    status: "responded",
    priority: "medium",
    sentAt: new Date("2025-10-15"),
    respondedAt: new Date("2025-10-28"),
    content: "Quarterly performance metrics review and bonus calculation",
    attachments: ["performance_report_q3.pdf"]
  },
  {
    id: "comm-003",
    communicationId: "COMM-2025-4612",
    providerId: "provider-002",
    providerName: "Saudi German Hospital",
    type: "email",
    subject: "Contract Renewal Discussion",
    status: "read",
    priority: "high",
    sentAt: new Date("2025-12-01"),
    respondedAt: null,
    content: "Initiation of contract renewal discussions for 2025-2026 term",
    attachments: ["renewal_terms_proposal.pdf"]
  }
];

// Demo Reconciliation Records
export interface DemoReconciliationRecord {
  id: string;
  reconciliationId: string;
  providerId: string;
  providerName: string;
  period: string;
  claimsSubmitted: number;
  claimsProcessed: number;
  claimsPaid: number;
  claimsDenied: number;
  claimsPending: number;
  totalBilled: string;
  totalPaid: string;
  totalAdjusted: string;
  discrepancyAmount: string;
  discrepancyReason: string[];
  status: "pending" | "completed" | "disputed" | "resolved";
  completedAt: Date | null;
}

export const demoReconciliationRecords: DemoReconciliationRecord[] = [
  {
    id: "recon-001",
    reconciliationId: "REC-2025-Q4-001",
    providerId: "provider-001",
    providerName: "King Faisal Specialist Hospital",
    period: "Q4 2025",
    claimsSubmitted: 2847,
    claimsProcessed: 2698,
    claimsPaid: 2156,
    claimsDenied: 542,
    claimsPending: 149,
    totalBilled: "12450000",
    totalPaid: "9875000",
    totalAdjusted: "1250000",
    discrepancyAmount: "1325000",
    discrepancyReason: ["Coding errors", "Duplicate claims", "Missing documentation"],
    status: "disputed",
    completedAt: null
  },
  {
    id: "recon-002",
    reconciliationId: "REC-2025-Q4-002",
    providerId: "provider-002",
    providerName: "Saudi German Hospital",
    period: "Q4 2025",
    claimsSubmitted: 1856,
    claimsProcessed: 1856,
    claimsPaid: 1745,
    claimsDenied: 111,
    claimsPending: 0,
    totalBilled: "7250000",
    totalPaid: "6890000",
    totalAdjusted: "360000",
    discrepancyAmount: "0",
    discrepancyReason: [],
    status: "completed",
    completedAt: new Date("2026-01-02")
  }
];

export function getClaimById(id: string): DemoClaim | undefined {
  return demoClaims.find(c => c.claimId === id || c.id === id);
}

export function getRuleById(id: string): DemoClaimsRule | undefined {
  return demoClaimsRules.find(r => r.ruleId === id || r.id === id);
}

export function getContractByProviderId(providerId: string): DemoProviderContract | undefined {
  return demoProviderContracts.find(c => c.providerId === providerId);
}

import { storage, seedKpiDefinitions } from "../storage";
import { seedDetectionThresholds } from "./detection-threshold-service";

async function seedIfEmpty<T>(
  name: string,
  checkFn: () => Promise<T[]>,
  seedFn: () => Promise<void>
): Promise<void> {
  try {
    const existing = await checkFn();
    if (existing.length > 0) {
      console.log(`[Seeder] ${name} already has ${existing.length} records, skipping`);
      return;
    }
    console.log(`[Seeder] Seeding ${name}...`);
    await seedFn();
    console.log(`[Seeder] ${name} seeding complete`);
  } catch (error) {
    console.error(`[Seeder] Error seeding ${name}:`, error);
  }
}

export async function seedDatabaseWithDemoData(): Promise<void> {
  console.log("[Seeder] Starting background seeding...");
  
  try {
    // These appear to be independent seeding functions
    await Promise.all([
      seedIfEmpty("Provider Relations", () => storage.getAllDreamReports(), seedProviderRelationsData),
      seedIfEmpty("Provider Directory", () => storage.getAllProviderDirectoryEntries(), seedProviderDirectoryData),
      seedIfEmpty("Context 360", () => storage.listPatient360s(), seedContext360Data),
      seedIfEmpty("Simulation Lab", () => storage.listDigitalTwins(), seedSimulationLabData),
      seedIfEmpty("Graph Analysis", () => storage.listRelationshipGraphs(), seedGraphAnalysisData),
      seedIfEmpty("FWA Cases", () => storage.getFwaCases(), seedFwaCasesInternal),
      seedIfEmpty("Provider Benchmarks", () => storage.getAllProviderBenchmarks(), seedProviderBenchmarksData),
      seedIfEmpty("Provider CPM Metrics", () => storage.getAllProviderCpmMetrics(), seedProviderCpmMetricsData),
    ]);
    
    // Seed FWA Analyzed Claims - Critical for the platform to work
    console.log("[Seeder] Checking FWA Analyzed Claims...");
    try {
      const { db } = await import("../db");
      const { fwaAnalyzedClaims } = await import("@shared/schema");
      const { count } = await import("drizzle-orm");
      const result = await db.select({ count: count() }).from(fwaAnalyzedClaims);
      const claimCount = result[0]?.count || 0;
      if (claimCount < 100) {
        console.log(`[Seeder] FWA Analyzed Claims only has ${claimCount} records, seeding...`);
        await seedFwaAnalyzedClaimsData();
      } else {
        console.log(`[Seeder] FWA Analyzed Claims already has ${claimCount} records, skipping`);
      }
    } catch (error) {
      console.error("[Seeder] Error checking/seeding FWA Analyzed Claims:", error);
    }
    
    // Always seed detection results (for Operations Center dashboard)
    await seedDetectionResults();
    
    // Seed detection thresholds for configurable detection engine
    console.log("[Seeder] Seeding Detection Thresholds...");
    await seedDetectionThresholds();
    
    // Always run KPI seeding - it clears and re-inserts best-practice KPIs
    console.log("[Seeder] Seeding KPI Definitions (25 best-practice KPIs)...");
    await seedKpiDefinitions();
    console.log("[Seeder] KPI Definitions seeding complete");
    
    console.log("[Seeder] All background seeding complete");
  } catch (error) {
    console.error("[Seeder] Critical error during background seeding:", error);
  }
}

async function seedProviderBenchmarksData(): Promise<void> {
  const benchmarkData = [
    {
      providerId: "FAC-001",
      providerName: "King Faisal Specialist Hospital",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      totalClaims: 4520,
      totalBilledAmount: "4750000.00",
      totalPaidAmount: "4250000.00",
      memberCount: 45230,
      costPerMember: "94.00",
      claimsPerMember: "0.10",
      avgClaimAmount: "940.00",
      peerPercentile: "78.00",
      deviationFromPeer: "12.50",
      standardDeviations: "1.25",
      anomalyScore: "0.15",
    },
    {
      providerId: "FAC-002",
      providerName: "Saudi German Hospital Riyadh",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      totalClaims: 3218,
      totalBilledAmount: "3450000.00",
      totalPaidAmount: "3100000.00",
      memberCount: 32150,
      costPerMember: "96.45",
      claimsPerMember: "0.10",
      avgClaimAmount: "964.50",
      peerPercentile: "72.00",
      deviationFromPeer: "8.50",
      standardDeviations: "0.95",
      anomalyScore: "0.12",
    },
    {
      providerId: "FAC-003",
      providerName: "Al-Nahdi Medical Pharmacy",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      totalClaims: 8956,
      totalBilledAmount: "2550000.00",
      totalPaidAmount: "2350000.00",
      memberCount: 89560,
      costPerMember: "26.24",
      claimsPerMember: "0.10",
      avgClaimAmount: "262.40",
      peerPercentile: "65.00",
      deviationFromPeer: "15.20",
      standardDeviations: "1.52",
      anomalyScore: "0.18",
    },
    {
      providerId: "FAC-004",
      providerName: "Dallah Health Clinic",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      totalClaims: 1289,
      totalBilledAmount: "580000.00",
      totalPaidAmount: "522000.00",
      memberCount: 12890,
      costPerMember: "40.50",
      claimsPerMember: "0.10",
      avgClaimAmount: "405.00",
      peerPercentile: "52.00",
      deviationFromPeer: "-3.20",
      standardDeviations: "-0.32",
      anomalyScore: "0.05",
    },
    {
      providerId: "FAC-005",
      providerName: "Dr. Sulaiman Al Habib Medical Center",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      totalClaims: 5678,
      totalBilledAmount: "4115000.00",
      totalPaidAmount: "3815000.00",
      memberCount: 56780,
      costPerMember: "67.20",
      claimsPerMember: "0.10",
      avgClaimAmount: "672.00",
      peerPercentile: "48.00",
      deviationFromPeer: "2.10",
      standardDeviations: "0.21",
      anomalyScore: "0.08",
    },
    {
      providerId: "FAC-006",
      providerName: "Mouwasat Hospital",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      totalClaims: 2850,
      totalBilledAmount: "2280000.00",
      totalPaidAmount: "2052000.00",
      memberCount: 28500,
      costPerMember: "72.00",
      claimsPerMember: "0.10",
      avgClaimAmount: "720.00",
      peerPercentile: "58.00",
      deviationFromPeer: "5.80",
      standardDeviations: "0.58",
      anomalyScore: "0.10",
    }
  ];

  for (const data of benchmarkData) {
    await storage.createProviderBenchmark(data);
  }
  console.log(`[Seeder] Created ${benchmarkData.length} provider benchmarks`);
}

async function seedProviderCpmMetricsData(): Promise<void> {
  const providers = [
    { id: "FAC-001", name: "King Faisal Specialist Hospital", region: "Central", tier: "Tier 1", specialty: "Multi-specialty" },
    { id: "FAC-002", name: "Saudi German Hospital Riyadh", region: "Central", tier: "Tier 1", specialty: "Multi-specialty" },
    { id: "FAC-003", name: "Al-Nahdi Medical Pharmacy", region: "Central", tier: "Tier 2", specialty: "Pharmacy" },
    { id: "FAC-004", name: "Dallah Health Clinic", region: "Central", tier: "Tier 2", specialty: "Primary Care" },
    { id: "FAC-005", name: "Dr. Sulaiman Al Habib Medical Center", region: "Central", tier: "Tier 1", specialty: "Multi-specialty" },
    { id: "FAC-006", name: "Mouwasat Hospital", region: "Eastern", tier: "Tier 2", specialty: "General" },
  ];

  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const years = [2024, 2025];

  let metricsCount = 0;
  for (const provider of providers) {
    for (const year of years) {
      for (const quarter of quarters) {
        if (year === 2025 && quarter !== "Q1") continue;
        
        const baseCpm = 800 + Math.random() * 400;
        const memberCount = 10000 + Math.floor(Math.random() * 40000);
        const totalCost = baseCpm * memberCount;
        
        await storage.createProviderCpmMetric({
          providerId: provider.id,
          providerName: provider.name,
          region: provider.region,
          networkTier: provider.tier,
          specialty: provider.specialty,
          quarter,
          year,
          memberCount,
          totalCost: totalCost.toFixed(2),
          cpm: baseCpm.toFixed(2),
          peerAvgCpm: (baseCpm * 0.9).toFixed(2),
          percentile: (60 + Math.random() * 30).toFixed(2),
          deviation: ((Math.random() - 0.5) * 20).toFixed(2),
          trend: Math.random() > 0.5 ? "up" : "down",
          benchmarkCpm: (baseCpm * 0.85).toFixed(2),
          claimsCount: Math.floor(memberCount * 0.15),
          avgClaimAmount: (baseCpm * 5).toFixed(2),
          rejectionRate: (5 + Math.random() * 10).toFixed(2),
        });
        metricsCount++;
      }
    }
  }
  console.log(`[Seeder] Created ${metricsCount} CPM metrics for ${providers.length} providers`);
}

async function seedProviderDirectoryData(): Promise<void> {
  const providerDirectoryEntries = [
    {
      npi: "1234567890",
      name: "King Faisal Specialist Hospital",
      specialty: "Multi-Specialty",
      organization: "Ministry of Health",
      email: "info@kfsh.org",
      phone: "+966-11-464-7272",
      address: "Al Mather St, As Sulimaniyah",
      city: "Riyadh",
      region: "Central",
      contractStatus: "Active",
      networkTier: "Tier 1",
      licenseNumber: "MOH-2021-0001",
      memberCount: 45230,
      riskScore: "87.50"
    },
    {
      npi: "2345678901",
      name: "Saudi German Hospital Riyadh",
      specialty: "General",
      organization: "Saudi German Hospitals Group",
      email: "info@sghriyadh.com",
      phone: "+966-11-457-1111",
      address: "Al Urubah Road, Al Muhammadiyah",
      city: "Riyadh",
      region: "Central",
      contractStatus: "Active",
      networkTier: "Tier 1",
      licenseNumber: "MOH-2021-0002",
      memberCount: 32450,
      riskScore: "42.30"
    },
    {
      npi: "3456789012",
      name: "Dr. Sulaiman Al Habib Hospital",
      specialty: "Multi-Specialty",
      organization: "Dr. Sulaiman Al Habib Medical Group",
      email: "info@hmg.com",
      phone: "+966-11-490-9999",
      address: "Olaya District",
      city: "Riyadh",
      region: "Central",
      contractStatus: "Active",
      networkTier: "Tier 1",
      licenseNumber: "MOH-2021-0003",
      memberCount: 28750,
      riskScore: "55.00"
    },
    {
      npi: "4567890123",
      name: "Dallah Health Clinic",
      specialty: "Primary Care",
      organization: "Dallah Health Company",
      email: "info@dallah.com",
      phone: "+966-11-460-0000",
      address: "King Fahd Road",
      city: "Riyadh",
      region: "Central",
      contractStatus: "Active",
      networkTier: "Tier 2",
      licenseNumber: "MOH-2021-0004",
      memberCount: 15200,
      riskScore: "28.00"
    },
    {
      npi: "5678901234",
      name: "International Medical Center",
      specialty: "Multi-Specialty",
      organization: "IMC Group",
      email: "info@imc.med.sa",
      phone: "+966-12-650-9000",
      address: "Al Nahda District",
      city: "Jeddah",
      region: "Western",
      contractStatus: "Active",
      networkTier: "Tier 1",
      licenseNumber: "MOH-2021-0005",
      memberCount: 22500,
      riskScore: "35.00"
    }
  ];

  for (const provider of providerDirectoryEntries) {
    await storage.createProviderDirectoryEntry(provider);
  }
  console.log(`[Seeder] Created ${providerDirectoryEntries.length} provider directory entries`);
}

async function seedFwaCasesInternal(): Promise<void> {
    const phaseMap: Record<string, "a1_analysis" | "a2_categorization" | "a3_action"> = {
      "A1": "a1_analysis",
      "A2": "a2_categorization", 
      "A3": "a3_action"
    };
    
    const priorityMap: Record<string, "critical" | "high" | "medium" | "low"> = {
      "critical": "critical",
      "high": "high",
      "medium": "medium",
      "low": "low"
    };

    for (const demoCase of demoFwaCases) {
      const fwaCase = await storage.createFwaCase({
        caseId: demoCase.caseId,
        claimId: `CLM-${demoCase.caseId}`,
        providerId: demoCase.entityType === "provider" ? demoCase.entityId : "N/A",
        patientId: demoCase.entityType === "patient" ? demoCase.entityId : "N/A",
        status: "analyzing",
        phase: phaseMap[demoCase.phase] || "a1_analysis",
        priority: priorityMap[demoCase.priority] || "medium",
        totalAmount: demoCase.exposureAmount,
        recoveryAmount: demoCase.recoveryAmount !== "0.00" ? demoCase.recoveryAmount : null,
        assignedTo: demoCase.assignedTo
      });

      for (const finding of demoCase.findings) {
        await storage.createFwaFinding({
          caseId: fwaCase.id,
          findingType: "pattern",
          source: "explainability_report",
          description: finding.title,
          confidence: String(finding.confidence * 100),
          severity: priorityMap[finding.severity] || "medium",
          evidence: { source: "AI Analysis", details: finding.title } as Record<string, any>
        });
      }

      if (demoCase.phase === "A2" || demoCase.phase === "A3") {
        const categoryTypes: Array<"coding" | "management" | "physician" | "patient"> = ["coding", "management", "physician", "patient"];
        for (let i = 0; i < Math.min(2, demoCase.findings.length); i++) {
          const finding = demoCase.findings[i];
          await storage.createFwaCategory({
            caseId: fwaCase.id,
            categoryType: categoryTypes[i % categoryTypes.length],
            subCategory: finding.title.includes("Upcoding") ? "upcoding" : 
                         finding.title.includes("Unbundling") ? "unbundling" : 
                         finding.title.includes("Phantom") ? "phantom_billing" : "billing_pattern",
            confidenceScore: String(finding.confidence * 100),
            severityScore: String(finding.severity === "critical" ? 92 : finding.severity === "high" ? 78 : 55),
            evidenceChain: { source: "Pattern Analysis", description: finding.title } as Record<string, any>,
          });
        }
      }

      if (demoCase.phase === "A3") {
        const recoveryPotential = parseFloat(demoCase.exposureAmount.replace(/,/g, "")) * 0.65;
        await storage.createFwaAction({
          caseId: fwaCase.id,
          actionType: "recovery",
          actionTrack: "live_claims",
          status: "pending",
          amount: String(Math.round(recoveryPotential)),
          justification: `Initiate recovery proceedings for $${recoveryPotential.toLocaleString()} based on identified billing discrepancies`,
          executedBy: demoCase.assignedTo,
        });
        await storage.createFwaAction({
          caseId: fwaCase.id,
          actionType: "preventive",
          actionTrack: "live_claims",
          status: "pending",
          amount: null,
          justification: "Implement enhanced pre-payment review for high-risk procedure codes",
          executedBy: demoCase.assignedTo,
        });
      }

      console.log(`[Seeder] Created FWA case: ${demoCase.caseId}`);
    }
}

async function seedProviderRelationsData(): Promise<void> {
  try {
    // Create Peer Groups first (referenced by other tables)
    const peerGroup1 = await storage.createPeerGroup({
      groupName: "Multi-Specialty Hospital Tier 1",
      region: "Central",
      providerType: "Hospital",
      networkTier: "Tier 1",
      serviceTypes: ["Inpatient", "Outpatient", "Emergency", "Surgery"],
      volumeRange: "3000-6000",
      memberCount: 15,
      avgCpm: "1150.00",
      medianCpm: "1080.00",
      cpmP25: "920.00",
      cpmP75: "1280.00",
      updatedAt: new Date()
    });

    const peerGroup2 = await storage.createPeerGroup({
      groupName: "Specialty Clinics Western",
      region: "Western",
      providerType: "Clinic",
      networkTier: "Tier 2",
      serviceTypes: ["Outpatient", "Diagnostics"],
      volumeRange: "1000-3000",
      memberCount: 22,
      avgCpm: "680.00",
      medianCpm: "650.00",
      cpmP25: "520.00",
      cpmP75: "780.00",
      updatedAt: new Date()
    });

    console.log(`[Seeder] Created ${2} peer groups`);

    // Create Provider Directory entries (for dropdown selections)
    const providerDirectoryData = [
      {
        npi: "1234567890",
        name: "King Faisal Specialist Hospital",
        specialty: "Multi-Specialty",
        organization: "Ministry of Health",
        email: "info@kfsh.org",
        phone: "+966-11-464-7272",
        address: "Al Mather St, As Sulimaniyah",
        city: "Riyadh",
        region: "Central",
        contractStatus: "Active",
        networkTier: "Tier 1",
        licenseNumber: "MOH-2021-0001",
        memberCount: 45230,
        riskScore: "87.50"
      },
      {
        npi: "2345678901",
        name: "Saudi German Hospital Riyadh",
        specialty: "General",
        organization: "Saudi German Hospitals Group",
        email: "info@sghriyadh.com",
        phone: "+966-11-457-1111",
        address: "Al Urubah Road, Al Muhammadiyah",
        city: "Riyadh",
        region: "Central",
        contractStatus: "Active",
        networkTier: "Tier 1",
        licenseNumber: "MOH-2021-0002",
        memberCount: 32450,
        riskScore: "42.30"
      },
      {
        npi: "3456789012",
        name: "Dr. Sulaiman Al Habib Hospital",
        specialty: "Multi-Specialty",
        organization: "Dr. Sulaiman Al Habib Medical Group",
        email: "info@hmg.com",
        phone: "+966-11-490-9999",
        address: "Olaya District",
        city: "Riyadh",
        region: "Central",
        contractStatus: "Active",
        networkTier: "Tier 1",
        licenseNumber: "MOH-2021-0003",
        memberCount: 28750,
        riskScore: "55.00"
      },
      {
        npi: "4567890123",
        name: "Dallah Health Clinic",
        specialty: "Primary Care",
        organization: "Dallah Health Company",
        email: "info@dallah.com",
        phone: "+966-11-460-0000",
        address: "King Fahd Road",
        city: "Riyadh",
        region: "Central",
        contractStatus: "Active",
        networkTier: "Tier 2",
        licenseNumber: "MOH-2021-0004",
        memberCount: 15200,
        riskScore: "28.00"
      },
      {
        npi: "5678901234",
        name: "International Medical Center",
        specialty: "Multi-Specialty",
        organization: "IMC Group",
        email: "info@imc.med.sa",
        phone: "+966-12-650-9000",
        address: "Al Nahda District",
        city: "Jeddah",
        region: "Western",
        contractStatus: "Active",
        networkTier: "Tier 1",
        licenseNumber: "MOH-2021-0005",
        memberCount: 22500,
        riskScore: "35.00"
      }
    ];

    for (const provider of providerDirectoryData) {
      const existing = await storage.getProviderDirectoryByNpi(provider.npi);
      if (!existing) {
        await storage.createProviderDirectoryEntry(provider);
      }
    }
    console.log(`[Seeder] Created ${providerDirectoryData.length} provider directory entries`);

    // Create Dream Reports
    await storage.createDreamReport({
      reportNumber: "DR-2025-Q4-001",
      providerId: "FAC-001",
      providerName: "King Faisal Specialist Hospital",
      periodStart: new Date("2025-10-01"),
      periodEnd: new Date("2025-12-31"),
      status: "finalized",
      peerGroupId: peerGroup1.id,
      executiveSummary: "High-risk provider with significant billing anomalies requiring immediate attention.",
      benchmarkAnalysis: {
        costPerMember: 1245,
        peerAvgCpm: 1150,
        deviation: 8.26,
        percentile: 78,
        anomalyScore: 87.5,
        keyDrivers: [
          { category: "E&M Upcoding", impact: 320000, description: "Elevated 99215 to 99214 ratio" },
          { category: "Unbundling", impact: 185000, description: "Separate billing for bundled procedures" }
        ]
      },
      findings: [
        { id: "f-001", category: "Coding", subCategory: "Upcoding", amount: 245000, claimCount: 156, confidence: "HIGH", severity: "HIGH", description: "99215 billed when 99214 appropriate", evidence: ["Pattern analysis", "Peer comparison"] },
        { id: "f-002", category: "Billing", subCategory: "Unbundling", amount: 182000, claimCount: 89, confidence: "HIGH", severity: "HIGH", description: "Separate billing for bundled services", evidence: ["CPT bundling rules"] }
      ],
      totalPotentialAmount: "505000",
      categoryBreakdown: [
        { category: "Upcoding", amount: 245000, percentage: 48.5, claimCount: 156, riskLevel: "HIGH" },
        { category: "Unbundling", amount: 182000, percentage: 36.0, claimCount: 89, riskLevel: "HIGH" },
        { category: "Documentation", amount: 78000, percentage: 15.5, claimCount: 42, riskLevel: "MEDIUM" }
      ],
      claimSamples: [
        { claimId: "CLM-2025-1234", category: "Upcoding", amount: 2850, description: "99215 vs 99214 - 15min visit coded as 40min", attachmentAvailable: true },
        { claimId: "CLM-2025-1456", category: "Unbundling", amount: 3200, description: "70553 billed separately from 70552", attachmentAvailable: true }
      ],
      recommendations: [
        { priority: "HIGH", action: "Coding education program", expectedImpact: "Reduce upcoding by 60%", timeline: "Q1 2026" },
        { priority: "HIGH", action: "Implement bundling validation", expectedImpact: "Prevent unbundling errors", timeline: "Q1 2026" }
      ],
      aiInsights: "Analysis indicates systematic upcoding patterns concentrated in outpatient E&M services.",
      generatedBy: "DreamReportGenerator AI",
      generatedAt: new Date("2026-01-02")
    });

    await storage.createDreamReport({
      reportNumber: "DR-2025-Q4-002",
      providerId: "FAC-002",
      providerName: "Saudi German Hospital Riyadh",
      periodStart: new Date("2025-10-01"),
      periodEnd: new Date("2025-12-31"),
      status: "draft",
      peerGroupId: peerGroup1.id,
      executiveSummary: "Moderate risk provider with prior authorization gaps.",
      benchmarkAnalysis: {
        costPerMember: 985,
        peerAvgCpm: 1150,
        deviation: -14.3,
        percentile: 35,
        anomalyScore: 45.2,
        keyDrivers: [
          { category: "Prior Auth", impact: 125000, description: "Procedures without authorization" }
        ]
      },
      findings: [
        { id: "f-003", category: "Compliance", subCategory: "Prior Auth", amount: 125000, claimCount: 67, confidence: "MEDIUM", severity: "MEDIUM", description: "Missing prior authorization", evidence: ["Auth records"] }
      ],
      totalPotentialAmount: "125000",
      categoryBreakdown: [
        { category: "Prior Authorization", amount: 125000, percentage: 100, claimCount: 67, riskLevel: "MEDIUM" }
      ],
      claimSamples: [],
      recommendations: [
        { priority: "MEDIUM", action: "Strengthen auth verification", expectedImpact: "Reduce gaps by 80%", timeline: "Q2 2026" }
      ],
      generatedBy: "DreamReportGenerator AI",
      generatedAt: new Date("2026-01-03")
    });

    console.log("[Seeder] Created 2 dream reports");

    // Create Evidence Packs
    await storage.createEvidencePack({
      packNumber: "EP-2025-001",
      sessionId: null,
      providerId: "FAC-001",
      providerName: "King Faisal Specialist Hospital",
      title: "Q4 2025 Reconciliation Evidence Pack",
      status: "locked",
      targetAmount: "505000",
      documents: [
        { docId: "doc-001", name: "Claims Summary Report", type: "pdf", addedAt: new Date("2025-12-28") },
        { docId: "doc-002", name: "Denial Analysis", type: "xlsx", addedAt: new Date("2025-12-29") },
        { docId: "doc-003", name: "Coding Audit Results", type: "pdf", addedAt: new Date("2025-12-30") }
      ],
      findings: [
        { findingId: "f-001", category: "Upcoding", description: "99215 billed when 99214 appropriate", amount: "245000" },
        { findingId: "f-002", category: "Unbundling", description: "Separate billing for bundled services", amount: "182000" },
        { findingId: "f-003", category: "Documentation", description: "Missing medical necessity documentation", amount: "78000" }
      ],
      totalFindings: 3,
      totalAmount: "505000",
      lockedAt: new Date("2026-01-05"),
      lockedBy: "Sarah Johnson"
    });

    await storage.createEvidencePack({
      packNumber: "EP-2025-002",
      sessionId: null,
      providerId: "FAC-002",
      providerName: "Saudi German Hospital Riyadh",
      title: "Contract Renewal Evidence Pack",
      status: "draft",
      targetAmount: "125000",
      documents: [
        { docId: "doc-004", name: "Performance Metrics", type: "pdf", addedAt: new Date("2026-01-02") }
      ],
      findings: [
        { findingId: "f-004", category: "Prior Auth", description: "Procedures without authorization", amount: "125000" }
      ],
      totalFindings: 1,
      totalAmount: "125000"
    });

    console.log("[Seeder] Created 2 evidence packs");

    // Create Reconciliation Sessions
    await storage.createReconciliationSession({
      sessionNumber: "RS-2026-001",
      providerId: "FAC-001",
      providerName: "King Faisal Specialist Hospital",
      sessionType: "quarterly_review",
      status: "negotiating",
      scheduledDate: new Date("2026-01-15T10:00:00"),
      participants: [
        { name: "Sarah Johnson", role: "Provider Relations Manager", email: "sarah.j@tawuniya.com" },
        { name: "Dr. Ahmed Al-Rashid", role: "Provider Medical Director", email: "ahmed.r@kfsh.org" }
      ],
      agenda: [
        { topic: "Q4 2025 Performance Review", duration: 30, presenter: "Sarah Johnson" },
        { topic: "Billing Discrepancy Discussion", duration: 45, presenter: "Sarah Johnson" },
        { topic: "Remediation Plan", duration: 30, presenter: "Dr. Ahmed Al-Rashid" }
      ],
      notes: "Focus on coding education and billing process improvements"
    });

    await storage.createReconciliationSession({
      sessionNumber: "RS-2026-002",
      providerId: "FAC-002",
      providerName: "Saudi German Hospital Riyadh",
      sessionType: "contract_renewal",
      status: "scheduled",
      scheduledDate: new Date("2026-01-22T14:00:00"),
      participants: [
        { name: "Mohammed Al-Harbi", role: "Contract Specialist", email: "mohammed.h@tawuniya.com" }
      ],
      agenda: [
        { topic: "Contract Terms Review", duration: 60, presenter: "Mohammed Al-Harbi" }
      ]
    });

    console.log("[Seeder] Created 2 reconciliation sessions");

    // Create Settlement Ledger entries
    await storage.createSettlement({
      settlementNumber: "STL-2026-001",
      providerId: "FAC-001",
      providerName: "King Faisal Specialist Hospital",
      period: "Q4 2025",
      status: "negotiating",
      originalAmount: "9875000",
      proposedAmount: "9370000",
      agreedAmount: null,
      discrepancyAmount: "505000",
      lineItems: [
        { category: "Upcoding Adjustments", description: "E&M level corrections", billedAmount: "1250000", approvedAmount: "1005000", variance: "245000" },
        { category: "Unbundling", description: "Bundled procedure corrections", billedAmount: "890000", approvedAmount: "708000", variance: "182000" },
        { category: "Documentation", description: "Claims lacking documentation", billedAmount: "156000", approvedAmount: "78000", variance: "78000" }
      ],
      providerAcceptance: null,
      providerSignatory: null,
      notes: "Pending provider review of proposed adjustments"
    });

    await storage.createSettlement({
      settlementNumber: "STL-2025-089",
      providerId: "FAC-005",
      providerName: "Dr. Sulaiman Al Habib Medical Center",
      period: "Q3 2025",
      status: "finalized",
      originalAmount: "41165500",
      proposedAmount: "41165500",
      agreedAmount: "41165500",
      discrepancyAmount: "0",
      lineItems: [],
      providerAcceptance: true,
      providerSignatory: "Dr. Sulaiman Al Habib",
      providerSignedAt: new Date("2025-12-22"),
      tawuniyaSignatory: "Finance Director",
      tawuniyaSignedAt: new Date("2025-12-22"),
      settlementDate: new Date("2025-12-22"),
      paymentReference: "PAY-2025-089-001"
    });

    console.log("[Seeder] Created 2 settlement ledger entries");
    console.log("[Seeder] Provider Relations seeding complete");

  } catch (error) {
    console.error("[Seeder] Error seeding Provider Relations:", error);
  }
}

// Seed Context Enrichment 360 data
async function seedContext360Data(): Promise<void> {
  try {
    console.log("[Seeder] Checking Context 360 data...");

    // Check and seed Patient 360 records
    const existingPatients = await storage.listPatient360s();
    if (existingPatients.length >= demoPatients.length) {
      console.log(`[Seeder] Patient 360 already has ${existingPatients.length} records, skipping`);
    } else {
      console.log("[Seeder] Seeding Patient 360 data...");
      for (const patient of demoPatients) {
        const exists = await storage.getPatient360(patient.patientId);
        if (exists) continue;
        await storage.createPatient360({
        patientId: patient.patientId,
        patientName: patient.patientName,
        dateOfBirth: new Date("1985-06-15"),
        gender: "Male",
        policyNumber: `POL-${patient.patientId}`,
        memberSince: new Date("2020-01-15"),
        riskLevel: patient.riskLevel,
        riskScore: patient.riskScore.toString(),
        chronicConditions: [
          { condition: "Type 2 Diabetes", icdCode: "E11.9", diagnosedDate: "2019-03-20", status: "active", managingProvider: "Dr. Ahmed Al-Rashid" },
          { condition: "Hypertension", icdCode: "I10", diagnosedDate: "2018-07-10", status: "managed", managingProvider: "King Faisal Specialist Hospital" }
        ],
        visitHistory: [
          { date: "2025-12-15", providerId: "FAC-001", providerName: "King Faisal Specialist Hospital", visitType: "Outpatient", diagnosis: "Follow-up visit", claimAmount: 850, claimId: "CLM-2025-1234" },
          { date: "2025-11-28", providerId: "FAC-002", providerName: "Saudi German Hospital", visitType: "Emergency", diagnosis: "Chest pain evaluation", claimAmount: 3200, claimId: "CLM-2025-1189" }
        ],
        riskFactors: patient.reasons.map((reason, idx) => ({
          factor: reason.replace("Patient FWA: ", ""),
          severity: patient.riskLevel as string,
          confidence: 0.75 + (idx * 0.05),
          detectedDate: new Date().toISOString().split('T')[0],
          description: reason
        })),
        claimsSummary: {
          totalClaims: patient.totalClaims,
          totalAmount: patient.totalClaimsAmount,
          avgClaimAmount: Math.round(patient.totalClaimsAmount / patient.totalClaims),
          claimsByYear: { "2024": Math.floor(patient.totalClaims * 0.4), "2025": Math.ceil(patient.totalClaims * 0.6) },
          claimsByCategory: { "Outpatient": 45, "Emergency": 15, "Pharmacy": 25, "Lab": 15 },
          uniqueProviders: patient.uniqueProviders,
          uniqueDoctors: 8,
          flaggedClaimsCount: patient.flaggedClaims
        },
        fwaAlerts: patient.reasons.map((reason, idx) => ({
          alertId: `ALT-${patient.patientId}-${idx + 1}`,
          alertType: reason.replace("Patient FWA: ", ""),
          severity: patient.riskLevel as string,
          description: reason,
          detectedDate: new Date().toISOString().split('T')[0],
          status: "active"
        })),
        behavioralPatterns: {
          providerSwitchingRate: patient.uniqueProviders / 20,
          avgTimeBetweenVisits: 12,
          peakVisitDays: ["Monday", "Thursday"],
          prescriptionPatterns: {
            controlledSubstanceRatio: patient.riskLevel === "critical" ? 0.45 : 0.15,
            avgPrescriptionsPerMonth: 3.5
          },
          erUtilizationRate: patient.riskLevel === "high" ? 0.22 : 0.08
        },
        aiSummary: `Patient ${patient.patientName} presents a ${patient.riskLevel} risk profile based on comprehensive claims analysis. Key concerns include ${patient.reasons.join(", ")}. The patient has visited ${patient.uniqueProviders} unique providers over the analysis period with ${patient.flaggedClaims} flagged claims. Recommend enhanced monitoring and coordination of care review.`,
        lastAnalyzedAt: new Date()
      });
      }
      console.log(`[Seeder] Created patient 360 records`);
    }

    // Check and seed Provider 360 records
    const existingProviders = await storage.listProvider360s();
    if (existingProviders.length >= demoProviders.length) {
      console.log(`[Seeder] Provider 360 already has ${existingProviders.length} records, skipping`);
    } else {
      console.log("[Seeder] Seeding Provider 360 data...");
      for (const provider of demoProviders) {
        const exists = await storage.getProvider360(provider.providerId);
        if (exists) continue;
        await storage.createProvider360({
        providerId: provider.providerId,
        providerName: provider.providerName,
        providerType: provider.providerType || "Hospital",
        specialty: provider.specialty,
        region: "Central",
        city: "Riyadh",
        networkTier: "Tier 1",
        licenseNumber: `LIC-${provider.providerId}`,
        contractStatus: "active",
        riskLevel: provider.riskLevel,
        riskScore: provider.riskScore,
        specialtyBenchmarks: {
          avgClaimAmount: parseFloat(provider.avgClaimAmount),
          peerAvgClaimAmount: Math.round(parseFloat(provider.avgClaimAmount) * 0.9),
          avgClaimsPerPatient: 3.8,
          peerAvgClaimsPerPatient: 3.2,
          costPerMember: parseFloat(provider.avgClaimAmount) * 12,
          peerAvgCostPerMember: parseFloat(provider.avgClaimAmount) * 10.5,
          approvalRate: 1 - (parseFloat(provider.denialRate) / 100),
          peerApprovalRate: 0.94,
          avgLengthOfStay: 3.2,
          peerAvgLengthOfStay: 2.8
        },
        peerRanking: {
          overallRank: Math.floor(Math.random() * 30) + 5,
          totalPeers: 45,
          percentile: Math.round(100 - parseFloat(provider.riskScore)),
          rankingFactors: [
            { factor: "Cost Efficiency", rank: 25, score: 65 },
            { factor: "Quality Metrics", rank: 12, score: 78 },
            { factor: "Compliance Score", rank: 18, score: 72 }
          ]
        },
        billingPatterns: {
          topCptCodes: [
            { code: "99214", description: "Office visit, moderate", frequency: 856, avgAmount: 185, peerAvgAmount: 165, deviation: 12.1 },
            { code: "99215", description: "Office visit, high complexity", frequency: 542, avgAmount: 245, peerAvgAmount: 220, deviation: 11.4 }
          ],
          topIcdCodes: [
            { code: "E11.9", description: "Type 2 diabetes", frequency: 234 },
            { code: "I10", description: "Essential hypertension", frequency: 189 }
          ],
          billingByMonth: { "2025-10": 245000, "2025-11": 268000, "2025-12": 285000 },
          billingTrend: "increasing",
          anomalyScore: parseFloat(provider.riskScore)
        },
        flags: provider.reasons.map((reason, idx) => ({
          flagId: `FLG-${provider.providerId}-${idx + 1}`,
          flagType: reason.replace("Provider FWA: ", "").replace("Coding FWA: ", "").replace("Physician FWA: ", ""),
          severity: provider.riskLevel as string,
          description: reason,
          raisedDate: new Date().toISOString().split('T')[0],
          status: "active"
        })),
        claimsSummary: {
          totalClaims: provider.totalClaims,
          totalAmount: parseFloat(provider.totalExposure),
          avgClaimAmount: parseFloat(provider.avgClaimAmount),
          claimsByYear: { "2024": Math.floor(provider.totalClaims * 0.45), "2025": Math.ceil(provider.totalClaims * 0.55) },
          claimsByCategory: { "Inpatient": 35, "Outpatient": 40, "Emergency": 15, "Surgery": 10 },
          uniquePatients: 1250,
          denialRate: parseFloat(provider.denialRate),
          flaggedClaimsCount: provider.flaggedClaims
        },
        aiAssessment: `Provider ${provider.providerName} demonstrates billing patterns requiring enhanced monitoring. The provider's risk score of ${provider.riskScore} places it in the ${provider.riskLevel} risk category. Key concerns include ${provider.reasons.join(", ")}. The denial rate of ${provider.denialRate}% indicates potential documentation or coding issues. Recommend focused documentation review and provider education session.`,
        lastAnalyzedAt: new Date()
        });
      }
      console.log(`[Seeder] Created provider 360 records`);
    }

    // Check and seed Doctor 360 records
    const existingDoctors = await storage.listDoctor360s();
    if (existingDoctors.length >= demoDoctors.length) {
      console.log(`[Seeder] Doctor 360 already has ${existingDoctors.length} records, skipping`);
    } else {
      console.log("[Seeder] Seeding Doctor 360 data...");
      for (const doctor of demoDoctors) {
        const exists = await storage.getDoctor360(doctor.doctorId);
        if (exists) continue;
        await storage.createDoctor360({
        doctorId: doctor.doctorId,
        doctorName: doctor.doctorName,
        specialty: doctor.specialty,
        credentials: "MD, FACP",
        licenseNumber: doctor.licenseNumber || `MD-${doctor.doctorId}`,
        primaryFacilityId: "FAC-001",
        primaryFacilityName: "King Faisal Specialist Hospital",
        affiliatedFacilities: ["FAC-001", "FAC-002"],
        riskLevel: doctor.riskLevel,
        riskScore: doctor.riskScore,
        practicePatterns: {
          avgPatientsPerDay: 18,
          avgClaimPerPatient: parseFloat(doctor.avgClaimAmount),
          topProcedures: [
            { code: "99214", description: "Office Visit", frequency: 450 },
            { code: "99215", description: "Complex Visit", frequency: 180 }
          ],
          prescribingHabits: {
            avgPrescriptionsPerVisit: 2.3,
            controlledSubstanceRatio: doctor.riskLevel === "critical" ? 0.35 : 0.12,
            topMedications: ["Metformin", "Lisinopril", "Atorvastatin"]
          },
          referralPatterns: {
            referralRate: 0.15,
            topReferralDestinations: ["Radiology", "Cardiology", "Orthopedics"]
          }
        },
        peerComparison: {
          specialtyAvgClaim: Math.round(parseFloat(doctor.avgClaimAmount) * 0.85),
          doctorAvgClaim: parseFloat(doctor.avgClaimAmount),
          deviation: 15,
          percentile: Math.round(100 - parseFloat(doctor.riskScore)),
          peerGroupSize: 45
        },
        flags: doctor.reasons.map((reason, idx) => ({
          flagId: `FLG-${doctor.doctorId}-${idx + 1}`,
          flagType: reason.replace("Doctor FWA: ", ""),
          severity: doctor.riskLevel as string,
          description: reason,
          raisedDate: new Date().toISOString().split('T')[0],
          status: "active"
        })),
        claimsSummary: {
          totalClaims: doctor.totalClaims,
          totalAmount: parseFloat(doctor.totalExposure),
          uniquePatients: doctor.uniquePatients,
          claimsByYear: { "2024": Math.floor(doctor.totalClaims * 0.42), "2025": Math.ceil(doctor.totalClaims * 0.58) },
          denialRate: parseFloat(doctor.denialRate)
        },
        aiAssessment: `Dr. ${doctor.doctorName} (${doctor.specialty}) presents a ${doctor.riskLevel} risk profile. Key concerns include ${doctor.reasons.join(", ")}. The practitioner serves ${doctor.uniquePatients} unique patients with an average claim of SAR ${doctor.avgClaimAmount}. The denial rate of ${doctor.denialRate}% warrants attention. Recommend practice pattern review and peer comparison analysis.`,
        lastAnalyzedAt: new Date()
        });
      }
      console.log(`[Seeder] Created doctor 360 records`);
    }
    console.log("[Seeder] Context 360 seeding complete");

  } catch (error) {
    console.error("[Seeder] Error seeding Context 360:", error);
  }
}

async function seedSimulationLabData(): Promise<void> {
  try {
    const existingTwins = await storage.listDigitalTwins();
    if (existingTwins.length > 0) {
      console.log(`[Seeder] Simulation Lab already has ${existingTwins.length} digital twins, skipping`);
      return;
    }

    console.log("[Seeder] Seeding Simulation Lab data...");

    // Seed Digital Twins - 3 twins for different source types
    const digitalTwinsData = [
      {
        twinId: "DTW-001",
        sourceType: "fwa_case",
        sourceId: "FWA-2025-001",
        twinData: {
          caseId: "FWA-2025-001",
          entityType: "provider",
          entityName: "King Faisal Specialist Hospital",
          exposureAmount: 2450000,
          findings: [
            { title: "Systematic E&M Upcoding", severity: "critical", confidence: 0.94 },
            { title: "Documentation Deficiencies", severity: "high", confidence: 0.87 }
          ],
          riskScore: 87.5,
          clonedAt: new Date().toISOString()
        },
        status: "active",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: "system",
        purpose: "testing",
        notes: "Digital twin for testing new upcoding detection rules"
      },
      {
        twinId: "DTW-002",
        sourceType: "claim",
        sourceId: "CLM-2025-00891",
        twinData: {
          claimId: "CLM-2025-00891",
          providerId: "FAC-002",
          patientId: "PAT-1003",
          amount: 45000,
          procedureCode: "33533",
          diagnosisCode: "I25.10",
          flags: ["high_cost", "complex_procedure"],
          clonedAt: new Date().toISOString()
        },
        status: "active",
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdBy: "analyst_ahmed",
        purpose: "training",
        notes: "Training dataset for cardiac procedure validation"
      },
      {
        twinId: "DTW-003",
        sourceType: "pre_auth",
        sourceId: "PA-2025-00146",
        twinData: {
          claimId: "PA-2025-00146",
          patientName: "Fatima Al-Zahrani",
          serviceType: "Spinal Fusion",
          requestedAmount: 125000,
          riskScore: 68.2,
          signals: [
            { agent: "clinical_necessity", signal: "review", confidence: 0.65 }
          ],
          clonedAt: new Date().toISOString()
        },
        status: "active",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: "qa_team",
        purpose: "validation",
        notes: "Pre-auth validation for new clinical necessity rules"
      }
    ];

    for (const twin of digitalTwinsData) {
      await storage.createDigitalTwin(twin);
    }
    console.log(`[Seeder] Created ${digitalTwinsData.length} digital twins`);

    // Seed Shadow Rules - 3 rules with different statuses
    const shadowRulesData = [
      {
        ruleSetId: "SR-001",
        name: "Enhanced Upcoding Detection v2",
        description: "Updated thresholds for E&M code upcoding detection based on recent patterns",
        baseRuleId: "RULE-UC-001",
        ruleConfig: {
          conditions: [
            { field: "procedure_code", operator: "in", value: ["99214", "99215", "99223"] },
            { field: "frequency_ratio", operator: "gt", value: 2.5 },
            { field: "peer_deviation", operator: "gt", value: 35 }
          ],
          thresholds: { confidence: 0.85, minClaims: 10, lookbackDays: 90 },
          actions: ["flag_for_review", "add_to_case"],
          priority: 1
        },
        testCases: [
          {
            testId: "TC-001",
            input: { procedure_code: "99215", frequency_ratio: 3.2, peer_deviation: 42 },
            expectedOutput: { flagged: true, confidence: 0.91 },
            actualOutput: { flagged: true, confidence: 0.89 },
            passed: true,
            executedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            testId: "TC-002",
            input: { procedure_code: "99213", frequency_ratio: 1.8, peer_deviation: 22 },
            expectedOutput: { flagged: false, confidence: 0.45 },
            actualOutput: { flagged: false, confidence: 0.42 },
            passed: true,
            executedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        status: "validated",
        validationResults: {
          totalTests: 25,
          passed: 24,
          failed: 1,
          accuracy: 0.96,
          lastValidatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        createdBy: "rules_team"
      },
      {
        ruleSetId: "SR-002",
        name: "Phantom Billing Pattern Matcher",
        description: "New rule to detect phantom billing based on service timing and inventory",
        baseRuleId: null,
        ruleConfig: {
          conditions: [
            { field: "claim_type", operator: "eq", value: "pharmacy" },
            { field: "inventory_match", operator: "eq", value: false },
            { field: "billing_time", operator: "outside", value: "business_hours" }
          ],
          thresholds: { confidence: 0.80, minAmount: 500 },
          actions: ["immediate_flag", "notify_investigator"],
          priority: 2
        },
        testCases: [
          {
            testId: "TC-003",
            input: { claim_type: "pharmacy", inventory_match: false, billing_time: "02:30" },
            expectedOutput: { flagged: true, confidence: 0.88 }
          }
        ],
        status: "testing",
        validationResults: null,
        createdBy: "fwa_analyst"
      },
      {
        ruleSetId: "SR-003",
        name: "Cross-Provider Referral Loop Detection",
        description: "Draft rule for detecting circular referral patterns indicating kickback schemes",
        baseRuleId: null,
        ruleConfig: {
          conditions: [
            { field: "referral_chain_length", operator: "gte", value: 3 },
            { field: "circular_pattern", operator: "eq", value: true },
            { field: "financial_flow_asymmetry", operator: "gt", value: 0.4 }
          ],
          thresholds: { minReferrals: 5, timeframeDays: 180 },
          actions: ["create_collusion_case", "graph_analysis"],
          priority: 1
        },
        testCases: [],
        status: "draft",
        validationResults: null,
        createdBy: "senior_analyst"
      }
    ];

    for (const rule of shadowRulesData) {
      await storage.createShadowRule(rule);
    }
    console.log(`[Seeder] Created ${shadowRulesData.length} shadow rules`);

    // Seed Ghost Runs - 5 runs with various statuses
    const ghostRunsData = [
      {
        runId: "GR-001",
        agentType: "A1-provider-claims-analyzer",
        phase: "A1",
        entityType: "provider",
        targetId: "FWA-2025-001",
        targetType: "fwa_case",
        inputData: {
          providerId: "FAC-001",
          claimsRange: { start: "2025-01-01", end: "2025-12-31" },
          analysisDepth: "comprehensive"
        },
        ghostOutput: {
          recommendation: "escalate_to_a2",
          riskScore: 89.2,
          findings: [
            { type: "upcoding", description: "E&M code 99215 used 3.5x peer average", severity: "critical" },
            { type: "unbundling", description: "Suspected procedure unbundling in 23 claims", severity: "high" }
          ],
          suggestedActions: ["initiate_investigation", "request_medical_records"]
        },
        productionOutput: {
          recommendation: "escalate_to_a2",
          riskScore: 87.5,
          findings: [
            { type: "upcoding", description: "E&M code 99215 used above peer average", severity: "critical" }
          ],
          suggestedActions: ["initiate_investigation"]
        },
        comparison: {
          matchScore: 0.92,
          discrepancies: [
            { field: "riskScore", ghostValue: 89.2, productionValue: 87.5, impact: "minor" },
            { field: "findings.length", ghostValue: 2, productionValue: 1, impact: "moderate" }
          ],
          overallAssessment: "Ghost run detected additional unbundling pattern not caught in production"
        },
        status: "completed",
        executionTimeMs: 4523,
        createdBy: "qa_automation"
      },
      {
        runId: "GR-002",
        agentType: "A2-category-classifier",
        phase: "A2",
        entityType: "doctor",
        targetId: "FWA-2025-003",
        targetType: "fwa_case",
        inputData: {
          doctorId: "DOC-001",
          suspectedCategories: ["kickback", "self_referral"]
        },
        ghostOutput: {
          recommendation: "confirm_kickback_category",
          riskScore: 91.5,
          findings: [
            { type: "kickback", description: "92% referrals to single provider", severity: "critical" },
            { type: "financial_link", description: "Indirect ownership detected", severity: "high" }
          ],
          suggestedActions: ["regulatory_referral", "contract_review"]
        },
        productionOutput: null,
        comparison: null,
        status: "running",
        executionTimeMs: null,
        createdBy: "senior_analyst"
      },
      {
        runId: "GR-003",
        agentType: "A3-action-recommender",
        phase: "A3",
        entityType: "provider",
        targetId: "FWA-2025-004",
        targetType: "fwa_case",
        inputData: {
          caseId: "FWA-2025-004",
          confirmedExposure: 178000,
          evidenceStrength: "strong"
        },
        ghostOutput: {
          recommendation: "full_recovery",
          riskScore: 75.0,
          findings: [
            { type: "phantom_billing", description: "Non-dispensed medications billed", severity: "high" }
          ],
          suggestedActions: ["initiate_recovery", "enhanced_monitoring"]
        },
        productionOutput: {
          recommendation: "full_recovery",
          riskScore: 76.2,
          findings: [
            { type: "phantom_billing", description: "Non-dispensed medications billed", severity: "high" }
          ],
          suggestedActions: ["initiate_recovery", "enhanced_monitoring"]
        },
        comparison: {
          matchScore: 0.98,
          discrepancies: [
            { field: "riskScore", ghostValue: 75.0, productionValue: 76.2, impact: "negligible" }
          ],
          overallAssessment: "Excellent alignment between ghost and production outputs"
        },
        status: "completed",
        executionTimeMs: 2891,
        createdBy: "qa_automation"
      },
      {
        runId: "GR-004",
        agentType: "A1-patient-pattern-analyzer",
        phase: "A1",
        entityType: "patient",
        targetId: "PAT-1001",
        targetType: "fwa_case",
        inputData: {
          patientId: "PAT-1001",
          analysisType: "doctor_shopping"
        },
        ghostOutput: null,
        productionOutput: null,
        comparison: null,
        status: "pending",
        executionTimeMs: null,
        createdBy: "batch_scheduler"
      },
      {
        runId: "GR-005",
        agentType: "A2-network-analyzer",
        phase: "A2",
        entityType: "provider",
        targetId: "RING-ANALYSIS-001",
        targetType: "collusion_ring",
        inputData: {
          nodeIds: ["FAC-001", "DOC-001", "DOC-002"],
          analysisScope: "financial_relationships"
        },
        ghostOutput: null,
        productionOutput: null,
        comparison: null,
        status: "failed",
        executionTimeMs: 15234,
        createdBy: "graph_team"
      }
    ];

    for (const run of ghostRunsData) {
      await storage.createGhostRun(run);
    }
    console.log(`[Seeder] Created ${ghostRunsData.length} ghost runs`);

    console.log("[Seeder] Simulation Lab seeding complete");
  } catch (error) {
    console.error("[Seeder] Error seeding Simulation Lab:", error);
  }
}

async function seedGraphAnalysisData(): Promise<void> {
  try {
    const existingGraphs = await storage.listRelationshipGraphs();
    if (existingGraphs.length > 0) {
      console.log(`[Seeder] Graph Analysis already has ${existingGraphs.length} graphs, skipping`);
      return;
    }

    console.log("[Seeder] Seeding Graph Analysis data...");

    // Seed Relationship Graphs - 2 graphs
    const relationshipGraphsData = [
      {
        graphId: "GRAPH-001",
        name: "Provider-Patient Network",
        description: "Network analysis of provider-patient relationships in Central Region",
        graphType: "provider_patient",
        nodes: [
          { nodeId: "N-001", entityType: "provider", entityId: "FAC-001", entityName: "King Faisal Specialist Hospital", riskScore: 87.5, riskLevel: "critical", metadata: { specialty: "Multi-Specialty", region: "Central" } },
          { nodeId: "N-002", entityType: "provider", entityId: "FAC-002", entityName: "Saudi German Hospital", riskScore: 72.3, riskLevel: "high", metadata: { specialty: "General Hospital", region: "Central" } },
          { nodeId: "N-003", entityType: "doctor", entityId: "DOC-001", entityName: "Dr. Ahmad Al-Farhan", riskScore: 78.5, riskLevel: "high", metadata: { specialty: "Pain Management" } },
          { nodeId: "N-004", entityType: "doctor", entityId: "DOC-002", entityName: "Dr. Saleh Al-Mutairi", riskScore: 68.3, riskLevel: "high", metadata: { specialty: "Orthopedic Surgery" } },
          { nodeId: "N-005", entityType: "patient", entityId: "PAT-1001", entityName: "Mohammed Al-Rashid", riskScore: 82.5, riskLevel: "critical", metadata: { diagnosis: "Chronic Pain" } },
          { nodeId: "N-006", entityType: "patient", entityId: "PAT-1002", entityName: "Fatima Al-Zahrani", riskScore: 71.3, riskLevel: "high", metadata: { diagnosis: "Fibromyalgia" } },
          { nodeId: "N-007", entityType: "patient", entityId: "PAT-1003", entityName: "Abdullah Al-Saud", riskScore: 64.8, riskLevel: "high", metadata: { diagnosis: "Type 2 Diabetes" } },
          { nodeId: "N-008", entityType: "doctor", entityId: "DOC-003", entityName: "Dr. Layla Al-Shammari", riskScore: 54.2, riskLevel: "medium", metadata: { specialty: "Dermatology" } }
        ],
        edges: [
          { edgeId: "E-001", sourceNodeId: "N-005", targetNodeId: "N-003", relationshipType: "treated_by", weight: 0.95, transactionCount: 45, totalAmount: 125000, flags: ["high_frequency", "opioid_prescriptions"], metadata: {} },
          { edgeId: "E-002", sourceNodeId: "N-005", targetNodeId: "N-001", relationshipType: "billed_for", weight: 0.88, transactionCount: 32, totalAmount: 287500, flags: ["high_cost"], metadata: {} },
          { edgeId: "E-003", sourceNodeId: "N-003", targetNodeId: "N-001", relationshipType: "employed_by", weight: 1.0, transactionCount: 0, totalAmount: 0, flags: [], metadata: { employment_type: "staff" } },
          { edgeId: "E-004", sourceNodeId: "N-006", targetNodeId: "N-004", relationshipType: "treated_by", weight: 0.82, transactionCount: 28, totalAmount: 145000, flags: ["procedure_frequency"], metadata: {} },
          { edgeId: "E-005", sourceNodeId: "N-006", targetNodeId: "N-002", relationshipType: "billed_for", weight: 0.75, transactionCount: 15, totalAmount: 89000, flags: [], metadata: {} },
          { edgeId: "E-006", sourceNodeId: "N-003", targetNodeId: "N-004", relationshipType: "referred_to", weight: 0.91, transactionCount: 89, totalAmount: 0, flags: ["concentrated_referrals"], metadata: { referral_rate: 0.92 } },
          { edgeId: "E-007", sourceNodeId: "N-007", targetNodeId: "N-001", relationshipType: "billed_for", weight: 0.70, transactionCount: 124, totalAmount: 523450, flags: ["chronic_patient"], metadata: {} },
          { edgeId: "E-008", sourceNodeId: "N-007", targetNodeId: "N-008", relationshipType: "treated_by", weight: 0.45, transactionCount: 8, totalAmount: 12500, flags: [], metadata: {} },
          { edgeId: "E-009", sourceNodeId: "N-004", targetNodeId: "N-002", relationshipType: "employed_by", weight: 1.0, transactionCount: 0, totalAmount: 0, flags: [], metadata: { employment_type: "consultant" } },
          { edgeId: "E-010", sourceNodeId: "N-008", targetNodeId: "N-001", relationshipType: "employed_by", weight: 0.5, transactionCount: 0, totalAmount: 0, flags: [], metadata: { employment_type: "visiting" } },
          { edgeId: "E-011", sourceNodeId: "N-005", targetNodeId: "N-004", relationshipType: "treated_by", weight: 0.65, transactionCount: 12, totalAmount: 54000, flags: ["cross_provider"], metadata: {} },
          { edgeId: "E-012", sourceNodeId: "N-006", targetNodeId: "N-001", relationshipType: "billed_for", weight: 0.55, transactionCount: 9, totalAmount: 56680, flags: [], metadata: {} }
        ],
        metrics: {
          totalNodes: 8,
          totalEdges: 12,
          avgDegree: 3.0,
          density: 0.43,
          clusteringCoefficient: 0.67,
          connectedComponents: 1,
          riskHotspots: ["N-001", "N-003", "N-005"]
        },
        analysisResults: {
          anomalyScore: 78.5,
          suspiciousPatterns: [
            { patternType: "concentrated_referrals", description: "Dr. Al-Farhan refers 92% of orthopedic cases to single surgeon", involvedNodes: ["N-003", "N-004"], severity: "high" },
            { patternType: "patient_steering", description: "High-risk patient exclusively treated by flagged providers", involvedNodes: ["N-005", "N-003", "N-001"], severity: "critical" }
          ],
          recommendations: ["Investigate referral relationship between N-003 and N-004", "Review treatment patterns for patient N-005"],
          lastAnalyzedAt: new Date().toISOString()
        },
        status: "active",
        createdBy: "graph_analytics"
      },
      {
        graphId: "GRAPH-002",
        name: "Referral Ring Analysis",
        description: "Analysis of circular referral patterns in specialty care",
        graphType: "referral_network",
        nodes: [
          { nodeId: "R-001", entityType: "doctor", entityId: "DOC-001", entityName: "Dr. Ahmad Al-Farhan", riskScore: 78.5, riskLevel: "high", metadata: { specialty: "Pain Management" } },
          { nodeId: "R-002", entityType: "doctor", entityId: "DOC-002", entityName: "Dr. Saleh Al-Mutairi", riskScore: 68.3, riskLevel: "high", metadata: { specialty: "Orthopedic Surgery" } },
          { nodeId: "R-003", entityType: "doctor", entityId: "DOC-004", entityName: "Dr. Omar Al-Dosari", riskScore: 42.1, riskLevel: "medium", metadata: { specialty: "Cardiology" } },
          { nodeId: "R-004", entityType: "provider", entityId: "FAC-001", entityName: "King Faisal Specialist Hospital", riskScore: 87.5, riskLevel: "critical", metadata: {} },
          { nodeId: "R-005", entityType: "provider", entityId: "FAC-004", entityName: "Dallah Health Clinic", riskScore: 52.4, riskLevel: "medium", metadata: {} },
          { nodeId: "R-006", entityType: "doctor", entityId: "DOC-005", entityName: "Dr. Hana Al-Otaibi", riskScore: 28.5, riskLevel: "low", metadata: { specialty: "Family Medicine" } }
        ],
        edges: [
          { edgeId: "RE-001", sourceNodeId: "R-001", targetNodeId: "R-002", relationshipType: "referred_to", weight: 0.92, transactionCount: 89, totalAmount: 0, flags: ["high_concentration"], metadata: { referral_percentage: 92 } },
          { edgeId: "RE-002", sourceNodeId: "R-002", targetNodeId: "R-003", relationshipType: "referred_to", weight: 0.45, transactionCount: 34, totalAmount: 0, flags: [], metadata: { referral_percentage: 45 } },
          { edgeId: "RE-003", sourceNodeId: "R-003", targetNodeId: "R-001", relationshipType: "referred_to", weight: 0.38, transactionCount: 28, totalAmount: 0, flags: ["circular_pattern"], metadata: { referral_percentage: 38 } },
          { edgeId: "RE-004", sourceNodeId: "R-006", targetNodeId: "R-001", relationshipType: "referred_to", weight: 0.25, transactionCount: 142, totalAmount: 0, flags: [], metadata: { referral_percentage: 25 } },
          { edgeId: "RE-005", sourceNodeId: "R-006", targetNodeId: "R-003", relationshipType: "referred_to", weight: 0.18, transactionCount: 98, totalAmount: 0, flags: [], metadata: { referral_percentage: 18 } },
          { edgeId: "RE-006", sourceNodeId: "R-001", targetNodeId: "R-004", relationshipType: "employed_by", weight: 1.0, transactionCount: 0, totalAmount: 0, flags: [], metadata: {} },
          { edgeId: "RE-007", sourceNodeId: "R-002", targetNodeId: "R-004", relationshipType: "employed_by", weight: 0.5, transactionCount: 0, totalAmount: 0, flags: [], metadata: { employment_type: "consultant" } },
          { edgeId: "RE-008", sourceNodeId: "R-006", targetNodeId: "R-005", relationshipType: "employed_by", weight: 1.0, transactionCount: 0, totalAmount: 0, flags: [], metadata: {} }
        ],
        metrics: {
          totalNodes: 6,
          totalEdges: 8,
          avgDegree: 2.67,
          density: 0.53,
          clusteringCoefficient: 0.45,
          connectedComponents: 1,
          riskHotspots: ["R-001", "R-002"]
        },
        analysisResults: {
          anomalyScore: 72.3,
          suspiciousPatterns: [
            { patternType: "referral_loop", description: "Circular referral pattern detected: Pain Mgmt -> Ortho -> Cardio -> Pain Mgmt", involvedNodes: ["R-001", "R-002", "R-003"], severity: "high" }
          ],
          recommendations: ["Investigate financial relationships between doctors in referral loop", "Compare referral patterns to regional benchmarks"],
          lastAnalyzedAt: new Date().toISOString()
        },
        status: "active",
        createdBy: "network_analysis"
      }
    ];

    for (const graph of relationshipGraphsData) {
      await storage.createRelationshipGraph(graph);
    }
    console.log(`[Seeder] Created ${relationshipGraphsData.length} relationship graphs`);

    // Seed Collusion Rings - 2 rings
    const collusionRingsData = [
      {
        ringId: "RING-001",
        name: "Al Riyadh Billing Scheme",
        description: "Coordinated billing fraud scheme involving hospital and affiliated physicians",
        ringType: "billing_fraud",
        detectionMethod: "ai_analysis",
        members: [
          { memberId: "M-001", entityType: "provider", entityId: "FAC-001", entityName: "King Faisal Specialist Hospital", role: "facilitator", riskScore: 87.5, involvement: "Primary billing entity", evidenceStrength: "strong" },
          { memberId: "M-002", entityType: "doctor", entityId: "DOC-001", entityName: "Dr. Ahmad Al-Farhan", role: "leader", riskScore: 78.5, involvement: "Orchestrating upcoding scheme", evidenceStrength: "strong" },
          { memberId: "M-003", entityType: "doctor", entityId: "DOC-002", entityName: "Dr. Saleh Al-Mutairi", role: "participant", riskScore: 68.3, involvement: "Unnecessary procedures", evidenceStrength: "moderate" },
          { memberId: "M-004", entityType: "patient", entityId: "PAT-1001", entityName: "Mohammed Al-Rashid", role: "beneficiary", riskScore: 82.5, involvement: "Receiving excessive treatments", evidenceStrength: "circumstantial" }
        ],
        evidence: [
          { evidenceId: "EV-001", type: "claim_pattern", description: "Systematic upcoding of E&M codes across 847 claims", sourceType: "claims_analysis", sourceId: "ANALYSIS-2025-001", weight: 0.94, attachments: [] },
          { evidenceId: "EV-002", type: "financial_flow", description: "Irregular payment patterns between entities", sourceType: "financial_audit", sourceId: "AUDIT-2025-001", weight: 0.87, attachments: [] },
          { evidenceId: "EV-003", type: "timing_anomaly", description: "Claims submitted outside business hours with consistent patterns", sourceType: "temporal_analysis", sourceId: "TEMP-2025-001", weight: 0.72, attachments: [] }
        ],
        financialImpact: {
          totalExposure: 450000,
          confirmedLosses: 287500,
          potentialRecovery: 225000,
          affectedClaimsCount: 847,
          timeframeStart: "2024-01-01",
          timeframeEnd: "2025-12-31"
        },
        riskAssessment: {
          overallRiskScore: 89.5,
          riskLevel: "critical",
          confidenceScore: 0.91,
          factors: [
            { factor: "Pattern Consistency", weight: 0.3, score: 94 },
            { factor: "Financial Impact", weight: 0.25, score: 88 },
            { factor: "Evidence Strength", weight: 0.25, score: 85 },
            { factor: "Network Connectivity", weight: 0.2, score: 91 }
          ]
        },
        status: "investigating",
        investigationStatus: "in_progress",
        assignedTo: "FWA Unit Team A",
        referredTo: null,
        aiSummary: "High-confidence detection of coordinated billing fraud involving King Faisal Specialist Hospital and affiliated physicians. The scheme centers on systematic E&M code upcoding with an estimated exposure of SAR 450,000. Dr. Ahmad Al-Farhan appears to be the primary orchestrator, with evidence of kickback arrangements. Immediate investigation recommended with potential regulatory referral.",
        createdBy: "ai_detection"
      },
      {
        ringId: "RING-002",
        name: "Specialty Kickback Network",
        description: "Kickback scheme involving concentrated referral patterns between specialists",
        ringType: "kickback",
        detectionMethod: "pattern_matching",
        members: [
          { memberId: "M-005", entityType: "doctor", entityId: "DOC-001", entityName: "Dr. Ahmad Al-Farhan", role: "leader", riskScore: 78.5, involvement: "Receiving kickbacks for referrals", evidenceStrength: "moderate" },
          { memberId: "M-006", entityType: "doctor", entityId: "DOC-002", entityName: "Dr. Saleh Al-Mutairi", role: "participant", riskScore: 68.3, involvement: "Paying for referrals", evidenceStrength: "moderate" },
          { memberId: "M-007", entityType: "doctor", entityId: "DOC-004", entityName: "Dr. Omar Al-Dosari", role: "participant", riskScore: 42.1, involvement: "Peripheral involvement in referral chain", evidenceStrength: "circumstantial" }
        ],
        evidence: [
          { evidenceId: "EV-004", type: "claim_pattern", description: "92% of orthopedic referrals from single source", sourceType: "referral_analysis", sourceId: "REF-2025-001", weight: 0.88, attachments: [] },
          { evidenceId: "EV-005", type: "financial_flow", description: "Indirect payments through consulting arrangements", sourceType: "financial_review", sourceId: "FIN-2025-001", weight: 0.75, attachments: [] }
        ],
        financialImpact: {
          totalExposure: 180000,
          confirmedLosses: 0,
          potentialRecovery: 120000,
          affectedClaimsCount: 234,
          timeframeStart: "2024-06-01",
          timeframeEnd: "2025-12-31"
        },
        riskAssessment: {
          overallRiskScore: 72.0,
          riskLevel: "high",
          confidenceScore: 0.78,
          factors: [
            { factor: "Referral Concentration", weight: 0.35, score: 92 },
            { factor: "Financial Indicators", weight: 0.3, score: 68 },
            { factor: "Pattern Deviation", weight: 0.35, score: 58 }
          ]
        },
        status: "detected",
        investigationStatus: "pending",
        assignedTo: "FWA Unit Team B",
        referredTo: null,
        aiSummary: "Medium-confidence detection of potential kickback arrangement between pain management and orthopedic specialists. The concentrated referral pattern (92% to single surgeon) significantly deviates from regional norms. Estimated exposure of SAR 180,000. Further investigation needed to confirm financial relationship.",
        createdBy: "pattern_engine"
      }
    ];

    for (const ring of collusionRingsData) {
      await storage.createCollusionRing(ring);
    }
    console.log(`[Seeder] Created ${collusionRingsData.length} collusion rings`);

    console.log("[Seeder] Graph Analysis seeding complete");
  } catch (error) {
    console.error("[Seeder] Error seeding Graph Analysis:", error);
  }
}

// Seed FWA Analyzed Claims - Core claims data for the platform
async function seedFwaAnalyzedClaimsData(): Promise<void> {
  const providers = [
    { id: "PRV-GEN-0001", name: "King Faisal Specialist Hospital", type: "Hospital", city: "Riyadh" },
    { id: "PRV-GEN-0002", name: "Saudi German Hospital", type: "Hospital", city: "Jeddah" },
    { id: "PRV-GEN-0003", name: "Dr. Sulaiman Al Habib Medical Group", type: "Hospital", city: "Riyadh" },
    { id: "PRV-GEN-0004", name: "Dallah Hospital", type: "Hospital", city: "Riyadh" },
    { id: "PRV-GEN-0005", name: "International Medical Center", type: "Hospital", city: "Jeddah" },
    { id: "PRV-GEN-0006", name: "National Guard Hospital", type: "Hospital", city: "Riyadh" },
    { id: "PRV-GEN-0007", name: "Johns Hopkins Aramco Healthcare", type: "Hospital", city: "Dhahran" },
    { id: "PRV-GEN-0008", name: "Mouwasat Medical Services", type: "Hospital", city: "Dammam" },
  ];

  const doctors = [
    { id: "DOC-001", specialty: "Cardiology" },
    { id: "DOC-002", specialty: "Orthopedics" },
    { id: "DOC-003", specialty: "Internal Medicine" },
    { id: "DOC-004", specialty: "General Surgery" },
    { id: "DOC-005", specialty: "Oncology" },
    { id: "DOC-006", specialty: "Neurology" },
    { id: "DOC-007", specialty: "Pediatrics" },
    { id: "DOC-008", specialty: "Emergency Medicine" },
  ];

  const diagnosisCodes = [
    { code: "I25.10", desc: "Atherosclerotic heart disease" },
    { code: "M54.5", desc: "Low back pain" },
    { code: "J06.9", desc: "Acute upper respiratory infection" },
    { code: "K21.0", desc: "Gastro-esophageal reflux disease" },
    { code: "E11.9", desc: "Type 2 diabetes mellitus" },
    { code: "I10", desc: "Essential hypertension" },
    { code: "F32.9", desc: "Major depressive disorder" },
    { code: "G43.909", desc: "Migraine, unspecified" },
    { code: "J18.9", desc: "Pneumonia, unspecified" },
    { code: "N39.0", desc: "Urinary tract infection" },
  ];

  const serviceCodes = [
    { code: "99213", desc: "Office visit - established patient, low", price: 250 },
    { code: "99214", desc: "Office visit - established patient, moderate", price: 400 },
    { code: "99215", desc: "Office visit - established patient, high", price: 600 },
    { code: "99283", desc: "Emergency dept visit - moderate", price: 800 },
    { code: "99284", desc: "Emergency dept visit - moderately severe", price: 1200 },
    { code: "99285", desc: "Emergency dept visit - high severity", price: 2000 },
    { code: "71046", desc: "Chest X-ray, 2 views", price: 350 },
    { code: "73030", desc: "X-ray shoulder complete", price: 280 },
    { code: "93000", desc: "Electrocardiogram complete", price: 200 },
    { code: "80053", desc: "Comprehensive metabolic panel", price: 150 },
    { code: "85025", desc: "Complete blood count", price: 80 },
    { code: "36415", desc: "Venipuncture", price: 30 },
    { code: "97110", desc: "Physical therapy - therapeutic exercises", price: 180 },
    { code: "27447", desc: "Total knee replacement", price: 45000 },
    { code: "33533", desc: "Coronary artery bypass", price: 120000 },
  ];

  const claimTypes = ["Inpatient", "Outpatient", "Emergency", "Pharmacy"];
  const statuses = ["approved", "denied", "pending", "flagged", "under_review"];

  const claims: any[] = [];
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  for (let i = 0; i < 500; i++) {
    const provider = providers[Math.floor(Math.random() * providers.length)];
    const doctor = doctors[Math.floor(Math.random() * doctors.length)];
    const diagnosis = diagnosisCodes[Math.floor(Math.random() * diagnosisCodes.length)];
    const service = serviceCodes[Math.floor(Math.random() * serviceCodes.length)];
    const claimType = claimTypes[Math.floor(Math.random() * claimTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const quantity = Math.floor(Math.random() * 3) + 1;
    const basePrice = service.price * (0.8 + Math.random() * 0.4);
    const totalAmount = basePrice * quantity;
    const patientShare = totalAmount * (Math.random() * 0.2);
    
    const claimDate = new Date(threeMonthsAgo.getTime() + Math.random() * (now.getTime() - threeMonthsAgo.getTime()));
    const patientId = `PAT-${String(Math.floor(Math.random() * 1000) + 1).padStart(4, '0')}`;
    
    claims.push({
      claimReference: `CLM-2025-${String(i + 1).padStart(6, '0')}`,
      batchNumber: `BATCH-${Math.floor(i / 50) + 1}`,
      batchDate: claimDate,
      patientId,
      dateOfBirth: new Date(1950 + Math.floor(Math.random() * 50), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      gender: Math.random() > 0.5 ? "Male" : "Female",
      isNewborn: false,
      isChronic: Math.random() > 0.8,
      isPreExisting: Math.random() > 0.9,
      policyNo: `POL-${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`,
      policyEffectiveDate: new Date(2024, 0, 1),
      policyExpiryDate: new Date(2025, 11, 31),
      groupNo: `GRP-${Math.floor(Math.random() * 100) + 1}`,
      providerId: provider.id,
      practitionerLicense: doctor.id,
      specialtyCode: doctor.specialty,
      city: provider.city,
      providerType: provider.type,
      claimType,
      claimOccurrenceDate: claimDate,
      claimBenefitCode: "MEDICAL",
      lengthOfStay: claimType === "Inpatient" ? Math.floor(Math.random() * 10) + 1 : null,
      isPreAuthorized: Math.random() > 0.7,
      authorizationId: Math.random() > 0.7 ? `AUTH-${Math.floor(Math.random() * 10000)}` : null,
      principalDiagnosisCode: diagnosis.code,
      secondaryDiagnosisCodes: Math.random() > 0.5 ? [diagnosisCodes[Math.floor(Math.random() * diagnosisCodes.length)].code] : [],
      claimSupportingInfo: diagnosis.desc,
      serviceType: service.desc,
      serviceCode: service.code,
      serviceDescription: service.desc,
      unitPrice: basePrice.toFixed(2),
      quantity,
      totalAmount: totalAmount.toFixed(2),
      patientShare: patientShare.toFixed(2),
      originalStatus: status,
      aiStatus: status === "flagged" ? "high_risk" : status === "under_review" ? "medium_risk" : "low_risk",
      validationResults: status === "flagged" ? { issues: ["Potential duplicate", "High amount"] } : null,
      sourceFile: "demo-seed.csv"
    });
  }

  // Insert claims using db
  const { db } = await import("../db");
  const { fwaAnalyzedClaims } = await import("@shared/schema");
  
  console.log(`[Seeder] Inserting ${claims.length} analyzed claims...`);
  
  // Insert in batches of 50
  for (let i = 0; i < claims.length; i += 50) {
    const batch = claims.slice(i, i + 50);
    try {
      await db.insert(fwaAnalyzedClaims).values(batch).onConflictDoNothing();
    } catch (err) {
      console.error(`[Seeder] Error inserting claims batch ${i / 50 + 1}:`, err);
    }
  }
  
  console.log("[Seeder] FWA Analyzed Claims seeding complete");
}

// Seed detection results tables for Operations Center dashboard
async function seedDetectionResults() {
  const { db } = await import("../db");
  const { fwaDetectionResults, fwaProviderDetectionResults, fwaDoctorDetectionResults, fwaPatientDetectionResults, fwaCases, enforcementCases } = await import("@shared/schema");
  const { count, sql } = await import("drizzle-orm");
  
  console.log("[Seeder] Seeding detection results for Operations Center...");
  
  // Check entity detection tables - these are what the dashboard needs
  const [providerCount, doctorCount, patientCount] = await Promise.all([
    db.select({ count: count() }).from(fwaProviderDetectionResults),
    db.select({ count: count() }).from(fwaDoctorDetectionResults),
    db.select({ count: count() }).from(fwaPatientDetectionResults),
  ]);
  
  const needsEntitySeeding = 
    Number(providerCount[0]?.count || 0) < 5 ||
    Number(doctorCount[0]?.count || 0) < 3 ||
    Number(patientCount[0]?.count || 0) < 3;
  
  if (!needsEntitySeeding) {
    console.log("[Seeder] Entity detection results already seeded, skipping");
    return;
  }
  
  console.log("[Seeder] Entity detection counts:", {
    providers: providerCount[0]?.count,
    doctors: doctorCount[0]?.count,
    patients: patientCount[0]?.count
  });
  
  const riskLevels = ["critical", "high", "medium", "low"] as const;
  const providers = ["PRV001", "PRV002", "PRV003", "PRV004", "PRV005", "PRV006", "PRV007", "PRV008"];
  const doctors = ["DOC001", "DOC002", "DOC003", "DOC004", "DOC005", "DOC006"];
  const patients = ["PAT001", "PAT002", "PAT003", "PAT004", "PAT005", "PAT006", "PAT007", "PAT008"];
  
  // Seed claim-level detection results (80 claims across risk levels)
  const claimDetections: Array<{
    claimId: string;
    caseId: string | null;
    providerId: string;
    patientId: string;
    compositeScore: string;
    compositeRiskLevel: "critical" | "high" | "medium" | "low";
    ruleEngineScore: string;
    statisticalScore: string;
    unsupervisedScore: string;
    ragLlmScore: string;
    primaryDetectionMethod: "rule_engine";
    detectionSummary: string;
    recommendedAction: string;
    createdAt: Date;
  }> = [];
  for (let i = 0; i < 80; i++) {
    const riskLevel = (i < 10 ? "critical" : i < 25 ? "high" : i < 50 ? "medium" : "low") as "critical" | "high" | "medium" | "low";
    claimDetections.push({
      claimId: `CLM-2024-${String(i + 1).padStart(5, "0")}`,
      caseId: i < 20 ? `CASE-${String(i + 1).padStart(4, "0")}` : null,
      providerId: providers[i % providers.length],
      patientId: patients[i % patients.length],
      compositeScore: String(riskLevel === "critical" ? 85 + Math.random() * 15 : riskLevel === "high" ? 70 + Math.random() * 15 : riskLevel === "medium" ? 50 + Math.random() * 20 : 20 + Math.random() * 30),
      compositeRiskLevel: riskLevel,
      ruleEngineScore: String(Math.random() * 100),
      statisticalScore: String(Math.random() * 100),
      unsupervisedScore: String(Math.random() * 100),
      ragLlmScore: String(Math.random() * 100),
      primaryDetectionMethod: "rule_engine",
      detectionSummary: `Detected ${riskLevel} risk pattern in claim`,
      recommendedAction: riskLevel === "critical" ? "Immediate investigation required" : "Review recommended",
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    });
  }
  
  try {
    await db.insert(fwaDetectionResults).values(claimDetections).onConflictDoNothing();
    console.log("[Seeder] Inserted 80 claim detection results");
  } catch (err) {
    console.error("[Seeder] Error inserting claim detections:", err);
  }
  
  // Seed provider-level detection results
  const providerDetections = providers.map((providerId, i) => ({
    providerId,
    compositeScore: String(i < 2 ? 85 + Math.random() * 10 : i < 4 ? 65 + Math.random() * 15 : 30 + Math.random() * 30),
    riskLevel: i < 2 ? "critical" as const : i < 4 ? "high" as const : i < 6 ? "medium" as const : "low" as const,
    ruleEngineScore: String(Math.random() * 100),
    statisticalScore: String(Math.random() * 100),
    unsupervisedScore: String(Math.random() * 100),
    ragLlmScore: String(Math.random() * 100),
    semanticScore: String(Math.random() * 100),
    createdAt: new Date(),
  }));
  
  try {
    await db.insert(fwaProviderDetectionResults).values(providerDetections).onConflictDoNothing();
    console.log("[Seeder] Inserted provider detection results");
  } catch (err) {
    console.error("[Seeder] Error inserting provider detections:", err);
  }
  
  // Seed doctor-level detection results  
  const doctorDetections = doctors.map((doctorId, i) => ({
    doctorId,
    compositeScore: String(i < 2 ? 80 + Math.random() * 15 : i < 4 ? 55 + Math.random() * 20 : 25 + Math.random() * 25),
    riskLevel: i < 2 ? "high" as const : i < 4 ? "medium" as const : "low" as const,
    ruleEngineScore: String(Math.random() * 100),
    statisticalScore: String(Math.random() * 100),
    unsupervisedScore: String(Math.random() * 100),
    ragLlmScore: String(Math.random() * 100),
    semanticScore: String(Math.random() * 100),
    createdAt: new Date(),
  }));
  
  try {
    await db.insert(fwaDoctorDetectionResults).values(doctorDetections).onConflictDoNothing();
    console.log("[Seeder] Inserted doctor detection results");
  } catch (err) {
    console.error("[Seeder] Error inserting doctor detections:", err);
  }
  
  // Seed patient-level detection results
  const patientDetections = patients.map((patientId, i) => ({
    patientId,
    compositeScore: String(i < 2 ? 75 + Math.random() * 20 : i < 4 ? 50 + Math.random() * 20 : 20 + Math.random() * 30),
    riskLevel: i < 2 ? "high" as const : i < 4 ? "medium" as const : "low" as const,
    ruleEngineScore: String(Math.random() * 100),
    statisticalScore: String(Math.random() * 100),
    unsupervisedScore: String(Math.random() * 100),
    ragLlmScore: String(Math.random() * 100),
    semanticScore: String(Math.random() * 100),
    createdAt: new Date(),
  }));
  
  try {
    await db.insert(fwaPatientDetectionResults).values(patientDetections).onConflictDoNothing();
    console.log("[Seeder] Inserted patient detection results");
  } catch (err) {
    console.error("[Seeder] Error inserting patient detections:", err);
  }
  
  // Check and seed FWA Cases if needed
  const existingCases = await db.select({ count: count() }).from(fwaCases);
  if (Number(existingCases[0]?.count || 0) < 5) {
    const cases = [
      { caseId: "CASE-0001", claimId: "CLM-2024-00001", providerId: "PRV001", patientId: "PAT001", status: "analyzing" as const, priority: "high" as const, totalAmount: "125000" },
      { caseId: "CASE-0002", claimId: "CLM-2024-00002", providerId: "PRV002", patientId: "PAT002", status: "action_pending" as const, priority: "critical" as const, totalAmount: "250000" },
      { caseId: "CASE-0003", claimId: "CLM-2024-00003", providerId: "PRV003", patientId: "PAT003", status: "action_pending" as const, priority: "high" as const, totalAmount: "89000" },
      { caseId: "CASE-0004", claimId: "CLM-2024-00004", providerId: "PRV004", patientId: "PAT004", status: "analyzing" as const, priority: "medium" as const, totalAmount: "45000" },
      { caseId: "CASE-0005", claimId: "CLM-2024-00005", providerId: "PRV005", patientId: "PAT005", status: "action_pending" as const, priority: "high" as const, totalAmount: "175000" },
    ];
    try {
      await db.insert(fwaCases).values(cases).onConflictDoNothing();
      console.log("[Seeder] Inserted FWA cases");
    } catch (err) {
      console.error("[Seeder] Error inserting FWA cases:", err);
    }
  }
  
  // Check and seed Enforcement Cases if needed
  const existingEnforcement = await db.select({ count: count() }).from(enforcementCases);
  if (Number(existingEnforcement[0]?.count || 0) < 3) {
    const enforcement = [
      { 
        caseNumber: "ENF-2024-001", 
        providerId: "PRV001",
        providerName: "Al-Salam Medical Center",
        description: "Excessive billing patterns detected across multiple service categories",
        findingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        status: "warning_issued" as const,
        warningDueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days overdue
      },
      { 
        caseNumber: "ENF-2024-002", 
        providerId: "PRV002",
        providerName: "King Faisal Specialist Hospital",
        description: "Upcoding violations in emergency department claims",
        findingDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        status: "corrective_action" as const,
        correctiveActionDueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days overdue
      },
      { 
        caseNumber: "ENF-2024-003", 
        providerId: "PRV003",
        providerName: "Saudi German Hospital",
        description: "Service unbundling concerns requiring ongoing monitoring",
        findingDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        status: "monitoring" as const,
      },
    ];
    try {
      await db.insert(enforcementCases).values(enforcement).onConflictDoNothing();
      console.log("[Seeder] Inserted enforcement cases");
    } catch (err) {
      console.error("[Seeder] Error inserting enforcement cases:", err);
    }
  }
  
  console.log("[Seeder] Detection results seeding complete");
}
