// Export de la coupe du balcon au format DXF (lisible par AutoCAD, BricsCAD, DraftSight, etc.)
//
// - Dessin en MILLIMÈTRES (1 unité = 1 mm), à l'échelle 1:1
// - 3 calques : COUPE (contour du béton), COUPURE (traits de coupure pointillés), COTES (cotations)
// - Format DXF "R12" (AC1009) : le plus compatible
// - Le texte est en ASCII uniquement (pas d'accents) pour éviter les problèmes d'encodage

function genererDXF(g) {
  const geo = geometrieCoupe(g);
  const sortie = [];
  const ecrire = (code, valeur) => sortie.push(String(code), String(valeur));
  const nb = (v) => (Math.round(v * 1000) / 1000).toFixed(3);
  const mm = (metres) => metres * 1000;

  // Hauteur de texte : proportionnelle à la taille du dessin (entre 40 et 120 mm)
  const hT = limiter(0.03 * (geo.xmax - geo.xmin) * 1000, 40, 120);
  const hFleche = 1.2 * hT;

  // ---------- Éléments de base ----------
  const ligne = (calque, x1, y1, x2, y2, typeLigne) => {
    ecrire(0, "LINE"); ecrire(8, calque);
    if (typeLigne) ecrire(6, typeLigne);
    ecrire(10, nb(x1)); ecrire(20, nb(y1)); ecrire(30, nb(0));
    ecrire(11, nb(x2)); ecrire(21, nb(y2)); ecrire(31, nb(0));
  };
  const texte = (calque, x, y, hauteur, contenu) => {
    ecrire(0, "TEXT"); ecrire(8, calque);
    ecrire(10, nb(x)); ecrire(20, nb(y)); ecrire(30, nb(0));
    ecrire(40, nb(hauteur)); ecrire(1, contenu);
  };
  const triangle = (calque, x1, y1, x2, y2, x3, y3) => {
    ecrire(0, "SOLID"); ecrire(8, calque);
    ecrire(10, nb(x1)); ecrire(20, nb(y1)); ecrire(30, nb(0));
    ecrire(11, nb(x2)); ecrire(21, nb(y2)); ecrire(31, nb(0));
    ecrire(12, nb(x3)); ecrire(22, nb(y3)); ecrire(32, nb(0));
    ecrire(13, nb(x3)); ecrire(23, nb(y3)); ecrire(33, nb(0));
  };
  // Pointe de flèche : pointe en (x, y), dirigée vers (dx, dy)
  const pointe = (x, y, dx, dy) => {
    const bx = x - dx * hFleche, by = y - dy * hFleche;
    const px = -dy * hFleche * 0.17, py = dx * hFleche * 0.17;
    triangle("COTES", x, y, bx + px, by + py, bx - px, by - py);
  };
  const etiquette = (nom, valeurM) => `${nom} = ${valeurM.toFixed(2).replace(".", ",")} m`;
  const largeurTexte = (t) => t.length * hT * 0.6; // estimation

  // ---------- Cotes ----------
  const depasse = 0.6 * hT; // les traits de rappel dépassent de la ligne de cote
  const coteH = (nom, valeurM, x1, x2, yc, yRef1, yRef2) => {
    const sens = yc > yRef1 ? 1 : -1;
    ligne("COTES", x1, yRef1, x1, yc + sens * depasse);
    ligne("COTES", x2, yRef2, x2, yc + sens * depasse);
    if (x2 - x1 >= 3 * hFleche) {
      ligne("COTES", x1, yc, x2, yc);
      pointe(x1, yc, -1, 0); pointe(x2, yc, 1, 0);
    } else {
      ligne("COTES", x1 - 1.6 * hFleche, yc, x2 + 1.6 * hFleche, yc);
      pointe(x1, yc, 1, 0); pointe(x2, yc, -1, 0);
    }
    const t = etiquette(nom, valeurM);
    texte("COTES", (x1 + x2) / 2 - largeurTexte(t) / 2, yc + 0.9 * hT, hT, t);
  };
  const coteV = (nom, valeurM, xc, yBas, yHaut, xRef1, xRef2) => {
    ligne("COTES", xRef1, yHaut, xc + depasse, yHaut);
    ligne("COTES", xRef2, yBas, xc + depasse, yBas);
    if (yHaut - yBas >= 3 * hFleche) {
      ligne("COTES", xc, yBas, xc, yHaut);
      pointe(xc, yHaut, 0, 1); pointe(xc, yBas, 0, -1);
    } else {
      ligne("COTES", xc, yBas - 1.6 * hFleche, xc, yHaut + 1.6 * hFleche);
      pointe(xc, yHaut, 0, -1); pointe(xc, yBas, 0, 1);
    }
    texte("COTES", xc + 0.8 * hT, (yBas + yHaut) / 2 - 0.35 * hT, hT, etiquette(nom, valeurM));
  };

  // ---------- En-tête et tables ----------
  ecrire(0, "SECTION"); ecrire(2, "HEADER");
  ecrire(9, "$ACADVER"); ecrire(1, "AC1009");
  ecrire(0, "ENDSEC");

  ecrire(0, "SECTION"); ecrire(2, "TABLES");
  ecrire(0, "TABLE"); ecrire(2, "LTYPE"); ecrire(70, 2);
  ecrire(0, "LTYPE"); ecrire(2, "CONTINUOUS"); ecrire(70, 0); ecrire(3, "Solid line");
  ecrire(72, 65); ecrire(73, 0); ecrire(40, "0.0");
  ecrire(0, "LTYPE"); ecrire(2, "DASHED"); ecrire(70, 0); ecrire(3, "Dashed");
  ecrire(72, 65); ecrire(73, 2); ecrire(40, "60.0"); ecrire(49, "40.0"); ecrire(49, "-20.0");
  ecrire(0, "ENDTAB");
  ecrire(0, "TABLE"); ecrire(2, "LAYER"); ecrire(70, 3);
  for (const [nom, couleur, typeLigne] of [["COUPE", 7, "CONTINUOUS"], ["COUPURE", 8, "DASHED"], ["COTES", 5, "CONTINUOUS"]]) {
    ecrire(0, "LAYER"); ecrire(2, nom); ecrire(70, 0); ecrire(62, couleur); ecrire(6, typeLigne);
  }
  ecrire(0, "ENDTAB");
  ecrire(0, "ENDSEC");

  // ---------- Dessin ----------
  ecrire(0, "SECTION"); ecrire(2, "ENTITIES");

  // Contour du béton (traits pleins) et coupures (pointillés)
  const n = geo.pts.length;
  for (let i = 0; i < n; i++) {
    const p = geo.pts[i], q = geo.pts[(i + 1) % n];
    if (p.coupe) ligne("COUPURE", mm(p.x), mm(p.y), mm(q.x), mm(q.y), "DASHED");
    else ligne("COUPE", mm(p.x), mm(p.y), mm(q.x), mm(q.y));
  }

  const off = 3.5 * hT; // distance entre le dessin et la ligne de cote

  // a : épaisseur du mur (au-dessus du mur)
  coteH("a", geo.A, mm(0), mm(geo.A), mm(geo.yHaut) + off, mm(geo.yHaut), mm(geo.yHaut));

  // B : largeur de l'acrotère, Hb : hauteur de l'acrotère
  if (geo.avecAcrotere) {
    coteH("B", g.B, mm(geo.xFin - geo.B), mm(geo.xFin), mm(geo.Hb) + off, mm(geo.Hb), mm(geo.Hb));
    coteV("Hb", geo.Hb, mm(geo.xFin) + off, mm(0), mm(geo.Hb), mm(geo.xFin), mm(geo.xFin));
  }

  // Ha : épaisseur de la dalle (ligne qui traverse la dalle, texte au-dessus)
  {
    const xc = mm(geo.xCoteHa);
    ligne("COTES", xc, mm(0) + 2.2 * hT, xc, mm(-geo.Ha) - 0.8 * hT);
    ligne("COTES", xc - 0.6 * hT, mm(0) - 0.6 * hT, xc + 0.6 * hT, mm(0) + 0.6 * hT);
    ligne("COTES", xc - 0.6 * hT, mm(-geo.Ha) - 0.6 * hT, xc + 0.6 * hT, mm(-geo.Ha) + 0.6 * hT);
    texte("COTES", xc + 0.8 * hT, mm(0) + 1.0 * hT, hT, etiquette("Ha", geo.Ha));
  }

  // L : portée du balcon (sous la dalle)
  coteH("L", geo.L, mm(geo.A), mm(geo.xFin), mm(-geo.Ha) - off, mm(-geo.Ha), mm(-geo.Ha));

  ecrire(0, "ENDSEC");
  ecrire(0, "EOF");
  return sortie.join("\r\n") + "\r\n";
}

// Permet de tester ce fichier avec Node.js (sans effet dans le navigateur)
if (typeof module !== "undefined") {
  module.exports = { genererDXF };
}
