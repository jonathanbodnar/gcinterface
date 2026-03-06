import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface PlanUploadProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
}

export default function PlanUpload({ onFileUpload, isUploading }: PlanUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0]);
      }
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/vnd.dwg': ['.dwg'],
      'application/vnd.dwg': ['.dwg'],
      'image/vnd.dxf': ['.dxf'],
      'model/vnd.ifc': ['.ifc'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-muted-foreground/50 bg-card'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-4">
          <div className="flex justify-center">
            <svg
              className={`w-16 h-16 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <div>
            <p className="text-lg font-medium mb-2">
              {isUploading
                ? 'Uploading...'
                : isDragActive
                  ? 'Drop your plan file here'
                  : 'Upload Architectural/MEP Plans'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your plan file here, or click to browse
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {['PDF', 'DWG', 'DXF', 'IFC'].map((format) => (
              <span
                key={format}
                className="px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full"
              >
                {format}
              </span>
            ))}
          </div>

          {isUploading && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 bg-muted/50 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Upload Guidelines</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>Maximum file size: 100MB</li>
          <li>Supported formats: PDF, DWG, DXF, IFC</li>
          <li>Multi-sheet PDFs are supported</li>
          <li>Ensure plans include scale information for best results</li>
        </ul>
      </div>
    </div>
  );
}
