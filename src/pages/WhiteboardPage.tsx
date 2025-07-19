import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas } from '../components/canvas/Canvas';
import { Toolbar } from '../components/toolbar/Toolbar';
import { useWhiteboard } from '../hooks/useWhiteboard';
import { useSocket } from '../hooks/useSocket';

export default function WhiteboardPage() {
  const { id } = useParams<{ id: string }>();
  const whiteboardId = id as string;
  const { whiteboard, loading, error } = useWhiteboard(whiteboardId);
  
  // Initialize socket connection
  useSocket(whiteboardId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-800">Loading whiteboard...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Whiteboard</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!whiteboardId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Whiteboard</h1>
          <p className="text-gray-600">The whiteboard ID is missing or invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toolbar />
      <div className="flex-1">
        <Canvas whiteboardId={whiteboardId} />
      </div>
    </div>
  );
}