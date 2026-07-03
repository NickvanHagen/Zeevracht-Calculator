from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
KM_FILE = ROOT / "tools" / "data" / "JGT KM OVERZICHT.xlsx"
RATE_FILE = ROOT / "tools" / "data" / "Tarieventabel TFF 2026.xlsx"
OUTPUT_FILE = ROOT / "src" / "pricing" / "jgtData.ts"


def normalize_city(value: str) -> str:
    return re.sub(r"\s+", " ", value.lower()).strip()


def main() -> None:
    places_frame = pd.read_excel(KM_FILE, sheet_name="Blad1", header=0)
    places = []

    for _, row in places_frame.iterrows():
        city = row.iloc[0]
        km = row.iloc[1]

        if pd.isna(city) or pd.isna(km):
            continue

        city_name = str(city).strip()
        places.append(
            {
                "city": city_name,
                "km": int(round(float(km))),
                "searchKey": normalize_city(city_name),
            },
        )

    rate_frame = pd.read_excel(RATE_FILE, sheet_name="Blad1", header=None)
    rates = []

    for index in range(19, 48):
        max_km = rate_frame.iat[index, 1]
        rate_40ft = rate_frame.iat[index, 2]
        toll = rate_frame.iat[index, 3]
        rate_20ft = rate_frame.iat[index, 4]

        if pd.isna(max_km) or pd.isna(rate_20ft) or pd.isna(rate_40ft):
            continue

        rates.append(
            {
                "maxKm": int(round(float(max_km))),
                "rate20ft": float(rate_20ft),
                "rate40ft": float(rate_40ft),
                "toll": float(toll) if not pd.isna(toll) else 0,
            },
        )

    terminals = {}

    for index in [19, 20, 21]:
        label = str(rate_frame.iat[index, 6])

        if "Euromax" in label:
            key = "euromax"
            terminal_label = "Euromax"
        elif "Delta" in label:
            key = "delta"
            terminal_label = "Delta"
        else:
            key = "botlek"
            terminal_label = "Botlek"

        terminals[key] = {
            "label": terminal_label,
            "surcharge": float(rate_frame.iat[index, 11]),
            "toll": float(rate_frame.iat[index, 12]),
        }

    content = (
        "// Generated from JGT KM OVERZICHT.xlsx and Tarieventabel TFF 2026. "
        "Replace by regenerating from Excel when rates change.\n"
    )
    content += "import type { ContainerType, FclTerminal } from '../types/fcl';\n\n"
    content += "export type JgtPlaceDistance = {\n  city: string;\n  km: number;\n  searchKey: string;\n};\n\n"
    content += "export type JgtRateRow = {\n  maxKm: number;\n  rate20ft: number;\n  rate40ft: number;\n  toll: number;\n};\n\n"
    content += "export type JgtTerminalSurcharge = {\n  label: string;\n  surcharge: number;\n  toll: number;\n};\n\n"
    content += (
        "export const jgtPlaceDistances = "
        + json.dumps(places, ensure_ascii=True, separators=(",", ":"))
        + " satisfies JgtPlaceDistance[];\n\n"
    )
    content += (
        "export const jgtRateRows = "
        + json.dumps(rates, ensure_ascii=True, separators=(",", ":"))
        + " satisfies JgtRateRow[];\n\n"
    )
    content += (
        "export const jgtTerminalSurcharges = "
        + json.dumps(terminals, ensure_ascii=True, separators=(",", ":"))
        + " satisfies Record<FclTerminal, JgtTerminalSurcharge>;\n\n"
    )
    content += (
        "export const jgtFixedSurcharges = {\n"
        "  congestion: 15,\n"
        "  portbase: 5,\n"
        "  defaultAdr: 35,\n"
        "  defaultGenset: 80,\n"
        "} as const;\n\n"
    )
    content += (
        "export function getRateAmountForContainer(row: JgtRateRow, containerType: ContainerType) {\n"
        "  return containerType === '20ft' ? row.rate20ft : row.rate40ft;\n"
        "}\n"
    )

    OUTPUT_FILE.write_text(content, encoding="utf-8")
    print(f"Wrote {len(places)} places and {len(rates)} rate rows to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
