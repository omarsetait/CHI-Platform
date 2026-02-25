# Enterprise Unsupervised Learning Feature Specification

## Overview
This document defines the complete feature set for the FWA Unsupervised Learning Detection System.
Total Features: **62 features** (24 raw + 38 engineered)

---

## Raw Claim Features (24 features)

### Financial Features
| # | Feature Name | Type | Source | Description |
|---|-------------|------|--------|-------------|
| 1 | `claim_amount` | numeric | claims.amount | Total claim amount in SAR |
| 2 | `surgery_fee` | numeric | claims.surgeryFee | Surgery fee if applicable |
| 3 | `outlier_score` | numeric | claims.outlierScore | Pre-calculated outlier score |

### Temporal Features
| # | Feature Name | Type | Source | Description |
|---|-------------|------|--------|-------------|
| 4 | `service_date` | timestamp | claims.serviceDate | Date of service |
| 5 | `registration_date` | timestamp | claims.registrationDate | Date claim registered |
| 6 | `day_of_week` | integer | derived | 0=Sunday to 6=Saturday |
| 7 | `is_weekend` | boolean | derived | Saturday/Friday billing |
| 8 | `hour_of_day` | integer | derived | Hour of registration |
| 9 | `days_to_submit` | integer | derived | Days between service and registration |

### Clinical Features
| # | Feature Name | Type | Source | Description |
|---|-------------|------|--------|-------------|
| 10 | `length_of_stay` | integer | claims.lengthOfStay | Hospital stay in days |
| 11 | `has_surgery` | boolean | claims.hasSurgery | Surgery performed flag |
| 12 | `has_icu` | boolean | claims.hasIcu | ICU stay flag |
| 13 | `diagnosis_count` | integer | claims.diagnosisCodes | Number of diagnosis codes |
| 14 | `procedure_count` | integer | claims.cptCodes | Number of CPT codes |
| 15 | `primary_icd` | string | claims.icd | Primary ICD-10 code |
| 16 | `icd_chapter` | string | derived | ICD-10 chapter (first letter) |

### Entity Identifiers
| # | Feature Name | Type | Source | Description |
|---|-------------|------|--------|-------------|
| 17 | `provider_id` | string | claims.providerId | Provider identifier |
| 18 | `patient_id` | string | claims.patientId | Patient/member identifier |
| 19 | `hospital` | string | claims.hospital | Hospital name |
| 20 | `claim_type` | string | claims.claimType | inpatient/outpatient/pharmacy etc |
| 21 | `category` | string | claims.category | Claim category |

### Similarity Features
| # | Feature Name | Type | Source | Description |
|---|-------------|------|--------|-------------|
| 22 | `similar_claims` | integer | claims.similarClaims | Count of similar claims system-wide |
| 23 | `similar_claims_hospital` | integer | claims.similarClaimsInHospital | Similar claims at same hospital |
| 24 | `is_flagged` | boolean | claims.flagged | Previously flagged for review |

---

## Engineered Features - Provider Level (12 features)

### Provider Aggregations (Feature Store)
| # | Feature Name | Type | Window | Description |
|---|-------------|------|--------|-------------|
| 25 | `provider_claim_count_7d` | integer | 7 days | Claims submitted in last 7 days |
| 26 | `provider_claim_count_30d` | integer | 30 days | Claims submitted in last 30 days |
| 27 | `provider_claim_count_90d` | integer | 90 days | Claims submitted in last 90 days |
| 28 | `provider_avg_amount_30d` | numeric | 30 days | Average claim amount |
| 29 | `provider_std_amount_30d` | numeric | 30 days | Standard deviation of amounts |
| 30 | `provider_unique_patients_30d` | integer | 30 days | Unique patients seen |
| 31 | `provider_unique_diagnoses_30d` | integer | 30 days | Unique diagnosis codes used |
| 32 | `provider_denial_rate_90d` | numeric | 90 days | Claim denial rate |
| 33 | `provider_flag_rate_90d` | numeric | 90 days | FWA flag rate |
| 34 | `provider_weekend_ratio` | numeric | 30 days | % of claims on weekends |
| 35 | `provider_surgery_rate` | numeric | 30 days | % of claims with surgery |
| 36 | `provider_avg_los` | numeric | 30 days | Average length of stay |

---

## Engineered Features - Member/Patient Level (10 features)

### Member Aggregations (Feature Store)
| # | Feature Name | Type | Window | Description |
|---|-------------|------|--------|-------------|
| 37 | `member_claim_count_30d` | integer | 30 days | Claims by this patient |
| 38 | `member_claim_count_90d` | integer | 90 days | Claims by this patient |
| 39 | `member_unique_providers_30d` | integer | 30 days | Unique providers visited (doctor shopping) |
| 40 | `member_unique_providers_90d` | integer | 90 days | Unique providers visited |
| 41 | `member_total_amount_30d` | numeric | 30 days | Total claimed amount |
| 42 | `member_avg_amount_30d` | numeric | 30 days | Average claim amount |
| 43 | `member_unique_diagnoses_30d` | integer | 30 days | Unique diagnoses |
| 44 | `member_surgery_count_90d` | integer | 90 days | Number of surgeries |
| 45 | `member_icu_count_90d` | integer | 90 days | Number of ICU stays |
| 46 | `member_high_utilizer_flag` | boolean | 90 days | Top 5% utilization flag |

---

## Engineered Features - Claim-Level Derived (8 features)

### Ratio and Comparison Features
| # | Feature Name | Type | Description |
|---|-------------|------|-------------|
| 47 | `amount_vs_provider_avg` | numeric | Claim amount / provider average (z-score) |
| 48 | `amount_vs_member_avg` | numeric | Claim amount / member average (z-score) |
| 49 | `amount_vs_peer_group` | numeric | Amount vs specialty peer group median |
| 50 | `los_vs_diagnosis_expected` | numeric | LOS vs expected for diagnosis |
| 51 | `procedure_diagnosis_mismatch` | numeric | Score for procedure-diagnosis compatibility |
| 52 | `amount_per_los_day` | numeric | Amount / length of stay |
| 53 | `procedure_density` | numeric | Procedures per day of stay |
| 54 | `diagnosis_rarity_score` | numeric | How rare is this diagnosis code |

---

## Engineered Features - Temporal Behavior (8 features)

### Trend and Velocity Features
| # | Feature Name | Type | Description |
|---|-------------|------|-------------|
| 55 | `provider_trend_7d_vs_30d` | numeric | Claim velocity trend (7d avg / 30d avg) |
| 56 | `provider_amount_trend` | numeric | Amount trend direction (-1, 0, +1) |
| 57 | `member_frequency_acceleration` | numeric | Is member claiming more frequently? |
| 58 | `days_since_last_claim` | integer | Days since member's last claim |
| 59 | `claims_same_day` | integer | Other claims by member same day |
| 60 | `claims_same_provider_week` | integer | Claims to same provider this week |
| 61 | `duplicate_window_flag` | boolean | Potential duplicate in 7-day window |
| 62 | `burst_pattern_score` | numeric | Sudden activity spike detection |

---

## Peer Group Baselines

### Provider Peer Groups
Providers are grouped by:
1. **Specialty** (e.g., Cardiology, Orthopedics, General)
2. **Region** (e.g., Riyadh, Jeddah, Eastern Province)
3. **Size** (Small <100 claims/month, Medium, Large >500)

### Peer Metrics Calculated
- `peer_avg_amount` - Average claim amount for peer group
- `peer_median_amount` - Median claim amount
- `peer_avg_claims_per_month` - Average claims volume
- `peer_denial_rate` - Average denial rate
- `peer_flag_rate` - Average FWA flag rate

### Percentile Rankings
- Each provider ranked within peer group (0-100 percentile)
- Outliers defined as >95th or <5th percentile

---

## ML Algorithms Using These Features

### 1. Isolation Forest
- **Input**: All 62 numeric features (encoded categoricals)
- **Output**: Anomaly score 0-1, isolation depth
- **Interpretation**: Lower average path length = more anomalous

### 2. Local Outlier Factor (LOF)
- **Input**: All 62 features
- **Output**: LOF score, local neighborhood density ratio
- **Interpretation**: Score > 1 indicates outlier

### 3. DBSCAN Clustering
- **Input**: Key features (amount, LOS, procedure count, diagnosis count)
- **Output**: Cluster assignment (-1 = noise/outlier)
- **Interpretation**: Noise points are potential fraud

### 4. Autoencoder (Reconstruction Error)
- **Input**: Normalized feature vector
- **Architecture**: 62 → 32 → 16 → 8 → 16 → 32 → 62
- **Output**: Reconstruction error (MSE)
- **Interpretation**: High error = anomalous pattern

### 5. Deep Learning Anomaly Detection
- **Architecture**: MLP with attention for feature importance
- **Input**: 62 features + temporal sequence
- **Output**: Anomaly probability, contributing features
- **Interpretation**: Learned complex pattern deviations

---

## Feature Store Update Schedule

| Entity | Update Frequency | Trigger |
|--------|-----------------|---------|
| Provider Metrics | Every 15 minutes | Background job |
| Member Metrics | Every 15 minutes | Background job |
| Peer Baselines | Daily | Nightly batch |
| Trend Calculations | Hourly | Background job |

---

## Claim Traceability

Each claim processed through the ML pipeline will have:
1. **Full feature vector** (all 62 features)
2. **Per-algorithm scores** (IF, LOF, DBSCAN, AE, DL)
3. **Feature contribution** (which features drove the score)
4. **Peer comparison** (percentile within peer group)
5. **Temporal context** (behavior vs historical pattern)
6. **Entity profiles** (provider, member summary)
