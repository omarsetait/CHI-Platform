import { AIScoreBadge } from '../ai-score-badge';

export default function AIScoreBadgeExample() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <AIScoreBadge score={0.95} />
      <AIScoreBadge score={0.67} />
      <AIScoreBadge score={0.29} />
    </div>
  );
}
