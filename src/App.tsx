import React, { useEffect, useState, useCallback } from 'react';
import { DrawingCanvas } from './components/DrawingCanvas';
import { Toolbar } from './components/Toolbar';
import { UserList } from './components/UserList';
import { useWebSocket } from './hooks/useWebSocket';
import { useDrawingStore } from './store/drawingStore';
import { WebSocketMessage, DrawingElement, Point } from './types/drawing';
import { exportCanvasAsImage, downloadImage } from './utils/export';

function App() {
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);
  
  const {
    elements,
    users,
    selectedTool,
    selectedColor,
    viewport,
    addElement,
    setUsers,
    updateUser,
    setSelectedTool,
    setSelectedColor,
    setViewport,
    resetViewport
  } = useDrawingStore();

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'initial_state':
        // Handle initial state from server
        if (message.data.elements) {
          message.data.elements.forEach((element: DrawingElement) => addElement(element));
        }
        if (message.data.users) {
          setUsers(message.data.users);
        }
        break;

      case 'element_added':
        if (message.userId !== userId) {
          addElement(message.data);
        }
        break;

      case 'cursor_moved':
        if (message.userId !== userId) {
          updateUser(message.userId, { cursor: message.data.position });
        }
        break;

      case 'user_joined':
        console.log('User joined:', message.data);
        break;

      case 'user_left':
        console.log('User left:', message.data);
        break;
    }
  }, [userId, addElement, setUsers, updateUser]);

  const { isConnected, users: wsUsers, sendMessage } = useWebSocket(userId, handleWebSocketMessage);

  useEffect(() => {
    setUsers(wsUsers);
  }, [wsUsers, setUsers]);

  const handleElementAdded = (element: DrawingElement) => {
    addElement(element);
    sendMessage({
      type: 'element_added',
      data: element
    });
  };

  const handleCursorMove = (position: Point) => {
    updateUser(userId, { cursor: position });
    sendMessage({
      type: 'cursor_moved',
      data: { position }
    });
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(5, viewport.zoom * 1.2);
    setViewport({ ...viewport, zoom: newZoom });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.1, viewport.zoom * 0.8);
    setViewport({ ...viewport, zoom: newZoom });
  };

  const handleExport = () => {
    const dataUrl = exportCanvasAsImage(elements, 1920, 1080);
    downloadImage(dataUrl, `collaborative-drawing-${Date.now()}.png`);
  };

  return (
    <div className="w-full h-screen bg-gray-900 overflow-hidden relative">
      {/* Connection Status */}
      <div className="fixed top-4 left-4 z-20">
        <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
          isConnected 
            ? 'bg-green-900/50 text-green-400 border border-green-700' 
            : 'bg-red-900/50 text-red-400 border border-red-700'
        }`}>
          {isConnected ? 'Connected' : 'Connecting...'}
        </div>
      </div>

      {/* Main Canvas */}
      <DrawingCanvas
        elements={elements}
        users={users}
        selectedTool={selectedTool}
        selectedColor={selectedColor}
        onElementAdded={handleElementAdded}
        onCursorMove={handleCursorMove}
        userId={userId}
      />

      {/* Toolbar */}
      <Toolbar
        selectedTool={selectedTool}
        onToolSelect={setSelectedTool}
        selectedColor={selectedColor}
        onColorSelect={setSelectedColor}
        userCount={users.length}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={resetViewport}
        onExport={handleExport}
      />

      {/* User List */}
      <UserList users={users} currentUserId={userId} />

      {/* Instructions */}
      <div className="fixed bottom-4 left-4 z-10">
        <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4 shadow-xl max-w-md">
          <h3 className="text-sm font-medium text-white mb-2">Controls</h3>
          <div className="text-xs text-gray-400 space-y-1">
            <p>• Click and drag to draw with selected tool</p>
            <p>• Ctrl+Click or middle mouse to pan</p>
            <p>• Mouse wheel to zoom</p>
            <p>• Select tools from the toolbar above</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;