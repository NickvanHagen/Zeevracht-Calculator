import type { ShipmentDirection, ShipmentMode } from '../types/shipment';

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

export type QuotePdfShipmentLine = {
  dimensions: string;
  quantity: string;
  type: string;
  weightPerItem: string;
};

export type LclQuotePdfTemplateData = {
  bannerDataUrl?: string;
  details: LclQuotePdfDetails;
  direction: ShipmentDirection;
  language: LclQuotePdfLanguage;
  loadMeters: string;
  logoDataUrl?: string;
  mode?: ShipmentMode;
  palletLines: LclQuotePdfPalletLine[];
  quoteDate?: string;
  quoteNumber?: string;
  salesPrice: string;
  shipmentLines?: QuotePdfShipmentLine[];
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
    fclQuote: 'FCL Quotation',
    lclQuote: 'LCL Quotation',
    note: 'Remark / description',
    palletDetails: 'Shipment details',
    closingText:
      'Thank you for your inquiry. We hope to be of service to you. If you have any questions about this quotation, please feel free to contact us.',
    quantity: 'Quantity',
    quoteNumber: 'Quote number',
    quoteDate: 'Quotation date',
    salesPrice: 'Total sales price',
    termsFcl: 'Terms FCL',
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
    fclQuote: 'FCL Offerte',
    lclQuote: 'LCL Offerte',
    note: 'Opmerking / omschrijving',
    palletDetails: 'Zendinggegevens',
    closingText:
      'Wij danken u voor uw aanvraag en hopen u van dienst te mogen zijn. Heeft u vragen over deze offerte? Neem gerust contact met ons op.',
    quantity: 'Aantal',
    quoteNumber: 'Offertenummer',
    quoteDate: 'Offertedatum',
    salesPrice: 'Verkoopprijs totaal',
    termsFcl: 'Voorwaarden FCL',
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

const fclTerms = [
  'Alleen van toepassing op niet-gevaarlijke goederen (general cargo / NON-DG), tenzij anders vermeld.',
  'Onder voorbehoud van beschikbaarheid, terminalrestricties, congestie en wachttijden buiten onze invloedssfeer.',
  'Exclusief eventuele douane-inspectiekosten, opslagkosten, demurrage, detention en transportverzekering, tenzij anders vermeld.',
  'Tol, congestie, Portbase en gekozen toeslagen zijn gebaseerd op de ingevoerde route- en terminalgegevens.',
  'Op al onze werkzaamheden zijn de Nederlandse expeditievoorwaarden (FENEX) van toepassing.',
];

const fclTermsEn = [
  'Only applicable to non-dangerous goods (general cargo / NON-DG), unless stated otherwise.',
  'Subject to equipment availability, terminal restrictions, congestion and waiting times beyond our control.',
  'Excluding customs inspection costs, storage, demurrage, detention and transport insurance, unless stated otherwise.',
  'Toll, congestion, Portbase and selected surcharges are based on the entered route and terminal details.',
  'All our activities are subject to the Dutch Forwarding Conditions (FENEX).',
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

function getTerms(direction: ShipmentDirection, language: LclQuotePdfLanguage, mode: ShipmentMode) {
  if (mode === 'fcl') {
    return language === 'en' ? fclTermsEn : fclTerms;
  }

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
  if (data.shipmentLines?.length) {
    return data.shipmentLines
      .map((line) => `
        <tr>
          <td>${escapeHtml(line.quantity || '-')}</td>
          <td>${escapeHtml(line.type || '-')}</td>
          <td>${escapeHtml(line.dimensions || '-')}</td>
          <td>${escapeHtml(line.weightPerItem || '-')}</td>
        </tr>
      `)
      .join('');
  }

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

function icon(name: 'anchor' | 'check' | 'container' | 'globe' | 'info' | 'mail' | 'phone' | 'pin' | 'scale') {
  const common = 'width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"';
  const stroke = 'stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';
  const paths = {
    anchor: `<path ${stroke} d="M12 3v12"/><path ${stroke} d="M8 7h8"/><circle ${stroke} cx="12" cy="5" r="2"/><path ${stroke} d="M5 15c1.8 3 4.1 4.5 7 4.5S17.2 18 19 15"/><path ${stroke} d="M5 15h4"/><path ${stroke} d="M19 15h-4"/>`,
    check: `<circle ${stroke} cx="12" cy="12" r="8"/><path ${stroke} d="m8.5 12.2 2.2 2.2 4.8-5"/>`,
    container: `<path ${stroke} d="M4 8h16v10H4z"/><path ${stroke} d="M8 8v10M12 8v10M16 8v10"/><path ${stroke} d="M9 5h6v3H9z"/>`,
    globe: `<circle ${stroke} cx="12" cy="12" r="8"/><path ${stroke} d="M4 12h16M12 4c2 2.2 3 4.8 3 8s-1 5.8-3 8M12 4c-2 2.2-3 4.8-3 8s1 5.8 3 8"/>`,
    info: `<circle fill="currentColor" cx="12" cy="12" r="10"/><path stroke="#fff" stroke-width="2" stroke-linecap="round" d="M12 10v6"/><circle fill="#fff" cx="12" cy="7.2" r="1.1"/>`,
    mail: `<path ${stroke} d="M4 6h16v12H4z"/><path ${stroke} d="m4 7 8 6 8-6"/>`,
    phone: `<path ${stroke} d="M7 4 5 6c-.4.4-.5 1-.3 1.5 1.6 4.6 5.2 8.2 9.8 9.8.5.2 1.1.1 1.5-.3l2-2-3.2-3.2-1.6 1.6c-1.8-.9-3.2-2.3-4.1-4.1l1.6-1.6z"/>`,
    pin: `<path ${stroke} d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11z"/><circle ${stroke} cx="12" cy="10" r="2.4"/>`,
    scale: `<path ${stroke} d="M7 20h10"/><path ${stroke} d="M12 4v16"/><path ${stroke} d="M6 7h12"/><path ${stroke} d="m6 7-3 6h6z"/><path ${stroke} d="m18 7-3 6h6z"/>`,
  };

  return `<svg ${common}>${paths[name]}</svg>`;
}

export function renderLclQuoteHtml(data: LclQuotePdfTemplateData) {
  const copy = labels[data.language];
  const mode = data.mode ?? 'lcl';
  const quoteTitle = mode === 'fcl' ? copy.fclQuote : copy.lclQuote;
  const loadMetricLabel = mode === 'fcl' ? 'Container' : copy.loadMeters;
  const quoteDate =
    data.quoteDate ??
    new Intl.DateTimeFormat(data.language === 'en' ? 'en-GB' : 'nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  const terms = getTerms(data.direction, data.language, mode);
  const normalizedSalesPrice = data.salesPrice.trim();
  const price = normalizedSalesPrice.startsWith('EUR')
    ? normalizedSalesPrice
    : `EUR ${normalizedSalesPrice.replace(/^€\s*/, '')}`;

  return `<!doctype html>
<html lang="${data.language}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(quoteTitle)} ${data.quoteNumber ? escapeHtml(data.quoteNumber) : ''}</title>
    <style>
      @page {
        size: A4;
        margin: 10mm 15mm 24mm;
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
        font-size: 10.2pt;
        line-height: 1.42;
        background: #ffffff;
      }

      body {
        padding-bottom: 20mm;
      }

      .page {
        position: relative;
      }

      .hero {
        position: relative;
        min-height: 88px;
        margin-bottom: 8px;
      }

      .brand {
        padding-top: 2px;
      }

      .brand img {
        display: block;
        width: 150px;
        height: auto;
        margin-bottom: 4px;
      }

      .brand-name {
        color: #0b6fcb;
        font-size: 12.2pt;
        letter-spacing: 0.01em;
      }

      .hero-media {
        position: absolute;
        top: -10mm;
        right: -15mm;
        width: 328px;
        height: 174px;
        overflow: hidden;
        border-bottom-left-radius: 180px;
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
        top: -46px;
        bottom: -42px;
        left: -58px;
        width: 82px;
        border-radius: 999px;
        transform: rotate(-25deg);
        transform-origin: center;
      }

      .hero-media::before {
        background: rgba(11, 111, 203, 0.86);
      }

      .hero-media::after {
        left: -20px;
        width: 56px;
        background: rgba(122, 190, 232, 0.76);
      }

      .rule {
        height: 1.4px;
        width: 392px;
        background: #0b6fcb;
        margin: 0 0 24px;
      }

      h1 {
        margin: 0 0 22px;
        color: #123a63;
        font-size: 34.5pt;
        line-height: 1;
        letter-spacing: -0.035em;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 292px;
        gap: 48px;
        align-items: start;
        margin-bottom: 36px;
      }

      .info-list {
        display: grid;
        gap: 11px;
        margin: 0;
      }

      .info-row {
        display: grid;
        grid-template-columns: 132px 1fr;
        gap: 20px;
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
        padding: 20px 26px;
        border-left: 1px solid #dce8f4;
        border-radius: 8px;
        background: linear-gradient(90deg, #f7fbff 0%, #edf6ff 100%);
      }

      .route-item {
        display: grid;
        grid-template-columns: 44px 1fr;
        gap: 14px;
        align-items: center;
      }

      .route-item + .route-item {
        margin-top: 20px;
      }

      .route-icon,
      .section-icon,
      .info-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 35px;
        height: 35px;
        border: 1.2px solid #8bbfe9;
        border-radius: 999px;
        color: #0b6fcb;
      }

      .route-icon svg,
      .info-icon svg,
      .footer-icon svg {
        width: 19px;
        height: 19px;
      }

      .section-icon svg {
        width: 28px;
        height: 28px;
      }

      .section-icon {
        width: 31px;
        height: 31px;
        border: 0;
        border-radius: 0;
      }

      .route-item span {
        display: block;
        color: #4b647d;
        font-size: 9pt;
      }

      .route-item strong {
        display: block;
        color: #123a63;
        font-size: 11.2pt;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 0 12px;
        color: #123a63;
        font-size: 17.4pt;
        line-height: 1.2;
        break-after: avoid;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        overflow: hidden;
        border: 1px solid #dce8f4;
        border-radius: 4px;
      }

      thead {
        display: table-header-group;
      }

      tr {
        break-inside: avoid;
      }

      th {
        padding: 13px 18px;
        color: #ffffff;
        background: linear-gradient(90deg, #0b6fcb, #087fce);
        text-align: center;
        font-weight: 800;
        font-size: 10pt;
      }

      td {
        padding: 13px 18px;
        border-top: 1px solid #dce8f4;
        color: #123a63;
        font-weight: 500;
        text-align: center;
      }

      .price-box {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 20px;
        margin: 10px 0 28px;
        padding: 18px 24px;
        border: 1.6px solid #0b6fcb;
        background: #edf6ff;
        border-radius: 4px;
        break-inside: avoid;
      }

      .price-label {
        color: #123a63;
        font-size: 15.6pt;
        font-weight: 800;
      }

      .price-value {
        color: #123a63;
        font-size: 29pt;
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
        margin: 0 0 4.8px;
        padding-left: 22px;
        color: #123a63;
        font-size: 8.35pt;
        break-inside: avoid;
      }

      .terms li::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0.22em;
        width: 13px;
        height: 13px;
        border: 1px solid #0b6fcb;
        border-radius: 999px;
      }

      .terms li::after {
        content: "✓";
        position: absolute;
        left: 3.1px;
        top: 0.05em;
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
        margin: 22px 0 0;
        padding: 14px 22px;
        background: #f1f7ff;
        color: #123a63;
        border-radius: 7px;
        break-inside: avoid;
      }

      .info-icon {
        background: transparent;
        color: #0b6fcb;
        border: 0;
        font-weight: 800;
      }

      .footer {
        position: fixed;
        left: 15mm;
        right: 15mm;
        bottom: 6mm;
        padding-top: 12px;
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

      .footer-icon {
        color: #0b6fcb;
        line-height: 1;
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
      <h1>${escapeHtml(quoteTitle)}</h1>

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
            <div class="route-icon">${icon('anchor')}</div>
            <div>
              <span>${escapeHtml(copy.loadingPlace)}</span>
              <strong>${escapeHtml(data.details.loadingPlace || '-')}</strong>
            </div>
          </div>
          <div class="route-item">
            <div class="route-icon">${icon('container')}</div>
            <div>
              <span>${escapeHtml(copy.unloadingPlace)}</span>
              <strong>${escapeHtml(data.details.unloadingPlace || '-')}</strong>
            </div>
          </div>
          <div class="route-item">
            <div class="route-icon">${icon('scale')}</div>
            <div>
              <span>${escapeHtml(loadMetricLabel)}</span>
              <strong>${escapeHtml(data.loadMeters || '-')}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section>
        <h2 class="section-title"><span class="section-icon">${icon('container')}</span>${escapeHtml(copy.palletDetails)}</h2>
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
        <h2 class="section-title"><span class="section-icon">${icon('check')}</span>${escapeHtml(mode === 'fcl' ? copy.termsFcl : copy.terms)}</h2>
        <ul>
          ${terms.map((term) => `<li>${escapeHtml(term)}</li>`).join('')}
        </ul>
      </section>

      <section class="message">
        <div class="info-icon">${icon('info')}</div>
        <div>${escapeHtml(copy.closingText)}</div>
      </section>
    </main>

    <footer class="footer">
      <div>
        <strong>Team Freight Forwarding</strong>
        <div class="footer-line"><span class="footer-icon">${icon('pin')}</span><span>Marconiweg 14<br />8501 XM Joure, Nederland</span></div>
      </div>
      <div>
        <div class="footer-line"><span class="footer-icon">${icon('phone')}</span><span>+31 (0)513 745 220</span></div>
        <div class="footer-line"><span class="footer-icon">${icon('mail')}</span><span><a href="mailto:ocean@tfflogistics.com">ocean@tfflogistics.com</a></span></div>
        <div class="footer-line"><span class="footer-icon">${icon('globe')}</span><span><a href="https://www.tfflogistics.com">www.tfflogistics.com</a></span></div>
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
