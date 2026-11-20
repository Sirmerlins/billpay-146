import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

export type FilterMode = 'all' | 'paid' | 'unpaid';

interface ChecklistGridProps {
  totalPeople: number;
  paidSet: Set<number>;
  highlightedSet: Set<number>;
  primaryFocusNumber: number | null;
  filterMode: FilterMode;
  onToggleNumber: (num: number) => void;
  onResetFilter: () => void;
}

export function ChecklistGrid({
  totalPeople,
  paidSet,
  highlightedSet,
  primaryFocusNumber,
  filterMode,
  onToggleNumber,
  onResetFilter,
}: ChecklistGridProps) {
  const cellRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (primaryFocusNumber === null) return;
    const el = cellRefs.current[primaryFocusNumber];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [primaryFocusNumber]);

  const numbers = Array.from({ length: totalPeople }, (_, i) => i + 1).filter((num) => {
    const isPaid = paidSet.has(num);
    if (filterMode === 'paid') return isPaid;
    if (filterMode === 'unpaid') return !isPaid;
    return true;
  });

  if (numbers.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <p className="text-base font-medium text-slate-900">
          {filterMode === 'paid' ? 'No one has been marked paid yet' : 'Everyone has paid'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {filterMode === 'paid'
            ? 'Enter a number above or click any person in the full checklist to mark them as paid.'
            : 'All 146 people are currently marked as paid.'}
        </p>
        <button
          type="button"
          onClick={onResetFilter}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          Show All {totalPeople}
        </button>
      </div>
    );
  }

  return (
    <div
      role="grid"
      aria-label={`Bill payment checklist for ${totalPeople} people`}
      className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-[repeat(15,minmax(0,1fr))] gap-2"
    >
      {numbers.map((num) => {
        const isPaid = paidSet.has(num);
        const isHighlighted = highlightedSet.has(num);

        return (
          <button
            key={num}
            ref={(el) => {
              cellRefs.current[num] = el;
            }}
            type="button"
            onClick={() => onToggleNumber(num)}
            aria-pressed={isPaid}
            aria-label={`Number ${num}, ${isPaid ? 'paid' : 'unpaid'}${isHighlighted ? ', currently selected' : ''}`}
            className={[
              'group relative flex items-center justify-between min-h-[48px] px-2.5 py-2 rounded-lg border text-left transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
              isPaid
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100/80 hover:border-emerald-400'
                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50',
              isHighlighted
                ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-slate-50 border-blue-600 z-10 shadow-sm'
                : '',
            ].join(' ')}
          >
            <span className="font-mono tabular-nums text-sm font-semibold tracking-tight">
              {num}
            </span>
            {isPaid ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <span
                className="w-3.5 h-3.5 rounded-sm border border-slate-300 group-hover:border-slate-400 shrink-0 transition-colors"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
