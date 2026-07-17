import "server-only";

const BASE_URL = "https://incidecoder.com";
const USER_AGENT = "SkinSafeBot/1.0 (+research; respectful-scraper)";

function decodeHtml(value: string): string {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " "));
}

export type InciProduct = {
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  ingredients: string[];
  sourceUrl: string;
};

async function fetchHtml(path: string): Promise<string> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

function parseSearchResults(html: string, limit: number): { slug: string; name: string }[] {
  const pattern =
    /href="(\/products\/[^"#?]+)"[^>]*class="[^"]*simpletextlistitem[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  const results: { slug: string; name: string }[] = [];
  const seen = new Set<string>();

  let match = pattern.exec(html);
  while (match && results.length < limit) {
    const slug = match[1].replace("/products/", "");
    if (slug !== "create" && !seen.has(slug)) {
      seen.add(slug);
      results.push({ slug, name: stripTags(match[2]) });
    }
    match = pattern.exec(html);
  }

  return results;
}

function parseIngredientOverview(html: string): string[] {
  const section = html.match(/id="ingredlist-short"[\s\S]*?<\/div>\s*<button/);
  if (!section) return [];

  const names: string[] = [];
  const pattern = /class="ingred-link[^"]*"[^>]*>([^<]+)</g;
  let match = pattern.exec(section[0]);
  while (match) {
    const name = decodeHtml(match[1]);
    if (name) names.push(name);
    match = pattern.exec(section[0]);
  }
  return names;
}

function parseProductDetail(html: string, slug: string): Omit<InciProduct, "slug"> {
  const brandMatch = html.match(/href="\/brands\/[^"]+?"[^>]*>([\s\S]*?)<\/a>/);
  const brand = brandMatch ? stripTags(brandMatch[1]) : null;

  const productTitle = html.match(/id="product-title">([^<]+)</)?.[1];
  const name = productTitle ? decodeHtml(productTitle) : slug;
  const fullName = [brand, name].filter(Boolean).join(" ").trim();

  const imageMatch = html.match(/id="product-main-image"[\s\S]*?<img[^>]+src=["']([^"']+)["']/);
  let imageUrl = imageMatch ? imageMatch[1] : null;
  if (imageUrl?.startsWith("/")) imageUrl = `${BASE_URL}${imageUrl}`;

  return {
    name: fullName || slug,
    brand,
    imageUrl,
    ingredients: parseIngredientOverview(html),
    sourceUrl: `${BASE_URL}/products/${slug}`,
  };
}

export async function searchProducts(query: string, limit = 5): Promise<InciProduct[]> {
  const html = await fetchHtml(`/search?query=${encodeURIComponent(query)}`);
  const hits = parseSearchResults(html, limit);

  const products: InciProduct[] = [];
  for (const hit of hits) {
    try {
      const detailHtml = await fetchHtml(`/products/${hit.slug}`);
      const detail = parseProductDetail(detailHtml, hit.slug);
      products.push({ slug: hit.slug, ...detail });
    } catch {
      // skip failed products, continue with the rest
      products.push({
        slug: hit.slug,
        name: hit.name,
        brand: null,
        imageUrl: null,
        ingredients: [],
        sourceUrl: `${BASE_URL}/products/${hit.slug}`,
      });
    }
  }

  return products;
}
