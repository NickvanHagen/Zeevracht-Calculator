export type SluyterRate = {
  minKg: number;
  maxKg: number;
  loadMeters: number;
  rate: number;
};

export const sluyterRates: SluyterRate[] = [
  { minKg: 0, maxKg: 700, loadMeters: 0.4, rate: 53.12 },
  { minKg: 701, maxKg: 875, loadMeters: 0.5, rate: 57.7 },
  { minKg: 876, maxKg: 1400, loadMeters: 0.8, rate: 92.31 },
  { minKg: 1401, maxKg: 1750, loadMeters: 1, rate: 111.87 },
  { minKg: 1751, maxKg: 2100, loadMeters: 1.2, rate: 127.81 },
  { minKg: 2101, maxKg: 2625, loadMeters: 1.5, rate: 145.6 },
  { minKg: 2626, maxKg: 2800, loadMeters: 1.6, rate: 161.55 },
  { minKg: 2801, maxKg: 3500, loadMeters: 2, rate: 177.55 },
  { minKg: 3501, maxKg: 4200, loadMeters: 2.4, rate: 198.85 },
  { minKg: 4201, maxKg: 4375, loadMeters: 2.5, rate: 216.62 },
  { minKg: 4376, maxKg: 4900, loadMeters: 2.8, rate: 225.48 },
  { minKg: 4901, maxKg: 5250, loadMeters: 3, rate: 234.37 },
  { minKg: 5251, maxKg: 5600, loadMeters: 3.2, rate: 245 },
  { minKg: 5601, maxKg: 6125, loadMeters: 3.5, rate: 253.89 },
  { minKg: 6126, maxKg: 6300, loadMeters: 3.6, rate: 264.55 },
  { minKg: 6301, maxKg: 7000, loadMeters: 4, rate: 285.47 },
  { minKg: 7001, maxKg: 7700, loadMeters: 4.4, rate: 303.67 },
  { minKg: 7701, maxKg: 7875, loadMeters: 4.5, rate: 313.1 },
  { minKg: 7876, maxKg: 8400, loadMeters: 4.8, rate: 322.52 },
  { minKg: 8401, maxKg: 8750, loadMeters: 5, rate: 332.36 },
  { minKg: 8751, maxKg: 9100, loadMeters: 5.2, rate: 340.56 },
  { minKg: 9101, maxKg: 9625, loadMeters: 5.5, rate: 347.52 },
  { minKg: 9626, maxKg: 9800, loadMeters: 5.6, rate: 351.23 },
  { minKg: 9801, maxKg: 10500, loadMeters: 6, rate: 358.75 },
  { minKg: 10501, maxKg: 11200, loadMeters: 6.4, rate: 368.27 },
  { minKg: 11201, maxKg: 11375, loadMeters: 6.5, rate: 375.61 },
  { minKg: 11376, maxKg: 11900, loadMeters: 6.8, rate: 388.34 },
  { minKg: 11901, maxKg: 12250, loadMeters: 7, rate: 403.5 },
  { minKg: 12251, maxKg: 12600, loadMeters: 7.2, rate: 412.61 },
  { minKg: 12601, maxKg: 13125, loadMeters: 7.5, rate: 426.27 },
  { minKg: 13126, maxKg: 13300, loadMeters: 7.6, rate: 428.38 },
  { minKg: 13301, maxKg: 14000, loadMeters: 8, rate: 437.88 },
  { minKg: 14001, maxKg: 14750, loadMeters: 8.4, rate: 442.67 },
  { minKg: 14751, maxKg: 14875, loadMeters: 8.5, rate: 445.71 },
  { minKg: 14876, maxKg: 15400, loadMeters: 8.8, rate: 449.08 },
  { minKg: 15401, maxKg: 15750, loadMeters: 9, rate: 453.45 },
  { minKg: 15751, maxKg: 16100, loadMeters: 9.2, rate: 461.19 },
  { minKg: 16101, maxKg: 16625, loadMeters: 9.5, rate: 468.93 },
  { minKg: 16626, maxKg: 16800, loadMeters: 9.6, rate: 476.67 },
  { minKg: 16801, maxKg: 17500, loadMeters: 10, rate: 484.42 },
];

export const sluyterFees = {
  adr: 25,
  customsClearance: 48.25,
};

const RATE_MATCH_EPSILON = 0.000001;

export function getSluyterRate({
  chargeableWeightKg,
  loadMeters,
}: {
  chargeableWeightKg: number;
  loadMeters: number;
}) {
  if (chargeableWeightKg <= 0 || loadMeters <= 0) {
    return undefined;
  }

  return sluyterRates.find(
    (rate) =>
      chargeableWeightKg <= rate.maxKg + RATE_MATCH_EPSILON &&
      loadMeters <= rate.loadMeters + RATE_MATCH_EPSILON,
  );
}
