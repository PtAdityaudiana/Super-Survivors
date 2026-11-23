import type { SoundEngine } from './audio';
import type { Game } from './game';
import type {
  GameState,
  Player,
  SaveRecord,
  UpgradeOption,
  WeaponId,
} from './types';
import { WEAPON_NAMES, getWeaponDetail } from './weapons';

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export class GameUI {
  private readonly game: Game;
  private readonly audio: SoundEngine;

  // Overlays & HUD roots
  private readonly hudEl: HTMLElement;
  private readonly titleScreenEl: HTMLElement;
  private readonly levelupModalEl: HTMLElement;
  private readonly pauseModalEl: HTMLElement;
  private readonly gameoverModalEl: HTMLElement;

  // HUD dynamic elements
  private readonly xpFillEl: HTMLElement;
  private readonly levelBadgeEl: HTMLElement;
  private readonly weaponSlotsEl: HTMLElement;
  private readonly timerDisplayEl: HTMLElement;
  private readonly hpFillHudEl: HTMLElement;
  private readonly hpTextEl: HTMLElement;
  private readonly killCountEl: HTMLElement;
  private readonly bossBannerEl: HTMLElement;

  // Buttons & Modal fields
  private readonly btnMuteEl: HTMLButtonElement;
  private readonly btnPauseEl: HTMLButtonElement;
  private readonly btnStartEl: HTMLButtonElement;
  private readonly btnResumeEl: HTMLButtonElement;
  private readonly btnRestartPauseEl: HTMLButtonElement;
  private readonly btnRetryEl: HTMLButtonElement;
  private readonly titleHeroImgEl: HTMLImageElement;
  private readonly titleRecordEl: HTMLElement;
  private readonly levelupTitleEl: HTMLElement;
  private readonly upgradeCardsEl: HTMLElement;
  private readonly pauseHpEl: HTMLElement;
  private readonly pauseHpBarEl: HTMLElement;
  private readonly pauseLevelEl: HTMLElement;
  private readonly pauseTimeEl: HTMLElement;
  private readonly pauseKillsEl: HTMLElement;
  private readonly pauseSpeedEl: HTMLElement;
  private readonly pauseMightEl: HTMLElement;
  private readonly pauseMagnetEl: HTMLElement;
  private readonly pausePassivesEl: HTMLElement;
  private readonly pauseWeaponsListEl: HTMLElement;
  private readonly goTimeEl: HTMLElement;
  private readonly goLevelEl: HTMLElement;
  private readonly goKillsEl: HTMLElement;
  private readonly goBestEl: HTMLElement;
  private readonly goWeaponsEl: HTMLElement;

  // Cached values to avoid redundant DOM writes
  private lastTimerText = '';
  private lastLevelText = '';
  private lastXpPct = '';
  private lastHpPct = '';
  private lastHpText = '';
  private lastKillText = '';
  private lastWeaponsSig = '';
  private bossBannerTimer: number | null = null;

  constructor(game: Game, audio: SoundEngine) {
    this.game = game;
    this.audio = audio;

    this.hudEl = this.mustGet('hud');
    this.titleScreenEl = this.mustGet('title-screen');
    this.levelupModalEl = this.mustGet('levelup-modal');
    this.pauseModalEl = this.mustGet('pause-modal');
    this.gameoverModalEl = this.mustGet('gameover-modal');

    this.xpFillEl = this.mustGet('xp-fill');
    this.levelBadgeEl = this.mustGet('level-badge');
    this.weaponSlotsEl = this.mustGet('weapon-slots');
    this.timerDisplayEl = this.mustGet('timer-display');
    this.hpFillHudEl = this.mustGet('hp-fill-hud');
    this.hpTextEl = this.mustGet('hp-text');
    this.killCountEl = this.mustGet('kill-count');
    this.bossBannerEl = this.mustGet('boss-banner');

    this.btnMuteEl = this.mustGet('btn-mute') as HTMLButtonElement;
    this.btnPauseEl = this.mustGet('btn-pause') as HTMLButtonElement;
    this.btnStartEl = this.mustGet('btn-start') as HTMLButtonElement;
    this.btnResumeEl = this.mustGet('btn-resume') as HTMLButtonElement;
    this.btnRestartPauseEl = this.mustGet(
      'btn-restart-pause',
    ) as HTMLButtonElement;
    this.btnRetryEl = this.mustGet('btn-retry') as HTMLButtonElement;
    this.titleHeroImgEl = this.mustGet('title-hero-img') as HTMLImageElement;
    this.titleRecordEl = this.mustGet('title-record');
    this.levelupTitleEl = this.mustGet('levelup-title');
    this.upgradeCardsEl = this.mustGet('upgrade-cards');
    this.pauseHpEl = this.mustGet('pause-hp');
    this.pauseHpBarEl = this.mustGet('pause-hp-bar');
    this.pauseLevelEl = this.mustGet('pause-level');
    this.pauseTimeEl = this.mustGet('pause-time');
    this.pauseKillsEl = this.mustGet('pause-kills');
    this.pauseSpeedEl = this.mustGet('pause-speed');
    this.pauseMightEl = this.mustGet('pause-might');
    this.pauseMagnetEl = this.mustGet('pause-magnet');
    this.pausePassivesEl = this.mustGet('pause-passives');
    this.pauseWeaponsListEl = this.mustGet('pause-weapons-list');
    this.goTimeEl = this.mustGet('go-time');
    this.goLevelEl = this.mustGet('go-level');
    this.goKillsEl = this.mustGet('go-kills');
    this.goBestEl = this.mustGet('go-best');
    this.goWeaponsEl = this.mustGet('go-weapons');

    this.initStaticViews();
    this.bindEvents();
  }

  private mustGet(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Missing DOM element #${id}`);
    }
    return el;
  }

  private initStaticViews(): void {
    const sprites = this.game.getSprites();
    this.titleHeroImgEl.src = sprites.heroPreviewUrl;
    this.updateTitleRecord(this.game.getRecord());
    this.syncMuteLabel();
  }

  private updateTitleRecord(record: SaveRecord): void {
    this.titleRecordEl.textContent = `REKOR TERBAIK: ${formatTime(record.bestTime)} • ${record.bestKills} KORBAN`;
  }

  private syncMuteLabel(): void {
    this.btnMuteEl.textContent = this.audio.isMuted() ? 'SFX OFF' : 'SFX ON';
  }

  private bindEvents(): void {
    this.btnStartEl.addEventListener('click', () => {
      this.game.startNewRun();
    });

    this.btnRetryEl.addEventListener('click', () => {
      this.game.startNewRun();
    });

    this.btnResumeEl.addEventListener('click', () => {
      this.game.resumeGame();
    });

    this.btnRestartPauseEl.addEventListener('click', () => {
      this.game.startNewRun();
    });

    this.btnPauseEl.addEventListener('click', () => {
      this.game.togglePause();
    });

    this.btnMuteEl.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.toggleMute();
      this.syncMuteLabel();
    });

    window.addEventListener('keydown', (e) => {
      const code = e.code;

      if (
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'Space'
      ) {
        e.preventDefault();
      }

      if (code === 'KeyM' && !e.repeat) {
        this.audio.unlock();
        this.audio.toggleMute();
        this.syncMuteLabel();
        return;
      }

      const state = this.game.getState();

      if (state === 'title') {
        if ((code === 'Enter' || code === 'Space') && !e.repeat) {
          this.game.startNewRun();
        }
        return;
      }

      if (state === 'gameover') {
        if ((code === 'Enter' || code === 'Space') && !e.repeat) {
          this.game.startNewRun();
        }
        return;
      }

      if (state === 'levelup') {
        if (!e.repeat && !this.game.isLevelUpLocked()) {
          if (code === 'Digit1' || code === 'Numpad1') this.game.chooseUpgrade(0);
          else if (code === 'Digit2' || code === 'Numpad2') this.game.chooseUpgrade(1);
          else if (code === 'Digit3' || code === 'Numpad3') this.game.chooseUpgrade(2);
        }
        return;
      }

      if ((code === 'Escape' || code === 'KeyP') && !e.repeat) {
        this.game.togglePause();
        return;
      }

      if (state === 'playing') {
        this.game.setKey(code, true);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.game.setKey(e.code, false);
    });

    window.addEventListener('blur', () => {
      this.game.clearKeys();
    });
  }

  public handleStateChange(state: GameState): void {
    this.titleScreenEl.classList.toggle('hidden', state !== 'title');
    this.levelupModalEl.classList.toggle('hidden', state !== 'levelup');
    this.pauseModalEl.classList.toggle('hidden', state !== 'paused');
    this.gameoverModalEl.classList.toggle('hidden', state !== 'gameover');

    const showHud = state !== 'title';
    this.hudEl.classList.toggle('hidden', !showHud);
    this.hudEl.setAttribute('aria-hidden', showHud ? 'false' : 'true');

    if (state === 'title') {
      this.updateTitleRecord(this.game.getRecord());
    }
    if (state === 'playing' || state === 'title') {
      // Clear cached weapon sig on fresh runs
      if (state === 'title') this.lastWeaponsSig = '';
    }
  }

  public updateHud(player: Player, elapsed: number, kills: number): void {
    const timerText = formatTime(elapsed);
    if (timerText !== this.lastTimerText) {
      this.lastTimerText = timerText;
      this.timerDisplayEl.textContent = timerText;
    }

    const levelText = `LV ${player.level}`;
    if (levelText !== this.lastLevelText) {
      this.lastLevelText = levelText;
      this.levelBadgeEl.textContent = levelText;
    }

    const xpPct = `${Math.min(100, Math.max(0, (player.xp / player.xpToNext) * 100)).toFixed(1)}%`;
    if (xpPct !== this.lastXpPct) {
      this.lastXpPct = xpPct;
      this.xpFillEl.style.width = xpPct;
    }

    const hpPct = `${Math.min(100, Math.max(0, (player.hp / player.maxHp) * 100)).toFixed(1)}%`;
    if (hpPct !== this.lastHpPct) {
      this.lastHpPct = hpPct;
      this.hpFillHudEl.style.width = hpPct;
    }

    const hpText = `${Math.ceil(player.hp)}/${player.maxHp}`;
    if (hpText !== this.lastHpText) {
      this.lastHpText = hpText;
      this.hpTextEl.textContent = hpText;
    }

    const killText = String(kills);
    if (killText !== this.lastKillText) {
      this.lastKillText = killText;
      this.killCountEl.textContent = killText;
    }

    const sig = (['whip', 'wand', 'aura'] as WeaponId[])
      .map((id) => `${id}:${player.weapons[id].level}`)
      .join('|');
    if (sig !== this.lastWeaponsSig) {
      this.lastWeaponsSig = sig;
      this.renderWeaponSlots(player);
    }
  }

  private renderWeaponSlots(player: Player): void {
    const sprites = this.game.getSprites();
    this.weaponSlotsEl.replaceChildren();

    const maxSlots = 3;
    for (let i = 0; i < maxSlots; i++) {
      const slot = document.createElement('div');
      const wid = player.weaponOrder[i];
      if (!wid) {
        slot.className = 'weapon-slot empty';
        this.weaponSlotsEl.appendChild(slot);
        continue;
      }

      const wState = player.weapons[wid];
      slot.className = 'weapon-slot';
      slot.title = `${WEAPON_NAMES[wid]} (Lv ${wState.level})`;

      const img = document.createElement('img');
      img.className = 'pixel-img';
      img.src = sprites.icons[wid];
      img.alt = WEAPON_NAMES[wid];

      const lv = document.createElement('span');
      lv.className = 'weapon-slot-lv';
      lv.textContent = `${wState.level}`;

      slot.append(img, lv);
      this.weaponSlotsEl.appendChild(slot);
    }
  }

  public showLevelUp(player: Player, options: UpgradeOption[]): void {
    const sprites = this.game.getSprites();
    this.levelupTitleEl.textContent = `PILIH PENINGKATAN (LV ${player.level})`;
    this.upgradeCardsEl.replaceChildren();

    options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'upgrade-card';

      const hotkey = document.createElement('span');
      hotkey.className = 'card-hotkey';
      hotkey.textContent = `[${idx + 1}]`;

      const badge = document.createElement('span');
      badge.className = `card-badge ${opt.badgeKind}`;
      badge.textContent = opt.badgeText;

      const iconWrap = document.createElement('div');
      iconWrap.className = 'card-icon-wrap';
      const img = document.createElement('img');
      img.className = 'pixel-img';
      img.src = sprites.icons[opt.iconKey];
      img.alt = opt.title;
      iconWrap.appendChild(img);

      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = opt.title;

      const desc = document.createElement('div');
      desc.className = 'card-desc';
      desc.textContent = opt.description;

      btn.append(hotkey, badge, iconWrap, title, desc);
      btn.addEventListener('click', () => {
        this.game.chooseUpgrade(idx);
      });

      this.upgradeCardsEl.appendChild(btn);
    });
  }

  public showPause(player: Player, elapsed: number, kills: number): void {
    const sprites = this.game.getSprites();
    const hpPct = Math.min(100, Math.max(0, (player.hp / player.maxHp) * 100));

    this.pauseHpEl.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    this.pauseHpBarEl.style.width = `${hpPct.toFixed(1)}%`;
    this.pauseLevelEl.textContent = `LV ${player.level} (${player.xp}/${player.xpToNext} XP)`;
    this.pauseTimeEl.textContent = formatTime(elapsed);
    this.pauseKillsEl.textContent = String(kills);
    this.pauseSpeedEl.textContent = `${Math.round(player.speedMult * 100)}%`;
    this.pauseMightEl.textContent = `${Math.round(player.mightMult * 100)}%`;
    this.pauseMagnetEl.textContent = `${Math.round(player.pickupRadius)}px`;

    // Active passive stacks
    this.pausePassivesEl.replaceChildren();
    const passives: Array<{ label: string; count: number }> = [
      { label: 'Vitalitas', count: player.statStacks.maxHp },
      { label: 'Sepatu', count: player.statStacks.speed },
      { label: 'Kekuatan', count: player.statStacks.might },
      { label: 'Magnet', count: player.statStacks.magnet },
    ];
    let hasPassive = false;
    for (const p of passives) {
      if (p.count <= 0) continue;
      hasPassive = true;
      const chip = document.createElement('span');
      chip.className = 'pause-passive-chip';
      chip.textContent = `${p.label} x${p.count}`;
      this.pausePassivesEl.appendChild(chip);
    }
    if (!hasPassive) {
      const emptyChip = document.createElement('span');
      emptyChip.className = 'pause-passive-chip empty';
      emptyChip.textContent = 'Belum ada pasif';
      this.pausePassivesEl.appendChild(emptyChip);
    }

    // Active weapons with full details & live stats
    this.pauseWeaponsListEl.replaceChildren();
    for (const wid of player.weaponOrder) {
      const wState = player.weapons[wid];
      const detail = getWeaponDetail(wid, wState.level, player.mightMult);

      const item = document.createElement('div');
      item.className = 'pause-weapon-item';

      const iconBox = document.createElement('div');
      iconBox.className = 'pause-weapon-icon';
      const img = document.createElement('img');
      img.className = 'pixel-img';
      img.src = sprites.icons[wid];
      img.alt = detail.name;
      iconBox.appendChild(img);

      const body = document.createElement('div');
      body.className = 'pause-weapon-body';

      const head = document.createElement('div');
      head.className = 'pause-weapon-head';
      const nameEl = document.createElement('span');
      nameEl.className = 'pause-weapon-name';
      nameEl.textContent = detail.name;
      const lvEl = document.createElement('span');
      lvEl.className = 'pause-weapon-lv';
      lvEl.textContent = `LV ${detail.level}/${detail.maxLevel}`;
      head.append(nameEl, lvEl);

      const descEl = document.createElement('div');
      descEl.className = 'pause-weapon-desc';
      descEl.textContent = detail.description;

      const statsEl = document.createElement('div');
      statsEl.className = 'pause-weapon-stats';
      statsEl.textContent = detail.statsLine;

      body.append(head, descEl, statsEl);
      item.append(iconBox, body);
      this.pauseWeaponsListEl.appendChild(item);
    }
  }

  public showGameOver(
    player: Player,
    elapsed: number,
    kills: number,
    record: SaveRecord,
  ): void {
    const sprites = this.game.getSprites();
    this.goTimeEl.textContent = formatTime(elapsed);
    this.goLevelEl.textContent = String(player.level);
    this.goKillsEl.textContent = String(kills);
    this.goBestEl.textContent = `${formatTime(record.bestTime)} • ${record.bestKills} KORBAN`;

    this.goWeaponsEl.replaceChildren();
    for (const wid of player.weaponOrder) {
      const chip = document.createElement('div');
      chip.className = 'go-weapon-chip';

      const img = document.createElement('img');
      img.className = 'pixel-img';
      img.src = sprites.icons[wid];
      img.alt = WEAPON_NAMES[wid];

      const label = document.createElement('span');
      label.textContent = `${WEAPON_NAMES[wid]} LV ${player.weapons[wid].level}`;

      chip.append(img, label);
      this.goWeaponsEl.appendChild(chip);
    }

    this.updateTitleRecord(record);
  }

  public showBossBanner(): void {
    this.bossBannerEl.classList.remove('hidden');
    if (this.bossBannerTimer !== null) {
      window.clearTimeout(this.bossBannerTimer);
    }
    this.bossBannerTimer = window.setTimeout(() => {
      this.bossBannerEl.classList.add('hidden');
      this.bossBannerTimer = null;
    }, 3600);
  }
}
