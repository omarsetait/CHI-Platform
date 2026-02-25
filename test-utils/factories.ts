import { faker } from '@faker-js/faker';

// Seed faker for reproducible tests
faker.seed(12345);

// Generic factory types - these match the schema patterns
export interface TestUser {
  username: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
}

export interface TestPreAuthClaim {
  claimId: string;
  patientName: string;
  patientId: string;
  providerId: string;
  providerName: string;
  procedureCode: string;
  icdCodes: string[];
  requestedAmount: number;
  status: string;
  priority: string;
}

export interface TestFwaCase {
  claimId: string;
  providerId: string;
  providerName: string;
  patientId: string;
  patientName: string;
  status: string;
  priority: string;
  phase: string;
  riskScore: number;
  fraudType: string;
  totalAmount: number;
  flags: string[];
}

export interface TestAuditLog {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    username: faker.internet.username(),
    email: faker.internet.email(),
    password: '$2b$12$test.hashed.password.for.testing',
    role: 'viewer',
    isActive: true,
    ...overrides
  };
}

export function createTestPreAuthClaim(overrides: Partial<TestPreAuthClaim> = {}): TestPreAuthClaim {
  return {
    claimId: `PA-${faker.string.alphanumeric(8).toUpperCase()}`,
    patientName: faker.person.fullName(),
    patientId: `P-${faker.string.numeric(6)}`,
    providerId: `PROV-${faker.string.numeric(4)}`,
    providerName: faker.company.name() + ' Hospital',
    procedureCode: faker.helpers.arrayElement(['99213', '99214', '99215', '90834']),
    icdCodes: [faker.helpers.arrayElement(['J06.9', 'M54.5', 'I10', 'E11.9'])],
    requestedAmount: faker.number.float({ min: 100, max: 10000, multipleOf: 0.01 }),
    status: 'pending',
    priority: faker.helpers.arrayElement(['normal', 'urgent', 'stat']),
    ...overrides
  };
}

export function createTestFwaCase(overrides: Partial<TestFwaCase> = {}): TestFwaCase {
  return {
    claimId: `CLM-${faker.string.alphanumeric(8).toUpperCase()}`,
    providerId: `PROV-${faker.string.numeric(4)}`,
    providerName: faker.company.name() + ' Medical Center',
    patientId: `P-${faker.string.numeric(6)}`,
    patientName: faker.person.fullName(),
    status: 'open',
    priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
    phase: 'A1',
    riskScore: faker.number.int({ min: 0, max: 100 }),
    fraudType: faker.helpers.arrayElement(['billing', 'upcoding', 'unbundling', 'phantom']),
    totalAmount: faker.number.float({ min: 1000, max: 100000, multipleOf: 0.01 }),
    flags: ['Suspicious Pattern', 'High Risk Provider'],
    ...overrides
  };
}

export function createTestAuditLog(overrides: Partial<TestAuditLog> = {}): TestAuditLog {
  return {
    userId: faker.string.uuid(),
    action: 'VIEW_PATIENT_360',
    resourceType: 'patient_360',
    resourceId: faker.string.uuid(),
    ipAddress: faker.internet.ip(),
    userAgent: faker.internet.userAgent(),
    details: { test: true },
    ...overrides
  };
}

// Helper to create multiple test entities
export function createMany<T>(factory: (overrides?: any) => T, count: number, overrides?: any): T[] {
  return Array.from({ length: count }, () => factory(overrides));
}
