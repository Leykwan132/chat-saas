export type WhatsAppTemplateStatus =
  | 'submitting'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'failed';

export function getWhatsAppTemplateStatusPresentation(
  status: WhatsAppTemplateStatus,
) {
  if (status === 'approved') {
    return {
      label: 'Approved',
      indicatorClassName: 'bg-emerald-500',
      pending: false,
    };
  }
  if (status === 'failed') {
    return {
      label: 'Failed',
      indicatorClassName: 'bg-rose-500',
      pending: false,
    };
  }
  return {
    label: status === 'submitting' ? 'Submitting' : 'In review',
    indicatorClassName: 'bg-amber-500',
    pending: true,
  };
}
