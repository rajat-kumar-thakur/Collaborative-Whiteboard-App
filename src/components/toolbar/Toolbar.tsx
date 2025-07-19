'use client';

import React from 'react';
import { 
  MousePointer, 
  Square, 
  Circle, 
  Minus, 
  ArrowRight, 
  Pencil, 
  Type, 
  StickyNote,
  Hand,
  Undo,
  Redo,
  Download,
  Users
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvas';
import { useCollaborationStore } from '../../store/collaboration';
import { ElementType } from '../../types';

export const Toolbar: React.FC = () => {
  const { tool, setTool, undo, redo, history, historyIndex } = useCanvasStore();
  const { activeUsers, connectionStatus } = useCollaborationStore();

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'pan', icon: Hand, label: 'Pan' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'freehand', icon: Pencil, label: 'Freehand' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note' },
  ] as const;

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
      {/* Left section - Drawing tools */}
      <div className="flex items-center space-x-2">
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTool(id as ElementType | 'select' | 'pan')}
            className={`
              p-2 rounded-lg transition-colors duration-200 flex items-center justify-center
              ${tool === id 
                ? 'bg-blue-100 text-blue-600 border border-blue-200' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }
            `}
            title={label}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>

      {/* Center section - Undo/Redo */}
      <div className="flex items-center space-x-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`
            p-2 rounded-lg transition-colors duration-200
            ${canUndo 
              ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-800' 
              : 'text-gray-300 cursor-not-allowed'
            }
          `}
          title="Undo"
        >
          <Undo size={20} />
        </button>
        
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`
            p-2 rounded-lg transition-colors duration-200
            ${canRedo 
              ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-800' 
              : 'text-gray-300 cursor-not-allowed'
            }
          `}
          title="Redo"
        >
          <Redo size={20} />
        </button>
      </div>

      {/* Right section - Collaboration and export */}
      <div className="flex items-center space-x-4">
        {/* Connection status */}
        <div className="flex items-center space-x-2">
          <div className={`
            w-2 h-2 rounded-full
            ${connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}
          `} />
          <span className="text-sm text-gray-600">
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>

        {/* Active users */}
        <div className="flex items-center space-x-2">
          <Users size={16} className="text-gray-600" />
          <span className="text-sm text-gray-600">
            {activeUsers.size} user{activeUsers.size !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Export button */}
        <button
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors duration-200"
          title="Export"
        >
          <Download size={20} />
        </button>
      </div>
    </div>
  );
};