// Export de la coupe du balcon au format DXF (lisible par AutoCAD, BricsCAD, DraftSight, etc.)
//
// - Dessin en MILLIMÈTRES (1 unité = 1 mm), à l'échelle 1:1
// - Sans cotes : uniquement le contour du béton et les traits de coupure
// - 2 calques : COUPE (contour du béton), COUPURE (traits de coupure pointillés)
// - Format DXF "R12" (AC1009) : le plus compatible

function genererDXF(g) {
  const geo = geometrieCoupe(g);
  const sortie = [];
  const ecrire = (code, valeur) => sortie.push(String(code), String(valeur));
  const nb = (v) => (Math.round(v * 1000) / 1000).toFixed(3);
  const mm = (metres) => metres * 1000;

  const ligne = (calque, x1, y1, x2, y2, typeLigne) => {
    ecrire(0, "LINE"); ecrire(8, calque);
    if (typeLigne) ecrire(6, typeLigne);
    ecrire(10, nb(x1)); ecrire(20, nb(y1)); ecrire(30, nb(0));
    ecrire(11, nb(x2)); ecrire(21, nb(y2)); ecrire(31, nb(0));
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
  ecrire(0, "TABLE"); ecrire(2, "LAYER"); ecrire(70, 2);
  for (const [nom, couleur, typeLigne] of [["COUPE", 7, "CONTINUOUS"], ["COUPURE", 8, "DASHED"]]) {
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

  ecrire(0, "ENDSEC");
  ecrire(0, "EOF");
  return sortie.join("\r\n") + "\r\n";
}

// Permet de tester ce fichier avec Node.js (sans effet dans le navigateur)
if (typeof module !== "undefined") {
  module.exports = { genererDXF };
}
