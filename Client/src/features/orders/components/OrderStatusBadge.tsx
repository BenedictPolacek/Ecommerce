import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ORDER_STATUS } from '../status';
import type { OrderStatus } from '../types';

const toneClass = {
  neutral: 'bg-amber-100 text-amber-900',
  info: 'bg-blue-100 text-blue-900',
  success: 'bg-green-100 text-green-900',
  danger: 'bg-red-100 text-red-900',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, tone } = ORDER_STATUS[status];
  return <Badge className={cn('border-transparent', toneClass[tone])}>{label}</Badge>;
}
