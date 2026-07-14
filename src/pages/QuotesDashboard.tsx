import { useEffect, useMemo, useState } from 'react';
import { deleteSavedQuote, fetchSavedQuote, fetchSavedQuotes, type SavedQuote } from '../services/quoteService';
import { formatCurrency } from '../utils/formatCurrency';

type QuotesDashboardProps = {
  onOpenQuote: (quote: SavedQuote) => void;
};

export function QuotesDashboard({ onOpenQuote }: QuotesDashboardProps) {
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openingQuoteId, setOpeningQuoteId] = useState('');
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
        setStatus(savedQuotes.length > 0 ? '' : 'Nog geen offertes opgeslagen.');
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

  const filteredQuotes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return quotes;
    }

    return quotes.filter((quote) =>
      [
        quote.quoteNumber,
        quote.customerName,
        quote.customerReference,
        quote.tffReference,
        quote.loadingPlace,
        quote.unloadingPlace,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [quotes, searchTerm]);

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

  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Team Freight Forwarding</p>
          <h2>Offertedashboard</h2>
        </div>
        <label className="field dashboard-search" htmlFor="quote-search">
          <span>Zoeken</span>
          <input
            id="quote-search"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Klant, referentie, haven..."
            type="text"
            value={searchTerm}
          />
        </label>
      </div>

      {status ? <p className="settings-status">{status}</p> : null}
      {error ? <p className="settings-error">{error}</p> : null}

      <div className="quotes-table-wrap">
        <table className="quotes-table">
          <thead>
            <tr>
              <th>Offerte</th>
              <th>Klant</th>
              <th>Richting</th>
              <th>Havens</th>
              <th>Incoterms</th>
              <th>Verkoopprijs</th>
              <th>Gemaakt door</th>
              <th>Datum</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map((quote) => (
              <tr key={quote.id}>
                <td>
                  <strong>{quote.quoteNumber}</strong>
                  {quote.tffReference ? <span>{quote.tffReference}</span> : null}
                </td>
                <td>
                  <strong>{quote.customerName}</strong>
                  {quote.customerReference ? <span>{quote.customerReference}</span> : null}
                </td>
                <td>{quote.direction === 'import' ? 'Import' : 'Export'}</td>
                <td>
                  {quote.loadingPlace || '-'} <span>naar</span> {quote.unloadingPlace || '-'}
                </td>
                <td>{quote.incoterms}</td>
                <td>
                  <strong>{formatCurrency(quote.salesPrice)}</strong>
                </td>
                <td>{quote.createdByLabel}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
