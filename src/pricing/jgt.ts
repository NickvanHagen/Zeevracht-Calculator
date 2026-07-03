import type { ContainerType, FclTerminal } from '../types/fcl';
import {
  getRateAmountForContainer,
  jgtFixedSurcharges,
  jgtPlaceDistances,
  jgtRateRows,
  jgtTerminalSurcharges,
  type JgtPlaceDistance,
  type JgtRateRow,
} from './jgtData.js';

export type JgtFclCalculationInput = {
  adrCharge: number;
  adrSelected: boolean;
  city: string;
  containerType: ContainerType;
  customsCharge: number;
  customsSelected: boolean;
  dieselPercentage: number;
  gensetCharge: number;
  gensetSelected: boolean;
  marginPercentage: number;
  oceanFreight: number;
  terminal: FclTerminal;
};

export type JgtFclCalculation = {
  adrCharge: number;
  baseTransportRate: number;
  city: string;
  congestionCharge: number;
  containerType: ContainerType;
  customsCharge: number;
  dieselCharge: number;
  errors: string[];
  gensetCharge: number;
  km: number;
  marginPercentage: number;
  oceanFreight: number;
  portbaseCharge: number;
  profit: number;
  rateRow?: JgtRateRow;
  salesPrice: number;
  terminalLabel: string;
  terminalSurcharge: number;
  toll: number;
  totalPurchase: number;
};

const normalizePlaceName = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
const toPositiveNumber = (value: number) => Math.max(0, value);

export const jgtCityOptions = jgtPlaceDistances.map((place) => place.city);

export function findJgtPlaceDistance(city: string): JgtPlaceDistance | undefined {
  const searchKey = normalizePlaceName(city);

  if (!searchKey) {
    return undefined;
  }

  return jgtPlaceDistances.find((place) => place.searchKey === searchKey);
}

export function findJgtRateRow(km: number): JgtRateRow | undefined {
  if (km <= 0) {
    return undefined;
  }

  return jgtRateRows.find((rateRow) => km <= rateRow.maxKm);
}

export function calculateJgtFcl(input: JgtFclCalculationInput): JgtFclCalculation {
  const errors: string[] = [];
  const place = findJgtPlaceDistance(input.city);
  const km = place?.km ?? 0;
  const rateRow = findJgtRateRow(km);
  const terminal = jgtTerminalSurcharges[input.terminal];
  const dieselPercentage = toPositiveNumber(input.dieselPercentage);
  const marginPercentage = toPositiveNumber(input.marginPercentage);
  const oceanFreight = toPositiveNumber(input.oceanFreight);
  const selectedCustomsCharge = input.customsSelected ? toPositiveNumber(input.customsCharge) : 0;
  const selectedAdrCharge = input.adrSelected ? toPositiveNumber(input.adrCharge) : 0;
  const selectedGensetCharge = input.gensetSelected ? toPositiveNumber(input.gensetCharge) : 0;

  if (input.city.trim() && !place) {
    errors.push(`Plaatsnaam "${input.city}" is niet gevonden in de JGT KM-lijst.`);
  }

  if (place && !rateRow) {
    errors.push(`Geen JGT-tarief gevonden voor ${km} km en ${input.containerType}.`);
  }

  const baseTransportRate = rateRow ? getRateAmountForContainer(rateRow, input.containerType) : 0;
  const terminalSurcharge = terminal.surcharge;
  const dieselCharge = (baseTransportRate + terminalSurcharge) * (dieselPercentage / 100);
  const toll = (rateRow?.toll ?? 0) + terminal.toll;
  const totalPurchase =
    oceanFreight +
    baseTransportRate +
    terminalSurcharge +
    dieselCharge +
    toll +
    jgtFixedSurcharges.congestion +
    jgtFixedSurcharges.portbase +
    selectedCustomsCharge +
    selectedGensetCharge +
    selectedAdrCharge;
  const profit = totalPurchase * (marginPercentage / 100);
  const salesPrice = totalPurchase + profit;

  return {
    adrCharge: selectedAdrCharge,
    baseTransportRate,
    city: place?.city ?? input.city,
    congestionCharge: jgtFixedSurcharges.congestion,
    containerType: input.containerType,
    customsCharge: selectedCustomsCharge,
    dieselCharge,
    errors,
    gensetCharge: selectedGensetCharge,
    km,
    marginPercentage,
    oceanFreight,
    portbaseCharge: jgtFixedSurcharges.portbase,
    profit,
    rateRow,
    salesPrice,
    terminalLabel: terminal.label,
    terminalSurcharge,
    toll,
    totalPurchase,
  };
}

export { jgtFixedSurcharges, jgtTerminalSurcharges };
