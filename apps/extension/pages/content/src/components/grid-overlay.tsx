import React from 'react';
import { IGridTile } from '@chrome-extension/shared/lib/utils/discover';

export interface ITileStatus {
  status: 'pending' | 'scanning' | 'completed';
  newItemsCount?: number;
}

export interface IGridOverlayProps {
  tiles: IGridTile[];
  tileStates: Record<number, ITileStatus>;
  gridSize: number;
  width?: number;
  height?: number;
}

export const GridOverlay: React.FC<IGridOverlayProps> = ({
  tiles,
  tileStates,
  gridSize,
  width = typeof window !== 'undefined' ? window.innerWidth : 1280,
  height = typeof window !== 'undefined' ? window.innerHeight : 800,
}) => {
  if (!tiles || tiles.length === 0) return null;

  const tileWidth = width / gridSize;
  const tileHeight = height / gridSize;

  return (
    <div
      id="geoleadscraper-spatial-grid-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 40,
        overflow: 'hidden',
      }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
        {tiles.map(tile => {
          const state = tileStates[tile.index] || { status: 'pending' };
          const x = tile.col * tileWidth;
          const y = tile.row * tileHeight;

          let strokeColor = 'rgba(59, 130, 246, 0.4)'; // blue-500 subtle
          let fillColor = 'rgba(59, 130, 246, 0.03)';
          let strokeDasharray = '4 4';
          let strokeWidth = 1.5;

          if (state.status === 'scanning') {
            strokeColor = '#2563eb'; // blue-600 vibrant
            fillColor = 'rgba(37, 99, 235, 0.18)';
            strokeDasharray = 'none';
            strokeWidth = 2.5;
          } else if (state.status === 'completed') {
            strokeColor = '#10b981'; // emerald-500
            fillColor = 'rgba(16, 185, 129, 0.12)';
            strokeDasharray = 'none';
            strokeWidth = 2;
          }

          return (
            <g key={tile.index} style={{ transition: 'all 0.3s ease-out' }}>
              {/* Tile bounding box */}
              <rect
                x={x + 2}
                y={y + 2}
                width={tileWidth - 4}
                height={tileHeight - 4}
                rx={6}
                ry={6}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
              />

              {/* Tile Header Label */}
              <rect
                x={x + 6}
                y={y + 6}
                width={state.status === 'completed' && state.newItemsCount !== undefined ? 64 : 46}
                height={20}
                rx={4}
                ry={4}
                fill={
                  state.status === 'scanning'
                    ? '#2563eb'
                    : state.status === 'completed'
                      ? '#10b981'
                      : 'rgba(30, 41, 59, 0.65)'
                }
              />
              <text
                x={x + 10}
                y={y + 20}
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
                fontFamily="sans-serif">
                {state.status === 'completed' && state.newItemsCount !== undefined
                  ? `✓ +${state.newItemsCount}`
                  : `#${tile.index}`}
              </text>

              {/* Scanning animated pulse ring inside active tile */}
              {state.status === 'scanning' && (
                <circle
                  cx={x + tileWidth / 2}
                  cy={y + tileHeight / 2}
                  r={Math.min(tileWidth, tileHeight) * 0.25}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  opacity="0.8">
                  <animate
                    attributeName="r"
                    values={`10;${Math.min(tileWidth, tileHeight) * 0.35}`}
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                  <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
