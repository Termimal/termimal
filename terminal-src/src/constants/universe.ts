/**
 * Hand-curated list of tickers used by the search bar (desktop Navbar
 * and mobile search overlay). ~200 of the most liquid US-listed
 * stocks, ETFs, indices, crypto, forex pairs, and futures.
 *
 * The list is intentionally finite: a fully open search would need a
 * server-side index and add a network round-trip per keystroke. The
 * universe is small enough that an in-memory substring filter is
 * faster than any API call (sub-millisecond) and works offline.
 */

export interface Ticker {
  s: string         // symbol
  n: string         // long name
  t?: string        // type — Stock | ETF | Index | Crypto | Forex | Futures
  mc?: string       // optional market cap label
}

export const UNIVERSE: Ticker[] = [
  // Mega cap tech
  {s:'AAPL',n:'Apple Inc',mc:'$3.1T',t:'Stock'},{s:'MSFT',n:'Microsoft Corp',mc:'$3.1T',t:'Stock'},{s:'NVDA',n:'NVIDIA Corp',mc:'$2.9T',t:'Stock'},
  {s:'GOOGL',n:'Alphabet Inc',mc:'$2.1T',t:'Stock'},{s:'GOOG',n:'Alphabet Inc Class C',mc:'$2.1T',t:'Stock'},{s:'META',n:'Meta Platforms',mc:'$1.4T',t:'Stock'},
  {s:'AMZN',n:'Amazon.com',mc:'$2.1T',t:'Stock'},{s:'TSLA',n:'Tesla Inc',mc:'$800B',t:'Stock'},{s:'NFLX',n:'Netflix Inc',mc:'$380B',t:'Stock'},
  {s:'CRM',n:'Salesforce Inc',mc:'$280B',t:'Stock'},{s:'ADBE',n:'Adobe Inc',mc:'$250B',t:'Stock'},{s:'ORCL',n:'Oracle Corp',mc:'$380B',t:'Stock'},
  {s:'NOW',n:'ServiceNow Inc',mc:'$165B',t:'Stock'},{s:'IBM',n:'International Business Machines',mc:'$160B',t:'Stock'},{s:'CSCO',n:'Cisco Systems',mc:'$200B',t:'Stock'},
  // Software / cybersecurity
  {s:'PANW',n:'Palo Alto Networks',mc:'$115B',t:'Stock'},{s:'CRWD',n:'CrowdStrike Holdings',mc:'$90B',t:'Stock'},{s:'NET',n:'Cloudflare Inc',mc:'$30B',t:'Stock'},
  {s:'DDOG',n:'Datadog Inc',mc:'$42B',t:'Stock'},{s:'SNOW',n:'Snowflake Inc',mc:'$55B',t:'Stock'},{s:'SHOP',n:'Shopify Inc',mc:'$95B',t:'Stock'},
  {s:'PLTR',n:'Palantir Tech',mc:'$155B',t:'Stock'},{s:'ACN',n:'Accenture Plc',mc:'$220B',t:'Stock'},{s:'SAP',n:'SAP SE',mc:'$250B',t:'Stock'},
  // Semis
  {s:'AMD',n:'AMD Inc',mc:'$245B',t:'Stock'},{s:'INTC',n:'Intel Corp',mc:'$140B',t:'Stock'},{s:'AVGO',n:'Broadcom Inc',mc:'$800B',t:'Stock'},
  {s:'QCOM',n:'Qualcomm Inc',mc:'$200B',t:'Stock'},{s:'TSM',n:'Taiwan Semiconductor',mc:'$750B',t:'Stock'},{s:'MU',n:'Micron Technology',mc:'$120B',t:'Stock'},
  {s:'TXN',n:'Texas Instruments',mc:'$185B',t:'Stock'},{s:'ADI',n:'Analog Devices',mc:'$115B',t:'Stock'},{s:'KLAC',n:'KLA Corporation',mc:'$105B',t:'Stock'},
  {s:'CDNS',n:'Cadence Design Systems',mc:'$75B',t:'Stock'},{s:'SNPS',n:'Synopsys Inc',mc:'$88B',t:'Stock'},{s:'ASML',n:'ASML Holding',mc:'$360B',t:'Stock'},
  {s:'ARM',n:'ARM Holdings',mc:'$140B',t:'Stock'},{s:'SMCI',n:'Super Micro Computer',mc:'$28B',t:'Stock'},
  // Finance / Banks / Asset mgrs
  {s:'JPM',n:'JPMorgan Chase',mc:'$590B',t:'Stock'},{s:'BAC',n:'Bank of America',mc:'$310B',t:'Stock'},{s:'GS',n:'Goldman Sachs',mc:'$165B',t:'Stock'},
  {s:'MS',n:'Morgan Stanley',mc:'$200B',t:'Stock'},{s:'WFC',n:'Wells Fargo',mc:'$215B',t:'Stock'},{s:'C',n:'Citigroup Inc',mc:'$125B',t:'Stock'},
  {s:'BLK',n:'BlackRock Inc',mc:'$130B',t:'Stock'},{s:'BX',n:'Blackstone Inc',mc:'$170B',t:'Stock'},{s:'SCHW',n:'Charles Schwab',mc:'$145B',t:'Stock'},
  {s:'BRK-B',n:'Berkshire Hathaway',mc:'$900B',t:'Stock'},{s:'SPGI',n:'S&P Global',mc:'$160B',t:'Stock'},
  {s:'V',n:'Visa Inc',mc:'$580B',t:'Stock'},{s:'MA',n:'Mastercard Inc',mc:'$450B',t:'Stock'},{s:'PYPL',n:'PayPal Holdings',mc:'$78B',t:'Stock'},
  {s:'SQ',n:'Block Inc',mc:'$46B',t:'Stock'},{s:'COIN',n:'Coinbase Global',mc:'$60B',t:'Stock'},{s:'HOOD',n:'Robinhood Markets',mc:'$30B',t:'Stock'},
  {s:'MSTR',n:'MicroStrategy Inc',mc:'$32B',t:'Stock'},{s:'MMC',n:'Marsh McLennan',mc:'$115B',t:'Stock'},{s:'CB',n:'Chubb Limited',mc:'$113B',t:'Stock'},
  {s:'PGR',n:'Progressive Corp',mc:'$140B',t:'Stock'},
  // Energy
  {s:'XOM',n:'Exxon Mobil',mc:'$490B',t:'Stock'},{s:'CVX',n:'Chevron Corp',mc:'$280B',t:'Stock'},{s:'SHEL',n:'Shell plc',mc:'$225B',t:'Stock'},
  {s:'BP',n:'BP plc',mc:'$95B',t:'Stock'},{s:'SLB',n:'Schlumberger',mc:'$65B',t:'Stock'},
  // Consumer / Retail / Travel
  {s:'WMT',n:'Walmart Inc',mc:'$720B',t:'Stock'},{s:'COST',n:'Costco Wholesale',mc:'$410B',t:'Stock'},{s:'HD',n:'Home Depot',mc:'$380B',t:'Stock'},
  {s:'LOW',n:'Lowe\'s Companies',mc:'$140B',t:'Stock'},{s:'TGT',n:'Target Corp',mc:'$72B',t:'Stock'},{s:'TJX',n:'TJX Companies',mc:'$145B',t:'Stock'},
  {s:'NKE',n:'Nike Inc',mc:'$115B',t:'Stock'},{s:'SBUX',n:'Starbucks Corp',mc:'$90B',t:'Stock'},{s:'MCD',n:'McDonald\'s Corp',mc:'$200B',t:'Stock'},
  {s:'KO',n:'Coca-Cola Co',mc:'$280B',t:'Stock'},{s:'PEP',n:'PepsiCo Inc',mc:'$230B',t:'Stock'},{s:'PG',n:'Procter & Gamble',mc:'$380B',t:'Stock'},
  {s:'PM',n:'Philip Morris International',mc:'$200B',t:'Stock'},{s:'MO',n:'Altria Group',mc:'$95B',t:'Stock'},{s:'MDLZ',n:'Mondelez International',mc:'$90B',t:'Stock'},
  {s:'BKNG',n:'Booking Holdings',mc:'$170B',t:'Stock'},{s:'ABNB',n:'Airbnb Inc',mc:'$85B',t:'Stock'},{s:'UBER',n:'Uber Technologies',mc:'$170B',t:'Stock'},
  {s:'DIS',n:'Walt Disney',mc:'$200B',t:'Stock'},{s:'CMCSA',n:'Comcast Corp',mc:'$150B',t:'Stock'},{s:'VZ',n:'Verizon',mc:'$175B',t:'Stock'},
  {s:'RBLX',n:'Roblox Corp',mc:'$30B',t:'Stock'},
  // Healthcare / Pharma / Biotech
  {s:'JNJ',n:'Johnson & Johnson',mc:'$355B',t:'Stock'},{s:'UNH',n:'UnitedHealth',mc:'$460B',t:'Stock'},{s:'PFE',n:'Pfizer Inc',mc:'$150B',t:'Stock'},
  {s:'LLY',n:'Eli Lilly',mc:'$840B',t:'Stock'},{s:'ABBV',n:'AbbVie Inc',mc:'$300B',t:'Stock'},{s:'MRK',n:'Merck & Co',mc:'$300B',t:'Stock'},
  {s:'NVO',n:'Novo Nordisk',mc:'$580B',t:'Stock'},{s:'TMO',n:'Thermo Fisher Scientific',mc:'$205B',t:'Stock'},{s:'DHR',n:'Danaher Corp',mc:'$175B',t:'Stock'},
  {s:'ABT',n:'Abbott Laboratories',mc:'$200B',t:'Stock'},{s:'ISRG',n:'Intuitive Surgical',mc:'$190B',t:'Stock'},{s:'MDT',n:'Medtronic Plc',mc:'$110B',t:'Stock'},
  {s:'GILD',n:'Gilead Sciences',mc:'$100B',t:'Stock'},{s:'AMGN',n:'Amgen Inc',mc:'$150B',t:'Stock'},{s:'REGN',n:'Regeneron Pharmaceuticals',mc:'$95B',t:'Stock'},
  {s:'BMY',n:'Bristol-Myers Squibb',mc:'$115B',t:'Stock'},{s:'CVS',n:'CVS Health',mc:'$80B',t:'Stock'},{s:'ELV',n:'Elevance Health',mc:'$88B',t:'Stock'},
  {s:'CI',n:'Cigna Group',mc:'$95B',t:'Stock'},{s:'SYK',n:'Stryker Corp',mc:'$115B',t:'Stock'},{s:'ZTS',n:'Zoetis Inc',mc:'$80B',t:'Stock'},
  // Industrial / Aerospace / Defense / Utilities
  {s:'CAT',n:'Caterpillar Inc',mc:'$170B',t:'Stock'},{s:'BA',n:'Boeing Co',mc:'$103B',t:'Stock'},{s:'GE',n:'GE Aerospace',mc:'$190B',t:'Stock'},
  {s:'RTX',n:'RTX Corporation',mc:'$160B',t:'Stock'},{s:'LMT',n:'Lockheed Martin',mc:'$115B',t:'Stock'},{s:'HON',n:'Honeywell Intl',mc:'$135B',t:'Stock'},
  {s:'DE',n:'Deere & Co',mc:'$105B',t:'Stock'},{s:'UPS',n:'United Parcel Service',mc:'$115B',t:'Stock'},{s:'ADP',n:'Automatic Data Processing',mc:'$115B',t:'Stock'},
  {s:'LIN',n:'Linde plc',mc:'$210B',t:'Stock'},{s:'PLD',n:'Prologis Inc',mc:'$110B',t:'Stock'},{s:'SO',n:'Southern Company',mc:'$80B',t:'Stock'},
  // Auto
  {s:'F',n:'Ford Motor',mc:'$44B',t:'Stock'},{s:'GM',n:'General Motors',mc:'$55B',t:'Stock'},{s:'TM',n:'Toyota Motor',mc:'$260B',t:'Stock'},
  {s:'RIVN',n:'Rivian Automotive',mc:'$14B',t:'Stock'},{s:'NIO',n:'NIO Inc',mc:'$10B',t:'Stock'},{s:'LI',n:'Li Auto',mc:'$24B',t:'Stock'},
  {s:'XPEV',n:'XPeng Inc',mc:'$12B',t:'Stock'},
  // International ADRs
  {s:'BABA',n:'Alibaba Group',mc:'$200B',t:'Stock'},{s:'JD',n:'JD.com Inc',mc:'$60B',t:'Stock'},{s:'PDD',n:'PDD Holdings',mc:'$185B',t:'Stock'},
  {s:'NTES',n:'NetEase Inc',mc:'$60B',t:'Stock'},{s:'SE',n:'Sea Limited',mc:'$75B',t:'Stock'},{s:'MELI',n:'MercadoLibre',mc:'$115B',t:'Stock'},
  // Crypto-linked miners
  {s:'MARA',n:'Marathon Digital Holdings',mc:'$5B',t:'Stock'},{s:'RIOT',n:'Riot Platforms',mc:'$3B',t:'Stock'},
  // Airlines
  {s:'UAL',n:'United Airlines Holdings',mc:'$15B',t:'Stock'},{s:'DAL',n:'Delta Air Lines',mc:'$30B',t:'Stock'},
  // Major ETFs
  {s:'SPY',n:'S&P 500 ETF',mc:'$540B',t:'ETF'},{s:'QQQ',n:'Nasdaq 100 ETF',mc:'$270B',t:'ETF'},{s:'IWM',n:'Russell 2000 ETF',mc:'$60B',t:'ETF'},
  {s:'DIA',n:'Dow Jones ETF',mc:'$35B',t:'ETF'},{s:'VTI',n:'Vanguard Total Market ETF',mc:'$400B',t:'ETF'},{s:'VOO',n:'Vanguard S&P 500 ETF',mc:'$450B',t:'ETF'},
  {s:'IVV',n:'iShares Core S&P 500 ETF',mc:'$480B',t:'ETF'},{s:'SCHD',n:'Schwab Dividend ETF',mc:'$60B',t:'ETF'},{s:'VGT',n:'Vanguard Tech ETF',mc:'$70B',t:'ETF'},
  {s:'ARKK',n:'ARK Innovation ETF',mc:'$6B',t:'ETF'},
  {s:'GLD',n:'Gold ETF',mc:'$75B',t:'ETF'},{s:'SLV',n:'Silver ETF',mc:'$12B',t:'ETF'},
  {s:'TLT',n:'20+ Year Treasury ETF',mc:'$50B',t:'ETF'},{s:'HYG',n:'High Yield Bond ETF',mc:'$15B',t:'ETF'},
  {s:'XLF',n:'Financial Sector ETF',mc:'$40B',t:'ETF'},{s:'XLE',n:'Energy Sector ETF',mc:'$35B',t:'ETF'},
  {s:'XLK',n:'Technology Sector ETF',mc:'$65B',t:'ETF'},{s:'XLV',n:'Healthcare Sector ETF',mc:'$40B',t:'ETF'},
  {s:'XLY',n:'Consumer Discretionary ETF',mc:'$20B',t:'ETF'},{s:'XLP',n:'Consumer Staples ETF',mc:'$15B',t:'ETF'},
  {s:'XLI',n:'Industrial Sector ETF',mc:'$18B',t:'ETF'},{s:'XLU',n:'Utilities Sector ETF',mc:'$13B',t:'ETF'},
  {s:'VEA',n:'Developed Markets ETF',mc:'$100B',t:'ETF'},{s:'EEM',n:'Emerging Markets ETF',mc:'$20B',t:'ETF'},
  // Indices
  {s:'^GSPC',n:'S&P 500 Index',t:'Index'},{s:'^IXIC',n:'Nasdaq Composite',t:'Index'},{s:'^DJI',n:'Dow Jones Industrial',t:'Index'},
  {s:'^RUT',n:'Russell 2000',t:'Index'},{s:'^VIX',n:'CBOE Volatility Index',t:'Index'},
  {s:'^GDAXI',n:'DAX 40',t:'Index'},{s:'^FTSE',n:'FTSE 100',t:'Index'},{s:'^FCHI',n:'CAC 40',t:'Index'},
  {s:'^STOXX50E',n:'Euro Stoxx 50',t:'Index'},{s:'^N225',n:'Nikkei 225',t:'Index'},{s:'^HSI',n:'Hang Seng Index',t:'Index'},
  {s:'000001.SS',n:'Shanghai Composite',t:'Index'},
  // Crypto
  {s:'BTC-USD',n:'Bitcoin',t:'Crypto'},{s:'ETH-USD',n:'Ethereum',t:'Crypto'},{s:'SOL-USD',n:'Solana',t:'Crypto'},
  {s:'XRP-USD',n:'Ripple',t:'Crypto'},{s:'ADA-USD',n:'Cardano',t:'Crypto'},{s:'DOGE-USD',n:'Dogecoin',t:'Crypto'},
  {s:'BNB-USD',n:'BNB',t:'Crypto'},{s:'AVAX-USD',n:'Avalanche',t:'Crypto'},{s:'LINK-USD',n:'Chainlink',t:'Crypto'},
  {s:'LTC-USD',n:'Litecoin',t:'Crypto'},{s:'DOT-USD',n:'Polkadot',t:'Crypto'},{s:'MATIC-USD',n:'Polygon',t:'Crypto'},
  {s:'TRX-USD',n:'TRON',t:'Crypto'},{s:'ATOM-USD',n:'Cosmos',t:'Crypto'},{s:'UNI-USD',n:'Uniswap',t:'Crypto'},
  {s:'ETC-USD',n:'Ethereum Classic',t:'Crypto'},{s:'FIL-USD',n:'Filecoin',t:'Crypto'},{s:'APT-USD',n:'Aptos',t:'Crypto'},
  {s:'ARB-USD',n:'Arbitrum',t:'Crypto'},{s:'OP-USD',n:'Optimism',t:'Crypto'},
  // Forex — Majors
  {s:'EURUSD=X',n:'Euro / US Dollar',t:'Forex'},{s:'GBPUSD=X',n:'Pound / US Dollar',t:'Forex'},
  {s:'USDJPY=X',n:'US Dollar / Yen',t:'Forex'},{s:'USDCHF=X',n:'US Dollar / Swiss Franc',t:'Forex'},
  {s:'AUDUSD=X',n:'Australian Dollar / USD',t:'Forex'},{s:'USDCAD=X',n:'US Dollar / Canadian Dollar',t:'Forex'},
  {s:'NZDUSD=X',n:'New Zealand Dollar / USD',t:'Forex'},
  // Forex — Crosses
  {s:'EURGBP=X',n:'Euro / Pound',t:'Forex'},{s:'EURJPY=X',n:'Euro / Yen',t:'Forex'},
  {s:'GBPJPY=X',n:'Pound / Yen',t:'Forex'},
  // Commodities
  {s:'GC=F',n:'Gold Futures',t:'Futures'},{s:'SI=F',n:'Silver Futures',t:'Futures'},{s:'CL=F',n:'Crude Oil WTI Futures',t:'Futures'},
  {s:'NG=F',n:'Natural Gas Futures',t:'Futures'},{s:'HG=F',n:'Copper Futures',t:'Futures'},{s:'PL=F',n:'Platinum Futures',t:'Futures'},
  {s:'HO=F',n:'Heating Oil Futures',t:'Futures'},{s:'RB=F',n:'RBOB Gasoline Futures',t:'Futures'},
  {s:'ZC=F',n:'Corn Futures',t:'Futures'},{s:'ZW=F',n:'Wheat Futures',t:'Futures'},{s:'ZS=F',n:'Soybean Futures',t:'Futures'},
  // Index futures
  {s:'ES=F',n:'E-mini S&P 500 Futures',t:'Futures'},{s:'NQ=F',n:'E-mini Nasdaq 100 Futures',t:'Futures'},
  {s:'YM=F',n:'E-mini Dow Futures',t:'Futures'},{s:'RTY=F',n:'E-mini Russell 2000 Futures',t:'Futures'},
  // Treasury futures
  {s:'ZN=F',n:'10Y T-Note Futures',t:'Futures'},{s:'ZB=F',n:'30Y T-Bond Futures',t:'Futures'},
]

/** A short list of high-interest tickers to surface when the search
 *  input is empty. Matches the symbols displayed on the dashboard's
 *  default macro ribbon and watchlist. */
export const POPULAR_TICKERS: string[] = [
  'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META',
  'BTC-USD', 'ETH-USD',
  '^GSPC', '^IXIC', '^VIX',
  'EURUSD=X', 'GC=F', 'CL=F',
]
