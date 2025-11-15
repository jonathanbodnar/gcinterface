import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function RFQManagement() {
  const { projectId } = useParams();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">RFQ Management</h1>
          <p className="text-muted-foreground mt-2">Project {projectId}</p>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <CardTitle>RFQ Management</CardTitle>
            </div>
            <CardDescription>
              Manage request for quotes and vendor communications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>RFQ management interface coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}