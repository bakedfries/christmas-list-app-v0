import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Gift, ExternalLink, LogOut, AlertTriangle, Wand2, Lock } from 'lucide-react';
import Snowfall from './components/Snowfall';
import AuthScreen from './components/AuthScreen';
import Button from './components/Button';
import ProfileSwitcher from './components/ProfileSwitcher';
import AIParserModal from './components/AIParserModal';
import { User, GiftItem, GeneratedGiftItem } from './types';
import { 
  subscribeToGiftItems, 
  addGiftItemToDB, 
  toggleGiftClaimInDB, 
  deleteGiftItemFromDB,
  subscribeToUsers,
  isDemoMode
} from './services/firebase';

function App() {
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<GiftItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('north_pole_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // View State
  const [selectedListOwnerId, setSelectedListOwnerId] = useState<string>(''); // Set after login
  const [newItemText, setNewItemText] = useState('');
  const [newItemLink, setNewItemLink] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  // 1. Subscribe to Users
  useEffect(() => {
    const unsubscribe = subscribeToUsers((fetchedUsers) => {
      setUsers(fetchedUsers);
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Gifts
  useEffect(() => {
    const unsubscribe = subscribeToGiftItems((fetchedItems) => {
      setItems(fetchedItems);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. Persist Login Logic & User Validation
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('north_pole_current_user', JSON.stringify(currentUser));
      if (!selectedListOwnerId) {
        setSelectedListOwnerId(currentUser.id);
      }
      
      // Safety check: If user was deleted from DB but still in local storage
      if (users.length > 0) {
        const userExists = users.find(u => u.id === currentUser.id);
        if (!userExists) {
          handleLogout();
        } else {
            // Update local user data if changed in DB
            if (userExists.avatar !== currentUser.avatar || userExists.name !== currentUser.name) {
                setCurrentUser(userExists);
            }
        }
      }
    } else {
      localStorage.removeItem('north_pole_current_user');
    }
  }, [currentUser, selectedListOwnerId, users]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setSelectedListOwnerId(user.id);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedListOwnerId('');
  };

  const addItem = async (title: string, link?: string) => {
    if (!currentUser) return;

    const isSurprise = currentUser.id !== selectedListOwnerId;
    
    // We don't generate ID here, Firestore does
    await addGiftItemToDB({
      ownerId: selectedListOwnerId,
      title,
      link,
      addedBy: currentUser.id,
      isSurprise,
      claimedBy: isSurprise ? currentUser.id : null, // If adding surprise, auto-claim it
      createdAt: Date.now()
    });
    
    setNewItemText('');
    setNewItemLink('');
  };

  const handleAIItems = (generatedItems: GeneratedGiftItem[]) => {
    generatedItems.forEach(item => {
      addItem(item.title, item.link);
    });
  };

  const toggleClaim = async (item: GiftItem) => {
    if (!currentUser) return;
    
    // Optimistic UI update could go here, but Firebase is fast enough usually
    await toggleGiftClaimInDB(item.id, currentUser.id, item.claimedBy);
  };

  const deleteItem = async (itemId: string) => {
    if (window.confirm("Are you sure you want to remove this from the list?")) {
      await deleteGiftItemFromDB(itemId);
    }
  };

  // Filter items based on viewing rules
  const visibleItems = items.filter(item => {
    // Only show items belonging to the selected list owner
    if (item.ownerId !== selectedListOwnerId) return false;

    // Viewing OWN list
    if (currentUser?.id === selectedListOwnerId) {
      // Don't show surprises added by others
      return !item.isSurprise;
    } 
    
    // Viewing SOMEONE ELSE'S list
    return true; // Show everything (original wishes + surprises added by me/others)
  });

  const viewingOwner = users.find(u => u.id === selectedListOwnerId);
  const isViewingOwnList = currentUser?.id === selectedListOwnerId;

  // Render Login Screen if not logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#165B33] relative overflow-hidden">
        <Snowfall />
        {isDemoMode && (
          <div className="bg-red-500 text-white text-center p-2 font-bold z-50 relative">
             ⚠️ DEMO MODE: Data will NOT save or share. Please add Firebase keys to services/firebase.ts
          </div>
        )}
        <AuthScreen users={users} onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#165B33] relative overflow-hidden flex flex-col">
      <Snowfall />

      {/* Demo Mode Banner */}
      {isDemoMode && (
          <div className="bg-red-500 text-white text-center p-2 font-bold z-50 relative animate-pulse flex items-center justify-center gap-2">
             <AlertTriangle className="w-5 h-5" /> DEMO MODE: Data will NOT save or share.
          </div>
      )}

      {/* Header */}
      <header className="bg-[#D42426] text-[#FDF5E6] p-4 shadow-lg z-10 flex flex-col gap-4 sticky top-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Gift className="w-8 h-8 text-[#F8B229]" />
            <h1 className="font-christmas text-2xl md:text-3xl font-bold">North Pole Lists</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm bg-black/20 px-3 py-1 rounded-full hover:bg-black/30 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Exit
          </button>
        </div>

        <div className="flex flex-col gap-2">
           <p className="text-sm opacity-90 text-center">Viewing Wishlist For:</p>
           <ProfileSwitcher 
             users={users} 
             currentUser={viewingOwner || currentUser} 
             onSwitch={(u) => setSelectedListOwnerId(u.id)} 
           />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-32 z-10 max-w-2xl w-full mx-auto">
        <div className="bg-[#FDF5E6] rounded-2xl shadow-xl p-4 min-h-[50vh] border-4 border-[#F8B229]">
          <div className="flex items-center justify-between mb-6 border-b-2 border-dashed border-[#165B33]/20 pb-4">
             <div>
                <h2 className="font-christmas text-3xl text-[#165B33]">
                  {viewingOwner?.name || 'Loading...'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {isViewingOwnList ? "Your personal wishlist" : "Add surprises they won't see!"}
                </p>
             </div>
             <span className="text-5xl">{viewingOwner?.avatar}</span>
          </div>

          {isLoading ? (
             <div className="text-center py-10 text-gray-500">Loading lists from the North Pole...</div>
          ) : visibleItems.length === 0 ? (
             <div className="text-center py-10 text-gray-400 italic">
               No wishes found. Time to add some!
             </div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map(item => {
                const isClaimedByMe = item.claimedBy === currentUser.id;
                const isClaimedByOther = item.claimedBy && item.claimedBy !== currentUser.id;
                const claimer = users.find(u => u.id === item.claimedBy);

                return (
                  <div key={item.id} className={`p-3 rounded-xl border-2 transition-all ${
                    item.claimedBy ? 'bg-gray-100 border-gray-200 opacity-80' : 'bg-white border-[#165B33]/20 hover:border-[#165B33]'
                  } ${item.isSurprise ? 'border-dashed border-purple-400 bg-purple-50' : ''}`}>
                    
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-lg text-gray-800 break-words">{item.title}</span>
                           {item.isSurprise && (
                             <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                               <Gift className="w-3 h-3" /> Surprise
                             </span>
                           )}
                        </div>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm flex items-center gap-1 hover:underline mt-1">
                            <ExternalLink className="w-3 h-3" /> View Link
                          </a>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          Added by {users.find(u => u.id === item.addedBy)?.name || 'Unknown'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                         {isViewingOwnList ? (
                           <button onClick={() => deleteItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                             <Trash2 className="w-5 h-5" />
                           </button>
                         ) : (
                           <button 
                             onClick={() => !isClaimedByOther && toggleClaim(item)}
                             disabled={!!isClaimedByOther}
                             className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-all ${
                               isClaimedByMe 
                                 ? 'bg-green-500 text-white hover:bg-green-600'
                                 : isClaimedByOther
                                   ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                   : 'border-2 border-green-600 text-green-600 hover:bg-green-50'
                             }`}
                           >
                             {isClaimedByMe ? (
                               <><Check className="w-4 h-4" /> Got it!</>
                             ) : isClaimedByOther ? (
                               <><Lock className="w-4 h-4" /> {claimer?.name?.split(' ')[0]}</>
                             ) : (
                               "I'll get it"
                             )}
                           </button>
                         )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add Item Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t-2 border-gray-200 z-40">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          {viewingOwner && (
            <p className="text-xs text-gray-500 font-bold ml-1">
              Adding to {viewingOwner.id === currentUser.id ? "your list" : `${viewingOwner.name}'s list (Surprise!)`}
            </p>
          )}
          <div className="flex gap-2">
            <input 
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="What do they want?"
              className="flex-1 p-3 border-2 border-gray-300 rounded-xl focus:border-[#D42426] outline-none"
              onKeyDown={(e) => e.key === 'Enter' && newItemText && addItem(newItemText, newItemLink)}
            />
             <Button variant="secondary" onClick={() => setShowAIModal(true)} title="Scan List">
               <Wand2 className="w-5 h-5" />
             </Button>
            <Button 
              variant="christmas" 
              onClick={() => addItem(newItemText, newItemLink)}
              disabled={!newItemText.trim()}
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
          {newItemText && (
             <input 
               value={newItemLink}
               onChange={(e) => setNewItemLink(e.target.value)}
               placeholder="Link (optional)..."
               className="w-full text-sm p-2 bg-transparent border-b border-gray-300 focus:border-[#D42426] outline-none text-gray-600"
             />
          )}
        </div>
      </footer>

      {showAIModal && (
        <AIParserModal 
          onClose={() => setShowAIModal(false)}
          onItemsGenerated={handleAIItems}
        />
      )}
    </div>
  );
}

export default App;