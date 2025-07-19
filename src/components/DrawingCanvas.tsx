import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point, DrawingElement, User } from '../types/drawing';
import { useDrawingStore } from '../store/drawingStore';

interface DrawingCanvasProps {
  elements: DrawingElement[];
  users: User[];
  selectedTool: string;
  selectedColor: string;
  onElementAdded: (element: DrawingElement) => void;
  onCursorMove: (position: Point) => void;
  userId: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  elements,
  users,
  selectedTool,
  selectedColor,
  onElementAdded,
  onCursorMove,
  userId
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point>({ x: 0, y: 0 });

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    ctx.save();
    ctx.strokeStyle = element.style.stroke;
    ctx.lineWidth = element.style.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (element.type) {
      case 'pen':
        if (element.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          for (let i = 1; i < element.points.length; i++) {
            ctx.lineTo(element.points[i].x, element.points[i].y);
          }
          ctx.stroke();
        }
        break;

      case 'rectangle':
        if (element.points.length >= 2) {
          const [start, end] = element.points;
          const width = end.x - start.x;
          const height = end.y - start.y;
          ctx.strokeRect(start.x, start.y, width, height);
          if (element.style.fill) {
            ctx.fillStyle = element.style.fill;
            ctx.fillRect(start.x, start.y, width, height);
          }
        }
        break;

      case 'circle':
        if (element.points.length >= 2) {
          const [start, end] = element.points;
          const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          ctx.beginPath();
          ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
          if (element.style.fill) {
            ctx.fillStyle = element.style.fill;
            ctx.fill();
          }
        }
        break;

      case 'arrow':
        if (element.points.length >= 2) {
          const [start, end] = element.points;
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const arrowLength = 20;
          const arrowAngle = Math.PI / 6;

          // Draw line
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          // Draw arrowhead
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle - arrowAngle),
            end.y - arrowLength * Math.sin(angle - arrowAngle)
          );
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle + arrowAngle),
            end.y - arrowLength * Math.sin(angle + arrowAngle)
          );
          ctx.stroke();
        }
        break;

      case 'text':
        if (element.text && element.points.length > 0) {
          ctx.fillStyle = element.style.stroke;
          ctx.font = '16px Arial';
          ctx.fillText(element.text, element.points[0].x, element.points[0].y);
        }
        break;
    }
    ctx.restore();
  }, []);

  const drawCursors = useCallback((ctx: CanvasRenderingContext2D) => {
    users.forEach(user => {
      if (user.cursor && user.id !== userId) {
        ctx.save();
        ctx.fillStyle = user.color;
        ctx.beginPath();
        ctx.arc(user.cursor.x, user.cursor.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw user name
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(user.name, user.cursor.x + 12, user.cursor.y - 8);
        ctx.restore();
      }
    });
  }, [users, userId]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply viewport transformation
    ctx.save();
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(viewport.x, viewport.y);

    // Draw all elements
    elements.forEach(element => drawElement(ctx, element));

    // Draw current path if drawing
    if (isDrawing && currentPath.length > 1) {
      ctx.save();
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // Draw cursors (not affected by viewport)
    drawCursors(ctx);
  }, [elements, isDrawing, currentPath, viewport, drawElement, drawCursors]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redraw();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [redraw]);

  const getMousePos = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - viewport.x * viewport.zoom) / viewport.zoom,
      y: (e.clientY - rect.top - viewport.y * viewport.zoom) / viewport.zoom
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      // Middle mouse or Ctrl+click for panning
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (selectedTool === 'pen') {
      setIsDrawing(true);
      setCurrentPath([pos]);
    } else if (['rectangle', 'circle', 'arrow'].includes(selectedTool)) {
      setIsDrawing(true);
      setCurrentPath([pos]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    onCursorMove(pos);

    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setViewport(prev => ({
        ...prev,
        x: prev.x + deltaX / prev.zoom,
        y: prev.y + deltaY / prev.zoom
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDrawing) {
      if (selectedTool === 'pen') {
        setCurrentPath(prev => [...prev, pos]);
      } else if (['rectangle', 'circle', 'arrow'].includes(selectedTool)) {
        setCurrentPath(prev => [prev[0], pos]);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing && currentPath.length > 0) {
      const element: DrawingElement = {
        id: `${userId}-${Date.now()}`,
        type: selectedTool as any,
        points: [...currentPath],
        style: {
          stroke: selectedColor,
          strokeWidth: 2
        },
        userId,
        timestamp: Date.now()
      };

      onElementAdded(element);
      setCurrentPath([]);
      setIsDrawing(false);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * zoomFactor));
    
    setViewport(prev => ({
      ...prev,
      zoom: newZoom
    }));
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ background: '#1a1a1a' }}
    />
  );
};