import type { Player, UpgradeId, UpgradeOption, WeaponId } from './types';

export interface WhipStats {
  damage: number;
  cooldown: number;
  width: number;
  height: number;
  knockback: number;
  bothSides: boolean;
}

export interface WandStats {
  damage: number;
  cooldown: number;
  count: number;
  speed: number;
  pierce: number;
}

export interface AuraStats {
  damage: number;
  tickInterval: number;
  radius: number;
  knockback: number;
}

export const WEAPON_NAMES: Record<WeaponId, string> = {
  whip: 'Cambuk Darah',
  wand: 'Tongkat Sihir',
  aura: 'Aura Jiwa',
};

export const MAX_WEAPON_LEVEL = 5;

const WHIP_LEVELS: WhipStats[] = [
  { damage: 18, cooldown: 1.15, width: 74, height: 22, knockback: 95, bothSides: false },
  { damage: 25, cooldown: 1.15, width: 84, height: 25, knockback: 105, bothSides: false },
  { damage: 25, cooldown: 1.1, width: 84, height: 25, knockback: 110, bothSides: true },
  { damage: 34, cooldown: 0.96, width: 88, height: 26, knockback: 120, bothSides: true },
  { damage: 48, cooldown: 0.92, width: 96, height: 28, knockback: 165, bothSides: true },
];

const WAND_LEVELS: WandStats[] = [
  { damage: 14, cooldown: 0.95, count: 1, speed: 210, pierce: 1 },
  { damage: 18, cooldown: 0.92, count: 2, speed: 215, pierce: 1 },
  { damage: 18, cooldown: 0.8, count: 2, speed: 225, pierce: 2 },
  { damage: 24, cooldown: 0.78, count: 3, speed: 230, pierce: 2 },
  { damage: 32, cooldown: 0.72, count: 4, speed: 240, pierce: 3 },
];

const AURA_LEVELS: AuraStats[] = [
  { damage: 7, tickInterval: 0.55, radius: 42, knockback: 32 },
  { damage: 10, tickInterval: 0.55, radius: 52, knockback: 36 },
  { damage: 14, tickInterval: 0.43, radius: 54, knockback: 42 },
  { damage: 18, tickInterval: 0.42, radius: 64, knockback: 68 },
  { damage: 25, tickInterval: 0.34, radius: 76, knockback: 78 },
];

export function getWhipStats(level: number): WhipStats {
  const idx = Math.max(0, Math.min(WHIP_LEVELS.length - 1, level - 1));
  return WHIP_LEVELS[idx];
}

export function getWandStats(level: number): WandStats {
  const idx = Math.max(0, Math.min(WAND_LEVELS.length - 1, level - 1));
  return WAND_LEVELS[idx];
}

export function getAuraStats(level: number): AuraStats {
  const idx = Math.max(0, Math.min(AURA_LEVELS.length - 1, level - 1));
  return AURA_LEVELS[idx];
}

const WHIP_DESCS = [
  'Membidik otomatis musuh terdekat dengan sabetan cambuk darah.',
  'Damage naik ke 25 & jangkauan sabetan cambuk lebih panjang.',
  'Menyabet musuh terdekat sekaligus arah berlawanan!',
  'Damage naik ke 34 & jeda serangan jauh lebih singkat.',
  'Damage puncak 48, jangkauan 96px & dorongan sangat kuat.',
];

const WAND_DESCS = [
  'Menembakkan baut sihir ke musuh terdekat.',
  'Menembak 2 baut beruntun dengan damage 18.',
  'Baut menembus 2 musuh & cooldown lebih cepat.',
  'Menembak 3 baut beruntun dengan damage 24.',
  '4 baut sihir, tembus 3 musuh, damage 32!',
];

const AURA_DESCS = [
  'Memancarkan aura suci yang melukai musuh di sekitar.',
  'Radius aura membesar ke 52px & damage naik ke 10.',
  'Damage naik ke 14 & denyut aura lebih cepat.',
  'Radius 64px, damage 18 & dorongan mundur ekstra.',
  'Radius raksasa 76px, damage 25 & denyut sangat cepat!',
];

export interface WeaponDetailInfo {
  id: WeaponId;
  name: string;
  level: number;
  maxLevel: number;
  description: string;
  statsLine: string;
}

export function getWeaponDetail(
  id: WeaponId,
  level: number,
  mightMult: number,
): WeaponDetailInfo {
  const safeLv = Math.max(1, Math.min(MAX_WEAPON_LEVEL, level));
  if (id === 'whip') {
    const stats = getWhipStats(safeLv);
    const dmg = Math.round(stats.damage * mightMult);
    return {
      id,
      name: WEAPON_NAMES[id],
      level: safeLv,
      maxLevel: MAX_WEAPON_LEVEL,
      description: WHIP_DESCS[safeLv - 1],
      statsLine: `DMG ${dmg} • CD ${stats.cooldown.toFixed(2)}s • JARAK ${stats.width}px${stats.bothSides ? ' • 2 ARAH' : ' • AUTO-AIM'}`,
    };
  }
  if (id === 'wand') {
    const stats = getWandStats(safeLv);
    const dmg = Math.round(stats.damage * mightMult);
    return {
      id,
      name: WEAPON_NAMES[id],
      level: safeLv,
      maxLevel: MAX_WEAPON_LEVEL,
      description: WAND_DESCS[safeLv - 1],
      statsLine: `DMG ${dmg} • CD ${stats.cooldown.toFixed(2)}s • ${stats.count} BAUT • TEMBUS ${stats.pierce}`,
    };
  }
  const stats = getAuraStats(safeLv);
  const dmg = Math.round(stats.damage * mightMult);
  return {
    id,
    name: WEAPON_NAMES[id],
    level: safeLv,
    maxLevel: MAX_WEAPON_LEVEL,
    description: AURA_DESCS[safeLv - 1],
    statsLine: `DMG ${dmg} • TICK ${stats.tickInterval.toFixed(2)}s • RADIUS ${stats.radius}px`,
  };
}

function buildWeaponOption(id: WeaponId, currentLevel: number): UpgradeOption {
  const nextLevel = currentLevel + 1;
  const isNew = currentLevel === 0;
  const descs =
    id === 'whip' ? WHIP_DESCS : id === 'wand' ? WAND_DESCS : AURA_DESCS;

  return {
    id,
    title: WEAPON_NAMES[id],
    description: descs[Math.max(0, Math.min(descs.length - 1, nextLevel - 1))],
    badgeText: isNew ? 'BARU' : `LV ${nextLevel}`,
    badgeKind: isNew ? 'new' : 'level',
    iconKey: id,
  };
}

function buildStatOption(id: Exclude<UpgradeId, WeaponId>, player: Player): UpgradeOption {
  switch (id) {
    case 'maxHp':
      return {
        id: 'maxHp',
        title: 'Vitalitas',
        description: '+25 Max HP permanen dan langsung pulihkan 25 HP.',
        badgeText: `PASIF ${player.statStacks.maxHp + 1}/5`,
        badgeKind: 'stat',
        iconKey: 'maxHp',
      };
    case 'speed':
      return {
        id: 'speed',
        title: 'Sepatu Bayangan',
        description: '+12% kecepatan gerak untuk menghindari kepungan.',
        badgeText: `PASIF ${player.statStacks.speed + 1}/4`,
        badgeKind: 'stat',
        iconKey: 'speed',
      };
    case 'might':
      return {
        id: 'might',
        title: 'Kekuatan Gelap',
        description: '+15% damage untuk seluruh senjata aktif.',
        badgeText: `PASIF ${player.statStacks.might + 1}/5`,
        badgeKind: 'stat',
        iconKey: 'might',
      };
    case 'magnet':
      return {
        id: 'magnet',
        title: 'Magnet Jiwa',
        description: '+35% jarak tarikan kristal XP di medan tempur.',
        badgeText: `PASIF ${player.statStacks.magnet + 1}/4`,
        badgeKind: 'stat',
        iconKey: 'magnet',
      };
    case 'heal':
      return {
        id: 'heal',
        title: 'Daging Panggang',
        description: 'Segera memulihkan 40 HP yang hilang.',
        badgeText: 'PULIH',
        badgeKind: 'stat',
        iconKey: 'heal',
      };
  }
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function rollUpgradeOptions(player: Player): UpgradeOption[] {
  const lockedWeapons: UpgradeOption[] = [];
  const existingWeapons: UpgradeOption[] = [];
  const statPool: UpgradeOption[] = [];

  const weaponIds: WeaponId[] = ['whip', 'wand', 'aura'];
  for (const wid of weaponIds) {
    const lv = player.weapons[wid].level;
    if (lv === 0) {
      lockedWeapons.push(buildWeaponOption(wid, 0));
    } else if (lv < MAX_WEAPON_LEVEL) {
      existingWeapons.push(buildWeaponOption(wid, lv));
    }
  }

  if (player.statStacks.maxHp < 5) {
    statPool.push(buildStatOption('maxHp', player));
  }
  if (player.statStacks.speed < 4) {
    statPool.push(buildStatOption('speed', player));
  }
  if (player.statStacks.might < 5) {
    statPool.push(buildStatOption('might', player));
  }
  if (player.statStacks.magnet < 4) {
    statPool.push(buildStatOption('magnet', player));
  }

  const lowHp = player.hp < player.maxHp * 0.75;
  if (lowHp) {
    statPool.push(buildStatOption('heal', player));
  }

  const chosen: UpgradeOption[] = [];
  const chosenIds = new Set<UpgradeId>();

  const pickFrom = (pool: UpgradeOption[]) => {
    for (const opt of pool) {
      if (!chosenIds.has(opt.id)) {
        chosenIds.add(opt.id);
        chosen.push(opt);
        return true;
      }
    }
    return false;
  };

  shuffleInPlace(lockedWeapons);
  shuffleInPlace(existingWeapons);
  shuffleInPlace(statPool);

  // Prioritize offering unlocked weapons early so players experience all 3 weapons in an MVP run
  if (lockedWeapons.length > 0 && player.level <= 5) {
    pickFrom(lockedWeapons);
  }

  const combined = shuffleInPlace([
    ...lockedWeapons,
    ...existingWeapons,
    ...statPool,
  ]);

  for (const opt of combined) {
    if (chosen.length >= 3) break;
    if (!chosenIds.has(opt.id)) {
      chosenIds.add(opt.id);
      chosen.push(opt);
    }
  }

  // Fallback to heal if all weapons & passives are maxed
  while (chosen.length < 3) {
    const healOpt = buildStatOption('heal', player);
    if (!chosenIds.has('heal')) {
      chosenIds.add('heal');
      chosen.push(healOpt);
    } else {
      // If somehow fewer than 3 unique options exist (late maxed run), allow extra heal cards
      chosen.push({
        ...healOpt,
        description: 'Semua perlengkapan penuh. Pulihkan 40 HP.',
      });
    }
  }

  return chosen;
}

export function applyUpgrade(player: Player, id: UpgradeId): void {
  if (id === 'whip' || id === 'wand' || id === 'aura') {
    const state = player.weapons[id];
    if (state.level === 0) {
      state.level = 1;
      state.cooldownTimer = 0.05;
      if (!player.weaponOrder.includes(id)) {
        player.weaponOrder.push(id);
      }
    } else if (state.level < MAX_WEAPON_LEVEL) {
      state.level += 1;
    }
    return;
  }

  switch (id) {
    case 'maxHp':
      player.statStacks.maxHp += 1;
      player.maxHp += 25;
      player.hp = Math.min(player.maxHp, player.hp + 25);
      break;
    case 'speed':
      player.statStacks.speed += 1;
      player.speedMult += 0.12;
      break;
    case 'might':
      player.statStacks.might += 1;
      player.mightMult += 0.15;
      break;
    case 'magnet':
      player.statStacks.magnet += 1;
      player.pickupRadius *= 1.35;
      break;
    case 'heal':
      player.hp = Math.min(player.maxHp, player.hp + 40);
      break;
  }
}
