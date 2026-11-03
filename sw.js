// Service worker : permet à l'app de fonctionner sans connexion.
//
// Stratégie "réseau d'abord" : quand on a du réseau, on charge toujours la dernière version
// et on la met en cache ; sans réseau, on utilise la copie en cache.
// Penser à changer VERSION à chaque modification de la liste de fichiers ou de l'app
// (ex. "balcon-ec2-v3") : cela supprime proprement les anciennes copies.
const VERSION = "balcon-ec2-v2";
const FICHIERS = [
  "./",
  "index.html",
  "calcul.js",
  "champs.js",
  "coupe.js",
  "dxf.js",
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
  const requete = event.request;
  if (requete.method !== "GET" || new URL(requete.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(requete, { cache: "no-cache" })
      .then((reponse) => {
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(VERSION).then((cache) => cache.put(requete, copie));
        }
        return reponse;
      })
      .catch(() => caches.match(requete, { ignoreSearch: true }))
  );
});
