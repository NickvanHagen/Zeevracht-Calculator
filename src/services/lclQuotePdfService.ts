import type { ShipmentDirection } from '../types/shipment';

export type LclQuoteDetails = {
  customerName: string;
  tffReference: string;
  customerReference: string;
  incoterms: string;
  loadingPlace: string;
  unloadingPlace: string;
  route: string;
  validity: string;
  note: string;
};

export type LclQuotePalletLine = {
  quantity: string;
  type: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightPerItemKg: string;
};

export type LclQuoteLanguage = 'nl' | 'en';

export type LclQuotePdfInput = {
  direction: ShipmentDirection;
  details: LclQuoteDetails;
  language: LclQuoteLanguage;
  logoUrl: string;
  loadMeters: string;
  palletLines: LclQuotePalletLine[];
  salesPrice: string;
};

const exportTerms = [
  'Alleen van toepassing op niet-gevaarlijke goederen (general cargo/ NON-DG), tenzij anders vermeld.',
  'Exclusief eventuele douane-inspectiekosten (FYCO), indien van toepassing.',
  'Exclusief opslagkosten en transportverzekering, tenzij anders vermeld.',
  'Lokale kosten, inklaring, invoerrechten, belastingen en overige heffingen op bestemming zijn voor rekening van de ontvanger, tenzij anders vermeld.',
  'Onder voorbehoud van wijzigingen in vaarschema\'s, roll-overs, congestie en vertragingen buiten onze invloedssfeer.',
  'Op al onze werkzaamheden zijn de Nederlandse expeditievoorwaarden (FENEX) van toepassing.',
];

const importTerms = [
  'Alleen van toepassing op niet-gevaarlijke goederen (general cargo/ NON-DG), tenzij anders vermeld.',
  'Inklaring inclusief 1 HS-code; iedere extra HS-code wordt belast tegen €13,50 per code.',
  'Exclusief invoerrechten, BTW en voorschotprovisie van 3% (minimum €25,-), tenzij anders vermeld.',
  'Exclusief eventuele ontgassings- en douane-inspectiekosten (FYCO), indien van toepassing.',
  'Exclusief opslagkosten en transportverzekering, tenzij anders vermeld.',
  'Exclusief demurrage- en detentiekosten, indien van toepassing.',
  'Onder voorbehoud van wijzigingen in vaarschema\'s, roll-overs, congestie en vertragingen buiten onze invloedssfeer.',
  'Twee uur laden en lossen inbegrepen; daarna €85,- per extra uur.',
];

const exportTermsEn = [
  'Only applicable to non-dangerous goods (general cargo / NON-DG), unless stated otherwise.',
  'Excluding any customs inspection costs (FYCO), if applicable.',
  'Excluding storage costs and transport insurance, unless stated otherwise.',
  'Local charges, import customs clearance, import duties, taxes and other charges at destination are for the account of the consignee, unless stated otherwise.',
  'Subject to changes in sailing schedules, roll-overs, congestion and delays beyond our control.',
  'All our activities are subject to the Dutch Forwarding Conditions (FENEX).',
];

const importTermsEn = [
  'Only applicable to non-dangerous goods (general cargo / NON-DG), unless stated otherwise.',
  'Import customs clearance includes 1 HS code; each additional HS code will be charged at €13.50 per code.',
  'Excluding import duties, VAT and disbursement fee of 3% (minimum €25), unless stated otherwise.',
  'Excluding any degassing and customs inspection costs (FYCO), if applicable.',
  'Excluding storage costs and transport insurance, unless stated otherwise.',
  'Excluding demurrage and detention costs, if applicable.',
  'Subject to changes in sailing schedules, roll-overs, congestion and delays beyond our control.',
  'Two hours loading and unloading included; thereafter €85 per additional hour.',
];

const typeLabels: Record<LclQuoteLanguage, Record<string, string>> = {
  en: {
    blokpallet: 'Block pallet',
    custom: 'Custom',
    europallet: 'Euro pallet',
  },
  nl: {
    blokpallet: 'Blokpallet',
    custom: 'Afwijkend',
    europallet: 'Europallet',
  },
};

const labels = {
  en: {
    customerName: 'Customer name',
    customerReference: 'Customer reference',
    dimensions: 'Dimensions',
    loadingPlace: 'Loading place',
    loadMeters: 'Load meters',
    lclQuote: 'LCL Quotation',
    note: 'Remark / description',
    palletDetails: 'Shipment details',
    printButton: 'Save / print PDF',
    closingText:
      'Thank you for your inquiry. We hope to be of service to you. If you have any questions about this quotation, please feel free to contact us.',
    quantity: 'Quantity',
    quoteDate: 'Quotation date',
    route: 'Route / ports',
    salesPrice: 'Total sales price',
    terms: 'Terms LCL',
    tffReference: 'TFF reference',
    type: 'Type',
    unloadingPlace: 'Unloading place',
    validity: 'Validity',
    weightPerItem: 'Kg/item',
  },
  nl: {
    customerName: 'Klantnaam',
    customerReference: 'Klantreferentie',
    dimensions: 'Afmetingen',
    loadingPlace: 'Laadplaats',
    loadMeters: 'Laadmeters',
    lclQuote: 'LCL Offerte',
    note: 'Opmerking / omschrijving',
    palletDetails: 'Zendinggegevens',
    printButton: 'PDF opslaan / printen',
    closingText:
      'Wij danken u voor uw aanvraag en hopen u van dienst te mogen zijn. Heeft u vragen over deze offerte? Neem gerust contact met ons op.',
    quantity: 'Aantal',
    quoteDate: 'Offertedatum',
    route: 'Route / havens',
    salesPrice: 'Verkoopprijs totaal',
    terms: 'Voorwaarden LCL',
    tffReference: 'TFF referentie',
    type: 'Type',
    unloadingPlace: 'Losplaats',
    validity: 'Geldigheid',
    weightPerItem: 'Kg/stuk',
  },
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function optionalRow(label: string, value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  return `<div class="info-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(trimmedValue)}</strong></div>`;
}

function buildPalletRows(lines: LclQuotePalletLine[], language: LclQuoteLanguage) {
  return lines
    .filter((line) => Number(line.quantity) > 0)
    .map((line) => {
      const dimensions = [line.lengthCm, line.widthCm, line.heightCm]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(' x ');

      return `
        <tr>
          <td>${escapeHtml(line.quantity || '-')}</td>
          <td>${escapeHtml(typeLabels[language][line.type] ?? line.type)}</td>
          <td>${escapeHtml(dimensions ? `${dimensions} cm` : '-')}</td>
          <td>${escapeHtml(line.weightPerItemKg ? `${line.weightPerItemKg} kg` : '-')}</td>
        </tr>
      `;
    })
    .join('');
}

export function generateLclQuotePdf({
  details,
  direction,
  language,
  loadMeters,
  logoUrl,
  palletLines,
  salesPrice,
}: LclQuotePdfInput) {
  const copy = labels[language];
  const quoteDate = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'nl-NL').format(new Date());
  const terms =
    language === 'en'
      ? direction === 'import'
        ? importTermsEn
        : exportTermsEn
      : direction === 'import'
        ? importTerms
        : exportTerms;
  const popup = window.open('', '_blank', 'width=900,height=1100');

  if (!popup) {
    window.alert(
      language === 'en'
        ? 'The quotation could not be opened. Please allow pop-ups for this application.'
        : 'De offerte kon niet worden geopend. Sta pop-ups toe voor deze applicatie.',
    );
    return;
  }

  const html = `<!doctype html>
    <html lang="${language}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(copy.lclQuote)} - ${escapeHtml(details.customerName)}</title>
        <style>
          @page { margin: 10mm; size: A4; }
          * { box-sizing: border-box; }
          body {
            color: #17324a;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9.7px;
            line-height: 1.28;
            margin: 0;
          }
          .page {
            padding-bottom: 30mm;
            width: 100%;
          }
          header {
            align-items: center;
            border-bottom: 2.5px solid #0077bd;
            display: flex;
            justify-content: space-between;
            padding-bottom: 9px;
            width: 100%;
          }
          .logo { height: 38px; object-fit: contain; }
          .company {
            color: #005b96;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.01em;
            text-align: right;
          }
          h1 {
            color: #005b96;
            font-size: 23px;
            letter-spacing: 0.01em;
            margin: 11px 0 9px;
          }
          h2 {
            color: #005b96;
            font-size: 12px;
            margin: 11px 0 5px;
          }
          .quote-grid {
            display: grid;
            gap: 5px 22px;
            grid-template-columns: 1fr 1fr;
            width: 100%;
          }
          .info-row {
            border-bottom: 1px solid #d5e7f4;
            display: flex;
            gap: 12px;
            justify-content: space-between;
            min-height: 18px;
            padding: 3.5px 0;
          }
          .info-row span {
            color: #5b7185;
            font-weight: 700;
          }
          .info-row strong {
            color: #17324a;
            font-weight: 700;
            text-align: right;
          }
          table {
            border-collapse: collapse;
            margin-top: 5px;
            table-layout: fixed;
            width: 100%;
          }
          th {
            background: #e5f2fb;
            color: #17324a;
            font-size: 9.2px;
            font-weight: 700;
            text-align: left;
          }
          th, td {
            border: 1px solid #d5e7f4;
            padding: 4.5px 6px;
            vertical-align: top;
            word-break: break-word;
          }
          th:nth-child(1), td:nth-child(1) { width: 13%; }
          th:nth-child(2), td:nth-child(2) { width: 22%; }
          th:nth-child(3), td:nth-child(3) { width: 45%; }
          th:nth-child(4), td:nth-child(4) { width: 20%; }
          .total {
            align-items: center;
            background: linear-gradient(135deg, #eef8ff, #dceffa);
            border: 1.5px solid #8bbfe3;
            display: flex;
            justify-content: space-between;
            margin-top: 9px;
            padding: 9px 12px;
            width: 100%;
          }
          .total span {
            color: #17324a;
            display: block;
            font-size: 10px;
            font-weight: 700;
          }
          .total strong {
            color: #005b96;
            display: block;
            font-size: 22px;
            font-weight: 800;
            text-align: right;
          }
          .note {
            border-left: 3px solid #0077bd;
            color: #17324a;
            margin-top: 7px;
            max-height: 62px;
            overflow: hidden;
            padding: 5px 8px;
            white-space: pre-wrap;
          }
          .note strong {
            color: #005b96;
          }
          .terms {
            margin-top: 8px;
          }
          .terms h2 {
            border-top: 1px solid #afcee5;
            padding-top: 7px;
          }
          .terms ul {
            font-size: 9.2px;
            line-height: 1.38;
            list-style-position: outside;
            margin: 5px 0 0 15px;
            padding: 0;
          }
          .terms li {
            margin-bottom: 5px;
            padding-left: 1px;
          }
          .closing-text {
            color: #17324a;
            font-size: 9px;
            line-height: 1.35;
            margin-top: 12px;
          }
          .pdf-footer {
            border-top: 1.5px solid #0077bd;
            bottom: 0;
            color: #444f59;
            display: grid;
            font-size: 8px;
            gap: 8px;
            grid-template-columns: 1.1fr 1.2fr 1fr;
            left: 0;
            line-height: 1.32;
            padding-top: 6px;
            position: fixed;
            right: 0;
            width: 100%;
          }
          .pdf-footer strong {
            color: #17324a;
            display: block;
            font-size: 8.4px;
            margin-bottom: 2px;
          }
          .pdf-footer a,
          .pdf-footer .link {
            color: #0077bd;
            text-decoration: none;
          }
          @media print {
            .print-actions { display: none; }
          }
          .print-actions { margin-top: 16px; }
          .print-actions button {
            background: #0077bd;
            border: 0;
            border-radius: 6px;
            color: white;
            cursor: pointer;
            font-weight: 700;
            padding: 9px 14px;
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header>
            <img alt="TFF" class="logo" src="${escapeHtml(logoUrl)}" />
            <div class="company">Team Freight Forwarding</div>
          </header>

          <h1>${escapeHtml(copy.lclQuote)}</h1>

          <section class="quote-grid">
            <div>
              <div class="info-row"><span>${escapeHtml(copy.quoteDate)}</span><strong>${escapeHtml(quoteDate)}</strong></div>
              <div class="info-row"><span>${escapeHtml(copy.validity)}</span><strong>${escapeHtml(details.validity)}</strong></div>
              <div class="info-row"><span>${escapeHtml(copy.customerName)}</span><strong>${escapeHtml(details.customerName)}</strong></div>
              ${optionalRow(copy.tffReference, details.tffReference)}
              ${optionalRow(copy.customerReference, details.customerReference)}
              <div class="info-row"><span>Incoterms</span><strong>${escapeHtml(details.incoterms)}</strong></div>
            </div>
            <div>
              ${optionalRow(copy.loadingPlace, details.loadingPlace)}
              ${optionalRow(copy.unloadingPlace, details.unloadingPlace)}
              ${optionalRow(copy.route, details.route)}
              <div class="info-row"><span>${escapeHtml(copy.loadMeters)}</span><strong>${escapeHtml(loadMeters)}</strong></div>
            </div>
          </section>

          <h2>${escapeHtml(copy.palletDetails)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(copy.quantity)}</th>
                <th>${escapeHtml(copy.type)}</th>
                <th>${escapeHtml(copy.dimensions)}</th>
                <th>${escapeHtml(copy.weightPerItem)}</th>
              </tr>
            </thead>
            <tbody>${buildPalletRows(palletLines, language)}</tbody>
          </table>

          <div class="total">
            <span>${escapeHtml(copy.salesPrice)}</span>
            <strong>${escapeHtml(salesPrice)}</strong>
          </div>

          ${
            details.note.trim()
              ? `<section class="note"><strong>${escapeHtml(copy.note)}</strong><br />${escapeHtml(details.note)}</section>`
              : ''
          }

          <section class="terms">
            <h2>${escapeHtml(copy.terms)} ${direction === 'import' ? 'IMPORT' : 'EXPORT'}</h2>
            <ul>
              ${terms.map((term) => `<li>${escapeHtml(term)}</li>`).join('')}
            </ul>
          </section>
          <p class="closing-text">${escapeHtml(copy.closingText)}</p>
        </main>

        <footer class="pdf-footer">
          <div>
            <strong>Team Freight Forwarding</strong>
            Marconiweg 14<br />
            8501 XM Joure<br />
            Nederland
          </div>
          <div>
            T +31 (0)513 745 220<br />
            E <span class="link">ocean@tfflogistics.com</span><br />
            W <span class="link">www.tfflogistics.com</span>
          </div>
          <div>
            KvK: 69825033<br />
            BTW: NL858027550B01
          </div>
        </footer>

        <div class="print-actions">
          <button onclick="window.print()">${escapeHtml(copy.printButton)}</button>
        </div>
        <script>
          window.addEventListener('load', () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
