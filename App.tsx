import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Gift, ExternalLink, Lock, User as UserIcon, LogOut } from 'lucide-react';
import Snowfall from './components/Snowfall';
import AuthScreen from './components/AuthScreen';
import Button from './components/Button';
import ProfileSwitcher from './components/ProfileSwitcher';
import { User, GiftItem } from './types';
import { 
  subscribeToGiftItems, 
  addGiftItemToDB, 
  toggleGiftClaimInDB, 
  deleteGiftItemFromDB,
  subscribeToUsers 
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
        <AuthScreen users={users} onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#165B33] relative overflow-hidden flex flex-col">
      <Snowfall />

      {/* Header / Nav */}
      <header className="relative z-10 bg-[#D42426] shadow-xl border-b-4 border-[#F8B229] p-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="font-christmas text-2xl md:text-4xl text-[#FDF5E6] drop-shadow-md">
              North Pole Lists 🎅
            </h1>
            <p className="text-[#FDF5E6]/80 text-xs hidden md:block">Making spirits bright & lists organized!</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-black/20 rounded-lg px-3 py-1 text-[#FDF5E6] flex items-center gap-2">
                <span className="text-2xl">{currentUser.avatar}</span>
                <span className="font-bold hidden md:inline">{currentUser.name}</span>
             </div>
             <button 
               onClick={handleLogout}
               className="bg-[#b01e20] p-2 rounded-lg text-white hover:bg-black/20 transition-colors"
               title="Sign Out"
             >
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* List Selector Tabs */}
          {users.length > 0 ? (
             <ProfileSwitcher 
               users={users} 
               currentUser={viewingOwner || currentUser} // Highlight who we are viewing
               onSwitch={(u) => setSelectedListOwnerId(u.id)}
             />
          ) : (
            <div className="text-white text-center">No other elves yet...</div>
          )}

          {/* The List (Paper Style) */}
          <div className="bg-[#FDF5E6] min-h-[500px] rounded-b-xl rounded-tr-xl shadow-2xl p-6 md:p-8 relative pattern-lines">
            
            {/* List Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b-2 border-[#D42426]/20 pb-4 gap-4">
              <div>
                <h2 className="font-christmas text-4xl text-[#D42426]">
                  {isViewingOwnList ? "My Wishes" : `Wishes for ${viewingOwner?.name}`}
                </h2>
                <p className="text-gray-500 italic text-sm md:text-base">
                  {isViewingOwnList 
                    ? "Start adding items so Santa knows what to bring!" 
                    : `Pick something to give ${viewingOwner?.name}! Shh, it's a surprise!`}
                </p>
              </div>
            </div>

            {/* Input Area */}
            <div className="bg-white/50 p-4 rounded-xl border-2 border-dashed border-[#165B33]/30 mb-8">
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder={isViewingOwnList ? "I wish for..." : `Add a surprise for ${viewingOwner?.name}...`}
                  className="w-full bg-transparent border-b-2 border-gray-300 focus:border-[#D42426] outline-none text-xl p-2 placeholder-gray-400 font-bold text-gray-800"
                  onKeyDown={(e) => e.key === 'Enter' && newItemText && addItem(newItemText, newItemLink)}
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemLink}
                    onChange={(e) => setNewItemLink(e.target.value)}
                    placeholder="Link (optional)..."
                    className="flex-1 bg-transparent border-b border-gray-300 focus:border-[#D42426] outline-none text-sm p-2 text-gray-600"
                  />
                  <Button 
                    variant="primary" 
                    disabled={!newItemText}
                    onClick={() => addItem(newItemText, newItemLink)}
                    className="shrink-0 bg-[#165B33] hover:bg-[#0f4224]"
                  >
                    <Plus className="w-5 h-5" /> Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-12 text-gray-400">Loading wishes...</div>
              ) : visibleItems.length === 0 ? (
                <div className="text-center py-12 opacity-50">
                  <div className="text-6xl mb-4">🎁</div>
                  <p className="text-xl font-christmas">The list is empty!</p>
                </div>
              ) : null}

              {visibleItems.map(item => {
                // Logic for displaying claim status
                const isClaimed = !!item.claimedBy;
                const claimer = users.find(u => u.id === item.claimedBy);
                const isClaimedByMe = item.claimedBy === currentUser.id;
                
                // Owner viewing their own list sees items as unclaimed (unless they dive deep, but simplified here for "Surprise" effect)
                // Actually, prompt says: "person whose list it is can't see who has claimed or any other interaction"
                // So if I am owner, I see NO claim status.
                const showClaimStatus = !isViewingOwnList;

                return (
                  <div 
                    key={item.id} 
                    className={`group relative bg-white p-4 rounded-xl shadow-sm border-l-4 transition-all hover:shadow-md flex items-center gap-4 ${
                       item.isSurprise ? 'border-[#F8B229] bg-yellow-50' : 'border-[#D42426]'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`p-3 rounded-full ${item.isSurprise ? 'bg-yellow-100 text-yellow-600' : 'bg-red-50 text-red-500'}`}>
                      {item.isSurprise ? <Lock className="w-6 h-6" /> : <Gift className="w-6 h-6" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-xl font-bold text-gray-800 ${isClaimed && showClaimStatus ? 'line-through opacity-50' : ''}`}>
                          {item.title}
                        </h3>
                        {item.isSurprise && (
                           <span className="text-[10px] uppercase font-bold bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">Surprise</span>
                        )}
                      </div>
                      
                      {item.link && (
                        <a 
                          href={item.link.startsWith('http') ? item.link : `https://${item.link}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1 mt-1 w-fit"
                        >
                          <ExternalLink className="w-3 h-3" /> View Item
                        </a>
                      )}

                      {/* Claim Status (Visible to others only) */}
                      {showClaimStatus && isClaimed && (
                        <div className="mt-2 text-sm flex items-center gap-1 font-bold" style={{ color: claimer?.color || 'gray' }}>
                          <UserIcon className="w-3 h-3" />
                          Claimed by {isClaimedByMe ? "You" : claimer?.name || 'Someone'}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Claim Button (Only for others) */}
                      {!isViewingOwnList && (
                        <button
                          onClick={() => toggleClaim(item)}
                          disabled={isClaimed && !isClaimedByMe} // Cannot unclaim others' claims
                          className={`p-2 rounded-full transition-all ${
                            isClaimedByMe 
                              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                              : isClaimed 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500'
                          }`}
                          title={isClaimedByMe ? "Unclaim" : isClaimed ? "Claimed by someone else" : "Claim this gift"}
                        >
                          {isClaimedByMe ? <Check className="w-6 h-6" /> : isClaimed ? <Lock className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                        </button>
                      )}

                      {/* Delete Button (Only for owner OR creator of surprise) */}
                      {(isViewingOwnList || item.addedBy === currentUser.id) && (
                        <button 
                          onClick={() => deleteItem(item.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Decor lines */}
            <div className="absolute top-0 left-8 bottom-0 w-px bg-red-200 hidden md:block"></div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;