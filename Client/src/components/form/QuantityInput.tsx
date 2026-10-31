import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  max: number;
  min?: number;
  disabled?: boolean;
  /** Accessible name, e.g. "Quantity of Headphones" when there are several on a page */
  label?: string;
}

/** − [ 2 ] + : typed values are clamped to min..max when the field loses focus */
export function QuantityInput({
  value,
  onChange,
  max,
  min = 1,
  disabled,
  label = 'Quantity',
}: QuantityInputProps) {
  // Lets the user clear the field while typing; the real value is set on blur
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (n: number) => Math.min(Math.max(n, min), Math.max(max, min));

  const commit = () => {
    if (draft !== null) {
      const typed = Number.parseInt(draft, 10);
      onChange(clamp(Number.isNaN(typed) ? value : typed));
      setDraft(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <Minus />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={min}
        max={max}
        value={draft ?? value}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
        className="w-16 [appearance:textfield] text-center [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <Plus />
      </Button>
    </div>
  );
}
