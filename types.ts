export interface User {
  id: string;
  name: string;
  color: string; // Tailwind color class or Hex
  avatar: string;
  pin: string; // 4 digit security code
}

export interface GiftItem {
  id: string;
  ownerId: string;
  title: string;
  link?: string;
  addedBy: string; // userId
  claimedBy?: string | null; // userId or null
  isSurprise: boolean; // If true, owner cannot see this item
  createdAt: number;
}

export interface GeneratedGiftItem {
  title: string;
  link?: string;
}

export enum AppView {
  LISTS = 'LISTS',
  AI_SCANNER = 'AI_SCANNER'
}