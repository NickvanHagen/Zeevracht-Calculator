import { getSingleItemLoadMeters } from './calculateLoadMeters.js';

export type LclShipmentLine = {
  quantity: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightPerItemKg: number;
  stackable: boolean;
};

type Stack = {
  loadMeters: number;
  heightCm: number;
  weightKg: number;
};

type StackableItem = {
  loadMeters: number;
  heightCm: number;
  weightKg: number;
};

const TRUCK_HEIGHT_CM = 240;
const MAX_KG_PER_LOAD_METER = 1750;

function canFitOnStack(stack: Stack, item: StackableItem) {
  return (
    item.loadMeters <= stack.loadMeters &&
    stack.heightCm + item.heightCm <= TRUCK_HEIGHT_CM &&
    stack.weightKg + item.weightKg <= stack.loadMeters * MAX_KG_PER_LOAD_METER
  );
}

function calculateStackedLoadMeters(items: StackableItem[]) {
  const stacks: Stack[] = [];
  const sortedItems = [...items].sort((a, b) => {
    if (b.loadMeters !== a.loadMeters) {
      return b.loadMeters - a.loadMeters;
    }

    return b.heightCm - a.heightCm;
  });

  sortedItems.forEach((item) => {
    let bestStackIndex = -1;
    let bestRemainingHeight = Number.POSITIVE_INFINITY;

    stacks.forEach((stack, index) => {
      if (!canFitOnStack(stack, item)) {
        return;
      }

      const remainingHeight = TRUCK_HEIGHT_CM - (stack.heightCm + item.heightCm);

      if (remainingHeight < bestRemainingHeight) {
        bestStackIndex = index;
        bestRemainingHeight = remainingHeight;
      }
    });

    if (bestStackIndex >= 0) {
      stacks[bestStackIndex] = {
        ...stacks[bestStackIndex],
        heightCm: stacks[bestStackIndex].heightCm + item.heightCm,
        weightKg: stacks[bestStackIndex].weightKg + item.weightKg,
      };
      return;
    }

    stacks.push({
      heightCm: item.heightCm,
      loadMeters: item.loadMeters,
      weightKg: item.weightKg,
    });
  });

  return stacks.reduce((total, stack) => total + stack.loadMeters, 0);
}

export function calculateLclShipment(lines: LclShipmentLine[]) {
  const stackableItems: StackableItem[] = [];
  let nonStackableLoadMeters = 0;
  let actualWeight = 0;

  lines.forEach((line) => {
    const quantity = Math.max(0, Math.floor(line.quantity));
    const weightPerItemKg = Math.max(0, line.weightPerItemKg);

    if (quantity <= 0 || line.lengthCm <= 0 || line.widthCm <= 0) {
      return;
    }

    const singleLoadMeters = getSingleItemLoadMeters(line.lengthCm, line.widthCm);
    actualWeight += quantity * weightPerItemKg;

    if (!line.stackable || line.heightCm <= 0) {
      nonStackableLoadMeters += quantity * singleLoadMeters;
      return;
    }

    for (let index = 0; index < quantity; index += 1) {
      stackableItems.push({
        heightCm: line.heightCm,
        loadMeters: singleLoadMeters,
        weightKg: weightPerItemKg,
      });
    }
  });

  const loadMeters = nonStackableLoadMeters + calculateStackedLoadMeters(stackableItems);
  const ldmWeight = loadMeters * MAX_KG_PER_LOAD_METER;
  const chargeableWeight = Math.max(actualWeight, ldmWeight);

  return {
    actualWeight,
    chargeableWeight,
    loadMeters,
  };
}
