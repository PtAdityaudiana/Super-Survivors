export const VIRTUAL_WIDTH = 480;
export const VIRTUAL_HEIGHT = 270;

export type GameState = 'title' | 'playing' | 'levelup' | 'paused' | 'gameover';

export type WeaponId = 'whip' | 'wand' | 'aura';

export type UpgradeId = WeaponId | 'maxHp' | 'speed' | 'might' | 'magnet' | 'heal';

export type EnemyType = 'bat' | 'skeleton' | 'zombie' | 'wraith' | 'boss';

export type GemKind = 'blue' | 'green' | 'red';

export type PickupKind = 'roast' | 'swiftBoots' | 'redPotion' | 'ironShield' | 'chest';

export type UpgradeModalSource = 'levelup' | 'chest';

export interface WeaponState {
  id: WeaponId;
  level: number;
  cooldownTimer: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  speedMult: number;
  mightMult: number;
  pickupRadius: number;
  facingX: 1 | -1;
  level: number;
  xp: number;
  xpToNext: number;
  invulnTimer: number;
  hitFlashTimer: number;
  walkTimer: number;
  isMoving: boolean;
  weapons: Record<WeaponId, WeaponState>;
  weaponOrder: WeaponId[];
  statStacks: {
    maxHp: number;
    speed: number;
    might: number;
    magnet: number;
  };
  buffs: {
    swiftTimer: number;
    potionTimer: number;
    shieldTimer: number;
  };
}

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  knockVx: number;
  knockVy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xpValue: number;
  gemKind: GemKind;
  facingX: 1 | -1;
  animTimer: number;
  hitFlashTimer: number;
  isBoss: boolean;
  enhanced: boolean;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  damage: number;
  pierceLeft: number;
  life: number;
  hitIds: Set<number>;
  trail: Array<{ x: number; y: number }>;
}

export interface WhipSlash {
  originX: number;
  originY: number;
  angle: number;
  length: number;
  thickness: number;
  damage: number;
  knockback: number;
  delay: number;
  timer: number;
  duration: number;
  hitIds: Set<number>;
  playedSound: boolean;
}

export type HitEffectKind = 'slash' | 'arcane' | 'soul' | 'cast';

export interface HitEffect {
  kind: HitEffectKind;
  x: number;
  y: number;
  angle: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface XpGem {
  x: number;
  y: number;
  value: number;
  kind: GemKind;
  magnetized: boolean;
  speed: number;
  bobOffset: number;
}

export interface Pickup {
  x: number;
  y: number;
  kind: PickupKind;
  bobOffset: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface DamageNumber {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface UpgradeOption {
  id: UpgradeId;
  title: string;
  description: string;
  badgeText: string;
  badgeKind: 'new' | 'level' | 'stat';
  iconKey: UpgradeId;
}

export interface SaveRecord {
  bestTime: number;
  bestKills: number;
}
