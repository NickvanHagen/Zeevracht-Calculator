import { useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, InputField, NumberInput, ResultCard, SectionCard, SelectField } from '../components';
import quoteHarborBanner from '../assets/quote-harbor-banner.png';
import tffLogo from '../assets/tff-logo.png';
import { customsFees } from '../config/customsFees';
import {
  calculateNvoLclExportFob,
  getNvoLclExportDestinationLabel,
  type NvoLclExportTariffSet,
} from '../pricing/nvoLclExport';
import { calculateNvoLclImportFob, type NvoLclImportTariffSet } from '../pricing/nvoLclImport';
import { getSluyterRate, sluyterFees } from '../pricing/sluyter';
import {
  generateLclQuotePdf,
  type LclQuoteDetails,
  type LclQuoteLanguage,
} from '../services/lclQuotePdfClient';
import {
  defaultLclSurcharges,
  fetchLclSurcharges,
  saveLclSurcharges,
  type LclSurcharges,
} from '../services/lclSurchargeService';
import { saveLclQuoteToSupabase, type QuoteStatus, type SavedQuote } from '../services/quoteService';
import type { ShipmentDirection } from '../types/shipment';
import { calculateLclCosts } from '../utils/calculateLclCosts';
import { calculateLclShipment } from '../utils/calculateLclShipment';
import { formatCurrency } from '../utils/formatCurrency';
import { formatNumber } from '../utils/formatNumber';
import { getDateInputValue, getQuoteValidityInfo } from '../utils/quoteValidity';

type LclPageProps = {
  direction: ShipmentDirection;
  newCalculationToken: number;
  nvoExportTariffs?: NvoLclExportTariffSet;
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
    isOpen && normalizedValue.length === 0
      ? options.slice(0, 8)
      : normalizedValue.length >= 2
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
      {isOpen && value.trim().length >= 2 && filteredOptions.length === 0 ? (
        <div className="autocomplete-menu autocomplete-empty">Geen haven gevonden</div>
      ) : null}
    </label>
  );
}

const getDefaultIncoterm = (direction: ShipmentDirection) => (direction === 'import' ? 'FOB' : 'CFR');

const createQuoteDetails = (direction: ShipmentDirection): LclQuoteDetails => ({
  customerName: '',
  customerReference: '',
  incoterms: getDefaultIncoterm(direction),
  loadingAddress: '',
  loadingPlace: '',
  note: '',
  route: '',
  tffReference: '',
  unloadingAddress: '',
  unloadingPlace: '',
  validity: '',
});

const DocumentIcon = () => (
  <svg height="20" viewBox="0 0 24 24" width="20">
    <path d="M6 3h8l4 4v14H6V3Zm7 1.8V8h3.2L13 4.8ZM8 12h8v1.8H8V12Zm0 4h6v1.8H8V16Z" fill="currentColor" />
  </svg>
);

const BoxIcon = () => (
  <svg height="20" viewBox="0 0 24 24" width="20">
    <path d="m12 2 9 4.8v10.4L12 22l-9-4.8V6.8L12 2Zm0 2.2L6.4 7.1 12 10l5.6-2.9L12 4.2ZM5 8.8v7.1l6 3.2V12L5 8.8Zm14 0L13 12v7.1l6-3.2V8.8Z" fill="currentColor" />
  </svg>
);

const ShipIcon = () => (
  <svg height="20" viewBox="0 0 24 24" width="20">
    <path d="M4 15 2 9h5V5h10v4h5l-2 6a7.8 7.8 0 0 1-4.3-1.3 6.4 6.4 0 0 0-7.4 0A7.8 7.8 0 0 1 4 15Zm5-6h6V7H9v2Zm-4.7 8a9.8 9.8 0 0 0 5.1-1.6 4.4 4.4 0 0 1 5.2 0 9.8 9.8 0 0 0 5.1 1.6h1.1l-.7 2h-.4a11.7 11.7 0 0 1-6.1-1.9 4.4 4.4 0 0 0-5.2 0A11.7 11.7 0 0 1 3.3 19h-.4l-.7-2h1.1Z" fill="currentColor" />
  </svg>
);

const SaveIcon = () => (
  <svg height="16" viewBox="0 0 24 24" width="16">
    <path d="M5 3h12l2 2v16H5V3Zm2 2v5h9V5H7Zm2 12h6v-4H9v4Z" fill="currentColor" />
  </svg>
);

const PdfIcon = () => (
  <svg height="16" viewBox="0 0 24 24" width="16">
    <path d="M6 2h8l5 5v15H6V2Zm7 1.8V8h4.2L13 3.8ZM8 13h2.4a2.2 2.2 0 0 1 0 4.4H9.5V20H8v-7Zm1.5 1.4V16h.8a.8.8 0 0 0 0-1.6h-.8Zm4 5.6v-7h2a3.5 3.5 0 0 1 0 7h-2Zm1.5-1.4h.5a2.1 2.1 0 0 0 0-4.2H15v4.2Zm4-5.6h4v1.4h-2.5v1.5h2V17h-2v3H19v-7Z" fill="currentColor" />
  </svg>
);

const TranslateIcon = () => (
  <svg height="16" viewBox="0 0 24 24" width="16">
    <path d="M4 4h8v2H9.6a9.9 9.9 0 0 1-1.7 3.7c.7.6 1.4 1.1 2.2 1.5l-.9 1.8A12.2 12.2 0 0 1 6.6 11a13 13 0 0 1-3.1 2.3L2.6 11.5a9.9 9.9 0 0 0 2.7-1.9A8.8 8.8 0 0 1 4 7h2a6.2 6.2 0 0 0 .7 1.2A7.5 7.5 0 0 0 7.5 6H4V4Zm8 7h3l4 9h-2.2l-.7-1.7h-5.2l-.7 1.7H8l4-9Zm-.3 5.5h3.6L13.5 12l-1.8 4.5Z" fill="currentColor" />
  </svg>
);

export function LclPage({
  direction,
  newCalculationToken,
  nvoExportTariffs,
  nvoImportTariffs,
  openedQuote,
}: LclPageProps) {
  const isImport = direction === 'import';
  const [quoteDetails, setQuoteDetails] = useState<LclQuoteDetails>(() => createQuoteDetails(direction));
  const [rows, setRows] = useState<PalletRow[]>([createPalletRow()]);
  const [customsSelected, setCustomsSelected] = useState(false);
  const [adrSelected, setAdrSelected] = useState(false);
  const [oceanFreight, setOceanFreight] = useState('');
  const [marginPercentage, setMarginPercentage] = useState('');
  const [salesPriceInput, setSalesPriceInput] = useState('');
  const [pricingInputMode, setPricingInputMode] = useState<'margin' | 'sales'>('margin');
  const [quoteNumber, setQuoteNumber] = useState('');
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>('Concept');
  const [savedQuoteId, setSavedQuoteId] = useState('');
  const [saveQuoteStatus, setSaveQuoteStatus] = useState('');
  const [saveQuoteError, setSaveQuoteError] = useState('');
  const [centralSurcharges, setCentralSurcharges] = useState<LclSurcharges>(defaultLclSurcharges);
  const [dieselPercentage, setDieselPercentage] = useState(defaultLclSurcharges.dieselPercentage);
  const [roadChargePercentage, setRoadChargePercentage] = useState(defaultLclSurcharges.roadChargePercentage);
  const [surchargeStatus, setSurchargeStatus] = useState('');
  const hasLoadedSurcharges = useRef(false);
  const shouldSaveSurcharges = useRef(false);
  const portSuggestions = useMemo(() => {
    const origins = new Set<string>();
    const destinations = new Set<string>();

    if (isImport) {
      nvoImportTariffs?.rates.forEach((rate) => {
        origins.add(rate.originCfs);
        destinations.add(rate.destinationCfs);
      });
    } else {
      nvoExportTariffs?.rates.forEach((rate) => {
        origins.add(rate.originCfs);
        destinations.add(getNvoLclExportDestinationLabel(rate));
      });
    }

    return {
      destinations: Array.from(destinations).sort((first, second) => first.localeCompare(second)),
      origins: Array.from(origins).sort((first, second) => first.localeCompare(second)),
    };
  }, [isImport, nvoExportTariffs, nvoImportTariffs]);

  const updateDieselPercentage = (value: string) => {
    shouldSaveSurcharges.current = true;
    setCentralSurcharges((current) => ({ ...current, dieselPercentage: value }));
    setDieselPercentage(value);
  };

  const updateRoadChargePercentage = (value: string) => {
    shouldSaveSurcharges.current = true;
    setCentralSurcharges((current) => ({ ...current, roadChargePercentage: value }));
    setRoadChargePercentage(value);
  };

  const updateMarginPercentage = (value: string) => {
    setPricingInputMode('margin');
    setMarginPercentage(value);
  };

  useEffect(() => {
    setCustomsSelected(false);
  }, [direction]);

  useEffect(() => {
    let isCurrent = true;

    fetchLclSurcharges()
      .then((surcharges) => {
        if (!isCurrent) {
          return;
        }

        setCentralSurcharges(surcharges);
        if (!openedQuote) {
          setDieselPercentage(surcharges.dieselPercentage);
          setRoadChargePercentage(surcharges.roadChargePercentage);
        }
        hasLoadedSurcharges.current = true;
      })
      .catch((error) => {
        if (!isCurrent) {
          return;
        }

        hasLoadedSurcharges.current = true;
        setSurchargeStatus(error instanceof Error ? error.message : 'LCL toeslagen konden niet centraal worden geladen.');
      });

    return () => {
      isCurrent = false;
    };
  }, [openedQuote]);

  useEffect(() => {
    if (!hasLoadedSurcharges.current || !shouldSaveSurcharges.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveLclSurcharges({
        dieselPercentage,
        roadChargePercentage,
      })
        .then(() => {
          shouldSaveSurcharges.current = false;
          setSurchargeStatus('LCL toeslagen centraal opgeslagen.');
        })
        .catch((error) => {
          setSurchargeStatus(error instanceof Error ? error.message : 'LCL toeslagen konden niet centraal worden opgeslagen.');
        });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [dieselPercentage, roadChargePercentage]);

  useEffect(() => {
    if (openedQuote) {
      return;
    }

    setQuoteDetails((currentDetails) => ({
      ...currentDetails,
      incoterms: getDefaultIncoterm(direction),
      loadingPlace: isImport ? '' : 'Rotterdam',
      unloadingPlace: isImport ? 'Rotterdam' : '',
    }));
  }, [direction, isImport, openedQuote]);

  useEffect(() => {
    if (!openedQuote) {
      return;
    }

    const formState = openedQuote.payload.formState;
    const restoredQuoteDetails = formState?.quoteDetails ?? {};
    const restoredRows = formState?.rows?.map(restorePalletRow) ?? [];

    setSavedQuoteId(openedQuote.id);
    setQuoteNumber(openedQuote.quoteNumber);
    setQuoteStatus(openedQuote.status ?? 'Open');
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
    const restoredSalesPriceInput = toEditableAmount(openedQuote.salesPrice || 0);

    setMarginPercentage(toText(formState?.marginPercentage) || String(openedQuote.marginPercentage || ''));
    setSalesPriceInput(restoredSalesPriceInput);
    setPricingInputMode(restoredSalesPriceInput ? 'sales' : 'margin');
    setDieselPercentage(
      toText(formState?.dieselPercentage) ||
        centralSurcharges.dieselPercentage,
    );
    setRoadChargePercentage(
      toText(formState?.roadChargePercentage) ||
        centralSurcharges.roadChargePercentage,
    );
    setSaveQuoteStatus(`Offerte ${openedQuote.quoteNumber} geopend.`);
    setSaveQuoteError('');
  }, [centralSurcharges.dieselPercentage, centralSurcharges.roadChargePercentage, openedQuote]);

  useEffect(() => {
    if (newCalculationToken === 0) {
      return;
    }

    if (openedQuote) {
      return;
    }

    setQuoteDetails(createQuoteDetails(direction));
    setRows([createPalletRow()]);
    setCustomsSelected(false);
    setAdrSelected(false);
    setOceanFreight('');
    setMarginPercentage('');
    setSalesPriceInput('');
    setPricingInputMode('margin');
    setQuoteNumber('');
    setQuoteStatus('Concept');
    setSavedQuoteId('');
    setDieselPercentage(centralSurcharges.dieselPercentage);
    setRoadChargePercentage(centralSurcharges.roadChargePercentage);
    setSaveQuoteStatus('Nieuwe calculatie gestart.');
    setSaveQuoteError('');
  }, [centralSurcharges.dieselPercentage, centralSurcharges.roadChargePercentage, direction, newCalculationToken, openedQuote]);

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
  const nvoExportCalculation =
    !isImport && quoteDetails.incoterms === 'CFR'
      ? calculateNvoLclExportFob({
          cbm: totalVolumeCbm,
          destinationCfs: quoteDetails.unloadingPlace,
          grossWeightKg: totals.actualWeight,
          tariffs: nvoExportTariffs,
        })
      : undefined;
  const exportTariffWarning =
    !isImport && quoteDetails.incoterms === 'CFR' && quoteDetails.unloadingPlace.trim() && !nvoExportCalculation
      ? nvoExportTariffs
        ? `Geen NVO LCL Export tarief gevonden voor loshaven "${quoteDetails.unloadingPlace}". Kies een haven uit de dropdown.`
        : 'Er zijn nog geen NVO LCL Export tarieven actief. Upload eerst het exporttariefbestand bij Instellingen.'
      : '';
  const oceanFreightAmount = toNumber(oceanFreight);
  const nvoFreightAmount = nvoCalculation?.totalEur ?? nvoExportCalculation?.totalEur ?? 0;
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
  const visibleQuoteStatus =
    quoteStatus === 'Verlopen' && getQuoteValidityInfo(quoteDetails.validity, quoteStatus).daysUntilExpiry !== undefined
      ? getQuoteValidityInfo(quoteDetails.validity, quoteStatus).daysUntilExpiry! >= 0
        ? 'Open'
        : quoteStatus
      : quoteStatus;

  useEffect(() => {
    if (openedQuote && savedQuoteId !== openedQuote.id) {
      return;
    }

    if (!selectedRate || pricingInputMode === 'sales') {
      return;
    }

    setSalesPriceInput(toEditableAmount(calculatedSalesPrice));
  }, [calculatedSalesPrice, openedQuote, pricingInputMode, savedQuoteId, selectedRate]);

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
    ...(nvoExportCalculation
      ? [
          {
            label: `NVO export ocean freight (${formatNumber(nvoExportCalculation.chargeableWm)} W/M)`,
            section: 'Zeevracht',
            value: formatCurrency(nvoExportCalculation.oceanFreightEur),
          },
          ...nvoExportCalculation.charges.map((charge) => ({
            label: charge.country ? `${charge.label} (${charge.country})` : charge.label,
            section: 'Zeevracht',
            value: formatCurrency(charge.totalEur),
          })),
        ]
      : []),
    { label: 'Totaal zeevracht', section: 'Zeevracht', value: formatCurrency(effectiveOceanFreightAmount), emphasis: true },
    { label: 'Sluyter tarief', section: 'Transport', value: selectedRate ? formatCurrency(baseRate) : 'Op aanvraag' },
    { label: `Kilometerheffing ${formatNumber(toNumber(roadChargePercentage))}%`, section: 'Transport', value: formatCurrency(roadCharge) },
    { label: `Dieseltoeslag ${formatNumber(toNumber(dieselPercentage))}%`, section: 'Transport', value: formatCurrency(dieselCharge) },
    { label: 'Totaal transport', section: 'Transport', value: selectedRate ? formatCurrency(transportTotal) : 'Op aanvraag', emphasis: true },
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
      window.alert('Vul minimaal Klantnaam, Incoterms en Geldig t/m in.');
      return;
    }

    if (!selectedRate) {
      window.alert('Er kan nog geen offerte worden gemaakt omdat het LCL-tarief op aanvraag staat.');
      return;
    }

    generateLclQuotePdf({
      bannerUrl: quoteHarborBanner,
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
      setSaveQuoteError('Vul minimaal Klantnaam, Incoterms en Geldig t/m in.');
      return;
    }

    if (!selectedRate) {
      setSaveQuoteError('De offerte kan nog niet worden opgeslagen omdat het LCL-tarief op aanvraag staat.');
      return;
    }

    try {
      const savedQuote = await saveLclQuoteToSupabase({
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
            salesPriceInput: toEditableAmount(salesPrice),
          },
          loadMeters: totals.loadMeters,
          palletLines: rows,
          quoteDetails,
        },
        purchasePrice: totalPurchase,
        salesPrice,
        status: visibleQuoteStatus,
        tffReference: quoteDetails.tffReference,
        unloadingPlace: quoteDetails.unloadingPlace,
        validUntil: getDateInputValue(quoteDetails.validity),
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
        <SectionCard icon={<DocumentIcon />} title="Offertegegevens">
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
              placeholder={isImport ? 'Bijv. Xiamen' : 'Rotterdam'}
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
              placeholder={isImport ? 'Bijv. Rotterdam' : 'Bijv. Sydney'}
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
              label="Geldig t/m *"
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
          {exportTariffWarning ? (
            <div className="notice-list compact-notice">
              <p>{exportTariffWarning}</p>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          icon={<BoxIcon />}
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
          icon={<ShipIcon />}
          title="LCL zeevracht en transporttoeslagen"
          description="Deze LCL dieseltoeslag en kilometerheffing worden centraal opgeslagen voor iedereen."
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
          {surchargeStatus ? <p className="settings-status compact-status">{surchargeStatus}</p> : null}
        </SectionCard>
      </div>

      <ResultCard
        actions={
          <>
            <button className="pdf-action secondary" onClick={() => void saveQuote()} type="button">
              <SaveIcon />
              Offerte opslaan
            </button>
            <button className="pdf-action" onClick={() => generateQuote('nl')} type="button">
              <PdfIcon />
              Offerte PDF genereren
            </button>
            <button className="pdf-action secondary" onClick={() => generateQuote('en')} type="button">
              <TranslateIcon />
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
