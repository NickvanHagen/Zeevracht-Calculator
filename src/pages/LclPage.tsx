import { useEffect, useMemo, useState } from 'react';
import { Checkbox, InputField, NumberInput, ResultCard, SectionCard, SelectField } from '../components';
import tffLogo from '../assets/tff-logo.png';
import { customsFees } from '../config/customsFees';
import { defaultSurcharges } from '../config/surcharges';
import { calculateNvoLclImportFob, type NvoLclImportTariffSet } from '../pricing/nvoLclImport';
import { getSluyterRate, sluyterFees } from '../pricing/sluyter';
import {
  generateLclQuotePdf,
  type LclQuoteDetails,
  type LclQuoteLanguage,
} from '../services/lclQuotePdfService';
import { saveLclQuoteToSupabase, type SavedQuote } from '../services/quoteService';
import type { ShipmentDirection } from '../types/shipment';
import { calculateLclCosts } from '../utils/calculateLclCosts';
import { calculateLclShipment } from '../utils/calculateLclShipment';
import { formatCurrency } from '../utils/formatCurrency';
import { formatNumber } from '../utils/formatNumber';

type LclPageProps = {
  appPassword: string;
  direction: ShipmentDirection;
  newCalculationToken: number;
  nvoImportTariffs?: NvoLclImportTariffSet;
  openedQuote?: SavedQuote;
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

type PortAutocompleteProps = {
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  value: string;
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

const toNumber = (value: string) => Number(value.replace(',', '.')) || 0;
const toText = (value: unknown) => (typeof value === 'string' ? value : '');
const toBoolean = (value: unknown) => (typeof value === 'boolean' ? value : false);
const toOptionalText = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined);
const LCL_DIESEL_STORAGE_KEY = 'tff-lcl-diesel-percentage';
const LCL_ROAD_CHARGE_STORAGE_KEY = 'tff-lcl-road-charge-percentage';

const getStoredPercentage = (key: string, fallback: number) => {
  const storedValue = localStorage.getItem(key);
  return storedValue && storedValue.trim() ? storedValue : String(fallback);
};

const toEditableAmount = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : '');
const toEditablePercentage = (value: number) => (Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, '') : '');

const restorePalletRow = (row: Record<string, unknown>): PalletRow => {
  const rowType = row.type === 'blokpallet' || row.type === 'custom' ? row.type : 'europallet';

  return {
    heightCm: toText(row.heightCm) || '120',
    id: toText(row.id) || crypto.randomUUID(),
    lengthCm: toText(row.lengthCm) || (rowType === 'blokpallet' ? '120' : rowType === 'europallet' ? '120' : ''),
    quantity: toText(row.quantity) || '1',
    stackable: toBoolean(row.stackable),
    type: rowType,
    weightPerItemKg: toText(row.weightPerItemKg),
    widthCm: toText(row.widthCm) || (rowType === 'blokpallet' ? '100' : rowType === 'europallet' ? '80' : ''),
  };
};

function PortAutocomplete({ label, name, onChange, options, placeholder, value }: PortAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedValue = value.trim().toLowerCase();
  const filteredOptions =
    normalizedValue.length >= 2
      ? options
          .filter((option) => option.toLowerCase().includes(normalizedValue))
          .slice(0, 8)
      : [];

  return (
    <label className="field autocomplete-field" htmlFor={name}>
      <span>{label}</span>
      <input
        autoComplete="off"
        id={name}
        name={name}
        onBlur={() => setIsOpen(false)}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      {isOpen && filteredOptions.length > 0 ? (
        <div className="autocomplete-menu">
          {filteredOptions.map((option) => (
            <button
              key={option}
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(option);
                setIsOpen(false);
              }}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}

const createQuoteDetails = (): LclQuoteDetails => ({
  customerName: '',
  customerReference: '',
  incoterms: '',
  loadingAddress: '',
  loadingPlace: '',
  note: '',
  route: '',
  tffReference: '',
  unloadingAddress: '',
  unloadingPlace: '',
  validity: '',
});

export function LclPage({
  appPassword,
  direction,
  newCalculationToken,
  nvoImportTariffs,
  openedQuote,
}: LclPageProps) {
  const isImport = direction === 'import';
  const [quoteDetails, setQuoteDetails] = useState<LclQuoteDetails>(createQuoteDetails);
  const [rows, setRows] = useState<PalletRow[]>([createPalletRow()]);
  const [customsSelected, setCustomsSelected] = useState(false);
  const [adrSelected, setAdrSelected] = useState(false);
  const [oceanFreight, setOceanFreight] = useState('');
  const [marginPercentage, setMarginPercentage] = useState('');
  const [salesPriceInput, setSalesPriceInput] = useState('');
  const [pricingInputMode, setPricingInputMode] = useState<'margin' | 'sales'>('margin');
  const [quoteNumber, setQuoteNumber] = useState('');
  const [savedQuoteId, setSavedQuoteId] = useState('');
  const [saveQuoteStatus, setSaveQuoteStatus] = useState('');
  const [saveQuoteError, setSaveQuoteError] = useState('');
  const [dieselPercentage, setDieselPercentage] = useState(() =>
    getStoredPercentage(LCL_DIESEL_STORAGE_KEY, defaultSurcharges.dieselPercentage),
  );
  const [roadChargePercentage, setRoadChargePercentage] = useState(
    () => getStoredPercentage(LCL_ROAD_CHARGE_STORAGE_KEY, defaultSurcharges.roadChargePercentage),
  );
  const portSuggestions = useMemo(() => {
    const origins = new Set<string>();
    const destinations = new Set<string>();

    nvoImportTariffs?.rates.forEach((rate) => {
      origins.add(rate.originCfs);
      destinations.add(rate.destinationCfs);
    });

    return {
      destinations: Array.from(destinations).sort((first, second) => first.localeCompare(second)),
      origins: Array.from(origins).sort((first, second) => first.localeCompare(second)),
    };
  }, [nvoImportTariffs]);

  const updateDieselPercentage = (value: string) => {
    setDieselPercentage(value);
    localStorage.setItem(LCL_DIESEL_STORAGE_KEY, value);
  };

  const updateRoadChargePercentage = (value: string) => {
    setRoadChargePercentage(value);
    localStorage.setItem(LCL_ROAD_CHARGE_STORAGE_KEY, value);
  };

  const updateMarginPercentage = (value: string) => {
    setPricingInputMode('margin');
    setMarginPercentage(value);
  };

  useEffect(() => {
    setCustomsSelected(false);
  }, [direction]);

  useEffect(() => {
    if (!openedQuote) {
      return;
    }

    const formState = openedQuote.payload.formState;
    const restoredQuoteDetails = formState?.quoteDetails ?? {};
    const restoredRows = formState?.rows?.map(restorePalletRow) ?? [];

    setSavedQuoteId(openedQuote.id);
    setQuoteNumber(openedQuote.quoteNumber);
    setQuoteDetails({
      customerName: toText(restoredQuoteDetails.customerName) || openedQuote.customerName,
      customerReference: toText(restoredQuoteDetails.customerReference) || openedQuote.customerReference,
      incoterms: toText(restoredQuoteDetails.incoterms) || openedQuote.incoterms,
      loadingAddress: toText(restoredQuoteDetails.loadingAddress),
      loadingPlace: toText(restoredQuoteDetails.loadingPlace) || openedQuote.loadingPlace,
      note: toText(restoredQuoteDetails.note),
      route: '',
      tffReference: toText(restoredQuoteDetails.tffReference) || openedQuote.tffReference,
      unloadingAddress: toText(restoredQuoteDetails.unloadingAddress),
      unloadingPlace: toText(restoredQuoteDetails.unloadingPlace) || openedQuote.unloadingPlace,
      validity: toText(restoredQuoteDetails.validity) || openedQuote.validity,
    });
    setRows(restoredRows.length > 0 ? restoredRows : [createPalletRow()]);
    setCustomsSelected(toBoolean(formState?.customsSelected));
    setAdrSelected(toBoolean(formState?.adrSelected));
    setOceanFreight(toText(formState?.oceanFreight));
    const restoredSalesPriceInput = toOptionalText(formState?.salesPriceInput) ?? toEditableAmount(openedQuote.salesPrice || 0);

    setMarginPercentage(toText(formState?.marginPercentage) || String(openedQuote.marginPercentage || ''));
    setSalesPriceInput(restoredSalesPriceInput);
    setPricingInputMode(restoredSalesPriceInput ? 'sales' : 'margin');
    setDieselPercentage(
      toText(formState?.dieselPercentage) ||
        getStoredPercentage(LCL_DIESEL_STORAGE_KEY, defaultSurcharges.dieselPercentage),
    );
    setRoadChargePercentage(
      toText(formState?.roadChargePercentage) ||
        getStoredPercentage(LCL_ROAD_CHARGE_STORAGE_KEY, defaultSurcharges.roadChargePercentage),
    );
    setSaveQuoteStatus(`Offerte ${openedQuote.quoteNumber} geopend.`);
    setSaveQuoteError('');
  }, [openedQuote]);

  useEffect(() => {
    if (newCalculationToken === 0) {
      return;
    }

    if (openedQuote) {
      return;
    }

    setQuoteDetails(createQuoteDetails());
    setRows([createPalletRow()]);
    setCustomsSelected(false);
    setAdrSelected(false);
    setOceanFreight('');
    setMarginPercentage('');
    setSalesPriceInput('');
    setPricingInputMode('margin');
    setQuoteNumber('');
    setSavedQuoteId('');
    setDieselPercentage(getStoredPercentage(LCL_DIESEL_STORAGE_KEY, defaultSurcharges.dieselPercentage));
    setRoadChargePercentage(getStoredPercentage(LCL_ROAD_CHARGE_STORAGE_KEY, defaultSurcharges.roadChargePercentage));
    setSaveQuoteStatus('Nieuwe calculatie gestart.');
    setSaveQuoteError('');
  }, [newCalculationToken, openedQuote]);

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
  const totalVolumeCbm = rows.reduce((total, row) => {
    const quantity = Math.max(0, Math.floor(toNumber(row.quantity)));
    const lengthCm = toNumber(row.lengthCm);
    const widthCm = toNumber(row.widthCm);
    const heightCm = toNumber(row.heightCm);

    if (quantity <= 0 || lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
      return total;
    }

    return total + (quantity * lengthCm * widthCm * heightCm) / 1_000_000;
  }, 0);
  const nvoCalculation =
    isImport && quoteDetails.incoterms === 'FOB'
      ? calculateNvoLclImportFob({
          cbm: totalVolumeCbm,
          destinationCfs: quoteDetails.unloadingPlace || 'Rotterdam',
          grossWeightKg: totals.actualWeight,
          originCfs: quoteDetails.loadingPlace,
          tariffs: nvoImportTariffs,
        })
      : undefined;
  const oceanFreightAmount = toNumber(oceanFreight);
  const nvoFreightAmount = nvoCalculation?.totalEur ?? 0;
  const effectiveOceanFreightAmount = oceanFreightAmount + nvoFreightAmount;
  const baseRate = selectedRate?.rate ?? 0;
  const customsCharge = customsSelected
    ? isImport
      ? customsFees.importClearance
      : customsFees.exportClearance
    : 0;
  const adrCharge = adrSelected ? sluyterFees.adr : 0;
  const { dieselCharge, profit: calculatedProfit, roadCharge, salesPrice: calculatedSalesPrice, totalPurchase } = calculateLclCosts({
    adrCharge,
    baseRate,
    customsCharge,
    dieselPercentage: toNumber(dieselPercentage),
    marginPercentage: toNumber(marginPercentage),
    oceanFreight: effectiveOceanFreightAmount,
    roadChargePercentage: toNumber(roadChargePercentage),
  });
  const manualSalesPrice = toNumber(salesPriceInput);
  const hasManualSalesPrice = pricingInputMode === 'sales' && salesPriceInput.trim() !== '';
  const salesPrice = hasManualSalesPrice ? Math.max(0, manualSalesPrice) : calculatedSalesPrice;
  const profit = selectedRate ? salesPrice - totalPurchase : calculatedProfit;
  const effectiveMarginPercentage =
    selectedRate && totalPurchase > 0 ? (profit / totalPurchase) * 100 : toNumber(marginPercentage);
  const transportTotal = baseRate + roadCharge + dieselCharge;

  useEffect(() => {
    if (!selectedRate || pricingInputMode === 'sales') {
      return;
    }

    setSalesPriceInput(toEditableAmount(calculatedSalesPrice));
  }, [calculatedSalesPrice, pricingInputMode, selectedRate]);

  useEffect(() => {
    if (!selectedRate || pricingInputMode !== 'sales' || !salesPriceInput.trim() || totalPurchase <= 0) {
      return;
    }

    setMarginPercentage(toEditablePercentage(((toNumber(salesPriceInput) - totalPurchase) / totalPurchase) * 100));
  }, [pricingInputMode, salesPriceInput, selectedRate, totalPurchase]);

  const updateSalesPrice = (value: string) => {
    setPricingInputMode('sales');
    setSalesPriceInput(value);

    const nextSalesPrice = toNumber(value);
    if (totalPurchase > 0 && value.trim()) {
      setMarginPercentage(toEditablePercentage(((nextSalesPrice - totalPurchase) / totalPurchase) * 100));
    }
  };

  const resultRows = [
    ...(oceanFreightAmount > 0
      ? [{ label: 'Zeevracht handmatig', section: 'Zeevracht', value: formatCurrency(oceanFreightAmount) }]
      : []),
    ...(nvoCalculation
      ? [
          {
            label: `NVO ocean freight (${formatNumber(nvoCalculation.chargeableWm)} W/M)`,
            section: 'Zeevracht',
            value: formatCurrency(nvoCalculation.oceanFreightEur),
          },
          ...nvoCalculation.usaImportCharges.map((charge) => ({
            label: charge.label,
            section: 'Zeevracht',
            value: formatCurrency(charge.totalEur),
          })),
          ...(nvoCalculation.strippingCharges
            ? [
                {
                  label: 'NVO stripping charges',
                  section: 'Zeevracht',
                  value: formatCurrency(nvoCalculation.strippingCharges.totalEur),
                },
              ]
            : []),
          ...(nvoCalculation.deliveryOrderFee
            ? [
                {
                  label: 'NVO Delivery Order fee',
                  section: 'Zeevracht',
                  value: formatCurrency(nvoCalculation.deliveryOrderFee.amountEur),
                },
              ]
            : []),
        ]
      : []),
    { label: 'Totaal', section: 'Zeevracht', value: formatCurrency(effectiveOceanFreightAmount), emphasis: true },
    { label: 'Sluyter tarief', section: 'Transport', value: selectedRate ? formatCurrency(baseRate) : 'Op aanvraag' },
    { label: `Kilometerheffing ${formatNumber(toNumber(roadChargePercentage))}%`, section: 'Transport', value: formatCurrency(roadCharge) },
    { label: `Dieseltoeslag ${formatNumber(toNumber(dieselPercentage))}%`, section: 'Transport', value: formatCurrency(dieselCharge) },
    { label: 'Totaal', section: 'Transport', value: selectedRate ? formatCurrency(transportTotal) : 'Op aanvraag', emphasis: true },
    ...(customsSelected
      ? [{ label: isImport ? 'Inklaring' : 'Uitklaring', section: 'Douane', value: formatCurrency(customsCharge) }]
      : []),
    ...(adrSelected ? [{ label: 'ADR', section: 'Overige toeslagen', value: formatCurrency(adrCharge) }] : []),
    { label: 'Totaal inkoop', section: 'Totaal', value: selectedRate ? formatCurrency(totalPurchase) : 'Op aanvraag', emphasis: true },
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
      quoteNumber,
      salesPrice: formatCurrency(salesPrice),
    });
  };

  const saveQuote = async () => {
    setSaveQuoteStatus('');
    setSaveQuoteError('');

    if (!quoteDetails.customerName.trim() || !quoteDetails.incoterms.trim() || !quoteDetails.validity.trim()) {
      setSaveQuoteError('Vul minimaal Klantnaam, Incoterms en Geldigheid offerte in.');
      return;
    }

    if (!selectedRate) {
      setSaveQuoteError('De offerte kan nog niet worden opgeslagen omdat het LCL-tarief op aanvraag staat.');
      return;
    }

    try {
      const savedQuote = await saveLclQuoteToSupabase(appPassword, {
        customerName: quoteDetails.customerName,
        customerReference: quoteDetails.customerReference,
        direction,
        existingQuoteId: savedQuoteId || undefined,
        incoterms: quoteDetails.incoterms,
        loadingPlace: quoteDetails.loadingPlace,
        marginPercentage: effectiveMarginPercentage,
        mode: 'lcl',
        payload: {
          costs: {
            customsCharge,
            dieselCharge,
            effectiveOceanFreightAmount,
            profit,
            roadCharge,
            salesPrice,
            totalPurchase,
            transportTotal,
          },
          formState: {
            adrSelected,
            customsSelected,
            dieselPercentage,
            marginPercentage,
            oceanFreight,
            pricingInputMode,
            quoteDetails,
            roadChargePercentage,
            rows,
            salesPriceInput,
          },
          loadMeters: totals.loadMeters,
          palletLines: rows,
          quoteDetails,
        },
        purchasePrice: totalPurchase,
        salesPrice,
        tffReference: quoteDetails.tffReference,
        unloadingPlace: quoteDetails.unloadingPlace,
        validity: quoteDetails.validity,
      });
      setSavedQuoteId(savedQuote.id);
      setQuoteNumber(savedQuote.quoteNumber);
      setSaveQuoteStatus(
        savedQuoteId
          ? `Offerte bijgewerkt: ${savedQuote.quoteNumber}.`
          : `Offerte opgeslagen: ${savedQuote.quoteNumber}.`,
      );
    } catch (error) {
      setSaveQuoteError(error instanceof Error ? error.message : 'Offerte kon niet worden opgeslagen.');
    }
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
            <PortAutocomplete
              label="Laadhaven"
              name="loadingPlace"
              onChange={(value) => updateQuoteDetails('loadingPlace', value)}
              options={portSuggestions.origins}
              placeholder="Bijv. Xiamen"
              value={quoteDetails.loadingPlace}
            />
            <InputField
              label="Laadadres"
              name="loadingAddress"
              onChange={(event) => updateQuoteDetails('loadingAddress', event.target.value)}
              placeholder="Straat, postcode, plaats"
              type="text"
              value={quoteDetails.loadingAddress}
            />
            <PortAutocomplete
              label="Loshaven"
              name="unloadingPlace"
              onChange={(value) => updateQuoteDetails('unloadingPlace', value)}
              options={portSuggestions.destinations}
              placeholder="Bijv. Rotterdam"
              value={quoteDetails.unloadingPlace}
            />
            <InputField
              label="Losadres"
              name="unloadingAddress"
              onChange={(event) => updateQuoteDetails('unloadingAddress', event.target.value)}
              placeholder="Straat, postcode, plaats"
              type="text"
              value={quoteDetails.unloadingAddress}
            />
            <InputField
              label="Geldigheid offerte *"
              name="validity"
              onChange={(event) => updateQuoteDetails('validity', event.target.value)}
              type="date"
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
          headerContent={
            <div className="shipment-live-metrics">
              <div>
                <span>Laadmeters</span>
                <strong>{formatNumber(totals.loadMeters)} ldm</strong>
              </div>
              <div>
                <span>Werkelijk gewicht</span>
                <strong>{formatNumber(totals.actualWeight, 0)} kg</strong>
              </div>
              <div>
                <span>Betalend gewicht</span>
                <strong>{formatNumber(totals.chargeableWeight, 0)} kg</strong>
              </div>
            </div>
          }
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

        <SectionCard
          title="LCL zeevracht en transporttoeslagen"
          description="Deze dieseltoeslag en kilometerheffing worden voor LCL onthouden wanneer je ze wijzigt."
        >
          <form className="form-grid">
            <NumberInput
              label="Zeevracht handmatig (€)"
              name="oceanFreight"
              onChange={(event) => setOceanFreight(event.target.value)}
              placeholder="0,00"
              value={oceanFreight}
            />
            <NumberInput
              label="Kilometerheffing (%)"
              name="roadCharge"
              onChange={(event) => updateRoadChargePercentage(event.target.value)}
              placeholder="0"
              value={roadChargePercentage}
            />
            <NumberInput
              label="Dieseltoeslag (%)"
              name="fuelSurcharge"
              onChange={(event) => updateDieselPercentage(event.target.value)}
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

      <ResultCard
        actions={
          <>
            <button className="pdf-action secondary" onClick={() => void saveQuote()} type="button">
              Offerte opslaan
            </button>
            <button className="pdf-action" onClick={() => generateQuote('nl')} type="button">
              Offerte PDF genereren
            </button>
            <button className="pdf-action secondary" onClick={() => generateQuote('en')} type="button">
              Quote PDF in English
            </button>
            {saveQuoteStatus ? <p className="settings-status quote-save-message">{saveQuoteStatus}</p> : null}
            {saveQuoteError ? <p className="settings-error quote-save-message">{saveQuoteError}</p> : null}
          </>
        }
        commercialSummary={
          <>
            <div className="result-margin-control">
              <span>Marge (%)</span>
              <input
                aria-label="Marge percentage"
                inputMode="decimal"
                name="marginPercentage"
                onChange={(event) => updateMarginPercentage(event.target.value)}
                placeholder="0"
                step="0.01"
                type="number"
                value={marginPercentage}
              />
            </div>
            <div>
              <span>Winst</span>
              <strong>{selectedRate ? formatCurrency(profit) : 'Op aanvraag'}</strong>
            </div>
            <div className="result-sales-control">
              <span>Verkoopprijs (€)</span>
              <input
                aria-label="Verkoopprijs"
                inputMode="decimal"
                name="salesPrice"
                onChange={(event) => updateSalesPrice(event.target.value)}
                placeholder="0,00"
                step="0.01"
                type="number"
                value={salesPriceInput}
              />
            </div>
          </>
        }
        quoteNumber={quoteNumber}
        rows={resultRows}
        title="LCL overzicht"
        totalPurchase={selectedRate ? formatCurrency(totalPurchase) : 'Op aanvraag'}
      />
    </div>
  );
}
