// Service worker : met l'app en cache pour qu'elle fonctionne sans connexion.
// IMPORTANT : à chaque modification de l'app, changer le numéro de version ci-dessous
// (ex. "balcon-ec2-v2"), sinon l'iPhone gardera l'ancienne version en cache.
const VERSION = "balcon-ec2-v1";
const FICHIERS = [
  "./",
  "index.html",
  "calcul.js",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FICHIERS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(noms.filter((n) => n !== VERSION).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((enCache) => enCache || fetch(event.request))
  );
});
