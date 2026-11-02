import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/** Copies a value (e.g. an IBAN) so the customer does not have to type it */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // e.g. no clipboard permission: the value is still visible to copy by hand
      toast.error('Could not copy. Please select the text instead.');
    }
  };

  return (
    <Button type="button" variant="ghost" size="icon" onClick={copy} aria-label={`Copy ${label}`}>
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
