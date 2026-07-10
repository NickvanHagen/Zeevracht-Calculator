import assert from 'node:assert/strict';
import {
  calculateNvoLclExportFob,
  findNvoLclExportRate,
  getNvoLclExportDestinationLabel,
} from '../.tmp/test-build/src/pricing/nvoLclExport.js';

const near = (actual, expected, message) => {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${message}: expected ${expected}, got ${actual}`);
};

const tariffSet = {
  exchangeRate: 1.144,
  fileName: 'NVO NLRTM LCL Rates Export 01072026-31072026 0000.xlsx',
  uploadedAt: '2026-07-10T00:00:00.000Z',
  validity: '01072026 - 31072026',
  rates: [
    {
      collect: 'Y',
      country: 'Australia',
      currency: 'USD',
      destinationCfs: 'Adelaide',
      destinationUnlo: 'AUADL',
      frequency: 'Weekly',
      imo: 'R',
      minimumRate: 34,
      originCfs: 'Rotterdam',
      rateWm: 34,
      region: 'Australasia',
      remark: '',
      transitTime: '44',
      transshipment: 'Singapore',
    },
    {
      collect: 'Y',
      country: 'USA',
      currency: 'USD',
      destinationCfs: 'New York, NY',
      destinationUnlo: 'USNYC',
      frequency: 'Weekly',
      imo: 'R',
      minimumRate: 44,
      originCfs: 'Rotterdam',
      rateWm: 44,
      region: 'North America',
      remark: '',
      transitTime: '20',
      transshipment: '',
    },
  ],
  charges: [
    {
      amount: 10.5,
      basis: 'w/m (=minimum)',
      chargeKey: 'export_service_fee',
      currency: 'EUR',
      label: 'Export Service Fee',
    },
    {
      amount: 5,
      basis: 'w/m (=minimum)',
      chargeKey: 'emergency_congestion_surcharge',
      currency: 'EUR',
      label: 'Emergency Congestion Surcharge',
    },
    {
      amount: 5,
      basis: 'w/m',
      chargeKey: 'emissions_trading_system_ets',
      currency: 'EUR',
      label: 'Emissions Trading System (ETS)',
    },
    {
      amount: 17,
      basis: 'per shipment',
      chargeKey: 'vgm_fee',
      currency: 'EUR',
      label: 'VGM fee',
    },
    {
      amount: 42.5,
      basis: 'per entry',
      chargeKey: 'country_usa_ams_filing_fee',
      country: 'USA',
      currency: 'EUR',
      label: 'AMS Filing Fee',
    },
  ],
};

{
  const rate = tariffSet.rates[0];
  assert.equal(getNvoLclExportDestinationLabel(rate), 'Adelaide via Singapore', 'export destination label');
  assert.equal(findNvoLclExportRate(tariffSet, 'Adelaide')?.destinationUnlo, 'AUADL', 'find by discharge port');
  assert.equal(findNvoLclExportRate(tariffSet, 'Adelaide via Singapore')?.destinationUnlo, 'AUADL', 'find by route label');
  assert.equal(findNvoLclExportRate(tariffSet, 'AUADL')?.destinationCfs, 'Adelaide', 'find by UNLO');
}

{
  const result = calculateNvoLclExportFob({
    cbm: 1.2,
    destinationCfs: 'Adelaide via Singapore',
    grossWeightKg: 400,
    tariffs: tariffSet,
  });

  assert.ok(result, 'Adelaide export result');
  near(result.chargeableWm, 1.2, 'Adelaide chargeable W/M');
  near(result.oceanFreight, 40.8, 'Adelaide ocean freight USD');
  near(result.oceanFreightEur, 40.8 / 1.144, 'Adelaide ocean freight EUR');
  assert.equal(result.charges.some((charge) => charge.country === 'USA'), false, 'Australia excludes USA charges');
  near(result.totalEur, 40.8 / 1.144 + 12.6 + 6 + 6 + 17, 'Adelaide total EUR');
}

{
  const result = calculateNvoLclExportFob({
    cbm: 1.152,
    destinationCfs: 'USNYC',
    grossWeightKg: 400,
    tariffs: tariffSet,
  });

  assert.ok(result, 'USA export result');
  near(result.oceanFreight, 50.688, 'USA ocean freight USD');
  assert.equal(result.charges.some((charge) => charge.label === 'AMS Filing Fee'), true, 'USA country charge included');
}

{
  const result = calculateNvoLclExportFob({
    cbm: 1,
    destinationCfs: 'Bestaat Niet',
    grossWeightKg: 100,
    tariffs: tariffSet,
  });

  assert.equal(result, undefined, 'unknown export destination returns no result');
}

console.log('NVO LCL Export tests passed');
