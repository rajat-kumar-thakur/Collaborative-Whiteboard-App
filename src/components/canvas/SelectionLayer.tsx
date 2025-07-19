'use client';

import React from 'react';
import { Layer, Rect, Transformer } from 'react-konva';
import { useCanvasStore } from '../../store/canvas';

export const SelectionLayer: React.FC = () => {
  const { selectedElementIds, elements } = useCanvasStore();
  
  if (selectedElementIds.length === 0) return null;

  const selectedElements = elements.filter(el => selectedElementIds.includes(el._id));

  return (
    <Layer>
      {selectedElements.map((element) => {
        const { properties } = element;
        
        return (
          <Rect
            key={`selection-${element._id}`}
            x={properties.x - 2}
            y={properties.y - 2}
            width={(properties.width || 0) + 4}
            height={(properties.height || 0) + 4}
            stroke="#007ACC"
            strokeWidth={1}
            dash={[5, 5]}
            fill="transparent"
            listening={false}
          />
        );
      })}
    </Layer>
  );
};