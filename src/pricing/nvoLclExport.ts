import type { WorkBook } from 'xlsx';
import { supabase } from '../services/supabaseClient';

export type NvoLclExportRate = {
  region: string;
  country: string;
  destinationUnlo: string;
  destinationCfs: string;
  transshipment: string;
  originCfs: string;
  currency: string;
  rateWm: number;
  minimumRate: number;
  frequency: string;
  transitTime: string;
  collect: string;
  imo: string;
  remark: string;
};

export type NvoLclExportCharge = {
  chargeKey: string;
  label: string;
  country?: string;
  currency: string;
  amount: number;
  basis: string;
};

export type NvoLclExportTariffSet = {
  id?: string;
  exchangeRate: number;
  fileName: string;
  uploadedAt: string;
  validity: string;
  rates: NvoLclExportRate[];
  charges: NvoLclExportCharge[];
};

export type NvoLclExportCalculation = {
  chargeableWm: number;
  oceanFreight: number;
  oceanFreightEur: number;
  rate: NvoLclExportRate;
  charges: Array<NvoLclExportCharge & { total: number; totalEur: number }>;
  totalEur: number;
};

const DEFAULT_EXCHANGE_RATE = 1.144;
const RATE_FILE_FILTER = {
  incoterm: 'FOB',
  provider: 'NVO',
  rate_type: 'lcl_export',
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();
const normalizeCurrency = (currency: string) => currency.toUpperCase().replace('EURO', 'EUR');
const getCellText = (value: unknown) => (value == null ? '' : String(value).trim());

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

const slugify = (value: string) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const convertToEur = (amount: number, currency: string, exchangeRate: number) => {
  if (normalizeCurrency(currency) === 'USD') {
    return exchangeRate > 0 ? amount / exchangeRate : amount;
  }

  return amount;
};

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
      const match = row.map(getCellText).join(' ').match(/Validation:\s*(\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4})/i);

      if (match) {
        return match[1];
      }
    }
  }

  return '';
};

function parseExportRates(xlsx: XlsxModule, workbook: WorkBook): NvoLclExportRate[] {
  const sheet = workbook.Sheets['LCL Export Rates'];

  if (!sheet) {
    throw new Error('Het sheet "LCL Export Rates" is niet gevonden. Upload een NVO LCL Export bestand.');
  }

  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  const headerIndex = rows.findIndex((row) => {
    const cells = row.map((cell) => normalize(getCellText(cell)));
    return cells.includes('port of discharge') && cells.includes('rate w/m') && cells.includes('rate min');
  });

  if (headerIndex < 0) {
    throw new Error('Het NVO LCL Export tariefformaat wordt niet herkend.');
  }

  const header = rows[headerIndex];
  const regionIndex = findColumn(header, 'Region');
  const countryIndex = findColumn(header, 'Country');
  const unloIndex = findColumn(header, 'UNLO');
  const destinationIndex = findColumn(header, 'Port of Discharge');
  const transshipmentIndex = findColumn(header, 'Transshipment');
  const originIndex = findColumn(header, 'Port of Loading');
  const currencyIndex = findColumn(header, 'Cur');
  const rateIndex = findColumn(header, 'Rate w/m');
  const minimumIndex = findColumn(header, 'Rate min');
  const frequencyIndex = findColumn(header, 'Freq.');
  const transitIndex = findColumn(header, 'TT');
  const collectIndex = findColumn(header, 'Collect');
  const imoIndex = findColumn(header, 'IMO');
  const remarkIndex = findColumn(header, 'Remark');

  return rows
    .slice(headerIndex + 1)
    .map((row) => ({
      collect: getCellText(row[collectIndex]),
      country: getCellText(row[countryIndex]),
      currency: normalizeCurrency(getCellText(row[currencyIndex])),
      destinationCfs: getCellText(row[destinationIndex]),
      destinationUnlo: getCellText(row[unloIndex]),
      frequency: getCellText(row[frequencyIndex]),
      imo: getCellText(row[imoIndex]),
      minimumRate: parseNumber(row[minimumIndex]),
      originCfs: getCellText(row[originIndex]),
      rateWm: parseNumber(row[rateIndex]),
      region: getCellText(row[regionIndex]),
      remark: getCellText(row[remarkIndex]),
      transitTime: getCellText(row[transitIndex]),
      transshipment: getCellText(row[transshipmentIndex]),
    }))
    .filter((rate) => rate.destinationCfs && rate.originCfs && rate.rateWm > 0);
}

function parseExportCharges(xlsx: XlsxModule, workbook: WorkBook): NvoLclExportCharge[] {
  const sheet = workbook.Sheets['FOB charges'];

  if (!sheet) {
    throw new Error('Het sheet "FOB charges" is niet gevonden. Upload een NVO LCL Export bestand.');
  }

  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  const charges: NvoLclExportCharge[] = [];

  rows.forEach((row) => {
    const rowText = row.map(getCellText).join(' ').toLowerCase();
    const label = getCellText(row[1]);
    const country = getCellText(row[2]);
    const countryLabel = getCellText(row[3]);
    const currency = normalizeCurrency(getCellText(row[6]));
    const amount = parseNumber(row[7]);
    const basis = getCellText(row[8]);

    if (['euro', 'eur', 'usd'].includes(normalize(currency)) && amount > 0) {
      if (label && !rowText.includes('below charges')) {
        charges.push({
          amount,
          basis,
          chargeKey: slugify(label),
          currency,
          label,
        });
      }

      if (country && countryLabel) {
        charges.push({
          amount,
          basis,
          chargeKey: `country_${slugify(country)}_${slugify(countryLabel)}`,
          country,
          currency,
          label: countryLabel,
        });
      }
    }
  });

  return charges;
}

export async function parseNvoLclExportTariffFile(
  file: File,
  exchangeRate = DEFAULT_EXCHANGE_RATE,
): Promise<NvoLclExportTariffSet> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Upload alleen Excel-bestanden met extensie .xlsx.');
  }

  const xlsx = await import('xlsx');
  const workbook = xlsx.read(await file.arrayBuffer(), { type: 'array' });
  const rates = parseExportRates(xlsx, workbook);
  const charges = parseExportCharges(xlsx, workbook);

  if (rates.length === 0) {
    throw new Error('Er zijn geen NVO LCL Export tarieven gevonden in dit bestand.');
  }

  return {
    charges,
    exchangeRate,
    fileName: file.name,
    rates,
    uploadedAt: new Date().toISOString(),
    validity: findValidity(xlsx, workbook, file.name),
  };
}

export function findNvoLclExportRate(
  tariffs: NvoLclExportTariffSet | undefined,
  destinationCfs: string,
) {
  const destinationKey = normalize(destinationCfs);

  if (!tariffs || !destinationKey) {
    return undefined;
  }

  return tariffs.rates.find((rate) => normalize(rate.destinationCfs) === destinationKey);
}

const calculateChargeTotal = (charge: NvoLclExportCharge, chargeableWm: number, grossWeightKg: number) => {
  const basis = normalize(charge.basis);

  if (basis.includes('w/m')) {
    return basis.includes('minimum') ? Math.max(chargeableWm * charge.amount, charge.amount) : chargeableWm * charge.amount;
  }

  if (basis.includes('1000')) {
    return grossWeightKg > 5000 ? Math.max(Math.ceil(grossWeightKg / 1000) * charge.amount, charge.amount) : 0;
  }

  return charge.amount;
};

export function calculateNvoLclExportFob({
  cbm,
  destinationCfs,
  grossWeightKg,
  tariffs,
}: {
  cbm: number;
  destinationCfs: string;
  grossWeightKg: number;
  tariffs: NvoLclExportTariffSet | undefined;
}): NvoLclExportCalculation | undefined {
  const rate = findNvoLclExportRate(tariffs, destinationCfs);

  if (!rate) {
    return undefined;
  }

  const chargeableWm = Math.max(cbm, grossWeightKg / 1000);
  const exchangeRate = tariffs?.exchangeRate ?? DEFAULT_EXCHANGE_RATE;
  const oceanFreight = Math.max(chargeableWm * rate.rateWm, rate.minimumRate);
  const oceanFreightEur = convertToEur(oceanFreight, rate.currency, exchangeRate);
  const charges = (tariffs?.charges ?? [])
    .filter((charge) => !charge.country || normalize(charge.country) === normalize(rate.country))
    .map((charge) => {
      const total = calculateChargeTotal(charge, chargeableWm, grossWeightKg);

      return {
        ...charge,
        total,
        totalEur: convertToEur(total, charge.currency, exchangeRate),
      };
    })
    .filter((charge) => charge.total > 0);
  const totalEur = oceanFreightEur + charges.reduce((total, charge) => total + charge.totalEur, 0);

  return {
    chargeableWm,
    charges,
    oceanFreight,
    oceanFreightEur,
    rate,
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

type ExportRateRow = {
  collect: string | null;
  country: string;
  currency: string;
  destination_cfs: string;
  destination_unlo: string | null;
  frequency: string | null;
  imo: string | null;
  minimum_rate: number | string;
  origin_cfs: string;
  rate_wm: number | string;
  region: string | null;
  remark: string | null;
  transit_time: string | null;
  transshipment: string | null;
};

type ExportChargeRow = {
  amount: number | string;
  basis: string | null;
  charge_key: string;
  country: string | null;
  currency: string;
  label: string;
};

const toTariffSet = (
  rateFile: RateFileRow,
  rates: ExportRateRow[],
  charges: ExportChargeRow[],
): NvoLclExportTariffSet => ({
  charges: charges.map((charge) => ({
    amount: Number(charge.amount) || 0,
    basis: charge.basis ?? '',
    chargeKey: charge.charge_key,
    country: charge.country ?? undefined,
    currency: normalizeCurrency(charge.currency),
    label: charge.label,
  })),
  exchangeRate: Number(rateFile.exchange_rate) || DEFAULT_EXCHANGE_RATE,
  fileName: rateFile.file_name,
  id: rateFile.id,
  rates: rates.map((rate) => ({
    collect: rate.collect ?? '',
    country: rate.country,
    currency: normalizeCurrency(rate.currency),
    destinationCfs: rate.destination_cfs,
    destinationUnlo: rate.destination_unlo ?? '',
    frequency: rate.frequency ?? '',
    imo: rate.imo ?? '',
    minimumRate: Number(rate.minimum_rate) || 0,
    originCfs: rate.origin_cfs,
    rateWm: Number(rate.rate_wm) || 0,
    region: rate.region ?? '',
    remark: rate.remark ?? '',
    transitTime: rate.transit_time ?? '',
    transshipment: rate.transshipment ?? '',
  })),
  uploadedAt: rateFile.uploaded_at,
  validity: rateFile.validity ?? '',
});

export async function fetchActiveNvoLclExportTariffs(): Promise<NvoLclExportTariffSet | undefined> {
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

  const [{ data: rates, error: ratesError }, { data: charges, error: chargesError }] = await Promise.all([
    client
      .from('nvo_lcl_export_rates')
      .select('region,country,destination_unlo,destination_cfs,transshipment,origin_cfs,currency,rate_wm,minimum_rate,frequency,transit_time,collect,imo,remark')
      .eq('rate_file_id', rateFile.id)
      .returns<ExportRateRow[]>(),
    client
      .from('nvo_lcl_export_charges')
      .select('charge_key,label,country,currency,amount,basis')
      .eq('rate_file_id', rateFile.id)
      .returns<ExportChargeRow[]>(),
  ]);

  if (ratesError) {
    throw new Error(ratesError.message);
  }

  if (chargesError) {
    throw new Error(chargesError.message);
  }

  return toTariffSet(rateFile, rates ?? [], charges ?? []);
}

const chargesToJson = (tariffs: NvoLclExportTariffSet) =>
  tariffs.charges.map((charge) => ({
    amount: charge.amount,
    basis: charge.basis || null,
    charge_key: charge.chargeKey,
    country: charge.country || null,
    currency: normalizeCurrency(charge.currency),
    label: charge.label,
  }));

export async function saveNvoLclExportTariffsToSupabase(
  tariffs: NvoLclExportTariffSet,
  exchangeRate: number,
  appPassword: string,
): Promise<NvoLclExportTariffSet> {
  const client = requireSupabase();
  const { data: rateFileId, error: replaceError } = await client.rpc('replace_nvo_lcl_export_rates', {
    p_app_password: appPassword,
    p_charges: chargesToJson(tariffs),
    p_exchange_rate: exchangeRate,
    p_file_name: tariffs.fileName,
    p_rates: tariffs.rates.map((rate) => ({
      collect: rate.collect || null,
      country: rate.country,
      currency: normalizeCurrency(rate.currency),
      destination_cfs: rate.destinationCfs,
      destination_unlo: rate.destinationUnlo || null,
      frequency: rate.frequency || null,
      imo: rate.imo || null,
      minimum_rate: rate.minimumRate,
      origin_cfs: rate.originCfs,
      rate_wm: rate.rateWm,
      region: rate.region || null,
      remark: rate.remark || null,
      transit_time: rate.transitTime || null,
      transshipment: rate.transshipment || null,
    })),
    p_validity: tariffs.validity || null,
  });

  if (replaceError || !rateFileId) {
    throw new Error(replaceError?.message ?? 'Het exporttariefbestand kon niet worden opgeslagen.');
  }

  return fetchActiveNvoLclExportTariffs().then((activeTariffs) => activeTariffs ?? {
    ...tariffs,
    exchangeRate,
    id: String(rateFileId),
  });
}

export async function updateNvoLclExportExchangeRate(
  rateFileId: string,
  exchangeRate: number,
  appPassword: string,
) {
  const client = requireSupabase();
  const { error } = await client.rpc('update_nvo_lcl_export_exchange_rate', {
    p_app_password: appPassword,
    p_exchange_rate: exchangeRate,
    p_rate_file_id: rateFileId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
