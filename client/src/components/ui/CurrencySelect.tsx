import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { CURRENCY_META } from '../../constants/currencies';

export interface CurrencyOption {
  code: string;
  available: boolean;
  provider: string | null;
  group: 'africa' | 'international';
}

interface Props {
  value: string;
  options: CurrencyOption[];
  onChange: (code: string) => void;
  disabled?: boolean;
  id?: string;
  loading?: boolean;
}

const PROVIDER_LABEL: Record<string, string> = {
  flutterwave: 'Flutterwave',
  stripe: 'Stripe',
};

/**
 * Searchable currency picker grouped by payment route.
 *
 * Every currency the providers support is listed, including ones whose provider
 * has no keys yet. Those are shown disabled with the reason rather than hidden,
 * so the list never silently changes shape once an environment variable lands.
 */
export default function CurrencySelect({
  value,
  options,
  onChange,
  disabled,
  id = 'currency-select',
  loading,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    searchRef.current?.focus();

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;

    return options.filter((option) => {
      const meta = CURRENCY_META[option.code];
      return (
        option.code.toLowerCase().includes(needle) ||
        meta?.name.toLowerCase().includes(needle)
      );
    });
  }, [options, query]);

  const groups = useMemo(() => {
    return (['africa', 'international'] as const)
      .map((group) => ({
        group,
        label: group === 'africa' ? 'Africa' : 'International',
        items: filtered.filter((option) => option.group === group),
      }))
      .filter((section) => section.items.length > 0);
  }, [filtered]);

  const selected = CURRENCY_META[value];
  const selectedOption = options.find((option) => option.code === value);
  const selectedUnavailable = selectedOption ? !selectedOption.available : false;

  return (
    <div className="currency-picker" ref={wrapRef}>
      <button
        type="button"
        id={id}
        className={`currency-picker-trigger${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="currency-picker-value">
          <span className="currency-picker-code">{value}</span>
          <span className="currency-picker-name">{selected?.name ?? 'Select currency'}</span>
        </span>
        {selectedUnavailable && <span className="currency-picker-warn">Not configured</span>}
        <ChevronDown size={16} className="currency-picker-chevron" />
      </button>

      {open && (
        <div className="currency-picker-panel" role="listbox">
          <div className="currency-picker-search">
            <Search size={14} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search currency"
              aria-label="Search currency"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="currency-picker-list">
            {loading && <div className="currency-picker-empty">Loading currencies...</div>}

            {!loading && groups.length === 0 && (
              <div className="currency-picker-empty">No currency matches &quot;{query}&quot;</div>
            )}

            {!loading &&
              groups.map((section) => (
                <div key={section.group} className="currency-picker-group">
                  <div className="currency-picker-group-label">{section.label}</div>
                  {section.items.map((option) => {
                    const meta = CURRENCY_META[option.code];
                    const isSelected = option.code === value;

                    return (
                      <button
                        type="button"
                        key={option.code}
                        role="option"
                        aria-selected={isSelected}
                        disabled={!option.available}
                        className={`currency-picker-option${isSelected ? ' is-selected' : ''}${
                          option.available ? '' : ' is-unavailable'
                        }`}
                        onClick={() => {
                          onChange(option.code);
                          setOpen(false);
                          setQuery('');
                        }}
                      >
                        <span className="currency-picker-option-code">{option.code}</span>
                        <span className="currency-picker-option-name">{meta?.name ?? option.code}</span>
                        <span className="currency-picker-option-symbol">{meta?.symbol}</span>
                        {!option.available && (
                          <span className="currency-picker-option-tag">
                            {option.provider
                              ? `${PROVIDER_LABEL[option.provider] ?? option.provider} keys needed`
                              : 'Unsupported'}
                          </span>
                        )}
                        {isSelected && option.available && <Check size={15} />}
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}