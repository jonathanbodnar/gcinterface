import { cn } from '@/lib/utils';

interface HighlightArea {
  id: string;
  type: 'rectangle' | 'polygon' | 'line' | 'point';
  coordinates: { x: number; y: number; width?: number; height?: number; points?: string };
  color: string;
  label?: string;
}

interface SVGOverlayProps {
  width: number;
  height: number;
  highlights: HighlightArea[];
  activeHighlightId?: string | null;
}

const tradeColors: Record<string, string> = {
  M: '#ef4444', // Red for Mechanical
  P: '#3b82f6', // Blue for Plumbing
  E: '#22c55e', // Green for Electrical
  A: '#eab308', // Yellow for Architectural
};

export default function SVGOverlay({ width, height, highlights, activeHighlightId }: SVGOverlayProps) {
  if (!width || !height) return null;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      width={width}
      height={height}
      style={{ zIndex: 10 }}
    >
      {highlights.map((highlight) => {
        const isActive = activeHighlightId === highlight.id;
        const opacity = isActive ? 0.4 : 0.2;
        const strokeWidth = isActive ? 3 : 2;

        if (highlight.type === 'rectangle') {
          return (
            <g key={highlight.id}>
              <rect
                x={highlight.coordinates.x}
                y={highlight.coordinates.y}
                width={highlight.coordinates.width || 0}
                height={highlight.coordinates.height || 0}
                fill={highlight.color}
                fillOpacity={opacity}
                stroke={highlight.color}
                strokeWidth={strokeWidth}
                strokeOpacity={1}
                className={cn(
                  "transition-all duration-200",
                  isActive && "animate-pulse"
                )}
              />
              {highlight.label && isActive && (
                <text
                  x={highlight.coordinates.x + (highlight.coordinates.width || 0) / 2}
                  y={highlight.coordinates.y - 5}
                  textAnchor="middle"
                  fill={highlight.color}
                  fontSize="12"
                  fontWeight="bold"
                  className="drop-shadow"
                >
                  {highlight.label}
                </text>
              )}
            </g>
          );
        }

        if (highlight.type === 'polygon' && highlight.coordinates.points) {
          return (
            <g key={highlight.id}>
              <polygon
                points={highlight.coordinates.points}
                fill={highlight.color}
                fillOpacity={opacity}
                stroke={highlight.color}
                strokeWidth={strokeWidth}
                strokeOpacity={1}
                className={cn(
                  "transition-all duration-200",
                  isActive && "animate-pulse"
                )}
              />
            </g>
          );
        }

        if (highlight.type === 'line') {
          const points = highlight.coordinates.points?.split(' ') || [];
          if (points.length < 2) return null;
          
          return (
            <line
              key={highlight.id}
              x1={parseFloat(points[0].split(',')[0])}
              y1={parseFloat(points[0].split(',')[1])}
              x2={parseFloat(points[1].split(',')[0])}
              y2={parseFloat(points[1].split(',')[1])}
              stroke={highlight.color}
              strokeWidth={strokeWidth}
              strokeOpacity={1}
              className={cn(
                "transition-all duration-200",
                isActive && "animate-pulse"
              )}
            />
          );
        }

        if (highlight.type === 'point') {
          return (
            <circle
              key={highlight.id}
              cx={highlight.coordinates.x}
              cy={highlight.coordinates.y}
              r={isActive ? 8 : 5}
              fill={highlight.color}
              fillOpacity={opacity}
              stroke={highlight.color}
              strokeWidth={strokeWidth}
              strokeOpacity={1}
              className={cn(
                "transition-all duration-200",
                isActive && "animate-pulse"
              )}
            />
          );
        }

        return null;
      })}
    </svg>
  );
}
