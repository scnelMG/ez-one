import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer';

const options = parseArgs(process.argv.slice(2));
const routes = parseCsv(options.routes);
const viewports = parseCsv(options.viewports).map(parseViewport);
const evidenceDir = options.evidenceDir;

if (!options.baseUrl || routes.length === 0 || viewports.length === 0 || !evidenceDir) {
  throw new Error('Usage: node qa-public-surfaces.mjs --base-url <url> --routes "/extension,/privacy" --viewports "1440x900,390x844" --evidence-dir <dir> [--check-overflow]');
}

await fs.mkdir(evidenceDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const results = [];

try {
  const page = await browser.newPage();
  for (const viewport of viewports) {
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1
    });

    for (const route of routes) {
      const url = new URL(route, options.baseUrl).toString();
      const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      const title = await page.title();
      const h1Text = await page.$eval('h1', (element) => element.textContent?.trim() ?? '').catch(() => '');
      const screenshotName = `${sanitizeRoute(route)}-${viewport.width}x${viewport.height}.png`;
      const screenshotPath = path.join(evidenceDir, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const overflow = options.checkOverflow ? await collectOverflow(page) : [];
      const negativeLetterSpacing = options.checkOverflow ? await collectNegativeLetterSpacing(page) : [];
      const fontStack = options.checkOverflow ? await page.$eval('body', (body) => getComputedStyle(body).fontFamily) : '';
      const missingKoreanFontStack = options.checkOverflow ? missingKoreanFonts(fontStack) : [];

      results.push({
        route,
        viewport,
        status: response?.status() ?? null,
        finalUrl: page.url(),
        title,
        h1Text,
        screenshot: screenshotPath,
        overflow,
        negativeLetterSpacing,
        fontStack,
        missingKoreanFontStack
      });
    }
  }
} finally {
  await browser.close();
}

const failures = results.flatMap((result) => {
  const routeFailures = [];
  if (!result.status || result.status >= 400) {
    routeFailures.push({ route: result.route, viewport: result.viewport, reason: `HTTP ${result.status}` });
  }
  if (!isExpectedFinalUrl(result.route, result.finalUrl)) {
    routeFailures.push({ route: result.route, viewport: result.viewport, reason: `unexpected final URL ${result.finalUrl}` });
  }
  if (!result.h1Text) {
    routeFailures.push({ route: result.route, viewport: result.viewport, reason: 'missing h1' });
  }
  for (const item of result.overflow) {
    routeFailures.push({ route: result.route, viewport: result.viewport, reason: 'text overflow', item });
  }
  for (const item of result.negativeLetterSpacing) {
    routeFailures.push({ route: result.route, viewport: result.viewport, reason: 'negative letter spacing', item });
  }
  if (result.missingKoreanFontStack.length > 0) {
    routeFailures.push({
      route: result.route,
      viewport: result.viewport,
      reason: `missing Korean font stack entries: ${result.missingKoreanFontStack.join(', ')}`,
      fontStack: result.fontStack
    });
  }
  return routeFailures;
});

const summary = {
  baseUrl: options.baseUrl,
  routes,
  viewports,
  checkOverflow: options.checkOverflow,
  generatedAt: new Date().toISOString(),
  results,
  failures,
  verdict: failures.length === 0 ? 'PASS' : 'FAIL'
};

await fs.writeFile(path.join(evidenceDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

if (failures.length > 0) {
  console.error(JSON.stringify({ verdict: 'FAIL', failures }, null, 2));
  process.exitCode = 1;
}

function parseArgs(args) {
  const parsed = { checkOverflow: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--check-overflow') {
      parsed.checkOverflow = true;
      continue;
    }
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    parsed[key] = args[index + 1];
    index += 1;
  }
  return parsed;
}

function parseCsv(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseViewport(value) {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) {
    throw new Error(`Invalid viewport: ${value}`);
  }
  return {
    width: Number(match[1]),
    height: Number(match[2])
  };
}

function sanitizeRoute(route) {
  const cleaned = route.replace(/^\/+/, '').replace(/[^a-z0-9_-]+/gi, '-');
  return cleaned || 'root';
}

function isExpectedFinalUrl(route, finalUrl) {
  const url = new URL(finalUrl);
  if (url.pathname.startsWith(route)) {
    return true;
  }
  return route === '/extension/connect'
    && url.pathname === '/login'
    && url.searchParams.get('redirect') === route;
}

async function collectOverflow(page) {
  return page.$$eval('a, button', (elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    })
    .filter((element) => element.scrollWidth > element.clientWidth + 1)
    .map((element) => ({
      text: element.textContent?.trim() ?? '',
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    })));
}

async function collectNegativeLetterSpacing(page) {
  return page.$$eval('body *', (elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    })
    .map((element) => ({
      text: element.textContent?.trim().slice(0, 80) ?? '',
      letterSpacing: getComputedStyle(element).letterSpacing
    }))
    .filter((item) => /^-/.test(item.letterSpacing)));
}

function missingKoreanFonts(fontStack) {
  const requiredFonts = ['Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic'];
  return requiredFonts.filter((fontName) => !fontStack.toLowerCase().includes(fontName.toLowerCase()));
}
