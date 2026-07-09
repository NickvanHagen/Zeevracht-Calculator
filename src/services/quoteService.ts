import { supabase } from './supabaseClient';
import type { ShipmentDirection, ShipmentMode } from '../types/shipment';

export type SavedQuote = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerReference: string;
  tffReference: string;
  mode: ShipmentMode;
  direction: ShipmentDirection;
  incoterms: string;
  loadingPlace: string;
  unloadingPlace: string;
  validity: string;
  salesPrice: number;
  purchasePrice: number;
  marginPercentage: number;
  createdAt: string;
  createdBy: string | null;
  payload: SavedQuotePayload;
};

export type SavedQuotePayload = {
  formState?: {
    adrSelected?: boolean;
    customsSelected?: boolean;
    dieselPercentage?: string;
    marginPercentage?: string;
    oceanFreight?: string;
    pricingInputMode?: string;
    quoteDetails?: Record<string, string>;
    roadChargePercentage?: string;
    rows?: Array<Record<string, unknown>>;
    salesPriceInput?: string;
  };
  [key: string]: unknown;
};

export type SaveQuoteInput = Omit<SavedQuote, 'createdAt' | 'createdBy' | 'id' | 'payload' | 'quoteNumber'> & {
  existingQuoteId?: string;
  payload: SavedQuotePayload;
};

type SavedQuoteRow = {
  created_at: string;
  created_by: string | null;
  customer_name: string;
  customer_reference: string | null;
  direction: ShipmentDirection;
  id: string;
  incoterms: string;
  loading_place: string | null;
  margin_percentage: number | string | null;
  mode: ShipmentMode;
  payload: SavedQuotePayload | string | null;
  purchase_price: number | string;
  quote_number: string;
  sales_price: number | string;
  tff_reference: string | null;
  unloading_place: string | null;
  validity: string;
};

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is nog niet ingesteld. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.');
  }

  return supabase;
};

const normalizePayload = (payload: SavedQuotePayload | string | null): SavedQuotePayload => {
  if (!payload) {
    return {};
  }

  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as SavedQuotePayload;
    } catch {
      return {};
    }
  }

  return payload;
};

const mapSavedQuote = (row: SavedQuoteRow): SavedQuote => ({
  createdAt: row.created_at,
  createdBy: row.created_by,
  customerName: row.customer_name,
  customerReference: row.customer_reference ?? '',
  direction: row.direction,
  id: row.id,
  incoterms: row.incoterms,
  loadingPlace: row.loading_place ?? '',
  marginPercentage: Number(row.margin_percentage) || 0,
  mode: row.mode,
  payload: normalizePayload(row.payload),
  purchasePrice: Number(row.purchase_price) || 0,
  quoteNumber: row.quote_number,
  salesPrice: Number(row.sales_price) || 0,
  tffReference: row.tff_reference ?? '',
  unloadingPlace: row.unloading_place ?? '',
  validity: row.validity,
});

export async function saveLclQuoteToSupabase(appPassword: string, quote: SaveQuoteInput) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('save_lcl_quote', {
    p_app_password: appPassword,
    p_customer_name: quote.customerName,
    p_customer_reference: quote.customerReference || null,
    p_direction: quote.direction,
    p_incoterms: quote.incoterms,
    p_loading_place: quote.loadingPlace || null,
    p_margin_percentage: quote.marginPercentage,
    p_payload: quote.payload,
    p_purchase_price: quote.purchasePrice,
    p_quote_id: quote.existingQuoteId || null,
    p_sales_price: quote.salesPrice,
    p_tff_reference: quote.tffReference || null,
    p_unloading_place: quote.unloadingPlace || null,
    p_validity: quote.validity,
  });

  if (error) {
    throw new Error(error.message);
  }

  const savedQuote = Array.isArray(data) ? data[0] : data;

  return {
    id: String(savedQuote?.id ?? ''),
    quoteNumber: String(savedQuote?.quote_number ?? ''),
  };
}

export async function fetchSavedQuotes(appPassword: string): Promise<SavedQuote[]> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('list_saved_quotes', {
    p_app_password: appPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSavedQuote);
}

export async function fetchSavedQuote(appPassword: string, quoteId: string): Promise<SavedQuote> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_saved_quote', {
    p_app_password: appPassword,
    p_quote_id: quoteId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const savedQuote = Array.isArray(data) ? data[0] : data;

  if (!savedQuote) {
    throw new Error('Offerte niet gevonden.');
  }

  return mapSavedQuote(savedQuote as SavedQuoteRow);
}

export async function deleteSavedQuote(appPassword: string, quoteId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc('delete_saved_quote', {
    p_app_password: appPassword,
    p_quote_id: quoteId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
