import './style.css';
import { SoundEngine } from './audio';
import { Game } from './game';
import { GameUI } from './ui';

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Could not find #game-canvas');
  }

  const audio = new SoundEngine();
  let ui: GameUI;

  const game = new Game(canvas, audio, {
    onStateChange: (state) => ui.handleStateChange(state),
    onHudUpdate: (player, elapsed, kills) => ui.updateHud(player, elapsed, kills),
    onLevelUpOpen: (player, options) => ui.showLevelUp(player, options),
    onPauseOpen: (player, elapsed, kills) => ui.showPause(player, elapsed, kills),
    onGameOver: (player, elapsed, kills, record) =>
      ui.showGameOver(player, elapsed, kills, record),
    onBossSpawn: () => ui.showBossBanner(),
  });

  ui = new GameUI(game, audio);
  ui.handleStateChange('title');
  game.startLoop();
}

bootstrap();
