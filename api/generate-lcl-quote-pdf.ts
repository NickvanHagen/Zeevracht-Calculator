import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync } from 'node:fs';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import {
  renderLclQuoteHtml,
  type LclQuotePdfTemplateData,
} from '../src/pdf/lclQuotePdfTemplate.ts';

export const config = {
  maxDuration: 30,
};

type RequestWithBody = IncomingMessage & {
  body?: unknown;
};

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: RequestWithBody) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (!rawBody) {
    return undefined;
  }

  return JSON.parse(rawBody) as unknown;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isPalletLine(value: unknown): value is LclQuotePdfTemplateData['palletLines'][number] {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const line = value as Record<string, unknown>;
  return (
    isString(line.quantity) &&
    isString(line.type) &&
    isString(line.lengthCm) &&
    isString(line.widthCm) &&
    isString(line.heightCm) &&
    isString(line.weightPerItemKg)
  );
}

function isValidPayload(value: unknown): value is LclQuotePdfTemplateData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const details = payload.details as Record<string, unknown> | undefined;

  return (
    (payload.direction === 'import' || payload.direction === 'export') &&
    (payload.language === 'nl' || payload.language === 'en') &&
    isString(payload.loadMeters) &&
    isString(payload.salesPrice) &&
    Array.isArray(payload.palletLines) &&
    payload.palletLines.every(isPalletLine) &&
    Boolean(details) &&
    isString(details?.customerName) &&
    isString(details?.tffReference) &&
    isString(details?.customerReference) &&
    isString(details?.incoterms) &&
    isString(details?.loadingAddress) &&
    isString(details?.loadingPlace) &&
    isString(details?.unloadingAddress) &&
    isString(details?.unloadingPlace) &&
    isString(details?.route) &&
    isString(details?.validity) &&
    isString(details?.note) &&
    (!payload.logoDataUrl || isString(payload.logoDataUrl)) &&
    (!payload.bannerDataUrl || isString(payload.bannerDataUrl)) &&
    (!payload.quoteNumber || isString(payload.quoteNumber))
  );
}

async function getExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const localExecutable = getLocalChromeExecutable();
  if (localExecutable) {
    return localExecutable;
  }

  return chromium.executablePath();
}

function getLocalChromeExecutable() {
  const candidates =
    process.platform === 'win32'
      ? [
          `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
          `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
          `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
          `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
          `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
        ]
      : process.platform === 'darwin'
        ? [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
          ]
        : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'];

  return candidates.find((candidate): candidate is string => Boolean(candidate) && existsSync(candidate));
}

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

  try {
    const body = await readJsonBody(req);
    if (!isValidPayload(body)) {
      sendJson(res, 400, { error: 'Invalid LCL quote PDF payload' });
      return;
    }

    const html = renderLclQuoteHtml(body);
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        deviceScaleFactor: 1,
        height: 1123,
        width: 794,
      },
      executablePath: await getExecutablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMediaType('print');

    const pdf = await page.pdf({
      format: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="lcl-offerte.pdf"');
    res.setHeader('Cache-Control', 'no-store');
    res.end(Buffer.from(pdf));
  } catch (error) {
    console.error('LCL quote PDF generation failed', error);
    sendJson(res, 500, { error: 'PDF generation failed' });
  } finally {
    await browser?.close();
  }
}
