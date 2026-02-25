/**
 * Canonical Field Registry for FWA Detection Rules
 * 
 * This registry defines ALL valid fields that can be used in rule conditions.
 * It enables:
 * 1. Field validation at rule creation/edit time
 * 2. Field aliasing for backward compatibility and client schema flexibility
 * 3. Bulk field renaming across all rules
 * 4. Documentation of field types and descriptions
 */

export interface FieldDefinition {
  canonicalName: string;
  aliases: string[];
  type: 'number' | 'string' | 'boolean' | 'date' | 'array';
  category: 'claim' | 'provider' | 'member' | 'derived' | 'temporal' | 'network' | 'peer' | 'risk';
  description: string;
  descriptionAr: string;
  operators: string[];
  unit?: string;
  minValue?: number;
  maxValue?: number;
}

export const VALID_OPERATORS = [
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'greater_than_or_equals',
  'less_than_or_equals',
  'between',
  'contains',
  'not_contains',
  'starts_with',
  'not_starts_with',
  'ends_with',
  'in',
  'not_in',
  'regex',
  'not_null',
  'is_null'
] as const;

export type ValidOperator = typeof VALID_OPERATORS[number];

/**
 * Complete canonical field registry
 * All rule conditions MUST use fields from this registry
 */
export const CANONICAL_FIELD_REGISTRY: FieldDefinition[] = [
  // ============================================
  // CLAIM-LEVEL FIELDS (from claims table)
  // ============================================
  {
    canonicalName: 'totalAmount',
    aliases: ['amount', 'claim_amount', 'claimAmount', 'total_amount'],
    type: 'number',
    category: 'claim',
    description: 'Total claim amount in SAR',
    descriptionAr: 'إجمالي مبلغ المطالبة بالريال السعودي',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equals', 'less_than_or_equals', 'between'],
    unit: 'SAR'
  },
  {
    canonicalName: 'claimType',
    aliases: ['claim_type', 'type'],
    type: 'string',
    category: 'claim',
    description: 'Type of claim (inpatient, outpatient, emergency)',
    descriptionAr: 'نوع المطالبة (داخلي، خارجي، طوارئ)',
    operators: ['equals', 'not_equals', 'in', 'not_in']
  },
  {
    canonicalName: 'category',
    aliases: ['claim_category'],
    type: 'string',
    category: 'claim',
    description: 'Claim category',
    descriptionAr: 'فئة المطالبة',
    operators: ['equals', 'not_equals', 'in', 'not_in']
  },
  {
    canonicalName: 'icd',
    aliases: ['diagnosisCode', 'diagnosis_code', 'principalDiagnosisCode', 'principal_diagnosis_code', 'primaryDiagnosis'],
    type: 'string',
    category: 'claim',
    description: 'ICD diagnosis code',
    descriptionAr: 'رمز التشخيص ICD',
    operators: ['equals', 'not_equals', 'starts_with', 'not_starts_with', 'contains', 'in', 'not_in']
  },
  {
    canonicalName: 'cpt',
    aliases: ['cptCode', 'cpt_code', 'procedureCode', 'procedure_code'],
    type: 'string',
    category: 'claim',
    description: 'CPT procedure code',
    descriptionAr: 'رمز الإجراء CPT',
    operators: ['equals', 'not_equals', 'starts_with', 'not_starts_with', 'contains', 'in', 'not_in']
  },
  {
    canonicalName: 'modifierCode',
    aliases: ['modifier', 'modifier_code'],
    type: 'string',
    category: 'claim',
    description: 'Procedure modifier code',
    descriptionAr: 'رمز تعديل الإجراء',
    operators: ['equals', 'not_equals', 'in', 'not_in', 'contains']
  },
  {
    canonicalName: 'specialtyCode',
    aliases: ['specialty', 'specialty_code', 'providerSpecialty'],
    type: 'string',
    category: 'claim',
    description: 'Provider specialty code',
    descriptionAr: 'رمز تخصص مقدم الخدمة',
    operators: ['equals', 'not_equals', 'in', 'not_in']
  },
  {
    canonicalName: 'providerId',
    aliases: ['provider_id', 'provider'],
    type: 'string',
    category: 'claim',
    description: 'Healthcare provider ID',
    descriptionAr: 'معرف مقدم الخدمة الصحية',
    operators: ['equals', 'not_equals', 'in', 'not_in']
  },
  {
    canonicalName: 'patientId',
    aliases: ['patient_id', 'patient', 'memberId', 'member_id'],
    type: 'string',
    category: 'claim',
    description: 'Patient/Member ID',
    descriptionAr: 'معرف المريض/العضو',
    operators: ['equals', 'not_equals', 'in', 'not_in']
  },
  {
    canonicalName: 'patientAge',
    aliases: ['patient_age', 'age', 'memberAge'],
    type: 'number',
    category: 'claim',
    description: 'Patient age in years',
    descriptionAr: 'عمر المريض بالسنوات',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equals', 'less_than_or_equals', 'between'],
    unit: 'years'
  },
  {
    canonicalName: 'gender',
    aliases: ['sex', 'patient_gender'],
    type: 'string',
    category: 'claim',
    description: 'Patient gender (M/F)',
    descriptionAr: 'جنس المريض (ذ/أ)',
    operators: ['equals', 'not_equals', 'in']
  },
  {
    canonicalName: 'lengthOfStay',
    aliases: ['length_of_stay', 'los', 'stayDays'],
    type: 'number',
    category: 'claim',
    description: 'Length of hospital stay in days',
    descriptionAr: 'مدة الإقامة في المستشفى بالأيام',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equals', 'less_than_or_equals', 'between'],
    unit: 'days'
  },
  {
    canonicalName: 'quantity',
    aliases: ['qty', 'units', 'service_quantity'],
    type: 'number',
    category: 'claim',
    description: 'Service quantity/units',
    descriptionAr: 'كمية/وحدات الخدمة',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equals', 'less_than_or_equals', 'between']
  },
  {
    canonicalName: 'serviceDate',
    aliases: ['service_date', 'date_of_service', 'dos'],
    type: 'date',
    category: 'claim',
    description: 'Date of service',
    descriptionAr: 'تاريخ الخدمة',
    operators: ['equals', 'greater_than', 'less_than', 'between']
  },
  {
    canonicalName: 'dischargeStatus',
    aliases: ['discharge_status', 'discharge'],
    type: 'string',
    category: 'claim',
    description: 'Patient discharge status',
    descriptionAr: 'حالة خروج المريض',
    operators: ['equals', 'not_equals', 'in', 'not_in']
  },
  {
    canonicalName: 'preAuthNumber',
    aliases: ['pre_auth_number', 'preAuthorizationNumber', 'preauth', 'prior_auth'],
    type: 'string',
    category: 'claim',
    description: 'Pre-authorization number',
    descriptionAr: 'رقم الموافقة المسبقة',
    operators: ['equals', 'not_equals', 'not_null', 'is_null']
  },
  {
    canonicalName: 'referringDoctor',
    aliases: ['referring_doctor', 'referrer', 'referringPhysician'],
    type: 'string',
    category: 'claim',
    description: 'Referring physician',
    descriptionAr: 'الطبيب المحول',
    operators: ['equals', 'not_equals', 'not_null', 'is_null']
  },
  {
    canonicalName: 'hospital',
    aliases: ['facility', 'provider_name', 'facilityName'],
    type: 'string',
    category: 'claim',
    description: 'Hospital/Facility name',
    descriptionAr: 'اسم المستشفى/المنشأة',
    operators: ['equals', 'not_equals', 'in', 'not_in', 'contains']
  },
  {
    canonicalName: 'surgeryFee',
    aliases: ['surgery_fee', 'surgical_fee'],
    type: 'number',
    category: 'claim',
    description: 'Surgery fee amount',
    descriptionAr: 'رسوم الجراحة',
    operators: ['equals', 'greater_than', 'less_than', 'between'],
    unit: 'SAR'
  },

  // ============================================
  // TEMPORAL FIELDS (computed from claim data)
  // ============================================
  {
    canonicalName: 'is_night_claim',
    aliases: ['isNightClaim', 'night_claim', 'afterHours'],
    type: 'boolean',
    category: 'temporal',
    description: 'Claim filed during night hours (22:00-06:00)',
    descriptionAr: 'مطالبة مقدمة خلال ساعات الليل (22:00-06:00)',
    operators: ['equals']
  },
  {
    canonicalName: 'is_weekend',
    aliases: ['isWeekend', 'weekend_claim'],
    type: 'boolean',
    category: 'temporal',
    description: 'Claim on weekend (Fri-Sat in Saudi Arabia)',
    descriptionAr: 'مطالبة في عطلة نهاية الأسبوع',
    operators: ['equals']
  },
  {
    canonicalName: 'claim_day_of_week',
    aliases: ['dayOfWeek', 'day_of_week'],
    type: 'number',
    category: 'temporal',
    description: 'Day of week (0=Sunday, 6=Saturday)',
    descriptionAr: 'يوم الأسبوع',
    operators: ['equals', 'in', 'not_in'],
    minValue: 0,
    maxValue: 6
  },
  {
    canonicalName: 'submissionHour',
    aliases: ['submission_hour', 'hour_of_day'],
    type: 'number',
    category: 'temporal',
    description: 'Hour of submission (0-23)',
    descriptionAr: 'ساعة التقديم',
    operators: ['equals', 'greater_than', 'less_than', 'between'],
    minValue: 0,
    maxValue: 23
  },
  {
    canonicalName: 'same_day_claims',
    aliases: ['sameDayClaims', 'claims_same_day'],
    type: 'number',
    category: 'temporal',
    description: 'Number of claims on same day by same provider',
    descriptionAr: 'عدد المطالبات في نفس اليوم من نفس مقدم الخدمة',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'days_since_last_claim',
    aliases: ['daysSinceLastClaim', 'days_since_last'],
    type: 'number',
    category: 'temporal',
    description: 'Days since last claim by same patient',
    descriptionAr: 'الأيام منذ آخر مطالبة لنفس المريض',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals', 'less_than_or_equals'],
    unit: 'days'
  },
  {
    canonicalName: 'burst_pattern_score',
    aliases: ['burstPatternScore', 'burst_score'],
    type: 'number',
    category: 'temporal',
    description: 'Score indicating claim burst pattern (0-1)',
    descriptionAr: 'درجة نمط تدفق المطالبات',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'provider_trend_7d_vs_30d',
    aliases: ['trend_7d_vs_30d', 'providerTrend', 'claim_trend'],
    type: 'number',
    category: 'temporal',
    description: 'Provider claim trend (7d avg / 30d avg)',
    descriptionAr: 'اتجاه مطالبات مقدم الخدمة',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'member_frequency_acceleration',
    aliases: ['frequency_acceleration', 'frequencyAcceleration'],
    type: 'number',
    category: 'temporal',
    description: 'Member claim frequency acceleration',
    descriptionAr: 'تسارع تكرار مطالبات العضو',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'los_vs_diagnosis_expected',
    aliases: ['los_vs_expected', 'losVsExpected', 'los_ratio'],
    type: 'number',
    category: 'temporal',
    description: 'Length of stay vs expected for diagnosis',
    descriptionAr: 'مدة الإقامة مقابل المتوقع للتشخيص',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals']
  },

  // ============================================
  // PROVIDER AGGREGATE FIELDS
  // ============================================
  {
    canonicalName: 'provider_claim_count_7d',
    aliases: ['providerClaimCount7d', 'provider_claims_7d'],
    type: 'number',
    category: 'provider',
    description: 'Provider claim count in last 7 days',
    descriptionAr: 'عدد مطالبات مقدم الخدمة في آخر 7 أيام',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'provider_claim_count_30d',
    aliases: ['providerClaimCount30d', 'provider_claims_30d', 'provider_claim_count'],
    type: 'number',
    category: 'provider',
    description: 'Provider claim count in last 30 days',
    descriptionAr: 'عدد مطالبات مقدم الخدمة في آخر 30 يوم',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'provider_claim_count_90d',
    aliases: ['providerClaimCount90d', 'provider_claims_90d'],
    type: 'number',
    category: 'provider',
    description: 'Provider claim count in last 90 days',
    descriptionAr: 'عدد مطالبات مقدم الخدمة في آخر 90 يوم',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'provider_avg_amount_30d',
    aliases: ['provider_avg_amount', 'providerAvgAmount', 'avg_provider_amount'],
    type: 'number',
    category: 'provider',
    description: 'Provider average claim amount (30d)',
    descriptionAr: 'متوسط مبلغ مطالبة مقدم الخدمة',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    unit: 'SAR'
  },
  {
    canonicalName: 'provider_std_amount_30d',
    aliases: ['provider_std_amount', 'providerStdAmount'],
    type: 'number',
    category: 'provider',
    description: 'Provider claim amount standard deviation (30d)',
    descriptionAr: 'الانحراف المعياري لمبلغ مطالبة مقدم الخدمة',
    operators: ['greater_than', 'less_than'],
    unit: 'SAR'
  },
  {
    canonicalName: 'provider_unique_patients_30d',
    aliases: ['provider_unique_patients', 'providerUniquePatients'],
    type: 'number',
    category: 'provider',
    description: 'Provider unique patients (30d)',
    descriptionAr: 'المرضى الفريدون لمقدم الخدمة',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'provider_denial_rate_90d',
    aliases: ['provider_denial_rate', 'providerDenialRate', 'denial_rate'],
    type: 'number',
    category: 'provider',
    description: 'Provider claim denial rate (90d)',
    descriptionAr: 'معدل رفض مطالبات مقدم الخدمة',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'provider_flag_rate_90d',
    aliases: ['provider_flag_rate', 'providerFlagRate', 'flag_rate'],
    type: 'number',
    category: 'provider',
    description: 'Provider claim flagging rate (90d)',
    descriptionAr: 'معدل تمييز مطالبات مقدم الخدمة',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'provider_weekend_ratio',
    aliases: ['providerWeekendRatio', 'weekend_ratio'],
    type: 'number',
    category: 'provider',
    description: 'Provider weekend claims ratio',
    descriptionAr: 'نسبة مطالبات مقدم الخدمة في عطلة نهاية الأسبوع',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'provider_night_ratio',
    aliases: ['providerNightRatio', 'night_ratio'],
    type: 'number',
    category: 'provider',
    description: 'Provider night-time claims ratio (22:00-06:00)',
    descriptionAr: 'نسبة مطالبات مقدم الخدمة في ساعات الليل',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'provider_surgery_rate',
    aliases: ['providerSurgeryRate', 'surgery_rate'],
    type: 'number',
    category: 'provider',
    description: 'Provider surgery claims ratio',
    descriptionAr: 'نسبة مطالبات الجراحة لمقدم الخدمة',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },

  // ============================================
  // MEMBER AGGREGATE FIELDS
  // ============================================
  {
    canonicalName: 'member_claim_count_30d',
    aliases: ['member_claim_count', 'memberClaimCount', 'patient_claim_count'],
    type: 'number',
    category: 'member',
    description: 'Member claim count in last 30 days',
    descriptionAr: 'عدد مطالبات العضو في آخر 30 يوم',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'member_claim_count_90d',
    aliases: ['memberClaimCount90d', 'patient_claim_count_90d'],
    type: 'number',
    category: 'member',
    description: 'Member claim count in last 90 days',
    descriptionAr: 'عدد مطالبات العضو في آخر 90 يوم',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'member_unique_providers_30d',
    aliases: ['member_unique_providers', 'memberUniqueProviders', 'unique_providers'],
    type: 'number',
    category: 'member',
    description: 'Member unique providers visited (30d)',
    descriptionAr: 'مقدمي الخدمة الفريدين للعضو',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'member_unique_diagnoses_30d',
    aliases: ['member_unique_diagnoses', 'memberUniqueDiagnoses', 'unique_diagnoses'],
    type: 'number',
    category: 'member',
    description: 'Member unique diagnoses (30d)',
    descriptionAr: 'التشخيصات الفريدة للعضو',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'member_total_amount_30d',
    aliases: ['member_total_amount', 'memberTotalAmount'],
    type: 'number',
    category: 'member',
    description: 'Member total claim amount (30d)',
    descriptionAr: 'إجمالي مبلغ مطالبات العضو',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    unit: 'SAR'
  },
  {
    canonicalName: 'member_avg_amount_30d',
    aliases: ['member_avg_amount', 'memberAvgAmount'],
    type: 'number',
    category: 'member',
    description: 'Member average claim amount (30d)',
    descriptionAr: 'متوسط مبلغ مطالبة العضو',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    unit: 'SAR'
  },
  {
    canonicalName: 'member_surgery_count_90d',
    aliases: ['member_surgery_count', 'memberSurgeryCount'],
    type: 'number',
    category: 'member',
    description: 'Member surgery claims (90d)',
    descriptionAr: 'عدد مطالبات الجراحة للعضو',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'member_icu_count_90d',
    aliases: ['member_icu_count', 'memberIcuCount'],
    type: 'number',
    category: 'member',
    description: 'Member ICU admissions (90d)',
    descriptionAr: 'عدد دخولات العناية المركزة للعضو',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'high_utilizer_flag',
    aliases: ['highUtilizerFlag', 'member_high_utilizer', 'high_utilizer'],
    type: 'boolean',
    category: 'member',
    description: 'Member is high utilizer',
    descriptionAr: 'العضو مستخدم مكثف',
    operators: ['equals']
  },

  // ============================================
  // DERIVED/STATISTICAL FIELDS
  // ============================================
  {
    canonicalName: 'amount_vs_provider_avg',
    aliases: ['amountVsProviderAvg', 'amount_provider_ratio'],
    type: 'number',
    category: 'derived',
    description: 'Claim amount vs provider average ratio',
    descriptionAr: 'نسبة مبلغ المطالبة لمتوسط مقدم الخدمة',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'amount_vs_member_avg',
    aliases: ['amountVsMemberAvg', 'amount_member_ratio'],
    type: 'number',
    category: 'derived',
    description: 'Claim amount vs member average ratio',
    descriptionAr: 'نسبة مبلغ المطالبة لمتوسط العضو',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'amount_vs_peer_group',
    aliases: ['amount_vs_peer_avg', 'amountVsPeerGroup', 'peer_amount_comparison'],
    type: 'number',
    category: 'derived',
    description: 'Claim amount vs peer group average ratio',
    descriptionAr: 'نسبة مبلغ المطالبة لمتوسط مجموعة النظراء',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'amount_zscore',
    aliases: ['amountZscore', 'z_score', 'zscore'],
    type: 'number',
    category: 'derived',
    description: 'Claim amount z-score (standard deviations from mean)',
    descriptionAr: 'درجة Z لمبلغ المطالبة',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals', 'less_than_or_equals']
  },
  {
    canonicalName: 'amount_percentile',
    aliases: ['amountPercentile', 'percentile'],
    type: 'number',
    category: 'derived',
    description: 'Claim amount percentile (0-100)',
    descriptionAr: 'النسبة المئوية لمبلغ المطالبة',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 100
  },
  {
    canonicalName: 'outlier_score',
    aliases: ['outlierScore', 'anomaly_score'],
    type: 'number',
    category: 'derived',
    description: 'Statistical outlier score (0-1)',
    descriptionAr: 'درجة القيمة المتطرفة',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'complexity_score',
    aliases: ['complexityScore', 'claim_complexity'],
    type: 'number',
    category: 'derived',
    description: 'Claim complexity score (0-1)',
    descriptionAr: 'درجة تعقيد المطالبة',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'risk_indicator_count',
    aliases: ['riskIndicatorCount', 'risk_indicators'],
    type: 'number',
    category: 'derived',
    description: 'Number of risk indicators triggered',
    descriptionAr: 'عدد مؤشرات المخاطر المفعلة',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'procedure_density',
    aliases: ['procedureDensity', 'procedure_per_day'],
    type: 'number',
    category: 'derived',
    description: 'Procedures per day ratio',
    descriptionAr: 'نسبة الإجراءات لكل يوم',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'procedure_diagnosis_mismatch',
    aliases: ['procedureDiagnosisMismatch', 'mismatch_score'],
    type: 'number',
    category: 'derived',
    description: 'Procedure-diagnosis mismatch score (0-1)',
    descriptionAr: 'درجة عدم تطابق الإجراء والتشخيص',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'procedure_count',
    aliases: ['procedureCount', 'num_procedures'],
    type: 'number',
    category: 'derived',
    description: 'Number of procedures in claim',
    descriptionAr: 'عدد الإجراءات في المطالبة',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'diagnosis_count',
    aliases: ['diagnosisCount', 'num_diagnoses'],
    type: 'number',
    category: 'derived',
    description: 'Number of diagnoses in claim',
    descriptionAr: 'عدد التشخيصات في المطالبة',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'amount_procedure_ratio',
    aliases: ['amountProcedureRatio', 'amount_per_procedure'],
    type: 'number',
    category: 'derived',
    description: 'Amount per procedure ratio',
    descriptionAr: 'نسبة المبلغ لكل إجراء',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    unit: 'SAR'
  },

  // ============================================
  // NETWORK/COLLUSION FIELDS
  // ============================================
  {
    canonicalName: 'entity_network_score',
    aliases: ['entityNetworkScore', 'network_score'],
    type: 'number',
    category: 'network',
    description: 'Entity network connectivity score (0-1)',
    descriptionAr: 'درجة اتصال شبكة الكيان',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'cross_entity_anomaly',
    aliases: ['crossEntityAnomaly', 'entity_anomaly'],
    type: 'number',
    category: 'network',
    description: 'Cross-entity anomaly score (0-1)',
    descriptionAr: 'درجة الشذوذ عبر الكيانات',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'collusion_indicator',
    aliases: ['collusionIndicator', 'collusion_score'],
    type: 'number',
    category: 'network',
    description: 'Collusion pattern indicator (0-1)',
    descriptionAr: 'مؤشر نمط التواطؤ',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },

  // ============================================
  // PEER COMPARISON FIELDS
  // ============================================
  {
    canonicalName: 'specialty_percentile',
    aliases: ['specialtyPercentile', 'specialty_rank'],
    type: 'number',
    category: 'peer',
    description: 'Provider ranking within specialty (0-100)',
    descriptionAr: 'ترتيب مقدم الخدمة ضمن التخصص',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 100
  },
  {
    canonicalName: 'region_percentile',
    aliases: ['regionPercentile', 'region_rank'],
    type: 'number',
    category: 'peer',
    description: 'Provider ranking within region (0-100)',
    descriptionAr: 'ترتيب مقدم الخدمة ضمن المنطقة',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 100
  },
  {
    canonicalName: 'peer_group_zscore',
    aliases: ['peerGroupZscore', 'peer_zscore'],
    type: 'number',
    category: 'peer',
    description: 'Z-score compared to peer group',
    descriptionAr: 'درجة Z مقارنة بمجموعة النظراء',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'peer_denial_comparison',
    aliases: ['peerDenialComparison'],
    type: 'number',
    category: 'peer',
    description: 'Denial rate compared to peers',
    descriptionAr: 'معدل الرفض مقارنة بالنظراء',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'peer_flag_comparison',
    aliases: ['peerFlagComparison'],
    type: 'number',
    category: 'peer',
    description: 'Flag rate compared to peers',
    descriptionAr: 'معدل التمييز مقارنة بالنظراء',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals']
  },
  {
    canonicalName: 'peer_amount_ratio',
    aliases: ['peerAmountRatio'],
    type: 'number',
    category: 'peer',
    description: 'Amount ratio compared to peers',
    descriptionAr: 'نسبة المبلغ مقارنة بالنظراء',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals']
  },

  // ============================================
  // RISK SCORE FIELDS (computed by system)
  // ============================================
  {
    canonicalName: 'provider_risk_score',
    aliases: ['providerRiskScore'],
    type: 'number',
    category: 'risk',
    description: 'Provider overall risk score (0-1)',
    descriptionAr: 'درجة مخاطر مقدم الخدمة الإجمالية',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'member_risk_score',
    aliases: ['memberRiskScore', 'patient_risk_score'],
    type: 'number',
    category: 'risk',
    description: 'Member/Patient overall risk score (0-1)',
    descriptionAr: 'درجة مخاطر العضو الإجمالية',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'doctor_risk_score',
    aliases: ['doctorRiskScore', 'physician_risk_score'],
    type: 'number',
    category: 'risk',
    description: 'Doctor/Physician overall risk score (0-1)',
    descriptionAr: 'درجة مخاطر الطبيب الإجمالية',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  },
  {
    canonicalName: 'historical_pattern_match',
    aliases: ['historicalPatternMatch', 'pattern_match_score'],
    type: 'number',
    category: 'risk',
    description: 'Historical fraud pattern match score (0-1)',
    descriptionAr: 'درجة مطابقة نمط الاحتيال التاريخي',
    operators: ['greater_than', 'less_than', 'greater_than_or_equals'],
    minValue: 0,
    maxValue: 1
  }
];

/**
 * Build lookup maps for efficient field validation and resolution
 */
export class RuleFieldRegistry {
  private canonicalMap: Map<string, FieldDefinition> = new Map();
  private aliasMap: Map<string, string> = new Map();
  private clientMappings: Map<string, Map<string, string>> = new Map();

  constructor() {
    this.buildMaps();
  }

  private buildMaps(): void {
    for (const field of CANONICAL_FIELD_REGISTRY) {
      this.canonicalMap.set(field.canonicalName.toLowerCase(), field);
      this.aliasMap.set(field.canonicalName.toLowerCase(), field.canonicalName);
      
      for (const alias of field.aliases) {
        this.aliasMap.set(alias.toLowerCase(), field.canonicalName);
      }
    }
  }

  /**
   * Resolve a field name to its canonical form
   */
  resolveField(fieldName: string): string | null {
    const lower = fieldName.toLowerCase();
    return this.aliasMap.get(lower) || null;
  }

  /**
   * Check if a field is valid (canonical or alias)
   */
  isValidField(fieldName: string): boolean {
    return this.resolveField(fieldName) !== null;
  }

  /**
   * Get field definition by canonical name or alias
   */
  getFieldDefinition(fieldName: string): FieldDefinition | null {
    const canonical = this.resolveField(fieldName);
    if (!canonical) return null;
    return this.canonicalMap.get(canonical.toLowerCase()) || null;
  }

  /**
   * Get all canonical field names
   */
  getAllCanonicalFields(): string[] {
    return Array.from(this.canonicalMap.keys());
  }

  /**
   * Get fields by category
   */
  getFieldsByCategory(category: string): FieldDefinition[] {
    return CANONICAL_FIELD_REGISTRY.filter(f => f.category === category);
  }

  /**
   * Validate an operator for a field
   */
  isValidOperatorForField(fieldName: string, operator: string): boolean {
    const field = this.getFieldDefinition(fieldName);
    if (!field) return false;
    return field.operators.includes(operator);
  }

  /**
   * Add client-specific field mapping
   */
  addClientMapping(clientId: string, clientField: string, canonicalField: string): void {
    if (!this.clientMappings.has(clientId)) {
      this.clientMappings.set(clientId, new Map());
    }
    this.clientMappings.get(clientId)!.set(clientField.toLowerCase(), canonicalField);
  }

  /**
   * Resolve field for specific client
   */
  resolveFieldForClient(fieldName: string, clientId?: string): string | null {
    if (clientId && this.clientMappings.has(clientId)) {
      const clientMapping = this.clientMappings.get(clientId)!;
      const mapped = clientMapping.get(fieldName.toLowerCase());
      if (mapped) return mapped;
    }
    return this.resolveField(fieldName);
  }

  /**
   * Get all fields as structured registry for API
   */
  getRegistryForAPI(): {
    fields: Array<{
      name: string;
      aliases: string[];
      type: string;
      category: string;
      description: string;
      descriptionAr: string;
      operators: string[];
    }>;
    operators: string[];
    categories: string[];
  } {
    return {
      fields: CANONICAL_FIELD_REGISTRY.map(f => ({
        name: f.canonicalName,
        aliases: f.aliases,
        type: f.type,
        category: f.category,
        description: f.description,
        descriptionAr: f.descriptionAr,
        operators: f.operators
      })),
      operators: [...VALID_OPERATORS],
      categories: Array.from(new Set(CANONICAL_FIELD_REGISTRY.map(f => f.category)))
    };
  }
}

// Singleton instance
export const ruleFieldRegistry = new RuleFieldRegistry();

/**
 * Validate rule conditions against the field registry
 */
export function validateRuleConditions(conditions: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalizedConditions: any;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  function normalizeCondition(condition: any): any {
    if (!condition) return condition;

    if (condition.and) {
      return { and: condition.and.map(normalizeCondition) };
    }
    if (condition.or) {
      return { or: condition.or.map(normalizeCondition) };
    }

    // Single condition
    const { field, operator, value } = condition;
    
    if (!field) {
      errors.push('Condition missing field');
      return condition;
    }

    const canonical = ruleFieldRegistry.resolveField(field);
    if (!canonical) {
      errors.push(`Invalid field: "${field}" - not found in registry`);
      return condition;
    }

    if (field !== canonical) {
      warnings.push(`Field "${field}" normalized to canonical name "${canonical}"`);
    }

    if (operator && !VALID_OPERATORS.includes(operator as any)) {
      errors.push(`Invalid operator: "${operator}" for field "${field}"`);
    }

    const fieldDef = ruleFieldRegistry.getFieldDefinition(field);
    if (fieldDef && operator && !fieldDef.operators.includes(operator)) {
      warnings.push(`Operator "${operator}" may not be optimal for field "${field}" (type: ${fieldDef.type})`);
    }

    return {
      field: canonical,
      operator,
      value
    };
  }

  const normalizedConditions = normalizeCondition(conditions);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedConditions
  };
}

/**
 * Bulk update field names across all rules
 */
export function bulkUpdateFieldName(
  rules: any[],
  oldField: string,
  newField: string
): { updatedRules: any[]; updateCount: number } {
  let updateCount = 0;

  function updateCondition(condition: any): any {
    if (!condition) return condition;

    if (condition.and) {
      return { and: condition.and.map(updateCondition) };
    }
    if (condition.or) {
      return { or: condition.or.map(updateCondition) };
    }

    if (condition.field === oldField) {
      updateCount++;
      return { ...condition, field: newField };
    }
    return condition;
  }

  const updatedRules = rules.map(rule => ({
    ...rule,
    conditions: updateCondition(rule.conditions)
  }));

  return { updatedRules, updateCount };
}
