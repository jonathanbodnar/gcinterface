import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PlanViewer from '../components/plan-viewer/PlanViewer';
import MaterialsPanel from '../components/plan-viewer/MaterialsPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';

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

  // Mock PDF URL - in production, this would come from the project
  const pdfUrl = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';

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

    // For now, distribute materials across pages
    // In production, this would filter by actual page number from takeoff
    const itemsPerPage = Math.ceil(bom.items.length / 15); // Assuming 15 pages
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    
    const pageMaterials = bom.items.slice(startIdx, endIdx).map((item: any) => ({
      id: item.id,
      description: item.description,
      quantity: item.finalQty || item.quantity,
      uom: item.uom,
      trade: item.material?.trade || 'A',
      confidence: item.confidence,
      category: item.category,
    }));

    setMaterialsOnPage(pageMaterials);
  };

  const handleMaterialHover = (materialId: string | null) => {
    setSelectedMaterialId(materialId);
    // TODO: Highlight on PDF overlay
  };

  const handleMaterialClick = (materialId: string) => {
    setSelectedMaterialId(materialId);
    // TODO: Zoom to material location on PDF
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
        <div className="flex-1 flex min-h-0">
          {/* PDF Viewer (60%) */}
          <div className="w-[60%]">
            <PlanViewer
              pdfUrl={pdfUrl}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Materials Panel (40%) */}
          <div className="w-[40%]">
            <MaterialsPanel
              materials={materialsOnPage}
              currentPage={currentPage}
              totalPages={15}
              onMaterialHover={handleMaterialHover}
              onMaterialClick={handleMaterialClick}
              selectedMaterialId={selectedMaterialId}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
