# Meta Commerce Catalog Feed

## Endpoint

```
GET /api/meta/catalog-feed
```

Public CSV product feed for **Meta Commerce Manager** (Facebook / Instagram / WhatsApp catalogs), generated dynamically from the MongoDB `products` collection.

**This endpoint is intentionally unauthenticated** — Meta Commerce Manager polls it on a schedule and cannot send credentials. It exposes only public storefront data (no customer, merchant, or internal fields). Responses are cached for 1 hour (`Cache-Control: public, max-age=3600`).

Implementation: `routes/metaCatalog.js`, mounted in `server.js` at `/api/meta`.

## Columns

The header matches Meta's official `catalog_products.csv` template (31 columns). Populated columns:

| Column | Source |
|---|---|
| `id` | `product._id` (variants: `<_id>-<label-slug>`, grouped via `item_group_id` = parent `_id`). Stable, and **matches the Meta Pixel's `content_ids`** (client sends `product._id` in ViewContent/AddToCart) — required for dynamic ads/retargeting to link pixel events to catalog items. |
| `title` | `product.name`; variants: `Name (label)` |
| `description` | `product.description` (newlines collapsed, capped at 9999 chars) |
| `availability` | `in stock` / `out of stock` — enabled `MerchantProduct` stock of approved+active merchants (base stock for simple products, per-label `variantPricing` stock for variants). Mirrors customer visibility logic in `routes/products.js`. |
| `condition` | always `new` |
| `price` | **Customer-facing display price** via `PricingCalculator.getDisplayPrice` — the same admin-panel-driven logic the storefront uses (`priceDisplayMode` + GST settings from AppSettings). Variants use the stored variant price, as displayed on the product page. Format: `450.00 INR`. |
| `link` | `<SITE_URL>/products/<_id>` (actual React route) |
| `image_link` | first `product.images[]` entry; already absolute (MinIO: `storage.chardeevari.in`), relative paths get `SITE_URL` prefixed; empty when no image (Meta flags those rows individually) |
| `brand` | `specifications.brand` |
| `quantity_to_sell_on_facebook` | summed available stock |
| `item_group_id` | parent `product.sku` on variant rows (groups variants into one listing) |
| `shipping_weight` | `product.weight` in kg when > 0 |
| `product_tags[0..1]` | first two `product.tags` |

All other template columns are emitted empty.

## Included products

Only `enabled: true` products. Products with variants emit one row per variant.

## Configuration

- `SITE_URL` (or `CLIENT_URL`) — public site origin, defaults to `https://chardeevari.in`. Shared with `routes/sitemap.js` and `routes/og.js`.
- No new dependencies; CSV escaping is implemented inline (quote + double-quote rules, newlines collapsed).

## Connecting to Meta

Commerce Manager → Catalog → Data sources → **Data feed** → Scheduled feed → URL:

```
https://chardeevari.in/api/meta/catalog-feed
```

## Testing locally

```bash
node server.js   # needs MongoDB
curl -s http://localhost:5000/api/meta/catalog-feed | head

NODE_ENV=test npx jest tests/metaCatalog.test.js
```
