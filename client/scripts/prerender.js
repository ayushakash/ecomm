#!/usr/bin/env node
/**
 * SEO prerender (react-snap) with live catalogue data.
 *
 * react-snap's built-in server only serves build/, so every /api call made by the
 * app during the snapshot failed and the price pages were saved as
 * "No items listed". This script runs react-snap against our own server that:
 *   - serves build/ statically (no directory index/redirect, so "/products" is
 *     never 301'd to "/products/" mid-crawl) with the untouched 200.html shell as
 *     the SPA fallback;
 *   - proxies /api/* to PRERENDER_API_ORIGIN (default https://chardeevari.in),
 *     so react-query renders real products and prices into the static HTML.
 * Product pages listed in the live sitemap are added to the include list, so each
 * /products/<id> gets its own title, canonical and Product schema in raw HTML.
 * The output is verified afterwards; any failure exits non-zero.
 *
 * Env: PRERENDER=false skips everything (see package.json postbuild).
 *      PRERENDER_API_ORIGIN overrides the data source.
 *      PUPPETEER_EXECUTABLE_PATH overrides reactSnap.puppeteerExecutablePath.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const express = require('express');
const serveStatic = require('serve-static');
const { run } = require('react-snap');

const pkg = require('../package.json');

const SITE_URL = (process.env.REACT_APP_SITE_URL || 'https://chardeevari.in').replace(/\/$/, '');
const API_ORIGIN = (process.env.PRERENDER_API_ORIGIN || SITE_URL).replace(/\/$/, '');
const BUILD_DIR = path.resolve(__dirname, '..', pkg.reactSnap.source || 'build');
const PORT = pkg.reactSnap.port || 45678;
// Landing pages whose raw HTML must show real prices.
const PRICE_PAGES = ['/cement-price-ranchi', '/tmt-steel-price-ranchi'];
const NOT_FOUND_ROUTE = '/404.html';

const fail = (msg) => {
  console.error(`❌ prerender: ${msg}`);
  console.error('   Set PRERENDER=false to skip prerendering intentionally.');
  process.exit(1);
};

async function productPathsFromSitemap() {
  const res = await fetch(`${API_ORIGIN}/sitemap.xml`);
  if (!res.ok) throw new Error(`GET ${API_ORIGIN}/sitemap.xml → HTTP ${res.status}`);
  const xml = await res.text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1].trim()).pathname)
    .filter((p) => /^\/products\/[a-f0-9]{24}$/i.test(p));
  return [...new Set(paths)];
}

function startServer() {
  const cache = new Map(); // identical data across all snapshots + fewer origin hits
  const app = express();

  app.use('/api', async (req, res) => {
    const target = `${API_ORIGIN}/api${req.url}`;
    try {
      let hit = req.method === 'GET' ? cache.get(target) : undefined;
      if (!hit) {
        const upstream = await fetch(target, {
          method: req.method,
          headers: { accept: req.headers.accept || 'application/json', 'user-agent': 'ChardeevariPrerender/1.0' },
        });
        hit = {
          status: upstream.status,
          type: upstream.headers.get('content-type') || 'application/json',
          body: Buffer.from(await upstream.arrayBuffer()),
        };
        if (req.method === 'GET' && upstream.ok) cache.set(target, hit);
      }
      res.status(hit.status).type(hit.type).send(hit.body);
    } catch (err) {
      console.error(`⚠️  prerender proxy ${target}: ${err.message}`);
      res.status(502).json({ message: 'prerender proxy error' });
    }
  });

  app.use(serveStatic(BUILD_DIR, { index: false, redirect: false }));
  // 200.html is the pristine CRA shell (react-snap copies it before snapshotting
  // and later overwrites index.html with the homepage snapshot).
  app.use((req, res) => res.sendFile(path.join(BUILD_DIR, '200.html')));

  const server = http.createServer(app);
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

const routeFile = (route) =>
  route.endsWith('.html')
    ? path.join(BUILD_DIR, route)
    : path.join(BUILD_DIR, route, 'index.html');

function verify(include, productPaths) {
  const errors = [];
  const read = (route) => {
    const file = routeFile(route);
    if (!fs.existsSync(file)) {
      errors.push(`${route}: no snapshot written (${path.relative(BUILD_DIR, file)})`);
      return null;
    }
    return fs.readFileSync(file, 'utf8');
  };
  // Attribute order is not stable (react-snap minifies with sortAttributes).
  const tagAttr = (html, tagRe, attr) =>
    ((html.match(tagRe) || [''])[0].match(new RegExp(`${attr}="([^"]*)"`)) || [])[1];
  const canonicalOf = (html) => tagAttr(html, /<link[^>]*rel="canonical"[^>]*>/, 'href');
  const isNoindex = (html) => /noindex/.test(tagAttr(html, /<meta[^>]*name="robots"[^>]*>/, 'content') || '');

  for (const route of include) {
    const html = read(route);
    if (html === null) continue;
    if (html.includes(`localhost:${PORT}`)) errors.push(`${route}: localhost:${PORT} leaked into HTML`);
    if (route === NOT_FOUND_ROUTE) {
      if (!isNoindex(html)) errors.push(`${route}: missing noindex`);
      continue;
    }
    // noindex pages (account deletion, product that no longer resolves) carry no canonical.
    if (isNoindex(html)) continue;
    const expected = `${SITE_URL}${route}`;
    const canonical = canonicalOf(html);
    if (canonical !== expected) errors.push(`${route}: canonical ${canonical || 'missing'} ≠ ${expected}`);
  }

  for (const route of PRICE_PAGES) {
    const html = read(route);
    if (html === null) continue;
    const body = html.replace(/<script[\s\S]*?<\/script>/g, '');
    if (!/₹\s?\d/.test(body)) errors.push(`${route}: no ₹ prices in prerendered HTML (API data missing?)`);
    if (/No items listed/i.test(body)) errors.push(`${route}: prerendered with "No items listed"`);
  }

  const indexedProducts = productPaths.filter((p) => {
    const html = read(p);
    return html && /"@type":"Product"/.test(html);
  });
  if (productPaths.length && indexedProducts.length === 0) errors.push('no product page carries Product schema');

  if (errors.length) fail(`output INVALID:\n   - ${errors.join('\n   - ')}`);
  console.log(
    `✅ prerender verified: ${include.length} pages (${productPaths.length} products, ` +
      `${indexedProducts.length} with Product schema), canonicals self-referencing, prices present, no localhost leakage`
  );
}

(async () => {
  if (fs.existsSync(path.join(BUILD_DIR, '200.html'))) {
    fail('build/200.html already exists — prerender must run on a fresh `react-scripts build`.');
  }

  let productPaths;
  try {
    productPaths = await productPathsFromSitemap();
  } catch (err) {
    fail(`could not read product URLs from ${API_ORIGIN}/sitemap.xml: ${err.message}`);
  }

  const include = [...new Set([...pkg.reactSnap.include, ...productPaths, NOT_FOUND_ROUTE])];
  console.log(`🔎 prerendering ${include.length} routes with data from ${API_ORIGIN}`);

  const server = await startServer();
  const publicUrl = process.env.PUBLIC_URL || pkg.homepage;
  try {
    await run({
      publicPath: publicUrl ? url.parse(publicUrl).pathname : '/',
      ...pkg.reactSnap,
      ...(process.env.PUPPETEER_EXECUTABLE_PATH && { puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH }),
      include,
      externalServer: true,
    });
  } catch (err) {
    server.close();
    fail(`react-snap failed: ${err && err.message ? err.message : err}`);
  }
  server.close();

  verify(include, productPaths);
})();
