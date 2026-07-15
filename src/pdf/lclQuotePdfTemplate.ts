import type { ShipmentDirection } from '../types/shipment';

export type LclQuotePdfLanguage = 'nl' | 'en';

export type LclQuotePdfDetails = {
  customerName: string;
  tffReference: string;
  customerReference: string;
  incoterms: string;
  loadingAddress: string;
  loadingPlace: string;
  unloadingAddress: string;
  unloadingPlace: string;
  route: string;
  validity: string;
  note: string;
};

export type LclQuotePdfPalletLine = {
  quantity: string;
  type: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightPerItemKg: string;
};

export type LclQuotePdfTemplateData = {
  bannerDataUrl?: string;
  details: LclQuotePdfDetails;
  direction: ShipmentDirection;
  language: LclQuotePdfLanguage;
  loadMeters: string;
  logoDataUrl?: string;
  palletLines: LclQuotePdfPalletLine[];
  quoteDate?: string;
  quoteNumber?: string;
  salesPrice: string;
};

const typeLabels: Record<LclQuotePdfLanguage, Record<string, string>> = {
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
    loadingPlace: 'Loading port',
    loadMeters: 'Load meters',
    lclQuote: 'LCL Quotation',
    note: 'Remark / description',
    palletDetails: 'Shipment details',
    closingText:
      'Thank you for your inquiry. We hope to be of service to you. If you have any questions about this quotation, please feel free to contact us.',
    quantity: 'Quantity',
    quoteNumber: 'Quote number',
    quoteDate: 'Quotation date',
    salesPrice: 'Total sales price',
    terms: 'Terms LCL',
    tffReference: 'TFF reference',
    type: 'Type',
    unloadingPlace: 'Unloading port',
    validity: 'Validity',
    weightPerItem: 'Kg/item',
  },
  nl: {
    customerName: 'Klantnaam',
    customerReference: 'Klantreferentie',
    dimensions: 'Afmetingen',
    loadingPlace: 'Laadhaven',
    loadMeters: 'Laadmeters',
    lclQuote: 'LCL Offerte',
    note: 'Opmerking / omschrijving',
    palletDetails: 'Zendinggegevens',
    closingText:
      'Wij danken u voor uw aanvraag en hopen u van dienst te mogen zijn. Heeft u vragen over deze offerte? Neem gerust contact met ons op.',
    quantity: 'Aantal',
    quoteNumber: 'Offertenummer',
    quoteDate: 'Offertedatum',
    salesPrice: 'Verkoopprijs totaal',
    terms: 'Voorwaarden LCL',
    tffReference: 'TFF referentie',
    type: 'Type',
    unloadingPlace: 'Loshaven',
    validity: 'Geldigheid',
    weightPerItem: 'Kg/stuk',
  },
};

const exportTerms = [
  'Alleen van toepassing op niet-gevaarlijke goederen (general cargo / NON-DG), tenzij anders vermeld.',
  'Exclusief eventuele douane-inspectiekosten (FYCO), indien van toepassing.',
  'Exclusief opslagkosten en transportverzekering, tenzij anders vermeld.',
  'Lokale kosten, inklaring, invoerrechten, belastingen en overige heffingen op bestemming zijn voor rekening van de ontvanger, tenzij anders vermeld.',
  'Onder voorbehoud van wijzigingen in vaarschema’s, roll-overs, congestie en vertragingen buiten onze invloedssfeer.',
  'Op al onze werkzaamheden zijn de Nederlandse expeditievoorwaarden (FENEX) van toepassing.',
];

const importTerms = [
  'Alleen van toepassing op niet-gevaarlijke goederen (general cargo / NON-DG), tenzij anders vermeld.',
  'Inklaring inclusief 1 HS-code; iedere extra HS-code wordt belast tegen €13,50 per code.',
  'Exclusief invoerrechten, BTW en voorschotprovisie van 3% (minimum €25,-), tenzij anders vermeld.',
  'Exclusief eventuele ontgassings- en douane-inspectiekosten (FYCO), indien van toepassing.',
  'Exclusief opslagkosten en transportverzekering, tenzij anders vermeld.',
  'Exclusief demurrage- en detentiekosten, indien van toepassing.',
  'Onder voorbehoud van wijzigingen in vaarschema’s, roll-overs, congestie en vertragingen buiten onze invloedssfeer.',
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value: string | undefined, language: LclQuotePdfLanguage) {
  if (!value) {
    return '';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function getTerms(direction: ShipmentDirection, language: LclQuotePdfLanguage) {
  if (language === 'en') {
    return direction === 'import' ? importTermsEn : exportTermsEn;
  }

  return direction === 'import' ? importTerms : exportTerms;
}

function renderOptionalRow(label: string, value: string) {
  if (!value.trim()) {
    return '';
  }

  return `
    <div class="info-row">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function renderPalletRows(data: LclQuotePdfTemplateData) {
  const visibleRows = data.palletLines.filter((line) => Number(line.quantity) > 0);

  if (visibleRows.length === 0) {
    return '<tr><td colspan="4">-</td></tr>';
  }

  return visibleRows
    .map((line) => {
      const dimensions = [line.lengthCm, line.widthCm, line.heightCm].filter(Boolean).join(' × ');
      const type = typeLabels[data.language][line.type] ?? line.type;

      return `
        <tr>
          <td>${escapeHtml(line.quantity || '-')}</td>
          <td>${escapeHtml(type)}</td>
          <td>${escapeHtml(dimensions ? `${dimensions} cm` : '-')}</td>
          <td>${escapeHtml(line.weightPerItemKg ? `${line.weightPerItemKg} kg` : '-')}</td>
        </tr>
      `;
    })
    .join('');
}

export function renderLclQuoteHtml(data: LclQuotePdfTemplateData) {
  const copy = labels[data.language];
  const quoteDate =
    data.quoteDate ??
    new Intl.DateTimeFormat(data.language === 'en' ? 'en-GB' : 'nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  const terms = getTerms(data.direction, data.language);
  const price = data.salesPrice.trim().startsWith('EUR') ? data.salesPrice : `EUR ${data.salesPrice}`;

  return `<!doctype html>
<html lang="${data.language}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(copy.lclQuote)} ${data.quoteNumber ? escapeHtml(data.quoteNumber) : ''}</title>
    <style>
      @page {
        size: A4;
        margin: 16mm 15mm 25mm;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        color: #1e293b;
        font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        font-size: 10.5pt;
        line-height: 1.45;
        background: #ffffff;
      }

      body {
        padding-bottom: 18mm;
      }

      .page {
        position: relative;
      }

      .hero {
        display: grid;
        grid-template-columns: 240px 1fr;
        gap: 28px;
        align-items: start;
        min-height: 134px;
        margin-bottom: 18px;
      }

      .brand {
        padding-top: 4px;
      }

      .brand img {
        display: block;
        width: 142px;
        height: auto;
        margin-bottom: 8px;
      }

      .brand-name {
        color: #0b6fcb;
        font-size: 12pt;
        letter-spacing: 0.01em;
      }

      .hero-media {
        position: relative;
        height: 124px;
        overflow: hidden;
        border-bottom-left-radius: 96px;
      }

      .hero-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .hero-media::before,
      .hero-media::after {
        content: "";
        position: absolute;
        inset: -20px auto -20px -46px;
        width: 78px;
        border-radius: 999px;
        transform: rotate(-22deg);
      }

      .hero-media::before {
        background: rgba(11, 111, 203, 0.74);
      }

      .hero-media::after {
        left: -22px;
        width: 54px;
        background: rgba(122, 190, 232, 0.7);
      }

      .rule {
        height: 1px;
        width: 58%;
        background: #dce8f4;
        margin: 0 0 22px;
      }

      h1 {
        margin: 0 0 26px;
        color: #123a63;
        font-size: 34pt;
        line-height: 1;
        letter-spacing: -0.035em;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 240px;
        gap: 38px;
        align-items: start;
        margin-bottom: 38px;
      }

      .info-list {
        display: grid;
        gap: 10px;
        margin: 0;
      }

      .info-row {
        display: grid;
        grid-template-columns: 130px 1fr;
        gap: 18px;
        align-items: baseline;
      }

      dt {
        color: #123a63;
        font-weight: 500;
      }

      dd {
        margin: 0;
        color: #123a63;
        font-weight: 700;
      }

      .route-card {
        padding: 20px 24px;
        border-left: 1px solid #dce8f4;
        background: linear-gradient(90deg, #f8fbff 0%, #ffffff 100%);
      }

      .route-item {
        display: grid;
        grid-template-columns: 34px 1fr;
        gap: 16px;
        align-items: center;
      }

      .route-item + .route-item {
        margin-top: 18px;
      }

      .route-icon,
      .section-icon,
      .info-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border: 1px solid #8bbfe9;
        border-radius: 999px;
        color: #0b6fcb;
      }

      .route-item span {
        display: block;
        color: #4b647d;
        font-size: 9pt;
      }

      .route-item strong {
        display: block;
        color: #123a63;
        font-size: 11pt;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 0 14px;
        color: #123a63;
        font-size: 17pt;
        line-height: 1.2;
        break-after: avoid;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 24px;
        overflow: hidden;
        border: 1px solid #dce8f4;
      }

      thead {
        display: table-header-group;
      }

      tr {
        break-inside: avoid;
      }

      th {
        padding: 12px 18px;
        color: #ffffff;
        background: linear-gradient(90deg, #0b6fcb, #087fce);
        text-align: left;
        font-weight: 800;
        font-size: 9.5pt;
      }

      td {
        padding: 13px 18px;
        border-top: 1px solid #dce8f4;
        color: #123a63;
        font-weight: 500;
      }

      .price-box {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 20px;
        margin: 10px 0 34px;
        padding: 20px 24px;
        border: 1.6px solid #0b6fcb;
        background: #edf6ff;
        break-inside: avoid;
      }

      .price-label {
        color: #123a63;
        font-size: 15pt;
        font-weight: 800;
      }

      .price-value {
        color: #123a63;
        font-size: 28pt;
        line-height: 1;
        font-weight: 800;
        letter-spacing: -0.02em;
        white-space: nowrap;
      }

      .note {
        margin: 0 0 28px;
        break-inside: avoid;
      }

      .note h2,
      .terms h2 {
        margin: 0 0 8px;
        color: #123a63;
        font-size: 14pt;
      }

      .note p {
        margin: 0;
      }

      .terms {
        margin-top: 2px;
      }

      .terms ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .terms li {
        position: relative;
        margin: 0 0 7px;
        padding-left: 22px;
        color: #123a63;
        font-size: 9.2pt;
        break-inside: avoid;
      }

      .terms li::before {
        content: "✓";
        position: absolute;
        left: 0;
        top: 0.1em;
        width: 13px;
        height: 13px;
        border: 1px solid #0b6fcb;
        border-radius: 999px;
        color: #0b6fcb;
        font-size: 8px;
        line-height: 12px;
        text-align: center;
        font-weight: 800;
      }

      .message {
        display: grid;
        grid-template-columns: 30px 1fr;
        gap: 16px;
        align-items: center;
        margin: 28px 0 0;
        padding: 16px 20px;
        background: #f1f7ff;
        color: #123a63;
        break-inside: avoid;
      }

      .info-icon {
        background: #0b6fcb;
        color: #ffffff;
        border-color: #0b6fcb;
        font-weight: 800;
      }

      .footer {
        position: fixed;
        left: 15mm;
        right: 15mm;
        bottom: 9mm;
        padding-top: 8px;
        border-top: 1.3px solid #0b6fcb;
        display: grid;
        grid-template-columns: 1fr 1fr 1.05fr;
        gap: 24px;
        color: #1e293b;
        font-size: 7.8pt;
        line-height: 1.45;
      }

      .footer strong {
        display: block;
        margin-bottom: 6px;
        color: #0b6fcb;
      }

      .footer-line {
        display: grid;
        grid-template-columns: 16px 1fr;
        gap: 8px;
        align-items: start;
      }

      .footer a {
        color: #0b6fcb;
        text-decoration: none;
      }

      @media print {
        .price-box,
        .message,
        .section-title {
          break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="hero">
        <div class="brand">
          ${data.logoDataUrl ? `<img src="${data.logoDataUrl}" alt="TFF" />` : '<div class="brand-name">TFF</div>'}
          <div class="brand-name">Team Freight Forwarding</div>
        </div>
        ${
          data.bannerDataUrl
            ? `<div class="hero-media"><img src="${data.bannerDataUrl}" alt="Container terminal" /></div>`
            : '<div class="hero-media"></div>'
        }
      </header>

      <div class="rule"></div>
      <h1>${escapeHtml(copy.lclQuote)}</h1>

      <section class="meta-grid">
        <dl class="info-list">
          ${renderOptionalRow(copy.quoteDate, quoteDate)}
          ${renderOptionalRow(copy.quoteNumber, data.quoteNumber ?? '')}
          ${renderOptionalRow(copy.validity, formatDate(data.details.validity, data.language))}
          ${renderOptionalRow(copy.customerName, data.details.customerName)}
          ${renderOptionalRow(copy.tffReference, data.details.tffReference)}
          ${renderOptionalRow(copy.customerReference, data.details.customerReference)}
          ${renderOptionalRow('Incoterms', data.details.incoterms)}
        </dl>
        <aside class="route-card">
          <div class="route-item">
            <div class="route-icon">☸</div>
            <div>
              <span>${escapeHtml(copy.loadingPlace)}</span>
              <strong>${escapeHtml(data.details.loadingPlace || '-')}</strong>
            </div>
          </div>
          <div class="route-item">
            <div class="route-icon">▥</div>
            <div>
              <span>${escapeHtml(copy.unloadingPlace)}</span>
              <strong>${escapeHtml(data.details.unloadingPlace || '-')}</strong>
            </div>
          </div>
          <div class="route-item">
            <div class="route-icon">⌂</div>
            <div>
              <span>${escapeHtml(copy.loadMeters)}</span>
              <strong>${escapeHtml(data.loadMeters || '-')}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section>
        <h2 class="section-title"><span class="section-icon">▥</span>${escapeHtml(copy.palletDetails)}</h2>
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(copy.quantity)}</th>
              <th>${escapeHtml(copy.type)}</th>
              <th>${escapeHtml(copy.dimensions)} (L × B × H)</th>
              <th>${escapeHtml(copy.weightPerItem)}</th>
            </tr>
          </thead>
          <tbody>${renderPalletRows(data)}</tbody>
        </table>
      </section>

      <section class="price-box">
        <div class="price-label">${escapeHtml(copy.salesPrice)}</div>
        <div class="price-value">${escapeHtml(price)}</div>
      </section>

      ${
        data.details.note.trim()
          ? `<section class="note"><h2>${escapeHtml(copy.note)}</h2><p>${escapeHtml(data.details.note)}</p></section>`
          : ''
      }

      <section class="terms">
        <h2 class="section-title"><span class="section-icon">☑</span>${escapeHtml(copy.terms)}</h2>
        <ul>
          ${terms.map((term) => `<li>${escapeHtml(term)}</li>`).join('')}
        </ul>
      </section>

      <section class="message">
        <div class="info-icon">i</div>
        <div>${escapeHtml(copy.closingText)}</div>
      </section>
    </main>

    <footer class="footer">
      <div>
        <strong>Team Freight Forwarding</strong>
        <div class="footer-line"><span>⌖</span><span>Marconiweg 14<br />8501 XM Joure, Nederland</span></div>
      </div>
      <div>
        <div class="footer-line"><span>☎</span><span>+31 (0)513 745 220</span></div>
        <div class="footer-line"><span>✉</span><span><a href="mailto:ocean@tfflogistics.com">ocean@tfflogistics.com</a></span></div>
        <div class="footer-line"><span>◎</span><span><a href="https://www.tfflogistics.com">www.tfflogistics.com</a></span></div>
      </div>
      <div>
        KvK: 69825033<br />
        BTW: NL858027550B01<br />
        IBAN: NL68 RABO 0162 6354 88<br />
        BIC: RABONL2U
      </div>
    </footer>
  </body>
</html>`;
}
