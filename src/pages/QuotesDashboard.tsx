import { useEffect, useMemo, useState } from 'react';
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

const TrendChart = ({ values }: { values: number[] }) => {
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 100 - (value / max) * 84 - 8;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <svg aria-hidden="true" className="dashboard-trend-chart" preserveAspectRatio="none" viewBox="0 0 100 100">
      <polygon points={areaPoints} />
      <polyline points={points} />
    </svg>
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
    const recentActivity = [...quotes]
      .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
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
      recentActivity,
      recentQuoteTrend,
      wonThisMonth: wonThisMonth.length,
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
        const matchesValidity =
          !validityFilter ||
          (validityFilter === 'valid' && validityInfo.hasDate && validityInfo.daysUntilExpiry !== undefined && validityInfo.daysUntilExpiry >= 0) ||
          (validityFilter === 'soon' &&
            validityInfo.hasDate &&
            validityInfo.daysUntilExpiry !== undefined &&
            validityInfo.daysUntilExpiry >= 0 &&
            validityInfo.daysUntilExpiry <= 3) ||
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
          (!statusFilter || validityInfo.effectiveStatus === statusFilter) &&
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
    setSearchTerm('');
    setStatusFilter('');
    setValidityFilter('');
    setCustomerFilter('');
    setCreatedByFilter('');
    setDateFrom('');
    setDateTo('');
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
          icon={<svg height="24" viewBox="0 0 24 24" width="24"><path d="M7 3h7l5 5v13H7V3Zm7 1.8V9h4.2L14 4.8ZM9 13h8v2H9v-2Zm0 4h6v2H9v-2Z" fill="currentColor" /></svg>}
          label="Open offertes"
          sparkline={kpis.recentQuoteTrend}
          value={String(kpis.openCount)}
        />
        <StatisticCard
          accent="green"
          icon={<svg height="24" viewBox="0 0 24 24" width="24"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm-1 14.5-3.5-3.5L9 11.5l2 2 4.5-4.5L17 10.5l-6 6Z" fill="currentColor" /></svg>}
          label="Gewonnen deze maand"
          sparkline={kpis.wonTrend}
          value={String(kpis.wonThisMonth)}
        />
        <StatisticCard
          accent="red"
          icon={<svg height="24" viewBox="0 0 24 24" width="24"><path d="M11 3h2v11h-2V3Zm0 14h2v4h-2v-4ZM5 5h4v2H7v10h2v2H5V5Zm10 0h4v14h-4v-2h2V7h-2V5Z" fill="currentColor" /></svg>}
          label="Verloren deze maand"
          sparkline={kpis.lostTrend}
          value={String(kpis.lostThisMonth)}
        />
        <StatisticCard
          accent="purple"
          icon={<svg height="24" viewBox="0 0 24 24" width="24"><path d="M13 2v9h9a10 10 0 1 1-9-9Zm2 2.3V9h4.7A8.1 8.1 0 0 0 15 4.3Z" fill="currentColor" /></svg>}
          label="Conversie"
          sparkline={[kpis.lostThisMonth, kpis.wonThisMonth, kpis.conversion]}
          value={`${kpis.conversion.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}%`}
        />
        <StatisticCard
          accent="orange"
          icon={<svg height="24" viewBox="0 0 24 24" width="24"><path d="M12 3 4 7v6c0 4.5 3.4 7.5 8 8 4.6-.5 8-3.5 8-8V7l-8-4Zm0 4a3 3 0 0 1 3 3h-2a1 1 0 1 0-1 1 3 3 0 1 1-3 3h2a1 1 0 1 0 1-1 3 3 0 0 1 0-6Z" fill="currentColor" /></svg>}
          label="Omzet in pijplijn"
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
              <strong>{formatCurrency(kpis.pipelineTrend.reduce((total, value) => total + value, 0))}</strong>
            </div>
            <small>Gebaseerd op open offertewaarde per aanmaakdag</small>
          </div>
          <TrendChart values={kpis.pipelineTrend} />
        </article>

        <article className="insight-card">
          <div className="insight-accent insight-accent-orange" aria-hidden="true">
            <svg height="18" viewBox="0 0 24 24" width="18">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 11h5v-2h-4V6h-2v7Z" fill="currentColor" />
            </svg>
          </div>
          <span>Verloopt binnen 7 dagen</span>
          <strong>{kpis.expiringSoonQuotes.length}</strong>
          <small>
            {kpis.expiringSoonQuotes[0]
              ? `${kpis.expiringSoonQuotes[0].quoteNumber} · ${formatValidUntil(kpis.expiringSoonQuotes[0].validUntil || kpis.expiringSoonQuotes[0].validity)}`
              : 'Geen urgente offertes'}
          </small>
        </article>

        <article className="insight-card">
          <div className="insight-accent insight-accent-blue" aria-hidden="true">
            <svg height="18" viewBox="0 0 24 24" width="18">
              <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Zm-4 8 4 2 4-2v4l-4 2-4-2v-4Z" fill="currentColor" />
            </svg>
          </div>
          <span>Grootste open offerte</span>
          <strong>{kpis.largestOpenQuote ? kpis.largestOpenQuote.quoteNumber : '-'}</strong>
          <small>{kpis.largestOpenQuote ? formatCurrency(kpis.largestOpenQuote.salesPrice) : 'Nog geen open waarde'}</small>
        </article>

        <article className="insight-card insight-activity">
          <div className="insight-card-header">
            <div>
              <span>Laatste activiteit</span>
              <strong>{kpis.recentActivity.length}</strong>
            </div>
          </div>
          <div className="activity-list">
            {kpis.recentActivity.length > 0 ? (
              kpis.recentActivity.map((quote) => (
                <div className="activity-row" key={quote.id}>
                  <span>{new Date(quote.createdAt).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}</span>
                  <strong>{quote.quoteNumber}</strong>
                  <small>{quote.customerName || 'Onbekende klant'}</small>
                </div>
              ))
            ) : (
              <p>Geen recente activiteit.</p>
            )}
          </div>
        </article>
      </div>

      <div className="dashboard-filters">
        <label className="field" htmlFor="quote-search">
          <span>Zoeken</span>
          <input
            id="quote-search"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Offerte, klant, referentie, haven..."
            type="text"
            value={searchTerm}
          />
        </label>
        <label className="field" htmlFor="quote-status-filter">
          <span>Status</span>
          <select id="quote-status-filter" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="">Alle statussen</option>
            {quoteStatuses.map((quoteStatus) => (
              <option key={quoteStatus} value={quoteStatus}>
                {quoteStatus}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="quote-customer-filter">
          <span>Klant</span>
          <select id="quote-customer-filter" onChange={(event) => setCustomerFilter(event.target.value)} value={customerFilter}>
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
            onChange={(event) => setValidityFilter(event.target.value as ValidityFilter)}
            value={validityFilter}
          >
            <option value="">Alle offertes</option>
            <option value="valid">Nog geldig</option>
            <option value="soon">Verloopt binnen 3 dagen</option>
            <option value="expired">Verlopen</option>
          </select>
        </label>
        <label className="field" htmlFor="quote-created-by-filter">
          <span>Gemaakt door</span>
          <select id="quote-created-by-filter" onChange={(event) => setCreatedByFilter(event.target.value)} value={createdByFilter}>
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
          <input id="quote-date-from" onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} />
        </label>
        <label className="field" htmlFor="quote-date-to">
          <span>Datum tot</span>
          <input id="quote-date-to" onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} />
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
