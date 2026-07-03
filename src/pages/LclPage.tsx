import { useEffect, useMemo, useState } from 'react';
import { Checkbox, InputField, NumberInput, ResultCard, SectionCard, SelectField } from '../components';
import tffLogo from '../assets/tff-logo.png';
import { customsFees } from '../config/customsFees';
import { defaultSurcharges } from '../config/surcharges';
import { getSluyterRate, sluyterFees } from '../pricing/sluyter';
import {
  generateLclQuotePdf,
  type LclQuoteDetails,
  type LclQuoteLanguage,
} from '../services/lclQuotePdfService';
import type { ShipmentDirection } from '../types/shipment';
import { calculateLclCosts } from '../utils/calculateLclCosts';
import { calculateLclShipment } from '../utils/calculateLclShipment';
import { formatCurrency } from '../utils/formatCurrency';
import { formatNumber } from '../utils/formatNumber';

type LclPageProps = {
  direction: ShipmentDirection;
};

type PalletType = 'europallet' | 'blokpallet' | 'custom';

type PalletRow = {
  id: string;
  quantity: string;
  type: PalletType;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightPerItemKg: string;
  stackable: boolean;
};

const incotermOptions = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'].map(
  (incoterm) => ({ label: incoterm, value: incoterm }),
);

const createPalletRow = (type: PalletType = 'europallet'): PalletRow => {
  const dimensions =
    type === 'blokpallet'
      ? { lengthCm: '120', widthCm: '100' }
      : type === 'europallet'
        ? { lengthCm: '120', widthCm: '80' }
        : { lengthCm: '', widthCm: '' };

  return {
    heightCm: '120',
    id: crypto.randomUUID(),
    quantity: '1',
    stackable: false,
    type,
    weightPerItemKg: '',
    ...dimensions,
  };
};

const toNumber = (value: string) => Number(value) || 0;

const createQuoteDetails = (): LclQuoteDetails => ({
  customerName: '',
  customerReference: '',
  incoterms: '',
  loadingPlace: '',
  note: '',
  route: '',
  tffReference: '',
  unloadingPlace: '',
  validity: '',
});

export function LclPage({ direction }: LclPageProps) {
  const isImport = direction === 'import';
  const [quoteDetails, setQuoteDetails] = useState<LclQuoteDetails>(createQuoteDetails);
  const [rows, setRows] = useState<PalletRow[]>([createPalletRow()]);
  const [customsSelected, setCustomsSelected] = useState(false);
  const [adrSelected, setAdrSelected] = useState(false);
  const [oceanFreight, setOceanFreight] = useState('');
  const [marginPercentage, setMarginPercentage] = useState('');
  const [dieselPercentage, setDieselPercentage] = useState(String(defaultSurcharges.dieselPercentage));
  const [roadChargePercentage, setRoadChargePercentage] = useState(
    String(defaultSurcharges.roadChargePercentage),
  );

  useEffect(() => {
    setCustomsSelected(false);
  }, [direction]);

  const totals = useMemo(
    () =>
      calculateLclShipment(
        rows.map((row) => ({
          heightCm: toNumber(row.heightCm),
          lengthCm: toNumber(row.lengthCm),
          quantity: toNumber(row.quantity),
          stackable: row.stackable,
          weightPerItemKg: toNumber(row.weightPerItemKg),
          widthCm: toNumber(row.widthCm),
        })),
      ),
    [rows],
  );

  const selectedRate = getSluyterRate({
    chargeableWeightKg: totals.chargeableWeight,
    loadMeters: totals.loadMeters,
  });
  const oceanFreightAmount = toNumber(oceanFreight);
  const baseRate = selectedRate?.rate ?? 0;
  const customsCharge = customsSelected
    ? isImport
      ? customsFees.importClearance
      : customsFees.exportClearance
    : 0;
  const adrCharge = adrSelected ? sluyterFees.adr : 0;
  const { dieselCharge, profit, roadCharge, salesPrice, totalPurchase } = calculateLclCosts({
    adrCharge,
    baseRate,
    customsCharge,
    dieselPercentage: toNumber(dieselPercentage),
    marginPercentage: toNumber(marginPercentage),
    oceanFreight: oceanFreightAmount,
    roadChargePercentage: toNumber(roadChargePercentage),
  });

  const resultRows = [
    { label: 'Laadmeters', value: `${formatNumber(totals.loadMeters)} ldm` },
    { label: 'Werkelijk gewicht', value: `${formatNumber(totals.actualWeight, 0)} kg` },
    { label: 'Betalend gewicht', value: `${formatNumber(totals.chargeableWeight, 0)} kg` },
    { label: 'Zeevracht', value: formatCurrency(oceanFreightAmount) },
    { label: 'Sluyter tarief', value: selectedRate ? formatCurrency(baseRate) : 'Op aanvraag' },
    { label: `Kilometerheffing ${formatNumber(toNumber(roadChargePercentage))}%`, value: formatCurrency(roadCharge) },
    { label: `Dieseltoeslag ${formatNumber(toNumber(dieselPercentage))}%`, value: formatCurrency(dieselCharge) },
    ...(customsSelected
      ? [{ label: isImport ? 'Inklaring' : 'Uitklaring', value: formatCurrency(customsCharge) }]
      : []),
    ...(adrSelected ? [{ label: 'ADR', value: formatCurrency(adrCharge) }] : []),
    { label: 'Totaal inkoop', value: selectedRate ? formatCurrency(totalPurchase) : 'Op aanvraag', emphasis: true },
  ];

  const updateRow = <TKey extends keyof PalletRow>(id: string, key: TKey, value: PalletRow[TKey]) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== id) {
          return row;
        }

        if (key === 'type') {
          const selectedType = value as PalletType;
          const nextRow = { ...row, type: selectedType };

          if (selectedType === 'europallet') {
            return { ...nextRow, lengthCm: '120', widthCm: '80' };
          }

          if (selectedType === 'blokpallet') {
            return { ...nextRow, lengthCm: '120', widthCm: '100' };
          }

          return nextRow;
        }

        return { ...row, [key]: value };
      }),
    );
  };

  const removeRow = (id: string) => {
    setRows((currentRows) =>
      currentRows.length === 1 ? currentRows : currentRows.filter((row) => row.id !== id),
    );
  };

  const updateQuoteDetails = <TKey extends keyof LclQuoteDetails>(
    key: TKey,
    value: LclQuoteDetails[TKey],
  ) => {
    setQuoteDetails((currentDetails) => ({ ...currentDetails, [key]: value }));
  };

  const generateQuote = (language: LclQuoteLanguage) => {
    if (!quoteDetails.customerName.trim() || !quoteDetails.incoterms.trim() || !quoteDetails.validity.trim()) {
      window.alert('Vul minimaal Klantnaam, Incoterms en Geldigheid offerte in.');
      return;
    }

    if (!selectedRate) {
      window.alert('Er kan nog geen offerte worden gemaakt omdat het LCL-tarief op aanvraag staat.');
      return;
    }

    generateLclQuotePdf({
      details: quoteDetails,
      direction,
      language,
      loadMeters: `${formatNumber(totals.loadMeters)} ldm`,
      logoUrl: tffLogo,
      palletLines: rows,
      salesPrice: formatCurrency(salesPrice),
    });
  };

  return (
    <div className="page-grid lcl-layout">
      <div className="lcl-content">
        <SectionCard title="Offertegegevens">
          <form className="form-grid quote-form">
            <InputField
              label="Klantnaam *"
              name="customerName"
              onChange={(event) => updateQuoteDetails('customerName', event.target.value)}
              type="text"
              value={quoteDetails.customerName}
            />
            <InputField
              label="TFF referentie"
              name="tffReference"
              onChange={(event) => updateQuoteDetails('tffReference', event.target.value)}
              type="text"
              value={quoteDetails.tffReference}
            />
            <InputField
              label="Klantreferentie"
              name="customerReference"
              onChange={(event) => updateQuoteDetails('customerReference', event.target.value)}
              type="text"
              value={quoteDetails.customerReference}
            />
            <SelectField
              label="Incoterms *"
              name="incoterms"
              onChange={(event) => updateQuoteDetails('incoterms', event.target.value)}
              options={[{ label: 'Kies incoterm', value: '' }, ...incotermOptions]}
              value={quoteDetails.incoterms}
            />
            <InputField
              label="Laadplaats"
              name="loadingPlace"
              onChange={(event) => updateQuoteDetails('loadingPlace', event.target.value)}
              type="text"
              value={quoteDetails.loadingPlace}
            />
            <InputField
              label="Losplaats"
              name="unloadingPlace"
              onChange={(event) => updateQuoteDetails('unloadingPlace', event.target.value)}
              type="text"
              value={quoteDetails.unloadingPlace}
            />
            <InputField
              label="Route / havens"
              name="route"
              onChange={(event) => updateQuoteDetails('route', event.target.value)}
              placeholder="Bijv. Ningbo - Rotterdam"
              type="text"
              value={quoteDetails.route}
            />
            <InputField
              label="Geldigheid offerte *"
              name="validity"
              onChange={(event) => updateQuoteDetails('validity', event.target.value)}
              placeholder="Bijv. geldig t/m 31-07-2026"
              type="text"
              value={quoteDetails.validity}
            />
            <label className="field quote-note" htmlFor="quote-note">
              <span>Opmerking / omschrijving</span>
              <textarea
                id="quote-note"
                name="quoteNote"
                onChange={(event) => updateQuoteDetails('note', event.target.value)}
                rows={3}
                value={quoteDetails.note}
              />
            </label>
          </form>
        </SectionCard>

        <SectionCard
          title="Zending invoeren"
          description="Meerdere palletformaten binnen dezelfde LCL-zending."
        >
          <div className="table-note">
            Stapelbaar rekent vloerplekken op basis van max. 240 cm hoogte en 1.750 kg per laadmeter.
          </div>
          <div className="shipment-table-wrap">
            <table className="shipment-table">
              <thead>
                <tr>
                  <th>Aantal</th>
                  <th>Type</th>
                  <th>Lengte cm</th>
                  <th>Breedte cm</th>
                  <th>Hoogte cm</th>
                  <th>Kg/stuk</th>
                  <th>Stapelbaar</th>
                  <th aria-label="Acties" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        aria-label="Aantal"
                        min="1"
                        onChange={(event) => updateRow(row.id, 'quantity', event.target.value)}
                        type="number"
                        value={row.quantity}
                      />
                    </td>
                    <td>
                      <select
                        aria-label="Type"
                        onChange={(event) => updateRow(row.id, 'type', event.target.value as PalletType)}
                        value={row.type}
                      >
                        <option value="europallet">Europallet</option>
                        <option value="blokpallet">Blokpallet</option>
                        <option value="custom">Afwijkend</option>
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label="Lengte cm"
                        min="0"
                        onChange={(event) => updateRow(row.id, 'lengthCm', event.target.value)}
                        type="number"
                        value={row.lengthCm}
                      />
                    </td>
                    <td>
                      <input
                        aria-label="Breedte cm"
                        min="0"
                        onChange={(event) => updateRow(row.id, 'widthCm', event.target.value)}
                        type="number"
                        value={row.widthCm}
                      />
                    </td>
                    <td>
                      <input
                        aria-label="Hoogte cm"
                        min="0"
                        onChange={(event) => updateRow(row.id, 'heightCm', event.target.value)}
                        type="number"
                        value={row.heightCm}
                      />
                    </td>
                    <td>
                      <input
                        aria-label="Kg per stuk"
                        min="0"
                        onChange={(event) => updateRow(row.id, 'weightPerItemKg', event.target.value)}
                        type="number"
                        value={row.weightPerItemKg}
                      />
                    </td>
                    <td className="center-cell">
                      <label className="table-checkbox">
                        <input
                          aria-label="Stapelbaar"
                          checked={row.stackable}
                          onChange={(event) => updateRow(row.id, 'stackable', event.target.checked)}
                          type="checkbox"
                        />
                        <span aria-hidden="true" />
                      </label>
                    </td>
                    <td>
                      <button className="delete-button" onClick={() => removeRow(row.id)} type="button">
                        Wis
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-actions">
            <button className="primary-action" onClick={() => setRows((current) => [...current, createPalletRow('custom')])} type="button">
              Regel toevoegen
            </button>
            <button onClick={() => setRows((current) => [...current, createPalletRow('europallet')])} type="button">
              Europallet
            </button>
            <button onClick={() => setRows((current) => [...current, createPalletRow('blokpallet')])} type="button">
              Blokpallet
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Toeslagen en opties">
          <form className="form-grid">
            <NumberInput
              label="Zeevracht (€)"
              name="oceanFreight"
              onChange={(event) => setOceanFreight(event.target.value)}
              placeholder="0,00"
              value={oceanFreight}
            />
            <NumberInput
              label="Kilometerheffing (%)"
              name="roadCharge"
              onChange={(event) => setRoadChargePercentage(event.target.value)}
              placeholder="0"
              value={roadChargePercentage}
            />
            <NumberInput
              label="Dieseltoeslag (%)"
              name="fuelSurcharge"
              onChange={(event) => setDieselPercentage(event.target.value)}
              placeholder="0"
              value={dieselPercentage}
            />
            <div className="checkbox-group" aria-label="Douane opties">
              {isImport ? (
                <Checkbox
                  checked={customsSelected}
                  label="Inklaring"
                  name="customsImport"
                  onChange={(event) => setCustomsSelected(event.target.checked)}
                />
              ) : (
                <Checkbox
                  checked={customsSelected}
                  label="Uitklaring"
                  name="customsExport"
                  onChange={(event) => setCustomsSelected(event.target.checked)}
                />
              )}
              <Checkbox
                checked={adrSelected}
                label="ADR"
                name="adr"
                onChange={(event) => setAdrSelected(event.target.checked)}
              />
            </div>
          </form>
        </SectionCard>
      </div>

      <ResultCard rows={resultRows} title="LCL overzicht">
        <section className="sales-card">
          <h3>VERKOOP</h3>
          <NumberInput
            label="Marge (%)"
            name="marginPercentage"
            onChange={(event) => setMarginPercentage(event.target.value)}
            placeholder="0"
            value={marginPercentage}
          />
          <div className="summary-list sales-summary">
            <div className="summary-row">
              <span>Inkoopprijs</span>
              <strong>{selectedRate ? formatCurrency(totalPurchase) : 'Op aanvraag'}</strong>
            </div>
            <div className="summary-row">
              <span>Winst</span>
              <strong>{selectedRate ? formatCurrency(profit) : 'Op aanvraag'}</strong>
            </div>
            <div className="summary-row total">
              <span>Verkoopprijs</span>
              <strong>{selectedRate ? formatCurrency(salesPrice) : 'Op aanvraag'}</strong>
            </div>
          </div>
          <div className="pdf-actions">
            <button className="pdf-action" onClick={() => generateQuote('nl')} type="button">
              Offerte PDF genereren
            </button>
            <button className="pdf-action secondary" onClick={() => generateQuote('en')} type="button">
              Quote PDF in English
            </button>
          </div>
        </section>
      </ResultCard>
    </div>
  );
}
