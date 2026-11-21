/**
 * Original vector mahjong faces, using the conventional Japanese 34-tile set.
 * Arrangement / colour reference: 日本プロ麻雀連盟 https://www.ma-jan.or.jp/activity/yaku.html
 * Shapes are procedural SVG, not image-generation output. Kanji outlines use
 * Noto Serif CJK JP Bold, OFL 1.1; see Noto-OFL.txt. 白 is deliberately blank.
 */
import { GLYPHS } from './glyphs.js';

// Dark, saturated print inks: the same palette is used for both the 3D table
// and the 2D hand so symbols stay recognisable regardless of the turn state.
// These values achieve at least 6:1 contrast with the tile's ivory face.
export const TILE_PALETTE = Object.freeze({
  ink: '#09263b', green: '#005c2f', red: '#b6001a', paper: '#fffdf5',
});
const { ink: INK, green: GREEN, red: RED, paper: PAPER } = TILE_PALETTE;
const CACHE = new Map(), DATA_CACHE = new Map();
const n = value => Math.round(value * 1000) / 1000;

function glyph(char, cx, cy, width, height, fill = INK) {
  const g = GLYPHS[char];
  if (!g) return '';
  const [x0, y0, x1, y1] = g.bounds;
  const sx = width / (x1 - x0), sy = height / (y1 - y0);
  return `<path d="${g.d}" fill="${fill}" transform="translate(${n(cx - (x0 + x1) * sx / 2)} ${n(cy + (y0 + y1) * sy / 2)}) scale(${n(sx)} ${n(-sy)})"/>`;
}

/** A carved concentric coin with the little radial petals of Japanese 筒子. */
function coin(x, y, r, color) {
  let spokes = '';
  const rr = r * .54;
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    const px = n(x + Math.sin(a) * rr), py = n(y + Math.cos(a) * rr);
    spokes += `<circle cx="${px}" cy="${py}" r="${n(r * .11)}" fill="${PAPER}"/>`;
  }
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/><circle cx="${x}" cy="${y}" r="${n(r * .78)}" fill="none" stroke="${PAPER}" stroke-width="${n(r * .105)}"/>${spokes}<circle cx="${x}" cy="${y}" r="${n(r * .22)}" fill="${PAPER}"/><circle cx="${x}" cy="${y}" r="${n(r * .095)}" fill="${color}"/>`;
}

function circles(number, red) {
  const recolor = c => red ? RED : c;
  if (number === 1) {
    let rays = '';
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8;
      rays += `<path d="M ${n(36 + 21 * Math.cos(a))} ${n(50 + 21 * Math.sin(a))} L ${n(36 + 25 * Math.cos(a))} ${n(50 + 25 * Math.sin(a))}" stroke="${PAPER}" stroke-width="1.2"/>`;
    }
    return `<circle cx="36" cy="50" r="28" fill="${INK}"/><circle cx="36" cy="50" r="26" fill="none" stroke="${PAPER}" stroke-width="1.5"/><circle cx="36" cy="50" r="19" fill="none" stroke="${PAPER}" stroke-width="2"/>${rays}${coin(36,50,14,RED)}`;
  }
  const positions = {
    2: [[36,28,14,GREEN],[36,73,14,INK]],
    3: [[19,25,12,GREEN],[36,50,12,RED],[53,75,12,INK]],
    4: [[20,28,12,GREEN],[52,28,12,INK],[20,72,12,INK],[52,72,12,GREEN]],
    5: [[19,24,11.5,GREEN],[53,24,11.5,INK],[36,50,11.5,RED],[19,76,11.5,INK],[53,76,11.5,GREEN]],
    6: [[20,24,12,INK],[52,24,12,INK],[20,53,12,RED],[52,53,12,RED],[20,79,12,RED],[52,79,12,RED]],
    7: [[14,19,10,INK],[36,29,10,INK],[58,39,10,INK],[23,58,11,RED],[49,58,11,RED],[23,81,11,RED],[49,81,11,RED]],
    8: [[21,18,10.4,GREEN],[51,18,10.4,INK],[21,39,10.4,GREEN],[51,39,10.4,INK],[21,61,10.4,GREEN],[51,61,10.4,INK],[21,82,10.4,GREEN],[51,82,10.4,INK]],
    9: [[14,24,10.4,GREEN],[36,24,10.4,GREEN],[58,24,10.4,GREEN],[14,50,10.4,RED],[36,50,10.4,RED],[58,50,10.4,RED],[14,76,10.4,INK],[36,76,10.4,INK],[58,76,10.4,INK]],
  };
  return positions[number].map(([x,y,r,c]) => coin(x,y,r,recolor(c))).join('');
}

/** One bamboo stem: rounded cut ends, two joints and engraved central channel. */
function bamboo(x, y, h, color = GREEN, angle = 0, width = 10) {
  const w = width, top = -h/2, bottom = h/2, joint = h*.19;
  return `<g transform="translate(${x} ${y}) rotate(${angle})" fill="${color}"><path d="M ${-w*.45} ${top} Q 0 ${top-2.2} ${w*.45} ${top} L ${w*.28} ${top+4} L ${w*.28} ${bottom-4} L ${w*.45} ${bottom} Q 0 ${bottom+2.2} ${-w*.45} ${bottom} L ${-w*.28} ${bottom-4} L ${-w*.28} ${top+4} Z"/><rect x="${-w*.52}" y="${-joint-1.1}" width="${w*1.04}" height="2.3" rx=".7"/><rect x="${-w*.52}" y="${joint-1.1}" width="${w*1.04}" height="2.3" rx=".7"/><path d="M -1 ${top+4} L -1 ${bottom-4}" fill="none" stroke="${PAPER}" stroke-width="1.3" opacity=".9"/></g>`;
}

function bird() {
  // 一索: a peacock perched above its blue-and-red curling legs. Its fan is
  // intentionally recognisable at small sizes, never a generic numeral “1”.
  let feathers = '';
  for (let k = -3; k <= 3; k++) {
    const angle = k * .22, x = 36 + Math.sin(angle) * 29, y = 49 - Math.cos(angle) * 27;
    feathers += `<path d="M 36 63 Q ${n(x-6)} ${n(y+14)} ${n(x)} ${n(y)} Q ${n(x+8)} ${n(y+10)} 39 65 Z" fill="${GREEN}"/><ellipse cx="${n(x)}" cy="${n(y+2)}" rx="4.2" ry="5" fill="${GREEN}"/><ellipse cx="${n(x)}" cy="${n(y+1)}" rx="1.7" ry="2" fill="${PAPER}"/>`;
  }
  return `${feathers}<path d="M 36 45 C 43 42 46 47 43 53 C 43 59 46 65 41 70 C 36 75 25 73 25 65 C 25 60 31 55 33 52 L 32 42 C 27 43 26 39 28 36 C 31 32 39 34 39 39 L 39 45 Z" fill="${INK}"/><path d="M 33 48 C 26 57 29 68 37 67 C 33 61 35 55 38 51" fill="${GREEN}"/><path d="M 30 38 L 23 41 L 30 43 Z" fill="${RED}"/><circle cx="32" cy="38" r="1.1" fill="${PAPER}"/><path d="M 31 34 L 28 29 M 34 33 L 34 28 M 37 34 L 40 30" stroke="${GREEN}" stroke-width="2"/><path d="M 34 72 L 31 80 L 24 83 M 40 70 L 42 79 L 50 82" fill="none" stroke="${RED}" stroke-width="2.8" stroke-linecap="round"/><path d="M 35 69 C 30 82 16 90 12 85 C 16 92 37 88 41 74" fill="${INK}"/><path d="M 39 68 C 39 80 50 84 57 83 C 53 91 38 84 37 75" fill="${GREEN}"/>`;
}

function bamboos(number, red) {
  if (number === 1) return bird();
  const color = c => red ? RED : c;
  if (number === 8) {
    // Four outer stalks and four crossing diagonal stalks: the traditional 八索.
    return [[15,28,28,0],[57,28,28,0],[15,72,28,0],[57,72,28,0],[29,28,26,43],[43,28,26,-43],[29,72,26,-43],[43,72,26,43]].map(([x,y,h,a]) => bamboo(x,y,h,GREEN,a,10)).join('');
  }
  const positions = {
    2: [[36,28,27,GREEN],[36,73,27,GREEN]],
    3: [[36,24,27,GREEN],[20,73,27,GREEN],[52,73,27,GREEN]],
    4: [[20,27,29,GREEN],[52,27,29,GREEN],[20,73,29,GREEN],[52,73,29,GREEN]],
    5: [[17,25,28,GREEN],[55,25,28,GREEN],[36,50,28,RED],[17,75,28,GREEN],[55,75,28,GREEN]],
    6: [[16,28,29,GREEN],[36,28,29,GREEN],[56,28,29,GREEN],[16,73,29,GREEN],[36,73,29,GREEN],[56,73,29,GREEN]],
    7: [[36,19,22,RED],[16,50,22,GREEN],[36,50,22,GREEN],[56,50,22,GREEN],[16,80,22,GREEN],[36,80,22,GREEN],[56,80,22,GREEN]],
    9: [[16,20,22,GREEN],[36,20,22,RED],[56,20,22,GREEN],[16,50,22,GREEN],[36,50,22,RED],[56,50,22,GREEN],[16,80,22,GREEN],[36,80,22,RED],[56,80,22,GREEN]],
  };
  return positions[number].map(([x,y,h,c]) => bamboo(x,y,h,color(c))).join('');
}

function artwork(type, red) {
  if (type < 0) return '';
  if (type < 9) {
    const digit = '一二三四五六七八九'[type];
    const naturalHeights = [8,20,28,33,33,33,33,33,33];
    return glyph(digit,36,27,43,naturalHeights[type],red ? RED : INK) + glyph('萬',36,68,48,39,RED);
  }
  if (type < 18) return circles(type - 8, red);
  if (type < 27) return bamboos(type - 17, red);
  if (type === 31) return '';
  return glyph(['東','南','西','北','','發','中'][type-27],36,50,type === 33 ? 40 : 49,type === 33 ? 70 : 62,type === 32 ? GREEN : type === 33 ? RED : INK);
}

export function tileSVG(type, red = false) {
  if (type && typeof type === 'object') {red = type.red ?? red;type = type.type;}
  if (!Number.isInteger(type) || type < -1 || type > 33) throw new RangeError('Unknown mahjong tile type');
  const key = `${type}:${red ? 1 : 0}`;
  if (!CACHE.has(key)) {
    const name = type < 0 ? '伏せ牌' : type < 9 ? `${type+1}萬` : type < 18 ? `${type-8}筒` : type < 27 ? `${type-17}索` : ['東','南','西','北','白','發','中'][type-27];
    CACHE.set(key, `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="200" viewBox="0 0 72 100" role="img" aria-label="${red ? '赤' : ''}${name}"><rect x=".5" y=".5" width="71" height="99" rx="5" fill="${PAPER}" stroke="#e5decd" stroke-width="1"/><g>${artwork(type,red)}</g></svg>`);
  }
  return CACHE.get(key);
}

export function tileDataURL(type, red = false) {
  if (type && typeof type === 'object') {red = type.red ?? red;type = type.type;}
  const key = `${type}:${red ? 1 : 0}`;
  if (!DATA_CACHE.has(key)) DATA_CACHE.set(key, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tileSVG(type,red))}`);
  return DATA_CACHE.get(key);
}

/** Synchronous Texture object; .userData.ready resolves once its SVG is drawn. */
export function createTileTexture(THREE, type, red = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 288; canvas.height = 400;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PAPER; ctx.fillRect(0,0,canvas.width,canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const img = new Image();
  texture.userData.ready = new Promise((resolve, reject) => {
    img.onload = () => { ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);texture.needsUpdate=true;resolve(texture); };
    img.onerror = reject;
  });
  img.src = tileDataURL(type,red);
  return texture;
}

export const TILE_FACE_REFERENCE = 'https://www.ma-jan.or.jp/activity/yaku.html';
