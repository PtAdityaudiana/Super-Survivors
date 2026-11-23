import {
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
  type Enemy,
  type EnemyType,
  type GemKind,
  type Player,
} from './types';

export const MAX_ENEMIES = 220;

export interface EnemyCompendiumEntry {
  type: EnemyType;
  name: string;
  spawnWindow: string;
  hp: number;
  damage: number;
  speed: number;
  xpValue: number;
  description: string;
}

export const ENEMY_COMPENDIUM: EnemyCompendiumEntry[] = [
  {
    type: 'bat',
    name: 'Kelelawar Malam',
    spawnWindow: '00:00+',
    hp: 14,
    damage: 6,
    speed: 48,
    xpValue: 1,
    description:
      'Gesit dan sering menyerang dalam gerombolan kawanan mulai detik ke-35. Menjatuhkan kristal XP biru.',
  },
  {
    type: 'skeleton',
    name: 'Prajurit Tengkorak',
    spawnWindow: '00:00+',
    hp: 26,
    damage: 9,
    speed: 36,
    xpValue: 2,
    description:
      'Pasukan tulang berkarat dengan ketahanan sedang yang terus menekan dari segala arah.',
  },
  {
    type: 'zombie',
    name: 'Mayat Hidup',
    spawnWindow: '00:35+',
    hp: 56,
    damage: 13,
    speed: 25,
    xpValue: 5,
    description:
      'Berjalan lambat namun memiliki darah tebal dan pukulan berat. Menjatuhkan kristal XP hijau.',
  },
  {
    type: 'wraith',
    name: 'Arwah Bayangan',
    spawnWindow: '01:30+',
    hp: 44,
    damage: 15,
    speed: 44,
    xpValue: 7,
    description:
      'Roh berjubah cepat dengan serangan mematikan di gelombang pertengahan hingga akhir.',
  },
  {
    type: 'boss',
    name: 'Raja Tengkorak',
    spawnWindow: 'Setiap 02:00',
    hp: 540,
    damage: 24,
    speed: 34,
    xpValue: 100,
    description:
      'Penguasa kuburan bermahkota emas. Tahan knockback, menjatuhkan 5 kristal merah, Daging Panggang, dan Chest!',
  },
];

interface EnemyTemplate {
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  xpValue: number;
  gemKind: GemKind;
  isBoss: boolean;
}

const ENEMY_TEMPLATES: Record<EnemyType, EnemyTemplate> = {
  bat: {
    hp: 14,
    speed: 48,
    damage: 6,
    radius: 5,
    xpValue: 1,
    gemKind: 'blue',
    isBoss: false,
  },
  skeleton: {
    hp: 26,
    speed: 36,
    damage: 9,
    radius: 6,
    xpValue: 2,
    gemKind: 'blue',
    isBoss: false,
  },
  zombie: {
    hp: 56,
    speed: 25,
    damage: 13,
    radius: 7,
    xpValue: 5,
    gemKind: 'green',
    isBoss: false,
  },
  wraith: {
    hp: 44,
    speed: 44,
    damage: 15,
    radius: 6,
    xpValue: 7,
    gemKind: 'green',
    isBoss: false,
  },
  boss: {
    hp: 540,
    speed: 34,
    damage: 24,
    radius: 10,
    xpValue: 100,
    gemKind: 'red',
    isBoss: true,
  },
};

export class WaveSpawner {
  private spawnTimer = 0.4;
  private nextBossTime = 120;
  private bossCount = 0;

  public reset(): void {
    this.spawnTimer = 0.4;
    this.nextBossTime = 120;
    this.bossCount = 0;
  }

  public spawnInitialWave(
    player: Player,
    enemies: Enemy[],
    allocateId: () => number,
  ): void {
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.5;
      const type: EnemyType = i % 2 === 0 ? 'bat' : 'skeleton';
      enemies.push(this.createEnemyAtAngle(type, angle, player, 0, allocateId()));
    }
  }

  public update(
    dt: number,
    elapsed: number,
    player: Player,
    enemies: Enemy[],
    allocateId: () => number,
  ): { bossSpawned: boolean } {
    let bossSpawned = false;

    // Boss milestone every 120 seconds (2:00, 4:00, 6:00, ...)
    if (elapsed >= this.nextBossTime) {
      this.nextBossTime += 120;
      this.bossCount += 1;
      const angle = Math.random() * Math.PI * 2;
      const boss = this.createEnemyAtAngle(
        'boss',
        angle,
        player,
        elapsed,
        allocateId(),
      );
      // Scale consecutive bosses so later bosses stay thrilling
      const bossScale = 1 + (this.bossCount - 1) * 0.65;
      boss.hp = Math.round(boss.hp * bossScale);
      boss.maxHp = boss.hp;
      enemies.push(boss);
      bossSpawned = true;
    }

    if (enemies.length >= MAX_ENEMIES) {
      return { bossSpawned };
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) {
      return { bossSpawned };
    }

    const { interval, batchSize, flockChance } = this.getWaveConfig(elapsed);
    this.spawnTimer = interval;

    // Occasional bat flock starting at 35s
    if (elapsed >= 35 && Math.random() < flockChance && enemies.length + 4 <= MAX_ENEMIES) {
      const baseAngle = Math.random() * Math.PI * 2;
      const flockCount = elapsed > 120 ? 5 : 4;
      for (let i = 0; i < flockCount; i++) {
        const angle = baseAngle + (i - flockCount / 2) * 0.14;
        enemies.push(
          this.createEnemyAtAngle('bat', angle, player, elapsed, allocateId()),
        );
      }
      return { bossSpawned };
    }

    const availableSlots = MAX_ENEMIES - enemies.length;
    const count = Math.min(batchSize, availableSlots);
    for (let i = 0; i < count; i++) {
      const type = this.pickEnemyType(elapsed);
      const angle = Math.random() * Math.PI * 2;
      enemies.push(
        this.createEnemyAtAngle(type, angle, player, elapsed, allocateId()),
      );
    }

    return { bossSpawned };
  }

  private getWaveConfig(elapsed: number): {
    interval: number;
    batchSize: number;
    flockChance: number;
  } {
    if (elapsed < 35) {
      // Gentle start (~1.2-1.5 enemies/s)
      return { interval: 0.78, batchSize: 1, flockChance: 0 };
    }
    if (elapsed < 90) {
      return { interval: 0.68, batchSize: 2, flockChance: 0.22 };
    }
    if (elapsed < 150) {
      return { interval: 0.56, batchSize: 2, flockChance: 0.26 };
    }
    const extraBatch = elapsed > 240 ? 4 : 3;
    return {
      interval: Math.max(0.32, 0.52 - (elapsed - 150) * 0.0009),
      batchSize: extraBatch,
      flockChance: 0.28,
    };
  }

  private pickEnemyType(elapsed: number): EnemyType {
    const r = Math.random();
    if (elapsed < 35) {
      return r < 0.58 ? 'bat' : 'skeleton';
    }
    if (elapsed < 90) {
      if (r < 0.35) return 'bat';
      if (r < 0.76) return 'skeleton';
      return 'zombie';
    }
    if (elapsed < 150) {
      if (r < 0.2) return 'bat';
      if (r < 0.5) return 'skeleton';
      if (r < 0.8) return 'zombie';
      return 'wraith';
    }
    if (r < 0.14) return 'bat';
    if (r < 0.4) return 'skeleton';
    if (r < 0.72) return 'zombie';
    return 'wraith';
  }

  public pickSpawnPointOutsideView(
    playerX: number,
    playerY: number,
    angle: number,
  ): { x: number; y: number } {
    const halfW = VIRTUAL_WIDTH / 2;
    const halfH = VIRTUAL_HEIGHT / 2;
    const pad = 24 + Math.random() * 24; // 24-48px outside 480x270 viewport

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Project ray onto padded screen rectangle so spawns hug the viewport rim evenly
    const tx = Math.abs(cos) > 0.001 ? (halfW + pad) / Math.abs(cos) : Number.POSITIVE_INFINITY;
    const ty = Math.abs(sin) > 0.001 ? (halfH + pad) / Math.abs(sin) : Number.POSITIVE_INFINITY;
    const dist = Math.min(tx, ty);

    return {
      x: playerX + cos * dist,
      y: playerY + sin * dist,
    };
  }

  private createEnemyAtAngle(
    type: EnemyType,
    angle: number,
    player: Player,
    elapsed: number,
    id: number,
  ): Enemy {
    const tpl = ENEMY_TEMPLATES[type];
    const pos = this.pickSpawnPointOutsideView(player.x, player.y, angle);
    const hpScale = tpl.isBoss ? 1 : 1 + elapsed / 180;
    const enhancedChance = Math.min(0.16, 0.09 + ((elapsed - 18) / 180) * 0.07);
    const enhanced = !tpl.isBoss && elapsed >= 18 && Math.random() < enhancedChance;

    const baseHp = Math.round(tpl.hp * hpScale);
    const maxHp = enhanced ? baseHp * 3 : baseHp;
    const damage = enhanced ? tpl.damage * 3 : tpl.damage;
    const xpValue = enhanced ? tpl.xpValue * 3 : tpl.xpValue;

    return {
      id,
      type,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      knockVx: 0,
      knockVy: 0,
      radius: enhanced ? tpl.radius + 1 : tpl.radius,
      hp: maxHp,
      maxHp,
      speed: tpl.speed + (Math.random() * 4 - 2),
      damage,
      xpValue,
      gemKind: enhanced ? 'red' : tpl.gemKind,
      facingX: pos.x >= player.x ? -1 : 1,
      animTimer: Math.random() * 0.5,
      hitFlashTimer: 0,
      isBoss: tpl.isBoss,
      enhanced,
    };
  }
}
