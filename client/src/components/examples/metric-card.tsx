import { MetricCard } from '../metric-card';
import { DollarSign } from 'lucide-react';

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <MetricCard
        title="Total Claim Amount"
        value="$42,404,989"
        icon={DollarSign}
        trend={{ value: "12.5%", isPositive: false }}
      />
      <MetricCard
        title="Number of Claims"
        value="171,795"
        subtitle="Active claims under review"
      />
    </div>
  );
}
