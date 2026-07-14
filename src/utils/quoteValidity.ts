export type QuoteValidityStatus =
  | 'Concept'
  | 'Open'
  | 'Verzonden'
  | 'In behandeling'
  | 'Gewonnen'
  | 'Verloren'
  | 'Verlopen';

export type QuoteValidityTone = 'normal' | 'warning' | 'today' | 'expired' | 'missing';

const activeStatuses = new Set<QuoteValidityStatus>(['Concept', 'Open', 'Verzonden', 'In behandeling']);

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string | null | undefined) => {
  if (!value) {
    return '';
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return '';
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
};

const dateKeyToUtc = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);

  return Date.UTC(year, month - 1, day);
};

export const getDateInputValue = (value: string | null | undefined) => parseDateKey(value);

export const formatValidUntil = (value: string | null | undefined) => {
  const dateKey = parseDateKey(value);

  if (!dateKey) {
    return '-';
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(date)
    .replace('.', '');
};

export const getQuoteValidityInfo = (
  validUntil: string | null | undefined,
  status: QuoteValidityStatus,
  today = new Date(),
) => {
  const dateKey = parseDateKey(validUntil);

  if (!dateKey) {
    return {
      daysUntilExpiry: undefined,
      effectiveStatus: status,
      hasDate: false,
      isAutoExpired: false,
      message: '',
      tone: 'missing' as QuoteValidityTone,
      validUntilDisplay: '-',
    };
  }

  const todayKey = toDateKey(today);
  const daysUntilExpiry = Math.round((dateKeyToUtc(dateKey) - dateKeyToUtc(todayKey)) / 86_400_000);
  const isFinalStatus = status === 'Gewonnen' || status === 'Verloren';
  const isAutoExpired = !isFinalStatus && activeStatuses.has(status) && daysUntilExpiry < 0;
  const effectiveStatus = isAutoExpired ? 'Verlopen' : status;

  let message = '';
  let tone: QuoteValidityTone = 'normal';

  if (daysUntilExpiry < 0) {
    const daysExpired = Math.abs(daysUntilExpiry);
    message = daysExpired === 1 ? '1 dag verlopen' : `${daysExpired} dagen verlopen`;
    tone = 'expired';
  } else if (daysUntilExpiry === 0) {
    message = 'Vandaag laatste geldige dag';
    tone = 'today';
  } else if (daysUntilExpiry <= 3) {
    message = daysUntilExpiry === 1 ? 'Verloopt over 1 dag' : `Verloopt over ${daysUntilExpiry} dagen`;
    tone = 'warning';
  }

  return {
    daysUntilExpiry,
    effectiveStatus,
    hasDate: true,
    isAutoExpired,
    message,
    tone,
    validUntilDisplay: formatValidUntil(dateKey),
  };
};
