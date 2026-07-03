export type LoadMeterInput = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  quantity: number;
  weightKg: number;
  stackable: boolean;
};

const TRUCK_HEIGHT_CM = 240;
const MAX_KG_PER_LOAD_METER = 1750;

export function getSingleItemLoadMeters(lengthCm: number, widthCm: number) {
  if (lengthCm === 120 && widthCm === 80) {
    return 0.4;
  }

  if (lengthCm === 120 && widthCm === 100) {
    return 0.5;
  }

  if (widthCm <= 80) {
    return lengthCm / 300;
  }

  if (widthCm <= 120) {
    return lengthCm / 200;
  }

  if (widthCm <= 160) {
    return (lengthCm / 300) * 2;
  }

  if (widthCm <= 240) {
    return lengthCm / 100;
  }

  return lengthCm / 100;
}

export function calculateLoadMeters({
  heightCm,
  lengthCm,
  quantity,
  stackable,
  weightKg,
  widthCm,
}: LoadMeterInput) {
  if (lengthCm <= 0 || widthCm <= 0 || quantity <= 0) {
    return 0;
  }

  const baseLoadMeters = getSingleItemLoadMeters(lengthCm, widthCm) * quantity;

  if (!stackable || heightCm <= 0) {
    return baseLoadMeters;
  }

  const singleItemLoadMeters = getSingleItemLoadMeters(lengthCm, widthCm);
  const weightPerItemKg = weightKg > 0 ? weightKg / quantity : 0;
  const maxStackByHeight = Math.max(1, Math.floor(TRUCK_HEIGHT_CM / heightCm));
  const maxKgPerFloorPlace = singleItemLoadMeters * MAX_KG_PER_LOAD_METER;
  const maxStackByWeight =
    weightPerItemKg > 0 ? Math.max(1, Math.floor(maxKgPerFloorPlace / weightPerItemKg)) : maxStackByHeight;
  const itemsPerFloorPlace = Math.max(1, Math.min(maxStackByHeight, maxStackByWeight));
  const floorPlaces = Math.ceil(quantity / itemsPerFloorPlace);
  const loadMetersByStacking = floorPlaces * singleItemLoadMeters;

  return loadMetersByStacking;
}
