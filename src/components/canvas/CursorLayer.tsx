'use client';

import React from 'react';
import { Layer, Circle, Text } from 'react-konva';
import { User } from '../../types';

interface CursorLayerProps {
  activeUsers: Array<User & { cursor: { x: number; y: number } }>;
}

export const CursorLayer: React.FC<CursorLayerProps> = ({ activeUsers }) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  return (
    <Layer listening={false}>
      {activeUsers.map((user, index) => {
        const color = colors[index % colors.length];
        const { x, y } = user.cursor;

        return (
          <React.Fragment key={user._id}>
            {/* Cursor pointer */}
            <Circle
              x={x}
              y={y}
              radius={6}
              fill={color}
              stroke="white"
              strokeWidth={2}
            />
            
            {/* User name label */}
            <Text
              x={x + 10}
              y={y - 5}
              text={user.name}
              fontSize={12}
              fontFamily="Arial"
              fill="white"
              padding={4}
              cornerRadius={4}
              shadowColor="rgba(0,0,0,0.3)"
              shadowBlur={4}
              shadowOffset={{ x: 0, y: 2 }}
              backgroundColor={color}
            />
          </React.Fragment>
        );
      })}
    </Layer>
  );
};