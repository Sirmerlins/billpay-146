import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Check, Copy, Download, RotateCcw, Search, Undo2, X } from 'lucide-react';
import { ChecklistGrid, type FilterMode } from './components/ChecklistGrid';
import { parseNumberInput, TOTAL_PEOPLE } from './utils/numberParser';

const STORAGE_KEY = 'billpay_146_paid_numbers_v1';

interface FeedbackState {
  tone: 'success' | 'info' | 'error';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

function loadInitialPaidNumbers(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= TOTAL_PEOPLE,
    );
  } catch {
    return [];
  }
}

export default function App() {
  const [paidNumbers, setPaidNumbers] = useState<number[]>(loadInitialPaidNumbers);
  const [history, setHistory] = useState<number[][]>([]);
  const [inputValue, setInputValue] = useState('');
  const [lastCheckedNumbers, setLastCheckedNumbers] = useState<number[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [copiedUnpaid, setCopiedUnpaid] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(paidNumbers));
    } catch {
      // Ignore storage quota errors
    }
  }, [paidNumbers]);

  const paidSet = useMemo(() => new Set(paidNumbers), [paidNumbers]);

  const parsedLive = useMemo(() => parseNumberInput(inputValue, TOTAL_PEOPLE), [inputValue]);

  const highlightedNumbers = useMemo(() => {
    if (parsedLive.validNumbers.length > 0) {
      return parsedLive.validNumbers;
    }
    return lastCheckedNumbers;
  }, [parsedLive.validNumbers, lastCheckedNumbers]);

  const highlightedSet = useMemo(() => new Set(highlightedNumbers), [highlightedNumbers]);

  const primaryFocusNumber =
    highlightedNumbers.length > 0 ? highlightedNumbers[highlightedNumbers.length - 1] : null;

  const paidCount = paidNumbers.length;
  const unpaidCount = TOTAL_PEOPLE - paidCount;
  const paidPercent = Math.round((paidCount / TOTAL_PEOPLE) * 1000) / 10;

  const pushHistoryAndSet = (nextNumbers: number[]) => {
    setHistory((prev) => [...prev.slice(-19), paidNumbers]);
    setPaidNumbers(nextNumbers);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setPaidNumbers(previous);
    setFeedback({
      tone: 'info',
      message: 'Reverted the last change.',
    });
  };

  const markNumbersPaid = (nums: number[]) => {
    const next = new Set(paidNumbers);
    const newlyMarked: number[] = [];
    for (const n of nums) {
      if (!next.has(n)) {
        next.add(n);
        newlyMarked.push(n);
      }
    }
    if (newlyMarked.length > 0) {
      pushHistoryAndSet(Array.from(next).sort((a, b) => a - b));
    }
    return newlyMarked;
  };

  const unmarkNumbersPaid = (nums: number[]) => {
    const toRemove = new Set(nums);
    const next = paidNumbers.filter((n) => !toRemove.has(n));
    if (next.length !== paidNumbers.length) {
      pushHistoryAndSet(next);
    }
  };

  const handleToggleSingle = (num: number) => {
    const wasPaid = paidSet.has(num);
    if (wasPaid) {
      unmarkNumbersPaid([num]);
      setFeedback({
        tone: 'info',
        message: `Marked #${num} as unpaid.`,
        actionLabel: 'Undo',
        onAction: () => {
          setPaidNumbers((curr) => {
            const next = new Set(curr);
            next.add(num);
            return Array.from(next).sort((a, b) => a - b);
          });
          setFeedback(null);
        },
      });
    } else {
      markNumbersPaid([num]);
      setFeedback({
        tone: 'success',
        message: `Marked #${num} as paid.`,
      });
    }
    setLastCheckedNumbers([num]);
    setConfirmReset(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setConfirmReset(false);

    if (!inputValue.trim()) {
      setFeedback({
        tone: 'error',
        message: 'Enter a number between 1 and 146.',
      });
      inputRef.current?.focus();
      return;
    }

    const { validNumbers, outOfRange, invalidTokens } = parsedLive;

    if (validNumbers.length === 0) {
      if (outOfRange.length > 0) {
        setFeedback({
          tone: 'error',
          message: `Out of range (${outOfRange.join(', ')}). Enter numbers from 1 to ${TOTAL_PEOPLE}.`,
        });
      } else {
        setFeedback({
          tone: 'error',
          message: `Invalid input (${invalidTokens.join(', ')}). Use numbers from 1 to ${TOTAL_PEOPLE}.`,
        });
      }
      return;
    }

    const newlyMarked = markNumbersPaid(validNumbers);
    setLastCheckedNumbers(validNumbers);
    setInputValue('');
    inputRef.current?.focus();

    if (newlyMarked.length === 0) {
      if (validNumbers.length === 1) {
        const target = validNumbers[0];
        setFeedback({
          tone: 'info',
          message: `#${target} is already marked paid.`,
          actionLabel: `Unmark #${target}`,
          onAction: () => {
            unmarkNumbersPaid([target]);
            setFeedback({
              tone: 'info',
              message: `Marked #${target} as unpaid.`,
            });
          },
        });
      } else {
        setFeedback({
          tone: 'info',
          message: `All ${validNumbers.length} entered numbers were already paid.`,
          actionLabel: 'Unmark all',
          onAction: () => {
            unmarkNumbersPaid(validNumbers);
            setFeedback({
              tone: 'info',
              message: `Marked ${validNumbers.length} numbers as unpaid.`,
            });
          },
        });
      }
      return;
    }

    const previewList =
      newlyMarked.length <= 5
        ? newlyMarked.map((n) => `#${n}`).join(', ')
        : `${newlyMarked.length} numbers`;

    const warningSuffix =
      outOfRange.length > 0 ? ` (skipped out-of-range: ${outOfRange.join(', ')})` : '';

    setFeedback({
      tone: 'success',
      message: `Marked ${previewList} as paid.${warningSuffix}`,
      actionLabel: 'Undo',
      onAction: () => {
        unmarkNumbersPaid(newlyMarked);
        setFeedback({
          tone: 'info',
          message: `Reverted ${previewList}.`,
        });
      },
    });
  };

  const handleCopyUnpaid = async () => {
    const unpaidList: number[] = [];
    for (let n = 1; n <= TOTAL_PEOPLE; n++) {
      if (!paidSet.has(n)) unpaidList.push(n);
    }
    const text = unpaidList.length > 0 ? unpaidList.join(', ') : 'Everyone has paid!';
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUnpaid(true);
      setTimeout(() => setCopiedUnpaid(false), 1800);
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Could not access clipboard in this browser.',
      });
    }
  };

  const handleExportCsv = () => {
    const rows = ['Number,Status'];
    for (let n = 1; n <= TOTAL_PEOPLE; n++) {
      rows.push(`${n},${paidSet.has(n) ? 'Paid' : 'Unpaid'}`);
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bill-checklist-146.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmReset = () => {
    if (paidNumbers.length === 0) {
      setConfirmReset(false);
      return;
    }
    pushHistoryAndSet([]);
    setLastCheckedNumbers([]);
    setConfirmReset(false);
    setFeedback({
      tone: 'info',
      message: 'Cleared all 146 payment checkmarks.',
      actionLabel: 'Undo',
      onAction: handleUndo,
    });
  };

  // Live preview text when user is typing
  const liveStatusText = useMemo(() => {
    if (!inputValue.trim()) return null;

    if (parsedLive.validNumbers.length === 0) {
      if (parsedLive.outOfRange.length > 0) {
        return {
          tone: 'error' as const,
          text: `Out of range (${parsedLive.outOfRange.join(', ')}) — enter 1 to ${TOTAL_PEOPLE}.`,
        };
      }
      if (parsedLive.invalidTokens.length > 0) {
        return {
          tone: 'error' as const,
          text: `Enter numbers from 1 to ${TOTAL_PEOPLE} (e.g. 42 or 12, 15, 20-25).`,
        };
      }
      return null;
    }

    if (parsedLive.validNumbers.length === 1) {
      const num = parsedLive.validNumbers[0];
      const isPaid = paidSet.has(num);
      return {
        tone: isPaid ? ('paid' as const) : ('unpaid' as const),
        num,
        isPaid,
        text: isPaid
          ? `#${num} has already paid`
          : `#${num} has not paid yet — press Enter to mark paid`,
      };
    }

    const alreadyPaid = parsedLive.validNumbers.filter((n) => paidSet.has(n)).length;
    const unpaid = parsedLive.validNumbers.length - alreadyPaid;
    return {
      tone: unpaid === 0 ? ('paid' as const) : ('unpaid' as const),
      text: `${parsedLive.validNumbers.length} numbers selected (${unpaid} unpaid, ${alreadyPaid} already paid) — press Enter to mark paid`,
    };
  }, [inputValue, parsedLive, paidSet]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            BillPay 146
          </span>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              Export CSV
            </button>

            {confirmReset ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                disabled={paidCount === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Input & Progress Panel */}
        <section
          aria-label="Number lookup and payment summary"
          className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Number Input Form */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <label
                  htmlFor="person-number-input"
                  className="text-sm font-semibold text-slate-900"
                >
                  Check or mark number
                </label>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  Range: 1–{TOTAL_PEOPLE}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="flex items-stretch gap-2.5">
                <div className="relative flex-1 min-w-0">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    ref={inputRef}
                    id="person-number-input"
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      if (feedback) setFeedback(null);
                    }}
                    placeholder="Type number (e.g. 42) or list (12, 18, 25-30)"
                    autoFocus
                    autoComplete="off"
                    className="w-full h-11 pl-10 pr-9 text-sm font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-colors"
                  />
                  {inputValue && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputValue('');
                        inputRef.current?.focus();
                      }}
                      aria-label="Clear number input"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="h-11 px-5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  Mark Paid
                </button>
              </form>

              {/* Live status or submission feedback */}
              <div className="min-h-[24px] flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {liveStatusText ? (
                  <>
                    <span
                      className={
                        liveStatusText.tone === 'error'
                          ? 'text-red-600 font-medium'
                          : liveStatusText.tone === 'paid'
                            ? 'text-emerald-700 font-medium'
                            : 'text-blue-700 font-medium'
                      }
                    >
                      {liveStatusText.text}
                    </span>
                    {'num' in liveStatusText && typeof liveStatusText.num === 'number' && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = liveStatusText.num!;
                          handleToggleSingle(target);
                          setInputValue('');
                          inputRef.current?.focus();
                        }}
                        className="text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900 whitespace-nowrap cursor-pointer"
                      >
                        {liveStatusText.isPaid ? `Unmark #${liveStatusText.num}` : `Mark #${liveStatusText.num} Paid`}
                      </button>
                    )}
                  </>
                ) : feedback ? (
                  <>
                    <span
                      className={
                        feedback.tone === 'error'
                          ? 'text-red-600 font-medium'
                          : feedback.tone === 'success'
                            ? 'text-emerald-700 font-medium'
                            : 'text-slate-700 font-medium'
                      }
                    >
                      {feedback.message}
                    </span>
                    {feedback.actionLabel && feedback.onAction && (
                      <button
                        type="button"
                        onClick={feedback.onAction}
                        className="text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900 whitespace-nowrap cursor-pointer"
                      >
                        {feedback.actionLabel}
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-500">
                    Typing highlights the number in the grid below. Press Enter to check it off.
                  </span>
                )}
              </div>
            </div>

            {/* Payment Tally Summary */}
            <div className="lg:col-span-5 lg:border-l lg:border-slate-200 lg:pl-6 space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-slate-500">Paid</span>
                  <div className="mt-0.5 flex items-baseline gap-2 font-mono tabular-nums">
                    <span className="text-2xl font-bold text-slate-900">{paidCount}</span>
                    <span className="text-sm text-slate-500">/ {TOTAL_PEOPLE}</span>
                  </div>
                </div>

                <div className="text-right font-mono tabular-nums">
                  <span className="text-xs font-medium text-slate-500 font-sans">Remaining</span>
                  <div className="mt-0.5 text-2xl font-bold text-slate-900">{unpaidCount}</div>
                </div>
              </div>

              <div
                className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={paidCount}
                aria-valuemin={0}
                aria-valuemax={TOTAL_PEOPLE}
                aria-label={`${paidCount} of ${TOTAL_PEOPLE} people paid`}
              >
                <div
                  className="h-full bg-emerald-600 transition-all duration-200"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-mono tabular-nums">{paidPercent}% collected</span>
                <span>Click any cell to toggle status</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filter & Utility Toolbar */}
        <section aria-label="Checklist controls and 146-person grid" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({TOTAL_PEOPLE})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('paid')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterMode === 'paid'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paid ({paidCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unpaid')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterMode === 'unpaid'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unpaid ({unpaidCount})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Quiet Legend */}
              <div className="hidden sm:flex items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-white border border-slate-300 inline-block" aria-hidden="true" />
                  Unpaid
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-400 inline-flex items-center justify-center" aria-hidden="true">
                    <Check className="w-2.5 h-2.5 text-emerald-700" strokeWidth={3} />
                  </span>
                  Paid
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-white border border-blue-600 ring-1 ring-blue-600 inline-block" aria-hidden="true" />
                  Inputted
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  Undo
                </button>

                <button
                  type="button"
                  onClick={handleCopyUnpaid}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedUnpaid ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                      Copied Unpaid
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                      Copy Unpaid
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <ChecklistGrid
            totalPeople={TOTAL_PEOPLE}
            paidSet={paidSet}
            highlightedSet={highlightedSet}
            primaryFocusNumber={primaryFocusNumber}
            filterMode={filterMode}
            onToggleNumber={handleToggleSingle}
            onResetFilter={() => setFilterMode('all')}
          />
        </section>
      </main>
    </div>
  );
}
