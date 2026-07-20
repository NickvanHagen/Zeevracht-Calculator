import {
  generateLclQuotePdf as generateRawLclQuotePdf,
  type LclQuoteLanguage,
  type LclQuotePdfInput,
} from './lclQuotePdfService';

export type { LclQuoteDetails, LclQuoteLanguage, LclQuotePalletLine } from './lclQuotePdfService';

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Asset kon niet worden geladen voor PDF-generatie.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function assetUrlToDataUrl(assetUrl?: string) {
  if (!assetUrl) {
    return undefined;
  }

  if (assetUrl.startsWith('data:')) {
    return assetUrl;
  }

  const response = await fetch(new URL(assetUrl, window.location.href));
  if (!response.ok) {
    throw new Error('PDF asset kon niet worden geladen.');
  }

  return blobToDataUrl(await response.blob());
}

function getPdfFileName(language: LclQuoteLanguage, quoteNumber?: string) {
  const base = language === 'en' ? 'lcl-quotation' : 'lcl-offerte';
  return `${base}${quoteNumber ? `-${quoteNumber}` : ''}.pdf`;
}

export async function generateLclQuotePdf(input: LclQuotePdfInput) {
  const popup = window.open('', '_blank');

  if (!popup) {
    window.alert(
      input.language === 'en'
        ? 'The PDF could not be opened. Please allow pop-ups for this application.'
        : 'De PDF kon niet worden geopend. Sta pop-ups toe voor deze applicatie.',
    );
    return;
  }

  popup.document.write('<p style="font-family: Arial, sans-serif; color: #17324a;">PDF wordt gemaakt...</p>');

  try {
    const [logoDataUrl, bannerDataUrl] = await Promise.all([
      assetUrlToDataUrl(input.logoUrl),
      assetUrlToDataUrl(input.bannerUrl),
    ]);

    const response = await fetch('/api/generate-lcl-quote-pdf', {
      body: JSON.stringify({
        bannerDataUrl,
        details: input.details,
        direction: input.direction,
        language: input.language,
        loadMeters: input.loadMeters,
        logoDataUrl,
        mode: input.mode,
        palletLines: input.palletLines,
        quoteNumber: input.quoteNumber,
        salesPrice: input.salesPrice,
        shipmentLines: input.shipmentLines,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`PDF-route gaf status ${response.status}.`);
    }

    const pdfBlob = await response.blob();
    const pdfUrl = URL.createObjectURL(pdfBlob);
    popup.document.title = getPdfFileName(input.language, input.quoteNumber);
    popup.location.href = pdfUrl;
  } catch (error) {
    console.warn('Server-side PDF generation failed, falling back to raw PDF generator.', error);
    await generateRawLclQuotePdf({ ...input, targetWindow: popup });
  }
}
