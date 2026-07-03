import { useEffect, useMemo, useState } from 'react';
import { Checkbox, InputField, NumberInput, ResultCard, SectionCard, SelectField } from '../components';
import { customsFees } from '../config/customsFees';
import { containerTypeOptions } from '../config/options';
import {
  calculateJgtFcl,
  jgtCityOptions,
  jgtFixedSurcharges,
} from '../pricing/jgt';
import type { ContainerType, FclTerminal } from '../types/fcl';
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

const toNumber = (value: string) => Number(value) || 0;

export function FclPage({ direction }: FclPageProps) {
  const [city, setCity] = useState('');
  const [containerType, setContainerType] = useState<ContainerType>('20ft');
  const [terminal, setTerminal] = useState<FclTerminal>('euromax');
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
    { label: 'Zeevracht', value: formatCurrency(calculation.oceanFreight) },
    {
      label: 'Kaal transporttarief',
      value: hasRate ? formatCurrency(calculation.baseTransportRate) : '-',
    },
    {
      label: `${calculation.terminalLabel} km-toeslag`,
      value: formatCurrency(calculation.terminalSurcharge),
    },
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
            label="Terminal/toeslagkeuze"
            name="terminal"
            onChange={(event) => setTerminal(event.target.value as FclTerminal)}
            options={terminalOptions}
            value={terminal}
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
