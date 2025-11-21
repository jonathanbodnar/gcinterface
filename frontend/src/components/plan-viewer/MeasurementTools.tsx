import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ruler, Square, Hash, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tool = 'none' | 'length' | 'area' | 'count' | 'scale';

interface Measurement {
  id: string;
  type: 'length' | 'area' | 'count';
  value: number;
  unit: string;
  label: string;
}

interface MeasurementToolsProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  measurements: Measurement[];
  onClearMeasurements: () => void;
}

export default function MeasurementTools({
  activeTool,
  onToolChange,
  measurements,
  onClearMeasurements,
}: MeasurementToolsProps) {
  const [showMeasurements, setShowMeasurements] = useState(true);

  const tools = [
    { id: 'length' as Tool, icon: Ruler, label: 'Length', color: 'bg-blue-100 text-blue-700' },
    { id: 'area' as Tool, icon: Square, label: 'Area', color: 'bg-green-100 text-green-700' },
    { id: 'count' as Tool, icon: Hash, label: 'Count', color: 'bg-purple-100 text-purple-700' },
    { id: 'scale' as Tool, icon: Settings, label: 'Scale', color: 'bg-orange-100 text-orange-700' },
  ];

  return (
    <div className="border-b bg-card p-4 space-y-3">
      {/* Tool Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-2">Measurement Tools:</span>
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          
          return (
            <Button
              key={tool.id}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToolChange(isActive ? 'none' : tool.id)}
              className={cn('gap-2', isActive && tool.color)}
            >
              <Icon className="w-4 h-4" />
              {tool.label}
            </Button>
          );
        })}
        
        {measurements.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearMeasurements}
            className="ml-auto text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Tool Instructions */}
      {activeTool !== 'none' && (
        <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded text-sm">
          {activeTool === 'length' && (
            <p><strong>Length Tool:</strong> Click start point, then end point to measure linear distance</p>
          )}
          {activeTool === 'area' && (
            <p><strong>Area Tool:</strong> Click to create polygon points, double-click to finish and calculate area</p>
          )}
          {activeTool === 'count' && (
            <p><strong>Count Tool:</strong> Click items to count them. Click same spot to decrease count</p>
          )}
          {activeTool === 'scale' && (
            <p><strong>Scale Tool:</strong> Click two points on a known dimension, then enter the actual distance to calibrate scale</p>
          )}
        </div>
      )}

      {/* Saved Measurements */}
      {measurements.length > 0 && showMeasurements && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Saved Measurements ({measurements.length})</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMeasurements(!showMeasurements)}
            >
              {showMeasurements ? 'Hide' : 'Show'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {measurements.map((measurement) => (
              <Badge key={measurement.id} variant="secondary" className="gap-2">
                {measurement.type === 'length' && <Ruler className="w-3 h-3" />}
                {measurement.type === 'area' && <Square className="w-3 h-3" />}
                {measurement.type === 'count' && <Hash className="w-3 h-3" />}
                {measurement.label}: {measurement.value.toFixed(1)} {measurement.unit}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
