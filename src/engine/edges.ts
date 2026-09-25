// Edges are the game's jokers: passive perks that bend the rules for the whole day.

export type EdgeId = 'coffee' | 'thetaGang' | 'riskBuddy' | 'tapeReader' | 'momentum' | 'bigBook' | 'taxWizard' | 'volHunter';

export interface EdgeDef {
  id: EdgeId;
  name: string;
  text: string;
  color: string;
  glyph: string;
}

export const EDGES: Record<EdgeId, EdgeDef> = {
  coffee: { id: 'coffee', name: 'Coffee Addict', text: '+1 Focus every turn, but your loss limit is $500 lower.', color: '#a86a45', glyph: 'C' },
  thetaGang: { id: 'thetaGang', name: 'Theta Gang', text: '+1 mult while you hold sold options.', color: '#ffc94a', glyph: 'T' },
  riskBuddy: { id: 'riskBuddy', name: 'Risk Desk Buddy', text: 'Your daily loss limit is $1,000 higher.', color: '#6aa0e0', glyph: 'R' },
  tapeReader: { id: 'tapeReader', name: 'Tape Reader', text: 'Draw 1 extra card every turn.', color: '#7cc86a', glyph: 'D' },
  momentum: { id: 'momentum', name: 'Momentum Mike', text: '+1 mult while your shares point the same way as the last move.', color: '#f07a8a', glyph: 'M' },
  bigBook: { id: 'bigBook', name: 'Bigger Book', text: 'Your risk budget is $3,000 higher.', color: '#3f6f78', glyph: 'B' },
  taxWizard: { id: 'taxWizard', name: 'Tax Wizard', text: '+$3 desk bonus after every winning day.', color: '#c9a040', glyph: '$' },
  volHunter: { id: 'volHunter', name: 'Vol Hunter', text: '+1 mult while you own bought options.', color: '#c9608a', glyph: 'V' },
};

export const MAX_EDGES = 4;

export const EDGE_IDS = Object.keys(EDGES) as EdgeId[];
