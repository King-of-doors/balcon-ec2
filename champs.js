// Définition des champs de saisie : sert à construire le formulaire ET à vérifier les valeurs.
//
// cle      : nom interne de la donnée (utilisé dans calcul.js)
// symbole  : symbole affiché dans l'application
// libelle  : texte affiché à l'utilisateur
// unite    : unité affichée à droite du champ (celle que l'utilisateur tape)
// echelle  : valeur affichée = valeur interne x echelle. Le calcul (calcul.js) travaille en mètres et en kN :
//            - dimensions : on tape des cm  -> echelle 100 (1 m = 100 cm)
//            - charges    : on tape des daN -> echelle 100 (1 kN = 100 daN)
//            Sans "echelle", la valeur n'est pas convertie.
// min      : valeur minimale acceptée (dans l'unité affichée)
// strict   : true  => la valeur doit être STRICTEMENT supérieure à min (ex. épaisseur > 0)
//            false => la valeur peut être égale à min (ex. une charge peut être 0)
// dependAcrotere : true => champ grisé et forcé à 0 quand la case « Présence d'un acrotère » est décochée

const SECTIONS = [
  {
    id: "geom",
    titre: "Géométrie",
    champs: [
      { cle: "A",  symbole: "a",  libelle: "Épaisseur du mur de façade", unite: "cm", echelle: 100, min: 0, strict: true },
      { cle: "Ha", symbole: "Ha", libelle: "Épaisseur du balcon", unite: "cm", echelle: 100, min: 0, strict: true },
      { cle: "L",  symbole: "L",  libelle: "Portée totale du balcon", unite: "cm", echelle: 100, min: 0, strict: true },
      { cle: "B",  symbole: "B",  libelle: "Largeur d’acrotère", unite: "cm", echelle: 100, min: 0, strict: false, dependAcrotere: true },
      { cle: "Hb", symbole: "Hb", libelle: "Hauteur d’acrotère au-dessus du plancher", unite: "cm", echelle: 100, min: 0, strict: false, dependAcrotere: true },
    ],
  },
  {
    id: "mat",
    titre: "Matériaux",
    champs: [
      { cle: "fyk", symbole: "fyk", libelle: "Nuance d’acier", unite: "MPa", min: 0, strict: true },
      { cle: "fck", symbole: "fck", libelle: "Résistance du béton", unite: "MPa", min: 0, strict: true },
    ],
  },
  {
    id: "arm",
    titre: "Armatures",
    champs: [
      { cle: "e",   symbole: "e",   libelle: "Enrobage des aciers porteurs", unite: "cm", min: 0, strict: false },
      { cle: "phi", symbole: "⌀",   libelle: "Diamètre des aciers porteurs", unite: "mm", min: 0, strict: true },
      { cle: "As",  symbole: "As",  libelle: "As réel", unite: "cm²/ml", min: 0, strict: true },
    ],
  },
  {
    id: "load",
    titre: "Chargement",
    champs: [
      { cle: "Gprim", symbole: "G",   libelle: "Charge permanente", unite: "daN/m²", echelle: 100, min: 0, strict: false },
      { cle: "Q",     symbole: "Q",   libelle: "Charge d’exploitation", unite: "daN/m²", echelle: 100, min: 0, strict: false },
      { cle: "PGC",   symbole: "PGC", libelle: "Poids d’un garde-corps", unite: "daN/ml", echelle: 100, min: 0, strict: false },
      { cle: "Ma",    symbole: "Ma",  libelle: "Moment dû à la poussée sur l’acrotère", unite: "daN.m", echelle: 100, min: 0, strict: false },
    ],
  },
];

// Conversions entre la valeur tapée (cm, daN...) et la valeur utilisée par le calcul (m, kN...)
function versSI(champ, valeurAffichee) {
  return valeurAffichee / (champ.echelle || 1);
}
function versAffichage(champ, valeurSI) {
  return Math.round(valeurSI * (champ.echelle || 1) * 1e6) / 1e6; // arrondi pour éviter 20.000000000000004
}

// Lit un nombre écrit par l'utilisateur (accepte la virgule ou le point).
// Retourne null si le texte est vide ou n'est pas un nombre.
function lireNombre(texte) {
  const propre = String(texte).trim().replace(",", ".");
  if (propre === "" || isNaN(Number(propre))) return null;
  return Number(propre);
}

// Vérifie UN champ. Retourne null si tout va bien, sinon un message court.
function verifierChamp(champ, valeur) {
  if (valeur === null) return "valeur manquante ou illisible";
  if (champ.strict && !(valeur > champ.min)) return `doit être supérieure à ${champ.min}`;
  if (!champ.strict && valeur < champ.min) return `ne peut pas être inférieure à ${champ.min}`;
  return null;
}

// Permet de tester ce fichier avec Node.js (sans effet dans le navigateur)
if (typeof module !== "undefined") {
  module.exports = { SECTIONS, lireNombre, verifierChamp, versSI, versAffichage };
}
