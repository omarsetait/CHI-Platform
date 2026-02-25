import { RiskScoreDisplay } from '../risk-score-display';

export default function RiskScoreDisplayExample() {
  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      <RiskScoreDisplay score={0.89} />
      <RiskScoreDisplay score={0.49} />
      <RiskScoreDisplay score={0.06} />
    </div>
  );
}
