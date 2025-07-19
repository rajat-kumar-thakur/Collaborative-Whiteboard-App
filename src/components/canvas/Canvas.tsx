'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import { useCanvasStore } from '../../store/canvas';
import { useCollaborationStore } from '../../store/collaboration';
import { useSocket } from '../../hooks/useSocket';
import { ElementRenderer } from './ElementRenderer';
import { CursorLayer } from './CursorLayer';
import { SelectionLayer } from './SelectionLayer';
import { Element } from '../../types';
import Konva from 'konva';

interface CanvasProps {
  whiteboardId: string;
}

export const Canvas: React.FC<CanvasProps> = ({ whiteboardId }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 1200, height: 800 });
  
  const {
    elements,
    selectedElementIds,
    tool,
    viewport,
    isDrawing,
    currentElement,
    setViewport,
    setIsDrawing,
    setCurrentElement,
    addElement,
    selectElements,
    clearSelection,
  } = useCanvasStore();
  
  const { activeUsers } = useCollaborationStore();
  const { emitElementCreate, emitCursorMove } = useSocket(whiteboardId);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = stageRef.current?.container();
      if (container) {
        const { offsetWidth, offsetHeight } = container;
        setStageSize({ width: offsetWidth, height: offsetHeight });
        setViewport({ width: offsetWidth, height: offsetHeight });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setViewport]);

  // Handle mouse/touch events for drawing
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') {
      // Handle selection
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        clearSelection();
      }
      return;
    }

    if (tool === 'pan') {
      return; // Pan tool handled by stage dragging
    }

    // Start drawing
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const newElement: Partial<Element> = {
      whiteboardId,
      type: tool,
      properties: {
        x: pos.x,
        y: pos.y,
        strokeColor: '#000000',
        fillColor: 'transparent',
        strokeWidth: 2,
        opacity: 1,
        rotation: 0,
      },
      zIndex: elements.length,
      createdBy: 'current-user', // TODO: Get from auth
      version: 1,
      isDeleted: false,
    };

    // Set initial dimensions based on tool
    if (tool === 'rectangle' || tool === 'circle') {
      newElement.properties!.width = 0;
      newElement.properties!.height = 0;
    } else if (tool === 'line' || tool === 'arrow') {
      newElement.properties!.points = [{ x: pos.x, y: pos.y }, { x: pos.x, y: pos.y }];
    } else if (tool === 'freehand') {
      newElement.properties!.points = [{ x: pos.x, y: pos.y }];
    }

    setCurrentElement(newElement);
    setIsDrawing(true);
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) {
      // Emit cursor movement for collaboration
      emitCursorMove(pos.x, pos.y);
    }

    if (!isDrawing || !currentElement) return;

    if (!pos) return;

    const updatedElement = { ...currentElement };

    if (tool === 'rectangle' || tool === 'circle') {
      const startX = currentElement.properties!.x;
      const startY = currentElement.properties!.y;
      updatedElement.properties = {
        ...updatedElement.properties!,
        width: pos.x - startX,
        height: pos.y - startY,
      };
    } else if (tool === 'line' || tool === 'arrow') {
      const startPoint = currentElement.properties!.points![0];
      updatedElement.properties = {
        ...updatedElement.properties!,
        points: [startPoint, { x: pos.x, y: pos.y }],
      };
    } else if (tool === 'freehand') {
      updatedElement.properties = {
        ...updatedElement.properties!,
        points: [...(currentElement.properties!.points || []), { x: pos.x, y: pos.y }],
      };
    }

    setCurrentElement(updatedElement);
  };

  const handleStageMouseUp = () => {
    if (!isDrawing || !currentElement) return;

    // Create the final element
    const finalElement: Element = {
      ...currentElement,
      _id: `temp-${Date.now()}`, // Temporary ID
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Element;

    // Add locally for immediate feedback
    addElement(finalElement);
    
    // Emit to other users
    emitElementCreate(currentElement, finalElement._id);
    
    setCurrentElement(null);
    setIsDrawing(false);
  };

  // Handle wheel events for zooming
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = 1.1;
    const newScale = direction > 0 ? oldScale * factor : oldScale / factor;

    // Clamp zoom level
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    stage.scale({ x: clampedScale, y: clampedScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    stage.position(newPos);
    setViewport({
      x: newPos.x,
      y: newPos.y,
      zoom: clampedScale,
    });
  };

  return (
    <div className="w-full h-full bg-white relative overflow-hidden">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleStageMouseDown}
        onMousemove={handleStageMouseMove}
        onMouseup={handleStageMouseUp}
        onWheel={handleWheel}
        draggable={tool === 'pan'}
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        x={viewport.x}
        y={viewport.y}
      >
        {/* Main drawing layer */}
        <Layer>
          {/* Render existing elements */}
          {elements.map((element) => (
            <ElementRenderer
              key={element._id}
              element={element}
              isSelected={selectedElementIds.includes(element._id)}
              onSelect={() => selectElements([element._id])}
              whiteboardId={whiteboardId}
            />
          ))}
          
          {/* Render current drawing element */}
          {currentElement && (
            <ElementRenderer
              element={currentElement as Element}
              isSelected={false}
              onSelect={() => {}}
              whiteboardId={whiteboardId}
            />
          )}
        </Layer>

        {/* Selection layer */}
        <SelectionLayer />

        {/* Cursor layer for collaboration */}
        <CursorLayer activeUsers={Array.from(activeUsers.values())} />
      </Stage>
    </div>
  );
};