import { SoundEngine } from './audio';
import { WaveSpawner } from './spawner';
import { getSpriteBank, type AnimatedSpriteSet, type SpriteBank } from './sprites';
import {
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
  type DamageNumber,
  type Enemy,
  type GameState,
  type HitEffect,
  type Particle,
  type Pickup,
  type Player,
  type Projectile,
  type SaveRecord,
  type UpgradeId,
  type UpgradeOption,
  type WhipSlash,
  type XpGem,
} from './types';
import {
  applyUpgrade,
  getAuraStats,
  getWandStats,
  getWhipStats,
  rollUpgradeOptions,
} from './weapons';

const RECORD_STORAGE_KEY = 'super-survivors-record';

export interface GameCallbacks {
  onStateChange: (state: GameState) => void;
  onHudUpdate: (player: Player, elapsed: number, kills: number) => void;
  onLevelUpOpen: (player: Player, options: UpgradeOption[]) => void;
  onPauseOpen: (player: Player, elapsed: number, kills: number) => void;
  onGameOver: (
    player: Player,
    elapsed: number,
    kills: number,
    record: SaveRecord,
  ) => void;
  onBossSpawn: () => void;
}

interface PendingWandShot {
  delay: number;
  damage: number;
  speed: number;
  pierce: number;
}

export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sprites: SpriteBank;
  private readonly audio: SoundEngine;
  private readonly callbacks: GameCallbacks;
  private readonly spawner = new WaveSpawner();

  private state: GameState = 'title';
  private player: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private slashes: WhipSlash[] = [];
  private gems: XpGem[] = [];
  private pickups: Pickup[] = [];
  private particles: Particle[] = [];
  private hitEffects: HitEffect[] = [];
  private damageNumbers: DamageNumber[] = [];
  private pendingWandShots: PendingWandShot[] = [];

  private nextEntityId = 1;
  private elapsed = 0;
  private kills = 0;
  private xpCombo = 0;
  private xpComboTimer = 0;
  private idleTimer = 0;
  private stepDustTimer = 0;
  private auraPulseTimer = 0;
  private auraWaveProgress = 1;
  private auraVisualFlash = 0;
  private screenShakeTimer = 0;
  private damageOverlayTimer = 0;
  private levelUpInputLock = 0;
  private currentOptions: UpgradeOption[] = [];

  private keys = new Set<string>();
  private rafId: number | null = null;
  private lastFrameMs = 0;
  private hudSyncAccumulator = 0;
  private record: SaveRecord;

  constructor(
    canvas: HTMLCanvasElement,
    audio: SoundEngine,
    callbacks: GameCallbacks,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.sprites = getSpriteBank();
    this.audio = audio;
    this.callbacks = callbacks;
    this.record = this.loadRecord();
    this.player = this.createInitialPlayer();
  }

  public getState(): GameState {
    return this.state;
  }

  public getRecord(): SaveRecord {
    return this.record;
  }

  public getSprites(): SpriteBank {
    return this.sprites;
  }

  public isLevelUpLocked(): boolean {
    return this.levelUpInputLock > 0;
  }

  public setKey(code: string, down: boolean): void {
    if (down) {
      this.keys.add(code);
    } else {
      this.keys.delete(code);
    }
  }

  public clearKeys(): void {
    this.keys.clear();
  }

  public startLoop(): void {
    if (this.rafId !== null) return;
    this.lastFrameMs = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastFrameMs) / 1000;
      this.lastFrameMs = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public startNewRun(): void {
    this.audio.unlock();
    this.player = this.createInitialPlayer();
    this.enemies = [];
    this.projectiles = [];
    this.slashes = [];
    this.gems = [];
    this.pickups = [];
    this.particles = [];
    this.hitEffects = [];
    this.damageNumbers = [];
    this.pendingWandShots = [];
    this.nextEntityId = 1;
    this.elapsed = 0;
    this.kills = 0;
    this.xpCombo = 0;
    this.xpComboTimer = 0;
    this.idleTimer = 0;
    this.stepDustTimer = 0;
    this.auraPulseTimer = 0;
    this.auraWaveProgress = 1;
    this.auraVisualFlash = 0;
    this.screenShakeTimer = 0;
    this.damageOverlayTimer = 0;
    this.levelUpInputLock = 0;
    this.currentOptions = [];
    this.spawner.reset();
    this.spawner.spawnInitialWave(this.player, this.enemies, () =>
      this.allocateId(),
    );

    this.setState('playing');
    this.callbacks.onHudUpdate(this.player, this.elapsed, this.kills);
  }

  public togglePause(): void {
    if (this.state === 'playing') {
      this.clearKeys();
      this.callbacks.onPauseOpen(this.player, this.elapsed, this.kills);
      this.setState('paused');
    } else if (this.state === 'paused') {
      this.setState('playing');
    }
  }

  public resumeGame(): void {
    if (this.state === 'paused') {
      this.setState('playing');
    }
  }

  public chooseUpgrade(index: number): void {
    if (this.state !== 'levelup' || this.levelUpInputLock > 0) return;
    const option = this.currentOptions[index];
    if (!option) return;

    this.applySelectedUpgrade(option.id);
  }

  private applySelectedUpgrade(id: UpgradeId): void {
    applyUpgrade(this.player, id);
    this.audio.playXp(4);

    // Check if there are still leftover XP levels queued up
    if (this.player.xp >= this.player.xpToNext) {
      this.triggerLevelUp();
    } else {
      this.setState('playing');
      this.callbacks.onHudUpdate(this.player, this.elapsed, this.kills);
    }
  }

  private setState(next: GameState): void {
    this.state = next;
    this.callbacks.onStateChange(next);
  }

  private allocateId(): number {
    return this.nextEntityId++;
  }

  private createInitialPlayer(): Player {
    const level = 1;
    return {
      x: 0,
      y: 0,
      radius: 6,
      hp: 100,
      maxHp: 100,
      baseSpeed: 74,
      speedMult: 1,
      mightMult: 1,
      pickupRadius: 34,
      facingX: 1,
      level,
      xp: 0,
      xpToNext: this.calcXpToNext(level),
      invulnTimer: 0,
      hitFlashTimer: 0,
      walkTimer: 0,
      isMoving: false,
      weapons: {
        whip: { id: 'whip', level: 1, cooldownTimer: 0.25 },
        wand: { id: 'wand', level: 0, cooldownTimer: 0 },
        aura: { id: 'aura', level: 0, cooldownTimer: 0 },
      },
      weaponOrder: ['whip'],
      statStacks: {
        maxHp: 0,
        speed: 0,
        might: 0,
        magnet: 0,
      },
    };
  }

  private calcXpToNext(level: number): number {
    return Math.floor(5 + (level - 1) * 6 + Math.pow(level - 1, 1.45) * 2);
  }

  private loadRecord(): SaveRecord {
    try {
      const raw = localStorage.getItem(RECORD_STORAGE_KEY);
      if (!raw) return { bestTime: 0, bestKills: 0 };
      const parsed = JSON.parse(raw) as Partial<SaveRecord>;
      return {
        bestTime: typeof parsed.bestTime === 'number' ? parsed.bestTime : 0,
        bestKills: typeof parsed.bestKills === 'number' ? parsed.bestKills : 0,
      };
    } catch {
      return { bestTime: 0, bestKills: 0 };
    }
  }

  private saveRecord(): void {
    const updated: SaveRecord = {
      bestTime: Math.max(this.record.bestTime, Math.floor(this.elapsed)),
      bestKills: Math.max(this.record.bestKills, this.kills),
    };
    this.record = updated;
    try {
      localStorage.setItem(RECORD_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  }

  private update(dt: number): void {
    if (this.state === 'levelup') {
      if (this.levelUpInputLock > 0) {
        this.levelUpInputLock = Math.max(0, this.levelUpInputLock - dt);
      }
      return;
    }

    if (this.state !== 'playing') {
      return;
    }

    this.elapsed += dt;
    this.auraPulseTimer += dt;
    this.auraWaveProgress = Math.min(1, this.auraWaveProgress + dt / 0.32);
    if (this.auraVisualFlash > 0) {
      this.auraVisualFlash = Math.max(0, this.auraVisualFlash - dt);
    }
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer = Math.max(0, this.screenShakeTimer - dt);
    }
    if (this.damageOverlayTimer > 0) {
      this.damageOverlayTimer = Math.max(0, this.damageOverlayTimer - dt);
    }
    if (this.xpComboTimer > 0) {
      this.xpComboTimer -= dt;
      if (this.xpComboTimer <= 0) {
        this.xpCombo = 0;
      }
    }

    this.updatePlayer(dt);

    const spawnEvents = this.spawner.update(
      dt,
      this.elapsed,
      this.player,
      this.enemies,
      () => this.allocateId(),
    );
    if (spawnEvents.bossSpawned) {
      this.audio.playBossSpawn();
      this.callbacks.onBossSpawn();
    }

    this.updateWeapons(dt);
    this.updatePendingWandShots(dt);
    this.updateSlashes(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateGems(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateHitEffects(dt);
    this.updateDamageNumbers(dt);

    this.hudSyncAccumulator += dt;
    if (this.hudSyncAccumulator >= 0.08) {
      this.hudSyncAccumulator = 0;
      this.callbacks.onHudUpdate(this.player, this.elapsed, this.kills);
    }
  }

  private updatePlayer(dt: number): void {
    let moveX = 0;
    let moveY = 0;

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveY -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveY += 1;

    if (moveX !== 0 && moveY !== 0) {
      const inv = 1 / Math.SQRT2;
      moveX *= inv;
      moveY *= inv;
    }

    this.player.isMoving = moveX !== 0 || moveY !== 0;
    if (moveX < 0) this.player.facingX = -1;
    else if (moveX > 0) this.player.facingX = 1;

    const speed = this.player.baseSpeed * this.player.speedMult;
    this.player.x += moveX * speed * dt;
    this.player.y += moveY * speed * dt;

    if (this.player.isMoving) {
      this.player.walkTimer += dt * 9.5 * this.player.speedMult;
      this.idleTimer = 0;
      this.stepDustTimer -= dt;
      if (this.stepDustTimer <= 0) {
        this.stepDustTimer = 0.18 / Math.max(0.8, this.player.speedMult);
        const count = Math.random() < 0.45 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          this.particles.push({
            x: this.player.x + (Math.random() * 6 - 3),
            y: this.player.y + 7,
            vx: -moveX * 14 + (Math.random() * 10 - 5),
            vy: -4 - Math.random() * 6,
            size: Math.random() < 0.5 ? 2 : 1,
            color: Math.random() < 0.5 ? '#64748b' : '#475569',
            life: 0.24,
            maxLife: 0.24,
          });
        }
      }
    } else {
      this.player.walkTimer = 0;
      this.idleTimer += dt;
      this.stepDustTimer = 0.04;
    }

    if (this.player.invulnTimer > 0) {
      this.player.invulnTimer = Math.max(0, this.player.invulnTimer - dt);
    }
    if (this.player.hitFlashTimer > 0) {
      this.player.hitFlashTimer = Math.max(0, this.player.hitFlashTimer - dt);
    }
  }

  private updateWeapons(dt: number): void {
    // Whip — Cambuk Darah
    const whipState = this.player.weapons.whip;
    if (whipState.level > 0) {
      whipState.cooldownTimer -= dt;
      if (whipState.cooldownTimer <= 0) {
        const stats = getWhipStats(whipState.level);
        whipState.cooldownTimer = stats.cooldown;
        this.fireWhip(stats);
      }
    }

    // Wand — Tongkat Sihir
    const wandState = this.player.weapons.wand;
    if (wandState.level > 0) {
      wandState.cooldownTimer -= dt;
      if (wandState.cooldownTimer <= 0) {
        const stats = getWandStats(wandState.level);
        wandState.cooldownTimer = stats.cooldown;
        this.fireWand(stats);
      }
    }

    // Aura — Aura Jiwa
    const auraState = this.player.weapons.aura;
    if (auraState.level > 0) {
      auraState.cooldownTimer -= dt;
      if (auraState.cooldownTimer <= 0) {
        const stats = getAuraStats(auraState.level);
        auraState.cooldownTimer = stats.tickInterval;
        this.tickAura(stats);
      }
    }
  }

  private fireWhip(stats: ReturnType<typeof getWhipStats>): void {
    let nearest: Enemy | null = null;
    let bestDistSq = 260 * 260;

    for (const enemy of this.enemies) {
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        nearest = enemy;
      }
    }

    const baseAngle = nearest
      ? Math.atan2(nearest.y - (this.player.y - 2), nearest.x - this.player.x)
      : this.player.facingX >= 0
        ? 0
        : Math.PI;

    const dmg = Math.round(stats.damage * this.player.mightMult);
    this.slashes.push({
      originX: this.player.x,
      originY: this.player.y - 2,
      angle: baseAngle,
      length: stats.width,
      thickness: stats.height,
      damage: dmg,
      knockback: stats.knockback,
      delay: 0,
      timer: 0,
      duration: 0.28,
      hitIds: new Set<number>(),
      playedSound: false,
    });

    if (stats.bothSides) {
      this.slashes.push({
        originX: this.player.x,
        originY: this.player.y - 2,
        angle: baseAngle + Math.PI,
        length: stats.width,
        thickness: stats.height,
        damage: dmg,
        knockback: stats.knockback,
        delay: 0.06,
        timer: 0,
        duration: 0.28,
        hitIds: new Set<number>(),
        playedSound: false,
      });
    }
  }

  private fireWand(stats: ReturnType<typeof getWandStats>): void {
    const dmg = Math.round(stats.damage * this.player.mightMult);
    for (let i = 0; i < stats.count; i++) {
      this.pendingWandShots.push({
        delay: i * 0.08, // staggered 80ms burst
        damage: dmg,
        speed: stats.speed,
        pierce: stats.pierce,
      });
    }
  }

  private updatePendingWandShots(dt: number): void {
    for (let i = this.pendingWandShots.length - 1; i >= 0; i--) {
      const shot = this.pendingWandShots[i];
      shot.delay -= dt;
      if (shot.delay <= 0) {
        this.spawnSingleWandBolt(shot);
        this.pendingWandShots.splice(i, 1);
      }
    }
  }

  private spawnSingleWandBolt(shot: PendingWandShot): void {
    let target: Enemy | null = null;
    let bestDistSq = 240 * 240;

    for (const enemy of this.enemies) {
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        target = enemy;
      }
    }

    let dirX: number = this.player.facingX;
    let dirY = 0;
    if (target) {
      const dx = target.x - this.player.x;
      const dy = target.y - this.player.y;
      const len = Math.hypot(dx, dy) || 1;
      dirX = dx / len;
      dirY = dy / len;
    }

    const angle = Math.atan2(dirY, dirX);
    this.audio.playWand();
    this.hitEffects.push({
      kind: 'cast',
      x: this.player.x + dirX * 7,
      y: this.player.y - 2 + dirY * 7,
      angle,
      radius: 7,
      life: 0.14,
      maxLife: 0.14,
    });
    this.projectiles.push({
      id: this.allocateId(),
      x: this.player.x,
      y: this.player.y - 2,
      vx: dirX * shot.speed,
      vy: dirY * shot.speed,
      angle,
      radius: 4,
      damage: shot.damage,
      pierceLeft: shot.pierce,
      life: 1.5,
      hitIds: new Set<number>(),
      trail: [],
    });
  }

  private tickAura(stats: ReturnType<typeof getAuraStats>): void {
    const dmg = Math.round(stats.damage * this.player.mightMult);
    let hitAny = false;
    this.auraWaveProgress = 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const reach = stats.radius + enemy.radius;
      if (dx * dx + dy * dy <= reach * reach) {
        hitAny = true;
        const dist = Math.hypot(dx, dy) || 1;
        this.hitEffects.push({
          kind: 'soul',
          x: enemy.x,
          y: enemy.y,
          angle: 0,
          radius: 10,
          life: 0.24,
          maxLife: 0.24,
        });
        this.spawnHitParticles(enemy.x, enemy.y - 2, '#c084fc', 3);
        this.damageEnemy(
          enemy,
          i,
          dmg,
          (dx / dist) * stats.knockback,
          (dy / dist) * stats.knockback,
          '#7dd3fc',
        );
      }
    }

    if (hitAny) {
      this.auraVisualFlash = 0.14;
      this.audio.playHit();
    }
  }

  private updateSlashes(dt: number): void {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const slash = this.slashes[i];
      if (slash.delay > 0) {
        slash.delay -= dt;
        if (slash.delay > 0) continue;
      }

      if (!slash.playedSound) {
        slash.playedSound = true;
        this.audio.playWhip();
      }

      slash.timer += dt;
      slash.originX = this.player.x;
      slash.originY = this.player.y - 2;

      const ext = Math.min(1, slash.timer / (slash.duration * 0.38));
      const easedExt = 1 - Math.pow(1 - ext, 3);
      const currentReach = slash.length * easedExt;
      const cos = Math.cos(slash.angle);
      const sin = Math.sin(slash.angle);
      const halfThick = slash.thickness * 0.5;

      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const enemy = this.enemies[eIdx];
        if (slash.hitIds.has(enemy.id)) continue;

        const dx = enemy.x - slash.originX;
        const dy = enemy.y - slash.originY;
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;

        if (
          localX >= -enemy.radius &&
          localX <= currentReach + enemy.radius &&
          Math.abs(localY) <= halfThick + enemy.radius
        ) {
          slash.hitIds.add(enemy.id);
          this.hitEffects.push({
            kind: 'slash',
            x: enemy.x,
            y: enemy.y,
            angle: slash.angle,
            radius: 11,
            life: 0.2,
            maxLife: 0.2,
          });
          // Extra directional blood sparks
          for (let s = 0; s < 4; s++) {
            const spread = slash.angle + (Math.random() - 0.5) * 0.9;
            const spd = 45 + Math.random() * 55;
            this.particles.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(spread) * spd,
              vy: Math.sin(spread) * spd,
              size: s % 2 === 0 ? 2 : 1,
              color: s === 0 ? '#fef2f2' : '#ef4444',
              life: 0.22,
              maxLife: 0.22,
            });
          }
          this.damageEnemy(
            enemy,
            eIdx,
            slash.damage,
            cos * slash.knockback,
            sin * slash.knockback,
            '#fca5a5',
          );
        }
      }

      if (slash.timer >= slash.duration) {
        this.slashes.splice(i, 1);
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.trail.push({ x: proj.x, y: proj.y });
      if (proj.trail.length > 9) {
        proj.trail.shift();
      }

      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;

      let remove = proj.life <= 0;
      if (!remove) {
        for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
          const enemy = this.enemies[eIdx];
          if (proj.hitIds.has(enemy.id)) continue;
          const dx = enemy.x - proj.x;
          const dy = enemy.y - proj.y;
          const hitDist = enemy.radius + proj.radius;
          if (dx * dx + dy * dy <= hitDist * hitDist) {
            proj.hitIds.add(enemy.id);
            const len = Math.hypot(proj.vx, proj.vy) || 1;
            this.hitEffects.push({
              kind: 'arcane',
              x: enemy.x,
              y: enemy.y,
              angle: proj.angle,
              radius: 11,
              life: 0.2,
              maxLife: 0.2,
            });
            this.spawnHitParticles(enemy.x, enemy.y, '#7dd3fc', 4);
            this.damageEnemy(
              enemy,
              eIdx,
              proj.damage,
              (proj.vx / len) * 68,
              (proj.vy / len) * 68,
              '#bae6fd',
            );
            proj.pierceLeft -= 1;
            if (proj.pierceLeft <= 0) {
              remove = true;
              break;
            }
          }
        }
      }

      if (remove) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private damageEnemy(
    enemy: Enemy,
    enemyIndex: number,
    amount: number,
    kbX: number,
    kbY: number,
    numColor: string,
  ): void {
    enemy.hp -= amount;
    enemy.hitFlashTimer = 0.09;
    const kbResist = enemy.isBoss ? 0.15 : 1;
    enemy.knockVx += kbX * kbResist;
    enemy.knockVy += kbY * kbResist;
    this.audio.playHit();

    this.damageNumbers.push({
      x: enemy.x + (Math.random() * 8 - 4),
      y: enemy.y - enemy.radius - 6,
      vy: -24,
      text: `${amount}`,
      color: numColor,
      life: 0.48,
      maxLife: 0.48,
    });

    this.spawnHitParticles(enemy.x, enemy.y, enemy.isBoss ? '#facc15' : '#ef4444', 3);

    if (enemy.hp <= 0) {
      this.handleEnemyDeath(enemy, enemyIndex);
    }
  }

  private handleEnemyDeath(enemy: Enemy, enemyIndex: number): void {
    this.enemies.splice(enemyIndex, 1);
    this.kills += 1;

    this.spawnHitParticles(
      enemy.x,
      enemy.y,
      enemy.type === 'skeleton' || enemy.isBoss ? '#e2e8f0' : '#dc2626',
      enemy.isBoss ? 18 : 7,
    );

    if (enemy.isBoss) {
      // Burst of 5 red gems + guaranteed roast pickup
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 + Math.random() * 0.4;
        const dist = 10 + Math.random() * 12;
        this.gems.push({
          x: enemy.x + Math.cos(angle) * dist,
          y: enemy.y + Math.sin(angle) * dist,
          value: 20,
          kind: 'red',
          magnetized: false,
          speed: 0,
          bobOffset: Math.random() * Math.PI * 2,
        });
      }
      this.pickups.push({
        x: enemy.x,
        y: enemy.y,
        kind: 'roast',
        healAmount: 30,
        bobOffset: 0,
      });
      return;
    }

    this.gems.push({
      x: enemy.x,
      y: enemy.y,
      value: enemy.xpValue,
      kind: enemy.gemKind,
      magnetized: false,
      speed: 0,
      bobOffset: Math.random() * Math.PI * 2,
    });

    if (this.player.hp < this.player.maxHp * 0.75 && Math.random() < 0.015) {
      this.pickups.push({
        x: enemy.x + 4,
        y: enemy.y + 4,
        kind: 'roast',
        healAmount: 30,
        bobOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateEnemies(dt: number): void {
    const px = this.player.x;
    const py = this.player.y;

    // 1. Steer toward player + handle out-of-range wrapping
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = px - e.x;
      const dy = py - e.y;
      const distSq = dx * dx + dy * dy;

      if (!e.isBoss && distSq > 420 * 420) {
        // Reposition far-away non-boss enemies back onto the spawn ring
        const angle = Math.random() * Math.PI * 2;
        const pos = this.spawner.pickSpawnPointOutsideView(px, py, angle);
        e.x = pos.x;
        e.y = pos.y;
        e.knockVx = 0;
        e.knockVy = 0;
        continue;
      }

      const dist = Math.sqrt(distSq) || 1;
      e.vx = (dx / dist) * e.speed;
      e.vy = (dy / dist) * e.speed;
      if (Math.abs(dx) > 1) {
        e.facingX = dx >= 0 ? 1 : -1;
      }

      e.x += (e.vx + e.knockVx) * dt;
      e.y += (e.vy + e.knockVy) * dt;

      // Dampen knockback smoothly
      const damp = Math.exp(-10 * dt);
      e.knockVx *= damp;
      e.knockVy *= damp;
      if (Math.abs(e.knockVx) < 0.5) e.knockVx = 0;
      if (Math.abs(e.knockVy) < 0.5) e.knockVy = 0;

      e.animTimer += dt * (e.type === 'bat' ? 9 : 5);
      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);
      }
    }

    // 2. Spatial hash separation so hordes swarm naturally without stacking on 1 pixel
    const cellSize = 24;
    const grid = new Map<string, number[]>();
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const cx = Math.floor(e.x / cellSize);
      const cy = Math.floor(e.y / cellSize);
      const key = `${cx},${cy}`;
      let bucket = grid.get(key);
      if (!bucket) {
        bucket = [];
        grid.set(key, bucket);
      }
      bucket.push(i);
    }

    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      const cx = Math.floor(a.x / cellSize);
      const cy = Math.floor(a.y / cellSize);

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const bucket = grid.get(`${cx + ox},${cy + oy}`);
          if (!bucket) continue;

          for (const j of bucket) {
            if (j <= i) continue;
            const b = this.enemies[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const minDist = a.radius + b.radius + 1;
            const dSq = dx * dx + dy * dy;
            if (dSq > 0.0001 && dSq < minDist * minDist) {
              const d = Math.sqrt(dSq);
              const overlap = (minDist - d) * 0.45;
              const nx = dx / d;
              const ny = dy / d;
              const aWeight = a.isBoss ? 0.1 : 0.5;
              const bWeight = b.isBoss ? 0.1 : 0.5;
              a.x -= nx * overlap * aWeight;
              a.y -= ny * overlap * aWeight;
              b.x += nx * overlap * bWeight;
              b.y += ny * overlap * bWeight;
            }
          }
        }
      }
    }

    // 3. Contact damage against player
    if (this.player.invulnTimer <= 0) {
      for (const e of this.enemies) {
        const dx = e.x - px;
        const dy = e.y - py;
        const hitR = e.radius + this.player.radius - 1;
        if (dx * dx + dy * dy <= hitR * hitR) {
          this.hurtPlayer(e.damage);
          break;
        }
      }
    }
  }

  private hurtPlayer(amount: number): void {
    this.player.hp = Math.max(0, this.player.hp - amount);
    this.player.invulnTimer = 0.45;
    this.player.hitFlashTimer = 0.16;
    this.screenShakeTimer = 0.16;
    this.damageOverlayTimer = 0.22;
    this.audio.playHurt();

    this.damageNumbers.push({
      x: this.player.x,
      y: this.player.y - 14,
      vy: -22,
      text: `-${amount}`,
      color: '#ef4444',
      life: 0.55,
      maxLife: 0.55,
    });

    this.callbacks.onHudUpdate(this.player, this.elapsed, this.kills);

    if (this.player.hp <= 0) {
      this.triggerGameOver();
    }
  }

  private updateGems(dt: number): void {
    const magnetSq = this.player.pickupRadius * this.player.pickupRadius;
    const collectSq = 10 * 10;
    let gainedXp = 0;

    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      const dx = this.player.x - gem.x;
      const dy = this.player.y - gem.y;
      const dSq = dx * dx + dy * dy;

      if (!gem.magnetized && dSq <= magnetSq) {
        gem.magnetized = true;
        gem.speed = 65;
      }

      if (gem.magnetized) {
        gem.speed = Math.min(280, gem.speed + 420 * dt);
        const dist = Math.sqrt(dSq) || 1;
        gem.x += (dx / dist) * gem.speed * dt;
        gem.y += (dy / dist) * gem.speed * dt;
      }

      if (dSq <= collectSq) {
        gainedXp += gem.value;
        this.gems.splice(i, 1);
        this.xpCombo += 1;
        this.xpComboTimer = 0.55;
        this.audio.playXp(this.xpCombo);
      }
    }

    if (gainedXp > 0) {
      this.player.xp += gainedXp;
      if (this.player.xp >= this.player.xpToNext) {
        this.triggerLevelUp();
      }
    }
  }

  private triggerLevelUp(): void {
    this.player.xp -= this.player.xpToNext;
    this.player.level += 1;
    this.player.xpToNext = this.calcXpToNext(this.player.level);

    this.clearKeys();
    this.levelUpInputLock = 0.35;
    this.currentOptions = rollUpgradeOptions(this.player);
    this.audio.playLevelUp();
    this.callbacks.onHudUpdate(this.player, this.elapsed, this.kills);
    this.setState('levelup');
    this.callbacks.onLevelUpOpen(this.player, this.currentOptions);
  }

  private updatePickups(dt: number): void {
    const attractSq = (this.player.pickupRadius * 0.8) ** 2;
    const collectSq = 12 * 12;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const dx = this.player.x - p.x;
      const dy = this.player.y - p.y;
      const dSq = dx * dx + dy * dy;

      if (dSq <= attractSq) {
        const dist = Math.sqrt(dSq) || 1;
        p.x += (dx / dist) * 140 * dt;
        p.y += (dy / dist) * 140 * dt;
      }

      if (dSq <= collectSq) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + p.healAmount);
        this.audio.playHeal();
        this.damageNumbers.push({
          x: this.player.x,
          y: this.player.y - 14,
          vy: -20,
          text: `+${p.healAmount} HP`,
          color: '#4ade80',
          life: 0.65,
          maxLife: 0.65,
        });
        this.pickups.splice(i, 1);
      }
    }
  }

  private spawnHitParticles(
    x: number,
    y: number,
    color: string,
    count: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 65;
      const life = 0.18 + Math.random() * 0.22;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() < 0.65 ? 2 : 1,
        color,
        life,
        maxLife: life,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateHitEffects(dt: number): void {
    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      const eff = this.hitEffects[i];
      eff.life -= dt;
      if (eff.life <= 0) {
        this.hitEffects.splice(i, 1);
      }
    }
  }

  private updateDamageNumbers(dt: number): void {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.y += d.vy * dt;
      d.life -= dt;
      if (d.life <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  private triggerGameOver(): void {
    this.clearKeys();
    this.saveRecord();
    this.audio.playGameOver();
    this.setState('gameover');
    this.callbacks.onGameOver(this.player, this.elapsed, this.kills, this.record);
  }

  // =========================================================================
  // RENDERING
  // =========================================================================

  private render(): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;

    const shakeX =
      this.screenShakeTimer > 0 ? Math.round((Math.random() - 0.5) * 5) : 0;
    const shakeY =
      this.screenShakeTimer > 0 ? Math.round((Math.random() - 0.5) * 5) : 0;

    const camX = Math.round(this.player.x - VIRTUAL_WIDTH / 2) + shakeX;
    const camY = Math.round(this.player.y - VIRTUAL_HEIGHT / 2) + shakeY;

    ctx.fillStyle = '#0d0a18';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // 1. Infinite tiled gothic graveyard ground + deterministic decorations
    this.renderEnvironment(ctx, camX, camY);

    // 2. Aura rune ring beneath entities
    if (this.player.weapons.aura.level > 0) {
      this.renderAuraRing(ctx, camX, camY);
    }

    // 3. XP Gems & Pickups
    this.renderDrops(ctx, camX, camY);

    // 4. Y-sorted entities (enemies + player)
    this.renderEntities(ctx, camX, camY);

    // 5. Whip slashes, Wand projectiles & Extra hit effects
    this.renderSlashes(ctx, camX, camY);
    this.renderProjectiles(ctx, camX, camY);
    this.renderHitEffects(ctx, camX, camY);

    // 6. Particles & floating pixel damage numbers
    this.renderParticlesAndNumbers(ctx, camX, camY);

    // 7. Atmospheric dark vignette & hurt flash
    this.renderAtmosphere(ctx);
  }

  private hashTile(tx: number, ty: number): number {
    let h = (tx * 374761393 + ty * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }

  private renderEnvironment(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
  ): void {
    const tileSize = 16;
    const startTx = Math.floor(camX / tileSize) - 1;
    const endTx = Math.floor((camX + VIRTUAL_WIDTH) / tileSize) + 1;
    const startTy = Math.floor(camY / tileSize) - 1;
    const endTy = Math.floor((camY + VIRTUAL_HEIGHT) / tileSize) + 1;

    const propsToDraw: Array<{ kind: 'stone' | 'bush'; sx: number; sy: number }> = [];

    for (let ty = startTy; ty <= endTy; ty++) {
      for (let tx = startTx; tx <= endTx; tx++) {
        const hash = this.hashTile(tx, ty);
        const sx = tx * tileSize - camX;
        const sy = ty * tileSize - camY;

        // Subtle gothic cobblestone path strips every ~18 tiles
        const isPath =
          Math.abs((tx + Math.floor(Math.sin(ty * 0.2) * 2)) % 18) <= 1;

        if (isPath) {
          ctx.drawImage(this.sprites.cobbleTile, sx, sy);
        } else {
          const variant = hash % this.sprites.groundTiles.length;
          ctx.drawImage(this.sprites.groundTiles[variant], sx, sy);

          // Sparse gravestones & withered bushes (never on cobble paths)
          const propRoll = (hash >>> 8) % 100;
          if (propRoll === 0) {
            propsToDraw.push({ kind: 'stone', sx: sx + 2, sy: sy + 1 });
          } else if (propRoll === 1 || propRoll === 2) {
            propsToDraw.push({ kind: 'bush', sx: sx + 2, sy: sy + 3 });
          }
        }
      }
    }

    for (const prop of propsToDraw) {
      if (prop.kind === 'stone') {
        ctx.drawImage(this.sprites.gravestone, prop.sx, prop.sy);
      } else {
        ctx.drawImage(this.sprites.bush, prop.sx, prop.sy);
      }
    }
  }

  private renderAuraRing(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
  ): void {
    const stats = getAuraStats(this.player.weapons.aura.level);
    const cx = Math.round(this.player.x - camX);
    const cy = Math.round(this.player.y - camY);
    const pulse = Math.sin(this.auraPulseTimer * 4.5);
    const r = Math.round(stats.radius + pulse * 1.5);

    ctx.save();
    // Soft pulsing radial aura field
    const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.02)');
    grad.addColorStop(
      0.78,
      this.auraVisualFlash > 0
        ? 'rgba(56, 189, 248, 0.22)'
        : 'rgba(139, 92, 246, 0.1)',
    );
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.03)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Expanding pulse shockwave on each aura tick
    if (this.auraWaveProgress < 1) {
      const waveEased = 1 - Math.pow(1 - this.auraWaveProgress, 2);
      const waveR = Math.round(Math.max(4, stats.radius * waveEased));
      const waveAlpha = Math.max(0, 1 - this.auraWaveProgress) * 0.8;
      const waveDots = Math.max(14, Math.floor(waveR * 0.65));
      ctx.fillStyle = `rgba(186, 230, 253, ${waveAlpha.toFixed(3)})`;
      for (let i = 0; i < waveDots; i++) {
        const a = (Math.PI * 2 * i) / waveDots;
        ctx.fillRect(
          Math.round(cx + Math.cos(a) * waveR),
          Math.round(cy + Math.sin(a) * waveR),
          2,
          2,
        );
      }
    }

    // Outer rotating pixel rune perimeter
    const dotCount = Math.max(18, Math.floor(r * 0.6));
    const spin = this.auraPulseTimer * 1.1;
    for (let i = 0; i < dotCount; i++) {
      const a = spin + (Math.PI * 2 * i) / dotCount;
      const dx = Math.round(cx + Math.cos(a) * r);
      const dy = Math.round(cy + Math.sin(a) * r);
      ctx.fillStyle =
        this.auraVisualFlash > 0
          ? '#e0f2fe'
          : i % 2 === 0
            ? 'rgba(56, 189, 248, 0.78)'
            : 'rgba(168, 85, 247, 0.72)';
      ctx.fillRect(dx, dy, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }

    // Inner counter-rotating glyph ring
    const innerR = Math.round(r * 0.72);
    const innerCount = Math.max(8, Math.floor(innerR * 0.32));
    const innerSpin = -this.auraPulseTimer * 1.6;
    for (let i = 0; i < innerCount; i++) {
      const a = innerSpin + (Math.PI * 2 * i) / innerCount;
      const dx = Math.round(cx + Math.cos(a) * innerR);
      const dy = Math.round(cy + Math.sin(a) * innerR);
      ctx.fillStyle = 'rgba(192, 132, 252, 0.5)';
      ctx.fillRect(dx, dy, 1, 1);
    }
    ctx.restore();
  }

  private renderDrops(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
  ): void {
    for (const gem of this.gems) {
      const bob = Math.round(Math.sin(this.elapsed * 5 + gem.bobOffset));
      const sprite = this.sprites.gems[gem.kind];
      const sx = Math.round(gem.x - camX - sprite.width / 2);
      const sy = Math.round(gem.y - camY - sprite.height / 2 + bob);

      if (
        sx + sprite.width < 0 ||
        sx > VIRTUAL_WIDTH ||
        sy + sprite.height < 0 ||
        sy > VIRTUAL_HEIGHT
      ) {
        continue;
      }

      ctx.drawImage(sprite, sx, sy);
    }

    for (const pickup of this.pickups) {
      const bob = Math.round(Math.sin(this.elapsed * 4 + pickup.bobOffset));
      const sprite = this.sprites.roast;
      const sx = Math.round(pickup.x - camX - sprite.width / 2);
      const sy = Math.round(pickup.y - camY - sprite.height / 2 + bob);
      ctx.drawImage(sprite, sx, sy);
    }
  }

  private renderEntities(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
  ): void {
    type DrawItem =
      | { kind: 'player'; y: number }
      | { kind: 'enemy'; y: number; enemy: Enemy };

    const items: DrawItem[] = [{ kind: 'player', y: this.player.y }];
    for (const e of this.enemies) {
      items.push({ kind: 'enemy', y: e.y, enemy: e });
    }
    items.sort((a, b) => a.y - b.y);

    for (const item of items) {
      if (item.kind === 'player') {
        this.renderPlayer(ctx, camX, camY);
      } else {
        this.renderEnemy(ctx, camX, camY, item.enemy);
      }
    }
  }

  private pickFrame(
    set: AnimatedSpriteSet,
    facingX: 1 | -1,
    frameIdx: number,
    flash: boolean,
  ): HTMLCanvasElement {
    const idx = frameIdx % set.framesRight.length;
    if (flash) {
      return facingX >= 0 ? set.flashRight[idx] : set.flashLeft[idx];
    }
    return facingX >= 0 ? set.framesRight[idx] : set.framesLeft[idx];
  }

  private renderPlayer(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
  ): void {
    const px = Math.round(this.player.x - camX);
    const py = Math.round(this.player.y - camY);

    const frameIdx = this.player.isMoving
      ? Math.floor(this.player.walkTimer) % 4
      : Math.floor(this.idleTimer * 2.5) % 2;

    // Ground shadow narrows slightly on passing bounce frames (1 & 3)
    const isPassingBounce =
      this.player.isMoving && (frameIdx === 1 || frameIdx === 3);
    const shadowW = isPassingBounce ? 8 : 10;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.fillRect(px - shadowW / 2, py + 5, shadowW, 3);

    const isFlash = this.player.hitFlashTimer > 0;

    // Blink briefly during post-hit invulnerability
    const blinkHide =
      this.player.invulnTimer > 0 &&
      !isFlash &&
      Math.floor(this.player.invulnTimer * 24) % 2 === 0;

    if (!blinkHide) {
      const spriteSet = this.player.isMoving
        ? this.sprites.hero
        : this.sprites.heroIdle;
      const sprite = this.pickFrame(
        spriteSet,
        this.player.facingX,
        frameIdx,
        isFlash,
      );
      ctx.drawImage(
        sprite,
        Math.round(px - sprite.width / 2),
        Math.round(py - sprite.height / 2),
      );
    }

    // Crisp mini HP bar beneath player
    const barW = 16;
    const barX = px - barW / 2;
    const barY = py + 10;
    const hpRatio = Math.max(0, Math.min(1, this.player.hp / this.player.maxHp));
    ctx.fillStyle = '#090711';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 4);
    ctx.fillStyle = '#3f0f19';
    ctx.fillRect(barX, barY, barW, 2);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(barX, barY, Math.round(barW * hpRatio), 2);
  }

  private renderEnemy(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    e: Enemy,
  ): void {
    const ex = Math.round(e.x - camX);
    const ey = Math.round(e.y - camY);
    const set = this.sprites.enemies[e.type];

    if (
      ex + set.width < -10 ||
      ex - set.width > VIRTUAL_WIDTH + 10 ||
      ey + set.height < -10 ||
      ey - set.height > VIRTUAL_HEIGHT + 10
    ) {
      return;
    }

    // Boss crimson aura ring on the ground
    if (e.isBoss) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.25)';
      ctx.fillRect(ex - 11, ey + 6, 22, 6);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(ex - 10, ey + 8, 20, 2);
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.fillRect(ex - 4, ey + Math.round(set.height / 2) - 2, 8, 2);
    }

    const frameIdx = Math.floor(e.animTimer) % 2;
    const sprite = this.pickFrame(
      set,
      e.facingX,
      frameIdx,
      e.hitFlashTimer > 0,
    );
    ctx.drawImage(
      sprite,
      Math.round(ex - sprite.width / 2),
      Math.round(ey - sprite.height / 2),
    );

    // Boss mini health bar
    if (e.isBoss) {
      const barW = 24;
      const barX = ex - barW / 2;
      const barY = ey - Math.round(set.height / 2) - 6;
      const ratio = Math.max(0, Math.min(1, e.hp / e.maxHp));
      ctx.fillStyle = '#090711';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, 4);
      ctx.fillStyle = '#3f0f19';
      ctx.fillRect(barX, barY, barW, 2);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(barX, barY, Math.round(barW * ratio), 2);
    }
  }

  private renderSlashes(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
  ): void {
    for (const s of this.slashes) {
      if (s.delay > 0) continue;

      const progress = Math.min(1, s.timer / s.duration);
      const ext = Math.min(1, s.timer / (s.duration * 0.38));
      const easedExt = 1 - Math.pow(1 - ext, 3);
      const currentReach = s.length * easedExt;
      const alpha = progress < 0.55 ? 1 : Math.max(0, 1 - (progress - 0.55) / 0.45);

      const ox = Math.round(s.originX - camX);
      const oy = Math.round(s.originY - camY);

      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(s.angle);
      ctx.globalAlpha = alpha;

      // Subtle fading curved sweep trail behind the lash
      ctx.fillStyle = 'rgba(153, 27, 27, 0.45)';
      const trailWidth = Math.max(6, Math.round(currentReach * 0.92));
      ctx.fillRect(4, -Math.round(s.thickness * 0.3), trailWidth, Math.round(s.thickness * 0.6));

      // Articulated 16-segment undulating lash snapping taut
      const segments = 16;
      const snapFactor = Math.max(0, 1 - Math.abs(progress - 0.42) * 2.2);
      const waveAmp = (1 - snapFactor * 0.82) * (s.thickness * 0.36);

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const lx = Math.round(4 + t * Math.max(0, currentReach - 4));
        const wave = Math.sin(t * 9 - progress * 14) * waveAmp * Math.sin(t * Math.PI);
        const ly = Math.round(wave);

        const outerSize = t > 0.78 ? 5 : 6;
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(lx - 1, ly - Math.floor(outerSize / 2), outerSize, outerSize);

        const coreSize = t > 0.85 ? 3 : 4;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(lx, ly - Math.floor(coreSize / 2), coreSize, coreSize);

        ctx.fillStyle = '#fef2f2';
        ctx.fillRect(lx, ly - 1, 2, 2);
      }

      // Bright 4-point tip flash during peak whip crack
      if (progress >= 0.28 && progress <= 0.62) {
        const tipX = Math.round(currentReach);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tipX - 5, -1, 10, 2);
        ctx.fillRect(tipX - 1, -5, 2, 10);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(tipX - 3, -3, 6, 6);
      }

      ctx.restore();
    }
  }

  private renderProjectiles(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
  ): void {
    const bolt = this.sprites.wandBolt;
    for (const proj of this.projectiles) {
      // Smooth tapering arcane trail
      for (let i = 0; i < proj.trail.length; i++) {
        const t = proj.trail[i];
        const ratio = (i + 1) / proj.trail.length;
        const size = ratio > 0.66 ? 4 : ratio > 0.33 ? 3 : 2;
        ctx.fillStyle =
          ratio > 0.66
            ? `rgba(186, 230, 253, ${(ratio * 0.75).toFixed(2)})`
            : ratio > 0.33
              ? `rgba(56, 189, 248, ${(ratio * 0.6).toFixed(2)})`
              : `rgba(99, 102, 241, ${(ratio * 0.45).toFixed(2)})`;
        ctx.fillRect(
          Math.round(t.x - camX - size / 2),
          Math.round(t.y - camY - size / 2),
          size,
          size,
        );
      }

      const px = Math.round(proj.x - camX);
      const py = Math.round(proj.y - camY);

      // Pulsing core halo around projectile
      const haloR = 5 + Math.round(Math.sin(this.elapsed * 20 + proj.id));
      ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.fillRect(px - haloR, py - haloR, haloR * 2, haloR * 2);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(proj.angle);
      ctx.drawImage(
        bolt,
        -Math.round(bolt.width / 2),
        -Math.round(bolt.height / 2),
      );
      ctx.restore();
    }
  }

  private renderHitEffects(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
  ): void {
    for (const eff of this.hitEffects) {
      const progress = 1 - eff.life / eff.maxLife;
      const alpha = Math.max(0, 1 - progress);
      const sx = Math.round(eff.x - camX);
      const sy = Math.round(eff.y - camY);

      ctx.save();
      ctx.globalAlpha = alpha;

      if (eff.kind === 'slash') {
        // Crisp crimson-white diagonal razor tear
        ctx.translate(sx, sy);
        ctx.rotate(eff.angle);
        const span = Math.round(5 + progress * eff.radius);
        ctx.fillStyle = '#dc2626';
        for (let d = -span; d <= span; d += 2) {
          ctx.fillRect(d - 1, Math.round(d * 0.35) - 1, 3, 3);
          ctx.fillRect(d - 1, Math.round(-d * 0.35) - 1, 3, 3);
        }
        ctx.fillStyle = '#fef2f2';
        for (let d = -span + 2; d <= span - 2; d += 2) {
          ctx.fillRect(d, Math.round(d * 0.35), 2, 2);
          ctx.fillRect(d, Math.round(-d * 0.35), 2, 2);
        }
      } else if (eff.kind === 'arcane') {
        // Expanding cyan pixel shock-ring + 4-way star burst
        const r = Math.round(3 + progress * eff.radius);
        const dots = 12;
        ctx.fillStyle = '#38bdf8';
        for (let i = 0; i < dots; i++) {
          const a = (Math.PI * 2 * i) / dots + progress * 1.2;
          ctx.fillRect(
            Math.round(sx + Math.cos(a) * r) - 1,
            Math.round(sy + Math.sin(a) * r) - 1,
            2,
            2,
          );
        }
        const ray = Math.round(3 + (1 - progress) * 6);
        ctx.fillStyle = '#f0f9ff';
        ctx.fillRect(sx - ray, sy, ray * 2 + 1, 1);
        ctx.fillRect(sx, sy - ray, 1, ray * 2 + 1);
      } else if (eff.kind === 'soul') {
        // Violet-cyan soul rune ring + rising spectral wisps
        const r = Math.round(4 + progress * eff.radius);
        const dots = 10;
        for (let i = 0; i < dots; i++) {
          const a = (Math.PI * 2 * i) / dots - progress * 1.8;
          ctx.fillStyle = i % 2 === 0 ? '#c084fc' : '#38bdf8';
          ctx.fillRect(
            Math.round(sx + Math.cos(a) * r) - 1,
            Math.round(sy + Math.sin(a) * r) - 1,
            2,
            2,
          );
        }
        const lift = Math.round(progress * 9);
        ctx.fillStyle = '#e9d5ff';
        ctx.fillRect(sx - 3, sy - 3 - lift, 2, 3);
        ctx.fillRect(sx + 2, sy - 5 - lift, 2, 3);
      } else {
        // Muzzle cast flash when firing wand bolt
        const arm = Math.round(2 + (1 - progress) * 4);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx - arm, sy - 1, arm * 2 + 1, 2);
        ctx.fillRect(sx - 1, sy - arm, 2, arm * 2 + 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy - 1, 3, 3);
      }

      ctx.restore();
    }
  }

  private renderParticlesAndNumbers(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
  ): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    if (this.damageNumbers.length > 0) {
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      for (const d of this.damageNumbers) {
        const sx = Math.round(d.x - camX);
        const sy = Math.round(d.y - camY);
        ctx.globalAlpha = Math.min(1, (d.life / d.maxLife) * 1.4);
        ctx.fillStyle = '#090711';
        ctx.fillText(d.text, sx + 1, sy + 1);
        ctx.fillStyle = d.color;
        ctx.fillText(d.text, sx, sy);
      }
      ctx.globalAlpha = 1;
    }
  }

  private renderAtmosphere(ctx: CanvasRenderingContext2D): void {
    // Subtle dark gothic radial vignette
    const grad = ctx.createRadialGradient(
      VIRTUAL_WIDTH / 2,
      VIRTUAL_HEIGHT / 2,
      VIRTUAL_HEIGHT * 0.35,
      VIRTUAL_WIDTH / 2,
      VIRTUAL_HEIGHT / 2,
      VIRTUAL_WIDTH * 0.68,
    );
    grad.addColorStop(0, 'rgba(9, 7, 17, 0)');
    grad.addColorStop(1, 'rgba(6, 4, 12, 0.56)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Brief crimson border flash on player damage
    if (this.damageOverlayTimer > 0) {
      const alpha = (this.damageOverlayTimer / 0.22) * 0.35;
      ctx.strokeStyle = `rgba(220, 38, 38, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    }
  }
}
