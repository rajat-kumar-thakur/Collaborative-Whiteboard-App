import React from 'react';
import { 
  Pen, 
  Square, 
  Circle, 
  ArrowRight, 
  Type, 
  MousePointer2,
  Users,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RefreshCcw,
  Download,
  Palette,
  Trash2,
  Eraser
} from 'lucide-react';

interface ToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  selectedColor: string;
  onColorSelect: (color: string) => void;
  userCount: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onExport: () => void;
  onClearCanvas: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

const tools = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'pen', icon: Pen, label: 'Pen' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'text', icon: Type, label: 'Text' },
];

const colors = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#8b5cf6', // Purple
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#ffffff', // White
  '#6b7280', // Gray
];

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedTool,
  onToolSelect,
  selectedColor,
  onColorSelect,
  userCount,
  onZoomIn,
  onZoomOut,
  onReset,
  onExport,
  onClearCanvas,
  onUndo,
  canUndo
}) => {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl">
        <div className="max-w-7xl mx-auto px-3">
          <div className="flex items-center justify-between h-14">
            {/* Left Section - Drawing Tools */}
            <div className="flex items-center space-x-1">
              {/* Drawing Tools */}
              <div className="flex items-center space-x-1">
                {tools.map(tool => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => onToolSelect(tool.id)}
                      className={`p-2.5 rounded-lg transition-all duration-200 ${
                        selectedTool === tool.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }`}
                      title={tool.label}
                    >
                      <Icon size={20} />
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-600"></div>

              {/* Color Picker */}
              <div className="flex items-center space-x-1">
                <div className="flex items-center space-x-2">
                  <Palette size={18} className="text-gray-400" />
                  <span className="text-sm text-gray-400 font-medium">Color</span>
                </div>
                <div className="flex items-center space-x-1">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => onColorSelect(color)}
                      className={`w-7 h-7 rounded-md border-2 transition-all duration-200 ${
                        selectedColor === color
                          ? 'border-white scale-110 shadow-md'
                          : 'border-gray-600 hover:border-gray-400 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={`Color: ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Section - Controls & Status */}
            <div className="flex items-center space-x-4">
              {/* View Controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={onZoomOut}
                  className="p-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-all duration-200"
                  title="Zoom Out"
                >
                  <ZoomOut size={20} />
                </button>
                <button
                  onClick={onZoomIn}
                  className="p-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-all duration-200"
                  title="Zoom In"
                >
                  <ZoomIn size={20} />
                </button>
                <button
                  onClick={onUndo}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${canUndo ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 cursor-not-allowed'}`}
                  title="Undo (Ctrl+Z)"
                  disabled={!canUndo}
                >
                  <RotateCcw size={20} />
                </button>
                <button
                  onClick={onReset}
                  className="p-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-all duration-200"
                  title="Reset View (Center & Zoom 1x)"
                >
                  <RefreshCcw size={20} />
                </button>
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-600"></div>

              {/* Utility Controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={onExport}
                  className="p-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-all duration-200"
                  title="Export Drawing"
                >
                  <Download size={20} />
                </button>
                
                <button
                  onClick={onClearCanvas}
                  className="p-2.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-900/20 transition-all duration-200"
                  title="Clear Canvas"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-600"></div>
              
              {/* User Count */}
              <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-lg border border-gray-600 min-w-[110px]">
                <Users size={18} className="text-green-400" />
                <span className="text-sm text-gray-300 font-medium">{userCount}</span>
                <span className="text-xs text-gray-500">online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};