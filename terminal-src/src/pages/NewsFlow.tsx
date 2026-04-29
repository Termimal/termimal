// pages/NewsFlow.tsx — Terminal-grade market news with persistent archive
// Archive: every seen item is stored in localStorage under `news-archive`
// Filters: time window (Today/Week/Month/All), country, category, source, importance, symbol/keyword search
// Sort: newest / oldest / relevance
// Pagination: 30 items at a time with Load More
import { useState, useMemo, useEffect } from 'react'
import { Logo } from '@/components/common/Logo'
import { DataSource } from '@/components/common/DataSource'

const mono = "'SF Mono', Menlo, Consolas, monospace"
const DATA_MODE: 'MOCK' | 'LIVE' = 'MOCK'
const PAGE_SIZE = 30
const ARCHIVE_KEY = 'news-archive'

interface NewsItem {
  id: string; ts: string; title: string; provider: string; summary: string
  country: string; region: string; importance: 'high' | 'medium' | 'low'
  categories: string[]; symbols: string[]; url: string; isBreaking: boolean
}

const PROVIDERS = ['Reuters', 'Bloomberg', 'Dow Jones', 'FT', 'CNBC', 'WSJ', 'CoinDesk', 'AP']
const COUNTRIES = ['US', 'EU', 'GB', 'JP', 'CN', 'DE', 'FR', 'Global']
const CATEGORIES = ['Macro', 'Equities', 'Rates', 'FX', 'Commodities', 'Crypto', 'Earnings', 'Geopolitics']

function hoursAgo(h: number): string { return new Date(Date.now() - h * 3600000).toISOString() }
function daysAgo(d: number): string  { return hoursAgo(d * 24) }

// ─── Synthetic backlog generator ──────────────────────────────────
// When the user clicks "Load older stories" past the end of the real archive,
// we generate plausible historical entries on demand so the archive grows
// effectively without bound. Uses round-robin templates seeded from a stable
// base index so the same daysAgo offset always produces the same item.
const HEADLINE_TEMPLATES: { title: string; provider: string; summary: string; importance: NewsItem['importance']; country: string; region: string; categories: string[]; symbols: string[] }[] = [
  { title:'Fed officials signal patience on rate cuts amid sticky services inflation', provider:'Reuters',  summary:'Multiple regional Fed presidents emphasized data-dependent path. Markets price in fewer cuts than year-start.', importance:'high',   country:'US',     region:'Americas', categories:['Macro','Rates'],     symbols:['SPY','TLT','DXY'] },
  { title:'ECB cuts deposit rate 25bp to 3.50%, signals data-dependent path', provider:'Bloomberg',         summary:'Lagarde says no pre-commitment to specific rate path. Inflation projections revised down.',                                  importance:'high',   country:'EU',     region:'Europe',   categories:['Macro','Rates'],     symbols:['FEZ','EUR'] },
  { title:'BoJ holds rates as wage growth slows, weakens yen', provider:'Reuters',                                summary:'Ueda press conference cautious on tightening pace. JPY weakens 0.8%.',                                                            importance:'medium', country:'JP',     region:'Asia',     categories:['Macro','Rates','FX'], symbols:['EWJ','USDJPY'] },
  { title:'China PMI manufacturing slips below 50, stimulus expectations rise', provider:'FT',                    summary:'Caixin manufacturing PMI at 49.3. Calls for additional fiscal support intensify.',                                            importance:'medium', country:'CN',     region:'Asia',     categories:['Macro'],             symbols:['FXI','KWEB','ASHR'] },
  { title:'OPEC+ extends production cuts through end of year', provider:'Bloomberg',                              summary:'Saudi Arabia and Russia confirm voluntary cuts of 2.2M bpd extended. Brent crude rallies.',                                   importance:'high',   country:'Global', region:'Global',   categories:['Commodities'],       symbols:['XOM','CVX','USO'] },
  { title:'NVIDIA reports record data-center revenue, H100 demand exceeds supply', provider:'CNBC',                summary:'NVDA quarterly revenue beats by 4%. Hopper architecture sees record bookings into next year.',                              importance:'high',   country:'US',     region:'Americas', categories:['Earnings','Equities'], symbols:['NVDA','SMH','SOXX'] },
  { title:'JPMorgan Q3 earnings beat on rates tailwind, NII guidance raised', provider:'Reuters',                  summary:'JPM Q3 EPS $4.85 vs $4.20 expected. Net interest income guide raised.',                                                        importance:'high',   country:'US',     region:'Americas', categories:['Earnings','Equities'], symbols:['JPM','BAC','C'] },
  { title:'Apple iPhone shipments decline 8% in greater China, services strong', provider:'WSJ',                  summary:'AAPL Q4 China revenue down YoY for 4th consecutive quarter. Services revenue at record.',                                     importance:'medium', country:'US',     region:'Americas', categories:['Earnings','Equities'], symbols:['AAPL','BABA'] },
  { title:'US 10Y Treasury yield breaks above 4.5% on hot CPI print', provider:'Bloomberg',                       summary:'Yields surge 12bp on stronger-than-expected core CPI. Yield curve steepens.',                                                  importance:'high',   country:'US',     region:'Americas', categories:['Rates','Macro'],     symbols:['TLT','TBT','SPY'] },
  { title:'Bitcoin tops $70K on spot ETF inflow surge', provider:'CoinDesk',                                       summary:'BTC-USD breaks resistance with $1.5B in single-day spot ETF inflows. IBIT, FBTC lead.',                                       importance:'medium', country:'Global', region:'Global',   categories:['Crypto'],            symbols:['BTC-USD','COIN','MSTR'] },
  { title:'Tesla Q4 deliveries miss forecast, demand softness in Europe', provider:'CNBC',                        summary:'TSLA Q4 deliveries down vs guidance. Berlin plant utilization below 70%.',                                                       importance:'high',   country:'US',     region:'Americas', categories:['Earnings','Equities'], symbols:['TSLA','RIVN','LCID'] },
  { title:'Microsoft Azure cloud revenue grows 30%, AI services drive expansion', provider:'Reuters',              summary:'MSFT Azure +30% YoY beats Wall Street estimates. Copilot Enterprise reaches 100K customers.',                                  importance:'high',   country:'US',     region:'Americas', categories:['Earnings','Equities'], symbols:['MSFT','GOOGL','AMZN'] },
]
function generateHistoricalBatch(daysBackStart: number, count: number): NewsItem[] {
  const out: NewsItem[] = []
  for (let i = 0; i < count; i++) {
    const tpl = HEADLINE_TEMPLATES[(daysBackStart + i) % HEADLINE_TEMPLATES.length]
    const dayOffset = daysBackStart + i * 3.7  // spread one entry every ~4 days
    out.push({
      id: `synth-${Math.round(dayOffset * 10)}`,                  // stable id based on offset
      ts: daysAgo(dayOffset),
      title: tpl.title,
      provider: tpl.provider,
      summary: tpl.summary,
      country: tpl.country,
      region: tpl.region,
      importance: tpl.importance,
      categories: tpl.categories,
      symbols: tpl.symbols,
      url: 'https://example.com',
      isBreaking: false,
    })
  }
  return out
}

// ─── Extended historical archive ───────────────────────────────
// In live mode replace this with /api/news fetch. Maintains ~60 items spanning ~3 months.
const MOCK_NEWS: NewsItem[] = [
  // Fresh — last 24h
  { id:'n1',  ts:hoursAgo(0.2), title:'Fed officials signal potential rate cut timeline shift amid persistent inflation data', provider:'Reuters',   summary:'Several Federal Reserve officials indicated they may need to delay expected rate cuts as recent inflation readings continue to exceed targets. The PCE deflator rose 0.4% month-over-month, above the 0.3% consensus. Markets repriced June cut probability from 68% to 52%.', country:'US', region:'Americas', importance:'high', categories:['Macro','Rates'], symbols:['SPY','TLT','DXY'], url:'https://reuters.com', isBreaking:true },
  { id:'n2',  ts:hoursAgo(0.5), title:'NVIDIA beats Q4 estimates, data center revenue surges 400% YoY', provider:'Bloomberg', summary:'NVIDIA reported Q4 revenue of $22.1B vs $20.4B expected. Data center segment reached $18.4B. Company guides Q1 revenue of $24B, above Street estimates of $21.9B. Stock up 8% after hours.', country:'US', region:'Americas', importance:'high', categories:['Earnings','Equities'], symbols:['NVDA','AMD','AVGO'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n3',  ts:hoursAgo(1),   title:'ECB Lagarde: disinflation process well on track, but risks remain', provider:'Reuters', summary:'ECB President Christine Lagarde reiterated that the disinflation process in the eurozone is proceeding as expected but cautioned against premature rate cuts given wage growth dynamics and services inflation stickiness.', country:'EU', region:'Europe', importance:'high', categories:['Macro','Rates','FX'], symbols:['EURUSD','EWQ'], url:'https://reuters.com', isBreaking:false },
  { id:'n4',  ts:hoursAgo(1.5), title:'China manufacturing PMI contracts for 5th consecutive month', provider:'Bloomberg', summary:'Chinas official manufacturing PMI fell to 49.1 in February from 49.2, marking the fifth straight month of contraction. Non-manufacturing PMI improved slightly to 51.4.', country:'CN', region:'Asia', importance:'high', categories:['Macro','Equities'], symbols:['FXI','BABA','KWEB'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n5',  ts:hoursAgo(2),   title:'Bitcoin surges past $68,000 as spot ETF inflows accelerate', provider:'CoinDesk', summary:'Bitcoin reached $68,400, driven by record daily inflows of $673M into spot Bitcoin ETFs. BlackRocks IBIT alone attracted $520M. Total spot ETF AUM now exceeds $50B.', country:'Global', region:'Global', importance:'medium', categories:['Crypto'], symbols:['BTC-USD','IBIT','MSTR'], url:'https://coindesk.com', isBreaking:false },
  { id:'n6',  ts:hoursAgo(2.5), title:'US 10-year yield climbs to 4.35% after strong jobs data', provider:'Dow Jones', summary:'The benchmark 10-year Treasury yield rose 8bp to 4.35% following nonfarm payrolls of 275K vs 198K expected. 2-year at 4.72%.', country:'US', region:'Americas', importance:'medium', categories:['Rates','Macro'], symbols:['TLT','IEF'], url:'https://wsj.com', isBreaking:false },
  { id:'n7',  ts:hoursAgo(3),   title:'WTI crude drops 2.3% on unexpected US inventory build', provider:'Reuters', summary:'WTI fell $1.80 to $76.20/bbl after EIA reported 4.2M barrel inventory increase vs expected 1.5M draw.', country:'US', region:'Americas', importance:'medium', categories:['Commodities'], symbols:['CL=F','USO','XLE'], url:'https://reuters.com', isBreaking:false },
  { id:'n8',  ts:hoursAgo(4),   title:'JPMorgan raises S&P 500 year-end target to 5,400', provider:'CNBC', summary:'JPMorgan chief equity strategist raised year-end target from 4,800 to 5,400, citing stronger earnings growth and resilient consumer.', country:'US', region:'Americas', importance:'low', categories:['Equities'], symbols:['SPY','JPM'], url:'https://cnbc.com', isBreaking:false },
  { id:'n9',  ts:hoursAgo(5),   title:'UK GDP flat in Q4, avoids technical recession', provider:'FT', summary:'UK economy showed zero growth in Q4 after -0.1% in Q3. Services offset manufacturing weakness.', country:'GB', region:'Europe', importance:'medium', categories:['Macro'], symbols:['EWU','GBPUSD'], url:'https://ft.com', isBreaking:false },
  { id:'n10', ts:hoursAgo(6),   title:'Apple announces $110B share buyback program, largest in history', provider:'Bloomberg', summary:'Apple announced record $110B buyback plus 4% dividend increase. iPhone revenue $46.0B vs $45.4B expected.', country:'US', region:'Americas', importance:'medium', categories:['Equities','Earnings'], symbols:['AAPL'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n11', ts:hoursAgo(8),   title:'Gold reaches new ATH at $2,195 amid central bank buying', provider:'Reuters', summary:'Spot gold surged to $2,195/oz on central bank purchases from China and India plus Fed cut expectations.', country:'Global', region:'Global', importance:'medium', categories:['Commodities'], symbols:['GC=F','GLD','NEM'], url:'https://reuters.com', isBreaking:false },
  { id:'n12', ts:hoursAgo(10),  title:'Japan exits negative interest rates for first time since 2016', provider:'Bloomberg', summary:'BOJ raised rate to 0-0.1% from -0.1%, ending 8 years of NIRP. Yen +0.8% vs USD.', country:'JP', region:'Asia', importance:'high', categories:['Macro','Rates','FX'], symbols:['USDJPY','EWJ'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n13', ts:hoursAgo(12),  title:'Tesla Cybertruck recall affects 3,878 vehicles over accelerator pedal', provider:'CNBC', summary:'Voluntary recall for accelerator pedal issue. Deliveries temporarily paused.', country:'US', region:'Americas', importance:'low', categories:['Equities'], symbols:['TSLA'], url:'https://cnbc.com', isBreaking:false },
  { id:'n14', ts:hoursAgo(14),  title:'German industrial orders fall 11.3% MoM, worst since pandemic', provider:'Reuters', summary:'Factory orders plunged 11.3% vs -6.0% expected. Transport equipment orders collapsed.', country:'DE', region:'Europe', importance:'medium', categories:['Macro'], symbols:['EWG'], url:'https://reuters.com', isBreaking:false },
  { id:'n15', ts:hoursAgo(16),  title:'Meta unveils Llama 3, claims performance parity with GPT-4', provider:'Bloomberg', summary:'Open-source LLM with 8B and 70B params. Competitive on standard benchmarks.', country:'US', region:'Americas', importance:'low', categories:['Equities'], symbols:['META'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n16', ts:hoursAgo(20),  title:'OPEC+ extends production cuts through Q2 amid demand uncertainty', provider:'Dow Jones', summary:'Voluntary cuts of 2.2M bpd extended. Global demand growth and US shale output cited as concerns.', country:'Global', region:'Global', importance:'high', categories:['Commodities','Geopolitics'], symbols:['CL=F','XLE'], url:'https://wsj.com', isBreaking:false },
  { id:'n17', ts:hoursAgo(22),  title:'US-China trade tensions escalate with new semiconductor export controls', provider:'FT', summary:'Commerce Dept expanded chip equipment export restrictions. Advanced litho and EUV targeted.', country:'US', region:'Global', importance:'high', categories:['Geopolitics','Equities'], symbols:['ASML','LRCX','AMAT'], url:'https://ft.com', isBreaking:false },

  // This week — days 1-7
  { id:'n18', ts:daysAgo(2),    title:'Dollar index retreats to 103.2 as rate cut bets increase', provider:'Reuters', summary:'DXY -0.4% on higher June cut probability after soft ISM services.', country:'US', region:'Americas', importance:'low', categories:['FX','Macro'], symbols:['DXY','UUP'], url:'https://reuters.com', isBreaking:false },
  { id:'n19', ts:daysAgo(2.2),  title:'Swiss National Bank surprises with 25bp cut to 1.50%', provider:'Bloomberg', summary:'First major CB to cut in 2024. CHF -0.6% vs USD.', country:'EU', region:'Europe', importance:'medium', categories:['Macro','Rates','FX'], symbols:['CHFUSD'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n20', ts:daysAgo(2.5),  title:'Copper hits 14-month high on supply disruption fears', provider:'Reuters', summary:'LME copper $9,100/ton on Panama/Chile disruptions and China stimulus optimism.', country:'Global', region:'Global', importance:'low', categories:['Commodities'], symbols:['HG=F','FCX'], url:'https://reuters.com', isBreaking:false },
  { id:'n21', ts:daysAgo(3),    title:'Broadcom reports $12B AI revenue run rate, shares jump 6%', provider:'Bloomberg', summary:'AVGO Q1 AI networking revenue tripled YoY. Raises full-year AI guidance to $10B+.', country:'US', region:'Americas', importance:'medium', categories:['Earnings','Equities'], symbols:['AVGO','NVDA'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n22', ts:daysAgo(3.3),  title:'Eurozone retail sales beat forecasts with +0.5% MoM', provider:'Reuters', summary:'January retail sales rose 0.5% vs 0.2% expected. Germany +0.4%, France +0.3%.', country:'EU', region:'Europe', importance:'low', categories:['Macro'], symbols:['EZU','FEZ'], url:'https://reuters.com', isBreaking:false },
  { id:'n23', ts:daysAgo(4),    title:'Berkshire Hathaway cash pile reaches record $168B', provider:'WSJ', summary:'Buffett defensive positioning continues. Apple stake remains top holding but trimmed.', country:'US', region:'Americas', importance:'medium', categories:['Equities'], symbols:['BRK-B','AAPL'], url:'https://wsj.com', isBreaking:false },
  { id:'n24', ts:daysAgo(4.5),  title:'UK CPI drops to 3.4%, lowest since September 2021', provider:'FT', summary:'Headline inflation 3.4% vs 3.5% expected. Services inflation sticky at 6.1%. BoE cut bets increase.', country:'GB', region:'Europe', importance:'high', categories:['Macro','Rates'], symbols:['EWU','GBPUSD'], url:'https://ft.com', isBreaking:false },
  { id:'n25', ts:daysAgo(5),    title:'Costco membership fees rise first time in 7 years', provider:'CNBC', summary:'Gold Star membership +$5 to $65. Executive +$10 to $130. Raises $0.15B annual revenue.', country:'US', region:'Americas', importance:'low', categories:['Equities'], symbols:['COST'], url:'https://cnbc.com', isBreaking:false },
  { id:'n26', ts:daysAgo(5.5),  title:'South Korea semiconductor exports jump 45% in March', provider:'Reuters', summary:'Memory chip prices recovery drives Samsung and SK Hynix export surge. DRAM +20% QoQ.', country:'JP', region:'Asia', importance:'medium', categories:['Macro','Equities'], symbols:['SMH','SOXX'], url:'https://reuters.com', isBreaking:false },
  { id:'n27', ts:daysAgo(6),    title:'Disney proxy battle: Iger defeats Peltz bid for board seats', provider:'Bloomberg', summary:'Shareholders reject Trian Partners slate. Iger pledges acceleration of streaming profitability.', country:'US', region:'Americas', importance:'medium', categories:['Equities'], symbols:['DIS'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n28', ts:daysAgo(6.5),  title:'Australia unemployment unexpectedly falls to 3.7%', provider:'Reuters', summary:'Jobs +116K vs +40K expected. RBA cut bets pushed to late 2024.', country:'Global', region:'Asia', importance:'medium', categories:['Macro','Rates'], symbols:['EWA','AUDUSD'], url:'https://reuters.com', isBreaking:false },
  { id:'n29', ts:daysAgo(7),    title:'Oracle Q3 cloud revenue up 25%, guides OCI growth above AWS', provider:'CNBC', summary:'ORCL Q3 cloud infrastructure +49%. Stock +12% after hours on AI demand commentary.', country:'US', region:'Americas', importance:'medium', categories:['Earnings','Equities'], symbols:['ORCL'], url:'https://cnbc.com', isBreaking:false },

  // This month — days 8-30
  { id:'n30', ts:daysAgo(9),    title:'Adobe beats on Firefly AI integration, boosts guidance', provider:'Bloomberg', summary:'ADBE Q1 rev $5.18B vs $5.14B expected. Generative AI driving Creative Cloud upgrades.', country:'US', region:'Americas', importance:'medium', categories:['Earnings','Equities'], symbols:['ADBE'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n31', ts:daysAgo(11),   title:'Germany 10Y bund yield tops 2.5% on inflation surprise', provider:'Reuters', summary:'German CPI +2.8% vs 2.7% expected. Bund yields push higher on ECB cut delay bets.', country:'DE', region:'Europe', importance:'medium', categories:['Rates','Macro'], symbols:['EWG'], url:'https://reuters.com', isBreaking:false },
  { id:'n32', ts:daysAgo(13),   title:'India Nifty 50 closes at record high on FII inflows', provider:'Reuters', summary:'Nifty 50 +0.7% to 22,493. Foreign institutional investors $2.1B net buyers in March.', country:'Global', region:'Asia', importance:'low', categories:['Equities'], symbols:['INDA'], url:'https://reuters.com', isBreaking:false },
  { id:'n33', ts:daysAgo(15),   title:'Salesforce CEO Benioff defends AI strategy vs Microsoft Copilot', provider:'CNBC', summary:'CRM Einstein 1 platform reaches 1M paid seats. Benioff calls Copilot "Clippy 2.0".', country:'US', region:'Americas', importance:'low', categories:['Equities'], symbols:['CRM','MSFT'], url:'https://cnbc.com', isBreaking:false },
  { id:'n34', ts:daysAgo(17),   title:'Mexico central bank cuts rates 25bp, first cut since 2020', provider:'Reuters', summary:'Banxico cut to 11.00% from 11.25%. Peso weakened 0.3% on dovish forward guidance.', country:'Global', region:'Americas', importance:'medium', categories:['Macro','Rates','FX'], symbols:['EWW','MXN'], url:'https://reuters.com', isBreaking:false },
  { id:'n35', ts:daysAgo(19),   title:'BHP bids $38.8B for Anglo American in biggest mining deal', provider:'FT', summary:'All-share offer represents 31% premium. Anglo board reviewing. Would create worlds largest copper miner.', country:'Global', region:'Global', importance:'high', categories:['Equities','Commodities'], symbols:['BHP','FCX'], url:'https://ft.com', isBreaking:false },
  { id:'n36', ts:daysAgo(22),   title:'Shanghai stocks rally 5% on China stimulus announcement', provider:'Bloomberg', summary:'CSI 300 jumps on PBOC rate cut + property easing package. Property index +12%.', country:'CN', region:'Asia', importance:'high', categories:['Macro','Equities'], symbols:['FXI','KWEB','ASHR'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n37', ts:daysAgo(24),   title:'US home sales drop 4.3% as mortgage rates hit 7.5%', provider:'WSJ', summary:'Existing home sales 4.19M annualized, lowest since 2010. 30Y fixed mortgage at 22-year high.', country:'US', region:'Americas', importance:'medium', categories:['Macro'], symbols:['XHB','ITB','KBH'], url:'https://wsj.com', isBreaking:false },
  { id:'n38', ts:daysAgo(26),   title:'Costco reports March same-store sales +9.8% YoY', provider:'CNBC', summary:'US comps +5.9%, international +17.2%. E-commerce +28.3%. Revenue $24.1B.', country:'US', region:'Americas', importance:'low', categories:['Equities','Earnings'], symbols:['COST'], url:'https://cnbc.com', isBreaking:false },
  { id:'n39', ts:daysAgo(29),   title:'Norway sovereign wealth fund tops $1.6T in assets', provider:'Reuters', summary:'Government Pension Fund Global gains 8.8% in Q1. Tech holdings drove returns.', country:'EU', region:'Europe', importance:'low', categories:['Equities'], symbols:['EWN'], url:'https://reuters.com', isBreaking:false },

  // Older — 1-3 months
  { id:'n40', ts:daysAgo(35),   title:'Fed minutes show broad agreement on holding rates into mid-year', provider:'Dow Jones', summary:'FOMC minutes reveal officials want more evidence of disinflation before cutting. "Not-at-all committee" consensus on H1 cuts.', country:'US', region:'Americas', importance:'high', categories:['Macro','Rates'], symbols:['SPY','TLT'], url:'https://wsj.com', isBreaking:false },
  { id:'n41', ts:daysAgo(38),   title:'Japan yen intervention: MOF intervenes at 160 USDJPY', provider:'Bloomberg', summary:'Ministry of Finance confirms currency intervention to defend yen. JPY +3% in minutes.', country:'JP', region:'Asia', importance:'high', categories:['FX','Macro'], symbols:['USDJPY','EWJ'], url:'https://bloomberg.com', isBreaking:true },
  { id:'n42', ts:daysAgo(42),   title:'Novo Nordisk Ozempic demand exceeds supply, expands capacity', provider:'Reuters', summary:'Weight-loss drug GLP-1 demand far outpaces production. $6B additional capex committed.', country:'EU', region:'Europe', importance:'medium', categories:['Equities','Earnings'], symbols:['NVO','LLY'], url:'https://reuters.com', isBreaking:false },
  { id:'n43', ts:daysAgo(47),   title:'Argentina inflation reaches 276% YoY, Milei austerity bites', provider:'FT', summary:'Monthly inflation eased to 11% from 25.5% in Dec. Peso stabilizing on fiscal surplus.', country:'Global', region:'Americas', importance:'low', categories:['Macro'], symbols:['ARGT'], url:'https://ft.com', isBreaking:false },
  { id:'n44', ts:daysAgo(52),   title:'TSMC Q4 revenue jumps 15%, Arizona plant production ramps', provider:'Bloomberg', summary:'TSM Q4 rev NT$625.5B. Arizona fab entering N4 high-volume production Q2 2024.', country:'Global', region:'Asia', importance:'high', categories:['Earnings','Equities','Geopolitics'], symbols:['TSM','NVDA','AMD'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n45', ts:daysAgo(58),   title:'Boeing 737 MAX crisis deepens with door plug incident', provider:'WSJ', summary:'Alaska Airlines door plug blowout triggers FAA inspection of 171 aircraft. CEO admits quality issues.', country:'US', region:'Americas', importance:'high', categories:['Equities'], symbols:['BA','ALK','UAL'], url:'https://wsj.com', isBreaking:false },
  { id:'n46', ts:daysAgo(62),   title:'Euro area GDP revised up to 0.3% in Q4, avoids stagnation', provider:'Reuters', summary:'Second estimate Q4 GDP +0.3% vs prelim flat. Germany revised to -0.2%, France +0.2%.', country:'EU', region:'Europe', importance:'medium', categories:['Macro'], symbols:['EZU','FEZ'], url:'https://reuters.com', isBreaking:false },
  { id:'n47', ts:daysAgo(68),   title:'Bitcoin halving completes, block reward drops to 3.125 BTC', provider:'CoinDesk', summary:'4th halving at block 840,000. Historical pattern suggests supply shock rally.', country:'Global', region:'Global', importance:'medium', categories:['Crypto'], symbols:['BTC-USD','MSTR','COIN'], url:'https://coindesk.com', isBreaking:false },
  { id:'n48', ts:daysAgo(73),   title:'OpenAI announces GPT-5 enterprise pricing, Microsoft integration', provider:'Bloomberg', summary:'OpenAI partnership deepens. GPT-5 Azure integration priced at $60/1M tokens output.', country:'US', region:'Americas', importance:'medium', categories:['Equities'], symbols:['MSFT','GOOGL'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n49', ts:daysAgo(80),   title:'LVMH Q1 sales beat on China luxury recovery', provider:'FT', summary:'LVMH organic sales +10%. Fashion & Leather +14%. Asia ex-Japan +12%.', country:'FR', region:'Europe', importance:'medium', categories:['Earnings','Equities'], symbols:['LVMHF','KER'], url:'https://ft.com', isBreaking:false },
  { id:'n50', ts:daysAgo(87),   title:'US CPI cools to 3.1% in January, below 3.2% forecast', provider:'Reuters', summary:'Core CPI +0.4% MoM, +3.9% YoY. Services ex-shelter still sticky at 0.5%.', country:'US', region:'Americas', importance:'high', categories:['Macro','Rates'], symbols:['SPY','TLT'], url:'https://reuters.com', isBreaking:false },

  // Older — 3-6 months back
  { id:'n51', ts:daysAgo(93),   title:'Fed holds rates unchanged at 5.25-5.50% for 4th consecutive meeting', provider:'Reuters', summary:'FOMC keeps benchmark rate at 22-year high. Powell presser cautious on timing of first cut.', country:'US', region:'Americas', importance:'high', categories:['Macro','Rates'], symbols:['SPY','TLT','DXY'], url:'https://reuters.com', isBreaking:false },
  { id:'n52', ts:daysAgo(98),   title:'Samsung Q4 profit beats estimates on memory chip rebound', provider:'Bloomberg', summary:'005930.KS operating profit 2.83T KRW vs 2.7T expected. DRAM prices +30% QoQ.', country:'Global', region:'Asia', importance:'medium', categories:['Earnings','Equities'], symbols:['SMH','SOXX'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n53', ts:daysAgo(104),  title:'Tesla misses Q4 delivery estimates, guides for slow growth 2024', provider:'CNBC', summary:'TSLA delivered 484K vs 491K expected. Stock -12% pre-market. Musk warns of "notably lower" growth.', country:'US', region:'Americas', importance:'high', categories:['Earnings','Equities'], symbols:['TSLA'], url:'https://cnbc.com', isBreaking:false },
  { id:'n54', ts:daysAgo(110),  title:'Red Sea shipping disruption spikes freight rates 300%', provider:'Bloomberg', summary:'Drewry composite index doubles. Houthi attacks force diversions via Cape of Good Hope.', country:'Global', region:'Global', importance:'high', categories:['Commodities','Geopolitics'], symbols:['ZIM','MATX'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n55', ts:daysAgo(115),  title:'SEC approves first spot Bitcoin ETFs after decade of rejections', provider:'CoinDesk', summary:'11 spot BTC ETFs approved simultaneously. IBIT, FBTC, BITB among launches. BTC +6%.', country:'US', region:'Americas', importance:'high', categories:['Crypto','Equities'], symbols:['BTC-USD','IBIT','FBTC','COIN'], url:'https://coindesk.com', isBreaking:true },
  { id:'n56', ts:daysAgo(121),  title:'China GDP grows 5.2% in 2023, meets government target', provider:'Reuters', summary:'Q4 +5.2% YoY. Full-year growth matches 5% official goal despite property drag.', country:'CN', region:'Asia', importance:'medium', categories:['Macro'], symbols:['FXI','KWEB'], url:'https://reuters.com', isBreaking:false },
  { id:'n57', ts:daysAgo(128),  title:'Netflix adds 13.1M subscribers in Q4, password crackdown lifts numbers', provider:'Bloomberg', summary:'NFLX Q4 adds biggest since 2020. Ad tier reaches 23M MAU. Stock +10% after hours.', country:'US', region:'Americas', importance:'medium', categories:['Earnings','Equities'], symbols:['NFLX'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n58', ts:daysAgo(135),  title:'ECB holds rates at 4.0%, signals data-dependent approach', provider:'Reuters', summary:'Lagarde says rate cut discussion premature. Inflation trajectory uncertain despite progress.', country:'EU', region:'Europe', importance:'medium', categories:['Macro','Rates'], symbols:['EZU','EURUSD'], url:'https://reuters.com', isBreaking:false },
  { id:'n59', ts:daysAgo(142),  title:'Microsoft surpasses Apple as most valuable company at $3T', provider:'WSJ', summary:'MSFT market cap briefly tops $3.06T vs AAPL $3.04T. AI Copilot momentum cited.', country:'US', region:'Americas', importance:'medium', categories:['Equities'], symbols:['MSFT','AAPL'], url:'https://wsj.com', isBreaking:false },
  { id:'n60', ts:daysAgo(150),  title:'Argentina Milei implements massive fiscal adjustment, peso devalued 50%', provider:'FT', summary:'Peso official rate from 366 to 800 per USD. Libertarian president enacts shock therapy.', country:'Global', region:'Americas', importance:'high', categories:['Macro','FX','Geopolitics'], symbols:['ARGT'], url:'https://ft.com', isBreaking:false },
  { id:'n61', ts:daysAgo(158),  title:'OPEC+ extends 2.2M bpd voluntary production cuts into Q1 2024', provider:'Reuters', summary:'Saudi-Russia led cuts extended despite demand concerns. Brent responds with +3%.', country:'Global', region:'Global', importance:'high', categories:['Commodities','Geopolitics'], symbols:['CL=F','XLE'], url:'https://reuters.com', isBreaking:false },
  { id:'n62', ts:daysAgo(165),  title:'Fed pivot: Powell signals cuts likely in 2024', provider:'Bloomberg', summary:'December FOMC dot plot shows 3 cuts in 2024. S&P 500 jumps to record. 10Y yield drops 20bp.', country:'US', region:'Americas', importance:'high', categories:['Macro','Rates'], symbols:['SPY','TLT'], url:'https://bloomberg.com', isBreaking:true },
  { id:'n63', ts:daysAgo(173),  title:'AMD Q4 AI chip revenue exceeds expectations, MI300 ramp strong', provider:'CNBC', summary:'AMD data center +38% YoY. MI300X GPU orders from Meta, Microsoft, Oracle.', country:'US', region:'Americas', importance:'medium', categories:['Earnings','Equities'], symbols:['AMD','NVDA'], url:'https://cnbc.com', isBreaking:false },
  { id:'n64', ts:daysAgo(181),  title:'Japan inflation hits 2.8% in November, still above BOJ target', provider:'Bloomberg', summary:'Core-core CPI +3.8% YoY. Yen strengthens on rate normalization speculation.', country:'JP', region:'Asia', importance:'medium', categories:['Macro','FX'], symbols:['USDJPY','EWJ'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n65', ts:daysAgo(188),  title:'UK enters technical recession with Q3 -0.1% GDP', provider:'FT', summary:'ONS confirms back-to-back negative quarters. Services sector contraction deepens.', country:'GB', region:'Europe', importance:'medium', categories:['Macro'], symbols:['EWU','GBPUSD'], url:'https://ft.com', isBreaking:false },
  { id:'n66', ts:daysAgo(196),  title:'Alphabet unveils Gemini AI model, largest multimodal LLM', provider:'Bloomberg', summary:'Gemini Ultra claims benchmark-beating performance. Integration across Google products.', country:'US', region:'Americas', importance:'medium', categories:['Equities'], symbols:['GOOGL','MSFT'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n67', ts:daysAgo(205),  title:'Disney cuts losses in streaming, Iger resets strategy', provider:'WSJ', summary:'Disney+ losses narrow to $387M from $1.47B. Core subscribers +7M in Q4.', country:'US', region:'Americas', importance:'medium', categories:['Earnings','Equities'], symbols:['DIS','NFLX'], url:'https://wsj.com', isBreaking:false },
  { id:'n68', ts:daysAgo(213),  title:'Copper futures hit 7-month high on China stimulus hopes', provider:'Reuters', summary:'LME copper $8,500/ton on infrastructure spending expectations. Inventory draws accelerate.', country:'Global', region:'Global', importance:'low', categories:['Commodities'], symbols:['HG=F','FCX'], url:'https://reuters.com', isBreaking:false },
  { id:'n69', ts:daysAgo(220),  title:'UBS Q4 loss of $785M on Credit Suisse integration costs', provider:'Bloomberg', summary:'Bank absorbs $2B in integration charges. Client inflows recover to +$22B in wealth.', country:'EU', region:'Europe', importance:'medium', categories:['Earnings','Equities'], symbols:['UBS'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n70', ts:daysAgo(228),  title:'Binance founder CZ resigns, pleads guilty to US charges', provider:'CoinDesk', summary:'Zhao agrees to $50M fine. Binance pays $4.3B settlement. Teng named new CEO.', country:'Global', region:'Global', importance:'high', categories:['Crypto','Geopolitics'], symbols:['BTC-USD','COIN'], url:'https://coindesk.com', isBreaking:false },
  { id:'n71', ts:daysAgo(237),  title:'OpenAI fires Sam Altman, reinstates after 5-day turmoil', provider:'WSJ', summary:'Board reversal. Microsoft-backed restructuring. Altman returns with new board.', country:'US', region:'Americas', importance:'high', categories:['Equities','Geopolitics'], symbols:['MSFT'], url:'https://wsj.com', isBreaking:false },
  { id:'n72', ts:daysAgo(244),  title:'NVIDIA beats earnings again, Q3 data center $14.5B', provider:'Bloomberg', summary:'NVDA Q3 rev $18.1B vs $16.1B expected. Q4 guides $20B. H100 demand still exceeds supply.', country:'US', region:'Americas', importance:'high', categories:['Earnings','Equities'], symbols:['NVDA'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n73', ts:daysAgo(252),  title:'US 10Y yield tops 5% for first time since 2007', provider:'Reuters', summary:'Benchmark yield breaks 5% on hot retail sales + Treasury supply concerns.', country:'US', region:'Americas', importance:'high', categories:['Rates','Macro'], symbols:['TLT','IEF'], url:'https://reuters.com', isBreaking:false },
  { id:'n74', ts:daysAgo(260),  title:'Israel-Hamas conflict rattles oil markets, Brent +8%', provider:'Bloomberg', summary:'Brent crude jumps to $92/bbl on Middle East escalation risk. Gold +3%.', country:'Global', region:'Global', importance:'high', categories:['Commodities','Geopolitics'], symbols:['CL=F','GC=F','XLE'], url:'https://bloomberg.com', isBreaking:true },
  { id:'n75', ts:daysAgo(270),  title:'UAW strike ends with record wage gains from Big Three automakers', provider:'FT', summary:'GM, Ford, Stellantis agree to 25% wage increases over 4.5 years. UAW membership votes approval.', country:'US', region:'Americas', importance:'medium', categories:['Equities','Macro'], symbols:['GM','F','STLA'], url:'https://ft.com', isBreaking:false },
  { id:'n76', ts:daysAgo(280),  title:'Saudi Arabia announces $40B tech fund, AI push accelerates', provider:'Reuters', summary:'PIF commits massive capital to compete with US/China in AI. Partnerships with Anthropic, Metro.', country:'Global', region:'Global', importance:'medium', categories:['Equities','Geopolitics'], symbols:['QQQ','SOXX'], url:'https://reuters.com', isBreaking:false },
  { id:'n77', ts:daysAgo(290),  title:'Evergrande liquidation ordered by Hong Kong court', provider:'Bloomberg', summary:'HKEX-listed unit faces winding up order. China property contagion fears resurface.', country:'CN', region:'Asia', importance:'high', categories:['Macro','Equities','Geopolitics'], symbols:['FXI','KWEB'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n78', ts:daysAgo(300),  title:'US jobs report: 199K added in November, unemployment 3.7%', provider:'Reuters', summary:'Nonfarm payrolls slightly above 185K consensus. Wage growth +4.0% YoY.', country:'US', region:'Americas', importance:'medium', categories:['Macro'], symbols:['SPY'], url:'https://reuters.com', isBreaking:false },
  { id:'n79', ts:daysAgo(310),  title:'Gold breaks all-time high above $2,100/oz on Fed pivot bets', provider:'Reuters', summary:'Spot gold reaches $2,135 intraday. ETF outflows reverse as rate cut bets rise.', country:'Global', region:'Global', importance:'medium', categories:['Commodities'], symbols:['GC=F','GLD'], url:'https://reuters.com', isBreaking:false },
  { id:'n80', ts:daysAgo(320),  title:'EU approves €807B defense spending plan amid Ukraine war', provider:'FT', summary:'Historic EU defense package supports Ukraine, rebuilds arsenals. Defense stocks rally.', country:'EU', region:'Europe', importance:'high', categories:['Geopolitics','Equities'], symbols:['ITA','EWG'], url:'https://ft.com', isBreaking:false },
  { id:'n81', ts:daysAgo(333),  title:'Block/Square shares plunge 20% on short-seller Hindenburg report', provider:'Bloomberg', summary:'Hindenburg alleges CashApp enabled fraud. SQ denies claims. Jack Dorsey responds.', country:'US', region:'Americas', importance:'medium', categories:['Equities'], symbols:['SQ'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n82', ts:daysAgo(345),  title:'Turkey central bank hikes rates 500bp to 35% fighting inflation', provider:'Reuters', summary:'CBRT continues tightening cycle. Lira stable after aggressive move. Inflation 61%.', country:'Global', region:'Europe', importance:'medium', categories:['Macro','Rates','FX'], symbols:['TUR','TRY'], url:'https://reuters.com', isBreaking:false },
  { id:'n83', ts:daysAgo(355),  title:'Microsoft closes Activision Blizzard acquisition for $68.7B', provider:'WSJ', summary:'Largest gaming deal in history. UK CMA approves after structural remedies. Gaming division revenue doubles.', country:'US', region:'Americas', importance:'high', categories:['Equities'], symbols:['MSFT'], url:'https://wsj.com', isBreaking:false },
  { id:'n84', ts:daysAgo(365),  title:'Google antitrust trial opens, DOJ alleges search monopoly abuse', provider:'Bloomberg', summary:'First major tech antitrust trial since Microsoft. Focus on default search deals with Apple.', country:'US', region:'Americas', importance:'medium', categories:['Geopolitics','Equities'], symbols:['GOOGL','AAPL'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n85', ts:daysAgo(378),  title:'Eurozone inflation cools to 2.4% in November, below 2.7% forecast', provider:'Reuters', summary:'HICP nears ECB 2% target. Services inflation still elevated at 4.0%.', country:'EU', region:'Europe', importance:'medium', categories:['Macro','Rates'], symbols:['EZU','EURUSD'], url:'https://reuters.com', isBreaking:false },
  { id:'n86', ts:daysAgo(392),  title:'BHP posts largest profit loss from nickel writedowns', provider:'FT', summary:'$3.5B impairment on Nickel West operations. Indonesian supply glut crashes prices 40%.', country:'Global', region:'Global', importance:'medium', categories:['Earnings','Commodities'], symbols:['BHP'], url:'https://ft.com', isBreaking:false },
  { id:'n87', ts:daysAgo(405),  title:'Apple Vision Pro launches to mixed reviews, $3500 price point', provider:'CNBC', summary:'AAPL spatial computing debut. Technical praise, content/app ecosystem concerns.', country:'US', region:'Americas', importance:'medium', categories:['Equities'], symbols:['AAPL'], url:'https://cnbc.com', isBreaking:false },
  { id:'n88', ts:daysAgo(420),  title:'US regional banks stress: NYCB shares plummet 60% on loan losses', provider:'Bloomberg', summary:'New York Community Bank cuts dividend 70%. Commercial real estate loan concerns reignite.', country:'US', region:'Americas', importance:'high', categories:['Equities'], symbols:['KRE','NYCB'], url:'https://bloomberg.com', isBreaking:true },
  { id:'n89', ts:daysAgo(440),  title:'Toyota dethrones VW as largest auto maker by global sales', provider:'Reuters', summary:'Toyota 11.2M vehicles vs VW 9.2M. Hybrid demand resilient. EV strategy gradual.', country:'JP', region:'Asia', importance:'low', categories:['Equities'], symbols:['TM','VWAGY'], url:'https://reuters.com', isBreaking:false },
  { id:'n90', ts:daysAgo(455),  title:'Global central banks end synchronized tightening, Australia holds', provider:'Bloomberg', summary:'RBA keeps rate at 4.35%. End of 13 hikes since 2022. Markets price cuts Q3.', country:'Global', region:'Asia', importance:'medium', categories:['Macro','Rates'], symbols:['AUDUSD','EWA'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n91', ts:daysAgo(475),  title:'Credit Suisse rescued by UBS in $3.2B emergency merger', provider:'FT', summary:'Swiss authorities orchestrate weekend deal. AT1 bondholders wiped out, shareholders diluted.', country:'EU', region:'Europe', importance:'high', categories:['Equities','Geopolitics'], symbols:['UBS','CS'], url:'https://ft.com', isBreaking:true },
  { id:'n92', ts:daysAgo(495),  title:'Nvidia surpasses $1 trillion market cap on AI chip demand', provider:'Bloomberg', summary:'NVDA becomes first semiconductor company in trillion club. H100 revenue trajectory unprecedented.', country:'US', region:'Americas', importance:'high', categories:['Equities'], symbols:['NVDA'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n93', ts:daysAgo(515),  title:'US debt ceiling raised, Biden-McCarthy deal averts default', provider:'WSJ', summary:'Bipartisan Budget Act suspends limit through 2025. Discretionary spending capped.', country:'US', region:'Americas', importance:'high', categories:['Macro','Geopolitics'], symbols:['SPY','TLT'], url:'https://wsj.com', isBreaking:false },
  { id:'n94', ts:daysAgo(540),  title:'Silicon Valley Bank collapses, FDIC takes over', provider:'Bloomberg', summary:'Second-largest US bank failure. $175B in deposits frozen. Regional bank rout follows.', country:'US', region:'Americas', importance:'high', categories:['Equities','Macro'], symbols:['KRE','XLF'], url:'https://bloomberg.com', isBreaking:true },
  { id:'n95', ts:daysAgo(565),  title:'ChatGPT launches enterprise tier, 1M+ business users', provider:'CNBC', summary:'OpenAI Enterprise customers include 92% of Fortune 100. Microsoft stakes benefit accelerate.', country:'US', region:'Americas', importance:'medium', categories:['Equities'], symbols:['MSFT','GOOGL'], url:'https://cnbc.com', isBreaking:false },
  { id:'n96', ts:daysAgo(590),  title:'OPEC+ surprise 1.6M bpd production cut, Brent jumps to $85', provider:'Reuters', summary:'Saudi unilateral cut of 1M bpd. US scolds but accepts. Inflation concerns reignite.', country:'Global', region:'Global', importance:'high', categories:['Commodities','Geopolitics'], symbols:['CL=F','XLE'], url:'https://reuters.com', isBreaking:false },
  { id:'n97', ts:daysAgo(615),  title:'US regional banks: First Republic taken over by JPMorgan', provider:'Bloomberg', summary:'FDIC auctions FRC to JPM. Third US bank failure in 2023. Contagion worry persists.', country:'US', region:'Americas', importance:'high', categories:['Equities'], symbols:['JPM','KRE'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n98', ts:daysAgo(640),  title:'China ends zero-COVID policy, stocks rally 40% from Oct lows', provider:'Bloomberg', summary:'Xi administration pivots after widespread protests. Travel restrictions scrapped.', country:'CN', region:'Asia', importance:'high', categories:['Macro','Equities'], symbols:['FXI','EWH'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n99', ts:daysAgo(670),  title:'FTX crypto exchange collapses, SBF arrested for fraud', provider:'CoinDesk', summary:'Sam Bankman-Fried extradited from Bahamas. $8B customer funds allegedly misappropriated.', country:'US', region:'Global', importance:'high', categories:['Crypto','Geopolitics'], symbols:['BTC-USD','COIN'], url:'https://coindesk.com', isBreaking:true },
  { id:'n100',ts:daysAgo(700),  title:'Twitter acquired by Elon Musk for $44B in contentious deal', provider:'WSJ', summary:'Musk takes Twitter private at $54.20/share. Mass layoffs, API changes, advertiser exodus follow.', country:'US', region:'Americas', importance:'high', categories:['Equities','Geopolitics'], symbols:['TSLA'], url:'https://wsj.com', isBreaking:false },
  { id:'n101',ts:daysAgo(735),  title:'UK mini-budget triggers gilt crisis, pound hits all-time low', provider:'FT', summary:'Truss-Kwarteng package spooks markets. BoE forced to intervene with £65B bond buying.', country:'GB', region:'Europe', importance:'high', categories:['Macro','Rates','FX'], symbols:['GBPUSD','EWU'], url:'https://ft.com', isBreaking:true },
  { id:'n102',ts:daysAgo(770),  title:'Fed 75bp hike, benchmark rate at 3.25%, fastest pace since 1980s', provider:'Reuters', summary:'Third consecutive jumbo hike. Powell warns of pain ahead. S&P -1.7%.', country:'US', region:'Americas', importance:'high', categories:['Macro','Rates'], symbols:['SPY','TLT'], url:'https://reuters.com', isBreaking:false },
  { id:'n103',ts:daysAgo(810),  title:'Russia invades Ukraine, markets crash, commodities spike', provider:'Bloomberg', summary:'Global markets plunge on invasion. Oil $130, wheat +40%. Russia SWIFT removal considered.', country:'Global', region:'Europe', importance:'high', categories:['Geopolitics','Commodities','FX'], symbols:['CL=F','GC=F','SPY'], url:'https://bloomberg.com', isBreaking:true },
  { id:'n104',ts:daysAgo(850),  title:'Meta shares crash 26% on first revenue decline since IPO', provider:'Bloomberg', summary:'META warns of $10B hit from iOS privacy. Reality Labs losses mount. Worst single-day drop.', country:'US', region:'Americas', importance:'high', categories:['Earnings','Equities'], symbols:['META'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n105',ts:daysAgo(900),  title:'S&P 500 enters bear market as Fed hawkish pivot accelerates', provider:'Reuters', summary:'Index -20% from January peak. Tech stocks bear brunt. QQQ -30% YTD.', country:'US', region:'Americas', importance:'high', categories:['Equities','Macro'], symbols:['SPY','QQQ'], url:'https://reuters.com', isBreaking:false },
  { id:'n106',ts:daysAgo(950),  title:'Supply chain crisis: global ports congested, shipping costs quadruple', provider:'FT', summary:'LA/Long Beach record backlog 70+ ships. Container rates Asia-US West $20K.', country:'Global', region:'Global', importance:'medium', categories:['Commodities','Macro'], symbols:['ZIM','FDX'], url:'https://ft.com', isBreaking:false },
  { id:'n107',ts:daysAgo(1000), title:'Evergrande defaults, China property crisis deepens', provider:'Bloomberg', summary:'Second-largest developer misses $83.5M coupon. $300B+ liabilities threaten sector contagion.', country:'CN', region:'Asia', importance:'high', categories:['Equities','Macro','Geopolitics'], symbols:['FXI','KWEB'], url:'https://bloomberg.com', isBreaking:false },
  { id:'n108',ts:daysAgo(1080), title:'Suez Canal blocked by Ever Given for 6 days, $9.6B/day trade halt', provider:'Reuters', summary:'Ultra-large container vessel lodged diagonally. Global supply chains disrupted.', country:'Global', region:'Global', importance:'medium', categories:['Commodities','Geopolitics'], symbols:['CL=F','ZIM'], url:'https://reuters.com', isBreaking:false },
  { id:'n109',ts:daysAgo(1200), title:'GameStop short squeeze: retail traders drive stock to $483', provider:'WSJ', summary:'WallStreetBets-driven rally. Melvin Capital loses billions. Robinhood halts buying.', country:'US', region:'Americas', importance:'high', categories:['Equities'], symbols:['HOOD','GME'], url:'https://wsj.com', isBreaking:false },
  { id:'n110',ts:daysAgo(1350), title:'COVID-19 vaccine approvals begin, markets surge on reopening hopes', provider:'Reuters', summary:'Pfizer-BioNTech first approval. Energy, airlines, small-caps lead rally. Tech lags.', country:'Global', region:'Global', importance:'high', categories:['Macro','Equities'], symbols:['PFE','SPY','XLE'], url:'https://reuters.com', isBreaking:false },
]

// ═══ Archive persistence ═══
function loadArchive(): NewsItem[] {
  try {
    const s = localStorage.getItem(ARCHIVE_KEY)
    return s ? JSON.parse(s) : []
  } catch { return [] }
}
function saveArchive(items: NewsItem[]) {
  try {
    // Keep latest 500 items to avoid unbounded growth
    const trimmed = items.slice(0, 500)
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(trimmed))
  } catch {}
}

// Merges incoming feed with existing archive (dedup by id, keeps most recent data)
function mergeIntoArchive(incoming: NewsItem[]): NewsItem[] {
  const existing = loadArchive()
  const byId = new Map<string, NewsItem>()
  // Archive first so new items take priority on conflict
  existing.forEach(n => byId.set(n.id, n))
  incoming.forEach(n => byId.set(n.id, n))
  const merged = Array.from(byId.values()).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
  saveArchive(merged)
  return merged
}

// ═══ Flags ═══
function Flag({ code }: { code: string }) {
  const w = 16, h = 11
  const flags: Record<string, JSX.Element> = {
    US: <svg width={w} height={h} viewBox="0 0 16 11"><rect width="16" height="11" fill="#fff"/><rect width="16" height=".85" fill="#B22234"/><rect y="1.69" width="16" height=".85" fill="#B22234"/><rect y="3.38" width="16" height=".85" fill="#B22234"/><rect y="5.08" width="16" height=".85" fill="#B22234"/><rect y="6.77" width="16" height=".85" fill="#B22234"/><rect y="8.46" width="16" height=".85" fill="#B22234"/><rect y="10.15" width="16" height=".85" fill="#B22234"/><rect width="6.4" height="5.92" fill="#3C3B6E"/></svg>,
    EU: <svg width={w} height={h} viewBox="0 0 16 11"><rect width="16" height="11" fill="#003399"/>{[0,1,2,3,4,5,6,7,8,9,10,11].map(i=><circle key={i} cx={8+3*Math.cos(i*Math.PI/6-Math.PI/2)} cy={5.5+3*Math.sin(i*Math.PI/6-Math.PI/2)} r=".5" fill="#FFCC00"/>)}</svg>,
    GB: <svg width={w} height={h} viewBox="0 0 16 11"><rect width="16" height="11" fill="#012169"/><path d="M0,0L16,11M16,0L0,11" stroke="#fff" strokeWidth="2"/><path d="M0,0L16,11M16,0L0,11" stroke="#C8102E" strokeWidth="1"/><path d="M8,0V11M0,5.5H16" stroke="#fff" strokeWidth="3"/><path d="M8,0V11M0,5.5H16" stroke="#C8102E" strokeWidth="1.8"/></svg>,
    JP: <svg width={w} height={h} viewBox="0 0 16 11"><rect width="16" height="11" fill="#fff"/><circle cx="8" cy="5.5" r="3.3" fill="#BC002D"/></svg>,
    CN: <svg width={w} height={h} viewBox="0 0 16 11"><rect width="16" height="11" fill="#DE2910"/><polygon points="3,1.5 3.5,3 5,3 3.8,3.8 4.2,5.3 3,4.2 1.8,5.3 2.2,3.8 1,3 2.5,3" fill="#FFDE00"/></svg>,
    DE: <svg width={w} height={h} viewBox="0 0 16 11"><rect width="16" height="3.67" fill="#000"/><rect y="3.67" width="16" height="3.67" fill="#DD0000"/><rect y="7.33" width="16" height="3.67" fill="#FFCE00"/></svg>,
    FR: <svg width={w} height={h} viewBox="0 0 16 11"><rect width="5.33" height="11" fill="#002395"/><rect x="5.33" width="5.34" height="11" fill="#fff"/><rect x="10.67" width="5.33" height="11" fill="#ED2939"/></svg>,
    Global: <svg width={w} height={h} viewBox="0 0 16 11"><rect width="16" height="11" fill="#1c2128" rx="1"/><circle cx="8" cy="5.5" r="4" fill="none" stroke="#484f58" strokeWidth=".7"/><ellipse cx="8" cy="5.5" rx="2" ry="4" fill="none" stroke="#484f58" strokeWidth=".5"/><line x1="4" y1="5.5" x2="12" y2="5.5" stroke="#484f58" strokeWidth=".4"/></svg>,
  }
  return <span style={{ display: 'inline-flex', opacity: 0.85, flexShrink: 0 }}>{flags[code] ?? flags.Global}</span>
}

function timeAgo(iso: string): string {
  const m = (Date.now() - new Date(iso).getTime()) / 60000
  if (m < 1) return 'now'; if (m < 60) return `${Math.floor(m)}m`; if (m < 1440) return `${Math.floor(m/60)}h`; return `${Math.floor(m/1440)}d`
}
function fmtTime(iso: string): string { return new Date(iso).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false}) }
function fmtDate(iso: string): string { return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}) }

const impCol = (l: string) => l === 'high' ? '#f85149' : l === 'medium' ? '#d29922' : '#30363d'

// ═══ Time window options ═══
const TIME_WINDOWS: { key: string; label: string; hours: number | null }[] = [
  { key: 'today', label: 'Today',      hours: 24 },
  { key: 'week',  label: 'This Week',  hours: 24 * 7 },
  { key: 'month', label: 'This Month', hours: 24 * 30 },
  { key: 'all',   label: 'All Time',   hours: null },
]

type SortMode = 'newest' | 'oldest' | 'relevance'

const PINNED_KEY = 'news-pinned'  // localStorage key for pinned story IDs

function loadPinnedIds(): Set<string> {
  try { const s = localStorage.getItem(PINNED_KEY); return s ? new Set(JSON.parse(s)) : new Set() } catch { return new Set() }
}
function savePinnedIds(ids: Set<string>) {
  try { localStorage.setItem(PINNED_KEY, JSON.stringify([...ids])) } catch {}
}

// ═══════════════════════════════════════════════════════════════════
export function NewsFlow() {
  const [search, setSearch] = useState('')
  const [countryF, setCountryF] = useState('All')
  const [catF, setCatF] = useState('All')
  const [provF, setProvF] = useState('All')
  const [impF, setImpF] = useState('All')
  const [timeF, setTimeF] = useState('all')  // default ALL TIME per spec
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [highOnly, setHighOnly] = useState(false)
  const [pinnedOnly, setPinnedOnly] = useState(false)  // toggle: show only pinned stories
  const [selected, setSelected] = useState<string | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => loadPinnedIds())
  const [page, setPage] = useState(1)  // pagination — PAGE_SIZE items per page
  const [archive, setArchive] = useState<NewsItem[]>([])

  // On mount: merge mock feed into archive, load full archive
  useEffect(() => {
    const merged = mergeIntoArchive(MOCK_NEWS)
    setArchive(merged)
  }, [])

  // Persist pinned IDs across reloads
  useEffect(() => { savePinnedIds(pinnedIds) }, [pinnedIds])

  // Reset pagination when filters change
  useEffect(() => { setPage(1) }, [search, countryF, catF, provF, impF, timeF, highOnly, sortMode, pinnedOnly])

  // Relevance score: higher = more relevant
  const relevance = (n: NewsItem): number => {
    let score = 0
    if (n.importance === 'high') score += 30; else if (n.importance === 'medium') score += 15
    if (n.isBreaking) score += 20
    // Recency decay: within 24h = full, decays to 0 at 30d
    const ageH = (Date.now() - new Date(n.ts).getTime()) / 3600000
    score += Math.max(0, 40 - ageH / 18)
    // Search match boost
    if (search) {
      const q = search.toLowerCase()
      if (n.title.toLowerCase().includes(q)) score += 25
      if (n.symbols.some(s => s.toLowerCase().includes(q))) score += 15
      if (n.provider.toLowerCase().includes(q)) score += 10
    }
    return score
  }

  const filtered = useMemo(() => {
    const window = TIME_WINDOWS.find(t => t.key === timeF)
    const cut = window?.hours ? Date.now() - window.hours * 3600000 : 0

    const matched = archive.filter(n => {
      if (search) {
        const q = search.toLowerCase()
        const hits = n.title.toLowerCase().includes(q)
                  || n.summary.toLowerCase().includes(q)
                  || n.symbols.some(s => s.toLowerCase().includes(q))
                  || n.provider.toLowerCase().includes(q)
        if (!hits) return false
      }
      if (countryF !== 'All' && n.country !== countryF) return false
      if (catF !== 'All' && !n.categories.includes(catF)) return false
      if (provF !== 'All' && n.provider !== provF) return false
      if (impF !== 'All' && n.importance !== impF.toLowerCase()) return false
      if (highOnly && n.importance !== 'high') return false
      if (pinnedOnly && !pinnedIds.has(n.id)) return false
      if (cut > 0 && new Date(n.ts).getTime() < cut) return false
      return true
    })

    // Sort
    return matched.sort((a, b) => {
      const ap = pinnedIds.has(a.id) ? 1 : 0, bp = pinnedIds.has(b.id) ? 1 : 0
      if (ap !== bp) return bp - ap
      if (sortMode === 'relevance') return relevance(b) - relevance(a)
      if (sortMode === 'oldest')    return new Date(a.ts).getTime() - new Date(b.ts).getTime()
      return new Date(b.ts).getTime() - new Date(a.ts).getTime()  // newest default
    })
  }, [archive, search, countryF, catF, provF, impF, timeF, highOnly, sortMode, pinnedIds, pinnedOnly])

  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page])
  const hasMore = visible.length < filtered.length

  const sel = selected ? archive.find(n => n.id === selected) : null
  const markRead = (id: string) => { setSelected(id); setReadIds(p => new Set(p).add(id)) }
  const togglePin = (id: string) => { setPinnedIds(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s }) }

  const clearArchive = () => {
    if (!confirm(`Clear all ${archive.length} archived stories? This cannot be undone.`)) return
    try { localStorage.removeItem(ARCHIVE_KEY) } catch {}
    setArchive(MOCK_NEWS.slice())
    mergeIntoArchive(MOCK_NEWS)
  }

  const Dd = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: '#0e1117', border: '1px solid #21262d', color: '#8b949e', fontSize: 9, padding: '3px 6px', outline: 'none' }}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ═══ FEED ═══ */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #21262d', background: '#0e1117' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9', letterSpacing: '0.02em' }}>NEWS FLOW</span>
            <span style={{ fontSize: 8, color: '#484f58', border: '1px solid #21262d', padding: '1px 5px' }}>{DATA_MODE === 'MOCK' ? 'SAMPLE DATA' : 'LIVE'}</span>
            <span style={{ fontSize: 9, color: '#30363d', fontFamily: mono }}>{filtered.length} / {archive.length} archived</span>
            <DataSource source={DATA_MODE === 'MOCK' ? 'Sample wire' : 'Reuters · Bloomberg · DJ'} updated={undefined} quality={DATA_MODE === 'MOCK' ? 'LOW' : 'HIGH'} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 8, color: '#484f58' }}>SORT:</span>
              {(['newest', 'oldest', 'relevance'] as SortMode[]).map(m => (
                <button key={m} onClick={() => setSortMode(m)}
                  style={{
                    fontSize: 8, padding: '2px 7px',
                    background: sortMode === m ? '#21262d' : 'transparent',
                    color: sortMode === m ? '#c9d1d9' : '#484f58',
                    border: '1px solid #21262d', cursor: 'pointer', letterSpacing: '0.03em',
                  }}>{m.toUpperCase()}</button>
              ))}
              <button onClick={() => setHighOnly(!highOnly)}
                style={{ fontSize: 8, padding: '2px 7px', background: highOnly ? '#f8514915' : 'transparent', color: highOnly ? '#f85149' : '#484f58', border: `1px solid ${highOnly ? '#f8514933' : '#21262d'}`, cursor: 'pointer', letterSpacing: '0.03em' }}>
                HIGH IMPACT
              </button>
              <button onClick={() => setPinnedOnly(!pinnedOnly)} title={`${pinnedIds.size} pinned ${pinnedIds.size === 1 ? 'story' : 'stories'}`}
                style={{ fontSize: 8, padding: '2px 7px', background: pinnedOnly ? '#d2992215' : 'transparent', color: pinnedOnly ? '#d29922' : '#484f58', border: `1px solid ${pinnedOnly ? '#d2992233' : '#21262d'}`, cursor: 'pointer', letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9 }}>{pinnedOnly ? '◆' : '◇'}</span>
                PINNED ONLY
                {pinnedIds.size > 0 && <span style={{ fontSize: 8, color: pinnedOnly ? '#d29922' : '#30363d', fontWeight: 600 }}>· {pinnedIds.size}</span>}
              </button>
              <button onClick={clearArchive} title="Clear local archive"
                style={{ fontSize: 8, padding: '2px 7px', background: 'transparent', color: '#484f58', border: '1px solid #21262d', cursor: 'pointer', letterSpacing: '0.03em' }}>
                CLEAR
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Keyword, symbol, source..."
              style={{ width: 200, fontSize: 9, padding: '3px 7px', background: '#0e1117', border: '1px solid #21262d', color: '#c9d1d9' }}/>
            <Dd value={countryF} onChange={setCountryF} options={['All', ...COUNTRIES]}/>
            <Dd value={catF}     onChange={setCatF}     options={['All', ...CATEGORIES]}/>
            <Dd value={provF}    onChange={setProvF}    options={['All', ...PROVIDERS]}/>
            <Dd value={impF}     onChange={setImpF}     options={['All', 'High', 'Medium', 'Low']}/>
            <div style={{ display: 'flex' }}>
              {TIME_WINDOWS.map((t, i, a) => (
                <button key={t.key} onClick={() => setTimeF(t.key)}
                  style={{
                    fontSize: 8, padding: '3px 8px',
                    color: timeF === t.key ? '#c9d1d9' : '#484f58',
                    background: timeF === t.key ? '#21262d' : 'transparent',
                    border: '1px solid #21262d',
                    borderRight: i < a.length - 1 ? 'none' : '1px solid #21262d',
                    cursor: 'pointer', letterSpacing: '0.03em',
                  }}>
                  {t.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#30363d', fontSize: 11 }}>
              {pinnedOnly && pinnedIds.size === 0
                ? 'No pinned stories yet — click the ◇ on any story to pin it'
                : pinnedOnly
                ? 'No pinned stories match these filters'
                : 'No stories matching filters'}
            </div>
          )}
          {visible.map(n => {
            const isSel = selected === n.id, isRead = readIds.has(n.id), isPinned = pinnedIds.has(n.id)
            return (
              <div key={n.id} onClick={() => markRead(n.id)}
                style={{ display: 'flex', alignItems: 'stretch', cursor: 'pointer', borderBottom: '1px solid #161b22', background: isSel ? '#161b22' : 'transparent', transition: 'background 0.05s' }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#0e1117' }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isSel ? '#161b22' : 'transparent' }}>
                <div style={{ width: 3, background: impCol(n.importance), flexShrink: 0 }}/>
                <div style={{ flex: 1, padding: '7px 10px 7px 8px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    {n.isBreaking && <span style={{ fontSize: 7, color: '#f85149', fontWeight: 600, border: '1px solid #f8514933', padding: '0 3px', letterSpacing: 0.4, lineHeight: '14px', flexShrink: 0 }}>BREAKING</span>}
                    {isPinned && <span style={{ fontSize: 8, color: '#d29922', flexShrink: 0 }}>&#9670;</span>}
                    <span style={{ fontSize: 11, fontWeight: isRead ? 400 : 600, color: isRead ? '#8b949e' : '#c9d1d9', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, color: '#30363d', fontFamily: mono, minWidth: 32 }}>{fmtTime(n.ts)}</span>
                    <span style={{ fontSize: 9, color: '#30363d' }}>{timeAgo(n.ts)}</span>
                    <Flag code={n.country}/>
                    <span style={{ fontSize: 8, color: '#484f58', fontWeight: 500 }}>{n.provider}</span>
                    <span style={{ width: 1, height: 8, background: '#21262d' }}/>
                    {n.symbols.slice(0, 2).map(s => (
                      <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8, color: '#388bfd', fontFamily: mono }}>
                        <span style={{ transform: 'scale(0.7)', transformOrigin: 'left center' }}><Logo sym={s}/></span>
                        {s}
                      </span>
                    ))}
                    {n.symbols.length > 2 && <span style={{ fontSize: 8, color: '#30363d' }}>+{n.symbols.length - 2}</span>}
                  </div>
                </div>
                <div onClick={e => { e.stopPropagation(); togglePin(n.id) }}
                  title={isPinned ? 'Unpin story' : 'Pin story'}
                  style={{ padding: '8px 8px', fontSize: 12, color: isPinned ? '#d29922' : '#484f58', cursor: 'pointer', flexShrink: 0, lineHeight: 1, userSelect: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.color = isPinned ? '#f0a93a' : '#d29922' }}
                  onMouseLeave={e => { e.currentTarget.style.color = isPinned ? '#d29922' : '#484f58' }}>
                  {isPinned ? '◆' : '◇'}
                </div>
              </div>
            )
          })}

          {/* Load more */}
          {hasMore && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <button onClick={() => setPage(p => p + 1)}
                style={{
                  fontSize: 10, padding: '6px 16px',
                  background: 'transparent', border: '1px solid #30363d',
                  color: '#8b949e', cursor: 'pointer', letterSpacing: '0.05em',
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#161b22'; e.currentTarget.style.color = '#c9d1d9' }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e' }}>
                Load more · {filtered.length - visible.length} remaining
              </button>
            </div>
          )}
          {!hasMore && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <button onClick={() => {
                  // Find the oldest entry's day-offset, generate 30 more historical items behind it
                  const oldest = archive.length ? archive.reduce((acc, n) => new Date(n.ts) < new Date(acc.ts) ? n : acc) : null
                  const oldestDays = oldest ? Math.floor((Date.now() - new Date(oldest.ts).getTime()) / 86400000) : 1400
                  const more = generateHistoricalBatch(oldestDays + 5, 30)
                  setArchive(prev => mergeIntoArchive([...prev, ...more]))
                }}
                style={{
                  fontSize: 10, padding: '6px 16px',
                  background: 'transparent', border: '1px solid #30363d',
                  color: '#8b949e', cursor: 'pointer', letterSpacing: '0.05em',
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#161b22'; e.currentTarget.style.color = '#c9d1d9' }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e' }}>
                Load older stories
              </button>
              <div style={{ marginTop: 6, fontSize: 8, color: '#484f58' }}>{visible.length} stories shown · {archive.length} in archive</div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ DETAIL PANEL ═══ */}
      {sel && (
        <div style={{ width: 440, borderLeft: '1px solid #21262d', background: '#0e1117', overflow: 'auto', padding: 16, flexShrink: 0 }}>
          <div onClick={() => setSelected(null)} style={{ fontSize: 9, color: '#484f58', cursor: 'pointer', marginBottom: 10 }}>&larr; CLOSE</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ width: 3, height: 14, background: impCol(sel.importance) }}/>
            <span style={{ fontSize: 8, color: impCol(sel.importance), fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{sel.importance}</span>
            <Flag code={sel.country}/>
            <span style={{ fontSize: 9, color: '#8b949e' }}>{sel.provider}</span>
            <span style={{ fontSize: 9, color: '#484f58', marginLeft: 'auto', fontFamily: mono }}>{fmtDate(sel.ts)}</span>
          </div>

          <div style={{ fontSize: 15, fontWeight: 500, color: '#c9d1d9', lineHeight: 1.35, marginBottom: 10 }}>{sel.title}</div>

          <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.7, marginBottom: 16 }}>{sel.summary}</div>

          {sel.symbols.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Related Symbols</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {sel.symbols.map(s => (
                  <span key={s} onClick={() => window.open(`/ticker/${s}`, '_self')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#388bfd', fontFamily: mono, padding: '3px 8px', border: '1px solid #21262d', background: '#0e1117', cursor: 'pointer' }}>
                    <Logo sym={s}/>{s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {sel.categories.map(c => (
              <span key={c} style={{ fontSize: 8, color: '#8b949e', background: '#21262d33', padding: '2px 6px', letterSpacing: 0.3 }}>{c}</span>
            ))}
          </div>

          <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid #21262d', display: 'flex', gap: 8 }}>
            <a href={sel.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 9, color: '#388bfd', textDecoration: 'none', padding: '4px 10px', border: '1px solid #388bfd44' }}>
              Open source →
            </a>
            <button onClick={() => togglePin(sel.id)}
              style={{ fontSize: 9, padding: '4px 10px', background: 'transparent', border: '1px solid #30363d', color: pinnedIds.has(sel.id) ? '#d29922' : '#8b949e', cursor: 'pointer' }}>
              {pinnedIds.has(sel.id) ? '◆ Pinned' : '◇ Pin'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
