import { useEffect, useMemo, useState } from 'react';
import {
  deleteSavedQuote,
  fetchSavedQuote,
  fetchSavedQuotes,
  updateSavedQuoteStatus,
  type QuoteStatus,
  type SavedQuote,
} from '../services/quoteService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDisplayName } from '../utils/formatDisplayName';

type QuotesDashboardProps = {
  onOpenQuote: (quote: SavedQuote) => void;
};

type SortKey = 'quoteNumber' | 'customerName' | 'salesPrice' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const quoteStatuses: QuoteStatus[] = [
  'Concept',
  'Open',
  'Verzonden',
  'In behandeling',
  'Gewonnen',
  'Verloren',
  'Verlopen',
];

const openStatuses = new Set<QuoteStatus>(['Open', 'Verzonden', 'In behandeling']);

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

export function QuotesDashboard({ onOpenQuote }: QuotesDashboardProps) {
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [openingQuoteId, setOpeningQuoteId] = useState('');
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
    const openQuotes = quotes.filter((quote) => openStatuses.has(quote.status));
    const wonThisMonth = quotes.filter((quote) => quote.status === 'Gewonnen' && isInCurrentMonth(quote.statusUpdatedAt));
    const lostThisMonth = quotes.filter((quote) => quote.status === 'Verloren' && isInCurrentMonth(quote.statusUpdatedAt));
    const decidedThisMonth = wonThisMonth.length + lostThisMonth.length;
    const conversion = decidedThisMonth > 0 ? (wonThisMonth.length / decidedThisMonth) * 100 : 0;
    const openSalesValue = openQuotes.reduce((total, quote) => total + quote.salesPrice, 0);

    return {
      conversion,
      lostThisMonth: lostThisMonth.length,
      openCount: openQuotes.length,
      openSalesValue,
      wonThisMonth: wonThisMonth.length,
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
          (!statusFilter || quote.status === statusFilter) &&
          (!customerFilter || quote.customerName === customerFilter) &&
          (!createdByFilter || createdBy === createdByFilter) &&
          (!fromDate || createdDate >= fromDate) &&
          (!toDate || createdDate <= toDate)
        );
      })
      .sort((first, second) => {
        const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
        const firstValue =
          sortKey === 'salesPrice'
            ? first.salesPrice
            : sortKey === 'createdAt'
              ? new Date(first.createdAt).getTime()
              : first[sortKey];
        const secondValue =
          sortKey === 'salesPrice'
            ? second.salesPrice
            : sortKey === 'createdAt'
              ? new Date(second.createdAt).getTime()
              : second[sortKey];

        if (typeof firstValue === 'number' && typeof secondValue === 'number') {
          return (firstValue - secondValue) * directionMultiplier;
        }

        return String(firstValue).localeCompare(String(secondValue), 'nl-NL') * directionMultiplier;
      });
  }, [createdByFilter, customerFilter, dateFrom, dateTo, quotes, searchTerm, sortDirection, sortKey, statusFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
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
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Status kon niet worden bijgewerkt.');
    } finally {
      setUpdatingQuoteId('');
    }
  };

  const handleDeleteQuote = async (quote: SavedQuote) => {
    const confirmed = window.confirm(`Offerte ${quote.quoteNumber} definitief verwijderen?`);

    if (!confirmed) {
      return;
    }

    setError('');
    setStatus('');

    try {
      await deleteSavedQuote(quote.id);
      setQuotes((currentQuotes) => currentQuotes.filter((currentQuote) => currentQuote.id !== quote.id));
      setStatus('Offerte verwijderd.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Offerte kon niet worden verwijderd.');
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

  const renderSortableHeader = (label: string, nextSortKey: SortKey) => (
    <button className="table-sort-button" onClick={() => updateSort(nextSortKey)} type="button">
      {label}
      {sortKey === nextSortKey ? <span>{sortDirection === 'asc' ? '↑' : '↓'}</span> : null}
    </button>
  );

  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Team Freight Forwarding</p>
          <h2>Offertedashboard</h2>
        </div>
      </div>

      <div className="dashboard-kpis">
        <div className="kpi-card">
          <span>Open offertes</span>
          <strong>{kpis.openCount}</strong>
        </div>
        <div className="kpi-card">
          <span>Gewonnen deze maand</span>
          <strong>{kpis.wonThisMonth}</strong>
        </div>
        <div className="kpi-card">
          <span>Verloren deze maand</span>
          <strong>{kpis.lostThisMonth}</strong>
        </div>
        <div className="kpi-card">
          <span>Conversie</span>
          <strong>{kpis.conversion.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}%</strong>
        </div>
        <div className="kpi-card wide">
          <span>Open verkoopwaarde</span>
          <strong>{formatCurrency(kpis.openSalesValue)}</strong>
        </div>
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

      <div className="quotes-table-wrap">
        <table className="quotes-table">
          <thead>
            <tr>
              <th>{renderSortableHeader('Offertenummer', 'quoteNumber')}</th>
              <th>{renderSortableHeader('Klant', 'customerName')}</th>
              <th>Traject</th>
              <th>Incoterm</th>
              <th>{renderSortableHeader('Verkoopprijs', 'salesPrice')}</th>
              <th>{renderSortableHeader('Status', 'status')}</th>
              <th>Gemaakt door</th>
              <th>{renderSortableHeader('Datum', 'createdAt')}</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map((quote) => {
              const route = getRouteParts(quote);

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
                    <div className="status-cell">
                      <span className={`quote-status-badge status-${quote.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {quote.status}
                      </span>
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
                    </div>
                  </td>
                  <td>{formatDisplayName(quote.createdByLabel)}</td>
                  <td>{new Date(quote.createdAt).toLocaleDateString('nl-NL')}</td>
                  <td>
                    <div className="quote-actions">
                      <button disabled={openingQuoteId === quote.id} onClick={() => void handleOpenQuote(quote)} type="button">
                        {openingQuoteId === quote.id ? 'Openen...' : 'Openen'}
                      </button>
                      <button className="danger" onClick={() => void handleDeleteQuote(quote)} type="button">
                        Verwijderen
                      </button>
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
    </section>
  );
}
