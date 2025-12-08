import React from 'react';
import { User } from '../types';

interface ProfileSwitcherProps {
  users: User[];
  currentUser: User;
  onSwitch: (user: User) => void;
}

const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({ users, currentUser, onSwitch }) => {
  return (
    <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
      {users.map((user) => (
        <button
          key={user.id}
          onClick={() => onSwitch(user)}
          className={`flex flex-col items-center min-w-[60px] p-2 rounded-xl transition-all border-2 ${
            currentUser.id === user.id 
              ? 'bg-white border-yellow-400 scale-110 shadow-lg' 
              : 'bg-white/50 border-transparent hover:bg-white/80'
          }`}
        >
          <span className="text-2xl filter drop-shadow-sm">{user.avatar}</span>
          <span className="text-xs font-bold text-gray-700 truncate w-full text-center">
            {user.name}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ProfileSwitcher;