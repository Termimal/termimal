// constants/docMapping.ts
// Exact indicator mapping from IMPORTANT_INDICATORS_BY_SECTOR.odt
// Thresholds from Analyse_Fondamental.txt
// Nothing invented — every threshold is from the source documents

import type { SectorMapping, SectorType, Signal } from '@/types'

// ─── Sector Mappings (IMPORTANT_INDICATORS_BY_SECTOR.odt) ────

export const DOC_MAPPING: Record<SectorType, SectorMapping> = {

  // ── A) Boîte "normale" (industrie / conso / tech mature) ───
  normal: {
    label:  'Boîte Normale — industrie / conso / tech mature',
    source: 'IMPORTANT_INDICATORS_BY_SECTOR — Section A',
    groups: {
      'Levier & Solvabilité': [
        { id:'dEbitda', n:'Debt/EBITDA',       formula:'Dette nette / EBITDA',       th:'<2 très bien · 2–3 bien · 3–4 attention · >4 danger',  why:'Années de profit pour rembourser la dette' },
        { id:'intCov',  n:'Interest Coverage', formula:'EBIT / Intérêts',            th:'>5 solide · 2–5 moyen · <2 risqué · <1 alarme',       why:'Peut-il payer les intérêts de sa dette ?' },
        { id:'de',      n:'Debt/Equity',       formula:'Dette totale / Equity',       th:'<0.5 attention · 0.5–1 normal · >1 endetté',          why:'Niveau de dette par rapport aux fonds propres' },
      ],
      'Cash & Liquidité': [
        { id:'fcf',     n:'FCF',               formula:'CFO − Capex',                th:'Positif = bon · Négatif = vigilance',                  why:'Cash réel disponible après investissements' },
        { id:'fcfYld',  n:'FCF Yield',         formula:'FCF / Market Cap × 100',     th:'>8% undervalued · 5-8% fair · <3% expensive',         why:'Good indicator of price vs cash generation' },
        { id:'cfo',     n:'CFO',               formula:'Cash généré par l\'activité', th:'Positif stable = bon · CFO < Net Income = méfiance',  why:'CFO < Net Income sur longtemps = bénéfices "pas très cash"' },
      ],
      'Profitabilité': [
        { id:'roic',    n:'ROIC',              formula:'NOPAT / Capital Investi',     th:'>15% très bien · 10–15% bien · <8% moyen · <5% faible', why:'L\'entreprise transforme-t-elle l\'argent en profit ?' },
        { id:'opMgn',   n:'Operating Margin',  formula:'EBIT / Revenue',             th:'>20% très bien · 10–20% bien · 5–10% moyen · <5% faible', why:'Rentabilité du business avant intérêts/impôts' },
        { id:'netMgn',  n:'Net Margin',        formula:'Net Income / Revenue',        th:'>15% très bien · 8–15% bien · <5% fragile',           why:'Profit net après tout (impôts, intérêts)' },
        { id:'gMgn',    n:'Gross Margin',      formula:'(Revenue − COGS) / Revenue', th:'Dépend du secteur — stable ou croissant = bon',       why:'Profit brut par vente avant OPEX' },
        { id:'preMgn',  n:'Pretax Margin',     formula:'EBT / Revenue',              th:'>20% très bon · >10% bon',                            why:'Ce qu\'il reste après la dette, avant impôts' },
        { id:'roe',     n:'ROE',               formula:'Net Income / Equity',        th:'>15% bon · PIÈGE: vérifier Debt/Equity',              why:'Rentabilité des actionnaires — attention au levier' },
      ],
      'Valorisation': [
        { id:'evEbitda', n:'EV/EBITDA',        formula:'(MktCap + Dette − Cash) / EBITDA', th:'<8x cheap · 8–12x normal · 12–15x expensive',  why:'Real business price (debt + cash included)' },
        { id:'fcfYld',  n:'FCF Yield (check)', formula:'FCF / Market Cap × 100',     th:'>8% undervalued · <3% expensive',                       why:'Complements EV/EBITDA — confirms valuation' },
      ],
      'Croissance & Risque': [
        { id:'beta',    n:'Beta',              formula:'Regression vs market',        th:'~1 market level · >1.3 volatile · <0.8 defensive',      why:'Volatility relative to market' },
      ],
    },
  },

  // ── B) Cyclicals (auto, matières, shipping, acier) ─────────
  cyclical: {
    label:  'Cyclicals — auto, matières, shipping, acier',
    source: 'IMPORTANT_INDICATORS_BY_SECTOR — Section B',
    warnings: [
      'PIÈGE : ratios "beaux" au pic du cycle — regarder sur plusieurs années',
      'FCF Yield utile SEULEMENT si FCF est stable sur plusieurs années',
    ],
    groups: {
      'Levier (priorité absolue)': [
        { id:'dEbitda', n:'Debt/EBITDA',       formula:'Dette nette / EBITDA',        th:'<2 très bien · 2–3 bien · 3–4 attention · >4 DANGER cyclique', why:'En cyclique, la dette peut tuer en bas de cycle' },
        { id:'intCov',  n:'Interest Coverage', formula:'EBIT / Intérêts',             th:'>5 solide · <2 risqué en bas de cycle',                         why:'Les intérêts continuent même quand les profits chutent' },
        { id:'de',      n:'Debt/Equity',       formula:'Dette totale / Equity',        th:'<0.5 idéal · >1 dangereux en cyclique',                        why:'Levier amplifie les pertes en retournement' },
      ],
      'Cash (sur plusieurs années)': [
        { id:'cfo',     n:'CFO (multi-année)', formula:'Cash généré par l\'activité', th:'Regarder 3–5 ans, pas juste l\'année courante',               why:'En cyclique, regarder le CFO sur plusieurs cycles' },
        { id:'fcf',     n:'FCF (multi-année)', formula:'CFO − Capex',                 th:'FCF stable multi-années = vrai avantage compétitif',           why:'Éviter les entreprises dont FCF s\'effondre en bas de cycle' },
      ],
      'Profitabilité': [
        { id:'opMgn',   n:'Operating Margin',  formula:'EBIT / Revenue',              th:'Stabilité importante — une marge stable = business solide',   why:'En cyclique, la marge s\'effondre en bas de cycle' },
        { id:'roic',    n:'ROIC (moyenne)',     formula:'NOPAT / Capital Investi',     th:'Regarder la moyenne sur 5 ans, pas le pic',                   why:'ROIC doit être >8% même en bas de cycle' },
        { id:'netMgn',  n:'Net Margin',         formula:'Net Income / Revenue',        th:'>5% minimum en bas de cycle',                                 why:'Marge nette indique la résilience' },
        { id:'gMgn',    n:'Gross Margin',       formula:'(Revenue − COGS) / Revenue', th:'Stabilité clé — en cyclique la marge brute peut varier',      why:'Varie avec les prix des matières premières' },
      ],
      'Valorisation': [
        { id:'evEbitda', n:'EV/EBITDA (prudence)', formula:'EV / EBITDA',            th:'Utiliser avec prudence — en haut de cycle les ratios semblent bons', why:'EV/EBITDA élevé en pic de cycle = piège classique' },
      ],
    },
  },

  // ── C) Tech / Croissance (AI, quantum, biotech) ────────────
  tech: {
    label:  'Tech / Croissance — AI, quantum, biotech, SaaS',
    source: 'IMPORTANT_INDICATORS_BY_SECTOR — Section C',
    warnings: [
      'PIÈGE : pas encore rentable + dilution',
      'Cash runway = cash ÷ burn annuel — combien de temps avant manque d\'argent ?',
    ],
    groups: {
      'Cash & Survie (priorité absolue)': [
        { id:'cfo',     n:'CFO (tendance)',     formula:'Cash généré par l\'activité', th:'Tendance : burn ou amélioration ? Burn décélère = bon signal', why:'En tech early, le CFO montre si le business s\'améliore' },
        { id:'fcf',     n:'FCF (burn réel)',    formula:'CFO − Capex',                 th:'Burn réel — négatif acceptable si décélère',                  why:'FCF = cash réellement brûlé ou généré' },
      ],
      'Qualité du Modèle': [
        { id:'gMgn',    n:'Gross Margin',       formula:'(Revenue − COGS) / Revenue', th:'>60% = modèle scalable (SaaS) · >70% = excellent',            why:'En SaaS, marge brute élevée = chaque client coûte peu à servir' },
        { id:'opMgn',   n:'Operating Margin',   formula:'EBIT / Revenue',             th:'Doit s\'améliorer chaque année — négatif OK si convergence',   why:'Montre la convergence vers la rentabilité' },
        { id:'de',      n:'Debt/Equity',        formula:'Dette totale / Equity',       th:'Souvent faible — si élevé = red flag',                        why:'En tech early, la dette est un signal d\'alerte' },
        { id:'intCov',  n:'Interest Coverage',  formula:'EBIT / Intérêts',            th:'Si dette existe : vérifier couverture',                        why:'Si intérêts non couverts + burn élevé = danger' },
      ],
      'Maturité & Valorisation': [
        { id:'roic',    n:'ROIC',               formula:'NOPAT / Capital Investi',    th:'Pertinent quand mature — >15% excellent',                      why:'Quand la tech mature, ROIC mesure l\'efficacité du capital' },
        { id:'evEbitda', n:'EV/EBITDA',         formula:'EV / EBITDA',               th:'Si EBITDA existe : <20x raisonnable pour croissance',           why:'Comparaison avec pairs du secteur' },
        { id:'fcfYld',  n:'FCF Yield',          formula:'FCF / Market Cap × 100',    th:'Pertinent quand FCF stable positif',                           why:'Valorisation vs cash généré' },
      ],
    },
  },

  // ── D) Banques / Financières ────────────────────────────────
  bank: {
    label:  'Banques / Financières — cas à part',
    source: 'IMPORTANT_INDICATORS_BY_SECTOR — Section D',
    warnings: [
      'Debt/EBITDA et Interest Coverage peu pertinents ici',
      'CFO/FCF moins "propre" pour les banques',
      'Utiliser P/B + ROE en combo principal',
    ],
    groups: {
      'Qualité des Actifs (priorité)': [
        { id:'npl',     n:'NPL Ratio',          formula:'Prêts non-performants / Total prêts', th:'<2% propre · 2–5% surveiller · >5% risque',        why:'% de prêts pourris (>90j retard) — risque de pertes' },
        { id:'cet1',    n:'CET1 Ratio',         formula:'Capital Tier 1 / Actifs pondérés',    th:'>12% solide · 8–12% OK · <8% fragile',             why:'Coussin de capital — solidité réglementaire de la banque' },
      ],
      'Valorisation Banque': [
        { id:'pb',      n:'P/B Ratio',          formula:'Price / Book (Equity)',               th:'<1 market pessimistic · 1-1.5 normal · >1.5 expensive',   why:'P/B<1 AND ROE>12% = potential opportunity' },
        { id:'roe',     n:'ROE',                formula:'Net Income / Equity',                 th:'>12% bon · <8% faible — COMBO avec P/B',           why:'Rentabilité des fonds propres — comparer avec P/B' },
      ],
      'Rentabilité Bancaire': [
        { id:'nim',     n:'NIM',                formula:'(Intérêts reçus − payés) / Actifs productifs', th:'>3% fort · 2–3% OK · <2% faible',   why:'Ce que la banque gagne sur ses intérêts nets' },
        { id:'costInc', n:'Cost-to-Income',     formula:'Coûts / Revenus',                     th:'<50% excellent · 50–60% OK · >65% inefficace',     why:'Efficacité opérationnelle de la banque' },
      ],
      'Liquidité Bancaire': [
        { id:'ltd',     n:'Loan-to-Deposit',    formula:'Prêts / Dépôts',                      th:'<80% très liquide · 80–100% normal · >100% risqué', why:'Si dépôts fuient, la banque a un problème de financement' },
      ],
    },
  },
}

// ─── Sector detection from Yahoo Finance sector string ───────
export function detectSectorType(sector: string, industry: string): SectorType {
  const s = sector.toLowerCase()
  const i = industry.toLowerCase()

  if (s.includes('financ') || s.includes('bank') || i.includes('bank')) return 'bank'

  if (
    s.includes('material') || s.includes('energy') ||
    i.includes('steel') || i.includes('mining') || i.includes('chemical') ||
    i.includes('auto') || i.includes('shipping') || i.includes('airline')
  ) return 'cyclical'

  if (
    s.includes('technology') || i.includes('software') || i.includes('semiconductor') ||
    i.includes('biotech') || i.includes('genomic') || i.includes('quantum') ||
    i.includes('artificial intelligence') || i.includes('saas') || i.includes('cloud')
  ) return 'tech'

  return 'normal'
}

// ─── Signal computation (Analyse_Fondamental.txt thresholds) ─
export function getDocSignal(id: string, val: number | null | undefined): Signal {
  const gray: Signal = { color: 'gray', label: '— N/A', css: 'text-tv-faint' }
  if (val == null || isNaN(val)) return gray

  const rules: Record<string, (v: number) => Signal> = {
    dEbitda: v =>
      v < 2   ? { color:'green',  label:`▲ Strong (${v.toFixed(1)}x)`,  css:'text-tv-green'  }
    : v < 3   ? { color:'green',  label:`▲ Good (${v.toFixed(1)}x)`,        css:'text-tv-green'  }
    : v < 4   ? { color:'yellow', label:`▲ Attention (${v.toFixed(1)}x)`,   css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Danger (${v.toFixed(1)}x)`,      css:'text-tv-red'    },

    intCov: v =>
      v > 5   ? { color:'green',  label:`▲ Strong (${v.toFixed(1)}x)`,      css:'text-tv-green'  }
    : v > 2   ? { color:'yellow', label:`▲ Moyen (${v.toFixed(1)}x)`,       css:'text-tv-orange' }
    : v > 1   ? { color:'red',    label:`▼ Risky (${v.toFixed(1)}x)`,      css:'text-tv-red'    }
    :           { color:'red',    label:`🚨 ALARME (${v.toFixed(1)}x)`,      css:'text-tv-red'    },

    fcfYld: v =>
      v > 8   ? { color:'green',  label:`▲ Undervalued (${v.toFixed(1)}%)`, css:'text-tv-green'  }
    : v > 5   ? { color:'green',  label:`▲ Fair (${v.toFixed(1)}%)`,       css:'text-tv-green'  }
    : v > 3   ? { color:'yellow', label:`▲ Correct (${v.toFixed(1)}%)`,       css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Expensive (${v.toFixed(1)}%)`,          css:'text-tv-red'    },

    roic: v =>
      v > 15  ? { color:'green',  label:`▲ Strong (${v.toFixed(1)}%)`,  css:'text-tv-green'  }
    : v > 10  ? { color:'green',  label:`▲ Good (${v.toFixed(1)}%)`,        css:'text-tv-green'  }
    : v > 8   ? { color:'yellow', label:`▲ Moyen (${v.toFixed(1)}%)`,       css:'text-tv-orange' }
    : v > 5   ? { color:'yellow', label:`▲ Faible (${v.toFixed(1)}%)`,      css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Très faible (${v.toFixed(1)}%)`, css:'text-tv-red'    },

    opMgn: v =>
      v > 20  ? { color:'green',  label:`▲ Strong (${v.toFixed(1)}%)`,  css:'text-tv-green'  }
    : v > 10  ? { color:'green',  label:`▲ Good (${v.toFixed(1)}%)`,        css:'text-tv-green'  }
    : v > 5   ? { color:'yellow', label:`▲ Moyen (${v.toFixed(1)}%)`,       css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Weak (${v.toFixed(1)}%)`,      css:'text-tv-red'    },

    netMgn: v =>
      v > 15  ? { color:'green',  label:`▲ Strong (${v.toFixed(1)}%)`,  css:'text-tv-green'  }
    : v > 8   ? { color:'green',  label:`▲ Good (${v.toFixed(1)}%)`,        css:'text-tv-green'  }
    : v > 5   ? { color:'yellow', label:`▲ Moyen (${v.toFixed(1)}%)`,       css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Fragile (${v.toFixed(1)}%)`,     css:'text-tv-red'    },

    roe: v =>
      v > 15  ? { color:'green',  label:`▲ Good (${v.toFixed(1)}%)`,         css:'text-tv-green'  }
    : v > 10  ? { color:'yellow', label:`▲ Moyen (${v.toFixed(1)}%)`,       css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Weak (${v.toFixed(1)}%)`,      css:'text-tv-red'    },

    de: v =>
      v < 0.5 ? { color:'green',  label:`▲ Weak (${v.toFixed(2)})`,       css:'text-tv-green'  }
    : v < 1   ? { color:'yellow', label:`▲ Normal (${v.toFixed(2)})`,       css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Endetté (${v.toFixed(2)})`,      css:'text-tv-red'    },

    evEbitda: v =>
      v < 8   ? { color:'green',  label:`▲ Pas cher (${v.toFixed(1)}x)`,   css:'text-tv-green'  }
    : v < 12  ? { color:'yellow', label:`▲ Normal (${v.toFixed(1)}x)`,     css:'text-tv-orange' }
    : v < 15  ? { color:'yellow', label:`▲ Cher (${v.toFixed(1)}x)`,       css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Très cher (${v.toFixed(1)}x)`,  css:'text-tv-red'    },

    nim: v =>
      v > 3   ? { color:'green',  label:`▲ Strong (${v.toFixed(1)}%)`,        css:'text-tv-green'  }
    : v > 2   ? { color:'yellow', label:`▲ OK (${v.toFixed(1)}%)`,         css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Weak (${v.toFixed(1)}%)`,      css:'text-tv-red'    },

    npl: v =>
      v < 2   ? { color:'green',  label:`▲ Propre (${v.toFixed(1)}%)`,      css:'text-tv-green'  }
    : v < 5   ? { color:'yellow', label:`▲ Surveiller (${v.toFixed(1)}%)`, css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Risque (${v.toFixed(1)}%)`,      css:'text-tv-red'    },

    gMgn: v =>
      v > 60  ? { color:'green',  label:`▲ Strong (${v.toFixed(1)}%)`,        css:'text-tv-green'  }
    : v > 40  ? { color:'green',  label:`▲ Good (${v.toFixed(1)}%)`,        css:'text-tv-green'  }
    : v > 20  ? { color:'yellow', label:`▲ Moyen (${v.toFixed(1)}%)`,       css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Weak (${v.toFixed(1)}%)`,      css:'text-tv-red'    },

    beta: v =>
      v < 0.8 ? { color:'green',  label:`▲ Défensif (β${v.toFixed(2)})`,   css:'text-tv-green'  }
    : v < 1.3 ? { color:'yellow', label:`▲ Marché (β${v.toFixed(2)})`,     css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Très volatile (β${v.toFixed(2)})`, css:'text-tv-red'  },

    pb: v =>
      v < 1   ? { color:'green',  label:`▲ Sous book (${v.toFixed(2)}x)`,  css:'text-tv-green'  }
    : v < 1.5 ? { color:'yellow', label:`▲ Normal (${v.toFixed(2)}x)`,     css:'text-tv-orange' }
    :           { color:'red',    label:`▼ Expensive (${v.toFixed(2)}x)`,       css:'text-tv-red'    },
  }

  const fn = rules[id]
  return fn ? fn(val) : { color:'gray', label:`${val}`, css:'text-tv-dim' }
}

// ─── Runtime config — thresholds used across components ──────
export const CFG = {
  risk_weights: { volatileity:.25, macro:.25, financial:.20, valuation:.15, liquidity:.15 },
  th: {
    us10y_comfort:3.80, us10y_friction:4.20, us10y_danger:4.30,
    vix_calm:18, vix_stress:20, vix_panic:30,
    hyg_lqd_alert:0.02,
    oas_healthy:4.0, oas_stress:5.0,
    debt_ebitda_good:2, debt_ebitda_warn:3, debt_ebitda_danger:4,
    int_cov_solid:5, int_cov_med:2, int_cov_alarm:1,
    fcf_yield_under:8, fcf_yield_fair:5, fcf_yield_exp:3,
    roic_exc:15, roic_good:10, roic_avg:8,
    ev_cheap:8, ev_fair:12, ev_exp:15,
    op_margin_exc:20, op_margin_good:10,
    net_margin_exc:15, net_margin_good:8,
    rsp_spy_warn:.95, rsp_spy_danger:.90,
  }
} as const
