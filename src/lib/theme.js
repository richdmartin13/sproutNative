// Mirrors web theme.js — per-scheme dark AND light tints, brand palette
export const SCHEMES = {
  sprout: { label:'Sprout', accent:'#2d6e47', accentSoft:'#3d8f5f', grad:['#1a4a2e','#2d6e47','#3d8f5f'], glow:'rgba(45,110,71,0.45)', darkBg:'#09100c', darkBg2:'#101a12', darkSurface:'rgba(20,34,24,0.94)', darkSurface2:'rgba(28,46,32,0.88)', darkSolid:'#121e14', darkSolid2:'#192618', darkSolid3:'#213020', darkText:'#edf2ec', darkText2:'#b0c4b2', darkMuted:'#72907a', darkNav:'rgba(18,30,20,0.94)', lightText:'#0d2819', lightText2:'#2a4a34', lightMuted:'#4e7858', lightBorder:'rgba(26,74,46,0.10)', lightBorder2:'rgba(26,74,46,0.18)', heat:['#0d2b1a','#1a4a2e','#2d6e47','#3d8f5f','#4aae77','#69c994','#8ddeb0','#b4eecb','#d8f7e5','#fde68a'] },
  indigo: { label:'Indigo', accent:'#7c5cec', accentSoft:'#a288f5', grad:['#5a46c8','#7c5cec','#a288f5'], glow:'rgba(124,92,236,0.45)', darkBg:'#0c0a16', darkBg2:'#13101e', darkSurface:'rgba(28,22,48,0.94)', darkSurface2:'rgba(38,32,62,0.88)', darkSolid:'#171228', darkSolid2:'#1f1832', darkSolid3:'#28203e', darkText:'#f0ecfa', darkText2:'#c2b8e0', darkMuted:'#8a82aa', darkNav:'rgba(22,18,40,0.94)', lightText:'#1a1240', lightText2:'#3a2e6a', lightMuted:'#5e5290', lightBorder:'rgba(60,40,140,0.10)', lightBorder2:'rgba(60,40,140,0.18)', heat:['#1c1650','#2d2478','#4030a8','#5a46c8','#7c5cec','#9e80f8','#c0a8ff','#ddd0ff','#eee7ff','#fde68a'] },
  violet: { label:'Violet', accent:'#9b5de8', accentSoft:'#c084ff', grad:['#7c48cc','#9b5de8','#c084ff'], glow:'rgba(155,93,232,0.45)', darkBg:'#0e0916', darkBg2:'#15101f', darkSurface:'rgba(32,20,52,0.94)', darkSurface2:'rgba(42,28,66,0.88)', darkSolid:'#19102a', darkSolid2:'#221736', darkSolid3:'#2c2042', darkText:'#f2edfb', darkText2:'#c8b8e4', darkMuted:'#9480b2', darkNav:'rgba(24,14,42,0.94)', lightText:'#200e3a', lightText2:'#3e1e62', lightMuted:'#6a4890', lightBorder:'rgba(80,30,160,0.10)', lightBorder2:'rgba(80,30,160,0.18)', heat:['#281648','#3e2270','#5c34a8','#7c48cc','#9b5de8','#bc84ff','#d8b2ff','#eeddff','#f7eaff','#fde68a'] },
  ocean:  { label:'Ocean',  accent:'#3498e8', accentSoft:'#7ec0ff', grad:['#2478c8','#3498e8','#7ec0ff'], glow:'rgba(52,152,232,0.45)',  darkBg:'#091016', darkBg2:'#101820', darkSurface:'rgba(16,32,52,0.94)', darkSurface2:'rgba(22,42,66,0.88)', darkSolid:'#111e2e', darkSolid2:'#172638', darkSolid3:'#1e3046', darkText:'#eaf2fb', darkText2:'#b0cce4', darkMuted:'#6898ba', darkNav:'rgba(14,26,44,0.94)', lightText:'#0c2040', lightText2:'#1c3c62', lightMuted:'#3a6890', lightBorder:'rgba(20,80,160,0.10)', lightBorder2:'rgba(20,80,160,0.18)', heat:['#0c2848','#113c6c','#1858a0','#2478c8','#3498e8','#5cb8ff','#8ed4ff','#bcebff','#dff4ff','#fde68a'] },
  ember:  { label:'Ember',  accent:'#f07030', accentSoft:'#ff9e6a', grad:['#d45010','#f07030','#ff9e6a'], glow:'rgba(240,112,48,0.45)',  darkBg:'#140a04', darkBg2:'#1e1008', darkSurface:'rgba(42,20,8,0.94)', darkSurface2:'rgba(56,26,10,0.88)', darkSolid:'#221408', darkSolid2:'#2e1c0e', darkSolid3:'#3a2416', darkText:'#faf0e8', darkText2:'#e0c4ae', darkMuted:'#b08060', darkNav:'rgba(30,14,6,0.94)', lightText:'#3a1800', lightText2:'#602c0a', lightMuted:'#904830', lightBorder:'rgba(160,60,0,0.10)', lightBorder2:'rgba(160,60,0,0.18)', heat:['#461800','#6e2400','#a83800','#d45010','#f07030','#ff9050','#ffb880','#ffd8b8','#ffeed8','#fefcd0'] },
  moss:   { label:'Moss',   accent:'#44a050', accentSoft:'#86d896', grad:['#347c3c','#44a050','#86d896'], glow:'rgba(68,160,80,0.45)',   darkBg:'#080f08', darkBg2:'#0e160e', darkSurface:'rgba(16,30,16,0.94)', darkSurface2:'rgba(22,40,22,0.88)', darkSolid:'#101c10', darkSolid2:'#172418', darkSolid3:'#1e2e1e', darkText:'#edf5ed', darkText2:'#aec8ae', darkMuted:'#6a9870', darkNav:'rgba(12,22,12,0.94)', lightText:'#102410', lightText2:'#224a22', lightMuted:'#3e7242', lightBorder:'rgba(30,100,36,0.10)', lightBorder2:'rgba(30,100,36,0.18)', heat:['#122818','#1c4020','#285c2c','#347c3c','#44a050','#62c070','#88dc98','#b8f0c8','#dcf5e2','#fde68a'] },
  rose:   { label:'Rose',   accent:'#e04888', accentSoft:'#f594bd', grad:['#be3870','#e04888','#f594bd'], glow:'rgba(224,72,136,0.45)',  darkBg:'#140810', darkBg2:'#1e0e18', darkSurface:'rgba(42,12,32,0.94)', darkSurface2:'rgba(56,16,42,0.88)', darkSolid:'#220e1c', darkSolid2:'#2e1426', darkSolid3:'#3a1a30', darkText:'#faedf5', darkText2:'#e0b8d4', darkMuted:'#b07090', darkNav:'rgba(28,10,22,0.94)', lightText:'#38082a', lightText2:'#621644', lightMuted:'#923060', lightBorder:'rgba(160,30,100,0.10)', lightBorder2:'rgba(160,30,100,0.18)', heat:['#40142e','#621c42','#902858','#be3870','#e04888','#f270a8','#f898c4','#fcc4de','#ffe2ee','#fde68a'] },
};

const LIGHT = { bg:'#f4f0e8', bg2:'#ece8df', surface:'rgba(255,255,255,0.90)', surface2:'rgba(255,255,255,0.75)', solid:'#ffffff', solid2:'#f7f4ee', solid3:'#ede9e0', overlay:'rgba(14,42,26,0.40)', navBg:'rgba(244,240,232,0.85)', navBorder:'rgba(26,74,46,0.12)', navActive:'rgba(255,255,255,0.88)', navInnerTop:'rgba(255,255,255,0.85)', navInnerBottom:'rgba(26,74,46,0.04)', glassHighlight:'rgba(255,255,255,0.90)', glassTint:'rgba(255,255,255,0.55)' };

export const TYPE_COLORS = { go:'#34d399', st:'#fb7185', ne:'#60a5fa' };
export const TYPE_LABELS  = { go:'Start', st:'Stop', ne:'Neutral' };

export function getTheme(prefs = {}, systemDark = true) {
  // null/undefined → follow system; explicit true/false → override
  const dark = prefs.dark != null ? !!prefs.dark : systemDark;
  const s = SCHEMES[prefs.scheme] || SCHEMES.sprout;
  // shadowModes: which modes have card/element glow shadows enabled
  // default ['dark'] — light mode off, dark mode on
  const shadowModes = prefs.dev?.shadowModes ?? ['dark'];
  const shadowsOn = dark ? shadowModes.includes('dark') : shadowModes.includes('light');
  function hexA(hex, a) {
    const h = hex.replace('#','');
    return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;
  }
  return {
    isDark: dark,
    bg:       dark ? s.darkBg      : LIGHT.bg,
    bg2:      dark ? s.darkBg2     : LIGHT.bg2,
    surface:  dark ? s.darkSurface : LIGHT.surface,
    surface2: dark ? s.darkSurface2: LIGHT.surface2,
    solid:    dark ? s.darkSolid   : LIGHT.solid,
    solid2:   dark ? s.darkSolid2  : LIGHT.solid2,
    solid3:   dark ? s.darkSolid3  : LIGHT.solid3,
    border:   dark ? 'rgba(255,255,255,0.08)' : s.lightBorder,
    border2:  dark ? 'rgba(255,255,255,0.14)' : s.lightBorder2,
    text:     dark ? s.darkText    : s.lightText,
    text2:    dark ? s.darkText2   : s.lightText2,
    muted:    dark ? s.darkMuted   : s.lightMuted,
    overlay:  dark ? 'rgba(0,0,0,0.65)' : LIGHT.overlay,
    navBg:    dark ? s.darkNav     : LIGHT.navBg,
    navBorder:dark ? 'rgba(255,255,255,0.12)' : LIGHT.navBorder,
    navActive:dark ? 'rgba(255,255,255,0.10)'  : LIGHT.navActive,
    glassHighlight: dark ? 'rgba(255,255,255,0.10)' : LIGHT.glassHighlight,
    glassTint:      dark ? 'rgba(255,255,255,0.04)' : LIGHT.glassTint,
    navInnerTop:    dark ? 'rgba(255,255,255,0.18)' : LIGHT.navInnerTop,
    navInnerBottom: dark ? 'rgba(255,255,255,0.04)' : LIGHT.navInnerBottom,
    accent: s.accent, accentSoft: s.accentSoft,
    accentDim:    hexA(s.accent, 0.18),
    accentSubtle: hexA(s.accent, 0.28),
    accentBorder: hexA(s.accent, 0.40),
    accentMid:    hexA(s.accent, 0.55),
    accentGlow: s.glow, grad: s.grad, heat: s.heat,
    shadowsOn,
    liquidGlassOn: prefs?.dev?.liquidGlass !== false,
    glassChipsOn:  prefs?.dev?.glassChips  !== false,
    typeGo: TYPE_COLORS.go, typeSt: TYPE_COLORS.st, typeNe: TYPE_COLORS.ne,
  };
}

export function heatColor(count, max, prefs = {}) {
  if (!count) return null;
  const s = SCHEMES[prefs.scheme] || SCHEMES.sprout;
  const idx = Math.min(9, Math.max(0, Math.ceil((count / Math.max(1, max)) * 10) - 1));
  return s.heat[idx];
}
