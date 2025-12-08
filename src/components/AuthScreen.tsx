import React, { useState } from 'react';
import { Lock, ArrowRight, UserPlus, Check, ChevronLeft, Loader2 } from 'lucide-react';
import Button from './Button';
import { User } from '../types';
import { FAMILY_SECRET_CODE, AVATAR_OPTIONS, COLOR_OPTIONS } from '../constants';
import { addUserToDB } from '../services/firebase';

interface AuthScreenProps {
  users: User[];
  onLogin: (user: User) => void;
}

type AuthView = 'CODE' | 'SELECT_USER' | 'CREATE_USER' | 'ENTER_PIN';

const AuthScreen: React.FC<AuthScreenProps> = ({ users, onLogin }) => {
  const [view, setView] = useState<AuthView>('CODE');
  
  // Family Code State
  const [familyCode, setFamilyCode] = useState('');
  const [error, setError] = useState('');

  // Creation State
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState(AVATAR_OPTIONS[0]);
  const [newPin, setNewPin] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Login State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loginPin, setLoginPin] = useState('');

  // --- Step 1: Unlock Family Access ---
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (familyCode.toUpperCase().trim() === FAMILY_SECRET_CODE) {
      setError('');
      setView('SELECT_USER');
    } else {
      setError("Wrong code! Try 'HOLLY'");
      setFamilyCode('');
    }
  };

  // --- Step 2: Create User Logic ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || newPin.length < 4) {
      setError("Please enter a name and a 4-digit PIN");
      return;
    }
    
    setIsCreating(true);
    setError('');

    try {
      // Pick a random color
      const randomColor = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
      
      const newUserWithoutId: Omit<User, 'id'> = {
        name: newName,
        avatar: newAvatar,
        pin: newPin,
        color: randomColor
      };

      // Add a race timeout in case DB hangs
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 8000)
      );
      
      const newId = await Promise.race([
        addUserToDB(newUserWithoutId),
        timeoutPromise
      ]) as string;
      
      const newUser: User = { ...newUserWithoutId, id: newId };
      onLogin(newUser);
    } catch (e) {
      console.error(e);
      setError("Connection taking too long. Check your internet or Firebase config.");
    } finally {
      setIsCreating(false);
    }
  };

  // --- Step 3: Login Logic ---
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (loginPin === selectedUser.pin) {
      onLogin(selectedUser);
    } else {
      setError("Wrong PIN! Try again.");
      setLoginPin('');
    }
  };

  const selectUserToLogin = (user: User) => {
    setSelectedUser(user);
    setError('');
    setLoginPin('');
    setView('ENTER_PIN');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-20">
      <div className="bg-[#FDF5E6] p-8 rounded-2xl shadow-2xl max-w-md w-full border-4 border-[#165B33] text-center relative transition-all duration-300">
        
        {/* Back Button (only for inner views) */}
        {view !== 'CODE' && view !== 'SELECT_USER' && (
          <button 
            onClick={() => {
              setError('');
              setView('SELECT_USER');
            }}
            className="absolute top-4 left-4 p-2 rounded-full hover:bg-black/5"
          >
            <ChevronLeft className="w-6 h-6 text-[#165B33]" />
          </button>
        )}

        {/* --- VIEW: FAMILY CODE --- */}
        {view === 'CODE' && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="bg-[#D42426] p-4 rounded-full text-[#FDF5E6]">
                <Lock className="w-8 h-8" />
              </div>
            </div>
            <h1 className="font-christmas text-4xl text-[#D42426] mb-2 font-bold">North Pole Access</h1>
            <p className="text-gray-600 mb-6">Enter the family secret code to enter.</p>
            <form onSubmit={handleUnlock} className="space-y-4">
              <input
                type="text"
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value)}
                placeholder="Secret Code..."
                className="w-full text-center text-2xl font-bold tracking-widest uppercase p-3 border-2 border-gray-300 rounded-lg focus:border-[#D42426] outline-none"
                autoFocus
              />
              {error && <p className="text-red-500 font-bold animate-pulse">{error}</p>}
              <Button variant="christmas" type="submit" className="w-full justify-center text-lg">
                Unlock <ArrowRight className="w-5 h-5" />
              </Button>
            </form>
          </>
        )}

        {/* --- VIEW: SELECT USER --- */}
        {view === 'SELECT_USER' && (
          <div className="animate-fade-in">
            <h2 className="font-christmas text-3xl text-[#165B33] mb-4 font-bold">Who are you?</h2>
            
            <div className="grid grid-cols-2 gap-3 mb-6 max-h-[40vh] overflow-y-auto scrollbar-hide">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => selectUserToLogin(u)}
                  className="flex flex-col items-center p-3 rounded-xl bg-white border-2 border-gray-100 hover:border-[#165B33] hover:shadow-md transition-all"
                >
                  <span className="text-4xl mb-1">{u.avatar}</span>
                  <span className="font-bold text-gray-800 truncate w-full">{u.name}</span>
                </button>
              ))}
              
              {/* Add New User Button */}
              <button
                onClick={() => setView('CREATE_USER')}
                className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-[#165B33]/40 hover:bg-[#165B33]/5 transition-all text-[#165B33]"
              >
                <div className="bg-[#165B33]/10 p-2 rounded-full mb-1">
                  <UserPlus className="w-6 h-6" />
                </div>
                <span className="font-bold">I'm New!</span>
              </button>
            </div>
            
            {users.length === 0 && (
              <p className="text-gray-500 text-sm mb-4">No elves yet! Click "I'm New" to start.</p>
            )}
          </div>
        )}

        {/* --- VIEW: CREATE USER --- */}
        {view === 'CREATE_USER' && (
          <div className="animate-fade-in text-left">
            <h2 className="font-christmas text-3xl text-[#165B33] mb-4 font-bold text-center">New Elf Profile</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-[#D42426] outline-none"
                  placeholder="e.g. Papa Elf"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Pick an Avatar</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {AVATAR_OPTIONS.map(avi => (
                    <button
                      key={avi}
                      type="button"
                      onClick={() => setNewAvatar(avi)}
                      className={`text-3xl p-2 rounded-lg border-2 transition-all shrink-0 ${
                        newAvatar === avi ? 'border-[#D42426] bg-red-50 scale-110' : 'border-transparent hover:bg-gray-100'
                      }`}
                    >
                      {avi}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Create Secret PIN (4 numbers)</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} // Numbers only
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-[#D42426] outline-none tracking-widest text-center font-bold"
                  placeholder="0000"
                />
              </div>

              {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

              <Button variant="christmas" type="submit" className="w-full justify-center" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating...
                  </>
                ) : 'Join the Family!'}
              </Button>
            </form>
          </div>
        )}

        {/* --- VIEW: ENTER PIN --- */}
        {view === 'ENTER_PIN' && selectedUser && (
          <div className="animate-fade-in">
            <div className="mb-4">
              <span className="text-6xl block mb-2">{selectedUser.avatar}</span>
              <h2 className="font-christmas text-3xl text-[#165B33] font-bold">
                Hello, {selectedUser.name}!
              </h2>
            </div>
            
            <p className="text-gray-600 mb-4">Enter your PIN to open your list.</p>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                className="w-3/4 mx-auto block p-3 text-center text-3xl font-bold tracking-[1em] border-2 border-gray-300 rounded-lg focus:border-[#D42426] outline-none"
                autoFocus
              />
              
              {error && <p className="text-red-500 font-bold animate-pulse">{error}</p>}
              
              <Button variant="primary" type="submit" className="w-full justify-center">
                Open List <Check className="w-5 h-5" />
              </Button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default AuthScreen;