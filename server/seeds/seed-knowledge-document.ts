/**
 * Seed Script: CHI Mandatory Health Insurance Policy (Sample Document)
 *
 * Inserts a realistic CHI regulatory document into knowledge_documents and
 * knowledge_chunks with real OpenAI embeddings so the full chat RAG pipeline
 * can be tested end-to-end.
 *
 * Usage:
 *   npm run seed:knowledge
 *
 * Requires:
 *   - DATABASE_URL  (Postgres connection string)
 *   - OPENAI_API_KEY
 */

import { db, closePool } from "../db";
import { sql } from "drizzle-orm";
import OpenAI from "openai";
import { EMBEDDING_MODEL } from "../services/embedding-config";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CHUNK_TOKENS = 500; // estimated as chars / 4
const CHUNK_OVERLAP_WORDS = 50;
const EMBEDDING_BATCH_SIZE = 20;

const DOCUMENT_TITLE = "CHI Mandatory Health Insurance Policy — Sample";

// ---------------------------------------------------------------------------
// Document Text (~4500 words, realistic CHI regulatory language)
// ---------------------------------------------------------------------------

const DOCUMENT_TEXT = `CHI Mandatory Health Insurance Policy — Sample

Issued by the Council of Health Insurance (CHI)
Kingdom of Saudi Arabia
Effective Date: 1 Muharram 1447 AH (corresponding to 7 July 2025 G)
Document Reference: CHI-MHI-POL-2025-001
Classification: Public

Chapter 1: General Provisions and Definitions

Article 1 — Scope and Applicability

1.1 This Policy governs the provision of mandatory health insurance coverage in the Kingdom of Saudi Arabia in accordance with the Cooperative Health Insurance Law promulgated by Royal Decree No. M/10 dated 1/8/1420 AH and its Implementing Regulations.

1.2 All employers operating within the Kingdom, whether in the public or private sector, shall comply with this Policy with respect to their employees, dependents, and other eligible beneficiaries as defined herein.

1.3 This Policy applies to all licensed health insurance companies, self-insured entities approved by CHI, and Third-Party Administrators (TPAs) operating under the regulatory purview of the Council of Health Insurance.

1.4 Nothing in this Policy shall be construed to limit the authority of the Ministry of Health (MOH) in matters relating to public health emergencies, communicable disease control, or national immunization programmes.

Article 2 — Definitions

2.1 In this Policy, unless the context otherwise requires:

(a) "CHI" means the Council of Health Insurance, the regulatory authority established under the Cooperative Health Insurance Law.

(b) "Beneficiary" means any person entitled to health insurance coverage under this Policy, including employees, their spouses, and dependent children up to the age of twenty-five (25) years.

(c) "Employer" means any natural or legal person who employs one or more workers in the Kingdom of Saudi Arabia, including government entities where applicable.

(d) "Health Insurance Company" or "Insurer" means any company licensed by CHI to provide cooperative health insurance in the Kingdom.

(e) "NPHIES" means the National Platform for Health Insurance Exchange Services, the centralized electronic platform operated by CHI for real-time claims adjudication, eligibility verification, prior authorization, and health insurance data exchange.

(f) "Essential Benefits Package" or "EBP" means the minimum set of health services and benefits that must be included in every compliant health insurance policy as prescribed in Chapter 3 of this Policy.

(g) "ICD-10-AM" means the International Classification of Diseases, Tenth Revision, Australian Modification, as adopted by the Kingdom for diagnosis coding.

(h) "ACHI" means the Australian Classification of Health Interventions, adopted as the standard procedure coding system for inpatient and day-surgery services.

(i) "AR-DRG" means the Australian Refined Diagnosis Related Groups, adopted for hospital case-mix classification and inpatient reimbursement.

(j) "SBS V3.0" means the Saudi Billing Standard Version 3.0, the mandatory electronic claims submission format for all NPHIES transactions.

(k) "Pre-existing Condition" means any medical condition, illness, or injury for which a beneficiary received medical advice, diagnosis, or treatment within the twelve (12) months immediately preceding the effective date of coverage.

(l) "Waiting Period" means the period specified in Article 8 during which certain benefits are excluded or limited under a new policy.

(m) "Network Provider" means a healthcare facility or practitioner that has entered into a contractual arrangement with an Insurer or TPA to provide services to beneficiaries at agreed-upon rates.

(n) "DRG-based Reimbursement" means the payment methodology under which inpatient episodes are classified into diagnosis-related groups and reimbursed at predetermined rates.

(o) "Clean Claim" means a claim submitted in the correct SBS V3.0 format, containing all required data elements, passing all NPHIES validation rules, and not requiring additional information for adjudication.

(p) "Grievance" means a formal complaint submitted by a beneficiary, employer, provider, or other stakeholder regarding the actions, decisions, or practices of an insurer, TPA, or provider in relation to health insurance coverage or claims.

Chapter 2: Employer Obligations

Article 3 — Mandatory Coverage Requirement

3.1 Every employer in the Kingdom of Saudi Arabia shall obtain and maintain a valid cooperative health insurance policy covering all employees and their eligible dependents, without exception, from a CHI-licensed health insurance company.

3.2 Coverage shall commence no later than the date on which the employee begins work. Any gap in coverage exceeding thirty (30) calendar days shall constitute a violation subject to the penalties prescribed in Chapter 6. Temporary workers engaged for periods of three (3) months or more shall also be covered.

3.3 Employers with more than five hundred (500) employees may apply to CHI for authorization to operate a self-insured health benefits programme, provided such programme meets or exceeds the Essential Benefits Package requirements, maintains adequate financial reserves as determined by CHI (not less than one hundred twenty-five percent (125%) of projected annual claims), and submits to annual actuarial review and CHI audit.

3.4 Employers operating in remote or specialized industries (oil and gas, mining, construction) shall ensure coverage includes occupational health services and emergency evacuation appropriate to the industry risk profile.

Article 4 — Continuity of Coverage

4.1 An employer shall not terminate or allow the lapse of an employee's health insurance coverage while the employment relationship subsists, except in cases of:

(a) Lawful termination of employment, in which case coverage shall continue for thirty (30) days following the last day of employment at no additional cost to the former employee.

(b) Transfer of the employee to another employer who assumes insurance responsibility, with no gap in coverage exceeding seven (7) calendar days.

(c) The employee's departure from the Kingdom on a final exit visa, in which case coverage terminates on the date of departure.

4.2 In the event of employer insolvency or cessation of business, CHI shall coordinate with the General Organization for Social Insurance (GOSI) and the Ministry of Human Resources and Social Development (MHRSD) to ensure transitional coverage for affected employees for a period not exceeding ninety (90) days. The cost of transitional coverage shall be recovered from the employer's insolvency estate where possible.

4.3 Employers must notify their insurer within five (5) business days of any change in employee status that affects eligibility, including new hires, terminations, births, marriages, divorces, and deaths. Failure to provide timely notification shall not affect the beneficiary's right to coverage.

4.4 When an employee is on approved medical leave, maternity leave, or any other statutory leave, the employer shall maintain uninterrupted health insurance coverage for the employee and all eligible dependents throughout the leave period.

Article 5 — Premium Payment Obligations

5.1 The employer shall bear the full cost of health insurance premiums for employees. The cost of dependent coverage may be shared between the employer and employee, provided the employee's share does not exceed fifty percent (50%) of the dependent premium. Any cost-sharing arrangement must be disclosed in writing to the employee prior to enrollment.

5.2 Insurance premiums shall be paid in advance on a quarterly basis unless an alternative payment schedule has been agreed upon in writing with the insurer. Annual prepayment shall entitle the employer to a discount of not less than two percent (2%) of the total annual premium.

5.3 Failure to pay premiums within the grace period of thirty (30) days from the due date shall result in the suspension of the policy and notification to CHI for enforcement action under Article 16. During the grace period, beneficiary coverage shall remain in full force and effect, and the insurer shall continue to process and pay claims.

5.4 Insurers shall not increase premiums during a policy year except in cases where the number of covered beneficiaries increases by more than twenty percent (20%) above the number at policy inception, in which case the premium adjustment shall be calculated on a pro-rata basis.

Chapter 3: Minimum Benefit Standards

Article 6 — Essential Benefits Package

6.1 Every compliant health insurance policy shall include, at a minimum, the following categories of benefits:

(a) Preventive and Primary Care Services: periodic health examinations, immunizations per the MOH National Immunization Schedule, well-child visits, prenatal and postnatal care, health education and counselling, and screening programmes for common chronic diseases per national guidelines.

(b) Outpatient Services: physician consultations (general practitioners and specialists), diagnostic laboratory tests, diagnostic imaging (X-ray, ultrasound, CT, MRI), prescription medications listed in the Saudi National Formulary (SNF), and physiotherapy and rehabilitation services.

(c) Inpatient Services: hospitalization for medical, surgical, and obstetric conditions (subject to medical necessity), intensive care unit (ICU) and coronary care unit (CCU) services, surgical procedures including anesthesia, inpatient medications and medical supplies, and post-discharge follow-up care for thirty (30) days.

(d) Emergency Services: emergency room treatment without prior authorization regardless of network status, ambulance transportation within the Kingdom, emergency dental treatment for accidental injuries, and emergency medical evacuation within the Kingdom where medically necessary.

(e) Mental Health and Substance Abuse Services: outpatient psychiatric and psychological consultations (up to twenty-four (24) sessions per year), inpatient psychiatric treatment for acute conditions (up to sixty (60) days per year), counselling services for substance use disorders, and coverage for prescribed psychotropic medications listed in the SNF.

(f) Dental Services: emergency dental treatment, preventive dental care for children under age twelve (12) including biannual cleaning and fluoride treatment, basic restorative dental procedures as specified by CHI (fillings, extractions, and root canal treatment for anterior teeth), and orthodontic treatment for children with severe malocclusion as certified by a licensed orthodontist.

(g) Maternity and Newborn Care: antenatal care including routine screening tests and ultrasound examinations, delivery services (normal, assisted, and caesarean), postnatal care for mother and newborn for a period of forty-two (42) days, neonatal intensive care unit (NICU) services for the first thirty (30) days, and newborn screening tests as mandated by MOH.

(h) Chronic Disease Management: ongoing treatment for diabetes, hypertension, cardiovascular diseases, asthma, COPD, chronic kidney disease (including dialysis), and other chronic conditions designated by CHI, including medications, monitoring devices, and specialist follow-up.

(i) Rehabilitation Services: physical therapy, occupational therapy, and speech therapy for conditions resulting from illness, injury, or surgery, up to sixty (60) sessions per year.

Article 7 — Coverage Limits and Cost-Sharing

7.1 The annual maximum benefit per beneficiary shall not be less than SAR 500,000 (five hundred thousand Saudi Riyals) for the comprehensive plan and SAR 250,000 (two hundred fifty thousand Saudi Riyals) for the basic plan. Lifetime maximum benefits shall not be less than SAR 2,000,000 (two million Saudi Riyals).

7.2 The maximum out-of-pocket expense per beneficiary per policy year shall not exceed SAR 10,000 (ten thousand Saudi Riyals) for the comprehensive plan and SAR 15,000 (fifteen thousand Saudi Riyals) for the basic plan, after which the insurer shall bear one hundred percent (100%) of covered expenses for the remainder of the policy year.

7.3 Co-payment for outpatient visits shall not exceed twenty percent (20%) of the consultation fee, with a maximum co-payment of SAR 75 (seventy-five Saudi Riyals) per visit for the comprehensive plan and SAR 100 (one hundred Saudi Riyals) per visit for the basic plan.

7.4 Co-payment for prescription medications shall not exceed twenty percent (20%) of the cost, with a maximum co-payment of SAR 50 (fifty Saudi Riyals) per prescription for the comprehensive plan and SAR 75 (seventy-five Saudi Riyals) per prescription for the basic plan. Generic substitution shall be permitted where a therapeutically equivalent generic medication is available.

7.5 No co-payment shall be applied for preventive care services, emergency services, maternity delivery services, or chronic disease management medications included in the MOH Essential Medications List.

7.6 Deductibles, if applied, shall not exceed SAR 500 (five hundred Saudi Riyals) per beneficiary per policy year. The deductible shall not apply to preventive services, emergency services, or maternity care.

Article 8 — Pre-existing Conditions and Waiting Periods

8.1 A compliant health insurance policy shall not exclude coverage for pre-existing conditions, except that the insurer may impose a waiting period of not more than six (6) months for the following elective procedures related to pre-existing conditions:

(a) Elective surgical procedures not deemed medically urgent by the attending physician.

(b) Advanced diagnostic procedures such as PET scans, genetic testing, and specialized cardiac imaging.

(c) Elective joint replacement surgery for pre-existing degenerative joint conditions.

8.2 The waiting period shall not apply to:

(a) Emergency treatment related to the pre-existing condition, regardless of the setting of care.

(b) Ongoing maintenance medication for chronic conditions, including insulin, antihypertensives, and cardiac medications.

(c) Maternity care, regardless of prior obstetric history or complications.

(d) Mental health treatment for pre-existing psychiatric conditions.

(e) Pediatric care for congenital conditions in dependent children.

8.3 Upon renewal of a policy with the same insurer, or upon transfer to a new insurer where there has been no gap in coverage exceeding thirty (30) days, all pre-existing condition waiting periods shall be waived and full coverage shall apply from the first day of the new or renewed policy.

8.4 The insurer shall maintain a record of all waiting period applications and report aggregate statistics to CHI on a semi-annual basis.

Chapter 4: Provider Network Requirements

Article 9 — Network Adequacy Standards

9.1 Every insurer shall maintain a provider network sufficient to ensure that beneficiaries have reasonable access to all covered services. At minimum, the network shall include:

(a) At least one (1) primary care facility within fifteen (15) kilometres of the beneficiary's registered address in urban areas, or within fifty (50) kilometres in rural areas, with the facility maintaining operating hours of not less than twelve (12) hours per day, six (6) days per week.

(b) Access to specialist services (including cardiology, endocrinology, orthopedics, neurology, oncology, and obstetrics/gynecology) within thirty (30) calendar days of referral, with urgent referrals accommodated within seven (7) calendar days.

(c) Emergency hospital services available within thirty (30) minutes of travel time in urban areas and sixty (60) minutes in rural areas, with twenty-four (24) hour emergency department coverage.

(d) At least one (1) CBAHI-accredited hospital per fifty thousand (50,000) beneficiaries in each administrative region where the insurer has enrolled beneficiaries.

(e) Dental facilities providing the covered dental services within twenty-five (25) kilometres of the beneficiary's registered address in urban areas.

9.2 Insurers shall publish and maintain an up-to-date provider directory accessible through their website, mobile application, and the NPHIES portal. The directory shall be updated within five (5) business days of any changes to network composition.

9.3 When a required service is not available within the network, the insurer shall authorize out-of-network coverage at in-network rates, with the beneficiary responsible only for applicable in-network cost-sharing amounts.

Article 10 — Provider Compliance and Technical Requirements

10.1 All network providers shall:

(a) Be licensed by the relevant Saudi licensing authority (MOH, or the appropriate health authority in the region of operation) and maintain current licensure at all times.

(b) Submit all claims electronically through NPHIES using the SBS V3.0 standard within the timelines specified in Article 12. Batch submission is permitted for providers processing more than one hundred (100) claims per day.

(c) Use ICD-10-AM for diagnosis coding on all claims, with all codes validated to the character level appropriate for the clinical setting (minimum four (4) characters for outpatient, full specificity for inpatient).

(d) Use ACHI for procedure coding on all inpatient and day-surgery claims, ensuring correct laterality, approach, and device coding where applicable.

(e) Participate in the AR-DRG-based reimbursement programme for inpatient episodes, including submission of all required clinical data for DRG assignment (diagnoses, procedures, age, sex, length of stay, and discharge status).

(f) Maintain electronic health records (EHR) that are interoperable with the National Health Information Exchange (NHIE) and comply with the Saudi Health Information Exchange Policy (SHIEP) standards for data privacy and security.

(g) Comply with all applicable Saudi data protection laws, including the Personal Data Protection Law (PDPL), in the handling of beneficiary health information.

10.2 Providers who fail to comply with the coding and submission standards specified in this Article shall be subject to claims rejection and may face sanctions under Article 18. Systematic non-compliance shall be reported to the relevant licensing authority.

Article 11 — Credentialing, Quality, and Performance

11.1 Insurers shall implement a comprehensive provider credentialing programme that verifies, at minimum:

(a) Valid facility and practitioner licenses issued by the relevant Saudi licensing authority.

(b) Board certification or equivalent qualification for specialists, verified through the Saudi Commission for Health Specialties (SCFHS).

(c) Compliance with CHI-mandated quality indicators, including patient safety metrics, clinical outcome measures, and patient satisfaction scores.

(d) Accreditation by the Saudi Central Board for Accreditation of Healthcare Institutions (CBAHI) or an equivalent international accreditation body recognized by CHI (JCI, ACHS, or equivalent).

(e) Professional liability insurance coverage for all practitioners.

(f) Clean record with no active sanctions or disciplinary actions from CHI, MOH, or SCFHS.

11.2 Network contracts shall require providers to submit quality performance data to CHI on a quarterly basis, including readmission rates, average length of stay by DRG, infection rates, patient satisfaction scores, and claims accuracy rates.

11.3 Insurers shall conduct annual site visits and recredentialing reviews for all network hospitals and at least ten percent (10%) of network outpatient facilities.

Chapter 5: Claims Submission and Processing

Article 12 — Claims Submission Requirements

12.1 All claims shall be submitted electronically through NPHIES in compliance with the SBS V3.0 format. Paper claims shall not be accepted except in circumstances of system-wide NPHIES outage lasting more than forty-eight (48) consecutive hours, as certified by CHI, in which case paper claims must be submitted within fifteen (15) business days of system restoration.

12.2 Providers shall submit claims within thirty (30) calendar days of the date of service or discharge for inpatient episodes. Claims submitted after this deadline but within ninety (90) days may be accepted at the discretion of the insurer, subject to a late submission penalty not exceeding ten percent (10%) of the claim amount. Legitimate reasons for delayed submission (e.g., beneficiary eligibility verification delays) may be presented to waive the penalty.

12.3 Claims submitted more than ninety (90) calendar days after the date of service or discharge shall be rejected and shall not be eligible for reimbursement, unless the provider can demonstrate exceptional circumstances approved by CHI.

12.4 Each claim submission shall include, at minimum:

(a) Beneficiary identification number (National ID/Iqama number) and insurance policy number.

(b) Provider identification number (NPHIES-registered facility and practitioner identifiers).

(c) Date(s) of service, including admission and discharge dates for inpatient episodes.

(d) ICD-10-AM diagnosis code(s) — principal diagnosis and all relevant secondary diagnoses, coded to the highest specificity level supported by the clinical documentation.

(e) ACHI procedure code(s) where applicable, including all component codes for complex procedures.

(f) Itemized charges using the SBS V3.0 code set, with quantities, unit prices, and total amounts for each line item.

(g) Pre-authorization reference number where prior authorization was required and obtained.

(h) Referring physician identifier for specialist consultations and procedures requiring referral.

Article 13 — Claims Adjudication and Payment

13.1 Insurers shall adjudicate clean claims within five (5) business days of receipt through NPHIES. Non-clean claims requiring additional information shall be returned to the provider with specific deficiency codes within three (3) business days.

13.2 Payment of approved claims shall be made within thirty (30) calendar days of adjudication. Late payment shall incur a penalty of one percent (1%) of the claim amount per week of delay, up to a maximum of ten percent (10%). Interest at the prevailing SAMA benchmark rate may also be applied for delays exceeding sixty (60) days.

13.3 An insurer may pend a claim for additional clinical information, but the total adjudication period including any pend time shall not exceed thirty (30) business days from initial submission. Failure to adjudicate within this period shall result in automatic approval of the claim at the submitted amount.

13.4 All claim adjudication decisions shall be communicated to the provider through NPHIES in real-time, including the approved amount, any adjustments, and detailed reason codes for partial or full denials.

Article 14 — Claims Rejection Criteria

14.1 A claim may be rejected for any of the following reasons:

(a) The beneficiary was not eligible for coverage on the date of service as confirmed by the NPHIES eligibility verification system.

(b) The service is not covered under the applicable benefits plan or is specifically excluded under the policy terms.

(c) The claim contains invalid or missing ICD-10-AM or ACHI codes, or the codes do not meet the minimum specificity requirements.

(d) The required pre-authorization was not obtained prior to the delivery of the service, except for emergency services.

(e) The claim is a duplicate of a previously submitted and processed claim (same beneficiary, provider, date of service, and procedure).

(f) The claim was submitted after the ninety (90) calendar day deadline without approved exceptional circumstances.

(g) The provider is not registered in NPHIES or is not part of the insurer's contracted network, and out-of-network authorization was not obtained.

(h) The claim amount exceeds the applicable fee schedule, DRG rate, or maximum allowable charge without supporting clinical justification.

(i) The clinical documentation does not support the medical necessity of the service, as determined by the insurer's medical review team.

14.2 The insurer shall provide a detailed rejection reason code for each rejected claim line using the NPHIES standard rejection code set (minimum three-digit rejection codes with accompanying text descriptions). Vague or non-specific rejection reasons are prohibited.

14.3 Providers may appeal rejected claims within sixty (60) calendar days of the rejection notification through the NPHIES dispute resolution portal. The insurer shall respond to each appeal within fifteen (15) business days. If the insurer fails to respond within this period, the appeal shall be deemed approved.

Article 15 — Pre-authorization Requirements

15.1 The following services require prior authorization through NPHIES before the service is rendered:

(a) All elective inpatient admissions, including day-surgery cases expected to exceed four (4) hours.

(b) Advanced diagnostic imaging (MRI, CT, PET scan, nuclear medicine studies).

(c) Surgical procedures classified as Category B or higher under the SBS V3.0 procedure classification.

(d) Specialist referrals beyond the initial consultation, except for ongoing management of chronic conditions.

(e) Prescription medications classified as "prior-authorization required" in the Saudi National Formulary, including biological agents, specialty medications, and medications with a monthly cost exceeding SAR 3,000.

(f) Medical devices and prosthetics exceeding SAR 5,000 (five thousand Saudi Riyals) in cost, including implantable devices, orthopedic prosthetics, and hearing aids.

(g) Rehabilitation services exceeding ten (10) sessions per condition per treatment episode.

(h) Home healthcare services, including home nursing, home infusion therapy, and home-based rehabilitation.

15.2 Pre-authorization requests shall be adjudicated within two (2) business days for elective services and within two (2) hours for urgent services. Requests for life-threatening or emergent conditions shall be processed within thirty (30) minutes.

15.3 An approved pre-authorization shall be valid for thirty (30) calendar days from the date of approval for outpatient services and sixty (60) calendar days for scheduled inpatient admissions, unless a longer period is specified. Extensions may be requested through NPHIES.

15.4 Emergency services shall never require pre-authorization. The insurer may conduct retrospective review of emergency claims but shall not deny payment solely on the grounds of lack of pre-authorization. Retrospective denial is only permissible when the service clearly did not meet the prudent layperson standard for emergency care.

Chapter 6: Penalties and Enforcement

Article 16 — Employer Penalties

16.1 An employer who fails to provide mandatory health insurance coverage for employees and their dependents shall be subject to the following penalties:

(a) First violation: A fine of SAR 10,000 (ten thousand Saudi Riyals) per uninsured employee per month of non-compliance.

(b) Second violation within twelve (12) months: A fine of SAR 20,000 (twenty thousand Saudi Riyals) per uninsured employee per month, plus suspension of the employer's ability to process new work visas and transfer of sponsorship through the Qiwa platform.

(c) Third or subsequent violation: A fine of SAR 50,000 (fifty thousand Saudi Riyals) per uninsured employee per month, plus referral to the Ministry of Commerce for potential suspension of commercial registration and to the Ministry of Human Resources and Social Development for labour law enforcement action.

16.2 Penalties shall be calculated from the first day of non-compliance and shall accrue monthly until full compliance is achieved. CHI may publish the names of non-compliant employers on its official website.

16.3 Employers who provide false or misleading information regarding employee eligibility, dependent status, or coverage shall be subject to an additional fine of SAR 25,000 (twenty-five thousand Saudi Riyals) per incident of false reporting.

Article 17 — Insurer Penalties

17.1 An insurer that violates the provisions of this Policy shall be subject to the following penalties:

(a) Failure to adjudicate clean claims within five (5) business days: SAR 1,000 (one thousand Saudi Riyals) per claim per day of delay beyond the permitted period.

(b) Failure to pay approved claims within thirty (30) days: SAR 500 (five hundred Saudi Riyals) per claim per day of delay, in addition to the late payment penalty under Article 13.2.

(c) Failure to maintain network adequacy as required by Article 9: SAR 100,000 (one hundred thousand Saudi Riyals) per month of non-compliance per deficient service area, plus mandatory submission of a corrective action plan within thirty (30) days.

(d) Unauthorized denial of covered services or application of exclusions not permitted under this Policy: SAR 50,000 (fifty thousand Saudi Riyals) per incident, plus mandatory reprocessing of the denied claim and reimbursement to the beneficiary for any out-of-pocket expenses incurred.

(e) Failure to comply with NPHIES reporting requirements or data submission standards: SAR 25,000 (twenty-five thousand Saudi Riyals) per reporting period of non-compliance.

(f) Failure to respond to beneficiary grievances within the timeframes prescribed by CHI: SAR 10,000 (ten thousand Saudi Riyals) per unresolved grievance per month of delay.

17.2 Repeated violations (three or more violations within a twelve-month period) may result in suspension or revocation of the insurer's license to provide cooperative health insurance in the Kingdom, mandatory appointment of a CHI-approved administrator, or restriction on writing new policies.

17.3 CHI may require an insurer to submit to an independent compliance audit at the insurer's expense.

Article 18 — Provider Penalties

18.1 A provider who violates the provisions of this Policy shall be subject to the following sanctions:

(a) Submission of claims with incorrect coding (upcoding, unbundling, or systematic miscoding): SAR 5,000 (five thousand Saudi Riyals) per incident for the first ten (10) incidents within a twelve-month period; SAR 20,000 (twenty thousand Saudi Riyals) per incident thereafter, plus mandatory completion of a coding accuracy improvement programme.

(b) Failure to submit claims through NPHIES as required: SAR 10,000 (ten thousand Saudi Riyals) per month of non-compliance.

(c) Fraudulent claims submission (including phantom billing, billing for services not rendered, falsification of clinical records, and identity fraud): SAR 100,000 (one hundred thousand Saudi Riyals) per incident, plus recovery of all fraudulently obtained amounts with a penalty multiplier of one hundred fifty percent (150%), plus referral to the relevant law enforcement authority for criminal prosecution.

(d) Failure to maintain required licensure or accreditation: Immediate suspension from all insurer networks until compliance is restored, plus a fine of SAR 50,000 (fifty thousand Saudi Riyals).

(e) Balance billing of beneficiaries beyond the permitted co-payment and deductible amounts: SAR 10,000 (ten thousand Saudi Riyals) per incident, plus mandatory refund to the affected beneficiary.

18.2 CHI shall maintain a public registry of provider sanctions, accessible through the NPHIES portal and the CHI official website.

18.3 Providers may appeal sanctions through the CHI Administrative Appeals Committee within thirty (30) days of the sanction notice.

Chapter 7: Effective Date and Transitional Provisions

Article 19 — Effective Date

19.1 This Policy shall come into effect on 1 Muharram 1447 AH (corresponding to 7 July 2025 G).

19.2 All existing health insurance policies shall be brought into compliance with the provisions of this Policy upon their next renewal date, but no later than twelve (12) months from the effective date.

Article 20 — Transitional Provisions

20.1 Employers who, as of the effective date, do not have health insurance coverage for all employees and dependents shall have a grace period of ninety (90) days to obtain compliant coverage without penalty.

20.2 Insurers shall have one hundred eighty (180) days from the effective date to update their systems and processes to comply with the NPHIES SBS V3.0 submission requirements specified in this Policy, including all new data elements, validation rules, and message formats.

20.3 Providers currently using coding systems other than ICD-10-AM and ACHI shall have one hundred eighty (180) days from the effective date to complete the transition to the mandated coding standards. CHI shall provide training resources and certification programmes to support this transition.

20.4 During the transitional period, CHI may issue supplementary circulars providing guidance on the implementation of specific provisions of this Policy.

20.5 Self-insured employers with existing approved programmes shall have twelve (12) months to bring their programmes into compliance with the enhanced reserve requirements and actuarial review standards specified in Article 3.3.

Article 21 — Repeal and Savings

21.1 The previous Mandatory Health Insurance Policy (Reference: CHI-MHI-POL-2019-003) and all amendments thereto are hereby repealed as of the effective date of this Policy.

21.2 Notwithstanding the repeal, any proceedings initiated under the previous Policy that are pending as of the effective date shall continue to be governed by the provisions of the previous Policy until their conclusion.

21.3 Any rights, obligations, or liabilities that have accrued under the previous Policy prior to the effective date shall not be affected by this repeal.

Article 22 — Interpretation and Disputes

22.1 Any dispute arising out of or in connection with the interpretation or application of this Policy shall be referred to the Committees for Resolution of Health Insurance Disputes established under the Cooperative Health Insurance Law.

22.2 In the event of any conflict between the Arabic and English versions of this Policy, the Arabic version shall prevail.

22.3 CHI reserves the right to issue interpretive guidance, circulars, and directives to clarify or supplement the provisions of this Policy, and such guidance shall have binding effect upon all parties subject to this Policy.

End of Document
CHI-MHI-POL-2025-001 | Version 1.0 | Classification: Public`;

// ---------------------------------------------------------------------------
// Chunking (mirrors document-ingestion-service.ts logic)
// ---------------------------------------------------------------------------

function chunkText(
  text: string,
  maxTokens: number = MAX_CHUNK_TOKENS,
  overlapWords: number = CHUNK_OVERLAP_WORDS,
): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";
  let estimatedTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = Math.ceil(paragraph.length / 4);

    if (estimatedTokens + paragraphTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      const lastWords = currentChunk.split(/\s+/).slice(-overlapWords);
      currentChunk = lastWords.join(" ") + " " + paragraph;
      estimatedTokens = Math.ceil(currentChunk.length / 4);
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      estimatedTokens += paragraphTokens;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((c) => c.length > 10);
}

// ---------------------------------------------------------------------------
// Section title detection (auto-detect from "Chapter N:" / "Article N:")
// ---------------------------------------------------------------------------

function detectSectionTitle(chunkContent: string): string | null {
  // Look for the last Chapter or Article heading that appears in the chunk
  const chapterMatch = chunkContent.match(/Chapter\s+\d+:\s*[^\n]+/g);
  const articleMatch = chunkContent.match(/Article\s+\d+\s*[\u2014—-]+\s*[^\n]+/g);

  // Prefer the most specific (Article) if available, otherwise Chapter
  if (articleMatch && articleMatch.length > 0) {
    return articleMatch[0].trim();
  }
  if (chapterMatch && chapterMatch.length > 0) {
    return chapterMatch[0].trim();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Embedding generation (batched, matching ingestion service pattern)
// ---------------------------------------------------------------------------

async function generateEmbeddingsBatch(
  openai: OpenAI,
  texts: string[],
): Promise<number[][]> {
  const truncated = texts.map((t) => t.slice(0, 8000));
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncated,
  });
  return response.data.map((d) => d.embedding);
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("[Seed] Starting CHI Mandatory Health Insurance Policy seed...");

  // ---- Validate environment -------------------------------------------------
  if (!process.env.OPENAI_API_KEY) {
    console.error("[Seed] OPENAI_API_KEY is not set. Aborting.");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // ---- Idempotency check ----------------------------------------------------
  const existing = await db.execute(
    sql`SELECT id FROM knowledge_documents WHERE title = ${DOCUMENT_TITLE} LIMIT 1`,
  );

  if (existing.rows.length > 0) {
    console.log(
      `[Seed] Document "${DOCUMENT_TITLE}" already exists (id=${(existing.rows[0] as any).id}). Skipping.`,
    );
    await closePool();
    return;
  }

  // ---- Insert document record -----------------------------------------------
  console.log("[Seed] Inserting document record...");

  const fileSize = Buffer.byteLength(DOCUMENT_TEXT, "utf-8");

  const insertResult = await db.execute(sql`
    INSERT INTO knowledge_documents (
      filename,
      original_filename,
      file_type,
      category,
      title,
      description,
      source_authority,
      file_path,
      file_size,
      mime_type,
      extracted_text,
      page_count,
      language,
      processing_status
    ) VALUES (
      ${"seed_chi_mandatory_policy.txt"},
      ${"CHI Mandatory Health Insurance Policy.txt"},
      ${"text"},
      ${"chi_mandatory_policy"},
      ${DOCUMENT_TITLE},
      ${"Sample CHI Mandatory Health Insurance Policy covering general provisions, employer obligations, minimum benefit standards, provider network requirements, claims processing, penalties, and transitional provisions. Seeded for RAG pipeline testing."},
      ${"CHI"},
      ${"seed://chi-mandatory-policy"},
      ${fileSize},
      ${"text/plain"},
      ${DOCUMENT_TEXT},
      ${1},
      ${"en"},
      ${"generating_embeddings"}
    )
    RETURNING id
  `);

  const documentId = (insertResult.rows[0] as any).id as string;
  console.log(`[Seed] Document created with id=${documentId}`);

  // ---- Chunk the text -------------------------------------------------------
  console.log("[Seed] Chunking document text...");
  const chunks = chunkText(DOCUMENT_TEXT);
  console.log(`[Seed] Produced ${chunks.length} chunks`);

  // ---- Generate embeddings in batches of 20 ---------------------------------
  console.log("[Seed] Generating embeddings via OpenAI...");
  let processedCount = 0;

  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchIndex = Math.floor(i / EMBEDDING_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunks.length / EMBEDDING_BATCH_SIZE);

    console.log(
      `[Seed] Embedding batch ${batchIndex}/${totalBatches} (${batchChunks.length} chunks)...`,
    );

    const embeddings = await generateEmbeddingsBatch(openai, batchChunks);

    // ---- Insert chunks with embeddings ------------------------------------
    for (let j = 0; j < batchChunks.length; j++) {
      const chunkIndex = i + j;
      const content = batchChunks[j];
      const embedding = embeddings[j];
      const embeddingStr = `[${embedding.join(",")}]`;
      const tokenCount = Math.ceil(content.length / 4);
      const sectionTitle = detectSectionTitle(content);

      await db.execute(sql`
        INSERT INTO knowledge_chunks (
          document_id,
          chunk_index,
          content,
          token_count,
          section_title,
          page_number,
          embedding
        ) VALUES (
          ${documentId},
          ${chunkIndex},
          ${content},
          ${tokenCount},
          ${sectionTitle},
          ${1},
          ${embeddingStr}::vector
        )
      `);

      processedCount++;
    }
  }

  console.log(`[Seed] Inserted ${processedCount} chunks with embeddings`);

  // ---- Mark document completed ----------------------------------------------
  await db.execute(sql`
    UPDATE knowledge_documents
    SET processing_status = 'completed',
        chunk_count = ${processedCount},
        updated_at = NOW()
    WHERE id = ${documentId}
  `);

  console.log("[Seed] Document marked as completed");
  console.log(
    `[Seed] Done. Document "${DOCUMENT_TITLE}" seeded with ${processedCount} chunks.`,
  );

  // ---- Clean up -------------------------------------------------------------
  await closePool();
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main().catch(async (err) => {
  console.error("[Seed] Fatal error:", err);
  try {
    await closePool();
  } catch {
    // ignore close errors during fatal exit
  }
  process.exit(1);
});
