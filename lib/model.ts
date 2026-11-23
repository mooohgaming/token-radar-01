// Token Radar's value model (radar-2): one sealed snapshot in, one ranked board out.
//
// A launch candidate is a standalone protocol whose token does not exist yet on
// the record. The board ranks every protocol that records no token (no market
// cap, no CoinGecko id, no symbol) and is not a wrapped, staked or bridged
// product of a token that already trades: the same product rule the watchlist
// uses (Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking, Restaked
// BTC and CEX categories, a name ending in a version marker, a whole word
// wrapped / staked / staking in the name, or a name starting with an
// exchange's name). WBTC, Binance staked ETH and USDT0 are therefore not
// ranked at all: they are Bitcoin, ETH and USDT in another wrapper, not
// protocols still waiting on a launch of their own. Protocols whose token
// already trades are set aside in the Live view with their market caps, never
// mixed into the pre-token ranking.
//
// Implied value follows only from the snapshot's own figures, one function
// for every row, no name ever special-cased:
//
//   base      = 4 x tvl_usd ^ 0.85
//               A power law: value grows slower than TVL, so a $5M protocol
//               is worth relatively more per TVL dollar than a $5B one —
//               the early-stage premium a launch buyer actually pays.
//   growth    = clamp(change_7d, -60, 150) per cent
//   growthMul = 1 + (growth / 100) x 0.6
//   age       = days from listed_at to the snapshot's as_of (365 if unknown)
//   ageMul    = 0.7 + 0.3 x min(age, 1460) / 1460
//               Longer with no token, higher: four years of operating
//               without a token is the strongest evidence the launch, when
//               it comes, has a real protocol behind it.
//   breadth   = 1 + 0.03 x min(chains - 1, 5)
//               Each extra chain, up to five, adds 3%: multi-chain reach
//               is a wider future holder base.
//   catMul    = the category's revenue multiple (see CATEGORY_MULTIPLE):
//               trading volume monetises best, vaults and curators next,
//               staking-like products least.
//   implied   = max(1, round(base x growthMul x ageMul x breadth x catMul))
//
// The board ranks every eligible protocol (198 here: the whole watchlist plus
// every other pre-token standalone protocol), strongest implied value first.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  base_coefficient: number;
  base_exponent: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  age_floor: number;
  age_range: number;
  age_cap_days: number;
  unknown_age_days: number;
  breadth_per_chain: number;
  breadth_max_chains: number;
}

export const MODEL: ModelConstants = {
  base_coefficient: 4,
  base_exponent: 0.85,
  growth_weight: 0.6,
  growth_floor: -60,
  growth_cap: 150,
  age_floor: 0.7,
  age_range: 0.3,
  age_cap_days: 1460,
  unknown_age_days: 365,
  breadth_per_chain: 0.03,
  breadth_max_chains: 5,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the Live view carries, by market cap. */
export const LIVE_ROWS = 24;

/**
 * A category's revenue multiple. Trading venues monetise volume directly, so
 * they carry the highest multiple; vaults, curators and allocators earn fees
 * on assets they manage; staking-like products share economics with the
 * underlying asset and carry the lowest. Anything unlisted takes 0.9.
 */
export const CATEGORY_MULTIPLE: Record<string, number> = {
  Derivatives: 1.2,
  Dexs: 1.15,
  'Risk Curators': 1.1,
  'Onchain Capital Allocator': 1.1,
  'Basis Trading': 1.1,
  Lending: 1.05,
  CDP: 1.0,
  Yield: 1.0,
  'Yield Aggregator': 0.95,
  'Liquidity Manager': 1.0,
  'Leveraged Farming': 1.0,
  RWA: 0.95,
  'Staking Pool': 0.85,
  Restaking: 0.85,
};

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_value: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    category_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  base_value: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  category_multiplier: number;
  watchlist: boolean;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The revenue multiple for a category: the table above, 0.9 when unlisted. */
export function categoryMultiple(category: string | null): number {
  if (category === null) return 0.9;
  return CATEGORY_MULTIPLE[category] ?? 0.9;
}

/** The multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
): { implied: number; base: number; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; catMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.age_floor + (Math.min(Math.max(ageForModel, 0), model.age_cap_days) / model.age_cap_days) * model.age_range;
  const extraChains = Math.min(Math.max(protocol.chains.length - 1, 0), model.breadth_max_chains);
  const breadthMult = 1 + extraChains * model.breadth_per_chain;
  const catMult = categoryMultiple(protocol.category);
  const base = model.base_coefficient * Math.pow(protocol.tvl_usd, model.base_exponent);
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * breadthMult * catMult));
  return { implied, base, growthPct, growthMult, maturityMult, breadthMult, catMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** A whole word wrapped, staked or staking in a name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** Categories that are products of a token that already trades, not standalone launches. */
const PRODUCT_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
/** Exchange names a standalone protocol's name never starts with. */
const EXCHANGES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is a launch candidate: pre-token and a standalone
 * protocol, not a wrapped, staked or bridged product of a token that already
 * trades. This is the watchlist's own product rule, applied to every row.
 */
export function isLaunchCandidate(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && PRODUCT_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  const lower = p.name.toLowerCase();
  if (EXCHANGES.some((e) => lower.startsWith(e.toLowerCase()))) return false;
  return true;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug it names is ranked.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other launch candidate, below the floor or above
  // it, that the watchlist's product rule left out. Never a replacement for a
  // watchlist row: a chosen protocol stays chosen.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isLaunchCandidate(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      base_value: Math.round(s.base),
      growth_pct: round4(s.growthPct),
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      breadth_multiplier: round4(s.breadthMult),
      category_multiplier: s.catMult,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** What one transaction costs on a chain, in dollars, from its usual gas. */
export function gasUsd(chain: string): number {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 12;
  if (c === 'solana' || c === 'polygon') return 0.05;
  if (c === 'bitcoin' || c === 'tron') return 3;
  if (c === 'base' || c === 'arbitrum' || c === 'optimism' || c === 'unichain' || c === 'ink' || c === 'katana' || c === 'blast' || c === 'mode' || c === 'zksync era' || c === 'scroll' || c === 'linea' || c === 'mantle' || c === 'opbnb') return 0.5;
  if (c === 'binance' || c === 'bnb chain' || c === 'avalanche' || c === 'fantom' || c === 'gnosis') return 0.4;
  if (c === 'sui' || c === 'aptos' || c === 'near' || c === 'sei') return 0.1;
  return 1;
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 250_000_000) return 200;
  if (p.tvl_usd >= 100_000_000) return 150;
  if (p.tvl_usd >= 25_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** A compact dollar figure: $250, $1.2K, $3.4M, $2.7B. */
export function compactUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

/** The category's main farm action, in the words a farmer can follow. */
function mainAction(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('dex') || c.includes('liquidity manager')) return `Add $${capital} of liquidity to ${name}'s deepest pool on ${chain} — pair USDC with the chain's native asset — and keep the position open.`;
  if (c.includes('lend')) return `Supply $${capital} of USDC to ${name} on ${chain}, then borrow $20 of the chain's native asset against it so the account shows both sides.`;
  if (c.includes('cdp')) return `Lock $${capital} of collateral in ${name} on ${chain} and mint $25 of its stable asset against it, keeping the ratio above the liquidation line.`;
  if (c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} on ${chain} and open one small long hedge, no more than $25 of notional.`;
  if (c.includes('basis')) return `Deposit $${capital} into ${name}'s basis vault on ${chain} and hold the vault shares through one funding cycle.`;
  if (c.includes('leveraged farm')) return `Open a $${capital} leveraged farming position on ${name} on ${chain} at the lowest leverage the app offers and keep it open.`;
  if (c.includes('yield aggregator') || c.includes('yield')) return `Deposit $${capital} of USDC into ${name}'s highest-TVL vault on ${chain} and leave the auto-compounder running.`;
  if (c.includes('risk curator') || c.includes('capital allocator') || c.includes('curator')) return `Deposit $${capital} of USDC into a ${name} curated vault on ${chain} and keep the vault shares for the full hold.`;
  if (c.includes('rwa')) return `Mint $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it in the farming wallet.`;
  if (c.includes('staking pool') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} on ${chain} and keep the receipt token in the wallet.`;
  if (c.includes('farm')) return `Deposit $${capital} into ${name}'s farm on ${chain} and stake the LP receipt the farm issues.`;
  if (c === 'chain') return `Bridge $${capital} of USDC to ${name} on ${chain} and use it in one of the chain's own apps the same week.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's weekly qualifying action. */
function weeklyAction(p: SnapshotProtocol, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('dex') || c.includes('liquidity manager')) return `Swap $25 through ${name}'s own router on ${chain} and add the output back to the pool.`;
  if (c.includes('lend')) return `Repay $5 of the borrow and borrow it back on ${name}, so the account moves every week.`;
  if (c.includes('cdp')) return `Top up $5 of collateral or repay $5 of the minted stable asset on ${name}.`;
  if (c.includes('derivative')) return `Close the hedge and open a fresh $25 one on ${name}, keeping the margin untouched.`;
  if (c.includes('basis')) return `Claim the vault's accrued yield on ${name} and redeposit it the same day.`;
  if (c.includes('leveraged farm')) return `Harvest the farm's rewards on ${name} and restake them into the same position.`;
  if (c.includes('yield aggregator') || c.includes('yield')) return `Claim the vault yield on ${name} and redeposit it, so the position compounds weekly.`;
  if (c.includes('risk curator') || c.includes('capital allocator') || c.includes('curator')) return `Vote on ${name}'s newest vault proposal, or move $10 between two of its vaults.`;
  if (c.includes('rwa')) return `Check the asset's accrual on ${name} and record the week's yield in the farm log.`;
  if (c.includes('staking pool') || c.includes('restak')) return `Claim the staking rewards on ${name} and restake them the same day.`;
  if (c.includes('farm')) return `Harvest the farm rewards on ${name} and compound them back into the position.`;
  if (c === 'chain') return `Make one transaction in a ${name} app on ${chain} each week — a swap, a stake or a vote.`;
  return `Make one qualifying action on ${name} each week, such as a deposit, a swap or a vote.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time.
 * The plan is derived from the protocol's own record (category, chains, TVL,
 * seven-day growth, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = gasUsd(chain);
  const gasText = `about $${gas} of gas`;
  const growth = p.change_7d === null ? 'unreported' : `${p.change_7d >= 0 ? '+' : ''}${p.change_7d.toFixed(1)}%`;
  return [
    {
      text: `Open a fresh wallet that holds only the farm funds, fund it with $${capital + 20} on ${chain}, and keep its seed phrase offline.`,
      cost: `${gasText} to fund it`,
      time: '10 minutes',
    },
    {
      text: mainAction(p, capital, chain),
      cost: `$${capital} of capital and ${gasText} a transaction`,
      time: '15 minutes to set up',
    },
    {
      text: weeklyAction(p, chain),
      cost: `${gasText} a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days. ${p.name} holds ${compactUsd(p.tvl_usd)} of TVL and moved ${growth} over seven days, so a position that spans more than one snapshot is the record that counts.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Once a week, open ${p.name}'s own points or rewards page from the link the protocol itself publishes and check the position is tracked.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes a week',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log. When a token launches, the log is what proves the position; unwinding costs ${gasText} a transaction.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js. */
export function radarRow(row: BoardRow, watchlist: Set<string>): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    base_value: row.model.base_value,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
    category_multiplier: row.model.category_multiplier,
    watchlist: watchlist.has(row.slug),
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const wl = new Set(snapshot.watchlist);
  const early = board.filter((r) => !wl.has(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map((r) => radarRow(r, wl)),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
