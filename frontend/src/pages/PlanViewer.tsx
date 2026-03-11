import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PlanViewer from '../components/plan-viewer/PlanViewer';
import MaterialsPanel from '../components/plan-viewer/MaterialsPanel';
import MeasurementTools from '../components/plan-viewer/MeasurementTools';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';

type Tool = 'none' | 'length' | 'area' | 'count' | 'scale';

interface Measurement {
  id: string;
  type: 'length' | 'area' | 'count';
  value: number;
  unit: string;
  label: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function PlanViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [bom, setBom] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [materialsOnPage, setMaterialsOnPage] = useState<any[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('none');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    loadProjectData();
  }, [id]);

  useEffect(() => {
    filterMaterialsByPage();
  }, [currentPage, bom]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const projectResponse = await axios.get(`${API_URL}/projects/${id}`);
      setProject(projectResponse.data.project);
      
      // Get PDF URL from planPages
      if (projectResponse.data.planPages && projectResponse.data.planPages.length > 0) {
        setPdfUrl(projectResponse.data.planPages[0].pdfUrl);
      }

      const bomResponse = await axios.get(`${API_URL}/bom?projectId=${id}`);
      setBom(bomResponse.data);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMaterialsByPage = () => {
    if (!bom?.items) return;

    const allMaterials = bom.items.map((item: any) => ({
      id: item.id,
      description: item.description,
      quantity: item.finalQty || item.quantity,
      uom: item.uom,
      trade: item.material?.trade || 'A',
      confidence: item.confidence,
      category: item.category,
      unitCost: item.unitCost,
      wasteFactor: item.wasteFactor,
    }));

    setMaterialsOnPage(allMaterials);
    setHighlights([]);
  };

  const handleMaterialHover = (materialId: string | null) => {
    setSelectedMaterialId(materialId);
    // Highlighting now works via SVGOverlay component
  };

  const handleMaterialClick = (materialId: string) => {
    setSelectedMaterialId(materialId);
    // TODO: Zoom to material location on PDF (Phase 3)
  };

  const handleClearMeasurements = () => {
    setMeasurements([]);
  };

  const handleMeasurementComplete = (type: string, value: number) => {
    const measurement: Measurement = {
      id: `measure-${Date.now()}`,
      type: type as 'length' | 'area' | 'count',
      value,
      unit: type === 'length' ? 'LF' : type === 'area' ? 'SF' : 'items',
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${measurements.filter(m => m.type === type).length + 1}`,
    };
    setMeasurements(prev => [...prev, measurement]);
    
    // Reset tool after measurement (except count tool)
    if (type !== 'count') {
      setActiveTool('none');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!pdfUrl) {
    return (
      <Layout>
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No PDF plans available for this project</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/projects/${id}`)}>
            Back to Project
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-card">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${id}`)} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{project?.name || 'Project Plans'}</h1>
              <p className="text-sm text-muted-foreground">
                Interactive plan viewer with material overlay
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {bom?.summary?.totalItems || 0} materials
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0 flex-col">
          {/* Measurement Tools */}
          <MeasurementTools
            activeTool={activeTool}
            onToolChange={setActiveTool}
            measurements={measurements}
            onClearMeasurements={handleClearMeasurements}
          />

          {/* PDF Viewer and Materials Panel */}
          <div className="flex-1 flex min-h-0">
            {/* PDF Viewer (60%) */}
            <div className="w-[60%]">
              <PlanViewer
                pdfUrl={pdfUrl}
                currentPage={currentPage}
              onPageChange={setCurrentPage}
              highlights={highlights}
              activeHighlightId={selectedMaterialId}
              activeTool={activeTool}
              onMeasurementComplete={handleMeasurementComplete}
            />
            </div>

          {/* Materials Panel (40%) */}
          <div className="w-[40%]">
            <MaterialsPanel
              materials={materialsOnPage}
              currentPage={currentPage}
              projectId={id}
              onMaterialHover={handleMaterialHover}
              onMaterialClick={handleMaterialClick}
              selectedMaterialId={selectedMaterialId}
              onBomChange={loadProjectData}
            />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
