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
  onMeasurementComplete?: (type: string, value: number, points: any[]) => void;
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

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (activeTool === 'length') {
      const newPoints = [...measurementPoints, { x, y }];
      setMeasurementPoints(newPoints);

      if (newPoints.length === 2) {
        // Calculate distance
        const dx = newPoints[1].x - newPoints[0].x;
        const dy = newPoints[1].y - newPoints[0].y;
        const pixels = Math.sqrt(dx * dx + dy * dy);
        
        // Assuming 1 pixel = 1 foot for demo (would use calibrated scale in production)
        const feet = pixels / 10; // Mock scale: 10 pixels = 1 foot
        
        onMeasurementComplete?.('length', feet, newPoints);
        setMeasurementPoints([]);
      }
    }

    if (activeTool === 'area') {
      const newPoints = [...measurementPoints, { x, y }];
      setMeasurementPoints(newPoints);
      
      // Double-click or specific key to finish (for now, 4 points = auto-finish)
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
        const sqft = area / 100; // Mock: 100 sq pixels = 1 SF
        
        onMeasurementComplete?.('area', sqft, newPoints);
        setMeasurementPoints([]);
      }
    }

    if (activeTool === 'count') {
      // Simple counter - each click increments
      const currentCount = measurementPoints.length + 1;
      onMeasurementComplete?.('count', currentCount, [{ x, y }]);
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
              <canvas 
                ref={canvasRef} 
                className="max-w-full h-auto cursor-crosshair"
                onClick={handleCanvasClick}
                style={{ cursor: activeTool !== 'none' ? 'crosshair' : 'default' }}
              />
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
                      {measurementPoints.map((point, index) => (
                        <circle
                          key={index}
                          cx={point.x}
                          cy={point.y}
                          r={5}
                          fill="#ff0000"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                      {measurementPoints.length === 2 && activeTool === 'length' && (
                        <line
                          x1={measurementPoints[0].x}
                          y1={measurementPoints[0].y}
                          x2={measurementPoints[1].x}
                          y2={measurementPoints[1].y}
                          stroke="#ff0000"
                          strokeWidth={2}
                          strokeDasharray="5,5"
                        />
                      )}
                      {measurementPoints.length >= 3 && activeTool === 'area' && (
                        <polygon
                          points={measurementPoints.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke="#ff0000"
                          strokeWidth={2}
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
