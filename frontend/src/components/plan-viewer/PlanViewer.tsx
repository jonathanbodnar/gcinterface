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
}

export default function PlanViewer({ 
  pdfUrl, 
  onPageChange, 
  currentPage = 1,
  highlights = [],
  activeHighlightId = null,
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
              <canvas ref={canvasRef} className="max-w-full h-auto" />
              {canvasSize.width > 0 && (
                <SVGOverlay
                  width={canvasSize.width}
                  height={canvasSize.height}
                  highlights={highlights}
                  activeHighlightId={activeHighlightId}
                />
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
