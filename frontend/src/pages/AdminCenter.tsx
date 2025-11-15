import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, DollarSign, Percent, Users, Mail } from 'lucide-react';

export default function AdminCenter() {
  const adminSections = [
    {
      title: 'Material Rules',
      description: 'Configure cost per unit and labor rates',
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Trade Markups',
      description: 'Set markup percentages by trade',
      icon: Percent,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: 'Vendor Management',
      description: 'Upload vendors from Excel, manage contacts',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: 'Email Templates',
      description: 'Customize RFQ, award, and non-award email templates',
      icon: Mail,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Admin Center</h1>
          <p className="text-muted-foreground mt-2">Configure system settings and rules</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {adminSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className={`w-12 h-12 ${section.bgColor} rounded-lg flex items-center justify-center mb-2`}>
                    <Icon className={`w-6 h-6 ${section.color}`} />
                  </div>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Configuration interface coming soon...
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}