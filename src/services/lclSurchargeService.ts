import { defaultSurcharges } from '../config/surcharges';
import { supabase } from './supabaseClient';

export type LclSurcharges = {
  dieselPercentage: string;
  roadChargePercentage: string;
};

export const defaultLclSurcharges: LclSurcharges = {
  dieselPercentage: String(defaultSurcharges.dieselPercentage),
  roadChargePercentage: String(defaultSurcharges.roadChargePercentage),
};

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is nog niet ingesteld. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe.');
  }

  return supabase;
};

export async function fetchLclSurcharges(): Promise<LclSurcharges> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_lcl_surcharges');

  if (error) {
    throw new Error(error.message);
  }

  const settings = Array.isArray(data) ? data[0] : data;

  return {
    dieselPercentage: String(settings?.diesel_percentage ?? defaultLclSurcharges.dieselPercentage),
    roadChargePercentage: String(settings?.road_charge_percentage ?? defaultLclSurcharges.roadChargePercentage),
  };
}

export async function saveLclSurcharges(surcharges: LclSurcharges) {
  const client = requireSupabase();
  const { error } = await client.rpc('update_lcl_surcharges', {
    p_diesel_percentage: Number(surcharges.dieselPercentage.replace(',', '.')) || 0,
    p_road_charge_percentage: Number(surcharges.roadChargePercentage.replace(',', '.')) || 0,
  });

  if (error) {
    throw new Error(error.message);
  }
}
