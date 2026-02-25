import { RiskBadge } from '../risk-badge';

export default function RiskBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      <RiskBadge type="Claim Cost" />
      <RiskBadge type="Length of Stay" />
      <RiskBadge type="Surgery Fee" />
      <RiskBadge type="High Benefit Cost" />
    </div>
  );
}
