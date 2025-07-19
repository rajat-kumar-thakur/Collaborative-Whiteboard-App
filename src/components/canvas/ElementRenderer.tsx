'use client';

import React from 'react';
import { Rect, Circle, Line, Text } from 'react-konva';
import { Element } from '../../types';
import { useSocket } from '../../hooks/useSocket';

interface ElementRendererProps {
  element: Partial<Element>;
  isSelected: boolean;
  onSelect: () => void;
  whiteboardId?: string;
}

export const ElementRenderer: React.FC<ElementRendererProps> = ({
  element,
  isSelected,
  onSelect,
  whiteboardId,
}) => {
  const { emitElementUpdate } = useSocket(whiteboardId || '');

  if (!element.type || !element.properties) return null;

  const { type, properties } = element;
  const {
    x,
    y,
    width,
    height,
    points,
    text,
    fontSize = 16,
    strokeColor,
    fillColor,
    strokeWidth,
    opacity,
    rotation,
  } = properties;

  const commonProps = {
    x,
    y,
    stroke: strokeColor,
    fill: fillColor === 'transparent' ? undefined : fillColor,
    strokeWidth,
    opacity,
    rotation,
    onClick: onSelect,
    onTap: onSelect,
    draggable: isSelected,
    strokeScaleEnabled: false,
    onDragEnd: (e) => {
      if (whiteboardId && element._id) {
        const newPos = { x: e.target.x(), y: e.target.y() };
        emitElementUpdate(element._id, newPos, element.version || 1);
      }
    },
  };

  switch (type) {
    case 'rectangle':
      return (
        <Rect
          {...commonProps}
          width={width || 0}
          height={height || 0}
        />
      );

    case 'circle':
      return (
        <Circle
          {...commonProps}
          radius={Math.max(Math.abs(width || 0), Math.abs(height || 0)) / 2}
        />
      );

    case 'line':
    case 'arrow':
      if (!points || points.length < 2) return null;
      const flatPoints = points.flatMap(point => [point.x, point.y]);
      
      return (
        <Line
          {...commonProps}
          points={flatPoints}
          lineCap="round"
          lineJoin="round"
        />
      );

    case 'freehand':
      if (!points || points.length < 2) return null;
      const freehandPoints = points.flatMap(point => [point.x, point.y]);
      
      return (
        <Line
          {...commonProps}
          points={freehandPoints}
          lineCap="round"
          lineJoin="round"
          tension={0.5}
        />
      );

    case 'text':
    case 'sticky':
      return (
        <Text
          {...commonProps}
          text={text || 'Text'}
          fontSize={fontSize}
          fontFamily="Arial"
          fill={strokeColor}
          width={width}
          height={height}
          align="left"
          verticalAlign="top"
        />
      );

    default:
      return null;
  }
};