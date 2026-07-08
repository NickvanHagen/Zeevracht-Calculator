import type { WorkBook } from 'xlsx';
import { supabase } from '../services/supabaseClient';

export type NvoLocalCharge = {
  label: string;
  currency: string;
  amount: number;
  basis: string;
};

export type NvoAdditionalCharge = NvoLocalCharge & {
  chargeKey: string;
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
  id?: string;
  exchangeRate: number;
  fileName: string;
  uploadedAt: string;
  validity: string;
  rates: NvoLclImportRate[];
  localCharges: {
    usaImportCharges?: NvoAdditionalCharge[];
    stripping?: NvoLocalCharge;
    deliveryOrder?: NvoLocalCharge;
  };
};

export type NvoLclImportCalculation = {
  chargeableWm: number;
  deliveryOrderFee?: NvoLocalCharge & { amountEur: number };
  oceanFreight: number;
  oceanFreightEur: number;
  rate: NvoLclImportRate;
  strippingCharges?: NvoLocalCharge & { total: number; totalEur: number };
  usaImportCharges: Array<NvoAdditionalCharge & { total: number; totalEur: number }>;
  totalEur: number;
};

const DEFAULT_EXCHANGE_RATE = 1.144;
const USA_IMPORT_CHARGES: NvoAdditionalCharge[] = [
  { amount: 30, basis: 'minimum', chargeKey: 'usa_export_receiving', currency: 'USD', label: 'Export Receiving Fee' },
  { amount: 10, basis: 'per shipment', chargeKey: 'usa_vgm', currency: 'USD', label: 'VGM Fee' },
  { amount: 25, basis: 'per shipment', chargeKey: 'usa_ics2', currency: 'USD', label: 'ICS2 Filing Fee' },
  { amount: 10, basis: 'per B/L', chargeKey: 'usa_bill_of_lading', currency: 'USD', label: 'Bill of Lading fee' },
  { amount: 5, basis: 'per W/M', chargeKey: 'usa_congestion', currency: 'USD', label: 'Congestion fee' },
  { amount: 8, basis: 'per W/M', chargeKey: 'usa_chassis', currency: 'USD', label: 'Chassis Fee' },
];
const RATE_FILE_FILTER = {
  incoterm: 'FOB',
  provider: 'NVO',
  rate_type: 'lcl_import',
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
const normalizeCurrency = (currency: string) => currency.toUpperCase().replace('EURO', 'EUR');

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

export const formatNvoValidity = (validity: string) => {
  const compactMatch = validity.match(/(\d{2})(\d{2})(\d{4})\s*-\s*(\d{2})(\d{2})(\d{4})/);

  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]} t/m ${compactMatch[4]}-${compactMatch[5]}-${compactMatch[6]}`;
  }

  return validity;
};

const findLocalCharge = (rows: unknown[][], matcher: (row: unknown[], rowText: string) => boolean): NvoLocalCharge | undefined => {
  const row = rows.find((candidate) => matcher(candidate, candidate.map(getCellText).join(' ').toLowerCase()));

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
    currency: normalizeCurrency(currency),
    label,
  };
};

const convertToEur = (amount: number, currency: string, exchangeRate: number) => {
  const normalizedCurrency = normalizeCurrency(currency);

  if (normalizedCurrency === 'USD') {
    return exchangeRate > 0 ? amount / exchangeRate : amount;
  }

  return amount;
};

const isUnitedStatesOrigin = (originCfs: string) => {
  const origin = normalize(originCfs);
  const statePattern = /,\s?(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|ia|id|il|in|ks|ky|la|ma|md|me|mi|mn|mo|ms|mt|nc|nd|ne|nh|nj|nm|nv|ny|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|va|vt|wa|wi|wv|wy)\b/i;

  return (
    statePattern.test(originCfs) ||
    ['new york', 'los angeles', 'houston', 'miami', 'atlanta', 'chicago', 'charleston', 'savannah', 'oakland', 'norfolk', 'seattle'].some(
      (port) => origin.includes(port),
    )
  );
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
    usaImportCharges: USA_IMPORT_CHARGES,
    deliveryOrder: findLocalCharge(
      rows,
      (row, rowText) =>
        normalize(getCellText(row[0])) === 'delivery order' && !rowText.includes('additional'),
    ),
    stripping: findLocalCharge(
      rows,
      (row) => normalize(getCellText(row[0])) === 'stripping charges',
    ),
  };
}

export async function parseNvoLclImportTariffFile(
  file: File,
  exchangeRate = DEFAULT_EXCHANGE_RATE,
): Promise<NvoLclImportTariffSet> {
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
    exchangeRate,
    fileName: file.name,
    localCharges: parseLocalCharges(xlsx, workbook),
    rates,
    uploadedAt: new Date().toISOString(),
    validity: findValidity(xlsx, workbook, file.name),
  };
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
  const exchangeRate = tariffs?.exchangeRate ?? DEFAULT_EXCHANGE_RATE;
  const oceanFreightEur = convertToEur(oceanFreight, rate.currency, exchangeRate);
  const strippingCharges = tariffs?.localCharges.stripping
    ? {
        ...tariffs.localCharges.stripping,
        total: Math.max(chargeableWm * tariffs.localCharges.stripping.amount, tariffs.localCharges.stripping.amount),
        totalEur: convertToEur(
          Math.max(chargeableWm * tariffs.localCharges.stripping.amount, tariffs.localCharges.stripping.amount),
          tariffs.localCharges.stripping.currency,
          exchangeRate,
        ),
      }
    : undefined;
  const deliveryOrderFee = tariffs?.localCharges.deliveryOrder
    ? {
        ...tariffs.localCharges.deliveryOrder,
        amountEur: convertToEur(
          tariffs.localCharges.deliveryOrder.amount,
          tariffs.localCharges.deliveryOrder.currency,
          exchangeRate,
        ),
      }
    : undefined;
  const usaImportCharges = isUnitedStatesOrigin(originCfs)
    ? (tariffs?.localCharges.usaImportCharges ?? USA_IMPORT_CHARGES).map((charge) => {
        const total =
          charge.basis.toLowerCase().includes('w/m') ||
          charge.chargeKey === 'usa_congestion' ||
          charge.chargeKey === 'usa_chassis'
            ? chargeableWm * charge.amount
            : charge.amount;

        return {
          ...charge,
          total,
          totalEur: convertToEur(total, charge.currency, exchangeRate),
        };
      })
    : [];
  const totalEur =
    oceanFreightEur +
    (strippingCharges?.totalEur ?? 0) +
    (deliveryOrderFee?.amountEur ?? 0) +
    usaImportCharges.reduce((total, charge) => total + charge.totalEur, 0);

  return {
    chargeableWm,
    deliveryOrderFee,
    oceanFreight,
    oceanFreightEur,
    rate,
    strippingCharges,
    usaImportCharges,
    totalEur,
  };
}

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is nog niet ingesteld. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.');
  }

  return supabase;
};

type RateFileRow = {
  id: string;
  exchange_rate: number | string | null;
  file_name: string;
  uploaded_at: string;
  validity: string | null;
};

type RateRow = {
  currency: string;
  destination_cfs: string;
  frequency: string | null;
  minimum_rate: number | string;
  origin_cfs: string;
  rate_wm: number | string;
  transit_time: string | null;
};

type LocalChargeRow = {
  amount: number | string;
  basis: string | null;
  charge_key: string;
  currency: string;
  label: string;
};

const toTariffSet = (
  rateFile: RateFileRow,
  rates: RateRow[],
  localCharges: LocalChargeRow[],
): NvoLclImportTariffSet => {
  const deliveryOrder = localCharges.find((charge) => charge.charge_key === 'delivery_order');
  const stripping = localCharges.find((charge) => charge.charge_key === 'stripping');
  const usaImportCharges = localCharges
    .filter((charge) => charge.charge_key.startsWith('usa_'))
    .map((charge) => ({
      amount: Number(charge.amount) || 0,
      basis: charge.basis ?? '',
      chargeKey: charge.charge_key,
      currency: normalizeCurrency(charge.currency),
      label: charge.label,
    }));

  return {
    exchangeRate: Number(rateFile.exchange_rate) || DEFAULT_EXCHANGE_RATE,
    fileName: rateFile.file_name,
    id: rateFile.id,
    localCharges: {
      usaImportCharges: usaImportCharges.length > 0 ? usaImportCharges : USA_IMPORT_CHARGES,
      deliveryOrder: deliveryOrder
        ? {
            amount: Number(deliveryOrder.amount) || 0,
            basis: deliveryOrder.basis ?? '',
            currency: normalizeCurrency(deliveryOrder.currency),
            label: deliveryOrder.label,
          }
        : undefined,
      stripping: stripping
        ? {
            amount: Number(stripping.amount) || 0,
            basis: stripping.basis ?? '',
            currency: normalizeCurrency(stripping.currency),
            label: stripping.label,
          }
        : undefined,
    },
    rates: rates.map((rate) => ({
      currency: normalizeCurrency(rate.currency),
      destinationCfs: rate.destination_cfs,
      frequency: rate.frequency ?? '',
      minimumRate: Number(rate.minimum_rate) || 0,
      originCfs: rate.origin_cfs,
      rateWm: Number(rate.rate_wm) || 0,
      transitTime: rate.transit_time ?? '',
    })),
    uploadedAt: rateFile.uploaded_at,
    validity: rateFile.validity ?? '',
  };
};

export async function fetchActiveNvoLclImportTariffs(): Promise<NvoLclImportTariffSet | undefined> {
  const client = requireSupabase();
  const { data: rateFile, error: rateFileError } = await client
    .from('rate_files')
    .select('id,file_name,uploaded_at,validity,exchange_rate')
    .match({ ...RATE_FILE_FILTER, is_active: true })
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle<RateFileRow>();

  if (rateFileError) {
    throw new Error(rateFileError.message);
  }

  if (!rateFile) {
    return undefined;
  }

  const [{ data: rates, error: ratesError }, { data: localCharges, error: localChargesError }] =
    await Promise.all([
      client
        .from('nvo_lcl_import_rates')
        .select('origin_cfs,destination_cfs,currency,rate_wm,minimum_rate,transit_time,frequency')
        .eq('rate_file_id', rateFile.id)
        .returns<RateRow[]>(),
      client
        .from('nvo_lcl_import_local_charges')
        .select('charge_key,label,currency,amount,basis')
        .eq('rate_file_id', rateFile.id)
        .returns<LocalChargeRow[]>(),
    ]);

  if (ratesError) {
    throw new Error(ratesError.message);
  }

  if (localChargesError) {
    throw new Error(localChargesError.message);
  }

  return toTariffSet(rateFile, rates ?? [], localCharges ?? []);
}

export async function saveNvoLclImportTariffsToSupabase(
  tariffs: NvoLclImportTariffSet,
  exchangeRate: number,
  appPassword: string,
): Promise<NvoLclImportTariffSet> {
  const client = requireSupabase();
  const { data: rateFileId, error: replaceError } = await client.rpc('replace_nvo_lcl_import_rates', {
    p_app_password: appPassword,
    p_exchange_rate: exchangeRate,
    p_file_name: tariffs.fileName,
    p_local_charges: chargesToJson(tariffs),
    p_rates: tariffs.rates.map((rate) => ({
      currency: normalizeCurrency(rate.currency),
      destination_cfs: rate.destinationCfs,
      frequency: rate.frequency || null,
      minimum_rate: rate.minimumRate,
      origin_cfs: rate.originCfs,
      rate_wm: rate.rateWm,
      transit_time: rate.transitTime || null,
    })),
    p_validity: tariffs.validity || null,
  });

  if (replaceError || !rateFileId) {
    throw new Error(replaceError?.message ?? 'Het tariefbestand kon niet worden opgeslagen.');
  }

  return fetchActiveNvoLclImportTariffs().then((activeTariffs) => activeTariffs ?? {
    ...tariffs,
    exchangeRate,
    id: String(rateFileId),
  });
}

const chargesToJson = (tariffs: NvoLclImportTariffSet) =>
  [
    ...(tariffs.localCharges.usaImportCharges ?? USA_IMPORT_CHARGES).map((charge) => ({
      charge,
      chargeKey: charge.chargeKey,
    })),
    tariffs.localCharges.stripping
      ? { chargeKey: 'stripping', charge: tariffs.localCharges.stripping }
      : undefined,
    tariffs.localCharges.deliveryOrder
      ? { chargeKey: 'delivery_order', charge: tariffs.localCharges.deliveryOrder }
      : undefined,
  ]
    .filter((entry): entry is { chargeKey: string; charge: NvoLocalCharge } => Boolean(entry))
    .map(({ charge, chargeKey }) => ({
      amount: charge.amount,
      basis: charge.basis || null,
      charge_key: chargeKey,
      currency: normalizeCurrency(charge.currency),
      label: charge.label,
    }));

export async function updateNvoLclImportExchangeRate(
  rateFileId: string,
  exchangeRate: number,
  appPassword: string,
) {
  const client = requireSupabase();
  const { error } = await client.rpc('update_nvo_lcl_import_exchange_rate', {
    p_app_password: appPassword,
    p_exchange_rate: exchangeRate,
    p_rate_file_id: rateFileId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
