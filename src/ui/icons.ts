import type { CardId } from '../engine/cards';

// 9x8 pixel icons for the card art. o = outline, other letters map to colours below.
export const ICONS: Record<CardId, string[]> = {
  buy: ['....o....', '...oGo...', '..oGGGo..', '.oGGGGGo.', 'ooooGoooo', '...oGo...', '...oGo...', '...ooo...'],
  short: ['...ooo...', '...oRo...', '...oRo...', 'ooooRoooo', '.oRRRRRo.', '..oRRRo..', '...oRo...', '....o....'],
  stop: ['..ooooo..', '.oRRRRRo.', 'oRRWWWRRo', 'oRWRRRWRo', 'oRRRRRRRo', '.oRRRRRo.', '..ooooo..', '.........'],
  takeProfit: ['ooooooooo', 'oGGGGGGGo', 'oGGoWoGGo', 'oGoWWWoGo', 'oGGoWoGGo', 'oGGGGGGGo', 'ooooooooo', '.........'],
  cutLoss: ['o.......o', '.o.....o.', '..oRRRo..', '...oRo...', '..oRRRo..', '.o.....o.', 'o.......o', '.........'],
  tape: ['ooooooooo', 'oWWWWWWWo', 'oWBWBWBWo', 'oWWWWWWWo', 'oWBWWBWWo', 'oWWWWWWWo', 'ooooooooo', '.........'],
  espresso: ['..o.o....', '...o.o...', 'oooooooo.', 'oWWWWWWoo', 'oBBBBBBo.o', 'oBBBBBBoo', '.oooooo..', 'oooooooo.'],
  protPut: ['.ooooooo.', 'oWWWWWWWo', 'oWWBBBWWo', 'oWBBBBBWo', '.oWBBBWo.', '..oWBWo..', '...oWo...', '....o....'],
  sellPut: ['o.......o', 'oG.....Go', 'oGGGGGGGo', 'oG.....Go', 'oG.....Go', 'oG.....Go', 'oRRRRRRRo', 'ooooooooo'],
  sellCall: ['ooooooooo', 'oRRRRRRRo', 'oG.....Go', 'oG.....Go', 'oG.....Go', 'oGGGGGGGo', 'oG.....Go', 'o.......o'],
  condor: ['ooooooooo', 'oRRRRRRRo', 'oG.....Go', 'oGGGGGGGo', 'oG.....Go', 'oRRRRRRRo', 'ooooooooo', '.........'],
  roll: ['...oo....', '..oPPo...', '.oPPPPooo', '...oPPPPo', 'ooooPPPo.', '.oPPPPo..', '...oPo...', '....o....'],
};
export const ICON_COLORS: Record<string, string> = { o: '#3b2a36', G: '#5aa84a', R: '#e8574a', W: '#fffaf0', B: '#6aa0e0', P: '#8a60c8' };

export const TYPE_COLORS: Record<string, [string, string, string]> = {
  // base, dark, art background
  LONG: ['#7cc86a', '#4f9a48', '#d8f0c8'],
  SHORT: ['#f07a6a', '#c9563f', '#fbd8d0'],
  PREMIUM: ['#6aa0e0', '#4a7cc0', '#d6e8fb'],
  SAFE: ['#8fd6c4', '#5aa894', '#d8f4ec'],
  CLOSE: ['#ffc94a', '#d8a020', '#fff2c8'],
  SKILL: ['#c8b8a8', '#9a8878', '#f3ece4'],
  ADJUST: ['#b58af0', '#8a60c8', '#e8dcff'],
};
