import { DonutChart } from '../donut-chart';

export default function DonutChartExample() {
  // Example data for component demonstration
  const exampleData = [
    { name: "C50 - Malignant neoplasm of breast", value: 49096, color: "hsl(217 90% 55%)" },
    { name: "C34 - Malignant neoplasm of bronchus", value: 26606, color: "hsl(38 95% 50%)" },
    { name: "N18 - Chronic kidney disease", value: 2609, color: "hsl(0 0% 60%)" },
    { name: "E29 - Cavities and denodonitis", value: 11489, color: "hsl(0 0% 30%)" },
    { name: "A09 - Infectious gastroenteritis", value: 9770, color: "hsl(142 70% 45%)" },
  ];

  return (
    <div className="p-4 bg-card">
      <DonutChart data={exampleData} title="Top Diagnosis" />
    </div>
  );
}
