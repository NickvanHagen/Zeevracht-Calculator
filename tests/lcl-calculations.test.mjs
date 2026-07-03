import assert from 'node:assert/strict';
import { calculateLclCosts } from '../.tmp/test-build/src/utils/calculateLclCosts.js';
import { calculateLclShipment } from '../.tmp/test-build/src/utils/calculateLclShipment.js';
import { getSingleItemLoadMeters } from '../.tmp/test-build/src/utils/calculateLoadMeters.js';
import { getSluyterRate, sluyterFees } from '../.tmp/test-build/src/pricing/sluyter.js';
import { defaultSurcharges } from '../.tmp/test-build/src/config/surcharges.js';

const near = (actual, expected, message) => {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${message}: expected ${expected}, got ${actual}`);
};

const shipment = (lines) => calculateLclShipment(lines);
const rate = (totals) => getSluyterRate({
  chargeableWeightKg: totals.chargeableWeight,
  loadMeters: totals.loadMeters,
});

near(getSingleItemLoadMeters(120, 80), 0.4, 'europallet ldm');
near(getSingleItemLoadMeters(120, 100), 0.5, 'blokpallet ldm');
near(getSingleItemLoadMeters(300, 71), 1, 'custom width <= 80');
near(getSingleItemLoadMeters(300, 112), 1.5, 'custom width <= 120');
near(getSingleItemLoadMeters(300, 145), 2, 'custom width <= 160');
near(getSingleItemLoadMeters(300, 202), 3, 'custom width <= 240');

{
  const totals = shipment([{ quantity: 1, lengthCm: 120, widthCm: 80, heightCm: 120, weightPerItemKg: 100, stackable: false }]);
  near(totals.loadMeters, 0.4, '1 europallet load meters');
  near(totals.actualWeight, 100, '1 europallet actual weight');
  near(totals.chargeableWeight, 700, '1 europallet chargeable weight');
  assert.equal(rate(totals)?.rate, 53.12, '1 europallet Sluyter rate');
}

{
  const totals = shipment([{ quantity: 3, lengthCm: 120, widthCm: 80, heightCm: 120, weightPerItemKg: 100, stackable: false }]);
  near(totals.loadMeters, 1.2, '3 non-stackable europallets load meters');
  near(totals.chargeableWeight, 2100, '3 non-stackable europallets chargeable weight');
  assert.equal(rate(totals)?.rate, 127.81, '3 non-stackable europallets Sluyter rate');
}

{
  const totals = shipment([{ quantity: 3, lengthCm: 120, widthCm: 80, heightCm: 50, weightPerItemKg: 100, stackable: true }]);
  near(totals.loadMeters, 0.4, '3 stackable low europallets load meters');
  near(totals.chargeableWeight, 700, '3 stackable low europallets chargeable weight');
  assert.equal(rate(totals)?.rate, 53.12, '3 stackable low europallets Sluyter rate');
}

{
  const totals = shipment([{ quantity: 1, lengthCm: 120, widthCm: 100, heightCm: 120, weightPerItemKg: 500, stackable: false }]);
  near(totals.loadMeters, 0.5, 'blokpallet load meters');
  near(totals.chargeableWeight, 875, 'blokpallet chargeable weight');
  assert.equal(rate(totals)?.rate, 57.7, 'blokpallet Sluyter rate');
}

{
  const totals = shipment([
    { quantity: 1, lengthCm: 120, widthCm: 100, heightCm: 80, weightPerItemKg: 300, stackable: true },
    { quantity: 1, lengthCm: 120, widthCm: 80, heightCm: 80, weightPerItemKg: 300, stackable: true },
  ]);
  near(totals.loadMeters, 0.5, 'mixed stackable block + euro load meters');
  near(totals.chargeableWeight, 875, 'mixed stackable block + euro chargeable weight');
}

{
  const totals = shipment([{ quantity: 5, lengthCm: 122, widthCm: 82, heightCm: 46, weightPerItemKg: 500, stackable: true }]);
  near(totals.loadMeters, 1.83, '5 stackable custom pallets load meters');
}

{
  const totals = shipment([]);
  near(totals.loadMeters, 0, 'empty load meters');
  near(totals.actualWeight, 0, 'empty actual weight');
  near(totals.chargeableWeight, 0, 'empty chargeable weight');
  assert.equal(rate(totals), undefined, 'empty rate');
}

{
  const totals = shipment([{ quantity: -3, lengthCm: -120, widthCm: 80, heightCm: 120, weightPerItemKg: -50, stackable: true }]);
  near(totals.loadMeters, 0, 'negative values load meters');
  near(totals.actualWeight, 0, 'negative values actual weight');
  near(totals.chargeableWeight, 0, 'negative values chargeable weight');
}

{
  const totals = shipment([{ quantity: 1, lengthCm: 120, widthCm: 80, heightCm: 260, weightPerItemKg: 2000, stackable: true }]);
  near(totals.loadMeters, 0.4, 'high heavy stackable single pallet load meters');
  near(totals.chargeableWeight, 2000, 'high heavy stackable single pallet chargeable weight');
  assert.equal(rate(totals)?.rate, 127.81, 'high heavy pallet Sluyter rate');
}

{
  const costs = calculateLclCosts({
    adrCharge: sluyterFees.adr,
    baseRate: 100,
    customsCharge: sluyterFees.customsClearance,
    dieselPercentage: defaultSurcharges.dieselPercentage,
    marginPercentage: 30,
    oceanFreight: 250,
    roadChargePercentage: defaultSurcharges.roadChargePercentage,
  });

  near(costs.roadCharge, 5.9, 'road charge');
  near(costs.dieselCharge, 27, 'diesel charge');
  near(costs.totalPurchase, 456.15, 'total purchase');
  near(costs.profit, 136.845, 'profit');
  near(costs.salesPrice, 592.995, 'sales price');
}

{
  const costs = calculateLclCosts({
    adrCharge: -10,
    baseRate: -100,
    customsCharge: -10,
    dieselPercentage: -27,
    marginPercentage: -30,
    oceanFreight: -250,
    roadChargePercentage: -5.9,
  });

  near(costs.totalPurchase, 0, 'negative costs total purchase');
  near(costs.profit, 0, 'negative costs profit');
  near(costs.salesPrice, 0, 'negative costs sales price');
}

console.log('LCL calculation tests passed');
