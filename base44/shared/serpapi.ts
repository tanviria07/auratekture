import { secrets } from 'base44:runtime';

const DAY_MS = 24 * 3600_000;

// One Google Shopping search; keeps up to 8 priced results with a link.
export async function searchShopping(q) {
  const url = new URL('https://serpapi.com/search.json');
  const params = { engine: 'google_shopping', q, gl: 'us', hl: 'en', api_key: secrets.get('SERPAPI_API_KEY') };
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const start = Date.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `SerpApi ${res.status}`);
  const results = (data.shopping_results || [])
    .filter((r) => r.extracted_price != null && (r.link || r.product_link))
    .slice(0, 5)
    .map((r) => ({
      title: r.title,       store: /^(ebay|etsy)/i.test(r.source || '') ? 'Marketplace seller' : r.source, price: r.extracted_price,
      link: r.link || r.product_link, via_google: !r.link, thumbnail: r.thumbnail || null,
      delivery: r.delivery || null, rating: r.rating ?? null, reviews: r.reviews ?? null,
    }));
  return { results, ms: Date.now() - start };
}

// Count of live SerpApi searches today (UTC), for the Diagnostics page.
export async function countTodaySearches(db) {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const count = await db.entities.SearchCache.count({ fetched_at: { $gte: since } });
  return count;
}

// Same search, cached by query for 24 hours.
export async function cachedSearch(db, query) {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { items } = await db.entities.SearchCache.filter({ query, fetched_at: { $gte: since } }, { sort: '-fetched_at', limit: 1 });
  if (items[0]) return items[0].results || [];
  const { results } = await searchShopping(query);
  await db.entities.SearchCache.create({ query, results, fetched_at: new Date().toISOString() });
  return results;
}