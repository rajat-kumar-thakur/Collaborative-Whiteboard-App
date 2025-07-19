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
  Download,
  Palette
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
}

const tools = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'pen', icon: Pen, label: 'Pen' },
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
  onExport
}) => {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
        <div className="flex items-center space-x-2">
          {/* Drawing Tools */}
          <div className="flex items-center space-x-1 border-r border-gray-700 pr-3">
            {tools.map(tool => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => onToolSelect(tool.id)}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    selectedTool === tool.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                  title={tool.label}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>

          {/* Color Picker */}
          <div className="flex items-center space-x-1 border-r border-gray-700 pr-3">
            <div className="flex items-center space-x-1">
              <Palette size={16} className="text-gray-400" />
              <div className="flex flex-wrap gap-1 max-w-[120px]">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => onColorSelect(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                      selectedColor === color
                        ? 'border-white scale-110'
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    title={`Color: ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
          {/* View Controls */}
          <div className="flex items-center space-x-1 border-r border-gray-700 pr-3">
            <button
              onClick={onZoomOut}
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={onZoomIn}
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={onReset}
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200"
              title="Reset View"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* Utility Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={onExport}
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-200"
              title="Export"
            >
              <Download size={18} />
            </button>
            
            {/* User Count */}
            <div className="flex items-center space-x-1 px-3 py-2 bg-gray-800 rounded-md">
              <Users size={16} className="text-green-400" />
              <span className="text-sm text-gray-300 font-medium">{userCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};