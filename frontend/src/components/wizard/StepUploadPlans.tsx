import { useState, useEffect, useRef } from 'react';
import { useWizard } from '../../contexts/ProjectWizardContext';
import { takeoffApi } from '../../services/takeoffApi';
import axios from 'axios';
import PlanUpload from '../takeoff/PlanUpload';
import JobProgress from '../takeoff/JobProgress';
import { CheckCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function StepUploadPlans() {
  const { projectId, setupData, takeoffJobId, takeoffData, setTakeoffJobId, setTakeoffFileId, setTakeoffData } = useWizard();
  const [isUploading, setIsUploading] = useState(false);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resume polling whenever takeoffJobId becomes available
  useEffect(() => {
    if (takeoffJobId && !takeoffData) {
      setLoading(true);
      // Fetch status immediately, then start polling
      takeoffApi.getJobStatus(takeoffJobId).then((status) => {
        setJobStatus(status);
        setLoading(false);
        if (status.status === 'COMPLETED') {
          takeoffApi.getTakeoffResults(takeoffJobId).then(setTakeoffData);
        } else if (status.status !== 'FAILED' && status.status !== 'CANCELLED') {
          startPolling(takeoffJobId);
        }
      }).catch(() => {
        setLoading(false);
        startPolling(takeoffJobId);
      });
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [takeoffJobId]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const uploadResult = await takeoffApi.uploadFile(file);
      setTakeoffFileId(uploadResult.fileId);

      const jobResult = await takeoffApi.createJob({
        fileId: uploadResult.fileId,
        disciplines: setupData.disciplines,
        targets: setupData.targets,
        options: { bimPreferred: true, inferScale: true },
      });

      setTakeoffJobId(jobResult.jobId);
      // Link takeoff job to project
      if (projectId) {
        try {
          await axios.put(`${API_URL}/projects/${projectId}`, { takeoffJobId: jobResult.jobId });
        } catch { /* non-critical */ }
      }
      setJobStatus({ status: 'QUEUED', progress: 0 });
      startPolling(jobResult.jobId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const startPolling = (jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const status = await takeoffApi.getJobStatus(jobId);
        setJobStatus(status);

        if (status.status === 'COMPLETED') {
          if (pollRef.current) clearInterval(pollRef.current);
          const results = await takeoffApi.getTakeoffResults(jobId);
          setTakeoffData(results);
        } else if (status.status === 'FAILED' || status.status === 'CANCELLED') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Keep polling on transient errors
      }
    }, 5000);
  };

  // Show success summary when analysis is done
  if (takeoffData) {
    const counts = [
      { label: 'Rooms', value: takeoffData.rooms?.length || 0 },
      { label: 'Walls', value: takeoffData.walls?.length || 0 },
      { label: 'Pipes', value: takeoffData.pipes?.length || 0 },
      { label: 'Ducts', value: takeoffData.ducts?.length || 0 },
      { label: 'Fixtures', value: takeoffData.fixtures?.length || 0 },
    ].filter(c => c.value > 0);

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center py-8">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold tracking-tight">Plan Analysis Complete</h2>
          <p className="text-muted-foreground mt-2">
            {counts.map(c => `${c.value} ${c.label.toLowerCase()}`).join(', ')} extracted
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {counts.map(c => (
            <div key={c.label} className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-sm text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Click <span className="font-medium text-foreground">Next Step</span> to review the full Bill of Materials
        </p>
      </div>
    );
  }

  // Show progress if job is running or loading
  if (takeoffJobId && (jobStatus || loading)) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analyzing Plans</h2>
          <p className="text-muted-foreground">AI is processing your construction documents</p>
        </div>
        <JobProgress
          jobId={takeoffJobId}
          status={jobStatus?.status || 'PROCESSING'}
          progress={jobStatus?.progress || 0}
          error={jobStatus?.error}
          startedAt={jobStatus?.startedAt}
          finishedAt={jobStatus?.finishedAt}
        />
      </div>
    );
  }

  // Show upload
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upload Plans</h2>
        <p className="text-muted-foreground">
          Upload your architectural/MEP plan documents for AI-powered analysis
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <PlanUpload onFileUpload={handleFileUpload} isUploading={isUploading} />
    </div>
  );
}
