import type { WorkBook } from 'xlsx';

export type NvoLocalCharge = {
  label: string;
  currency: string;
  amount: number;
  basis: string;
};

export type NvoLclImportRate = {
  originCfs: string;
  destinationCfs: string;
  currency: string;
  rateWm: number;
  minimumRate: number;
  transitTime: string;
  frequency: string;
};

export type NvoLclImportTariffSet = {
  fileName: string;
  uploadedAt: string;
  validity: string;
  rates: NvoLclImportRate[];
  localCharges: {
    stripping?: NvoLocalCharge;
    deliveryOrder?: NvoLocalCharge;
  };
};

export type NvoLclImportCalculation = {
  chargeableWm: number;
  deliveryOrderFee?: NvoLocalCharge;
  oceanFreight: number;
  rate: NvoLclImportRate;
  strippingCharges?: NvoLocalCharge & { total: number };
  total: number;
};

const STORAGE_KEY = 'tff-nvo-lcl-import-tariffs';

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const parseNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const parsed = Number(value.replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getCellText = (value: unknown) => (value == null ? '' : String(value).trim());

const findHeaderIndex = (rows: unknown[][], labels: string[]) =>
  rows.findIndex((row) => {
    const normalizedCells = row.map((cell) => normalize(getCellText(cell)));
    return labels.every((label) => normalizedCells.includes(normalize(label)));
  });

const findColumn = (headerRow: unknown[], label: string) =>
  headerRow.findIndex((cell) => normalize(getCellText(cell)) === normalize(label));

type XlsxModule = typeof import('xlsx');

const findValidity = (xlsx: XlsxModule, workbook: WorkBook, fileName: string) => {
  const fileValidity = fileName.match(/(\d{8})-(\d{8})/);

  if (fileValidity) {
    return `${fileValidity[1]} - ${fileValidity[2]}`;
  }

  for (const sheetName of workbook.SheetNames) {
    const rows = xlsx.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1 });
    for (const row of rows) {
      const text = row.map(getCellText).join(' ');
      const match = text.match(/(?:Validation|Validity)\s*:?\s*(\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4})/i);

      if (match) {
        return match[1];
      }
    }
  }

  return '';
};

const findLocalCharge = (rows: unknown[][], matcher: (rowText: string) => boolean): NvoLocalCharge | undefined => {
  const row = rows.find((candidate) => matcher(candidate.map(getCellText).join(' ').toLowerCase()));

  if (!row) {
    return undefined;
  }

  const cells = row.map(getCellText).filter(Boolean);
  const currency = cells.find((cell) => ['eur', 'euro', 'usd'].includes(normalize(cell))) ?? '';
  const amount = row.map(parseNumber).find((value) => value > 0) ?? 0;
  const basis = cells[cells.length - 1] ?? '';
  const label = cells[0] ?? 'Local charge';

  return {
    amount,
    basis,
    currency: currency.toUpperCase().replace('EURO', 'EUR'),
    label,
  };
};

function parseRates(xlsx: XlsxModule, workbook: WorkBook): NvoLclImportRate[] {
  const sheet = workbook.Sheets['LCL Seafreight Rates'];

  if (!sheet) {
    throw new Error('Het sheet "LCL Seafreight Rates" is niet gevonden.');
  }

  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  const headerIndex = findHeaderIndex(rows, [
    'Port of Loading',
    'Port of Discharge',
    'Cur',
    'Rate W/M',
    'Rate Min.',
  ]);

  if (headerIndex < 0) {
    throw new Error('Het NVO LCL Import tariefformaat wordt niet herkend.');
  }

  const header = rows[headerIndex];
  const originIndex = findColumn(header, 'Port of Loading');
  const destinationIndex = findColumn(header, 'Port of Discharge');
  const currencyIndex = findColumn(header, 'Cur');
  const rateIndex = findColumn(header, 'Rate W/M');
  const minimumIndex = findColumn(header, 'Rate Min.');
  const frequencyIndex = findColumn(header, 'Freq.');
  const transitIndex = findColumn(header, 'TT');

  return rows
    .slice(headerIndex + 1)
    .map((row) => ({
      currency: getCellText(row[currencyIndex]).toUpperCase(),
      destinationCfs: getCellText(row[destinationIndex]),
      frequency: getCellText(row[frequencyIndex]),
      minimumRate: parseNumber(row[minimumIndex]),
      originCfs: getCellText(row[originIndex]),
      rateWm: parseNumber(row[rateIndex]),
      transitTime: getCellText(row[transitIndex]),
    }))
    .filter((rate) => rate.originCfs && rate.destinationCfs && rate.rateWm > 0);
}

function parseLocalCharges(xlsx: XlsxModule, workbook: WorkBook) {
  const sheet = workbook.Sheets['Locals and CFS'];

  if (!sheet) {
    return {};
  }

  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  return {
    deliveryOrder: findLocalCharge(rows, (rowText) => rowText.includes('delivery order additional')),
    stripping: findLocalCharge(rows, (rowText) => rowText.includes('stripping charges') && rowText.includes('cbm')),
  };
}

export async function parseNvoLclImportTariffFile(file: File): Promise<NvoLclImportTariffSet> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Upload alleen Excel-bestanden met extensie .xlsx.');
  }

  const xlsx = await import('xlsx');
  const workbook = xlsx.read(await file.arrayBuffer(), { type: 'array' });
  const rates = parseRates(xlsx, workbook);

  if (rates.length === 0) {
    throw new Error('Er zijn geen NVO LCL Import tarieven gevonden in dit bestand.');
  }

  return {
    fileName: file.name,
    localCharges: parseLocalCharges(xlsx, workbook),
    rates,
    uploadedAt: new Date().toISOString(),
    validity: findValidity(xlsx, workbook, file.name),
  };
}

export function loadNvoLclImportTariffs() {
  const storedValue = localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return undefined;
  }

  try {
    return JSON.parse(storedValue) as NvoLclImportTariffSet;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

export function saveNvoLclImportTariffs(tariffs: NvoLclImportTariffSet) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tariffs));
}

export function findNvoLclImportRate(
  tariffs: NvoLclImportTariffSet | undefined,
  originCfs: string,
  destinationCfs: string,
) {
  const originKey = normalize(originCfs);
  const destinationKey = normalize(destinationCfs || 'Rotterdam');

  if (!tariffs || !originKey) {
    return undefined;
  }

  return tariffs.rates.find(
    (rate) =>
      normalize(rate.originCfs) === originKey &&
      normalize(rate.destinationCfs) === destinationKey,
  );
}

export function calculateNvoLclImportFob({
  cbm,
  destinationCfs,
  grossWeightKg,
  originCfs,
  tariffs,
}: {
  cbm: number;
  destinationCfs: string;
  grossWeightKg: number;
  originCfs: string;
  tariffs: NvoLclImportTariffSet | undefined;
}): NvoLclImportCalculation | undefined {
  const rate = findNvoLclImportRate(tariffs, originCfs, destinationCfs);

  if (!rate) {
    return undefined;
  }

  const chargeableWm = Math.max(cbm, grossWeightKg / 1000);
  const oceanFreight = Math.max(chargeableWm * rate.rateWm, rate.minimumRate);
  const strippingCharges = tariffs?.localCharges.stripping
    ? {
        ...tariffs.localCharges.stripping,
        total: Math.max(chargeableWm * tariffs.localCharges.stripping.amount, tariffs.localCharges.stripping.amount),
      }
    : undefined;
  const deliveryOrderFee = tariffs?.localCharges.deliveryOrder;
  const total = oceanFreight + (strippingCharges?.total ?? 0) + (deliveryOrderFee?.amount ?? 0);

  return {
    chargeableWm,
    deliveryOrderFee,
    oceanFreight,
    rate,
    strippingCharges,
    total,
  };
}
