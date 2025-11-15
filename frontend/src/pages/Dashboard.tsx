import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderKanban, Building2, Settings, TrendingUp, FileText, DollarSign, Clock } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Projects',
      description: 'View and manage your projects',
      icon: FolderKanban,
      action: () => navigate('/projects'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Vendors',
      description: 'Manage vendors and subcontractors',
      icon: Building2,
      action: () => navigate('/admin'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: 'Admin Center',
      description: 'Configure rules, markups, and templates',
      icon: Settings,
      action: () => navigate('/admin'),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950',
    },
  ];

  const stats = [
    { label: 'Active Projects', value: '0', icon: FolderKanban, color: 'text-blue-600' },
    { label: 'Pending RFQs', value: '0', icon: FileText, color: 'text-purple-600' },
    { label: 'Quotes Received', value: '0', icon: TrendingUp, color: 'text-green-600' },
    { label: 'Total Value', value: '$0', icon: DollarSign, color: 'text-amber-600' },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Welcome back, {user?.name}</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Post-Takeoff Estimation & Procurement Dashboard
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card
                key={index}
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                onClick={action.action}
              >
                <CardHeader>
                  <div className={`w-12 h-12 ${action.bgColor} rounded-lg flex items-center justify-center mb-2`}>
                    <Icon className={`w-6 h-6 ${action.color}`} />
                  </div>
                  <CardTitle>{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Overview of your projects and activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest project updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
                View Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}