/**
 * Shared risk display utilities.
 * Single source of truth for risk level badge classes and colors.
 */

export function getRiskLevelBadgeClasses(level: string | null): string {
  switch (level) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "low":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

export function getRiskScoreColor(score: number): string {
  if (score >= 85) return "#ef4444"; // red
  if (score >= 70) return "#f97316"; // orange
  if (score >= 50) return "#eab308"; // yellow
  return "#22c55e"; // green
}
