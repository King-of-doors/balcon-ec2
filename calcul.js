// Calcul de balcon en console - Eurocode 2
// Traduction fidèle des formules de l'application Kivy d'origine.
// Ce fichier ne contient QUE le calcul (aucune interface), pour pouvoir le tester facilement.

const PSI2_VALUES = {
  "catégorie A: habitations, zone résidentielles": 0.3,
  "catégorie B: bureaux": 0.3,
  "catégorie C: lieux de réunion": 0.6,
  "catégorie D: commerces": 0.6,
  "catégorie E: stockages": 0.8,
  "catégorie F: zone de trafic, véhicules de poids < 30kN": 0.6,
  "catégorie G: zone de trafic, véhicules de 30kN < poids < 160kN": 0.3,
  "catégorie H: toits": 0,
  "Neige - Finlande, Islande, Norvège, Suède, Saint-Pierre et Miquelon": 0.2,
  "Neige - autres états européens pour une altitude > 1000m": 0.2,
  "Neige - autres états européens pour une altitude < 1000m": 0,
  "Charges dues au vent sur les bâtiments EN1991-1-4": 0,
  "Températures dans les bâtiments (hors incendie) EN1991-1-5": 0,
};

// Valeurs par défaut (reprises de l'app d'origine)
const DEFAULTS = {
  A: 0.20, Ha: 0.20, L: 1.50, B: 0.20, Hb: 0.50,
  fyk: 500, fck: 25,
  e: 3, phi: 8, As: 3.20,
  Gprim: 1.0, Q: 3.50, PGC: 0.1, Ma: 1.00,
};

// data : objet avec A, Ha, L, B, Hb, fyk, fck, e, phi, As, Gprim, Q, PGC, Ma,
//        Limite_fleche (250 ou 500) et psy_deux (valeur de psi2)
// Retourne { ok: true, ... résultats ... } ou { ok: false, erreur: "message" }
function calculer(data) {
  const { A, Ha, L, B, Hb, fyk, fck, e, phi, As, Gprim, Q, PGC, Ma } = data;
  const psy_deux = data.psy_deux ?? 0;
  const Limite_fleche = data.Limite_fleche;

  const avertissements = [];

  // ---------- Flexion ELU ----------
  const fyd = fyk / 1.15;
  const fcd = fck / 1.5;
  const d = Ha - e / 100 - 0.5 * phi / 1000;
  const Gdalle = 25 * Ha;
  const Gtot = Gdalle + Gprim;
  const Pelu = 1.35 * Gtot + 1.5 * Q;
  const L_utile = L + Math.min(Ha / 2, A / 2);
  const Moment_one = Pelu * L_utile * L_utile / 2;
  const Pacro = (Hb * B * 25 + PGC) * 1.35;
  const Moment_two = Pacro * (L_utile - B / 2);
  const Moment_tot = Moment_one + Moment_two + Ma;
  const mu = (Moment_tot * 1e6) / (1000 * ((d * 1000) ** 2 * fcd));

  // Ajout par rapport à l'app d'origine : contrôle de μ
  // (si 1 - 2μ < 0, la racine carrée n'existe pas : le calcul n'a plus de sens)
  if (d <= 0) {
    return { ok: false, erreur: "La hauteur utile d est négative ou nulle : vérifier l'épaisseur du balcon, l'enrobage et le diamètre." };
  }
  if (1 - 2 * mu < 0) {
    return { ok: false, erreur: `Section insuffisante (μ = ${mu.toFixed(3).replace(".", ",")} > 0,5) : le calcul est impossible. Augmenter l'épaisseur du balcon ou la résistance du béton.` };
  }
  if (mu > 0.372) {
    avertissements.push(`μ = ${mu.toFixed(3).replace(".", ",")} > 0,372 : des aciers comprimés seraient nécessaires. Ce calcul ne les prend pas en compte, le résultat n'est pas valable.`);
  }

  const alpha = 1.25 * (1 - Math.sqrt(1 - 2 * mu));
  const z = (1 - 0.4 * alpha) * d;
  const Ast = ((Moment_tot * 1e6) / (z * 1000 * fyd)) * 1e-2; // cm²/ml

  // ---------- Taux d'utilisation des aciers ----------
  const taux_utilisation = Ast / As * 100;

  // ---------- Flèche (ELS quasi-permanent) ----------
  const pels = Pacro / 1.35;
  const Q_alt = Q + Ma / (L_utile * L_utile / 2);
  const wels = Math.max(Gtot + psy_deux * Q_alt, Gtot);
  const Mqp_iso = pels * L_utile + wels * (L_utile ** 2) / 2;
  const fctm = 0.3 * (fck ** (2 / 3));
  const as_m_car = As * 1e-4;
  const ecm_bet = (22 * ((fck + 8) / 10) ** 0.3) * 1e3;
  const e_bet = ecm_bet / 3;
  const alpha_qp = 200000 / e_bet;
  const xser_1 = ((Ha ** 2) * 0.5 + (alpha_qp - 1) * (as_m_car * d)) /
    (1 * Ha + (alpha_qp - 1) * (as_m_car + 0));
  const inertie_un = (1 * (Ha ** 3) / 12) + 1 * Ha * ((Ha / 2 - xser_1) ** 2) +
    (alpha_qp * as_m_car * (d - xser_1) ** 2);
  const xser_2 = (1 / 1) * (-alpha_qp * (as_m_car + 0) +
    ((alpha_qp ** 2) * ((as_m_car + 0) ** 2) + 2 * 1 * alpha_qp * (as_m_car * d)) ** 0.5);
  const inertie_deux = (1 * xser_2 ** 3) / 3 + alpha_qp * as_m_car * (d - xser_2) ** 2;
  const beta = 1;
  const Mqp_MN = Mqp_iso / 1000;
  const Mcr_MN = fctm * inertie_un / (Ha - xser_1);
  const delta = Mcr_MN > Mqp_MN ? 0 : 1 - beta * ((Mcr_MN / Mqp_MN) ** 2);
  const f1_iso = (pels * 1e-3 * L_utile ** 3) / (3 * e_bet * inertie_un) +
    (wels * 1e-3 * L_utile ** 4) / (8 * e_bet * inertie_un);
  const f2_iso = (pels * 1e-3 * L_utile ** 3) / (3 * e_bet * inertie_deux) +
    (wels * 1e-3 * L_utile ** 4) / (8 * e_bet * inertie_deux);
  const F_reel = (delta * f2_iso + (1 - delta) * f1_iso) * 1e3; // mm
  const F_limite = (L_utile > 7 ? 0.014 + ((L_utile - 7) / 1000) : (L_utile / Limite_fleche)) * 1e3; // mm
  const taux_fleche = F_reel / F_limite;

  const resultat = {
    ok: true,
    avertissements,
    mu, d, L_utile, Moment_tot,
    Ast, As, taux_utilisation,
    F_reel, F_limite, taux_fleche,
    // ----- Résultats intermédiaires (unités internes : m, kN, MPa) -----
    fyd, fcd, Gdalle, Gtot, Pelu, Moment_one, Pacro, Moment_two, alpha, z,
    pels, Q_alt, wels, Mqp_iso, fctm, ecm_bet, e_bet, alpha_qp,
    xser_1, inertie_un, xser_2, inertie_deux, Mcr_MN, Mqp_MN, delta, f1_iso, f2_iso,
  };

  for (const [cle, valeur] of Object.entries(resultat)) {
    if (typeof valeur === "number" && !Number.isFinite(valeur)) {
      return { ok: false, erreur: `Le calcul a produit une valeur invalide (${cle}). Vérifier les données saisies.` };
    }
  }
  return resultat;
}

// Permet de tester ce fichier avec Node.js (sans effet dans le navigateur)
if (typeof module !== "undefined") {
  module.exports = { calculer, PSI2_VALUES, DEFAULTS };
}
