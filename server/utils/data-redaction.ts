type RedactableValue = string | number | boolean | null | undefined | object | any[];

interface RedactionConfig {
  fields: string[];
  partialFields?: string[];
  exemptRoles?: string[];
}

const PHI_FIELDS = [
  'ssn', 'socialSecurityNumber', 'social_security_number',
  'dateOfBirth', 'date_of_birth', 'dob', 'birthDate', 'birth_date',
  'address', 'streetAddress', 'street_address', 'homeAddress', 'home_address',
  'city', 'state', 'zipCode', 'zip_code', 'postalCode', 'postal_code',
  'medicalRecordNumber', 'medical_record_number', 'mrn',
  'healthPlanId', 'health_plan_id', 'insuranceId', 'insurance_id',
  'deviceIdentifiers', 'device_identifiers',
  'biometricData', 'biometric_data',
  'ipAddress', 'ip_address',
  'facePhoto', 'face_photo', 'photo', 'image',
];

const PII_FIELDS = [
  'email', 'emailAddress', 'email_address',
  'phone', 'phoneNumber', 'phone_number', 'telephone', 'mobile',
  'driversLicense', 'drivers_license', 'licenseNumber', 'license_number',
  'passport', 'passportNumber', 'passport_number',
  'bankAccount', 'bank_account', 'accountNumber', 'account_number',
  'creditCard', 'credit_card', 'cardNumber', 'card_number',
  'taxId', 'tax_id', 'ein', 'tin',
];

const PARTIAL_REDACT_FIELDS = [
  'patientName', 'patient_name', 'name', 'fullName', 'full_name',
  'providerName', 'provider_name', 'doctorName', 'doctor_name',
];

function redactString(value: string): string {
  return '[REDACTED]';
}

function partialRedactName(name: string): string {
  if (!name || name.length < 2) return '[REDACTED]';
  const parts = name.split(' ');
  if (parts.length === 1) {
    return name.charAt(0) + '*'.repeat(Math.min(name.length - 1, 5));
  }
  return parts.map((part, index) => {
    if (index === 0) return part.charAt(0) + '.';
    return part.charAt(0) + '*'.repeat(Math.min(part.length - 1, 4));
  }).join(' ');
}

function partialRedactNumber(value: string): string {
  if (!value || value.length < 4) return '[REDACTED]';
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

function isFieldSensitive(fieldName: string): 'phi' | 'pii' | 'partial' | null {
  const lowerField = fieldName.toLowerCase();
  
  if (PHI_FIELDS.some(f => lowerField.includes(f.toLowerCase()))) {
    return 'phi';
  }
  if (PII_FIELDS.some(f => lowerField.includes(f.toLowerCase()))) {
    return 'pii';
  }
  if (PARTIAL_REDACT_FIELDS.some(f => lowerField.includes(f.toLowerCase()))) {
    return 'partial';
  }
  return null;
}

function redactValue(key: string, value: RedactableValue, sensitivityLevel: 'phi' | 'pii' | 'partial'): RedactableValue {
  if (value === null || value === undefined) return value;
  
  if (typeof value === 'string') {
    if (sensitivityLevel === 'partial') {
      if (key.toLowerCase().includes('name')) {
        return partialRedactName(value);
      }
      if (key.toLowerCase().includes('number') || key.toLowerCase().includes('id')) {
        return partialRedactNumber(value);
      }
    }
    return redactString(value);
  }
  
  if (typeof value === 'number') {
    return 0;
  }
  
  return '[REDACTED]';
}

export function redactSensitiveData<T extends Record<string, any>>(
  data: T,
  userRole?: string,
  exemptRoles: string[] = ['admin', 'auditor']
): T {
  if (!data || typeof data !== 'object') return data;
  if (userRole && exemptRoles.includes(userRole)) return data;
  
  const redactObject = (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        result[key] = value;
        continue;
      }
      
      const sensitivity = isFieldSensitive(key);
      
      if (sensitivity) {
        result[key] = redactValue(key, value, sensitivity);
      } else if (Array.isArray(value)) {
        result[key] = value.map(item => 
          typeof item === 'object' && item !== null 
            ? redactObject(item) 
            : item
        );
      } else if (typeof value === 'object') {
        result[key] = redactObject(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  };
  
  if (Array.isArray(data)) {
    return data.map(item => 
      typeof item === 'object' && item !== null 
        ? redactObject(item) 
        : item
    ) as unknown as T;
  }
  
  return redactObject(data) as T;
}

export function classifyDataSensitivity(data: Record<string, any>): {
  hasPHI: boolean;
  hasPII: boolean;
  sensitiveFields: string[];
} {
  const sensitiveFields: string[] = [];
  let hasPHI = false;
  let hasPII = false;
  
  const checkObject = (obj: Record<string, any>, prefix = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const sensitivity = isFieldSensitive(key);
      
      if (sensitivity === 'phi') {
        hasPHI = true;
        sensitiveFields.push(fullKey);
      } else if (sensitivity === 'pii') {
        hasPII = true;
        sensitiveFields.push(fullKey);
      } else if (sensitivity === 'partial') {
        sensitiveFields.push(fullKey);
      }
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        checkObject(value, fullKey);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item && typeof item === 'object') {
            checkObject(item, `${fullKey}[${index}]`);
          }
        });
      }
    }
  };
  
  checkObject(data);
  
  return { hasPHI, hasPII, sensitiveFields };
}

export const DataClassification = {
  PHI: 'PHI',
  PII: 'PII',
  SENSITIVE: 'SENSITIVE',
  PUBLIC: 'PUBLIC',
} as const;

export type DataClassificationType = typeof DataClassification[keyof typeof DataClassification];

export function getDataClassification(data: Record<string, any>): DataClassificationType {
  const { hasPHI, hasPII, sensitiveFields } = classifyDataSensitivity(data);
  
  if (hasPHI) return DataClassification.PHI;
  if (hasPII) return DataClassification.PII;
  if (sensitiveFields.length > 0) return DataClassification.SENSITIVE;
  return DataClassification.PUBLIC;
}
