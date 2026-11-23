import type { SoundEngine } from './audio';
import type { Game } from './game';
import { ENEMY_COMPENDIUM } from './spawner';
import type {
  GameState,
  PickupKind,
  Player,
  SaveRecord,
  UpgradeModalSource,
  UpgradeOption,
  WeaponId,
} from './types';
import {
  ITEM_COMPENDIUM,
  PASSIVE_COMPENDIUM,
  WEAPON_NAMES,
  getWeaponCompendium,
  getWeaponDetail,
} from './weapons';

type MenuTab = 'home' | 'arsenal' | 'bestiary';
type PendingConfirmAction = 'restart' | 'mainmenu' | null;

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
  private readonly confirmModalEl: HTMLElement;

  // HUD dynamic elements
  private readonly xpFillEl: HTMLElement;
  private readonly levelBadgeEl: HTMLElement;
  private readonly weaponSlotsEl: HTMLElement;
  private readonly timerDisplayEl: HTMLElement;
  private readonly hpFillHudEl: HTMLElement;
  private readonly hpTextEl: HTMLElement;
  private readonly killCountEl: HTMLElement;
  private readonly buffBarEl: HTMLElement;
  private readonly bossBannerEl: HTMLElement;

  // Main menu tabs & pages
  private readonly tabHomeBtn: HTMLButtonElement;
  private readonly tabArsenalBtn: HTMLButtonElement;
  private readonly tabBestiaryBtn: HTMLButtonElement;
  private readonly pageHomeEl: HTMLElement;
  private readonly pageArsenalEl: HTMLElement;
  private readonly pageBestiaryEl: HTMLElement;
  private readonly btnGotoArsenalEl: HTMLButtonElement;
  private readonly btnGotoBestiaryEl: HTMLButtonElement;
  private readonly arsenalWeaponsEl: HTMLElement;
  private readonly arsenalPassivesEl: HTMLElement;
  private readonly arsenalItemsEl: HTMLElement;
  private readonly bestiaryListEl: HTMLElement;

  // Buttons & Modal fields
  private readonly btnMuteEl: HTMLButtonElement;
  private readonly btnPauseEl: HTMLButtonElement;
  private readonly btnStartEl: HTMLButtonElement;
  private readonly btnResumeEl: HTMLButtonElement;
  private readonly btnRestartPauseEl: HTMLButtonElement;
  private readonly btnMainMenuPauseEl: HTMLButtonElement;
  private readonly btnRetryEl: HTMLButtonElement;
  private readonly titleHeroImgEl: HTMLImageElement;
  private readonly titleRecordEl: HTMLElement;
  private readonly levelupKickerEl: HTMLElement;
  private readonly levelupTitleEl: HTMLElement;
  private readonly levelupHintEl: HTMLElement;
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
  private readonly confirmTitleEl: HTMLElement;
  private readonly confirmMessageEl: HTMLElement;
  private readonly btnConfirmCancelEl: HTMLButtonElement;
  private readonly btnConfirmOkEl: HTMLButtonElement;
  private readonly goTimeEl: HTMLElement;
  private readonly goLevelEl: HTMLElement;
  private readonly goKillsEl: HTMLElement;
  private readonly goBestEl: HTMLElement;
  private readonly goWeaponsEl: HTMLElement;

  // Cached UI state
  private activeMenuTab: MenuTab = 'home';
  private pendingConfirm: PendingConfirmAction = null;
  private lastTimerText = '';
  private lastLevelText = '';
  private lastXpPct = '';
  private lastHpPct = '';
  private lastHpText = '';
  private lastKillText = '';
  private lastWeaponsSig = '';
  private lastBuffSig = '';
  private bossBannerTimer: number | null = null;

  constructor(game: Game, audio: SoundEngine) {
    this.game = game;
    this.audio = audio;

    this.hudEl = this.mustGet('hud');
    this.titleScreenEl = this.mustGet('title-screen');
    this.levelupModalEl = this.mustGet('levelup-modal');
    this.pauseModalEl = this.mustGet('pause-modal');
    this.gameoverModalEl = this.mustGet('gameover-modal');
    this.confirmModalEl = this.mustGet('confirm-modal');

    this.xpFillEl = this.mustGet('xp-fill');
    this.levelBadgeEl = this.mustGet('level-badge');
    this.weaponSlotsEl = this.mustGet('weapon-slots');
    this.timerDisplayEl = this.mustGet('timer-display');
    this.hpFillHudEl = this.mustGet('hp-fill-hud');
    this.hpTextEl = this.mustGet('hp-text');
    this.killCountEl = this.mustGet('kill-count');
    this.buffBarEl = this.mustGet('buff-bar');
    this.bossBannerEl = this.mustGet('boss-banner');

    this.tabHomeBtn = this.mustGet('tab-btn-home') as HTMLButtonElement;
    this.tabArsenalBtn = this.mustGet('tab-btn-arsenal') as HTMLButtonElement;
    this.tabBestiaryBtn = this.mustGet('tab-btn-bestiary') as HTMLButtonElement;
    this.pageHomeEl = this.mustGet('menu-page-home');
    this.pageArsenalEl = this.mustGet('menu-page-arsenal');
    this.pageBestiaryEl = this.mustGet('menu-page-bestiary');
    this.btnGotoArsenalEl = this.mustGet('btn-goto-arsenal') as HTMLButtonElement;
    this.btnGotoBestiaryEl = this.mustGet('btn-goto-bestiary') as HTMLButtonElement;
    this.arsenalWeaponsEl = this.mustGet('arsenal-weapons');
    this.arsenalPassivesEl = this.mustGet('arsenal-passives');
    this.arsenalItemsEl = this.mustGet('arsenal-items');
    this.bestiaryListEl = this.mustGet('bestiary-list');

    this.btnMuteEl = this.mustGet('btn-mute') as HTMLButtonElement;
    this.btnPauseEl = this.mustGet('btn-pause') as HTMLButtonElement;
    this.btnStartEl = this.mustGet('btn-start') as HTMLButtonElement;
    this.btnResumeEl = this.mustGet('btn-resume') as HTMLButtonElement;
    this.btnRestartPauseEl = this.mustGet(
      'btn-restart-pause',
    ) as HTMLButtonElement;
    this.btnMainMenuPauseEl = this.mustGet(
      'btn-mainmenu-pause',
    ) as HTMLButtonElement;
    this.btnRetryEl = this.mustGet('btn-retry') as HTMLButtonElement;
    this.titleHeroImgEl = this.mustGet('title-hero-img') as HTMLImageElement;
    this.titleRecordEl = this.mustGet('title-record');
    this.levelupKickerEl = this.mustGet('levelup-kicker');
    this.levelupTitleEl = this.mustGet('levelup-title');
    this.levelupHintEl = this.mustGet('levelup-hint');
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
    this.confirmTitleEl = this.mustGet('confirm-title');
    this.confirmMessageEl = this.mustGet('confirm-message');
    this.btnConfirmCancelEl = this.mustGet(
      'btn-confirm-cancel',
    ) as HTMLButtonElement;
    this.btnConfirmOkEl = this.mustGet('btn-confirm-ok') as HTMLButtonElement;
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
    this.renderCompendiumPages();
    this.setMenuTab('home');
  }

  private renderCompendiumPages(): void {
    const sprites = this.game.getSprites();

    // 1. Weapons compendium
    this.arsenalWeaponsEl.replaceChildren();
    for (const w of getWeaponCompendium()) {
      const card = document.createElement('div');
      card.className = 'compendium-card';

      const iconWrap = document.createElement('div');
      iconWrap.className = 'compendium-icon';
      const img = document.createElement('img');
      img.className = 'pixel-img';
      img.src = sprites.icons[w.id];
      img.alt = w.name;
      iconWrap.appendChild(img);

      const body = document.createElement('div');
      body.className = 'compendium-body';

      const top = document.createElement('div');
      top.className = 'compendium-top';
      const name = document.createElement('span');
      name.className = 'compendium-name';
      name.textContent = w.name;
      const tag = document.createElement('span');
      tag.className = 'compendium-tag';
      tag.textContent = w.role;
      top.append(name, tag);

      const desc = document.createElement('div');
      desc.className = 'compendium-desc';
      desc.textContent = w.summary;

      const levels = document.createElement('div');
      levels.className = 'compendium-levels';
      w.levels.forEach((lvText, idx) => {
        const line = document.createElement('span');
        const lvNum = document.createElement('strong');
        lvNum.textContent = `Lv ${idx + 1}: `;
        line.append(lvNum, document.createTextNode(lvText));
        levels.appendChild(line);
      });

      body.append(top, desc, levels);
      card.append(iconWrap, body);
      this.arsenalWeaponsEl.appendChild(card);
    }

    // 2. Passives compendium
    this.arsenalPassivesEl.replaceChildren();
    for (const p of PASSIVE_COMPENDIUM) {
      const card = document.createElement('div');
      card.className = 'compendium-card';

      const iconWrap = document.createElement('div');
      iconWrap.className = 'compendium-icon';
      const img = document.createElement('img');
      img.className = 'pixel-img';
      img.src = sprites.icons[p.id];
      img.alt = p.name;
      iconWrap.appendChild(img);

      const body = document.createElement('div');
      body.className = 'compendium-body';

      const top = document.createElement('div');
      top.className = 'compendium-top';
      const name = document.createElement('span');
      name.className = 'compendium-name';
      name.textContent = p.name;
      const tag = document.createElement('span');
      tag.className = 'compendium-tag';
      tag.textContent = p.maxLabel;
      top.append(name, tag);

      const desc = document.createElement('div');
      desc.className = 'compendium-desc';
      desc.textContent = p.description;

      body.append(top, desc);
      card.append(iconWrap, body);
      this.arsenalPassivesEl.appendChild(card);
    }

    // 3. Field Item Drops compendium
    this.arsenalItemsEl.replaceChildren();
    for (const item of ITEM_COMPENDIUM) {
      const card = document.createElement('div');
      card.className = 'compendium-card';

      const iconWrap = document.createElement('div');
      iconWrap.className = 'compendium-icon';
      const img = document.createElement('img');
      img.className = 'pixel-img';
      img.src = sprites.pickupIcons[item.id];
      img.alt = item.name;
      iconWrap.appendChild(img);

      const body = document.createElement('div');
      body.className = 'compendium-body';

      const top = document.createElement('div');
      top.className = 'compendium-top';
      const name = document.createElement('span');
      name.className = 'compendium-name';
      name.textContent = item.name;
      const tag = document.createElement('span');
      tag.className = 'compendium-tag crimson';
      tag.textContent = item.tag;
      top.append(name, tag);

      const desc = document.createElement('div');
      desc.className = 'compendium-desc';
      desc.textContent = item.description;

      body.append(top, desc);
      card.append(iconWrap, body);
      this.arsenalItemsEl.appendChild(card);
    }

    // 4. Enemy Bestiary
    this.bestiaryListEl.replaceChildren();
    for (const enemy of ENEMY_COMPENDIUM) {
      const card = document.createElement('div');
      card.className = 'compendium-card';

      const iconWrap = document.createElement('div');
      iconWrap.className = 'compendium-icon';
      const img = document.createElement('img');
      img.className = 'pixel-img';
      img.src = sprites.enemyPreviews[enemy.type];
      img.alt = enemy.name;
      iconWrap.appendChild(img);

      const body = document.createElement('div');
      body.className = 'compendium-body';

      const top = document.createElement('div');
      top.className = 'compendium-top';
      const name = document.createElement('span');
      name.className = 'compendium-name';
      name.textContent = enemy.name;
      const tag = document.createElement('span');
      tag.className =
        enemy.type === 'boss' ? 'compendium-tag crimson' : 'compendium-tag';
      tag.textContent = `MUNCUL ${enemy.spawnWindow}`;
      top.append(name, tag);

      const stats = document.createElement('div');
      stats.className = 'bestiary-stats';
      stats.textContent = `HP ${enemy.hp} • DMG ${enemy.damage} • SPD ${enemy.speed} • XP ${enemy.xpValue}`;

      const desc = document.createElement('div');
      desc.className = 'compendium-desc';
      desc.textContent = enemy.description;

      body.append(top, stats, desc);
      card.append(iconWrap, body);
      this.bestiaryListEl.appendChild(card);
    }
  }

  private setMenuTab(tab: MenuTab): void {
    this.activeMenuTab = tab;

    this.pageHomeEl.classList.toggle('hidden', tab !== 'home');
    this.pageArsenalEl.classList.toggle('hidden', tab !== 'arsenal');
    this.pageBestiaryEl.classList.toggle('hidden', tab !== 'bestiary');

    this.tabHomeBtn.classList.toggle('active', tab === 'home');
    this.tabArsenalBtn.classList.toggle('active', tab === 'arsenal');
    this.tabBestiaryBtn.classList.toggle('active', tab === 'bestiary');

    this.tabHomeBtn.setAttribute('aria-selected', String(tab === 'home'));
    this.tabArsenalBtn.setAttribute('aria-selected', String(tab === 'arsenal'));
    this.tabBestiaryBtn.setAttribute(
      'aria-selected',
      String(tab === 'bestiary'),
    );
  }

  private openConfirm(action: Exclude<PendingConfirmAction, null>): void {
    this.pendingConfirm = action;
    if (action === 'restart') {
      this.confirmTitleEl.textContent = 'MULAI ULANG PERMAINAN?';
      this.confirmMessageEl.textContent =
        'Progres waktu bertahan, level, senjata, dan korban di sesi ini akan hilang.';
    } else {
      this.confirmTitleEl.textContent = 'KEMBALI KE MAIN MENU?';
      this.confirmMessageEl.textContent =
        'Permainan saat ini akan dihentikan dan progres sesi tidak disimpan.';
    }
    this.confirmModalEl.classList.remove('hidden');
  }

  private closeConfirm(): void {
    this.pendingConfirm = null;
    this.confirmModalEl.classList.add('hidden');
  }

  private executeConfirm(): void {
    const action = this.pendingConfirm;
    this.closeConfirm();
    this.hideBossBanner();
    if (action === 'restart') {
      this.game.startNewRun();
    } else if (action === 'mainmenu') {
      this.game.returnToMainMenu();
    }
  }

  private hideBossBanner(): void {
    if (this.bossBannerTimer !== null) {
      window.clearTimeout(this.bossBannerTimer);
      this.bossBannerTimer = null;
    }
    this.bossBannerEl.classList.add('hidden');
  }

  private updateTitleRecord(record: SaveRecord): void {
    this.titleRecordEl.textContent = `REKOR TERBAIK: ${formatTime(record.bestTime)} • ${record.bestKills} KORBAN`;
  }

  private syncMuteLabel(): void {
    this.btnMuteEl.textContent = this.audio.isMuted() ? 'SFX OFF' : 'SFX ON';
  }

  private bindEvents(): void {
    this.tabHomeBtn.addEventListener('click', () => this.setMenuTab('home'));
    this.tabArsenalBtn.addEventListener('click', () =>
      this.setMenuTab('arsenal'),
    );
    this.tabBestiaryBtn.addEventListener('click', () =>
      this.setMenuTab('bestiary'),
    );
    this.btnGotoArsenalEl.addEventListener('click', () =>
      this.setMenuTab('arsenal'),
    );
    this.btnGotoBestiaryEl.addEventListener('click', () =>
      this.setMenuTab('bestiary'),
    );

    this.btnStartEl.addEventListener('click', () => {
      this.hideBossBanner();
      this.game.startNewRun();
    });

    this.btnRetryEl.addEventListener('click', () => {
      this.hideBossBanner();
      this.game.startNewRun();
    });

    this.btnResumeEl.addEventListener('click', () => {
      this.closeConfirm();
      this.game.resumeGame();
    });

    this.btnRestartPauseEl.addEventListener('click', () => {
      this.openConfirm('restart');
    });

    this.btnMainMenuPauseEl.addEventListener('click', () => {
      this.openConfirm('mainmenu');
    });

    this.btnConfirmCancelEl.addEventListener('click', () => {
      this.closeConfirm();
    });

    this.btnConfirmOkEl.addEventListener('click', () => {
      this.executeConfirm();
    });

    this.btnPauseEl.addEventListener('click', () => {
      if (this.pendingConfirm) {
        this.closeConfirm();
        return;
      }
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
        if (code === 'Escape' && !e.repeat && this.activeMenuTab !== 'home') {
          this.setMenuTab('home');
          return;
        }
        if (
          (code === 'Enter' || code === 'Space') &&
          !e.repeat &&
          this.activeMenuTab === 'home'
        ) {
          this.hideBossBanner();
          this.game.startNewRun();
        }
        return;
      }

      if (state === 'gameover') {
        if ((code === 'Enter' || code === 'Space') && !e.repeat) {
          this.hideBossBanner();
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

      if (state === 'paused' && this.pendingConfirm !== null) {
        if (code === 'Escape' && !e.repeat) {
          this.closeConfirm();
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

    if (state !== 'paused') {
      this.closeConfirm();
    }

    const showHud = state !== 'title';
    this.hudEl.classList.toggle('hidden', !showHud);
    this.hudEl.setAttribute('aria-hidden', showHud ? 'false' : 'true');

    if (state === 'title') {
      this.updateTitleRecord(this.game.getRecord());
      this.setMenuTab('home');
      this.lastWeaponsSig = '';
      this.lastBuffSig = '';
      this.buffBarEl.classList.add('hidden');
      this.buffBarEl.replaceChildren();
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

    const swiftTenths =
      player.buffs.swiftTimer > 0 ? Math.ceil(player.buffs.swiftTimer * 10) : 0;
    const potionTenths =
      player.buffs.potionTimer > 0 ? Math.ceil(player.buffs.potionTimer * 10) : 0;
    const shieldTenths =
      player.buffs.shieldTimer > 0 ? Math.ceil(player.buffs.shieldTimer * 10) : 0;
    const buffSig = `${swiftTenths}|${potionTenths}|${shieldTenths}`;
    if (buffSig !== this.lastBuffSig) {
      this.lastBuffSig = buffSig;
      this.renderBuffBar(player);
    }
  }

  private renderBuffBar(player: Player): void {
    const sprites = this.game.getSprites();
    const active: Array<{
      kind: PickupKind;
      cls: string;
      text: string;
    }> = [];

    if (player.buffs.swiftTimer > 0) {
      active.push({
        kind: 'swiftBoots',
        cls: 'swift',
        text: `+45% SPD ${player.buffs.swiftTimer.toFixed(1)}s`,
      });
    }
    if (player.buffs.potionTimer > 0) {
      active.push({
        kind: 'redPotion',
        cls: 'potion',
        text: `+50% DMG ${player.buffs.potionTimer.toFixed(1)}s`,
      });
    }
    if (player.buffs.shieldTimer > 0) {
      active.push({
        kind: 'ironShield',
        cls: 'shield',
        text: `KEBAL ${player.buffs.shieldTimer.toFixed(1)}s`,
      });
    }

    this.buffBarEl.classList.toggle('hidden', active.length === 0);
    this.buffBarEl.replaceChildren();
    for (const b of active) {
      const pill = document.createElement('div');
      pill.className = `buff-pill ${b.cls}`;

      const img = document.createElement('img');
      img.className = 'pixel-img';
      img.src = sprites.pickupIcons[b.kind];
      img.alt = b.text;

      const label = document.createElement('span');
      label.textContent = b.text;

      pill.append(img, label);
      this.buffBarEl.appendChild(pill);
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

  public showLevelUp(
    player: Player,
    options: UpgradeOption[],
    source: UpgradeModalSource,
  ): void {
    const sprites = this.game.getSprites();
    if (source === 'chest') {
      this.levelupKickerEl.textContent = 'PETI HARTA DITEMUKAN!';
      this.levelupTitleEl.textContent = 'PILIH HADIAH CHEST (+1 LEVEL)';
      this.levelupHintEl.textContent =
        'Chest memberi peningkatan gratis! Tekan [1], [2], [3] atau klik';
    } else {
      this.levelupKickerEl.textContent = 'NAIK LEVEL!';
      this.levelupTitleEl.textContent = `PILIH PENINGKATAN (LV ${player.level})`;
      this.levelupHintEl.textContent = 'Tekan [1], [2], [3] atau klik kartu';
    }

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
    this.closeConfirm();
    const sprites = this.game.getSprites();
    const hpPct = Math.min(100, Math.max(0, (player.hp / player.maxHp) * 100));

    const effSpeed =
      player.speedMult * (player.buffs.swiftTimer > 0 ? 1.45 : 1);
    const effMight =
      player.mightMult * (player.buffs.potionTimer > 0 ? 1.5 : 1);

    this.pauseHpEl.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    this.pauseHpBarEl.style.width = `${hpPct.toFixed(1)}%`;
    this.pauseLevelEl.textContent = `LV ${player.level} (${player.xp}/${player.xpToNext} XP)`;
    this.pauseTimeEl.textContent = formatTime(elapsed);
    this.pauseKillsEl.textContent = String(kills);

    this.pauseSpeedEl.textContent =
      player.buffs.swiftTimer > 0
        ? `${Math.round(effSpeed * 100)}% (+BUFF)`
        : `${Math.round(effSpeed * 100)}%`;
    this.pauseSpeedEl.className =
      player.buffs.swiftTimer > 0 ? 'stat-val cyan' : 'stat-val';

    this.pauseMightEl.textContent =
      player.buffs.potionTimer > 0
        ? `${Math.round(effMight * 100)}% (+BUFF)`
        : `${Math.round(effMight * 100)}%`;
    this.pauseMightEl.className =
      player.buffs.potionTimer > 0 ? 'stat-val gold' : 'stat-val';

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
      const detail = getWeaponDetail(wid, wState.level, effMight);

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
    this.hideBossBanner();
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
