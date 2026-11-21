/* Service worker scoped to /pvprealcom-site/fifa/ (the script lives in that folder). */
var CACHE = "fifa-ps5-cup-v3";
var ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./fc.css",
  "./app.js",
  "./bracket.js",
  "./config.js",
  "./data-port.js",
  "./manifest.json",
  "./vendor/lz-string.min.js",
  "./vendor/qrcode-generator.js",
  "./img/stadium.webp",
  "./img/stadium-mobile.webp",
  "./fonts/inter-cyrillic-400.woff2",
  "./fonts/inter-cyrillic-500.woff2",
  "./fonts/inter-cyrillic-600.woff2",
  "./fonts/oswald-cyrillic-500.woff2",
  "./fonts/oswald-cyrillic-600.woff2",
  "./fonts/oswald-cyrillic-700.woff2",
  "./fonts/unbounded-500.woff2",
  "./fonts/unbounded-700.woff2",
  "./fonts/manrope-400.woff2",
  "./fonts/manrope-600.woff2",
  "./fonts/manrope-700.woff2",
  "./fonts/manrope-800.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(ASSETS);
  }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
      return caches.delete(k);
    }));
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/pvprealcom-site/fifa/") !== 0) return;
  event.respondWith(networkFirst(req));
});

function networkFirst(req) {
  return caches.open(CACHE).then(function (cache) {
    return fetch(req).then(function (res) {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(function () {
      return cache.match(req).then(function (cached) {
        if (cached) return cached;
        if (req.mode === "navigate") return cache.match("./index.html");
        return new Response("", { status: 504, statusText: "offline" });
      });
    });
  });
}
