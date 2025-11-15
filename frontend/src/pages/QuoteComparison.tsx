import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function QuoteComparison() {
  const { projectId } = useParams();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Quote Comparison</h1>
          <p className="text-muted-foreground mt-2">Project {projectId}</p>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <CardTitle>Bid Leveling & Comparison</CardTitle>
            </div>
            <CardDescription>
              Compare vendor quotes and level bids
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Bid leveling and quote comparison coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}