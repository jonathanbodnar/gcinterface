import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2, RotateCw } from 'lucide-react';
import SVGOverlay from './SVGOverlay';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface HighlightArea {
  id: string;
  type: 'rectangle' | 'polygon' | 'line' | 'point';
  coordinates: { x: number; y: number; width?: number; height?: number; points?: string };
  color: string;
  label?: string;
}

interface PlanViewerProps {
  pdfUrl: string;
  onPageChange?: (pageNumber: number) => void;
  currentPage?: number;
  highlights?: HighlightArea[];
  activeHighlightId?: string | null;
  activeTool?: string;
  onMeasurementComplete?: (type: string, value: number) => void;
}

export default function PlanViewer({ 
  pdfUrl, 
  onPageChange, 
  currentPage = 1,
  highlights = [],
  activeHighlightId = null,
  activeTool = 'none',
  onMeasurementComplete,
}: PlanViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(currentPage);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [measurementPoints, setMeasurementPoints] = useState<{x: number, y: number}[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{x: number, y: number} | null>(null);

  // Load PDF document
  useEffect(() => {
    if (!pdfUrl) return;

    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    loadingTask.promise.then((pdf) => {
      setPdfDoc(pdf);
      setPageCount(pdf.numPages);
      setLoading(false);
    }).catch((error) => {
      console.error('Error loading PDF:', error);
      setLoading(false);
    });
  }, [pdfUrl]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    pdfDoc.getPage(pageNum).then((page: any) => {
      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;

      const viewport = page.getViewport({ scale, rotation });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Store canvas size for overlay
      setCanvasSize({ width: viewport.width, height: viewport.height });

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      page.render(renderContext);
    });

    if (onPageChange) {
      onPageChange(pageNum);
    }
  }, [pdfDoc, pageNum, scale, rotation, onPageChange]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pageCount) {
      setPageNum(page);
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 4.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.25));
  const fitWidth = () => setScale(1.0);
  const rotate = () => setRotation(prev => (prev + 90) % 360);

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    console.log('Mouse down at:', x, y, 'Tool:', activeTool);

    if (activeTool === 'length') {
      setIsDragging(true);
      setDragStart({ x, y });
      setCurrentMousePos({ x, y });
    } else if (activeTool === 'area') {
      // For area, use click-based approach
      const newPoints = [...measurementPoints, { x, y }];
      console.log('Area tool - points:', newPoints.length);
      setMeasurementPoints(newPoints);
      
      if (newPoints.length >= 4) {
        // Calculate area using shoelace formula
        let area = 0;
        for (let i = 0; i < newPoints.length; i++) {
          const j = (i + 1) % newPoints.length;
          area += newPoints[i].x * newPoints[j].y;
          area -= newPoints[j].x * newPoints[i].y;
        }
        area = Math.abs(area / 2);
        
        // Convert to square feet (mock scale)
        const sqft = (area / 10000) * 100;
        
        console.log('Area measured:', sqft, 'SF');
        onMeasurementComplete?.('area', sqft);
        setMeasurementPoints([]);
      }
    } else if (activeTool === 'count') {
      // Count - each click increments
      const currentCount = measurementPoints.length + 1;
      console.log('Count:', currentCount);
      onMeasurementComplete?.('count', currentCount);
      setMeasurementPoints([...measurementPoints, { x, y }]);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current || activeTool !== 'length') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setCurrentMousePos({ x, y });
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (activeTool === 'length') {
      // Calculate distance
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      const pixels = Math.sqrt(dx * dx + dy * dy);
      
      // Mock scale: assume 100 pixels = 10 feet
      const feet = (pixels / 100) * 10;
      
      console.log('Length measured:', feet, 'LF');
      onMeasurementComplete?.('length', feet);
      
      // Reset drag state
      setIsDragging(false);
      setDragStart(null);
      setCurrentMousePos(null);
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Area and count tools use click (not drag)
    if (activeTool === 'none' || !canvasRef.current) return;
    if (activeTool === 'length') return; // Length uses drag, not click

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log('Click coordinates:', x, y);

    if (activeTool === 'area') {
      // Area tool logic already handled in mouseDown
    } else if (activeTool === 'count') {
      // Count tool logic already handled in mouseDown
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(pageNum - 1)}
            disabled={pageNum <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            Page {pageNum} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(pageNum + 1)}
            disabled={pageNum >= pageCount}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.25}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 4.0}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={fitWidth}>
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={rotate}>
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Canvas with Overlay */}
      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        <div className="flex items-center justify-center min-h-full" ref={containerRef}>
          {loading ? (
            <div className="text-muted-foreground">Loading PDF...</div>
          ) : (
            <Card className="shadow-lg relative">
              <div className="relative inline-block">
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full h-auto"
                  onClick={handleCanvasClick}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => {
                    if (isDragging) {
                      setIsDragging(false);
                      setDragStart(null);
                      setCurrentMousePos(null);
                    }
                  }}
                  style={{ 
                    cursor: activeTool !== 'none' ? 'crosshair' : 'default',
                    display: 'block'
                  }}
                />
                {activeTool !== 'none' && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium shadow-lg">
                    {activeTool === 'length' && (isDragging ? 'Release to measure' : 'Click and drag to measure')}
                    {activeTool === 'area' && `Click point ${measurementPoints.length + 1} of 4`}
                    {activeTool === 'count' && 'Click items to count'}
                  </div>
                )}
              </div>
            {canvasSize.width > 0 && (
              <>
                <SVGOverlay
                  width={canvasSize.width}
                  height={canvasSize.height}
                  highlights={highlights}
                  activeHighlightId={activeHighlightId}
                />
                {/* Show measurement points being created */}
                {measurementPoints.length > 0 && (
                  <svg
                    className="absolute top-0 left-0 pointer-events-none"
                    width={canvasSize.width}
                    height={canvasSize.height}
                    style={{ zIndex: 20 }}
                  >
                    {/* Length tool: Show live line while dragging */}
                    {isDragging && dragStart && currentMousePos && activeTool === 'length' && (
                      <>
                        <circle
                          cx={dragStart.x}
                          cy={dragStart.y}
                          r={6}
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                        <line
                          x1={dragStart.x}
                          y1={dragStart.y}
                          x2={currentMousePos.x}
                          y2={currentMousePos.y}
                          stroke="#3b82f6"
                          strokeWidth={3}
                          strokeDasharray="5,5"
                        />
                        <circle
                          cx={currentMousePos.x}
                          cy={currentMousePos.y}
                          r={6}
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                        {/* Show live distance */}
                        <text
                          x={(dragStart.x + currentMousePos.x) / 2}
                          y={(dragStart.y + currentMousePos.y) / 2 - 10}
                          fill="#3b82f6"
                          fontSize="14"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="drop-shadow"
                        >
                          {(() => {
                            const dx = currentMousePos.x - dragStart.x;
                            const dy = currentMousePos.y - dragStart.y;
                            const pixels = Math.sqrt(dx * dx + dy * dy);
                            const feet = (pixels / 100) * 10;
                            return `${feet.toFixed(1)} LF`;
                          })()}
                        </text>
                      </>
                    )}
                    
                    {/* Area/Count tools: Show measurement points */}
                    {measurementPoints.map((point, index) => (
                      <circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r={8}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={3}
                      />
                    ))}
                    {measurementPoints.length >= 2 && activeTool === 'area' && (
                      <polygon
                        points={measurementPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        stroke="#3b82f6"
                        strokeWidth={3}
                        strokeDasharray="5,5"
                      />
                    )}
                  </svg>
                )}
              </>
            )}
          </Card>
          )}
        </div>
      </div>
    </div>
  );
}
