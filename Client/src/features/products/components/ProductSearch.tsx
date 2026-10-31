import { Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProductSearchProps {
  /** Current search from the URL */
  value: string;
  onSearch: (q: string) => void;
}

/**
 * Searches on submit (Enter or button), not on every keystroke: one request per search.
 * Uncontrolled input; the page gives it key={value} so it resets when the URL changes.
 */
export function ProductSearch({ value, onSearch }: ProductSearchProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get('q');
    onSearch(typeof q === 'string' ? q.trim() : '');
  };

  return (
    <form role="search" onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
      <Input
        name="q"
        type="search"
        defaultValue={value}
        placeholder="Search products…"
        aria-label="Search products"
      />
      <Button type="submit" variant="outline" size="icon" aria-label="Search">
        <Search />
      </Button>
    </form>
  );
}
