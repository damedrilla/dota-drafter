// ...new file...
import matchups from '../data/matchups_data.json';
import roleBiasList from '../data/role_bias.json';

// Heroes that commonly cause server lag — bots should avoid picking or banning them.
export const LAGGY_HERO_IDS = [
  'npc_dota_hero_broodmother', 'npc_dota_hero_chen', 'npc_dota_hero_chaos_knight',
  'npc_dota_hero_techies', 'npc_dota_hero_meepo', 'npc_dota_hero_invoker',
  'npc_dota_hero_tinker', 'npc_dota_hero_arc_warden', 'npc_dota_hero_enigma',
  'npc_dota_hero_naga_siren', 'npc_dota_hero_terrorblade', 'npc_dota_hero_phantom_lancer',
  'npc_dota_hero_furion', 'npc_dota_hero_monkey_king', 'npc_dota_hero_skeleton_king',
  'npc_dota_hero_viper', 'npc_dota_hero_troll_warlord', 'npc_dota_hero_sniper'
];

export const isLaggyHero = (hero) => {
  if (!hero) return false;
  const id = hero.id || hero.name || '';
  const npc = id.startsWith('npc_dota_hero_') ? id : `npc_dota_hero_${id.replace(/^npc_dota_hero_/, '')}`;
  return LAGGY_HERO_IDS.includes(id) || LAGGY_HERO_IDS.includes(npc);
};

/**
 * Debug flag (toggle in runtime via import if needed)
 */
export let DEBUG_PICKLOGIC = true;
export const setPickLogicDebug = (v) => { DEBUG_PICKLOGIC = !!v; };

/**
 * Helpers
 */
const roleMap = {};
for (const item of roleBiasList || []) {
  roleMap[item.name] = item;
}

/** Try multiple key forms to find matchups/role data */
const heroKeyVariants = (hero) => {
  // hero.id may be "abaddon" or "npc_dota_hero_abaddon"
  const id = hero.id || hero.name || '';
  const npc = id.startsWith('npc_dota_hero_') ? id : `npc_dota_hero_${id.replace(/^npc_dota_hero_/, '')}`;
  return [id, npc];
};

const getMatchupValue = (candidate, enemy) => {
  for (const ck of heroKeyVariants(candidate)) {
    const row = matchups[ck];
    if (!row) continue;
    for (const ek of heroKeyVariants(enemy)) {
      if (typeof row[ek] === 'number') return row[ek];
    }
  }
  return 0;
};

const getRoleEntry = (hero) => {
  for (const k of heroKeyVariants(hero)) {
    if (roleMap[k]) return roleMap[k];
  }
  return null;
};

const weightedRandom = (items, weights) => {
  const total = weights.reduce((a,b)=>a+b,0);
  if (total <= 0) return items[Math.floor(Math.random()*items.length)];
  let r = Math.random()*total;
  for (let i=0;i<items.length;i++){
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length-1];
};

/**
 * pickHeroForBot
 * - activeAction: 'pick' | 'ban'
 * - availableHeroes: array of hero objects (filtered already)
 * - myPicks, enemyPicks: arrays of hero objects already on teams
 * - options: { isCaptainsMode: boolean, debug?: boolean }
 */
export function pickHeroForBot(availableHeroes, myPicks, enemyPicks, activeAction = 'pick', options = {}) {
  const isBan = activeAction === 'ban';
  const isCaptains = !!options.isCaptainsMode;
  const preferCounter = !!options.preferCounter;
  const desiredPos = options.desiredPos || null; // 1-5 if specified
  const localDebug = DEBUG_PICKLOGIC || !!options.debug;

  // Filter out laggy heroes from candidate pools when possible. If filtering
  // removes all heroes, fall back to the original `availableHeroes`.
  const availableNoLag = Array.isArray(availableHeroes)
    ? availableHeroes.filter(h => !isLaggyHero(h))
    : [];
  const pool = (availableNoLag && availableNoLag.length > 0) ? availableNoLag : availableHeroes;

  // When banning in captain mode and enemy already has picks, choose counters
  if (isBan && isCaptains && enemyPicks.length > 0) {
    // score candidate by how strongly it beats enemy picks
    const scores = pool.map(candidate => {
      let s = 0;
      for (const e of enemyPicks) s += getMatchupValue(candidate, e);
      return Math.max(s, 0); // prefer positive counters
    });

    const chosen = weightedRandom(pool, scores);

    if (localDebug) {
      console.groupCollapsed('[pickLogic] captain BAN (counter) — candidates: ' + pool.length);
      pool.forEach((c, idx) => console.log(`${idx}: ${c.id || c.name} -> ${scores[idx].toFixed(3)}`));
      console.log('chosen:', chosen?.id || chosen?.name);
      console.groupEnd();
    }

    return chosen;
  }

  // Normal ban or no enemy picks: slightly bias by role/rarity, otherwise random
  if (isBan) {
    // simple heuristic: ban hero with highest aggregate matchup against enemy picks (if any), else random
    const scores = pool.map(candidate => {
      let s = 0;
      for (const e of enemyPicks) s += getMatchupValue(candidate, e);
      const role = getRoleEntry(candidate);
      if (role && role.weak) s *= 0.6;
      return Math.max(s, 0.01);
    });

    const chosen = weightedRandom(pool, scores);

    if (localDebug) {
      console.groupCollapsed('[pickLogic] BAN — candidates: ' + pool.length);
      pool.forEach((c, idx) => console.log(`${idx}: ${c.id || c.name} -> ${scores[idx].toFixed(3)}`));
      console.log('chosen:', chosen?.id || chosen?.name);
      console.groupEnd();
    }

    return chosen;
  }

  // PICK logic:
  // - prefer attributes we are missing
  // - factor matchup vs enemy picks (positive is good)
  // - apply role weak penalty
  const haveAttrs = { str: false, agi: false, int: false };
  for (const p of myPicks) if (p && p.attr) haveAttrs[p.attr] = true;

  // Strict position enforcement: if caller provided a desiredPos (1-5), prefer only heroes
  // which have a positive role score for that position. If none match, fall back to full pool.
  let pickCandidates = pool;
  if (!isBan && desiredPos) {
    const filtered = availableHeroes.filter(candidate => {
      const role = getRoleEntry(candidate);
      return role && Array.isArray(role.role) && (role.role[desiredPos - 1] || 0) > 0;
    });
    if (filtered.length > 0) {
      pickCandidates = filtered;
      if (localDebug) console.log('[pickLogic] enforcing desiredPos', desiredPos, 'candidates:', pickCandidates.length);
    } else {
      if (localDebug) console.log('[pickLogic] desiredPos', desiredPos, 'no eligible candidates, falling back to full pool');
    }
  }

  const scores = pickCandidates.map(candidate => {
    let score = 1;

    // attribute diversity bonus
    if (candidate.attr && !haveAttrs[candidate.attr]) score += 2.0;

    // matchup vs enemy picks (sum of matchup values)
    let matchupSum = 0;
    for (const e of enemyPicks) {
      matchupSum += getMatchupValue(candidate, e);
    }
    // scale matchup influence (can be boosted when preferring counter picks)
    const matchupMultiplier = preferCounter ? 1.2 : 0.6;
    score += matchupSum * matchupMultiplier;

    // role weak penalty
    const role = getRoleEntry(candidate);
    if (role && role.weak) score *= 0.6;

    // position preference: boost heroes that match desired position (1-5)
    if (desiredPos && role && Array.isArray(role.role)) {
      const val = role.role[desiredPos - 1] || 0; // 0-100
      // scale into a bonus (tuneable); stronger role value gives larger bonus
      score += (val / 100) * 3.0;
    }

    // small random fudge so picks aren't deterministic
    score = Math.max(0.001, score + (Math.random()-0.5)*0.6);

    return score;
  });

  const chosen = weightedRandom(pickCandidates, scores);

  if (localDebug) {
    console.groupCollapsed('[pickLogic] PICK — candidates: ' + pickCandidates.length + ' (desiredPos=' + (desiredPos||'none') + ')');
    pickCandidates.forEach((c, idx) => console.log(`${idx}: ${c.id || c.name} -> ${scores[idx].toFixed(3)}`));
    console.log('haveAttrs:', haveAttrs, 'enemyPicks:', enemyPicks.map(e=>e.id||e.name));
    console.log('chosen:', chosen?.id || chosen?.name);
    console.groupEnd();
  }

  return chosen;
}

/**
 * pickCounterBan: explicit helper to pick a hero to ban that is a strong counter to enemy picks.
 * Falls back to random pick when no enemy picks.
 */
export function pickCounterBan(availableHeroes, enemyPicks, options = {}) {
  const localDebug = DEBUG_PICKLOGIC || !!options.debug;

  if (!enemyPicks || enemyPicks.length === 0) {
    const chosen = availableHeroes[Math.floor(Math.random() * availableHeroes.length)];
    if (localDebug) {
      console.groupCollapsed('[pickLogic] counterBAN (fallback random)');
      console.log('chosen:', chosen?.id || chosen?.name);
      console.groupEnd();
    }
    return chosen;
  }
  const scores = availableHeroes.map(candidate => {
    let s = 0;
    for (const e of enemyPicks) {
      // how well candidate performs vs enemy pick
      s += getMatchupValue(candidate, e);
    }
    return Math.max(s, 0.01);
  });

  const chosen = weightedRandom(availableHeroes, scores);

  if (localDebug) {
    console.groupCollapsed('[pickLogic] counterBAN — candidates: ' + availableHeroes.length);
    availableHeroes.forEach((c, idx) => console.log(`${idx}: ${c.id || c.name} -> ${scores[idx].toFixed(3)}`));
    console.log('enemyPicks:', enemyPicks.map(e=>e.id||e.name));
    console.log('chosen:', chosen?.id || chosen?.name);
    console.groupEnd();
  }

  return chosen;
}