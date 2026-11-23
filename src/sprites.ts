import type { EnemyType, GemKind, UpgradeId } from './types';

export interface AnimatedSpriteSet {
  framesRight: HTMLCanvasElement[];
  framesLeft: HTMLCanvasElement[];
  flashRight: HTMLCanvasElement[];
  flashLeft: HTMLCanvasElement[];
  width: number;
  height: number;
}

export interface SpriteBank {
  hero: AnimatedSpriteSet;
  heroIdle: AnimatedSpriteSet;
  enemies: Record<EnemyType, AnimatedSpriteSet>;
  groundTiles: HTMLCanvasElement[];
  cobbleTile: HTMLCanvasElement;
  gravestone: HTMLCanvasElement;
  bush: HTMLCanvasElement;
  gems: Record<GemKind, HTMLCanvasElement>;
  roast: HTMLCanvasElement;
  wandBolt: HTMLCanvasElement;
  icons: Record<UpgradeId, string>;
  heroPreviewUrl: string;
}

export function createSprite(
  rows: string[],
  palette: Record<string, string>,
): HTMLCanvasElement {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D context for sprite');
  }

  for (let y = 0; y < height; y++) {
    const row = rows[y];
    if (row.length !== width) {
      throw new Error(`Sprite row ${y} has width ${row.length}, expected ${width}`);
    }
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const color = palette[ch];
      if (!color) {
        throw new Error(`Missing palette color for key '${ch}'`);
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

export function flipSpriteX(src: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return canvas;
}

export function createFlashSprite(src: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export function spriteToDataUrl(src: HTMLCanvasElement, scale = 4): string {
  const canvas = document.createElement('canvas');
  canvas.width = src.width * scale;
  canvas.height = src.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function buildAnimatedSet(frames: HTMLCanvasElement[]): AnimatedSpriteSet {
  const framesRight = frames;
  const framesLeft = frames.map(flipSpriteX);
  const flashRight = framesRight.map(createFlashSprite);
  const flashLeft = framesLeft.map(createFlashSprite);
  return {
    framesRight,
    framesLeft,
    flashRight,
    flashLeft,
    width: frames[0].width,
    height: frames[0].height,
  };
}

let cachedBank: SpriteBank | null = null;

export function getSpriteBank(): SpriteBank {
  if (cachedBank) return cachedBank;

  // 1. Hero (14x16) — Vampire Hunter with wide dark hat & crimson scarf
  const heroPalette: Record<string, string> = {
    k: '#090711', // outline
    h: '#2d2342', // hat/coat dark purple
    H: '#4a3b69', // hat/coat highlight
    r: '#b91c1c', // crimson scarf
    R: '#ef4444', // scarf bright
    f: '#f3d7c3', // pale face
    e: '#111827', // eyes
    s: '#cbd5e1', // silver hair/buckle
    b: '#1f162d', // boots/trousers
    g: '#facc15', // gold trim
  };

  const heroIdle0 = createSprite(
    [
      '....kkkkkk....',
      '...kHHHHHHk...',
      '..kHHHHHHHHk..',
      'kkhhhhhhhhhhkk',
      '.kkkffffffkkk.',
      '...kfekfekf...',
      '...kffffffk...',
      '..krrrrrrrrk..',
      '.kRRrrrrrrRRk.',
      '.khHHhggHhHHk.',
      '.khhhhhhhhhhk.',
      '..khhhsshhhk..',
      '..khhhhhhhhk..',
      '..kbbk..kbbk..',
      '..kbbk..kbbk..',
      '..kkk....kkk..',
    ],
    heroPalette,
  );

  const heroIdle1 = createSprite(
    [
      '..............',
      '....kkkkkk....',
      '...kHHHHHHk...',
      '..kHHHHHHHHk..',
      'kkhhhhhhhhhhkk',
      '.kkkffffffkkk.',
      '...kfekfekf...',
      '..krrrrrrrrk..',
      '.kRRrrrrrrRRk.',
      '.khHHhggHhHHk.',
      '.khhhhhhhhhhk.',
      '..khhhsshhhk..',
      '..khhhhhhhhk..',
      '..kbbk..kbbk..',
      '..kbbk..kbbk..',
      '..kkk....kkk..',
    ],
    heroPalette,
  );

  // 4-frame walk cycle (stride A, passing bounce, stride B, passing bounce)
  const heroWalk0 = createSprite(
    [
      '..............',
      '....kkkkkk....',
      '...kHHHHHHk...',
      '..kHHHHHHHHk..',
      'kkhhhhhhhhhhkk',
      '.kkkffffffkkk.',
      '...kfekfekf...',
      'kkrrrrrrrrk...',
      'kRRrrrrrrrRk..',
      '.khHHhggHhHHk.',
      'khhhhhhhhhhk..',
      'khhhsshhhhk...',
      '.khhhhhhhhk...',
      '.kbbk...kbbk..',
      'kbbk.....kbbk.',
      'kkk.......kkk.',
    ],
    heroPalette,
  );

  const heroWalk1 = createSprite(
    [
      '....kkkkkk....',
      '...kHHHHHHk...',
      '..kHHHHHHHHk..',
      'kkhhhhhhhhhhkk',
      '.kkkffffffkkk.',
      '...kfekfekf...',
      'kRkfffffffk...',
      'kRrrrrrrrrrk..',
      '.krrrrrrrrk...',
      '.khHHhggHhHHk.',
      '..khhhhhhhhk..',
      '..khhhsshhhk..',
      '...kbbkkbbk...',
      '...kbbkkbbk...',
      '...kkk..kkk...',
      '..............',
    ],
    heroPalette,
  );

  const heroWalk2 = createSprite(
    [
      '..............',
      '....kkkkkk....',
      '...kHHHHHHk...',
      '..kHHHHHHHHk..',
      'kkhhhhhhhhhhkk',
      '.kkkffffffkkk.',
      '...kfekfekf...',
      '..krrrrrrrrk..',
      'kRrrrrrrrrkk..',
      '.khHHhggHhHHk.',
      '..khhhhhhhhhhk',
      '...khhhhsshhhk',
      '...khhhhhhhhk.',
      '..kbbk..kbbk..',
      '.kbbk....kbbk.',
      '.kkk......kkk.',
    ],
    heroPalette,
  );

  const heroWalk3 = createSprite(
    [
      '....kkkkkk....',
      '...kHHHHHHk...',
      '..kHHHHHHHHk..',
      'kkhhhhhhhhhhkk',
      '.kkkffffffkkk.',
      '...kfekfekf...',
      '...kffffffk...',
      '.kkrrrrrrrrk..',
      'kRRrrrrrrrk...',
      '.khHHhggHhHHk.',
      '.khhhhhhhhhhk.',
      '..khhhsshhhk..',
      '...kbbk.kbbk..',
      '...kbbk.kbbk..',
      '...kkk...kkk..',
      '..............',
    ],
    heroPalette,
  );

  // 2. Bat (12x10)
  const batPalette: Record<string, string> = {
    k: '#08060f',
    w: '#3b2854',
    W: '#5b3f82',
    b: '#241836',
    r: '#ef4444',
    f: '#f8fafc',
  };

  const batFrame0 = createSprite(
    [
      '.kk......kk.',
      'kWWk....kWWk',
      'kWwk.kk.kwWk',
      'kwwkkbbkkwwk',
      '.kwwbbrbwwk.',
      '..kbbbrbbk..',
      '...kbfbbk...',
      '...kbbbbk...',
      '....k..k....',
      '............',
    ],
    batPalette,
  );

  const batFrame1 = createSprite(
    [
      '............',
      '....k..k....',
      '...kbbbbk...',
      '..kbbbrbbk..',
      '.kwwbbrbwwk.',
      'kWwwkbfkwwWk',
      'kWWk.kk.kWWk',
      'kwwk....kwwk',
      '.kk......kk.',
      '............',
    ],
    batPalette,
  );

  // 3. Skeleton (14x16)
  const skelPalette: Record<string, string> = {
    k: '#090711',
    b: '#e2e8f0', // bright bone
    s: '#94a3b8', // shaded bone
    d: '#1e1b2e', // sockets
    w: '#78716c', // rusty blade
    W: '#cbd5e1', // blade edge
  };

  const skelFrame0 = createSprite(
    [
      '....kkkkkk....',
      '...kbbbbbbk...',
      '..kbbbbbbbbk..',
      '..kbddbbddbk..',
      '..kbbbbbbbbk..',
      '...kbbddbbk...',
      '....kssssk....',
      '..kkbbbbbbkk..',
      '.kbbksssskbbk.',
      '.kbk.kbbk.kbk.',
      '.ksk.ksskkWwk.',
      '..k..kbbk.kWk.',
      '.....kssk..k..',
      '....kbbkbbk...',
      '....ksskssk...',
      '....kkk.kkk...',
    ],
    skelPalette,
  );

  const skelFrame1 = createSprite(
    [
      '....kkkkkk....',
      '...kbbbbbbk...',
      '..kbbbbbbbbk..',
      '..kbddbbddbk..',
      '..kbbbbbbbbk..',
      '...kbbddbbk...',
      '....kssssk....',
      '..kkbbbbbbkk..',
      '.kbbksssskbbk.',
      '.ksk.kbbk.kbk.',
      '..k..ksskkWwk.',
      '.....kbbk.kWk.',
      '.....kssk..k..',
      '...kbbk..kbbk.',
      '...kssk..kssk.',
      '...kkk....kkk.',
    ],
    skelPalette,
  );

  // 4. Zombie (14x16)
  const zombiePalette: Record<string, string> = {
    k: '#090711',
    g: '#65a30d', // rotting green
    G: '#84cc16',
    d: '#365314',
    r: '#ef4444', // bloodshot eye
    c: '#4c2c3b', // tattered cloth
    C: '#6b3e52',
    p: '#2e1d2b', // pants
  };

  const zombieFrame0 = createSprite(
    [
      '....kkkkkk....',
      '...kGGGGGGk...',
      '..kGGggggGGk..',
      '..kgrgddgrgk..',
      '..kggggggggk..',
      '...kggddggk...',
      '..kkCCCCCCkk..',
      '.kCCccccccggk.',
      '.kccCccccCGGk.',
      '..kkcccccckk..',
      '...kcccccck...',
      '...kppppppk...',
      '...kppkkppk...',
      '...kppkkppk...',
      '..kddk..kddk..',
      '..kkk....kkk..',
    ],
    zombiePalette,
  );

  const zombieFrame1 = createSprite(
    [
      '....kkkkkk....',
      '...kGGGGGGk...',
      '..kGGggggGGk..',
      '..kgrgddgrgk..',
      '..kggggggggk..',
      '...kggddggk...',
      '..kkCCCCCCkk..',
      '.kCCcccccck...',
      '.kccCccccCggk.',
      '..kkccccccGGk.',
      '...kcccccckk..',
      '...kppppppk...',
      '..kppk..kppk..',
      '..kppk..kppk..',
      '..kddk..kddk..',
      '..kkk....kkk..',
    ],
    zombiePalette,
  );

  // 5. Wraith (14x16)
  const wraithPalette: Record<string, string> = {
    k: '#07050e',
    c: '#261a40', // cloak
    C: '#422d6e', // cloak highlight
    v: '#6d28d9', // spectral violet
    e: '#38bdf8', // glowing cyan eyes
    w: '#bae6fd', // bright cyan
  };

  const wraithFrame0 = createSprite(
    [
      '.....kkkk.....',
      '...kkCCCCkk...',
      '..kCCccccCCk..',
      '..kcckkkkcck..',
      '..kckewwekck..',
      '..kcckkkkcck..',
      '.kCCccccccCCk.',
      '.kCccccccccCk.',
      '.kcccvvvvccck.',
      '.kccvvvvvvcck.',
      '.kcccvvvvccck.',
      '..kcccccccck..',
      '..kcvkcckvck..',
      '..kvk.kk.kvk..',
      '...k......k...',
      '..............',
    ],
    wraithPalette,
  );

  const wraithFrame1 = createSprite(
    [
      '..............',
      '.....kkkk.....',
      '...kkCCCCkk...',
      '..kCCccccCCk..',
      '..kcckkkkcck..',
      '..kckewwekck..',
      '..kcckkkkcck..',
      '.kCCccccccCCk.',
      '.kCccccccccCk.',
      '.kcccvvvvccck.',
      '.kccvvvvvvcck.',
      '..kcccccccck..',
      '..kcvckkcvck..',
      '..kvk.kvk.vk..',
      '.......k......',
      '..............',
    ],
    wraithPalette,
  );

  // 6. Boss: Raja Tengkorak (20x22)
  const bossPalette: Record<string, string> = {
    k: '#07050c',
    g: '#facc15', // gold crown
    G: '#ca8a04', // shaded gold
    b: '#f1f5f9', // bone
    s: '#94a3b8', // shaded bone
    r: '#dc2626', // crimson cape/eyes
    R: '#ef4444', // bright red glow
    a: '#334155', // dark armor
    A: '#64748b', // armor trim
  };

  const bossFrame0 = createSprite(
    [
      '.....kk..kk..kk.....',
      '.....kGkkggkkGk.....',
      '.....kggggggggk.....',
      '....kkbbbbbbbbkk....',
      '...kbbbbbbbbbbbbk...',
      '...kbkkkbbbbkkkbk...',
      '...kbkRkbssbkRkbk...',
      '...kbbbbbbbbbbbbk...',
      '....kbbbkkkkbbbk....',
      '..kkrrrrssssrrrrkk..',
      '.kRRrAAaaaaaaAArRRk.',
      '.krrkAabbssbbAAkrrk.',
      'krrk.kAbbssbbAk.krrk',
      'krk..kAaaaaaaAk..krk',
      'kk...krrrrrrrrk...kk',
      '.....krrrAArrrk.....',
      '.....krrk..krrk.....',
      '....kbbbk..kbbbk....',
      '....ksssk..ksssk....',
      '....kAAk....kAAk....',
      '....kAAk....kAAk....',
      '....kkk......kkk....',
    ],
    bossPalette,
  );

  const bossFrame1 = createSprite(
    [
      '.....kk..kk..kk.....',
      '.....kGkkggkkGk.....',
      '.....kggggggggk.....',
      '....kkbbbbbbbbkk....',
      '...kbbbbbbbbbbbbk...',
      '...kbkkkbbbbkkkbk...',
      '...kbkRkbssbkRkbk...',
      '...kbbbbbbbbbbbbk...',
      '....kbbbkkkkbbbk....',
      '..kkrrrrssssrrrrkk..',
      '.kRRrAAaaaaaaAArRRk.',
      '.krrkAabbssbbAAkrrk.',
      'krrk.kAbbssbbAk.krrk',
      '.kk..kAaaaaaaAk..kk.',
      '.....krrrrrrrrk.....',
      '.....krrrAArrrk.....',
      '....krrk....krrk....',
      '....kbbk....kbbk....',
      '....kssk....kssk....',
      '...kAAk......kAAk...',
      '...kAAk......kAAk...',
      '...kkk........kkk...',
    ],
    bossPalette,
  );

  // 7. Ground tiles (16x16)
  const tilePalette: Record<string, string> = {
    a: '#12101d', // dark graveyard base
    b: '#171426', // subtle earth patch
    c: '#1d1930', // faint moss/stone
    d: '#25203b', // highlight speck
    e: '#0d0b16', // crack/shadow
  };

  const tileGrass0 = createSprite(
    [
      'aaaaaaaaaaaaaaaa',
      'aaabaaaaaaaaaaaa',
      'aaaaaaaaaabbaaaa',
      'aaaaaaaaaaaaaaea',
      'aaaaacaaaaaaaaaa',
      'aaaaaaaaaaabaaaa',
      'abaaaaaaaaaaaaaa',
      'aaaaaaeaaaaaaaaa',
      'aaaaaaaaaaaacaaa',
      'aaaaaaaaaabaaaaa',
      'aaacaaaaaaaaaaaa',
      'aaaaaaaaaaaaabaa',
      'aaaaabaaaaaaaaaa',
      'aaaaaaaaeaaaaaaa',
      'aaaaaaaaaaacaaaa',
      'aaaaaaaaaaaaaaaa',
    ],
    tilePalette,
  );

  const tileGrass1 = createSprite(
    [
      'aaaaaaaaaaaaaaaa',
      'aaaaaacaaaaaaaaa',
      'aaaaaaaaaaabaaaa',
      'aaabaaaaaaaaaaaa',
      'aaaaaaaaaacdaaaa',
      'aaaaaaaaaaaaaaaa',
      'aaaeaaaaaaaaaaaa',
      'aaaaaaaaabaaaaaa',
      'aaaaacaaaaaaaaaa',
      'aaaaaaaaaaaaeaaa',
      'abaaaaaaaaaaaaaa',
      'aaaaaaabaaaaaaaa',
      'aaaaaaaaaacaaaaa',
      'aaaabaaaaaaaaaaa',
      'aaaaaaaaaaabaaaa',
      'aaaaaaaaaaaaaaaa',
    ],
    tilePalette,
  );

  const tileGrass2 = createSprite(
    [
      'aaaaaaaaaaaaaaaa',
      'aabaaaaaaaaaaaaa',
      'aaaaaaaaacaaaaaa',
      'aaaaaaaaaaaaabaa',
      'aaaaaeaaaaaaaaaa',
      'aaaaaaaaaaabaaaa',
      'aaabaaaaaaaaaaaa',
      'aaaaaaacdaaaaaaa',
      'aaaaaaaaaaaaaaaa',
      'aaaaabaaaaaaaeaa',
      'aaaaaaaaaaaaaaaa',
      'aaacaaaaaaabaaaa',
      'aaaaaaaaaaaaaaaa',
      'aaaaaaabaaaaaaaa',
      'aaaeaaaaaaaaacaa',
      'aaaaaaaaaaaaaaaa',
    ],
    tilePalette,
  );

  const cobbleTile = createSprite(
    [
      'eeeeeeeeeeeeeeee',
      'ebbbbbeabbbbbeaa',
      'ebccbeaeabccbeaa',
      'ebbbbeaaabbbbeaa',
      'eeeeeeaaeeeeeeaa',
      'aaabbbbbeaaabbbb',
      'aaabccbbeaaabccb',
      'aaabbbbbeaaabbbb',
      'eeeeeeeeeeeeeeee',
      'ebbbeaaabbbbbeaa',
      'ebcbeaaabccbbeaa',
      'ebbbeaaabbbbbeaa',
      'eeeeeeeeeeeeeeee',
      'aaabbbbbeabbbbea',
      'aaabccbeaeabccba',
      'eeeeeeeeeeeeeeee',
    ],
    tilePalette,
  );

  const gravestone = createSprite(
    [
      '...kkkkkk...',
      '..kssssssk..',
      '.kssddddssk.',
      '.ksdssssdsk.',
      '.kssdkkdssk.',
      '.ksskkkkssk.',
      '.kssdkkdssk.',
      '.kssdkkdssk.',
      '.kssssssssk.',
      '.kssseesssk.',
      '.kssssssssk.',
      'kksssssssskk',
      'keeeeeeeeeek',
      'kkkkkkkkkkkk',
    ],
    {
      k: '#090711',
      s: '#475569',
      d: '#64748b',
      e: '#334155',
    },
  );

  const bush = createSprite(
    [
      '....kkkk....',
      '..kkddddkk..',
      '.kddggggddk.',
      'kdgddggddgdk',
      'kggdggggdggk',
      'kggggddggggk',
      '.kddddddddk.',
      '..kddddddk..',
      '...kkkkkk...',
      '............',
    ],
    {
      k: '#08070f',
      d: '#1e2923',
      g: '#2d3f34',
    },
  );

  // 8. Pickups & Projectiles
  const gemBlue = createSprite(
    [
      '..kk..',
      '.kwwk.',
      'kwccck',
      'kcccck',
      'kccddk',
      'kccddk',
      '.kddk.',
      '..kk..',
    ],
    {
      k: '#071526',
      w: '#e0f2fe',
      c: '#38bdf8',
      d: '#0284c7',
    },
  );

  const gemGreen = createSprite(
    [
      '...k...',
      '..kwk..',
      '.kwggk.',
      'kwggggk',
      'kggggdk',
      'kgggddk',
      '.kgddk.',
      '..kdk..',
      '...k...',
    ],
    {
      k: '#071c10',
      w: '#dcfce7',
      g: '#4ade80',
      d: '#16a34a',
    },
  );

  const gemRed = createSprite(
    [
      '...kk...',
      '..kwwk..',
      '.kwrrrk.',
      'kwrrrrrk',
      'krrrrddk',
      'krrrrddk',
      'krrrdddk',
      '.krdddk.',
      '..kddk..',
      '...kk...',
    ],
    {
      k: '#22060c',
      w: '#ffe4e6',
      r: '#f43f5e',
      d: '#be123c',
    },
  );

  const roast = createSprite(
    [
      '..kkkkkk..',
      '.kmmmmmmk.',
      'kmhmmmmbbk',
      'kmmmmmmwwk',
      'kmmddmmbbk',
      '.kddddkk..',
      '..kkkk....',
      '..........',
    ],
    {
      k: '#1c0b09',
      m: '#dc2626',
      h: '#fca5a5',
      d: '#991b1b',
      b: '#e5e7eb',
      w: '#ffffff',
    },
  );

  const wandBolt = createSprite(
    [
      '..kkkk..',
      '.kcccck.',
      'kcwwwwck',
      'kcwwwwck',
      '.kcccck.',
      '..kkkk..',
    ],
    {
      k: '#0c2340',
      c: '#38bdf8',
      w: '#f0f9ff',
    },
  );

  // 9. Weapon & Upgrade Icons (14x14)
  const whipIcon = createSprite(
    [
      '..............',
      '.........kkkk.',
      '........krrrrk',
      '.......krrk..k',
      '......krrk....',
      '.....krrk.....',
      '....krrk.kkk..',
      '...krrk.krrrk.',
      '..kbbk..krk.rk',
      '.kbggk...kk.rk',
      '.kbbk......krk',
      'kggk......krrk',
      'kkk........kk.',
      '..............',
    ],
    {
      k: '#090711',
      r: '#ef4444',
      b: '#78350f',
      g: '#facc15',
    },
  );

  const wandIcon = createSprite(
    [
      '..............',
      '..........kkk.',
      '.........kcwck',
      '........kccwck',
      '........kccck.',
      '.......kggkk..',
      '......kbbk....',
      '.....kbbk.....',
      '....kbbk......',
      '...kbbk.......',
      '..kbbk........',
      '.kbbk.........',
      '.kkk..........',
      '..............',
    ],
    {
      k: '#090711',
      c: '#38bdf8',
      w: '#ffffff',
      g: '#facc15',
      b: '#92400e',
    },
  );

  const auraIcon = createSprite(
    [
      '....kkkkkk....',
      '..kkcccccckk..',
      '.kccwwwwwwcck.',
      '.kcwk....kwck.',
      'kcwk..kk..kwck',
      'kcw..kppk..wck',
      'kcw..kppk..wck',
      'kcwk..kk..kwck',
      '.kcwk....kwck.',
      '.kccwwwwwwcck.',
      '..kkcccccckk..',
      '....kkkkkk....',
      '..............',
      '..............',
    ],
    {
      k: '#090711',
      c: '#38bdf8',
      w: '#bae6fd',
      p: '#a855f7',
    },
  );

  const maxHpIcon = createSprite(
    [
      '..............',
      '..kkkk..kkkk..',
      '.krrrrkkrrrrk.',
      'krwwrrrrrrrrrk',
      'krwrrrrrrrrrrk',
      'krrrrrrrrrrrrk',
      'krrrrddddrrrrk',
      '.krrddddddrrk.',
      '..krddddddrk..',
      '...kddddddk...',
      '....kddddk....',
      '.....kddk.....',
      '......kk......',
      '..............',
    ],
    {
      k: '#1a060b',
      r: '#ef4444',
      w: '#fecaca',
      d: '#b91c1c',
    },
  );

  const speedIcon = createSprite(
    [
      '..............',
      '.......kkkk...',
      '......kwwwwk..',
      '.....kwccck...',
      '....kbbkk.....',
      '...kbbbbk.....',
      '...kbbbbk.....',
      '..kbbbbbbk....',
      '..kbbbbbbbkk..',
      '.kbbbbbbbbbbk.',
      '.kggggggggggk.',
      '.kkkkkkkkkkkk.',
      '..............',
      '..............',
    ],
    {
      k: '#090711',
      w: '#f8fafc',
      c: '#38bdf8',
      b: '#4c1d95',
      g: '#facc15',
    },
  );

  const mightIcon = createSprite(
    [
      '..............',
      '...........kkk',
      '..........kwwk',
      '.........kwwk.',
      '........krrk..',
      '.......krrk...',
      '..kk..krrk....',
      '..kggkrrk.....',
      '...kgggk......',
      '..kbbkggk.....',
      '.kbbk..kk.....',
      '.kkk..........',
      '..............',
      '..............',
    ],
    {
      k: '#090711',
      w: '#f8fafc',
      r: '#ef4444',
      g: '#facc15',
      b: '#78350f',
    },
  );

  const magnetIcon = createSprite(
    [
      '..............',
      '..kkkk..kkkk..',
      '.ksssskkssssk.',
      '.ksssskkssssk.',
      '.krrrrkkrrrrk.',
      '.krrrrkkrrrrk.',
      '.krrrrkkrrrrk.',
      '.krrrrrrrrrrk.',
      '..krrrrrrrrk..',
      '...krrrrrrk...',
      '....kkkkkk....',
      '..............',
      '..............',
      '..............',
    ],
    {
      k: '#090711',
      s: '#e2e8f0',
      r: '#dc2626',
    },
  );

  const healIcon = createSprite(
    [
      '..............',
      '....kkkkkk....',
      '..kkmmmmmmkk..',
      '.kmhhmmmmbbbk.',
      '.kmmmmmmbwwwk.',
      '.kmmmddmmbbbk.',
      '.kmmddddddkk..',
      '..kddddddk....',
      '...kkkkkk.....',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
    ],
    {
      k: '#1c0b09',
      m: '#ef4444',
      h: '#fecaca',
      d: '#b91c1c',
      b: '#e5e7eb',
      w: '#ffffff',
    },
  );

  const heroWalkSet = buildAnimatedSet([
    heroWalk0,
    heroWalk1,
    heroWalk2,
    heroWalk3,
  ]);
  const heroIdleSet = buildAnimatedSet([heroIdle0, heroIdle1]);

  cachedBank = {
    hero: heroWalkSet,
    heroIdle: heroIdleSet,
    enemies: {
      bat: buildAnimatedSet([batFrame0, batFrame1]),
      skeleton: buildAnimatedSet([skelFrame0, skelFrame1]),
      zombie: buildAnimatedSet([zombieFrame0, zombieFrame1]),
      wraith: buildAnimatedSet([wraithFrame0, wraithFrame1]),
      boss: buildAnimatedSet([bossFrame0, bossFrame1]),
    },
    groundTiles: [tileGrass0, tileGrass1, tileGrass2],
    cobbleTile,
    gravestone,
    bush,
    gems: {
      blue: gemBlue,
      green: gemGreen,
      red: gemRed,
    },
    roast,
    wandBolt,
    icons: {
      whip: spriteToDataUrl(whipIcon, 4),
      wand: spriteToDataUrl(wandIcon, 4),
      aura: spriteToDataUrl(auraIcon, 4),
      maxHp: spriteToDataUrl(maxHpIcon, 4),
      speed: spriteToDataUrl(speedIcon, 4),
      might: spriteToDataUrl(mightIcon, 4),
      magnet: spriteToDataUrl(magnetIcon, 4),
      heal: spriteToDataUrl(healIcon, 4),
    },
    heroPreviewUrl: spriteToDataUrl(heroIdle0, 5),
  };

  return cachedBank;
}
