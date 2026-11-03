// Vue en coupe du balcon.
// Deux parties :
//   1) geometrieCoupe()   : calcule les points du dessin en MÈTRES (réutilisé par l'export DXF)
//   2) dessinerCoupeSVG() : transforme cette géométrie en dessin SVG à l'écran
//
// Repère du dessin (en mètres, y vers le haut) :
//   - x = 0 : face intérieure du mur de façade, le mur occupe x de 0 à a
//   - y = 0 : dessus de la dalle du balcon (et du plancher intérieur)
//   - le balcon part de la face extérieure du mur (x = a) jusqu'à x = a + L

function limiter(x, min, max) {
  return Math.min(max, Math.max(min, x));
}

function formaterMetres(v) {
  return v.toFixed(2).replace(".", ",") + " m";
}

// g = { A, Ha, L, B, Hb } en mètres
function geometrieCoupe(g) {
  const { A, Ha, L, Hb } = g;
  const B = Math.min(g.B, L);                 // l'acrotère ne peut pas être plus large que le balcon
  const avecAcrotere = B > 0 && Hb > 0;
  const retour = limiter(0.2 * L, 0.3, 1.0);  // longueur de plancher intérieur dessinée à gauche
  const yHaut = (avecAcrotere ? Hb : 0) + 0.35; // hauteur de mur dessinée au-dessus de la dalle
  const yBas = -(Ha + 0.5);                   // hauteur de mur dessinée sous la dalle
  const xFin = A + L;                         // extrémité du balcon

  // Contour du béton, dans l'ordre. coupe = true : l'arête qui part de ce point vers le suivant
  // est une "coupure" (trait pointillé), pas une vraie face de béton.
  const pts = [];
  const ajouter = (x, y, coupe = false) => pts.push({ x, y, coupe });
  ajouter(0, yHaut, true);          // haut du mur (coupure)
  ajouter(A, yHaut);
  ajouter(A, 0);                    // face extérieure du mur, jusqu'au dessus de la dalle
  if (avecAcrotere) {
    ajouter(xFin - B, 0);
    ajouter(xFin - B, Hb);
    ajouter(xFin, Hb);
  } else {
    ajouter(xFin, 0);
  }
  ajouter(xFin, -Ha);               // bout du balcon
  ajouter(A, -Ha);                  // dessous de la dalle
  ajouter(A, yBas, true);           // bas du mur (coupure)
  ajouter(0, yBas);
  ajouter(0, -Ha);
  ajouter(-retour, -Ha, true);      // bout du plancher intérieur (coupure)
  ajouter(-retour, 0);
  ajouter(0, 0);

  return {
    A, Ha, L, B, Hb, avecAcrotere, retour, yHaut, yBas, xFin,
    pts,
    xmin: -retour, xmax: xFin, ymin: yBas, ymax: yHaut,
    xCoteHa: A + 0.15 * L,          // position de la cote "Ha" sur la dalle
  };
}

// ---------------------------------------------------------------------------
// Dessin SVG
// ---------------------------------------------------------------------------

const POLICE = "-apple-system, system-ui, sans-serif";
const TAILLE_TEXTE = 13;
const MARGES = { gauche: 12, droite: 100, haut: 52 };
const HAUTEUR_MAX_DESSIN = 240; // hauteur maximale du dessin lui-même (en pixels)

function mesurerTexte(texte, gras) {
  if (typeof document !== "undefined") {
    if (!mesurerTexte.ctx) mesurerTexte.ctx = document.createElement("canvas").getContext("2d");
    mesurerTexte.ctx.font = `${gras ? 600 : 400} ${TAILLE_TEXTE}px ${POLICE}`;
    return mesurerTexte.ctx.measureText(texte).width;
  }
  return texte.length * TAILLE_TEXTE * 0.58; // estimation (utilisé seulement dans les tests Node)
}

const r1 = (n) => Math.round(n * 10) / 10; // arrondi à 0,1 px pour alléger le SVG

function trait(x1, y1, x2, y2) {
  return `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"/>`;
}

// Pointe de flèche : la pointe est en (x, y), et elle "regarde" dans la direction (dx, dy)
function pointe(x, y, dx, dy) {
  const lg = 9, demi = 3;
  const bx = x - dx * lg, by = y - dy * lg;
  const px = -dy * demi, py = dx * demi;
  return `<polygon points="${r1(x)},${r1(y)} ${r1(bx + px)},${r1(by + py)} ${r1(bx - px)},${r1(by - py)}"/>`;
}

// Étiquette "nom = [valeur]" sur une ligne
function etiquette(nom, valeur, x, yBase, ancre, largeurTotale) {
  const txtNom = nom + " =";
  const wNom = mesurerTexte(txtNom, true);
  const wBoite = mesurerTexte(valeur, false) + 12;
  const total = wNom + 5 + wBoite;
  let x0 = ancre === "middle" ? x - total / 2 : ancre === "end" ? x - total : x;
  x0 = Math.min(Math.max(x0, 2), largeurTotale - 2 - total);
  return `<text class="c-nom" x="${r1(x0)}" y="${r1(yBase)}">${txtNom}</text>` +
    `<rect class="c-boite" x="${r1(x0 + wNom + 5)}" y="${r1(yBase - 14)}" width="${r1(wBoite)}" height="20" rx="5"/>` +
    `<text class="c-val" x="${r1(x0 + wNom + 11)}" y="${r1(yBase)}">${valeur}</text>`;
}

// Étiquette sur deux lignes (le nom au-dessus, la valeur dans sa case dessous), à droite d'une cote verticale
function etiquetteEmpilee(nom, valeur, x, yCentre) {
  const wBoite = mesurerTexte(valeur, false) + 12;
  return `<text class="c-nom" x="${r1(x)}" y="${r1(yCentre - 5)}">${nom} =</text>` +
    `<rect class="c-boite" x="${r1(x)}" y="${r1(yCentre + 1)}" width="${r1(wBoite)}" height="20" rx="5"/>` +
    `<text class="c-val" x="${r1(x + 6)}" y="${r1(yCentre + 16)}">${valeur}</text>`;
}

// Cote horizontale : ligne à la hauteur yc, entre x1 et x2, avec traits de rappel depuis yRef1 / yRef2
function coteHorizontale(x1, x2, yc, yRef1, yRef2) {
  // les traits de rappel dépassent de 5 px de l'autre côté de la ligne de cote
  let s = trait(x1, yRef1, x1, yc - (yRef1 > yc ? 5 : -5)) + trait(x2, yRef2, x2, yc - (yRef2 > yc ? 5 : -5));
  if (x2 - x1 >= 26) {
    s += trait(x1, yc, x2, yc) + pointe(x1, yc, -1, 0) + pointe(x2, yc, 1, 0);
  } else {
    s += trait(x1 - 14, yc, x2 + 14, yc) + pointe(x1, yc, 1, 0) + pointe(x2, yc, -1, 0);
  }
  return s;
}

// Cote verticale : ligne à l'abscisse xc, entre y1 (haut) et y2 (bas), avec traits de rappel depuis xRef1 / xRef2
function coteVerticale(xc, y1, y2, xRef1, xRef2) {
  let s = trait(xRef1, y1, xc + 5, y1) + trait(xRef2, y2, xc + 5, y2);
  if (y2 - y1 >= 26) {
    s += trait(xc, y1, xc, y2) + pointe(xc, y1, 0, -1) + pointe(xc, y2, 0, 1);
  } else {
    s += trait(xc, y1 - 14, xc, y2 + 14) + pointe(xc, y1, 0, 1) + pointe(xc, y2, 0, -1);
  }
  return s;
}

// g = { A, Ha, L, B, Hb } en mètres ; largeur = largeur disponible en pixels ;
// actif = clé du champ à mettre en évidence ("A", "Ha", "L", "B", "Hb") ou null.
// Retourne { svg, hauteur }
function dessinerCoupeSVG(g, largeur, actif) {
  const geo = geometrieCoupe(g);
  const W = Math.max(Math.round(largeur), 240);
  const Wm = geo.xmax - geo.xmin;
  const Hm = geo.ymax - geo.ymin;
  const zoneL = W - MARGES.gauche - MARGES.droite;

  const echelle = Math.min(zoneL / Wm, HAUTEUR_MAX_DESSIN / Hm); // pixels par mètre
  const ox = MARGES.gauche + (zoneL - Wm * echelle) / 2;
  const oy = MARGES.haut;
  // le bas du dessin est soit le bas du mur, soit la cote L et son étiquette (la plus basse des deux)
  const H = Math.round(Math.max(oy + Hm * echelle, oy + (geo.ymax + geo.Ha) * echelle + 62) + 6);
  const X = (x) => ox + (x - geo.xmin) * echelle;
  const Y = (y) => oy + (geo.ymax - y) * echelle;

  const chemin = (p) => `${r1(X(p.x))},${r1(Y(p.y))}`;
  const n = geo.pts.length;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Coupe du balcon" style="font-family:${POLICE};font-size:${TAILLE_TEXTE}px">`;

  svg += `<defs><pattern id="hachure" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" class="c-hachure"/></pattern></defs>`;

  // Béton : remplissage + hachures
  const contour = "M" + geo.pts.map(chemin).join(" L") + " Z";
  svg += `<path d="${contour}" class="c-beton"/><path d="${contour}" fill="url(#hachure)"/>`;

  // Faces réelles (trait plein) et coupures (pointillés)
  let reel = "", coupure = "";
  for (let i = 0; i < n; i++) {
    const p = geo.pts[i], q = geo.pts[(i + 1) % n];
    const seg = `M${chemin(p)} L${chemin(q)} `;
    if (p.coupe) coupure += seg; else reel += seg;
  }
  svg += `<path d="${reel}" class="c-trait"/><path d="${coupure}" class="c-coupure"/>`;

  const cote = (cle, contenu) =>
    `<g class="cote${actif === cle ? " actif" : ""}">${contenu}</g>`;

  // --- cote a : épaisseur du mur (au-dessus du mur)
  const yA = Y(geo.yHaut) - 24;
  svg += cote("A",
    coteHorizontale(X(0), X(geo.A), yA, Y(geo.yHaut), Y(geo.yHaut)) +
    etiquette("a", formaterMetres(geo.A), (X(0) + X(geo.A)) / 2, yA - 8, "middle", W));

  // --- cote B : largeur de l'acrotère
  if (geo.avecAcrotere) {
    const yB = Y(geo.Hb) - 24;
    svg += cote("B",
      coteHorizontale(X(geo.xFin - geo.B), X(geo.xFin), yB, Y(geo.Hb), Y(geo.Hb)) +
      etiquette("B", formaterMetres(g.B), X(geo.xFin), yB - 8, "end", W));
  }

  // --- cote Hb : hauteur de l'acrotère
  if (geo.avecAcrotere) {
    const xHb = X(geo.xFin) + 26;
    svg += cote("Hb",
      coteVerticale(xHb, Y(geo.Hb), Y(0), X(geo.xFin), X(geo.xFin)) +
      etiquetteEmpilee("Hb", formaterMetres(geo.Hb), xHb + 12, (Y(geo.Hb) + Y(0)) / 2));
  }

  // --- cote Ha : épaisseur de la dalle (ligne qui traverse la dalle, étiquette au-dessus)
  const xHa = X(geo.xCoteHa);
  svg += cote("Ha",
    trait(xHa, Y(0) - 26, xHa, Y(-geo.Ha) + 10) +
    trait(xHa - 5, Y(0) + 5, xHa + 5, Y(0) - 5) +
    trait(xHa - 5, Y(-geo.Ha) + 5, xHa + 5, Y(-geo.Ha) - 5) +
    etiquette("Ha", formaterMetres(geo.Ha), xHa + 8, Y(0) - 16, "start", W));

  // --- cote L : portée du balcon (sous la dalle)
  const yL = Y(-geo.Ha) + 30;
  svg += cote("L",
    coteHorizontale(X(geo.A), X(geo.xFin), yL, Y(-geo.Ha), Y(-geo.Ha)) +
    etiquette("L", formaterMetres(geo.L), (X(geo.A) + X(geo.xFin)) / 2, yL + 24, "middle", W));

  svg += "</svg>";
  return { svg, hauteur: H };
}

// Permet de tester ce fichier avec Node.js (sans effet dans le navigateur)
if (typeof module !== "undefined") {
  module.exports = { geometrieCoupe, dessinerCoupeSVG, formaterMetres, limiter };
}
