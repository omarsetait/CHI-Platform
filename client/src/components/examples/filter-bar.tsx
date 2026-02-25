import { useState } from 'react';
import { FilterBar, FilterState } from '../filter-bar';

export default function FilterBarExample() {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    riskLevel: 'all',
    amountMin: 0,
    amountMax: 10000000,
    claimType: 'all',
  });

  return (
    <div className="p-4 bg-card">
      <FilterBar filters={filters} onFilterChange={setFilters} type="claims" />
    </div>
  );
}
