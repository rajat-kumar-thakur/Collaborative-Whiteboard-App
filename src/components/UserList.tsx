import React from 'react';
import { User } from '../types/drawing';
import { Users } from 'lucide-react';

interface UserListProps {
  users: User[];
  currentUserId: string;
}

export const UserList: React.FC<UserListProps> = ({ users, currentUserId }) => {
  return (
    <div className="fixed top-4 right-4 z-10">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-4 shadow-xl max-w-xs">
        <div className="flex items-center space-x-2 mb-3">
          <Users size={18} className="text-green-400" />
          <h3 className="text-sm font-medium text-white">Active Users ({users.length})</h3>
        </div>
        
        <div className="space-y-2">
          {users.map(user => (
            <div key={user.id} className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: user.color }}
              />
              <span className={`text-sm ${user.id === currentUserId ? 'text-blue-400 font-medium' : 'text-gray-300'}`}>
                {user.name} {user.id === currentUserId && '(You)'}
              </span>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <p className="text-gray-500 text-sm">No other users online</p>
        )}
      </div>
    </div>
  );
};