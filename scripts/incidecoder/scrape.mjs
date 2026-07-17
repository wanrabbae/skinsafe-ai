#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://incidecoder.com";
const USER_AGENT = "SkinSafeBot/1.0 (+research; respectful-scraper)";
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(SCRIPT_DIR, "data");
const DEFAULT_BRANDS_FILE = resolve(SCRIPT_DIR, "brand.json");
const DEFAULT_LIMIT = 5;
const DEFAULT_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function decodeHtml(value) {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "));
}

function normalizeBrandSlug(value) {
  return String(value).trim().toLowerCase();
}

function parseBrandEntries(raw) {
  if (!Array.isArray(raw)) {
    throw new Error("brand.json must be a JSON array");
  }

  const brands = [];
  const seen = new Set();

  for (const entry of raw) {
    let slug = null;

    if (typeof entry === "string") {
      slug = normalizeBrandSlug(entry);
    } else if (entry && typeof entry === "object") {
      slug = normalizeBrandSlug(entry.slug || entry.normalizedTitle || "");
    }

    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    brands.push(slug);
  }

  return brands;
}

async function loadBrandsFromFile(brandsFile) {
  const raw = await readFile(brandsFile, "utf8");
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in brands file: ${brandsFile}`);
  }

  const brands = parseBrandEntries(parsed);
  if (brands.length === 0) {
    throw new Error(`No brands found in ${brandsFile}`);
  }

  return brands;
}

function parseArgs(argv) {
  const args = {
    brands: null,
    brandsFile: DEFAULT_BRANDS_FILE,
    brandsFromCli: false,
    limit: DEFAULT_LIMIT,
    all: false,
    delayMs: DEFAULT_DELAY_MS,
    dataDir: DEFAULT_DATA_DIR,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--brands" && next) {
      args.brands = next
        .split(",")
        .map((value) => normalizeBrandSlug(value))
        .filter(Boolean);
      args.brandsFromCli = true;
      i += 1;
    } else if (arg === "--brands-file" && next) {
      args.brandsFile = resolve(next);
      i += 1;
    } else if (arg === "--limit" && next) {
      args.limit = Number(next);
      i += 1;
    } else if (arg === "--all") {
      args.all = true;
    } else if (arg === "--delay" && next) {
      args.delayMs = Number(next);
      i += 1;
    } else if (arg === "--data-dir" && next) {
      args.dataDir = resolve(next);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!Number.isFinite(args.limit) || args.limit < 1) {
    throw new Error("--limit must be a positive number");
  }

  return args;
}

function printHelp() {
  console.log(`INCIDecoder brand scraper → JSON (1 file per brand)

Default brands file: scripts/incidecoder/brand.json
Default limit:        ${DEFAULT_LIMIT} products per brand
Default output:       scripts/incidecoder/data/<brand>.json

Usage:
  node scrape.mjs
  node scrape.mjs --limit 20
  node scrape.mjs --all
  node scrape.mjs --brands-file ./brand.json --limit 50
  node scrape.mjs --brands ponds,skintific --limit 50
  node scrape.mjs --brands wardah --all --delay 2000

Options:
  --brands-file <path>  Read brand list from JSON (default: ./brand.json)
  --brands <a,b,c>      Override brand.json with explicit slugs
  --limit <n>           Max products per brand (default: 20)
  --all                 Scrape every product listed for each brand
  --delay <ms>          Delay between product requests (default: 1500)
  --data-dir <path>     Output directory (default: ./data)
  --help                Show this help

brand.json formats supported:
  ["wardah", "skintific"]
  [{ "slug": "wardah", "title": "Wardah" }]

Notes:
  - category is always null (not present on INCIDecoder product pages)
  - resume is automatic: existing slugs in data/<brand>.json are skipped
  - HTTP 404 (brand or product) is skipped; scraping continues
`);
}

class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} for ${url}`);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
  }
}

function isNotFoundError(error) {
  return (
    (error instanceof HttpError && error.status === 404) ||
    (error instanceof Error && /\bHTTP 404\b/.test(error.message))
  );
}

async function fetchHtml(path) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new HttpError(response.status, url);
  }

  return { url, html: await response.text() };
}

function parseBrandProductLinks(html) {
  const pattern =
    /href="(\/products\/[^"#?]+)"[^>]*class="[^"]*simpletextlistitem[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set();
  const links = [];

  let match = pattern.exec(html);
  while (match) {
    const slug = match[1].replace("/products/", "");
    if (slug === "create" || seen.has(slug)) {
      match = pattern.exec(html);
      continue;
    }

    seen.add(slug);
    links.push({
      slug,
      name: stripTags(match[2]),
      url: `${BASE_URL}${match[1]}`,
    });
    match = pattern.exec(html);
  }

  return links;
}

function hasNextBrandPage(html, brandSlug) {
  return new RegExp(
    `href="/brands/${brandSlug}\\?offset=\\d+"[^>]*>\\s*Next page`,
    "i",
  ).test(html);
}

async function listBrandProducts(brandSlug, { maxNeeded = null } = {}) {
  const products = [];
  const seen = new Set();
  let offset = 0;
  let listedTotalEstimate = null;

  while (true) {
    const path =
      offset === 0
        ? `/brands/${encodeURIComponent(brandSlug)}`
        : `/brands/${encodeURIComponent(brandSlug)}?offset=${offset}`;

    const { html } = await fetchHtml(path);
    const pageLinks = parseBrandProductLinks(html);
    let added = 0;

    for (const link of pageLinks) {
      if (seen.has(link.slug)) continue;
      seen.add(link.slug);
      products.push(link);
      added += 1;
    }

    console.error(
      `[list] ${brandSlug} offset=${offset}: +${added} (collected ${products.length})`,
    );

    const hasNext = hasNextBrandPage(html, brandSlug);
    if (added === 0 || !hasNext) {
      listedTotalEstimate = products.length;
      break;
    }

    if (maxNeeded != null && products.length >= maxNeeded) {
      listedTotalEstimate = `${products.length}+`;
      break;
    }

    offset += 1;
    await sleep(500);
  }

  return { products, listedTotalEstimate };
}

function parseRating(className = "") {
  if (className.includes("our-take-superstar")) return "superstar";
  if (className.includes("our-take-goodie")) return "goodie";
  if (className.includes("our-take-icky")) return "icky";
  return null;
}

function parseIrrCom(cellHtml) {
  const textValue = stripTags(cellHtml);
  const match = textValue.match(/(\d+(?:-\d+)?)\s*,\s*(\d+(?:-\d+)?)/);
  if (!match) return { irritancy: null, comedogenicity: null };

  return {
    irritancy: match[1],
    comedogenicity: match[2],
  };
}

function parseIngredientOverview(html) {
  const section = html.match(/id="ingredlist-short"[\s\S]*?<\/div>\s*<button/);
  if (!section) return [];

  const names = [];
  const pattern = /class="ingred-link[^"]*"[^>]*>([^<]+)</g;
  let match = pattern.exec(section[0]);
  while (match) {
    const name = decodeHtml(match[1]);
    if (name) names.push(name);
    match = pattern.exec(section[0]);
  }

  return names;
}

function parseHighlights(html) {
  const section = html.match(
    /id="ingredlist-highlights-section"[\s\S]*?(?=id="ingredlist-table-section"|$)/,
  );
  if (!section) return [];

  const highlights = [];
  const pattern = /class="ingred-tooltip-text">\s*([^<]+)/g;
  let match = pattern.exec(section[0]);
  while (match) {
    const value = decodeHtml(match[1]);
    if (value) highlights.push(value);
    match = pattern.exec(section[0]);
  }

  return highlights;
}

function parseIngredientTable(html) {
  const section = html.match(
    /id="ingredlist-table-section"[\s\S]*?<table class="product-skim[\s\S]*?<\/table>/,
  );
  if (!section) return [];

  const rows = section[0].match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
  const ingredients = [];

  for (const row of rows) {
    if (row.includes("<th>")) continue;

    const cells = row.match(/<td[\s\S]*?<\/td>/g);
    if (!cells || cells.length < 4) continue;

    const nameMatch = cells[0].match(/>([^<]+)<\/a>/);
    const slugMatch = cells[0].match(/href="\/ingredients\/([^"]+)"/);
    const name = nameMatch ? decodeHtml(nameMatch[1]) : stripTags(cells[0]);
    if (!name) continue;

    const functions = [];
    const fnPattern = /class="[^"]*ingred-function-link[^"]*"[^>]*>([^<]+)</g;
    let fnMatch = fnPattern.exec(cells[1]);
    while (fnMatch) {
      functions.push(decodeHtml(fnMatch[1]));
      fnMatch = fnPattern.exec(cells[1]);
    }

    const ratingClass = cells[3].match(/class="([^"]*our-take[^"]*)"/)?.[1] || "";
    const { irritancy, comedogenicity } = parseIrrCom(cells[2]);

    ingredients.push({
      name,
      slug: slugMatch?.[1] || null,
      functions,
      irritancy,
      comedogenicity,
      rating: parseRating(ratingClass),
    });
  }

  return ingredients;
}

function parseProductPage(html, sourceUrl, slug) {
  const brandMatch = html.match(/href="\/brands\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
  const brand = brandMatch ? stripTags(brandMatch[2]) : null;
  const brandSlug = brandMatch?.[1] || null;

  const productTitle = html.match(/id="product-title">([^<]+)</)?.[1];
  const productTitleText = productTitle ? decodeHtml(productTitle) : null;
  const fullName = [brand, productTitleText].filter(Boolean).join(" ").trim();

  const descriptionMatch = html.match(
    /class="product-details-desc">([\s\S]*?)<\/div>/,
  );
  const description = descriptionMatch ? stripTags(descriptionMatch[1]) : null;

  const uploadedMatch = html.match(
    /Uploaded by:\s*([^<]+?)\s+on\s+<time datetime="([^"]+)">([^<]+)<\/time>/,
  );

  const imageMatch = html.match(/id="product-main-image"[\s\S]*?<img[^>]+src=["']([^"']+)["']/);
  let imageUrl = imageMatch ? imageMatch[1] : null;
  if (imageUrl && imageUrl.startsWith("/")) {
    imageUrl = `${BASE_URL}${imageUrl}`;
  }

  let globalConfig = null;
  const globalJson = html.match(
    /<script type="application\/json" id="global">\s*([\s\S]*?)<\/script>/,
  )?.[1];
  if (globalJson) {
    try {
      globalConfig = JSON.parse(globalJson);
    } catch {
      globalConfig = null;
    }
  }

  return {
    slug: globalConfig?.productSlug || slug,
    name: globalConfig?.product?.fullname || fullName || slug,
    brand,
    brandSlug,
    category: null,
    imageUrl,
    productTitle: productTitleText,
    description,
    uploadedBy: uploadedMatch ? decodeHtml(uploadedMatch[1]) : null,
    uploadedAt: uploadedMatch?.[2] || uploadedMatch?.[3] || null,
    highlights: parseHighlights(html),
    ingredientOverview: parseIngredientOverview(html),
    ingredients: parseIngredientTable(html),
    sourceUrl,
    scrapedAt: new Date().toISOString(),
  };
}

async function scrapeProduct(slug) {
  const { url, html } = await fetchHtml(`/products/${slug}`);
  return parseProductPage(html, url, slug);
}

function brandOutputPath(dataDir, brandSlug) {
  return resolve(dataDir, `${brandSlug}.json`);
}

async function loadExistingPayload(outputPath, brandSlug) {
  try {
    const raw = await readFile(outputPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      meta: {
        source: BASE_URL,
        mode: "brand",
        brand: brandSlug,
        scrapedAt: parsed?.meta?.scrapedAt || null,
        total: 0,
        failed: 0,
        resumed: true,
        ...(parsed?.meta || {}),
      },
      products: Array.isArray(parsed?.products) ? parsed.products : [],
      errors: Array.isArray(parsed?.errors) ? parsed.errors : [],
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {
        meta: {
          source: BASE_URL,
          mode: "brand",
          brand: brandSlug,
          scrapedAt: null,
          total: 0,
          failed: 0,
          resumed: false,
        },
        products: [],
        errors: [],
      };
    }

    throw error;
  }
}

async function savePayload(outputPath, payload) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function scrapeBrand(brandSlug, args) {
  const outputPath = brandOutputPath(args.dataDir, brandSlug);
  const payload = await loadExistingPayload(outputPath, brandSlug);
  const existingSlugs = new Set(payload.products.map((product) => product.slug));

  console.error(`\n=== brand: ${brandSlug} ===`);
  console.error(`[resume] ${existingSlugs.size} products already in ${outputPath}`);

  let listed = [];
  let listedTotalEstimate = 0;

  try {
    const listMax = args.all ? null : Math.max(args.limit, existingSlugs.size);
    const listedResult = await listBrandProducts(brandSlug, {
      maxNeeded: listMax,
    });
    listed = listedResult.products;
    listedTotalEstimate = listedResult.listedTotalEstimate;
  } catch (error) {
    if (isNotFoundError(error)) {
      console.error(`[skip] brand 404: ${brandSlug}`);
      return {
        brand: brandSlug,
        outputPath,
        total: payload.products.length,
        scrapedNow: 0,
        failed: 0,
        skipped: true,
        skipReason: "brand_404",
      };
    }
    throw error;
  }

  const targetCount = args.all
    ? listed.length
    : Math.min(args.limit, listed.length);
  const queue = listed
    .slice(0, targetCount)
    .filter((item) => !existingSlugs.has(item.slug));

  console.error(
    `[plan] listed≈${listedTotalEstimate}, target=${targetCount}, to_scrape=${queue.length}, skip=${targetCount - queue.length}`,
  );

  let scrapedNow = 0;
  let skippedNow = 0;

  for (const [index, target] of queue.entries()) {
    if (index > 0 || existingSlugs.size > 0) {
      await sleep(args.delayMs);
    }

    try {
      const product = await scrapeProduct(target.slug);
      payload.products.push(product);
      existingSlugs.add(product.slug);
      scrapedNow += 1;

      payload.meta.scrapedAt = new Date().toISOString();
      payload.meta.total = payload.products.length;
      payload.meta.failed = payload.errors.length;
      await savePayload(outputPath, payload);

      console.error(
        `[ok] ${brandSlug} ${scrapedNow}/${queue.length} ${target.slug} (${product.ingredients.length} ingredients)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (isNotFoundError(error)) {
        skippedNow += 1;
        console.error(`[skip] product 404: ${target.slug}`);
        continue;
      }

      payload.errors.push({
        slug: target.slug,
        error: message,
        at: new Date().toISOString(),
      });
      payload.meta.scrapedAt = new Date().toISOString();
      payload.meta.total = payload.products.length;
      payload.meta.failed = payload.errors.length;
      await savePayload(outputPath, payload);
      console.error(`[fail] ${target.slug}: ${message}`);
    }
  }

  payload.meta.scrapedAt = new Date().toISOString();
  payload.meta.total = payload.products.length;
  payload.meta.failed = payload.errors.length;
  payload.meta.target = targetCount;
  payload.meta.listed = listedTotalEstimate;
  payload.meta.scrapedNow = scrapedNow;
  payload.meta.skippedNow = skippedNow;
  await savePayload(outputPath, payload);

  console.error(
    `[done] ${brandSlug}: ${payload.products.length} products saved → ${outputPath}`,
  );

  return {
    brand: brandSlug,
    outputPath,
    total: payload.products.length,
    scrapedNow,
    failed: payload.errors.length,
    skipped: skippedNow > 0,
    skippedNow,
  };
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.brands) {
    args.brands = await loadBrandsFromFile(args.brandsFile);
  }

  if (args.brands.length === 0) {
    throw new Error("No brands to scrape");
  }

  console.error(
    `Brands source: ${args.brandsFromCli ? "--brands" : args.brandsFile}`,
  );
  console.error(`Brands (${args.brands.length}): ${args.brands.join(", ")}`);
  console.error(`Limit:  ${args.all ? "ALL" : args.limit} per brand`);
  console.error(`Delay:  ${args.delayMs}ms`);
  console.error(`Output: ${args.dataDir}/<brand>.json`);

  const summaries = [];

  for (const brand of args.brands) {
    const summary = await scrapeBrand(brand, args);
    summaries.push(summary);
  }

  console.error("\nSummary:");
  for (const summary of summaries) {
    if (summary.skipReason === "brand_404") {
      console.error(`- ${summary.brand}: skipped (brand 404)`);
      continue;
    }

    console.error(
      `- ${summary.brand}: total=${summary.total}, new=${summary.scrapedNow}, failed=${summary.failed}, product_404_skipped=${summary.skippedNow || 0}`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
