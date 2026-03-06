import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface JobProgressProps {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

export default function JobProgress({ jobId, status, progress, error, startedAt, finishedAt }: JobProgressProps) {
  const statusVariant = {
    QUEUED: 'secondary' as const,
    PROCESSING: 'default' as const,
    COMPLETED: 'default' as const,
    FAILED: 'destructive' as const,
    CANCELLED: 'outline' as const,
  }[status];

  const phaseMessage =
    progress < 20 ? 'Ingesting file...' :
    progress < 25 ? 'Parsing PDF pages...' :
    progress < 60 ? 'AI analyzing plans...' :
    progress < 75 ? 'Extracting features...' :
    progress < 80 ? 'Saving to database...' :
    progress < 95 ? 'Applying material rules...' :
    'Finalizing results...';

  const steps = [
    { label: 'File Upload', done: progress > 10 },
    { label: 'Plan Analysis', done: progress > 80 },
    { label: 'Feature Extraction', done: progress > 95 },
    { label: 'Materials Generation', done: progress > 95 },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Analysis Progress</CardTitle>
          <p className="text-sm text-muted-foreground">Job ID: {jobId}</p>
        </div>
        <Badge variant={statusVariant}>{status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'PROCESSING' && (
          <>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{phaseMessage}</span>
                <span className="font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {progress >= 25 && progress < 60 && (
                <p className="mt-2 text-xs text-muted-foreground italic">
                  Analyzing each page with AI vision... This may take a few minutes for large plans.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Processing Steps:</p>
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  {step.done ? (
                    <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span className={`text-sm ${step.done ? '' : 'text-muted-foreground'}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-6 text-sm text-muted-foreground">
          {startedAt && <span>Started: {new Date(startedAt).toLocaleString()}</span>}
          {finishedAt && <span>Finished: {new Date(finishedAt).toLocaleString()}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
