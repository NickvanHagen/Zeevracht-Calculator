import { useEffect, useMemo, useState } from 'react';
import { Checkbox, InputField, NumberInput, ResultCard, SectionCard, SelectField } from '../components';
import quoteHarborBanner from '../assets/quote-harbor-banner.png';
import tffLogo from '../assets/tff-logo.png';
import { customsFees } from '../config/customsFees';
import { containerTypeOptions } from '../config/options';
import {
  calculateJgtFcl,
  jgtCityOptions,
  jgtFixedSurcharges,
  jgtVisitSurcharges,
} from '../pricing/jgt';
import {
  generateLclQuotePdf,
  type LclQuoteDetails,
  type LclQuoteLanguage,
} from '../services/lclQuotePdfClient';
import { saveQuoteToSupabase, type QuoteStatus, type SavedQuote } from '../services/quoteService';
import type { ContainerType, FclTerminal, FclVisitSurcharge, FclWeightCategory } from '../types/fcl';
import type { ShipmentDirection } from '../types/shipment';
import { formatCurrency } from '../utils/formatCurrency';
import { formatNumber } from '../utils/formatNumber';
import { getDateInputValue, getQuoteValidityInfo } from '../utils/quoteValidity';

type FclPageProps = {
  direction: ShipmentDirection;
  newCalculationToken: number;
  openedQuote?: SavedQuote;
};

const carrierOptions = [{ label: 'JGT', value: 'jgt' }];

const terminalOptions: Array<{ label: string; value: FclTerminal }> = [
  { label: 'Euromax', value: 'euromax' },
  { label: 'Delta', value: 'delta' },
  { label: 'Botlek', value: 'botlek' },
];

const weightCategoryOptions: Array<{ label: string; value: FclWeightCategory }> = [
  { label: 'Onder 18 ton', value: 'under18t' },
  { label: '18 ton of meer', value: 'over18t' },
];

const incotermOptions = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'].map(
  (incoterm) => ({ label: incoterm, value: incoterm }),
);

const visitSurchargeOptions: Array<{ label: string; value: FclVisitSurcharge }> = [
  { label: 'Geen', value: 'none' },
  { label: `RWG (${formatCurrency(jgtVisitSurcharges.rwg.surcharge)})`, value: 'rwg' },
  { label: `ECT/EMX/HPD2 (${formatCurrency(jgtVisitSurcharges.ectEmxHpd2.surcharge)})`, value: 'ectEmxHpd2' },
  { label: `Quay 1700/1718/1742/869/913 (${formatCurrency(jgtVisitSurcharges.quay.surcharge)})`, value: 'quay' },
];

const toNumber = (value: string) => Number(value) || 0;
const toText = (value: unknown) => (typeof value === 'string' ? value : '');
const toBoolean = (value: unknown) => (typeof value === 'boolean' ? value : false);

const createQuoteDetails = (direction: ShipmentDirection): LclQuoteDetails => ({
  customerName: '',
  customerReference: '',
  incoterms: direction === 'import' ? 'FOB' : 'CFR',
  loadingAddress: '',
  loadingPlace: direction === 'import' ? 'Rotterdam' : '',
  note: '',
  route: '',
  tffReference: '',
  unloadingAddress: '',
  unloadingPlace: direction === 'import' ? '' : 'Rotterdam',
  validity: '',
});

export function FclPage({ direction, newCalculationToken, openedQuote }: FclPageProps) {
  const [quoteDetails, setQuoteDetails] = useState<LclQuoteDetails>(() => createQuoteDetails(direction));
  const [city, setCity] = useState('');
  const [containerType, setContainerType] = useState<ContainerType>('20ft');
  const [weightCategory, setWeightCategory] = useState<FclWeightCategory>('under18t');
  const [terminal, setTerminal] = useState<FclTerminal>('euromax');
  const [pickupVisitSurcharge, setPickupVisitSurcharge] = useState<FclVisitSurcharge>('none');
  const [dropoffVisitSurcharge, setDropoffVisitSurcharge] = useState<FclVisitSurcharge>('none');
  const [dieselPercentage, setDieselPercentage] = useState('');
  const [oceanFreight, setOceanFreight] = useState('');
  const [customsSelected, setCustomsSelected] = useState(false);
  const [gensetSelected, setGensetSelected] = useState(false);
  const [adrSelected, setAdrSelected] = useState(false);
  const [marginPercentage, setMarginPercentage] = useState('');
  const [quoteNumber, setQuoteNumber] = useState('');
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>('Concept');
  const [savedQuoteId, setSavedQuoteId] = useState('');
  const [saveQuoteStatus, setSaveQuoteStatus] = useState('');
  const [saveQuoteError, setSaveQuoteError] = useState('');
  const isImport = direction === 'import';

  useEffect(() => {
    setCustomsSelected(false);
  }, [direction]);

  useEffect(() => {
    if (containerType === '40ft') {
      setWeightCategory('under18t');
    }
  }, [containerType]);

  useEffect(() => {
    if (openedQuote) {
      return;
    }

    setQuoteDetails((currentDetails) => ({
      ...currentDetails,
      incoterms: direction === 'import' ? 'FOB' : 'CFR',
      loadingPlace: direction === 'import' ? 'Rotterdam' : '',
      unloadingPlace: direction === 'import' ? '' : 'Rotterdam',
    }));
  }, [direction, openedQuote]);

  useEffect(() => {
    if (!openedQuote || openedQuote.mode !== 'fcl') {
      return;
    }

    const formState = openedQuote.payload.formState ?? {};
    const restoredQuoteDetails = formState.quoteDetails ?? {};

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
    setCity(toText(formState.city));
    setContainerType(toText(formState.containerType) === '40ft' ? '40ft' : '20ft');
    setWeightCategory(toText(formState.weightCategory) === 'over18t' ? 'over18t' : 'under18t');
    setTerminal(['euromax', 'delta', 'botlek'].includes(toText(formState.terminal)) ? toText(formState.terminal) as FclTerminal : 'euromax');
    setPickupVisitSurcharge(toText(formState.pickupVisitSurcharge) as FclVisitSurcharge || 'none');
    setDropoffVisitSurcharge(toText(formState.dropoffVisitSurcharge) as FclVisitSurcharge || 'none');
    setDieselPercentage(toText(formState.dieselPercentage));
    setOceanFreight(toText(formState.oceanFreight));
    setCustomsSelected(toBoolean(formState.customsSelected));
    setGensetSelected(toBoolean(formState.gensetSelected));
    setAdrSelected(toBoolean(formState.adrSelected));
    setMarginPercentage(toText(formState.marginPercentage) || String(openedQuote.marginPercentage || ''));
    setSaveQuoteStatus(`Offerte ${openedQuote.quoteNumber} geopend.`);
    setSaveQuoteError('');
  }, [openedQuote]);

  useEffect(() => {
    if (newCalculationToken === 0 || openedQuote) {
      return;
    }

    setQuoteDetails(createQuoteDetails(direction));
    setCity('');
    setContainerType('20ft');
    setWeightCategory('under18t');
    setTerminal('euromax');
    setPickupVisitSurcharge('none');
    setDropoffVisitSurcharge('none');
    setDieselPercentage('');
    setOceanFreight('');
    setCustomsSelected(false);
    setGensetSelected(false);
    setAdrSelected(false);
    setMarginPercentage('');
    setQuoteNumber('');
    setQuoteStatus('Concept');
    setSavedQuoteId('');
    setSaveQuoteStatus('Nieuwe calculatie gestart.');
    setSaveQuoteError('');
  }, [direction, newCalculationToken, openedQuote]);

  const calculation = useMemo(
    () =>
      calculateJgtFcl({
        adrCharge: jgtFixedSurcharges.defaultAdr,
        adrSelected,
        city,
        containerType,
        customsCharge: isImport ? customsFees.importClearance : customsFees.exportClearance,
        customsSelected,
        dieselPercentage: toNumber(dieselPercentage),
        gensetCharge: jgtFixedSurcharges.defaultGenset,
        gensetSelected,
        marginPercentage: toNumber(marginPercentage),
        oceanFreight: toNumber(oceanFreight),
        terminal,
        dropoffVisitSurcharge,
        pickupVisitSurcharge,
        weightCategory,
      }),
    [
      adrSelected,
      city,
      containerType,
      customsSelected,
      dieselPercentage,
      gensetSelected,
      isImport,
      marginPercentage,
      oceanFreight,
      terminal,
      dropoffVisitSurcharge,
      pickupVisitSurcharge,
      weightCategory,
    ],
  );

  const hasRate = Boolean(calculation.rateRow);
  const visibleQuoteStatus =
    quoteStatus === 'Verlopen' && getQuoteValidityInfo(quoteDetails.validity, quoteStatus).daysUntilExpiry !== undefined
      ? getQuoteValidityInfo(quoteDetails.validity, quoteStatus).daysUntilExpiry! >= 0
        ? 'Open'
        : quoteStatus
      : quoteStatus;
  const quoteLoadingPlace = quoteDetails.loadingPlace || (isImport ? 'Rotterdam' : city);
  const quoteUnloadingPlace = quoteDetails.unloadingPlace || (isImport ? city : 'Rotterdam');
  const resultRows = [
    { label: 'Richting', value: direction === 'import' ? 'Import' : 'Export' },
    { label: 'Plaatsnaam', value: calculation.city || '-' },
    { label: 'Werkelijke KM', value: calculation.km ? `${formatNumber(calculation.km, 0)} km` : '-' },
    {
      label: 'Tariefschijf',
      value: calculation.rateRow ? `t/m ${formatNumber(calculation.rateRow.maxKm, 0)} km` : '-',
    },
    { label: 'Containertype', value: containerType === '20ft' ? '20ft' : '40ft' },
    ...(containerType === '20ft'
      ? [
          {
            label: 'Gewichtscategorie',
            value: weightCategory === 'under18t' ? 'Onder 18 ton' : '18 ton of meer',
          },
        ]
      : []),
    ...(calculation.ratedContainerType !== containerType
      ? [{ label: 'Tariefbasis', value: `${calculation.ratedContainerType}-tarief` }]
      : []),
    { label: 'Zeevracht', value: formatCurrency(calculation.oceanFreight) },
    {
      label: 'Kaal transporttarief',
      value: hasRate ? formatCurrency(calculation.baseTransportRate) : '-',
    },
    {
      label: `${calculation.terminalLabel} km-toeslag`,
      value: formatCurrency(calculation.terminalSurcharge),
    },
    ...calculation.visitSurcharges.map((line) => ({
      label: line.label,
      value: formatCurrency(line.amount),
    })),
    ...(calculation.visitSurcharges.length > 1
      ? [{ label: 'Totaal bezoektoeslag', value: formatCurrency(calculation.visitSurcharge) }]
      : []),
    {
      label: `Dieseltoeslag ${formatNumber(toNumber(dieselPercentage))}%`,
      value: hasRate ? formatCurrency(calculation.dieselCharge) : '-',
    },
    { label: 'Tol', value: hasRate ? formatCurrency(calculation.toll) : '-' },
    { label: 'Congestietoeslag', value: formatCurrency(calculation.congestionCharge) },
    { label: 'Portbase toeslag', value: formatCurrency(calculation.portbaseCharge) },
    ...(customsSelected
      ? [{ label: isImport ? 'Inklaring' : 'Uitklaring', value: formatCurrency(calculation.customsCharge) }]
      : []),
    ...(gensetSelected ? [{ label: 'Genset toeslag', value: formatCurrency(calculation.gensetCharge) }] : []),
    ...(adrSelected ? [{ label: 'ADR toeslag', value: formatCurrency(calculation.adrCharge) }] : []),
    {
      label: 'Totaal inkoop',
      value: hasRate ? formatCurrency(calculation.totalPurchase) : '-',
      emphasis: true,
    },
  ];

  const updateQuoteDetails = <TKey extends keyof LclQuoteDetails>(
    key: TKey,
    value: LclQuoteDetails[TKey],
  ) => {
    setQuoteDetails((currentDetails) => ({ ...currentDetails, [key]: value }));
  };

  const validateQuoteInput = () => {
    if (!quoteDetails.customerName.trim() || !quoteDetails.incoterms.trim() || !quoteDetails.validity.trim()) {
      return 'Vul minimaal Klantnaam, Incoterms en Geldig t/m in.';
    }

    if (!hasRate) {
      return 'De offerte kan nog niet worden verwerkt omdat er geen FCL-tarief is gevonden.';
    }

    return '';
  };

  const generateQuote = (language: LclQuoteLanguage) => {
    const validationError = validateQuoteInput();
    if (validationError) {
      window.alert(validationError);
      return;
    }

    generateLclQuotePdf({
      bannerUrl: quoteHarborBanner,
      details: {
        ...quoteDetails,
        loadingPlace: quoteLoadingPlace,
        unloadingPlace: quoteUnloadingPlace,
      },
      direction,
      language,
      loadMeters: `${containerType} ${weightCategory === 'over18t' ? '>= 18 ton' : '< 18 ton'}`,
      logoUrl: tffLogo,
      mode: 'fcl',
      palletLines: [],
      quoteNumber,
      salesPrice: formatCurrency(calculation.salesPrice),
      shipmentLines: [
        {
          dimensions: `${calculation.city || city || '-'} / ${calculation.km ? `${formatNumber(calculation.km, 0)} km` : '-'}`,
          quantity: '1',
          type: `${containerType}${calculation.ratedContainerType !== containerType ? ` (${calculation.ratedContainerType}-tarief)` : ''}`,
          weightPerItem: weightCategory === 'over18t' ? '18 ton of meer' : 'Onder 18 ton',
        },
      ],
    });
  };

  const saveQuote = async () => {
    setSaveQuoteStatus('');
    setSaveQuoteError('');

    const validationError = validateQuoteInput();
    if (validationError) {
      setSaveQuoteError(validationError);
      return;
    }

    try {
      const savedQuote = await saveQuoteToSupabase({
        customerName: quoteDetails.customerName,
        customerReference: quoteDetails.customerReference,
        direction,
        existingQuoteId: savedQuoteId || undefined,
        incoterms: quoteDetails.incoterms,
        loadingPlace: quoteLoadingPlace,
        marginPercentage: calculation.marginPercentage,
        mode: 'fcl',
        payload: {
          costs: {
            baseTransportRate: calculation.baseTransportRate,
            congestionCharge: calculation.congestionCharge,
            customsCharge: calculation.customsCharge,
            dieselCharge: calculation.dieselCharge,
            km: calculation.km,
            oceanFreight: calculation.oceanFreight,
            portbaseCharge: calculation.portbaseCharge,
            profit: calculation.profit,
            salesPrice: calculation.salesPrice,
            terminalSurcharge: calculation.terminalSurcharge,
            toll: calculation.toll,
            totalPurchase: calculation.totalPurchase,
            visitSurcharge: calculation.visitSurcharge,
          },
          formState: {
            adrSelected,
            city,
            containerType,
            customsSelected,
            dieselPercentage,
            dropoffVisitSurcharge,
            gensetSelected,
            marginPercentage,
            oceanFreight,
            pickupVisitSurcharge,
            quoteDetails: {
              ...quoteDetails,
              loadingPlace: quoteLoadingPlace,
              unloadingPlace: quoteUnloadingPlace,
            },
            terminal,
            weightCategory,
          },
          quoteDetails: {
            ...quoteDetails,
            loadingPlace: quoteLoadingPlace,
            unloadingPlace: quoteUnloadingPlace,
          },
        },
        purchasePrice: calculation.totalPurchase,
        salesPrice: calculation.salesPrice,
        status: visibleQuoteStatus,
        tffReference: quoteDetails.tffReference,
        unloadingPlace: quoteUnloadingPlace,
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
    <div className="page-grid">
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
            label="Laadhaven"
            name="loadingPlace"
            onChange={(event) => updateQuoteDetails('loadingPlace', event.target.value)}
            placeholder={isImport ? 'Rotterdam' : 'Bijv. Rotterdam'}
            type="text"
            value={quoteDetails.loadingPlace}
          />
          <InputField
            label="Loshaven"
            name="unloadingPlace"
            onChange={(event) => updateQuoteDetails('unloadingPlace', event.target.value)}
            placeholder={isImport ? 'Bijv. Rotterdam' : 'Rotterdam'}
            type="text"
            value={quoteDetails.unloadingPlace}
          />
          <InputField
            label="Geldig t/m *"
            name="validity"
            onChange={(event) => updateQuoteDetails('validity', event.target.value)}
            type="date"
            value={quoteDetails.validity}
          />
          <label className="field quote-note" htmlFor="fcl-quote-note">
            <span>Opmerking / omschrijving</span>
            <textarea
              id="fcl-quote-note"
              name="quoteNote"
              onChange={(event) => updateQuoteDetails('note', event.target.value)}
              rows={3}
              value={quoteDetails.note}
            />
          </label>
          </form>
        </SectionCard>
        <SectionCard
          title="FCL zending"
          description="JGT transporttarief op basis van plaats, kilometers en containertype."
        >
          <form className="form-grid">
          <SelectField label="Vervoerder" name="carrier" options={carrierOptions} value="jgt" disabled />
          <InputField
            label="Plaatsnaam"
            list="jgt-city-options"
            name="city"
            onChange={(event) => setCity(event.target.value)}
            placeholder="Bijv. Joure"
            type="text"
            value={city}
          />
          <SelectField
            label="Containertype"
            name="containerType"
            onChange={(event) => setContainerType(event.target.value as ContainerType)}
            options={containerTypeOptions}
            value={containerType}
          />
          {containerType === '20ft' ? (
            <SelectField
              label="Gewicht"
              name="weightCategory"
              onChange={(event) => setWeightCategory(event.target.value as FclWeightCategory)}
              options={weightCategoryOptions}
              value={weightCategory}
            />
          ) : null}
          <SelectField
            label="Terminal/toeslagkeuze"
            name="terminal"
            onChange={(event) => setTerminal(event.target.value as FclTerminal)}
            options={terminalOptions}
            value={terminal}
          />
          <div className="visit-surcharge-card">
            <div className="visit-surcharge-heading">
              <span>Bezoektoeslagen</span>
            </div>
            <SelectField
              label="Uithalen"
              name="pickupVisitSurcharge"
              onChange={(event) => setPickupVisitSurcharge(event.target.value as FclVisitSurcharge)}
              options={visitSurchargeOptions}
              value={pickupVisitSurcharge}
            />
            <SelectField
              label="Leeg inleveren"
              name="dropoffVisitSurcharge"
              onChange={(event) => setDropoffVisitSurcharge(event.target.value as FclVisitSurcharge)}
              options={visitSurchargeOptions}
              value={dropoffVisitSurcharge}
            />
          </div>
          <NumberInput
            label="Dieseltoeslag (%)"
            name="dieselPercentage"
            onChange={(event) => setDieselPercentage(event.target.value)}
            placeholder="0"
            value={dieselPercentage}
          />
          <NumberInput
            label="Zeevracht (€)"
            name="oceanFreight"
            onChange={(event) => setOceanFreight(event.target.value)}
            placeholder="0,00"
            value={oceanFreight}
          />

          <div className="checkbox-group" aria-label="FCL opties">
            <Checkbox
              checked={customsSelected}
              label={`${isImport ? 'Inklaring' : 'Uitklaring'} (${formatCurrency(
                isImport ? customsFees.importClearance : customsFees.exportClearance,
              )})`}
              name={isImport ? 'customsImport' : 'customsExport'}
              onChange={(event) => setCustomsSelected(event.target.checked)}
            />
            <Checkbox
              checked={gensetSelected}
              label={`Genset (${formatCurrency(jgtFixedSurcharges.defaultGenset)})`}
              name="genset"
              onChange={(event) => setGensetSelected(event.target.checked)}
            />
            <Checkbox
              checked={adrSelected}
              label={`ADR (${formatCurrency(jgtFixedSurcharges.defaultAdr)})`}
              name="adr"
              onChange={(event) => setAdrSelected(event.target.checked)}
            />
          </div>
          </form>

          <datalist id="jgt-city-options">
            {jgtCityOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>

          {calculation.errors.length > 0 ? (
            <div className="notice-list" role="alert">
              {calculation.errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}

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
        quoteNumber={quoteNumber}
        rows={resultRows}
        salesPrice={hasRate ? formatCurrency(calculation.salesPrice) : '-'}
        title="FCL overzicht"
        totalPurchase={hasRate ? formatCurrency(calculation.totalPurchase) : '-'}
      >
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
              <strong>{hasRate ? formatCurrency(calculation.totalPurchase) : '-'}</strong>
            </div>
            <div className="summary-row">
              <span>Winst</span>
              <strong>{hasRate ? formatCurrency(calculation.profit) : '-'}</strong>
            </div>
            <div className="summary-row total">
              <span>Verkoopprijs</span>
              <strong>{hasRate ? formatCurrency(calculation.salesPrice) : '-'}</strong>
            </div>
          </div>
        </section>
      </ResultCard>
    </div>
  );
}
