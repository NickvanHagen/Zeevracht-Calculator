export type LclCostInput = {
  oceanFreight: number;
  baseRate: number;
  dieselPercentage: number;
  roadChargePercentage: number;
  customsCharge: number;
  adrCharge: number;
  marginPercentage: number;
};

const clampPositive = (value: number) => Math.max(0, value);

export function calculateLclCosts({
  adrCharge,
  baseRate,
  customsCharge,
  dieselPercentage,
  marginPercentage,
  oceanFreight,
  roadChargePercentage,
}: LclCostInput) {
  const safeOceanFreight = clampPositive(oceanFreight);
  const safeBaseRate = clampPositive(baseRate);
  const safeCustomsCharge = clampPositive(customsCharge);
  const safeAdrCharge = clampPositive(adrCharge);
  const dieselCharge = safeBaseRate * (clampPositive(dieselPercentage) / 100);
  const roadCharge = safeBaseRate * (clampPositive(roadChargePercentage) / 100);
  const totalPurchase =
    safeOceanFreight + safeBaseRate + dieselCharge + roadCharge + safeCustomsCharge + safeAdrCharge;
  const profit = totalPurchase * (clampPositive(marginPercentage) / 100);
  const salesPrice = totalPurchase + profit;

  return {
    dieselCharge,
    profit,
    roadCharge,
    salesPrice,
    totalPurchase,
  };
}
