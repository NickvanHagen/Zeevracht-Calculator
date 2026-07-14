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
      destinationCfs: 'Sydney',
      destinationUnlo: 'AUSYD',
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
      amount: 160,
      basis: 'per shipment',
      chargeKey: 'imo_administration_fee',
      currency: 'EUR',
      label: 'IMO Administration fee',
    },
    {
      amount: 42.5,
      basis: 'per entry',
      chargeKey: 'country_usa_ams_filing_fee',
      country: 'USA',
      currency: 'EUR',
      label: 'AMS Filing Fee',
    },
    {
      amount: 50,
      basis: 'per entry',
      chargeKey: 'country_brasil_manifest_correction',
      country: 'Brasil',
      currency: 'EUR',
      label: 'Manifest correction',
    },
  ],
};

{
  const rate = tariffSet.rates[0];
  assert.equal(getNvoLclExportDestinationLabel(rate), 'Sydney via Singapore', 'export destination label');
  assert.equal(findNvoLclExportRate(tariffSet, 'Sydney')?.destinationUnlo, 'AUSYD', 'find by discharge port');
  assert.equal(findNvoLclExportRate(tariffSet, 'Sydney via Singapore')?.destinationUnlo, 'AUSYD', 'find by route label');
  assert.equal(findNvoLclExportRate(tariffSet, 'AUSYD')?.destinationCfs, 'Sydney', 'find by UNLO');
}

{
  const result = calculateNvoLclExportFob({
    cbm: 1.152,
    destinationCfs: 'Sydney via Singapore',
    grossWeightKg: 400,
    tariffs: tariffSet,
  });

  assert.ok(result, 'Sydney export result');
  near(result.chargeableWm, 1.152, 'Sydney chargeable W/M');
  near(result.oceanFreight, 39.168, 'Sydney ocean freight USD');
  near(result.oceanFreightEur, 39.168 / 1.144, 'Sydney ocean freight EUR');
  assert.equal(result.charges.some((charge) => charge.country === 'USA'), false, 'Australia excludes USA charges');
  assert.deepEqual(
    result.charges.map((charge) => charge.label),
    ['Export Service Fee', 'Emergency Congestion Surcharge', 'Emissions Trading System (ETS)', 'VGM fee'],
    'Sydney only gets automatic standard export charges',
  );
  near(result.totalEur, 39.168 / 1.144 + 12.096 + 5.76 + 5.76 + 17, 'Sydney total EUR');
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
