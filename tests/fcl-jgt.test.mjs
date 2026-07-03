import assert from 'node:assert/strict';
import { calculateJgtFcl, findJgtPlaceDistance, findJgtRateRow } from '../.tmp/test-build/src/pricing/jgt.js';

const near = (actual, expected, message) => {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${message}: expected ${expected}, got ${actual}`);
};

{
  const place = findJgtPlaceDistance('Alblasserdam');
  assert.equal(place?.km, 25, 'Alblasserdam KM');

  const rate = findJgtRateRow(place.km);
  assert.equal(rate?.rate20ft, 223, '20ft rate for 25 KM');
  assert.equal(rate?.rate40ft, 241, '40ft rate for 25 KM');
}

{
  const result = calculateJgtFcl({
    adrCharge: 35,
    adrSelected: false,
    city: 'Alblasserdam',
    containerType: '20ft',
    customsCharge: 48.25,
    customsSelected: false,
    dieselPercentage: 10,
    gensetCharge: 80,
    gensetSelected: false,
    marginPercentage: 0,
    oceanFreight: 0,
    terminal: 'euromax',
  });

  assert.deepEqual(result.errors, [], '20ft calculation errors');
  near(result.baseTransportRate, 223, '20ft base transport rate');
  near(result.terminalSurcharge, 60, 'Euromax terminal surcharge');
  near(result.dieselCharge, 28.3, 'diesel only on base plus terminal surcharge');
  near(result.toll, 20.05, 'route toll plus terminal toll');
  near(result.totalPurchase, 351.35, '20ft total purchase');
}

{
  const result = calculateJgtFcl({
    adrCharge: 35,
    adrSelected: true,
    city: 'Alblasserdam',
    containerType: '40ft',
    customsCharge: 48.25,
    customsSelected: false,
    dieselPercentage: 10,
    gensetCharge: 80,
    gensetSelected: true,
    marginPercentage: 20,
    oceanFreight: 0,
    terminal: 'delta',
  });

  assert.deepEqual(result.errors, [], '40ft calculation errors');
  near(result.baseTransportRate, 241, '40ft base transport rate');
  near(result.terminalSurcharge, 50, 'Delta terminal surcharge');
  near(result.dieselCharge, 29.1, '40ft diesel only on base plus terminal surcharge');
  near(result.totalPurchase, 475.15, '40ft total purchase with optional charges');
  near(result.profit, 95.03, '40ft margin profit');
  near(result.salesPrice, 570.18, '40ft sales price');
}

{
  const result = calculateJgtFcl({
    adrCharge: -35,
    adrSelected: true,
    city: 'Bestaat Niet',
    containerType: '20ft',
    customsCharge: -48.25,
    customsSelected: true,
    dieselPercentage: -10,
    gensetCharge: -80,
    gensetSelected: true,
    marginPercentage: -20,
    oceanFreight: -100,
    terminal: 'botlek',
  });

  assert.equal(result.errors.length, 1, 'unknown city error');
  near(result.dieselCharge, 0, 'negative diesel percentage clamps to zero');
  near(result.gensetCharge, 0, 'negative genset clamps to zero');
  near(result.adrCharge, 0, 'negative ADR clamps to zero');
}

{
  const result = calculateJgtFcl({
    adrCharge: 35,
    adrSelected: false,
    city: 'Alblasserdam',
    containerType: '20ft',
    customsCharge: 11,
    customsSelected: true,
    dieselPercentage: 10,
    gensetCharge: 80,
    gensetSelected: false,
    marginPercentage: 10,
    oceanFreight: 200,
    terminal: 'euromax',
  });

  near(result.oceanFreight, 200, 'ocean freight');
  near(result.customsCharge, 11, 'customs charge');
  near(result.dieselCharge, 28.3, 'customs and ocean freight stay outside diesel basis');
  near(result.totalPurchase, 562.35, 'total purchase with ocean freight and export clearance');
  near(result.profit, 56.235, 'profit with ocean freight and customs');
}

console.log('FCL JGT calculation tests passed');
