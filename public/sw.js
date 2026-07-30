/*
 * Firewatch service worker.
 *
 * Goals, in field-usability order:
 *  1. App shell and static chunks survive a signal drop (cache-first for
 *     immutable /_next/static, network-first for navigations).
 *  2. The last good /api/wind|updates|thermal responses are served when the
 *     network fails, so the "OFFLINE — LAST SNAPSHOT" banner shows real data.
 *  3. Recently viewed basemap/overlay tiles keep the map readable offline,
 *     capped so the cache cannot grow without bound.
 */

const VERSION = "firewatch-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-data`;
const TILE_CACHE = `${VERSION}-tiles`;
const TILE_LIMIT = 400;

const TILE_HOSTS = [
  "basemaps.cartocdn.com",
  "server.arcgisonline.com",
  "tile.opentopomap.org",
  "gibs.earthdata.nasa.gov",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(["/"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
    if (limit) await trimCache(cache, limit);
  }
  return response;
}

async function trimCache(cache, limit) {
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await cache.delete(keys[0]);
  await trimCache(cache, limit);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api/")) {
      event.respondWith(networkFirst(request, DATA_CACHE));
      return;
    }
    if (url.pathname.startsWith("/_next/static/")) {
      event.respondWith(cacheFirst(request, SHELL_CACHE));
      return;
    }
    if (request.mode === "navigate") {
      event.respondWith(networkFirst(request, SHELL_CACHE));
    }
    return;
  }

  if (TILE_HOSTS.some((host) => url.hostname.endsWith(host))) {
    event.respondWith(cacheFirst(request, TILE_CACHE, TILE_LIMIT));
  }
});
