import { useEffect, useState } from 'react';
import { SegmentedControl } from './components';
import { LclPage } from './pages/LclPage';
import { FclPage } from './pages/FclPage';
import type { ShipmentDirection, ShipmentMode } from './types/shipment';
import tffLogo from './assets/tff-logo.png';

const shipmentModeOptions: Array<{ value: ShipmentMode; label: string }> = [
  { value: 'lcl', label: 'LCL' },
  { value: 'fcl', label: 'FCL' },
];

const directionOptions: Array<{ value: ShipmentDirection; label: string }> = [
  { value: 'import', label: 'Import' },
  { value: 'export', label: 'Export' },
];

function App() {
  const [shipmentMode, setShipmentMode] = useState<ShipmentMode>('lcl');
  const [direction, setDirection] = useState<ShipmentDirection>('import');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {shipmentMode === 'lcl' ? <LclPage direction={direction} /> : <FclPage direction={direction} />}
    </main>
  );
}

export default App;
