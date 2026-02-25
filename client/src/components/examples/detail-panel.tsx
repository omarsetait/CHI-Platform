import { DetailPanel } from '../detail-panel';

const exampleProvider = {
  id: "example-provider-1",
  name: "Example Provider",
  specialty: "General Practice",
  hospital: "Example Hospital",
  aiScore: 0.75,
  riskScore: "Medium",
  totalClaims: 150,
  flaggedClaims: 12,
};

const exampleClaims = [
  {
    id: "claim-1",
    claimNumber: "CLM-001",
    patientName: "John Doe",
    providerName: "Example Provider",
    amount: 1500,
    outlierScore: 0.6,
    registrationDate: "2024-01-15",
    claimType: "Outpatient",
    lengthOfStay: 1,
    hospital: "Example Hospital",
    hospitalName: "Example Hospital",
    providerId: "example-provider-1",
    patientId: "patient-1",
  },
  {
    id: "claim-2",
    claimNumber: "CLM-002",
    patientName: "Jane Smith",
    providerName: "Example Provider",
    amount: 2500,
    outlierScore: 0.8,
    registrationDate: "2024-01-20",
    claimType: "Inpatient",
    lengthOfStay: 3,
    hospital: "Example Hospital",
    hospitalName: "Example Hospital",
    providerId: "example-provider-1",
    patientId: "patient-2",
  },
];

export default function DetailPanelExample() {
  return (
    <DetailPanel 
      type="provider" 
      data={exampleProvider} 
      onClose={() => console.log('Close panel')}
      relatedClaims={exampleClaims}
    />
  );
}
