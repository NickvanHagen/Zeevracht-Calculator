import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { SegmentedControl } from './components';
import { LclPage } from './pages/LclPage';
import { FclPage } from './pages/FclPage';
import {
  loadNvoLclImportTariffs,
  parseNvoLclImportTariffFile,
  saveNvoLclImportTariffs,
  type NvoLclImportTariffSet,
} from './pricing/nvoLclImport';
import type { ShipmentDirection, ShipmentMode } from './types/shipment';
import tffLogo from './assets/tff-logo.png';

const SESSION_AUTH_KEY = 'tff-calculator-authenticated';

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
    () => sessionStorage.getItem(SESSION_AUTH_KEY) === 'true',
  );
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [shipmentMode, setShipmentMode] = useState<ShipmentMode>('lcl');
  const [direction, setDirection] = useState<ShipmentDirection>('import');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nvoTariffs, setNvoTariffs] = useState<NvoLclImportTariffSet | undefined>(
    () => loadNvoLclImportTariffs(),
  );
  const [tariffUploadError, setTariffUploadError] = useState('');
  const [tariffUploadWarning, setTariffUploadWarning] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password === import.meta.env.VITE_APP_PASSWORD) {
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
      setIsAuthenticated(true);
      setLoginError('');
      setPassword('');
      return;
    }

    setLoginError('Onjuist wachtwoord');
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    setIsAuthenticated(false);
    setSettingsOpen(false);
  };

  const handleNvoTariffUpload = async (file: File | undefined) => {
    setTariffUploadError('');
    setTariffUploadWarning('');

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setTariffUploadWarning('Upload alleen Excel-bestanden met extensie .xlsx.');
      return;
    }

    try {
      const importedTariffs = await parseNvoLclImportTariffFile(file);
      saveNvoLclImportTariffs(importedTariffs);
      setNvoTariffs(importedTariffs);
    } catch (error) {
      setTariffUploadError(error instanceof Error ? error.message : 'Het bestand wordt niet herkend.');
    }
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
                  <label className="tariff-upload" htmlFor="nvo-lcl-import-upload">
                    NVO LCL Import tarieven uploaden
                    <input
                      accept=".xlsx"
                      id="nvo-lcl-import-upload"
                      onChange={(event) => {
                        void handleNvoTariffUpload(event.target.files?.[0]);
                        event.target.value = '';
                      }}
                      type="file"
                    />
                  </label>
                  {nvoTariffs ? (
                    <div className="tariff-meta">
                      <strong>{nvoTariffs.fileName}</strong>
                      <span>{new Date(nvoTariffs.uploadedAt).toLocaleString('nl-NL')}</span>
                      {nvoTariffs.validity ? <span>Geldig: {nvoTariffs.validity}</span> : null}
                    </div>
                  ) : null}
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

      {shipmentMode === 'lcl' ? (
        <LclPage direction={direction} nvoImportTariffs={nvoTariffs} />
      ) : (
        <FclPage direction={direction} />
      )}
    </main>
  );
}

export default App;
