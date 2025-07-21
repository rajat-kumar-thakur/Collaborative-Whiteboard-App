import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Users, 
  Copy, 
  ExternalLink, 
  Clock,
  Hash,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

interface RoomManagerProps {
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  isConnected: boolean;
  currentRoom: string | null;
}

export const RoomManager: React.FC<RoomManagerProps> = ({
  onJoinRoom,
  onCreateRoom,
  isConnected,
  currentRoom
}) => {
  const { isDarkMode } = useThemeStore();
  const [roomId, setRoomId] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Get room ID from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl && !currentRoom) {
      setRoomId(roomFromUrl);
      onJoinRoom(roomFromUrl);
    }
  }, [onJoinRoom, currentRoom]);

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      onJoinRoom(roomId.trim().toUpperCase());
    }
  };

  const handleCreateRoom = () => {
    onCreateRoom();
  };

  const copyRoomLink = async () => {
    if (currentRoom) {
      const roomUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;
      try {
        await navigator.clipboard.writeText(roomUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy room link:', err);
      }
    }
  };

  const formatRoomId = (id: string) => {
    return id.replace(/(.{3})/g, '$1-').slice(0, -1);
  };

  if (currentRoom) {
    return (
      <div className="fixed top-4 right-4 z-30">
        <div className={`backdrop-blur-sm border rounded-xl p-4 shadow-xl ${
          isDarkMode 
            ? 'bg-gray-900/95 border-gray-700' 
            : 'bg-white/95 border-gray-200'
        }`}>
          <div className="flex items-center space-x-3 mb-3">
            <Hash size={18} className="text-blue-500" />
            <div>
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Room: {formatRoomId(currentRoom)}
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Share this room with others
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={copyRoomLink}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                copySuccess
                  ? 'bg-green-600 text-white'
                  : isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copySuccess ? (
                <>
                  <CheckCircle size={16} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy Link</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => window.open(`${window.location.origin}${window.location.pathname}?room=${currentRoom}`, '_blank')}
              className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Open in new tab"
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl border ${
        isDarkMode 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="p-6">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'
            }`}>
              <Users size={32} className="text-blue-600" />
            </div>
            <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Collaborative Drawing
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Create or join a room to start drawing together
            </p>
          </div>

          {!isConnected && (
            <div className={`mb-4 p-3 rounded-lg border flex items-center space-x-2 ${
              isDarkMode
                ? 'bg-yellow-900/20 border-yellow-700 text-yellow-400'
                : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            }`}>
              <AlertCircle size={16} />
              <span className="text-sm">Connecting to server...</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Join Room */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Join Existing Room
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                  placeholder="Enter room code (e.g., ABC123)"
                  className={`flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDarkMode
                      ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-400'
                      : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'
                  }`}
                  maxLength={6}
                  disabled={!isConnected}
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!roomId.trim() || !isConnected}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    roomId.trim() && isConnected
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Join
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className={`absolute inset-0 flex items-center ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>
                <div className={`w-full border-t ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${
                  isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'
                }`}>
                  or
                </span>
              </div>
            </div>

            {/* Create Room */}
            <button
              onClick={handleCreateRoom}
              disabled={!isConnected}
              className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                isConnected
                  ? isDarkMode
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Plus size={20} />
              <span>Create New Room</span>
            </button>
          </div>

          <div className={`mt-6 pt-4 border-t text-center ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Room codes are automatically generated and can be shared with others
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};