import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { GiftItem, User } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyBGWp79xsM3k-iM_TJl_rk02HznweqHz0k",
  authDomain: "christmas-list-fa446.firebaseapp.com",
  projectId: "christmas-list-fa446",
  storageBucket: "christmas-list-fa446.firebasestorage.app",
  messagingSenderId: "783572371512",
  appId: "1:783572371512:web:bd0e217d4f40720d0d3ecd",
  measurementId: "G-4BYYT9M04Y"
};

// Check if config is still default
export const isDemoMode = firebaseConfig.apiKey === "REPLACE_WITH_YOUR_API_KEY";

let db: any = null;

if (!isDemoMode) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (e) {
    console.warn("Firebase init failed:", e);
  }
} else {
  console.warn("⚠️ USING DEMO MODE: Firebase keys not set. Data will not be shared between devices.");
}

// --- MOCK DATA STORE (For when keys aren't set) ---
let mockUsers: User[] = [];
let mockItems: GiftItem[] = [];
let userListeners: ((users: User[]) => void)[] = [];
let itemListeners: ((items: GiftItem[]) => void)[] = [];

const notifyUserListeners = () => userListeners.forEach(cb => cb([...mockUsers]));
const notifyItemListeners = () => itemListeners.forEach(cb => cb([...mockItems]));

// --- USERS ---

export const subscribeToUsers = (onUpdate: (users: User[]) => void) => {
  // DEMO MODE
  if (!db) {
    userListeners.push(onUpdate);
    // Return mock users immediately
    setTimeout(() => onUpdate([...mockUsers]), 100);
    return () => { userListeners = userListeners.filter(l => l !== onUpdate); };
  }

  // REAL MODE
  const q = query(collection(db, 'users'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const users: User[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));
    onUpdate(users);
  }, (err) => {
    console.error("User sync error:", err);
  });
};

export const addUserToDB = async (user: Omit<User, 'id'>): Promise<string> => {
  // DEMO MODE
  if (!db) {
    const newId = 'mock_user_' + Date.now();
    const newUser = { ...user, id: newId };
    mockUsers.push(newUser);
    notifyUserListeners();
    return new Promise(resolve => setTimeout(() => resolve(newId), 500));
  }

  // REAL MODE
  const docRef = await addDoc(collection(db, 'users'), user);
  return docRef.id;
};

// --- GIFTS ---

export const subscribeToGiftItems = (onUpdate: (items: GiftItem[]) => void) => {
  // DEMO MODE
  if (!db) {
    itemListeners.push(onUpdate);
    setTimeout(() => onUpdate([...mockItems]), 100);
    return () => { itemListeners = itemListeners.filter(l => l !== onUpdate); };
  }

  // REAL MODE
  const q = query(collection(db, 'gifts'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const items: GiftItem[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as GiftItem));
    onUpdate(items);
  }, (err) => {
    console.error("Gifts sync error:", err);
  });
};

export const addGiftItemToDB = async (item: Omit<GiftItem, 'id'>) => {
  // DEMO MODE
  if (!db) {
    const newItem = { ...item, id: 'mock_item_' + Date.now() };
    mockItems.unshift(newItem);
    notifyItemListeners();
    return;
  }

  // REAL MODE
  await addDoc(collection(db, 'gifts'), item);
};

export const toggleGiftClaimInDB = async (itemId: string, userId: string, currentClaimedBy: string | null | undefined) => {
  // DEMO MODE
  if (!db) {
    mockItems = mockItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          claimedBy: item.claimedBy === userId ? null : userId
        };
      }
      return item;
    });
    notifyItemListeners();
    return;
  }

  // REAL MODE
  const itemRef = doc(db, 'gifts', itemId);
  const newClaimStatus = currentClaimedBy === userId ? null : userId;
  await updateDoc(itemRef, { claimedBy: newClaimStatus });
};

export const deleteGiftItemFromDB = async (itemId: string) => {
  // DEMO MODE
  if (!db) {
    mockItems = mockItems.filter(i => i.id !== itemId);
    notifyItemListeners();
    return;
  }

  // REAL MODE
  await deleteDoc(doc(db, 'gifts', itemId));
};
