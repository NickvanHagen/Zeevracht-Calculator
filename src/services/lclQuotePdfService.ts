import type { ShipmentDirection, ShipmentMode } from '../types/shipment';

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

export type QuotePdfShipmentLine = {
  dimensions: string;
  quantity: string;
  type: string;
  weightPerItem: string;
};

export type LclQuoteLanguage = 'nl' | 'en';

export type LclQuotePdfInput = {
  bannerUrl?: string;
  direction: ShipmentDirection;
  details: LclQuoteDetails;
  language: LclQuoteLanguage;
  logoUrl: string;
  loadMeters: string;
  mode?: ShipmentMode;
  palletLines: LclQuotePalletLine[];
  quoteNumber?: string;
  salesPrice: string;
  shipmentLines?: QuotePdfShipmentLine[];
  targetWindow?: Window | null;
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

type PdfImage = {
  height: number;
  hex: string;
  width: number;
};

function canvasToPdfImage(canvas: HTMLCanvasElement, quality = 0.92): PdfImage | undefined {
  const jpegData = canvas.toDataURL('image/jpeg', quality).split(',')[1] ?? '';
  const binary = atob(jpegData);
  let hex = '';

  for (let index = 0; index < binary.length; index += 1) {
    hex += binary.charCodeAt(index).toString(16).padStart(2, '0');
  }

  return {
    height: canvas.height,
    hex: `${hex}>`,
    width: canvas.width,
  };
}

async function loadLogoForPdf(logoUrl: string): Promise<PdfImage | undefined> {
  try {
    const image = new Image();
    image.src = logoUrl;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    return canvasToPdfImage(canvas, 0.92);
  } catch {
    return undefined;
  }
}

async function loadBannerForPdf(bannerUrl?: string): Promise<PdfImage | undefined> {
  if (!bannerUrl) {
    return undefined;
  }

  try {
    const image = new Image();
    image.src = bannerUrl;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 330;

    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }

    const imageRatio = image.naturalWidth / image.naturalHeight;
    const canvasRatio = canvas.width / canvas.height;
    const sourceHeight = imageRatio > canvasRatio ? image.naturalHeight : image.naturalWidth / canvasRatio;
    const sourceWidth = imageRatio > canvasRatio ? image.naturalHeight * canvasRatio : image.naturalWidth;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;

    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

    const overlay = context.createLinearGradient(0, 0, canvas.width, 0);
    overlay.addColorStop(0, 'rgba(255,255,255,0.08)');
    overlay.addColorStop(0.58, 'rgba(11,111,203,0.02)');
    overlay.addColorStop(1, 'rgba(18,58,99,0.22)');
    context.fillStyle = overlay;
    context.fillRect(0, 0, canvas.width, canvas.height);

    return canvasToPdfImage(canvas, 0.9);
  } catch {
    return undefined;
  }
}

function createHarborBannerForPdf(): PdfImage | undefined {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 330;

  const context = canvas.getContext('2d');
  if (!context) {
    return undefined;
  }

  const sky = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  sky.addColorStop(0, '#d7ebfb');
  sky.addColorStop(0.48, '#7bb6dc');
  sky.addColorStop(1, '#123a63');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const sun = context.createRadialGradient(265, 175, 10, 265, 175, 130);
  sun.addColorStop(0, 'rgba(255, 216, 150, 0.85)');
  sun.addColorStop(0.45, 'rgba(255, 164, 84, 0.32)');
  sun.addColorStop(1, 'rgba(255, 164, 84, 0)');
  context.fillStyle = sun;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(18, 58, 99, 0.72)';
  context.fillRect(0, 222, canvas.width, 108);

  const drawCrane = (x: number, y: number, scale: number) => {
    context.strokeStyle = 'rgba(15, 38, 62, 0.74)';
    context.lineWidth = 5 * scale;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 18 * scale, y - 150 * scale);
    context.lineTo(x + 58 * scale, y);
    context.moveTo(x + 18 * scale, y - 150 * scale);
    context.lineTo(x + 210 * scale, y - 180 * scale);
    context.moveTo(x + 88 * scale, y - 170 * scale);
    context.lineTo(x + 118 * scale, y - 80 * scale);
    context.moveTo(x + 42 * scale, y - 48 * scale);
    context.lineTo(x + 174 * scale, y - 166 * scale);
    context.stroke();
  };

  drawCrane(420, 226, 0.85);
  drawCrane(620, 222, 0.72);

  const containerColors = ['#1f77b4', '#e07a3f', '#7aa6c2', '#d7e3ef', '#244c73'];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 9; column += 1) {
      context.fillStyle = containerColors[(row + column) % containerColors.length];
      context.globalAlpha = 0.72;
      context.fillRect(460 + column * 48, 220 + row * 24, 42, 20);
    }
  }
  context.globalAlpha = 1;

  const vignette = context.createLinearGradient(0, 0, canvas.width, 0);
  vignette.addColorStop(0, 'rgba(255,255,255,0)');
  vignette.addColorStop(1, 'rgba(0,24,49,0.34)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, canvas.width, canvas.height);

  return canvasToPdfImage(canvas, 0.9);
}

function createPdfBlob(pageContents: string[], images: Record<string, PdfImage | undefined>) {
  const objects: string[] = [];

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = '';
  objects[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  const imageObjectIds = new Map<string, number>();
  Object.entries(images).forEach(([name, image]) => {
    if (!image) {
      return;
    }

    const objectId = objects.length + 1;
    imageObjectIds.set(name, objectId);
    objects.push(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${image.hex.length} >>\nstream\n${image.hex}\nendstream`,
    );
  });

  const pageObjectIds: number[] = [];

  pageContents.forEach((content) => {
    const pageObjectId = objects.length + 1;
    const contentObjectId = objects.length + 2;
    const imageResource =
      imageObjectIds.size > 0
        ? ` /XObject << ${Array.from(imageObjectIds.entries())
            .map(([name, id]) => `/${name} ${id} 0 R`)
            .join(' ')} >>`
        : '';

    pageObjectIds.push(pageObjectId);

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >>${imageResource} >> /Contents ${contentObjectId} 0 R >>`,
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

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

export async function generateLclQuotePdf({
  bannerUrl,
  details,
  direction,
  language,
  logoUrl,
  loadMeters,
  palletLines,
  quoteNumber,
  salesPrice,
  targetWindow,
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
  const popup = targetWindow ?? window.open('', '_blank');

  if (!popup) {
    window.alert(
      language === 'en'
        ? 'The PDF could not be opened. Please allow pop-ups for this application.'
        : 'De PDF kon niet worden geopend. Sta pop-ups toe voor deze applicatie.',
    );
    return;
  }

  popup.document.write('<p style="font-family: Arial, sans-serif; color: #17324a;">PDF wordt gemaakt...</p>');

  const logo = await loadLogoForPdf(logoUrl);
  const banner = (await loadBannerForPdf(bannerUrl)) ?? createHarborBannerForPdf();
  const pages: string[] = [];
  let content = '';
  const left = 42;
  const right = 553;
  const colors = {
    blue: '0.04 0.44 0.80',
    blueDark: '0.07 0.23 0.39',
    blueMuted: '0.22 0.43 0.62',
    border: '0.86 0.91 0.96',
    lightBlue: '0.93 0.96 1',
    muted: '0.38 0.47 0.57',
    text: '0.12 0.16 0.23',
    white: '1 1 1',
  };

  const addText = (value: string, x: number, y: number, size = 9, color = colors.text) => {
    content += `${color} rg BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET\n`;
  };
  const addRightText = (value: string, x: number, y: number, size = 9, color = colors.text) => {
    const width = normalizePdfText(value).length * size * 0.52;
    addText(value, x - width, y, size, color);
  };
  const addLine = (x1: number, y: number, x2: number, color = colors.border, width = 0.6) => {
    content += `${color} RG ${width} w ${x1} ${y} m ${x2} ${y} l S\n`;
  };
  const addRect = (x: number, y: number, width: number, height: number, fill: string, stroke?: string, strokeWidth = 0.6) => {
    content += `${fill} rg ${x} ${y} ${width} ${height} re f\n`;
    if (stroke) {
      content += `${stroke} RG ${strokeWidth} w ${x} ${y} ${width} ${height} re S\n`;
    }
  };
  const addRow = (label: string, value: string, x: number, y: number) => {
    if (!value.trim()) {
      return y;
    }

    addText(label, x, y, 9.5, colors.blueDark);
    addText(value, x + 116, y, 9.8, colors.text);
    return y - 18;
  };
  const addCircle = (x: number, y: number, radius: number, stroke = colors.blue, width = 0.8) => {
    const c = radius * 0.5523;
    content += `${stroke} RG ${width} w ${x + radius} ${y} m ${x + radius} ${y + c} ${x + c} ${y + radius} ${x} ${y + radius} c ${x - c} ${y + radius} ${x - radius} ${y + c} ${x - radius} ${y} c ${x - radius} ${y - c} ${x - c} ${y - radius} ${x} ${y - radius} c ${x + c} ${y - radius} ${x + radius} ${y - c} ${x + radius} ${y} c S\n`;
  };
  const addInfoIcon = (x: number, y: number, index: number) => {
    addCircle(x, y, 13);
    content += `${colors.blue} RG 1.1 w\n`;
    if (index === 0) {
      content += `${x - 7} ${y - 2} m ${x + 7} ${y - 2} l ${x + 4} ${y + 5} l ${x - 4} ${y + 5} l h S\n`;
      content += `${x - 4} ${y + 5} m ${x - 4} ${y + 9} l ${x + 4} ${y + 9} l ${x + 4} ${y + 5} l S\n`;
    } else if (index === 1) {
      content += `${x - 7} ${y - 6} m ${x + 7} ${y - 6} l ${x + 5} ${y + 6} l ${x - 5} ${y + 6} l h S\n`;
      content += `${x - 3} ${y - 6} m ${x - 3} ${y + 6} l ${x + 3} ${y - 6} m ${x + 3} ${y + 6} l S\n`;
    } else {
      content += `${x - 6} ${y - 7} m ${x + 6} ${y - 7} l ${x + 4} ${y + 7} l ${x - 4} ${y + 7} l h S\n`;
      content += `${x - 2} ${y + 7} m ${x} ${y + 11} l ${x + 2} ${y + 7} l S\n`;
    }
  };
  const addCheckBullet = (x: number, y: number) => {
    addCircle(x, y + 2, 4.2, colors.blueDark, 0.7);
    content += `${colors.blueDark} RG 0.8 w ${x - 2.2} ${y + 2} m ${x - 0.5} ${y} l ${x + 2.6} ${y + 4.1} l S\n`;
  };
  const addSectionTitle = (title: string, x: number, y: number) => {
    addText(title, x + 22, y, 15, colors.blueDark);
  };
  const addFooterIcon = (kind: 'location' | 'phone' | 'mail' | 'web', x: number, y: number) => {
    content += `${colors.blue} RG 0.8 w\n`;
    if (kind === 'location') {
      addCircle(x, y + 2, 3.2, colors.blue, 0.8);
      content += `${x} ${y - 6} m ${x - 5} ${y + 1} ${x - 3} ${y + 8} ${x} ${y + 9} c ${x + 3} ${y + 8} ${x + 5} ${y + 1} ${x} ${y - 6} c S\n`;
    } else if (kind === 'phone') {
      content += `${x - 5} ${y + 7} m ${x - 2} ${y + 10} l ${x + 1} ${y + 6} l ${x - 1} ${y + 4} l ${x + 3} ${y} l ${x + 6} ${y + 2} l ${x + 8} ${y - 2} l ${x + 4} ${y - 5} c S\n`;
    } else if (kind === 'mail') {
      content += `${x - 7} ${y - 4} 14 10 re S ${x - 7} ${y + 6} m ${x} ${y} l ${x + 7} ${y + 6} l S\n`;
    } else {
      addCircle(x, y + 1, 6.2, colors.blue, 0.8);
      content += `${x - 6} ${y + 1} m ${x + 6} ${y + 1} l ${x} ${y - 5} m ${x} ${y + 7} l S\n`;
    }
  };

  if (banner) {
    content += `q 245 0 0 116 350 726 cm /Banner Do Q\n`;
    content += `q ${colors.white} rg 0 842 m 344 842 l 392 738 l 0 738 l h f Q\n`;
    content += `${colors.blue} RG 12 w 352 842 m 383 793 423 761 500 742 c S\n`;
    content += `0.45 0.75 0.93 RG 17 w 371 842 m 403 797 440 766 515 742 c S\n`;
  }

  if (logo) {
    const logoWidth = 132;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    content += `q ${logoWidth} 0 0 ${logoHeight} ${left} 756 cm /Logo Do Q\n`;
  } else {
    addText('TFF', left, 779, 30, colors.blue);
  }

  addText('Team Freight Forwarding', left + 2, 747, 11, colors.blue);
  addLine(left, 724, 365, colors.border, 0.8);
  addText(copy.lclQuote, left, 688, 32, colors.blueDark);

  let infoY = 641;
  infoY = addRow(copy.quoteDate, quoteDate, left + 2, infoY);
  if (quoteNumber) {
    infoY = addRow(copy.quoteNumber, quoteNumber, left + 2, infoY);
  }
  infoY = addRow(copy.validity, formatPdfDate(details.validity, language), left + 2, infoY);
  infoY = addRow(copy.customerName, details.customerName, left + 2, infoY);
  infoY = addRow(copy.tffReference, details.tffReference, left + 2, infoY);
  infoY = addRow(copy.customerReference, details.customerReference, left + 2, infoY);
  addRow('Incoterms', details.incoterms, left + 2, infoY);

  content += `${colors.border} RG 1 w 296 548 m 296 637 l S\n`;
  addRect(320, 555, 198, 92, '0.98 0.99 1', colors.border, 0.4);
  const portDetails = [
    [copy.loadingPlace, details.loadingPlace],
    [copy.unloadingPlace, details.unloadingPlace],
    [copy.loadMeters, loadMeters],
  ].filter(([, value]) => value.trim());

  portDetails.forEach(([label, value], index) => {
    const rowY = 625 - index * 30;
    addInfoIcon(342, rowY + 2, index);
    addText(label, 370, rowY + 5, 9.2, colors.blueMuted);
    addText(value, 370, rowY - 8, 10.5, colors.blueDark);
  });

  const sectionY = 498;
  addSectionTitle(copy.palletDetails, left, sectionY);
  content += `${colors.blue} RG 1.4 w ${left + 2} ${sectionY + 1} m ${left + 14} ${sectionY + 1} l ${left + 14} ${sectionY + 13} l ${left + 2} ${sectionY + 13} l h S\n`;
  content += `${colors.blue} RG 1 w ${left + 5} ${sectionY + 13} m ${left + 5} ${sectionY + 17} l ${left + 11} ${sectionY + 17} l ${left + 11} ${sectionY + 13} l S\n`;

  const tableX = left;
  const tableTop = 468;
  const tableWidth = 511;
  const tableHeaderHeight = 24;
  const rows = palletLines.filter((palletLine) => Number(palletLine.quantity) > 0);
  const visibleRows = rows.length > 0 ? rows.slice(0, 6) : [];
  const rowHeight = 21;
  addRect(tableX, tableTop - rowHeight * Math.max(visibleRows.length, 1), tableWidth, tableHeaderHeight + rowHeight * Math.max(visibleRows.length, 1), '1 1 1', colors.border, 0.5);
  addRect(tableX, tableTop, tableWidth, tableHeaderHeight, colors.blue, colors.blue, 0.6);
  addText(copy.quantity, tableX + 14, tableTop + 9, 9.2, colors.white);
  addText(copy.type, tableX + 92, tableTop + 9, 9.2, colors.white);
  addText(`${copy.dimensions} (L x B x H)`, tableX + 235, tableTop + 9, 9.2, colors.white);
  addText(copy.weightPerItem, tableX + 430, tableTop + 9, 9.2, colors.white);

  visibleRows.forEach((palletLine, index) => {
    const rowY = tableTop - rowHeight * (index + 1);
    const dimensions = [palletLine.lengthCm, palletLine.widthCm, palletLine.heightCm].filter(Boolean).join(' x ');
    addLine(tableX, rowY, tableX + tableWidth, colors.border, 0.7);
    addText(palletLine.quantity || '-', tableX + 18, rowY + 7, 9.2, colors.text);
    addText(typeLabels[language][palletLine.type] ?? palletLine.type, tableX + 92, rowY + 7, 9.2, colors.text);
    addText(dimensions ? `${dimensions} cm` : '-', tableX + 235, rowY + 7, 9.2, colors.text);
    addText(palletLine.weightPerItemKg ? `${palletLine.weightPerItemKg} kg` : '-', tableX + 430, rowY + 7, 9.2, colors.text);
  });
  if (visibleRows.length === 0) {
    addText('-', tableX + 18, tableTop - 14, 9.2, colors.text);
  }

  const tableBottom = tableTop - rowHeight * Math.max(visibleRows.length, 1);
  const priceY = tableBottom - 55;
  const normalizedPrice = normalizePdfText(salesPrice);
  const displayPrice = normalizedPrice.startsWith('EUR') ? normalizedPrice : `EUR ${normalizedPrice}`;
  addRect(left, priceY, 511, 43, colors.lightBlue, colors.blue, 0.9);
  addText(copy.salesPrice, left + 18, priceY + 17, 14, colors.blueDark);
  addRightText(displayPrice, right - 16, priceY + 14, 24, colors.blueDark);

  let termsTitleY = priceY - 52;
  if (details.note.trim()) {
    addText(copy.note, left, termsTitleY + 16, 12.5, colors.blueDark);
    wrapPdfText(details.note, 118)
      .slice(0, 2)
      .forEach((noteLine, index) => addText(noteLine, left, termsTitleY - index * 10, 8.2, colors.text));
    termsTitleY -= 28;
  }

  addSectionTitle(copy.terms, left, termsTitleY);
  content += `${colors.blue} RG 1.1 w ${left + 3} ${termsTitleY - 1} m ${left + 14} ${termsTitleY - 1} l ${left + 14} ${termsTitleY + 13} l ${left + 3} ${termsTitleY + 13} l h S\n`;
  content += `${colors.blue} RG 0.8 w ${left + 6} ${termsTitleY + 8} m ${left + 11} ${termsTitleY + 8} l ${left + 11} ${termsTitleY + 4} l ${left + 6} ${termsTitleY + 4} l h S\n`;

  let termsY = termsTitleY - 22;
  terms.forEach((term) => {
    wrapPdfText(term, 122).forEach((termLine, lineIndex) => {
      addCheckBullet(left + 5, termsY);
      addText(termLine, left + 18, termsY, 7.8, colors.text);
      termsY -= lineIndex === 0 ? 11 : 10;
    });
  });

  const closingY = Math.max(82, termsY - 33);
  addRect(left, closingY, 511, 34, '0.95 0.98 1', undefined);
  content += `${colors.blue} rg ${left + 16} ${closingY + 12} 12 12 re f\n`;
  addText('i', left + 20.5, closingY + 14.4, 9, colors.white);
  wrapPdfText(copy.closingText, 102)
    .slice(0, 2)
    .forEach((closingLine, index) => addText(closingLine, left + 48, closingY + 21 - index * 10, 8.2, colors.blueDark));

  addLine(left, 60, right, colors.blue, 0.9);
  addText('Team Freight Forwarding', left, 43, 8.5, colors.blue);
  addFooterIcon('location', left + 5, 27);
  addText('Marconiweg 14', left + 18, 30, 7.6, colors.text);
  addText('8501 XM Joure, Nederland', left + 18, 20, 7.6, colors.text);
  addFooterIcon('phone', 222, 38);
  addFooterIcon('mail', 222, 27);
  addFooterIcon('web', 222, 16);
  addText('T +31 (0)513 745 220', 236, 43, 7.8, colors.text);
  addText('E ocean@tfflogistics.com', 236, 30, 7.8, colors.blue);
  addText('W www.tfflogistics.com', 236, 20, 7.8, colors.blue);
  addText('KvK: 69825033', 398, 43, 7.8, colors.text);
  addText('BTW: NL858027550B01', 398, 31, 7.8, colors.text);
  addText('IBAN: NL68 RABO 0162 6354 88', 398, 20, 7.8, colors.text);
  addText('BIC: RABONL2U', 398, 10, 7.8, colors.text);
  pages.push(content);

  const pdfUrl = URL.createObjectURL(createPdfBlob(pages, { Banner: banner, Logo: logo }));
  popup.location.href = pdfUrl;
}
