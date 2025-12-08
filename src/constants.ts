import { User, GiftItem } from './types';

export const FAMILY_SECRET_CODE = "HOLLY"; // Simple password for the family

export const AVATAR_OPTIONS = ['🎅', '🤶', '🦌', '🧝', '🧝‍♀️', '⛄', '🍪', '🥛', '🎁', '🎄', '👦', '👧', '👨', '👩', '🦊', '🐻'];
export const COLOR_OPTIONS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16'  // Lime
];

// NOTE: INITIAL_ITEMS is no longer used for the main app state, 
// but we keep it here as a reference or fallback type structure.
export const INITIAL_ITEMS: GiftItem[] = [
  {
    id: 'i1',
    ownerId: 'u1',
    title: 'Cozy Wool Socks',
    addedBy: 'u1',
    claimedBy: 'u2',
    isSurprise: false,
    createdAt: Date.now()
  }
];