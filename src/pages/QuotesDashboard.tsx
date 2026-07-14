import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import {
  deleteSavedQuote,
  duplicateSavedQuote,
  fetchSavedQuote,
  fetchSavedQuotes,
  updateSavedQuoteStatus,
  type QuoteStatus,
  type SavedQuote,
} from '../services/quoteService';
import tffLogo from '../assets/tff-logo.png';
import { generateLclQuotePdf, type LclQuoteDetails, type LclQuotePalletLine } from '../services/lclQuotePdfService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatNumber } from '../utils/formatNumber';
import { formatDisplayName } from '../utils/formatDisplayName';
import { formatValidUntil, getDateInputValue, getQuoteValidityInfo } from '../utils/quoteValidity';
import { StatisticCard } from '../components';

type QuotesDashboardProps = {
  onOpenQuote: (quote: SavedQuote) => void;
};

type SortKey = 'quoteNumber' | 'customerName' | 'salesPrice' | 'margin' | 'status' | 'validUntil' | 'createdAt';
type SortDirection = 'asc' | 'desc';
type ValidityFilter = '' | 'valid' | 'soon' | 'expired';
type ActivityItem = {
  action: string;
  customerName: string;
  date: string;
  quote: SavedQuote;
};

const trendDays = 12;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

const quoteStatuses: QuoteStatus[] = [
  'Concept',
  'Open',
  'Verzonden',
  'In behandeling',
  'Gewonnen',
  'Verloren',
  'Verlopen',
];

const normalize = (value: string) => value.trim().toLowerCase();

const statusQueryMap: Record<string, QuoteStatus | 'pipeline'> = {
  concept: 'Concept',
  in_behandeling: 'In behandeling',
  lost: 'Verloren',
  open: 'pipeline',
  pipeline: 'pipeline',
  sent: 'Verzonden',
  verlopen: 'Verlopen',
  won: 'Gewonnen',
};

const statusToQueryValue = (status: string) => {
  if (status === 'Gewonnen') {
    return 'won';
  }

  if (status === 'Verloren') {
    return 'lost';
  }

  if (status === 'In behandeling') {
    return 'in_behandeling';
  }

  if (status === 'Verzonden') {
    return 'sent';
  }

  if (status === 'Verlopen') {
    return 'verlopen';
  }

  if (status === 'Concept') {
    return 'concept';
  }

  return status ? status.toLowerCase() : '';
};

const getRouteParts = (quote: SavedQuote) => {
  const unloadingParts = quote.unloadingPlace.split(/\s+via\s+/i);

  return {
    from: quote.loadingPlace || '-',
    to: unloadingParts[0] || quote.unloadingPlace || '-',
    via: unloadingParts[1] ?? '',
  };
};

const isInCurrentMonth = (dateValue: string) => {
  const date = new Date(dateValue);
  const now = new Date();

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    end: end.toISOString().slice(0, 10),
    start: start.toISOString().slice(0, 10),
  };
};

const getDayKey = (dateValue: string) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const buildDailySeries = (
  quotes: SavedQuote[],
  dateSelector: (quote: SavedQuote) => string,
  valueSelector: (quote: SavedQuote) => number,
) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - trendDays + 1);
  const totals = new Map<string, number>();

  Array.from({ length: trendDays }).forEach((_, index) => {
    const day = new Date(start.getTime() + index * millisecondsPerDay);
    totals.set(day.toISOString().slice(0, 10), 0);
  });

  quotes.forEach((quote) => {
    const key = getDayKey(dateSelector(quote));

    if (!totals.has(key)) {
      return;
    }

    totals.set(key, (totals.get(key) ?? 0) + valueSelector(quote));
  });

  return Array.from(totals.values());
};

const buildDailyRevenueSeries = (quotes: SavedQuote[], offsetDays = 0) => {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offsetDays);
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - trendDays + 1);
  const totals = new Map<string, { date: Date; value: number }>();

  Array.from({ length: trendDays }).forEach((_, index) => {
    const day = new Date(start.getTime() + index * millisecondsPerDay);
    totals.set(day.toISOString().slice(0, 10), { date: day, value: 0 });
  });

  quotes.forEach((quote) => {
    if (quote.status !== 'Gewonnen' || !Number.isFinite(quote.salesPrice) || quote.salesPrice <= 0) {
      return;
    }

    const key = getDayKey(quote.statusUpdatedAt || quote.createdAt);

    if (!totals.has(key)) {
      return;
    }

    const current = totals.get(key);

    if (current) {
      current.value += quote.salesPrice;
    }
  });

  return Array.from(totals.values());
};

const getRelativeExpiryLabel = (daysUntilExpiry?: number) => {
  if (daysUntilExpiry === undefined) {
    return '';
  }

  if (daysUntilExpiry === 0) {
    return 'vandaag';
  }

  if (daysUntilExpiry === 1) {
    return 'morgen';
  }

  return `over ${daysUntilExpiry} dagen`;
};

const getActivity = (quote: SavedQuote): ActivityItem => {
  const createdAt = new Date(quote.createdAt).getTime();
  const statusUpdatedAt = new Date(quote.statusUpdatedAt).getTime();
  const hasStatusActivity = Number.isFinite(statusUpdatedAt) && Math.abs(statusUpdatedAt - createdAt) > 1000;
  const action = hasStatusActivity && quote.status !== 'Open' ? `Offerte ${quote.status.toLowerCase()}` : 'Offerte aangemaakt';

  return {
    action,
    customerName: quote.customerName || 'Onbekende klant',
    date: hasStatusActivity ? quote.statusUpdatedAt : quote.createdAt,
    quote,
  };
};

const toText = (value: unknown) => (typeof value === 'string' ? value : '');

const getQuoteMargin = (quote: SavedQuote) =>
  Number.isFinite(quote.salesPrice) && Number.isFinite(quote.purchasePrice) && quote.purchasePrice > 0
    ? quote.salesPrice - quote.purchasePrice
    : undefined;

const getQuoteDetails = (quote: SavedQuote): LclQuoteDetails => {
  const storedDetails = quote.payload.formState?.quoteDetails ?? {};

  return {
    customerName: toText(storedDetails.customerName) || quote.customerName,
    customerReference: toText(storedDetails.customerReference) || quote.customerReference,
    incoterms: toText(storedDetails.incoterms) || quote.incoterms,
    loadingAddress: toText(storedDetails.loadingAddress),
    loadingPlace: toText(storedDetails.loadingPlace) || quote.loadingPlace,
    note: toText(storedDetails.note),
    route: '',
    tffReference: toText(storedDetails.tffReference) || quote.tffReference,
    unloadingAddress: toText(storedDetails.unloadingAddress),
    unloadingPlace: toText(storedDetails.unloadingPlace) || quote.unloadingPlace,
    validity: toText(storedDetails.validity) || quote.validity,
  };
};

const getPalletLines = (quote: SavedQuote): LclQuotePalletLine[] =>
  (quote.payload.formState?.rows ?? []).map((row) => ({
    heightCm: toText(row.heightCm),
    lengthCm: toText(row.lengthCm),
    quantity: toText(row.quantity),
    type: toText(row.type),
    weightPerItemKg: toText(row.weightPerItemKg),
    widthCm: toText(row.widthCm),
  }));

const TrendTooltip = ({ active, label, payload }: { active?: boolean; label?: string; payload?: Array<{ value?: number }> }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="trend-tooltip">
      <strong>{label}</strong>
      <span>{formatCurrency(Number(payload[0]?.value) || 0)}</span>
    </div>
  );
};

const TrendChart = ({ data }: { data: Array<{ date: Date; value: number }> }) => {
  const hasRevenue = data.some((item) => item.value > 0);
  const chartData = data.map((item) => ({
    label: item.date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }),
    tooltipLabel: item.date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' }),
    value: item.value,
  }));

  return (
    <div className="dashboard-trend-wrap">
      {hasRevenue ? (
        <div aria-label="Omzettrend per dag" className="dashboard-trend-chart" role="img">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={chartData} margin={{ bottom: 0, left: 0, right: 4, top: 8 }}>
              <defs>
                <linearGradient id="dashboardRevenueGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#0084ca" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0084ca" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(178, 216, 239, 0.62)" strokeDasharray="3 6" vertical={false} />
              <XAxis axisLine={false} dataKey="label" interval={0} tick={{ fill: '#5f7387', fontSize: 10, fontWeight: 800 }} tickLine={false} />
              <Tooltip content={<TrendTooltip />} labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltipLabel ?? ''} />
              <Area
                dataKey="value"
                fill="url(#dashboardRevenueGradient)"
                stroke="#0084ca"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="dashboard-empty-state">Nog geen gewonnen omzet in deze periode.</div>
      )}
    </div>
  );
};

export function QuotesDashboard({ onOpenQuote }: QuotesDashboardProps) {
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [validityFilter, setValidityFilter] = useState<ValidityFilter>('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [openingQuoteId, setOpeningQuoteId] = useState('');
  const [duplicatingQuoteId, setDuplicatingQuoteId] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<SavedQuote | undefined>();
  const [editingStatusQuoteId, setEditingStatusQuoteId] = useState('');
  const [openMenuQuoteId, setOpenMenuQuoteId] = useState('');
  const [updatingQuoteId, setUpdatingQuoteId] = useState('');
  const [status, setStatus] = useState('Offertes laden...');
  const [error, setError] = useState('');

  const applyQueryToFilters = () => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status') ?? '';
    const mappedStatus = statusParam ? statusQueryMap[statusParam] ?? statusParam : '';
    const expiringWithin = params.get('expiringWithin');

    setStatusFilter(mappedStatus);
    setValidityFilter(expiringWithin === '7' ? 'soon' : (params.get('validity') as ValidityFilter) || '');
    setCustomerFilter(params.get('customer') ?? '');
    setCreatedByFilter(params.get('createdBy') ?? '');
    setDateFrom(params.get('dateFrom') ?? '');
    setDateTo(params.get('dateTo') ?? '');
    setSearchTerm(params.get('search') ?? '');
  };

  const setUrlFilters = (nextFilters: {
    createdBy?: string;
    customer?: string;
    dateFrom?: string;
    dateTo?: string;
    expiringWithin?: string;
    search?: string;
    status?: string;
    validity?: ValidityFilter;
  }) => {
    const params = new URLSearchParams();

    if (nextFilters.status) {
      params.set('status', statusToQueryValue(nextFilters.status));
    }

    if (nextFilters.expiringWithin) {
      params.set('expiringWithin', nextFilters.expiringWithin);
    }

    if (nextFilters.validity && !nextFilters.expiringWithin) {
      params.set('validity', nextFilters.validity);
    }

    if (nextFilters.dateFrom) {
      params.set('dateFrom', nextFilters.dateFrom);
    }

    if (nextFilters.dateTo) {
      params.set('dateTo', nextFilters.dateTo);
    }

    if (nextFilters.search) {
      params.set('search', nextFilters.search);
    }

    if (nextFilters.customer) {
      params.set('customer', nextFilters.customer);
    }

    if (nextFilters.createdBy) {
      params.set('createdBy', nextFilters.createdBy);
    }

    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.pushState({}, '', nextUrl);
    applyQueryToFilters();
  };

  const updateUrlFromCurrentFilters = (
    nextFilters: Partial<{
      createdByFilter: string;
      customerFilter: string;
      dateFrom: string;
      dateTo: string;
      searchTerm: string;
      statusFilter: string;
      validityFilter: ValidityFilter;
    }>,
  ) => {
    const nextStatusFilter = nextFilters.statusFilter ?? statusFilter;
    const nextValidityFilter = nextFilters.validityFilter ?? validityFilter;

    setUrlFilters({
      createdBy: nextFilters.createdByFilter ?? createdByFilter,
      customer: nextFilters.customerFilter ?? customerFilter,
      dateFrom: nextFilters.dateFrom ?? dateFrom,
      dateTo: nextFilters.dateTo ?? dateTo,
      expiringWithin: nextValidityFilter === 'soon' ? '7' : '',
      search: nextFilters.searchTerm ?? searchTerm,
      status: nextStatusFilter,
      validity: nextValidityFilter === 'soon' ? '' : nextValidityFilter,
    });
  };

  useEffect(() => {
    let isCurrent = true;
    setStatus('Offertes laden...');
    setError('');

    fetchSavedQuotes()
      .then((savedQuotes) => {
        if (!isCurrent) {
          return;
        }

        setQuotes(savedQuotes);
        setStatus(savedQuotes.length > 0 ? '' : 'Er zijn nog geen offertes opgeslagen.');
      })
      .catch((fetchError) => {
        if (!isCurrent) {
          return;
        }

        setStatus('');
        setError(fetchError instanceof Error ? fetchError.message : 'Offertes konden niet worden geladen.');
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    applyQueryToFilters();
    window.addEventListener('popstate', applyQueryToFilters);

    return () => {
      window.removeEventListener('popstate', applyQueryToFilters);
    };
  }, []);

  const customerOptions = useMemo(
    () => Array.from(new Set(quotes.map((quote) => quote.customerName).filter(Boolean))).sort(),
    [quotes],
  );
  const createdByOptions = useMemo(
    () => Array.from(new Set(quotes.map((quote) => formatDisplayName(quote.createdByLabel)).filter(Boolean))).sort(),
    [quotes],
  );

  const kpis = useMemo(() => {
    const pipelineQuotes = quotes.filter((quote) => {
      const validityInfo = getQuoteValidityInfo(quote.validUntil || quote.validity, quote.status);

      return validityInfo.effectiveStatus !== 'Gewonnen' && validityInfo.effectiveStatus !== 'Verloren' && validityInfo.effectiveStatus !== 'Verlopen';
    });
    const wonThisMonth = quotes.filter((quote) => quote.status === 'Gewonnen' && isInCurrentMonth(quote.statusUpdatedAt));
    const lostThisMonth = quotes.filter((quote) => quote.status === 'Verloren' && isInCurrentMonth(quote.statusUpdatedAt));
    const decidedThisMonth = wonThisMonth.length + lostThisMonth.length;
    const conversion = decidedThisMonth > 0 ? (wonThisMonth.length / decidedThisMonth) * 100 : 0;
    const pipelineValue = pipelineQuotes.reduce((total, quote) => total + quote.salesPrice, 0);
    const recentQuoteTrend = buildDailySeries(quotes, (quote) => quote.createdAt, () => 1);
    const wonTrend = buildDailySeries(
      quotes.filter((quote) => quote.status === 'Gewonnen'),
      (quote) => quote.statusUpdatedAt,
      () => 1,
    );
    const lostTrend = buildDailySeries(
      quotes.filter((quote) => quote.status === 'Verloren'),
      (quote) => quote.statusUpdatedAt,
      () => 1,
    );
    const pipelineTrend = buildDailySeries(pipelineQuotes, (quote) => quote.createdAt, (quote) => quote.salesPrice);
    const wonRevenueTrend = buildDailyRevenueSeries(quotes);
    const previousWonRevenueTrend = buildDailyRevenueSeries(quotes, trendDays);
    const wonRevenueTotal = wonRevenueTrend.reduce((total, item) => total + item.value, 0);
    const previousWonRevenueTotal = previousWonRevenueTrend.reduce((total, item) => total + item.value, 0);
    const revenueChange =
      previousWonRevenueTotal > 0
        ? ((wonRevenueTotal - previousWonRevenueTotal) / previousWonRevenueTotal) * 100
        : wonRevenueTotal > 0
          ? 100
          : 0;
    const expiringSoonQuotes = pipelineQuotes
      .filter((quote) => {
        const validityInfo = getQuoteValidityInfo(quote.validUntil || quote.validity, quote.status);

        return validityInfo.hasDate && validityInfo.daysUntilExpiry !== undefined && validityInfo.daysUntilExpiry >= 0 && validityInfo.daysUntilExpiry <= 7;
      })
      .sort((first, second) => {
        const firstDate = getDateInputValue(first.validUntil || first.validity) || '9999-12-31';
        const secondDate = getDateInputValue(second.validUntil || second.validity) || '9999-12-31';

        return firstDate.localeCompare(secondDate);
      });
    const largestOpenQuote = [...pipelineQuotes].sort((first, second) => second.salesPrice - first.salesPrice)[0];
    const recentActivity = quotes
      .map(getActivity)
      .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
      .slice(0, 3);

    return {
      conversion,
      expiringSoonQuotes,
      largestOpenQuote,
      lostThisMonth: lostThisMonth.length,
      lostTrend,
      openCount: pipelineQuotes.length,
      pipelineValue,
      pipelineTrend,
      previousWonRevenueTotal,
      recentActivity,
      recentQuoteTrend,
      revenueChange,
      wonThisMonth: wonThisMonth.length,
      wonRevenueTotal,
      wonRevenueTrend,
      wonTrend,
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    const normalizedSearch = normalize(searchTerm);
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : undefined;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : undefined;

    return quotes
      .filter((quote) => {
        const route = getRouteParts(quote);
        const createdDate = new Date(quote.createdAt);
        const createdBy = formatDisplayName(quote.createdByLabel);
        const validityInfo = getQuoteValidityInfo(quote.validUntil || quote.validity, quote.status);
        const isPipelineQuote =
          validityInfo.effectiveStatus !== 'Gewonnen' && validityInfo.effectiveStatus !== 'Verloren' && validityInfo.effectiveStatus !== 'Verlopen';
        const matchesValidity =
          !validityFilter ||
          (validityFilter === 'valid' && validityInfo.hasDate && validityInfo.daysUntilExpiry !== undefined && validityInfo.daysUntilExpiry >= 0) ||
          (validityFilter === 'soon' &&
            validityInfo.hasDate &&
            validityInfo.daysUntilExpiry !== undefined &&
            validityInfo.daysUntilExpiry >= 0 &&
            validityInfo.daysUntilExpiry <= 7) ||
          (validityFilter === 'expired' && validityInfo.effectiveStatus === 'Verlopen');

        const matchesSearch =
          !normalizedSearch ||
          [
            quote.quoteNumber,
            quote.customerName,
            quote.customerReference,
            quote.tffReference,
            quote.loadingPlace,
            quote.unloadingPlace,
            route.from,
            route.to,
            route.via,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch);

        return (
          matchesSearch &&
          (!statusFilter || (statusFilter === 'pipeline' ? isPipelineQuote : validityInfo.effectiveStatus === statusFilter)) &&
          (!customerFilter || quote.customerName === customerFilter) &&
          (!createdByFilter || createdBy === createdByFilter) &&
          (!fromDate || createdDate >= fromDate) &&
          (!toDate || createdDate <= toDate) &&
          matchesValidity
        );
      })
      .sort((first, second) => {
        const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
        const firstValidity = getDateInputValue(first.validUntil || first.validity);
        const secondValidity = getDateInputValue(second.validUntil || second.validity);
        const firstValue =
          sortKey === 'salesPrice'
            ? first.salesPrice
            : sortKey === 'margin'
              ? getQuoteMargin(first) ?? 0
            : sortKey === 'validUntil'
              ? firstValidity || '9999-12-31'
            : sortKey === 'createdAt'
              ? new Date(first.createdAt).getTime()
            : sortKey === 'status'
              ? getQuoteValidityInfo(first.validUntil || first.validity, first.status).effectiveStatus
              : first[sortKey];
        const secondValue =
          sortKey === 'salesPrice'
            ? second.salesPrice
            : sortKey === 'margin'
              ? getQuoteMargin(second) ?? 0
            : sortKey === 'validUntil'
              ? secondValidity || '9999-12-31'
            : sortKey === 'createdAt'
              ? new Date(second.createdAt).getTime()
            : sortKey === 'status'
              ? getQuoteValidityInfo(second.validUntil || second.validity, second.status).effectiveStatus
              : second[sortKey];

        if (typeof firstValue === 'number' && typeof secondValue === 'number') {
          return (firstValue - secondValue) * directionMultiplier;
        }

        return String(firstValue).localeCompare(String(secondValue), 'nl-NL') * directionMultiplier;
      });
  }, [createdByFilter, customerFilter, dateFrom, dateTo, quotes, searchTerm, sortDirection, sortKey, statusFilter, validityFilter]);

  const resetFilters = () => {
    setUrlFilters({});
  };

  const updateSort = (nextSortKey: SortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === 'createdAt' ? 'desc' : 'asc');
  };

  const handleDeleteQuote = async (quote: SavedQuote) => {
    setError('');
    setStatus('');

    try {
      await deleteSavedQuote(quote.id);
      setQuotes((currentQuotes) => currentQuotes.filter((currentQuote) => currentQuote.id !== quote.id));
      setStatus('Offerte verwijderd.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Offerte kon niet worden verwijderd.');
    } finally {
      setDeleteCandidate(undefined);
    }
  };

  const handleStatusChange = async (quote: SavedQuote, nextStatus: QuoteStatus) => {
    setError('');
    setStatus('');
    setUpdatingQuoteId(quote.id);

    try {
      const { statusUpdatedAt } = await updateSavedQuoteStatus(quote.id, nextStatus);
      setQuotes((currentQuotes) =>
        currentQuotes.map((currentQuote) =>
          currentQuote.id === quote.id
            ? {
                ...currentQuote,
                status: nextStatus,
                statusUpdatedAt,
              }
            : currentQuote,
        ),
      );
      setEditingStatusQuoteId('');
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Status kon niet worden bijgewerkt.');
    } finally {
      setUpdatingQuoteId('');
    }
  };

  const handleOpenQuote = async (quote: SavedQuote) => {
    setError('');
    setStatus('');
    setOpeningQuoteId(quote.id);

    try {
      const fullQuote = await fetchSavedQuote(quote.id);
      onOpenQuote(fullQuote);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Offerte kon niet worden geopend.');
    } finally {
      setOpeningQuoteId('');
    }
  };

  const handleDuplicateQuote = async (quote: SavedQuote) => {
    setError('');
    setStatus('');
    setOpenMenuQuoteId('');
    setDuplicatingQuoteId(quote.id);

    try {
      const duplicatedQuote = await duplicateSavedQuote(quote.id);
      const fullQuote = await fetchSavedQuote(duplicatedQuote.id);
      onOpenQuote(fullQuote);
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : 'Offerte kon niet worden gedupliceerd.');
    } finally {
      setDuplicatingQuoteId('');
    }
  };

  const handleCreatePdf = (quote: SavedQuote) => {
    setOpenMenuQuoteId('');

    if (quote.mode !== 'lcl') {
      window.alert('PDF maken is op dit moment alleen beschikbaar voor LCL-offertes.');
      return;
    }

    generateLclQuotePdf({
      details: getQuoteDetails(quote),
      direction: quote.direction,
      language: 'nl',
      loadMeters: `${formatNumber(Number(quote.payload.loadMeters) || 0)} ldm`,
      logoUrl: tffLogo,
      palletLines: getPalletLines(quote),
      quoteNumber: quote.quoteNumber,
      salesPrice: formatCurrency(quote.salesPrice),
    });
  };

  const renderSortableHeader = (label: string, nextSortKey: SortKey) => (
    <button className="table-sort-button" onClick={() => updateSort(nextSortKey)} type="button">
      {label}
      {sortKey === nextSortKey ? <span>{sortDirection === 'asc' ? '↑' : '↓'}</span> : null}
    </button>
  );

  const monthRange = getCurrentMonthRange();
  const revenueTrendTone = kpis.revenueChange > 0 ? 'positive' : kpis.revenueChange < 0 ? 'negative' : 'neutral';
  const routeForLargestQuote = kpis.largestOpenQuote ? getRouteParts(kpis.largestOpenQuote) : undefined;

  return (
    <section className="dashboard-page">
      <div className="dashboard-title-row">
        <div>
          <h1>Dashboard</h1>
          <p>Overzicht van al je offertes en prestaties.</p>
        </div>
      </div>

      <div className="dashboard-kpis" aria-label="Offerte statistieken">
        <StatisticCard
          accent="blue"
          ariaLabel="Filter op open offertes"
          icon={<svg height="24" viewBox="0 0 24 24" width="24"><path d="M7 3h7l5 5v13H7V3Zm7 1.8V9h4.2L14 4.8ZM9 13h8v2H9v-2Zm0 4h6v2H9v-2Z" fill="currentColor" /></svg>}
          label="Open offertes"
          onClick={() => setUrlFilters({ status: 'pipeline' })}
          sparkline={kpis.recentQuoteTrend}
          value={String(kpis.openCount)}
        />
        <StatisticCard
          accent="green"
          ariaLabel="Filter op gewonnen offertes van deze maand"
          icon={<svg height="24" viewBox="0 0 24 24" width="24"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm-1 14.5-3.5-3.5L9 11.5l2 2 4.5-4.5L17 10.5l-6 6Z" fill="currentColor" /></svg>}
          label="Gewonnen deze maand"
          onClick={() => setUrlFilters({ dateFrom: monthRange.start, dateTo: monthRange.end, status: 'Gewonnen' })}
          sparkline={kpis.wonTrend}
          value={String(kpis.wonThisMonth)}
        />
        <StatisticCard
          accent="red"
          ariaLabel="Filter op verloren offertes van deze maand"
          icon={<svg height="24" viewBox="0 0 24 24" width="24"><path d="M11 3h2v11h-2V3Zm0 14h2v4h-2v-4ZM5 5h4v2H7v10h2v2H5V5Zm10 0h4v14h-4v-2h2V7h-2V5Z" fill="currentColor" /></svg>}
          label="Verloren deze maand"
          onClick={() => setUrlFilters({ dateFrom: monthRange.start, dateTo: monthRange.end, status: 'Verloren' })}
          sparkline={kpis.lostTrend}
          value={String(kpis.lostThisMonth)}
        />
        <StatisticCard
          accent="purple"
          ariaLabel="Bekijk conversie-inzicht"
          icon={<svg height="24" viewBox="0 0 24 24" width="24"><path d="M13 2v9h9a10 10 0 1 1-9-9Zm2 2.3V9h4.7A8.1 8.1 0 0 0 15 4.3Z" fill="currentColor" /></svg>}
          label="Conversie"
          onClick={() => document.querySelector('.dashboard-insights')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          sparkline={[kpis.lostThisMonth, kpis.wonThisMonth, kpis.conversion]}
          value={`${kpis.conversion.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}%`}
        />
        <StatisticCard
          accent="orange"
          ariaLabel="Filter op omzet in pijplijn"
          icon={<svg height="24" viewBox="0 0 24 24" width="24"><path d="M12 3 4 7v6c0 4.5 3.4 7.5 8 8 4.6-.5 8-3.5 8-8V7l-8-4Zm0 4a3 3 0 0 1 3 3h-2a1 1 0 1 0-1 1 3 3 0 1 1-3 3h2a1 1 0 1 0 1-1 3 3 0 0 1 0-6Z" fill="currentColor" /></svg>}
          label="Omzet in pijplijn"
          onClick={() => setUrlFilters({ status: 'pipeline' })}
          sparkline={kpis.pipelineTrend}
          subValue={`${kpis.openCount} ${kpis.openCount === 1 ? 'offerte' : 'offertes'}`}
          value={formatCurrency(kpis.pipelineValue)}
        />
      </div>

      <div className="dashboard-insights" aria-label="Dashboard inzichten">
        <article className="insight-card insight-card-wide">
          <div className="insight-card-header">
            <div>
              <span>Omzet laatste {trendDays} dagen</span>
              <strong>{formatCurrency(kpis.wonRevenueTotal)}</strong>
            </div>
            <small className={`trend-change trend-${revenueTrendTone}`}>
              {kpis.previousWonRevenueTotal === 0 && kpis.wonRevenueTotal === 0
                ? 'Geen vergelijking beschikbaar'
                : `${kpis.revenueChange >= 0 ? '+' : ''}${kpis.revenueChange.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}% t.o.v. vorige periode`}
            </small>
          </div>
          <TrendChart data={kpis.wonRevenueTrend} />
          <button
            className="insight-link"
            onClick={() => setUrlFilters({ dateFrom: monthRange.start, dateTo: monthRange.end, status: 'Gewonnen' })}
            type="button"
          >
            Bekijk gewonnen offertes
            <span aria-hidden="true">→</span>
          </button>
        </article>

        <article className="insight-card insight-warning">
          <div className="insight-accent insight-accent-orange" aria-hidden="true">
            <svg height="18" viewBox="0 0 24 24" width="18">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 11h5v-2h-4V6h-2v7Z" fill="currentColor" />
            </svg>
          </div>
          <span>Verloopt binnen 7 dagen</span>
          <strong>{kpis.expiringSoonQuotes.length}</strong>
          <div className="urgent-list">
            {kpis.expiringSoonQuotes.length > 0 ? (
              kpis.expiringSoonQuotes.slice(0, 3).map((quote) => {
                const validityInfo = getQuoteValidityInfo(quote.validUntil || quote.validity, quote.status);
                const urgencyClass =
                  validityInfo.daysUntilExpiry === 0 ? 'urgent-today' : validityInfo.daysUntilExpiry === 1 ? 'urgent-tomorrow' : 'urgent-soon';

                return (
                  <button
                    aria-label={`Open offerte ${quote.quoteNumber} van ${quote.customerName}`}
                    className={`urgent-row ${urgencyClass}`}
                    key={quote.id}
                    onClick={() => void handleOpenQuote(quote)}
                    type="button"
                  >
                    <span>
                      <strong>{quote.quoteNumber}</strong>
                      <small>{quote.customerName || 'Onbekende klant'}</small>
                    </span>
                    <span>
                      <strong>{formatValidUntil(quote.validUntil || quote.validity)}</strong>
                      <small>{getRelativeExpiryLabel(validityInfo.daysUntilExpiry)}</small>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="dashboard-empty-state">Geen offertes die binnen 7 dagen verlopen.</div>
            )}
          </div>
          <button className="insight-link" onClick={() => setUrlFilters({ expiringWithin: '7' })} type="button">
            Bekijk alle aflopende offertes
            <span aria-hidden="true">→</span>
          </button>
          <small>
            {kpis.expiringSoonQuotes[0]
              ? `${kpis.expiringSoonQuotes[0].quoteNumber} · ${formatValidUntil(kpis.expiringSoonQuotes[0].validUntil || kpis.expiringSoonQuotes[0].validity)}`
              : 'Geen urgente offertes'}
          </small>
        </article>

        {kpis.largestOpenQuote ? (
          <button
            aria-label={`Open grootste offerte ${kpis.largestOpenQuote.quoteNumber}`}
            className="insight-card largest-quote-card interactive-insight"
            onClick={() => void handleOpenQuote(kpis.largestOpenQuote)}
            type="button"
          >
          <div className="insight-accent insight-accent-blue" aria-hidden="true">
            <svg height="18" viewBox="0 0 24 24" width="18">
              <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Zm-4 8 4 2 4-2v4l-4 2-4-2v-4Z" fill="currentColor" />
            </svg>
          </div>
          <span className="card-arrow" aria-hidden="true">→</span>
          <span>Grootste open offerte</span>
          <strong>{kpis.largestOpenQuote.quoteNumber}</strong>
          <small>{kpis.largestOpenQuote.customerName || 'Onbekende klant'}</small>
          <div className="largest-quote-meta">
            <span>{routeForLargestQuote ? `${routeForLargestQuote.from} → ${routeForLargestQuote.to}` : '-'}</span>
            <span>{formatCurrency(kpis.largestOpenQuote.salesPrice)}</span>
            <span>Marge {getQuoteMargin(kpis.largestOpenQuote) === undefined ? '-' : formatCurrency(getQuoteMargin(kpis.largestOpenQuote) ?? 0)}</span>
            <span>{formatValidUntil(kpis.largestOpenQuote.validUntil || kpis.largestOpenQuote.validity)}</span>
          </div>
          <span className={`quote-status-badge status-${kpis.largestOpenQuote.status.toLowerCase().replace(/\s+/g, '-')}`}>
            {kpis.largestOpenQuote.status}
          </span>
          </button>
        ) : (
          <article className="insight-card">
            <div className="insight-accent insight-accent-blue" aria-hidden="true">
              <svg height="18" viewBox="0 0 24 24" width="18">
                <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Zm-4 8 4 2 4-2v4l-4 2-4-2v-4Z" fill="currentColor" />
              </svg>
            </div>
            <span>Grootste open offerte</span>
            <div className="dashboard-empty-state">Geen open offertes beschikbaar.</div>
          </article>
        )}

        <article className="insight-card insight-activity">
          <div className="insight-card-header">
            <div>
              <span>Laatste activiteit</span>
              <strong>{kpis.recentActivity.length}</strong>
            </div>
          </div>
          <div className="activity-list">
            {kpis.recentActivity.length > 0 ? (
              kpis.recentActivity.map((activity) => (
                <button
                  aria-label={`Open ${activity.quote.quoteNumber}, ${activity.action}`}
                  className="activity-row"
                  key={`${activity.quote.id}-${activity.date}`}
                  onClick={() => void handleOpenQuote(activity.quote)}
                  type="button"
                >
                  <span>{new Date(activity.date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}</span>
                  <strong>{activity.action}</strong>
                  <small>
                    {activity.quote.quoteNumber} · {activity.customerName}
                  </small>
                  <span className="activity-chevron" aria-hidden="true">›</span>
                </button>
              ))
            ) : (
              <div className="dashboard-empty-state">Nog geen recente activiteit.</div>
            )}
          </div>
        </article>
      </div>

      <div className="dashboard-filters">
        <label className="field" htmlFor="quote-search">
          <span>Zoeken</span>
          <input
            id="quote-search"
            onChange={(event) => updateUrlFromCurrentFilters({ searchTerm: event.target.value })}
            placeholder="Offerte, klant, referentie, haven..."
            type="text"
            value={searchTerm}
          />
        </label>
        <label className="field" htmlFor="quote-status-filter">
          <span>Status</span>
          <select id="quote-status-filter" onChange={(event) => updateUrlFromCurrentFilters({ statusFilter: event.target.value })} value={statusFilter}>
            <option value="">Alle statussen</option>
            <option value="pipeline">Open pijplijn</option>
            {quoteStatuses.map((quoteStatus) => (
              <option key={quoteStatus} value={quoteStatus}>
                {quoteStatus}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="quote-customer-filter">
          <span>Klant</span>
          <select id="quote-customer-filter" onChange={(event) => updateUrlFromCurrentFilters({ customerFilter: event.target.value })} value={customerFilter}>
            <option value="">Alle klanten</option>
            {customerOptions.map((customer) => (
              <option key={customer} value={customer}>
                {customer}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="quote-validity-filter">
          <span>Geldigheid</span>
          <select
            id="quote-validity-filter"
            onChange={(event) => updateUrlFromCurrentFilters({ validityFilter: event.target.value as ValidityFilter })}
            value={validityFilter}
          >
            <option value="">Alle offertes</option>
            <option value="valid">Nog geldig</option>
            <option value="soon">Verloopt binnen 7 dagen</option>
            <option value="expired">Verlopen</option>
          </select>
        </label>
        <label className="field" htmlFor="quote-created-by-filter">
          <span>Gemaakt door</span>
          <select id="quote-created-by-filter" onChange={(event) => updateUrlFromCurrentFilters({ createdByFilter: event.target.value })} value={createdByFilter}>
            <option value="">Iedereen</option>
            {createdByOptions.map((createdBy) => (
              <option key={createdBy} value={createdBy}>
                {createdBy}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="quote-date-from">
          <span>Datum vanaf</span>
          <input id="quote-date-from" onChange={(event) => updateUrlFromCurrentFilters({ dateFrom: event.target.value })} type="date" value={dateFrom} />
        </label>
        <label className="field" htmlFor="quote-date-to">
          <span>Datum tot</span>
          <input id="quote-date-to" onChange={(event) => updateUrlFromCurrentFilters({ dateTo: event.target.value })} type="date" value={dateTo} />
        </label>
        <button className="filters-clear-button" onClick={resetFilters} type="button">
          Filters wissen
        </button>
      </div>

      {status ? <p className="settings-status">{status}</p> : null}
      {error ? <p className="settings-error">{error}</p> : null}

      {!status && quotes.length > 0 ? (
        <p className="dashboard-result-count">
          {filteredQuotes.length === 0
            ? 'Geen offertes gevonden'
            : `${filteredQuotes.length} ${filteredQuotes.length === 1 ? 'offerte' : 'offertes'} gevonden`}
        </p>
      ) : null}

      <div className="quotes-table-wrap">
        <table className="quotes-table">
          <thead>
            <tr>
              <th>{renderSortableHeader('Offertenummer', 'quoteNumber')}</th>
              <th>{renderSortableHeader('Klant', 'customerName')}</th>
              <th>Traject</th>
              <th>Incoterm</th>
              <th>{renderSortableHeader('Verkoopprijs', 'salesPrice')}</th>
              <th>{renderSortableHeader('Marge', 'margin')}</th>
              <th>{renderSortableHeader('Status', 'status')}</th>
              <th>Gemaakt door</th>
              <th>{renderSortableHeader('Geldig t/m', 'validUntil')}</th>
              <th>{renderSortableHeader('Datum', 'createdAt')}</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map((quote) => {
              const route = getRouteParts(quote);
              const margin = getQuoteMargin(quote);
              const validityInfo = getQuoteValidityInfo(quote.validUntil || quote.validity, quote.status);
              const effectiveStatus = validityInfo.effectiveStatus as QuoteStatus;

              return (
                <tr key={quote.id}>
                  <td>
                    <strong>{quote.quoteNumber}</strong>
                    {quote.tffReference ? <span>{quote.tffReference}</span> : null}
                  </td>
                  <td>
                    <strong>{quote.customerName}</strong>
                    {quote.customerReference ? <span>{quote.customerReference}</span> : null}
                  </td>
                  <td>
                    <strong>
                      {route.from} → {route.to}
                    </strong>
                    {route.via ? <span>via {route.via}</span> : null}
                  </td>
                  <td>{quote.incoterms}</td>
                  <td>
                    <strong>{formatCurrency(quote.salesPrice)}</strong>
                  </td>
                  <td>
                    <strong>{margin === undefined ? '-' : formatCurrency(margin)}</strong>
                  </td>
                  <td>
                    <div className="status-cell compact">
                      <span className={`quote-status-badge status-${effectiveStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                        {effectiveStatus}
                      </span>
                      {editingStatusQuoteId === quote.id ? (
                        <select
                          aria-label={`Status wijzigen voor ${quote.quoteNumber}`}
                          disabled={updatingQuoteId === quote.id}
                          onChange={(event) => void handleStatusChange(quote, event.target.value as QuoteStatus)}
                          value={quote.status}
                        >
                          {quoteStatuses.map((quoteStatus) => (
                            <option key={quoteStatus} value={quoteStatus}>
                              {quoteStatus}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  </td>
                  <td>{formatDisplayName(quote.createdByLabel)}</td>
                  <td>
                    <div className={`validity-cell validity-${validityInfo.tone}`}>
                      <strong>{formatValidUntil(quote.validUntil || quote.validity)}</strong>
                      {validityInfo.message ? <span>{validityInfo.isAutoExpired ? 'Deze offerte is verlopen' : validityInfo.message}</span> : null}
                    </div>
                  </td>
                  <td>{new Date(quote.createdAt).toLocaleDateString('nl-NL')}</td>
                  <td>
                    <div className="quote-actions">
                      <button disabled={openingQuoteId === quote.id} onClick={() => void handleOpenQuote(quote)} type="button">
                        {openingQuoteId === quote.id ? 'Openen...' : 'Openen'}
                      </button>
                      <button
                        aria-label={`Offerte ${quote.quoteNumber} verwijderen`}
                        className="icon-action danger"
                        onClick={() => setDeleteCandidate(quote)}
                        title="Verwijderen"
                        type="button"
                      >
                        <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
                          <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 9h10l-1 12H8L7 9Z" fill="currentColor" />
                        </svg>
                      </button>
                      <div className="quote-menu">
                        <button
                          aria-expanded={openMenuQuoteId === quote.id}
                          aria-label={`Meer acties voor ${quote.quoteNumber}`}
                          className="icon-action"
                          onClick={() => setOpenMenuQuoteId((currentId) => (currentId === quote.id ? '' : quote.id))}
                          title="Meer acties"
                          type="button"
                        >
                          ...
                        </button>
                        {openMenuQuoteId === quote.id ? (
                          <div className="quote-menu-popover">
                            <button
                              onClick={() => {
                                setEditingStatusQuoteId(quote.id);
                                setOpenMenuQuoteId('');
                              }}
                              type="button"
                            >
                              Status wijzigen
                            </button>
                            <button
                              disabled={duplicatingQuoteId === quote.id}
                              onClick={() => void handleDuplicateQuote(quote)}
                              type="button"
                            >
                              {duplicatingQuoteId === quote.id ? 'Dupliceren...' : 'Dupliceren'}
                            </button>
                            <button onClick={() => handleCreatePdf(quote)} type="button">
                              PDF maken
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!status && quotes.length === 0 ? <p className="dashboard-empty">Er zijn nog geen offertes opgeslagen.</p> : null}
      {!status && quotes.length > 0 && filteredQuotes.length === 0 ? <p className="dashboard-empty">Geen offertes gevonden.</p> : null}
      {deleteCandidate ? (
        <div className="modal-backdrop" role="presentation">
          <div aria-modal="true" className="confirm-dialog" role="dialog">
            <h3>Offerte verwijderen</h3>
            <p>Weet je zeker dat je deze offerte wilt verwijderen?</p>
            <div className="confirm-actions">
              <button onClick={() => setDeleteCandidate(undefined)} type="button">
                Annuleren
              </button>
              <button className="danger" onClick={() => void handleDeleteQuote(deleteCandidate)} type="button">
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
