# Claims Data Expansion — BRD-Aligned Unified Schema

## Context

The platform has two disconnected claims data universes:
- `claims` table: ~100 columns, mostly NULL, provider IDs = `PRV-T1-XXX` / `PRV-CS3-XXX`
- `fwa_analyzed_claims` table: ~20 columns, cleaner, provider IDs = `PRV-GEN-XXXX`

Neither matches the iHop Master Data Schema BRD V2, which defines 13 data feeds with 250+ fields. Supporting entities (members, providers, practitioners, policies) have no standalone tables.

## Decision

- **Goal**: Rich demo data with a realistic seeder (5,000 claims)
- **Scope**: Core 6 feeds — Claims, Service Lines, Members, Providers, Practitioners, Policies
- **Migration**: Replace both legacy tables with a single unified BRD-aligned schema
- **Naming**: Plain table names (no `ihop_` prefix)

## New Tables

### `policies` (Feed 5 — Policy & Coverage)

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | text PK | Yes | Unique plan identifier |
| plan_name | text | Yes | Plan name |
| payer_id | text | Yes | Payer / insurer ID |
| effective_date | date | Yes | Plan effective date |
| expiry_date | date | Yes | Plan expiration date |
| coverage_limits | jsonb | No | Coverage limits by benefit category |
| exclusions | text[] | No | Excluded services |
| copay_schedule | jsonb | No | Co-payment and deductible schedule |
| waiting_periods | jsonb | No | Waiting periods for specific conditions |
| pre_auth_required_services | text[] | No | Services requiring pre-authorization |
| network_requirements | text | No | Network restrictions |
| annual_maximum | decimal(12,2) | No | Annual coverage maximum |
| lifetime_maximum | decimal(12,2) | No | Lifetime coverage maximum |
| created_at | timestamp | Auto | Creation timestamp |

### `members` (Feed 2 — Member / Patient)

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | text PK | Yes | Unique member identifier |
| policy_id | text FK→policies | Yes | Active insurance plan |
| payer_id | text | Yes | Insurance payer / TPA ID |
| name | text | No | Full name |
| date_of_birth | date | Yes | Date of birth |
| gender | text | Yes | Gender |
| nationality | text | No | Nationality |
| region | text | No | Member region |
| group_number | text | No | Employer group number |
| coverage_relationship | text | No | Relationship to policy holder |
| chronic_conditions | text[] | No | Known chronic conditions |
| pre_existing_flag | boolean | No | Has pre-existing conditions |
| marital_status | text | No | Marital status |
| network_tier | text | No | Network tier |
| created_at | timestamp | Auto | Creation timestamp |

### `providers` (Feed 3 — Provider Directory)

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | text PK | Yes | Unique provider identifier |
| npi | text | Yes | NPI or CCHI license |
| name | text | Yes | Legal provider name |
| provider_type | text | Yes | Type of facility |
| specialty | text | Yes | Primary specialty |
| region | text | Yes | Geographic region |
| city | text | No | City |
| network_tier | text | Yes | Network classification |
| address | text | No | Street address |
| organization | text | No | Parent organization |
| email | text | No | Contact email |
| phone | text | No | Contact phone |
| license_number | text | No | CCHI license number |
| license_expiry | date | No | License expiration date |
| contract_status | text | No | Current contract status |
| hcp_code | text | No | Healthcare Provider Code (Saudi) |
| member_count | integer | No | Members assigned to provider |
| created_at | timestamp | Auto | Creation timestamp |

### `practitioners` (Feed 4 — Practitioner / Physician)

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | text PK | Yes | Unique practitioner identifier |
| name | text | Yes | Full name |
| specialty | text | Yes | Medical specialty |
| specialty_code | text | No | Specialty classification code |
| credentials | text | No | Professional credentials |
| license_number | text | No | Saudi Commission license number |
| primary_facility_id | text FK→providers | No | Primary facility affiliation |
| primary_facility_name | text | No | Primary facility name |
| affiliated_facilities | text[] | No | All facility affiliations |
| created_at | timestamp | Auto | Creation timestamp |

### `claims` (Feed 1 + Feed 12 merged — replaces both legacy tables)

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | text PK | Yes | Internal UUID |
| claim_number | text UNIQUE | Yes | Unique claim reference (CLM-2026-XXXXX) |
| policy_id | text FK→policies | No | Insurance policy |
| member_id | text FK→members | Yes | Patient / member |
| provider_id | text FK→providers | Yes | Submitting provider |
| practitioner_id | text FK→practitioners | No | Attending physician |
| claim_type | text | Yes | Category of care (Inpatient/Outpatient/Emergency/Pharmacy) |
| registration_date | timestamp | Yes | Date claim was submitted |
| service_date | timestamp | Yes | Date service was rendered |
| amount | decimal(12,2) | Yes | Total claimed amount |
| approved_amount | decimal(12,2) | No | Amount approved by payer |
| denial_reason | text | No | Reason for denial |
| status | text | Yes | Current processing status |
| primary_diagnosis | text | Yes | Primary ICD-10 code |
| icd_codes | text[] | No | All diagnosis codes |
| cpt_codes | text[] | No | Procedure codes |
| description | text | No | Claim narrative / chief complaint |
| specialty | text | No | Treating specialty |
| hospital | text | No | Facility name |
| has_surgery | boolean | No | Surgical procedure performed |
| surgery_fee | decimal(12,2) | No | Surgery fee |
| has_icu | boolean | No | ICU stay occurred |
| length_of_stay | integer | No | Inpatient LOS (days) |
| pre_auth_ref | text | No | Pre-authorization reference |
| category | text | No | Benefit category |
| insurer_id | text | No | Payer / insurer ID |
| facility_id | text | No | Facility ID (if ≠ provider) |
| is_newborn | boolean | No | Newborn flag |
| is_chronic | boolean | No | Chronic condition flag |
| is_pre_existing | boolean | No | Pre-existing condition flag |
| is_pre_authorized | boolean | No | Pre-authorized flag |
| is_maternity | boolean | No | Maternity flag |
| group_no | text | No | Insurance group number |
| city | text | No | City where service was provided |
| provider_type | text | No | Type of provider |
| coverage_relationship | text | No | Relationship to policy holder |
| provider_share | decimal(12,2) | No | Provider's share of cost |
| on_admission_diagnosis | text[] | No | Diagnoses at admission |
| discharge_diagnosis | text[] | No | Diagnoses at discharge |
| policy_effective_date | date | No | Policy start date |
| policy_expiry_date | date | No | Policy end date |
| mdgf_claim_number | text | No | FWA batch primary identifier |
| hcp_code | text | No | Healthcare Provider Code |
| occurrence_date | timestamp | No | Date of occurrence |
| source | text | No | Claim source system |
| resubmission | boolean | No | Resubmission flag |
| discharge_disposition | text | No | Discharge status |
| admission_date | timestamp | No | Admission date |
| discharge_date | timestamp | No | Discharge date |
| pre_auth_status | text | No | Pre-auth status |
| pre_auth_icd10s | text[] | No | Diagnoses from pre-auth |
| net_payable_amount | decimal(12,2) | No | Net payable amount |
| patient_share | decimal(12,2) | No | Patient co-pay amount |
| ai_status | text | No | AI processing status |
| validation_results | jsonb | No | Validation results |
| flagged | boolean | No | Whether flagged for review |
| flag_reason | text | No | Reason for flagging |
| outlier_score | decimal(3,2) | No | Outlier detection score |
| created_at | timestamp | Auto | Creation timestamp |
| updated_at | timestamp | Auto | Last update timestamp |

### `service_lines` (Feed 6 — Service Line Items)

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | text PK | Yes | Internal UUID |
| claim_id | text FK→claims | Yes | Parent claim |
| line_number | integer | Yes | Line item sequence |
| service_code | text | Yes | Service / procedure code |
| service_description | text | Yes | Service description |
| service_code_system | text | No | Coding system (CPT/SBS/HCPCS) |
| service_type | text | No | Service category |
| quantity | decimal(8,2) | Yes | Number of units |
| unit_price | decimal(12,2) | Yes | Price per unit |
| total_price | decimal(12,2) | Yes | Total line item amount |
| approved_amount | decimal(12,2) | No | Approved amount |
| service_date | timestamp | No | Date of individual service |
| modifiers | text[] | No | Service modifiers |
| diagnosis_pointers | text[] | No | Diagnoses justifying this service |
| ndc | text | No | Drug identifier (pharmacy) |
| gtin | text | No | Global Trade Item Number |
| sbs_code | text | No | Saudi billing code |
| sfda_code | text | No | Saudi FDA drug code |
| days_supply | integer | No | Days supply / duration |
| prescription_number | text | No | Prescription reference |
| prescriber_id | text | No | Prescribing physician |
| patient_share | decimal(12,2) | No | Patient co-pay for this line |
| internal_service_code | text | No | Internal provider code |
| provider_service_description | text | No | Provider-specific description |
| tooth_number | text | No | Tooth ID (dental only) |
| dosage_instruction | jsonb | No | Dosage instructions (medication) |
| created_at | timestamp | Auto | Creation timestamp |

## Relationships

```
policies  ──1:N──▸ members
members   ──1:N──▸ claims
providers ──1:N──▸ claims
practitioners ──1:N──▸ claims
claims    ──1:N──▸ service_lines
practitioners ──N:1──▸ providers (primary_facility_id)
```

## Seeder Specification

Volume: 5,000 claims across the following entities:

| Entity | Count | ID Format |
|--------|-------|-----------|
| Policies | 30 | POL-XXXX |
| Members | 500 | MEM-XXXX |
| Providers | 100 | PRV-XXXX |
| Practitioners | 50 | DOC-XXXX |
| Claims | 5,000 | CLM-2026-XXXXX |
| Service Lines | ~12,500 (avg 2.5 per claim) | SVC-XXXXXXXX |

Data characteristics:
- Saudi-specific: hospitals, cities (Riyadh, Jeddah, Dammam, Makkah, Madinah), Saudi ICD-10/CPT codes
- Realistic distributions: 60% Outpatient, 20% Inpatient, 10% Emergency, 10% Pharmacy
- Status mix: 50% approved, 20% pending, 15% under_review, 10% denied, 5% flagged
- Amount ranges: Outpatient SAR 100-5,000, Inpatient SAR 5,000-200,000, Emergency SAR 500-50,000, Pharmacy SAR 50-3,000
- FWA seeding: ~10% of claims get flagged with realistic flag reasons (upcoding, unbundling, duplicate, phantom billing)
- Service lines: each claim has 1-8 service lines with proper CPT/SBS codes matching the claim type

## Migration Plan

1. Define new Drizzle schemas in `shared/schema.ts`
2. Build the seeder (`server/services/demo-data-seeder.ts`)
3. Update all `fwa-routes.ts` queries to use new tables
4. Update `fwa-detection-engine.ts` to use new tables
5. Update frontend types and any hardcoded field names
6. Drop old `claims` and `fwa_analyzed_claims` tables

## Files Modified

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add 6 new table definitions, remove old `claims` + `fwa_analyzed_claims` |
| `server/services/demo-data-seeder.ts` | Rewrite seeder for new schema |
| `server/routes/fwa-routes.ts` | Update all claim queries to new table/column names |
| `server/services/fwa-detection-engine.ts` | Update detection queries |
| `client/src/pages/fwa/entity-profile.tsx` | Update field name references |
| `server/routes/claims-routes.ts` | Update claim queries |
