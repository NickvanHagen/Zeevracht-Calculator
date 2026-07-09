import type { ShipmentDirection } from '../types/shipment';

export type LclQuoteDetails = {
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
  quoteNumber?: string;
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
    loadingAddress: 'Loading address',
    loadingPlace: 'Loading port',
    loadMeters: 'Load meters',
    lclQuote: 'LCL Quotation',
    note: 'Remark / description',
    palletDetails: 'Shipment details',
    printButton: 'Save / print PDF',
    closingText:
      'Thank you for your inquiry. We hope to be of service to you. If you have any questions about this quotation, please feel free to contact us.',
    quantity: 'Quantity',
    quoteNumber: 'Quote number',
    quoteDate: 'Quotation date',
    route: 'Route / ports',
    salesPrice: 'Total sales price',
    terms: 'Terms LCL',
    tffReference: 'TFF reference',
    type: 'Type',
    unloadingAddress: 'Unloading address',
    unloadingPlace: 'Unloading port',
    validity: 'Validity',
    weightPerItem: 'Kg/item',
  },
  nl: {
    customerName: 'Klantnaam',
    customerReference: 'Klantreferentie',
    dimensions: 'Afmetingen',
    loadingAddress: 'Laadadres',
    loadingPlace: 'Laadhaven',
    loadMeters: 'Laadmeters',
    lclQuote: 'LCL Offerte',
    note: 'Opmerking / omschrijving',
    palletDetails: 'Zendinggegevens',
    printButton: 'PDF opslaan / printen',
    closingText:
      'Wij danken u voor uw aanvraag en hopen u van dienst te mogen zijn. Heeft u vragen over deze offerte? Neem gerust contact met ons op.',
    quantity: 'Aantal',
    quoteNumber: 'Offertenummer',
    quoteDate: 'Offertedatum',
    route: 'Route / havens',
    salesPrice: 'Verkoopprijs totaal',
    terms: 'Voorwaarden LCL',
    tffReference: 'TFF referentie',
    type: 'Type',
    unloadingAddress: 'Losadres',
    unloadingPlace: 'Loshaven',
    validity: 'Geldigheid',
    weightPerItem: 'Kg/stuk',
  },
};

function normalizePdfText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('€', 'EUR')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdfText(value: string) {
  return normalizePdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function formatPdfDate(value: string, language: LclQuoteLanguage) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'nl-NL').format(new Date(`${value}T00:00:00`));
}

function wrapPdfText(value: string, maxLength: number) {
  const words = normalizePdfText(value).split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxLength && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = nextLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function createPdfBlob(pageContents: string[]) {
  const objects: string[] = [];
  const pageObjectIds = pageContents.map((_, index) => 4 + index * 2);

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;
  objects[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  pageContents.forEach((content, index) => {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = pageObjectId + 1;

    objects[pageObjectId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId - 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function generateLclQuotePdf({
  details,
  direction,
  language,
  loadMeters,
  palletLines,
  quoteNumber,
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

  const pages: string[] = [];
  let content = '';
  let y = 802;
  const left = 42;
  const right = 553;

  const text = (value: string, x: number, size = 9, lineHeight = 12) => {
    content += `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET\n`;
    y -= lineHeight;
  };
  const line = (yPosition: number, width = 1) => {
    content += `0 0.47 0.74 RG ${width} w ${left} ${yPosition} m ${right} ${yPosition} l S\n`;
  };
  const footer = () => {
    line(62, 1);
    content += `BT /F1 8 Tf ${left} 48 Td (Team Freight Forwarding   Marconiweg 14   8501 XM Joure   Nederland) Tj ET\n`;
    content += `BT /F1 8 Tf ${left} 36 Td (T +31 \\(0\\)513 745 220   E ocean@tfflogistics.com   W www.tfflogistics.com) Tj ET\n`;
    content += `BT /F1 8 Tf ${left} 24 Td (KvK: 69825033   BTW: NL858027550B01) Tj ET\n`;
  };
  const newPage = () => {
    footer();
    pages.push(content);
    content = '';
    y = 802;
  };
  const ensureSpace = (needed: number) => {
    if (y - needed < 82) {
      newPage();
    }
  };
  const row = (label: string, value: string, x = left) => {
    if (!value.trim()) {
      return;
    }

    ensureSpace(14);
    content += `BT /F1 8 Tf ${x} ${y} Td (${escapePdfText(label)}) Tj ET\n`;
    content += `BT /F1 9 Tf ${x + 112} ${y} Td (${escapePdfText(value)}) Tj ET\n`;
    y -= 14;
  };

  content += `0.89 0.96 0.99 rg ${left} 778 96 28 re f\n`;
  content += `BT /F1 18 Tf ${left + 12} 786 Td (TFF) Tj ET\n`;
  content += `BT /F1 13 Tf 408 790 Td (Team Freight Forwarding) Tj ET\n`;
  line(770, 2);
  y = 748;
  text(copy.lclQuote, left, 22, 24);
  row(copy.quoteDate, quoteDate);
  if (quoteNumber) row(copy.quoteNumber, quoteNumber);
  row(copy.validity, formatPdfDate(details.validity, language));
  row(copy.customerName, details.customerName);
  row(copy.tffReference, details.tffReference);
  row(copy.customerReference, details.customerReference);
  row('Incoterms', details.incoterms);
  y -= 4;
  row(copy.loadingPlace, details.loadingPlace, 310);
  row(copy.loadingAddress, details.loadingAddress, 310);
  row(copy.unloadingPlace, details.unloadingPlace, 310);
  row(copy.unloadingAddress, details.unloadingAddress, 310);
  row(copy.loadMeters, loadMeters, 310);

  y -= 10;
  text(copy.palletDetails, left, 12, 16);
  content += `0.9 0.96 0.99 rg ${left} ${y - 2} 510 18 re f\n`;
  text(`${copy.quantity}    ${copy.type}                 ${copy.dimensions}                         ${copy.weightPerItem}`, left + 8, 8, 18);
  palletLines
    .filter((palletLine) => Number(palletLine.quantity) > 0)
    .forEach((palletLine) => {
      ensureSpace(14);
      const dimensions = [palletLine.lengthCm, palletLine.widthCm, palletLine.heightCm].filter(Boolean).join(' x ');
      text(
        `${palletLine.quantity}         ${typeLabels[language][palletLine.type] ?? palletLine.type}                 ${dimensions} cm                         ${palletLine.weightPerItemKg || '-'} kg`,
        left + 8,
        8,
        14,
      );
    });

  y -= 8;
  ensureSpace(38);
  content += `0.89 0.96 0.99 rg ${left} ${y - 22} 510 34 re f\n`;
  content += `0 0.47 0.74 RG 1 w ${left} ${y - 22} 510 34 re S\n`;
  content += `BT /F1 10 Tf ${left + 12} ${y - 3} Td (${escapePdfText(copy.salesPrice)}) Tj ET\n`;
  content += `BT /F1 20 Tf 410 ${y - 7} Td (${escapePdfText(salesPrice)}) Tj ET\n`;
  y -= 46;

  if (details.note.trim()) {
    text(copy.note, left, 11, 14);
    wrapPdfText(details.note, 105).forEach((noteLine) => text(noteLine, left, 8, 11));
    y -= 4;
  }

  text(`${copy.terms} ${direction === 'import' ? 'IMPORT' : 'EXPORT'}`, left, 11, 14);
  terms.forEach((term) => {
    wrapPdfText(`- ${term}`, 112).forEach((termLine) => {
      ensureSpace(11);
      text(termLine, left, 7.8, 10);
    });
  });

  y -= 4;
  wrapPdfText(copy.closingText, 112).forEach((closingLine) => text(closingLine, left, 8, 10));
  footer();
  pages.push(content);

  const pdfUrl = URL.createObjectURL(createPdfBlob(pages));
  const popup = window.open(pdfUrl, '_blank');

  if (!popup) {
    window.alert(
      language === 'en'
        ? 'The PDF could not be opened. Please allow pop-ups for this application.'
        : 'De PDF kon niet worden geopend. Sta pop-ups toe voor deze applicatie.',
    );
  }
}
