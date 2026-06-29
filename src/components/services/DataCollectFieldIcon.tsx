import {
  Calendar,
  Clock,
  List,
  ListOrdered,
  Phone,
  ToggleLeft,
  Type,
} from 'lucide-react';
import type { FieldType } from '@/lib/serviceForm';
import { cn } from '@/lib/utils';

type DataCollectFieldIconProps = {
  type: FieldType;
  className?: string;
};

export function DataCollectFieldIcon({ type, className }: DataCollectFieldIconProps) {
  const iconClass = cn('size-4 shrink-0 text-muted-foreground', className);

  switch (type) {
    case 'date':
      return <Calendar className={iconClass} aria-hidden />;
    case 'time':
      return <Clock className={iconClass} aria-hidden />;
    case 'phone':
      return <Phone className={iconClass} aria-hidden />;
    case 'text':
      return <Type className={iconClass} aria-hidden />;
    case 'number':
      return <ListOrdered className={iconClass} aria-hidden />;
    case 'select':
      return <List className={iconClass} aria-hidden />;
    case 'boolean':
      return <ToggleLeft className={iconClass} aria-hidden />;
  }
}
