import { useEffect, useMemo, useState } from 'react';
import { Checkbox, InputField, NumberInput, ResultCard, SectionCard, SelectField } from '../components';
import { customsFees } from '../config/customsFees';
import { containerTypeOptions } from '../config/options';
import {
  calculateJgtFcl,
  jgtCityOptions,
  jgtFixedSurcharges,
  jgtVisitSurcharges,
} from '../pricing/jgt';
import type { ContainerType, FclTerminal, FclVisitSurcharge, FclWeightCategory } from '../types/fcl';
import type { ShipmentDirection } from '../types/shipment';
import { formatCurrency } from '../utils/formatCurrency';
import { formatNumber } from '../utils/formatNumber';

type FclPageProps = {
  direction: ShipmentDirection;
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

const visitSurchargeOptions: Array<{ label: string; value: FclVisitSurcharge }> = [
  { label: 'Geen bezoektoeslag', value: 'none' },
  { label: `RWG (${formatCurrency(jgtVisitSurcharges.rwg.surcharge)})`, value: 'rwg' },
  { label: `ECT/EMX/HPD2 (${formatCurrency(jgtVisitSurcharges.ectEmxHpd2.surcharge)})`, value: 'ectEmxHpd2' },
  { label: `Quay 1700/1718/1742/869/913 (${formatCurrency(jgtVisitSurcharges.quay.surcharge)})`, value: 'quay' },
];

const toNumber = (value: string) => Number(value) || 0;

export function FclPage({ direction }: FclPageProps) {
  const [city, setCity] = useState('');
  const [containerType, setContainerType] = useState<ContainerType>('20ft');
  const [weightCategory, setWeightCategory] = useState<FclWeightCategory>('under18t');
  const [terminal, setTerminal] = useState<FclTerminal>('euromax');
  const [visitSurcharge, setVisitSurcharge] = useState<FclVisitSurcharge>('none');
  const [dieselPercentage, setDieselPercentage] = useState('');
  const [oceanFreight, setOceanFreight] = useState('');
  const [customsSelected, setCustomsSelected] = useState(false);
  const [gensetSelected, setGensetSelected] = useState(false);
  const [adrSelected, setAdrSelected] = useState(false);
  const [marginPercentage, setMarginPercentage] = useState('');
  const isImport = direction === 'import';

  useEffect(() => {
    setCustomsSelected(false);
  }, [direction]);

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
        visitSurcharge,
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
      visitSurcharge,
      weightCategory,
    ],
  );

  const hasRate = Boolean(calculation.rateRow);
  const resultRows = [
    { label: 'Richting', value: direction === 'import' ? 'Import' : 'Export' },
    { label: 'Plaatsnaam', value: calculation.city || '-' },
    { label: 'Werkelijke KM', value: calculation.km ? `${formatNumber(calculation.km, 0)} km` : '-' },
    {
      label: 'Tariefschijf',
      value: calculation.rateRow ? `t/m ${formatNumber(calculation.rateRow.maxKm, 0)} km` : '-',
    },
    { label: 'Containertype', value: containerType === '20ft' ? '20ft' : '40ft' },
    {
      label: 'Gewichtscategorie',
      value: weightCategory === 'under18t' ? 'Onder 18 ton' : '18 ton of meer',
    },
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
    ...(calculation.visitSurcharge > 0
      ? [{ label: calculation.visitSurchargeLabel, value: formatCurrency(calculation.visitSurcharge) }]
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

  return (
    <div className="page-grid">
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
          <SelectField
            label="Gewicht"
            name="weightCategory"
            onChange={(event) => setWeightCategory(event.target.value as FclWeightCategory)}
            options={weightCategoryOptions}
            value={weightCategory}
          />
          <SelectField
            label="Terminal/toeslagkeuze"
            name="terminal"
            onChange={(event) => setTerminal(event.target.value as FclTerminal)}
            options={terminalOptions}
            value={terminal}
          />
          <SelectField
            label="Bezoektoeslag"
            name="visitSurcharge"
            onChange={(event) => setVisitSurcharge(event.target.value as FclVisitSurcharge)}
            options={visitSurchargeOptions}
            value={visitSurcharge}
          />
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

      <ResultCard rows={resultRows} title="FCL overzicht">
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
