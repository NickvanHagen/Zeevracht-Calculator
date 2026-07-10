import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { SegmentedControl } from './components';
import { LclPage } from './pages/LclPage';
import { FclPage } from './pages/FclPage';
import { QuotesDashboard } from './pages/QuotesDashboard';
import {
  fetchActiveNvoLclExportTariffs,
  parseNvoLclExportTariffFile,
  saveNvoLclExportTariffsToSupabase,
  updateNvoLclExportExchangeRate,
  type NvoLclExportTariffSet,
} from './pricing/nvoLclExport';
import {
  fetchActiveNvoLclImportTariffs,
  formatNvoValidity,
  parseNvoLclImportTariffFile,
  saveNvoLclImportTariffsToSupabase,
  updateNvoLclImportExchangeRate,
  type NvoLclImportTariffSet,
} from './pricing/nvoLclImport';
import { isSupabaseConfigured } from './services/supabaseClient';
import type { SavedQuote } from './services/quoteService';
import type { ShipmentDirection, ShipmentMode } from './types/shipment';
import tffLogo from './assets/tff-logo.png';

const SESSION_AUTH_KEY = 'tff-calculator-authenticated';
const SESSION_PASSWORD_KEY = 'tff-calculator-password';

const shipmentModeOptions: Array<{ value: ShipmentMode; label: string }> = [
  { value: 'lcl', label: 'LCL' },
  { value: 'fcl', label: 'FCL' },
];

const directionOptions: Array<{ value: ShipmentDirection; label: string }> = [
  { value: 'import', label: 'Import' },
  { value: 'export', label: 'Export' },
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () =>
      sessionStorage.getItem(SESSION_AUTH_KEY) === 'true' &&
      Boolean(sessionStorage.getItem(SESSION_PASSWORD_KEY)),
  );
  const [password, setPassword] = useState('');
  const [authenticatedPassword, setAuthenticatedPassword] = useState(
    () => sessionStorage.getItem(SESSION_PASSWORD_KEY) ?? '',
  );
  const [loginError, setLoginError] = useState('');
  const [shipmentMode, setShipmentMode] = useState<ShipmentMode>('lcl');
  const [direction, setDirection] = useState<ShipmentDirection>('import');
  const [appView, setAppView] = useState<'calculator' | 'quotes'>('calculator');
  const [openedQuote, setOpenedQuote] = useState<SavedQuote | undefined>();
  const [newCalculationToken, setNewCalculationToken] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nvoImportTariffs, setNvoImportTariffs] = useState<NvoLclImportTariffSet | undefined>();
  const [nvoExportTariffs, setNvoExportTariffs] = useState<NvoLclExportTariffSet | undefined>();
  const [exchangeRate, setExchangeRate] = useState('1.144');
  const [tariffUploadError, setTariffUploadError] = useState('');
  const [tariffUploadWarning, setTariffUploadWarning] = useState('');
  const [tariffStatus, setTariffStatus] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setTariffStatus('');
      return;
    }

    let isCurrent = true;
    setTariffStatus('Tarieven laden...');

    Promise.all([fetchActiveNvoLclImportTariffs(), fetchActiveNvoLclExportTariffs()])
      .then(([importTariffs, exportTariffs]) => {
        if (!isCurrent) {
          return;
        }

        setNvoImportTariffs(importTariffs);
        setNvoExportTariffs(exportTariffs);
        if (importTariffs?.exchangeRate) {
          setExchangeRate(String(importTariffs.exchangeRate));
        } else if (exportTariffs?.exchangeRate) {
          setExchangeRate(String(exportTariffs.exchangeRate));
        }
        setTariffStatus(importTariffs || exportTariffs ? '' : 'Nog geen actieve NVO LCL tariefbestanden gevonden.');
      })
      .catch((error) => {
        if (!isCurrent) {
          return;
        }

        setTariffStatus('');
        setTariffUploadError(error instanceof Error ? error.message : 'Tarieven konden niet worden geladen.');
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password === import.meta.env.VITE_APP_PASSWORD) {
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
      sessionStorage.setItem(SESSION_PASSWORD_KEY, password);
      setAuthenticatedPassword(password);
      setIsAuthenticated(true);
      setLoginError('');
      setPassword('');
      return;
    }

    setLoginError('Onjuist wachtwoord');
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    sessionStorage.removeItem(SESSION_PASSWORD_KEY);
    setAuthenticatedPassword('');
    setIsAuthenticated(false);
    setSettingsOpen(false);
  };

  const handleNvoImportTariffUpload = async (file: File | undefined) => {
    setTariffUploadError('');
    setTariffUploadWarning('');

    if (!file) {
      return;
    }

    if (!isSupabaseConfigured) {
      setTariffUploadError('Supabase is nog niet ingesteld. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setTariffUploadWarning('Upload alleen Excel-bestanden met extensie .xlsx.');
      return;
    }

    try {
      setTariffStatus('Importtarieven importeren...');
      const parsedExchangeRate = Number(exchangeRate.replace(',', '.')) || 1.144;
      const importedTariffs = await parseNvoLclImportTariffFile(file, parsedExchangeRate);
      const savedTariffs = await saveNvoLclImportTariffsToSupabase(
        importedTariffs,
        parsedExchangeRate,
        authenticatedPassword,
      );
      setNvoImportTariffs(savedTariffs);
      setExchangeRate(String(savedTariffs.exchangeRate));
      setTariffStatus('NVO LCL Import tarieven opgeslagen in Supabase.');
    } catch (error) {
      setTariffStatus('');
      setTariffUploadError(error instanceof Error ? error.message : 'Het bestand wordt niet herkend.');
    }
  };

  const handleNvoExportTariffUpload = async (file: File | undefined) => {
    setTariffUploadError('');
    setTariffUploadWarning('');

    if (!file) {
      return;
    }

    if (!isSupabaseConfigured) {
      setTariffUploadError('Supabase is nog niet ingesteld. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setTariffUploadWarning('Upload alleen Excel-bestanden met extensie .xlsx.');
      return;
    }

    try {
      setTariffStatus('Exporttarieven importeren...');
      const parsedExchangeRate = Number(exchangeRate.replace(',', '.')) || 1.144;
      const importedTariffs = await parseNvoLclExportTariffFile(file, parsedExchangeRate);
      const savedTariffs = await saveNvoLclExportTariffsToSupabase(
        importedTariffs,
        parsedExchangeRate,
        authenticatedPassword,
      );
      setNvoExportTariffs(savedTariffs);
      setExchangeRate(String(savedTariffs.exchangeRate));
      setTariffStatus('NVO LCL Export tarieven opgeslagen in Supabase.');
    } catch (error) {
      setTariffStatus('');
      setTariffUploadError(error instanceof Error ? error.message : 'Het exportbestand wordt niet herkend.');
    }
  };

  const handleExchangeRateSave = async () => {
    setTariffUploadError('');
    setTariffUploadWarning('');

    if (!isSupabaseConfigured) {
      setTariffUploadError('Supabase is nog niet ingesteld. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.');
      return;
    }

    const parsedExchangeRate = Number(exchangeRate.replace(',', '.'));

    if (!Number.isFinite(parsedExchangeRate) || parsedExchangeRate <= 0) {
      setTariffUploadWarning('Vul een geldige rate of exchange in.');
      return;
    }

    try {
      const updates = [];
      if (nvoImportTariffs?.id) {
        updates.push(updateNvoLclImportExchangeRate(nvoImportTariffs.id, parsedExchangeRate, authenticatedPassword));
      }
      if (nvoExportTariffs?.id) {
        updates.push(updateNvoLclExportExchangeRate(nvoExportTariffs.id, parsedExchangeRate, authenticatedPassword));
      }

      if (updates.length === 0) {
        setTariffUploadWarning('Upload eerst een NVO LCL tariefbestand.');
        return;
      }

      await Promise.all(updates);
      if (nvoImportTariffs) {
        setNvoImportTariffs({ ...nvoImportTariffs, exchangeRate: parsedExchangeRate });
      }
      if (nvoExportTariffs) {
        setNvoExportTariffs({ ...nvoExportTariffs, exchangeRate: parsedExchangeRate });
      }
      setTariffStatus('Rate of exchange opgeslagen.');
    } catch (error) {
      setTariffUploadError(error instanceof Error ? error.message : 'Rate of exchange kon niet worden opgeslagen.');
    }
  };

  const handleOpenQuote = (quote: SavedQuote) => {
    setOpenedQuote(quote);
    setShipmentMode('lcl');
    setDirection(quote.direction);
    setAppView('calculator');
  };

  const handleNewCalculation = () => {
    setOpenedQuote(undefined);
    setShipmentMode('lcl');
    setAppView('calculator');
    setNewCalculationToken((currentToken) => currentToken + 1);
  };

  if (!isAuthenticated) {
    return (
      <main className="login-shell">
        <form className="login-card" onSubmit={handleLogin}>
          <img alt="TFF" className="login-logo" src={tffLogo} />
          <h1>Team Freight Forwarding</h1>
          <label className="field" htmlFor="app-password">
            <span>Wachtwoord</span>
            <input
              autoComplete="current-password"
              id="app-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          {loginError ? <p className="login-error">{loginError}</p> : null}
          <button className="login-button" type="submit">
            Inloggen
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <img alt="TFF" className="brand-logo" src={tffLogo} />
          <div>
            <p className="eyebrow">Team Freight Forwarding</p>
            <h1>Transport Calculator</h1>
          </div>
        </div>
        <div className="app-toolbar">
          <div className="toolbar-segments">
            <nav aria-label="Nieuwe calculatie" className="tab-nav">
              <button className="tab-button toolbar-action-button" onClick={handleNewCalculation} type="button">
                Nieuwe calculatie
              </button>
            </nav>
            <SegmentedControl
              label="Scherm"
              onChange={setAppView}
              options={[
                { value: 'calculator', label: 'Calculator' },
                { value: 'quotes', label: 'Offertes' },
              ]}
              value={appView}
            />
            {appView === 'calculator' ? (
              <>
                <SegmentedControl
                  label="Transporttype"
                  onChange={setShipmentMode}
                  options={shipmentModeOptions}
                  value={shipmentMode}
                />
                <SegmentedControl
                  label="Richting"
                  onChange={setDirection}
                  options={directionOptions}
                  value={direction}
                />
              </>
            ) : null}
          </div>
          <div className="settings-menu">
            <button
              aria-expanded={settingsOpen}
              aria-haspopup="true"
              className="settings-button"
              onClick={() => setSettingsOpen((current) => !current)}
              type="button"
            >
              Instellingen
            </button>
            {settingsOpen ? (
              <div className="settings-popover">
                <span>Weergave</span>
                <SegmentedControl
                  label="Weergave"
                  onChange={(nextTheme) => {
                    setTheme(nextTheme);
                    setSettingsOpen(false);
                  }}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                  value={theme}
                />
                <section className="settings-section">
                  <span>Tarievenbeheer</span>
                  {!isSupabaseConfigured ? (
                    <p className="settings-warning">
                      Supabase is nog niet ingesteld. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.
                    </p>
                  ) : null}
                  <label className="field compact-field" htmlFor="nvo-exchange-rate">
                    <span>Rate of exchange</span>
                    <input
                      id="nvo-exchange-rate"
                      inputMode="decimal"
                      onChange={(event) => setExchangeRate(event.target.value)}
                      type="text"
                      value={exchangeRate}
                    />
                  </label>
                  <button className="settings-secondary-button" onClick={() => void handleExchangeRateSave()} type="button">
                    ROE opslaan
                  </button>
                  <label className="tariff-upload" htmlFor="nvo-lcl-import-upload">
                    NVO LCL IMPORT tarieven uploaden
                    <input
                      accept=".xlsx"
                      disabled={!isSupabaseConfigured}
                      id="nvo-lcl-import-upload"
                      onChange={(event) => {
                        void handleNvoImportTariffUpload(event.target.files?.[0]);
                        event.target.value = '';
                      }}
                      type="file"
                    />
                  </label>
                  {nvoImportTariffs ? (
                    <div className="tariff-meta">
                      <strong>Import: {nvoImportTariffs.fileName}</strong>
                      <span>{new Date(nvoImportTariffs.uploadedAt).toLocaleString('nl-NL')}</span>
                      {nvoImportTariffs.validity ? <span>Geldig: {formatNvoValidity(nvoImportTariffs.validity)}</span> : null}
                      <span>Rate of exchange: {nvoImportTariffs.exchangeRate}</span>
                    </div>
                  ) : null}
                  <label className="tariff-upload export-upload" htmlFor="nvo-lcl-export-upload">
                    NVO LCL EXPORT tarieven uploaden
                    <input
                      accept=".xlsx"
                      disabled={!isSupabaseConfigured}
                      id="nvo-lcl-export-upload"
                      onChange={(event) => {
                        void handleNvoExportTariffUpload(event.target.files?.[0]);
                        event.target.value = '';
                      }}
                      type="file"
                    />
                  </label>
                  {nvoExportTariffs ? (
                    <div className="tariff-meta">
                      <strong>Export: {nvoExportTariffs.fileName}</strong>
                      <span>{new Date(nvoExportTariffs.uploadedAt).toLocaleString('nl-NL')}</span>
                      {nvoExportTariffs.validity ? <span>Geldig: {formatNvoValidity(nvoExportTariffs.validity)}</span> : null}
                      <span>Rate of exchange: {nvoExportTariffs.exchangeRate}</span>
                    </div>
                  ) : null}
                  {tariffStatus ? <p className="settings-status">{tariffStatus}</p> : null}
                  {tariffUploadWarning ? <p className="settings-warning">{tariffUploadWarning}</p> : null}
                  {tariffUploadError ? <p className="settings-error">{tariffUploadError}</p> : null}
                </section>
                <button className="logout-button" onClick={handleLogout} type="button">
                  Uitloggen
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {appView === 'quotes' ? (
        <QuotesDashboard appPassword={authenticatedPassword} onOpenQuote={handleOpenQuote} />
      ) : shipmentMode === 'lcl' ? (
        <LclPage
          appPassword={authenticatedPassword}
          direction={direction}
          newCalculationToken={newCalculationToken}
          nvoExportTariffs={nvoExportTariffs}
          nvoImportTariffs={nvoImportTariffs}
          openedQuote={openedQuote}
        />
      ) : (
        <FclPage direction={direction} />
      )}
    </main>
  );
}

export default App;
