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

type QuotesDashboardProps = {
  onOpenQuote: (quote: SavedQuote) => void;
};

type SortKey = 'quoteNumber' | 'customerName' | 'salesPrice' | 'margin' | 'status' | 'validUntil' | 'createdAt';
type SortDirection = 'asc' | 'desc';
type ValidityFilter = '' | 'valid' | 'soon' | 'expired';

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
    const openQuotes = quotes.filter((quote) => {
      const validityInfo = getQuoteValidityInfo(quote.validUntil || quote.validity, quote.status);

      return openStatuses.has(validityInfo.effectiveStatus as QuoteStatus);
    });
    const wonThisMonth = quotes.filter((quote) => quote.status === 'Gewonnen' && isInCurrentMonth(quote.statusUpdatedAt));
    const lostThisMonth = quotes.filter((quote) => quote.status === 'Verloren' && isInCurrentMonth(quote.statusUpdatedAt));
    const decidedThisMonth = wonThisMonth.length + lostThisMonth.length;
    const conversion = decidedThisMonth > 0 ? (wonThisMonth.length / decidedThisMonth) * 100 : 0;
    const quotesThisMonth = quotes.filter((quote) => isInCurrentMonth(quote.createdAt));

    return {
      conversion,
      lostThisMonth: lostThisMonth.length,
      openCount: openQuotes.length,
      quotesThisMonth: quotesThisMonth.length,
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
          <span>Offertes deze maand</span>
          <strong>{kpis.quotesThisMonth}</strong>
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
