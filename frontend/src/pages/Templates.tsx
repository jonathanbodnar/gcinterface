import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Plus, Edit2, Loader2, FileText, Award, XCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Templates() {
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    type: 'RFQ',
    subject: '',
    body: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmailTemplates();
  }, []);

  const loadEmailTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/email-templates`);
      setEmailTemplates(response.data);
    } catch (error) {
      console.error('Failed to load email templates:', error);
    }
  };

  const openTemplateDialog = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        type: template.type || 'RFQ',
        subject: template.subject || '',
        body: template.body || '',
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        type: 'RFQ',
        subject: '',
        body: '',
      });
    }
    setTemplateDialog(true);
  };

  const saveEmailTemplate = async () => {
    setLoading(true);
    try {
      const data = {
        type: templateForm.type,
        subject: templateForm.subject,
        body: templateForm.body,
        active: true,
      };

      if (editingTemplate) {
        await axios.put(`${API_URL}/admin/email-templates/${editingTemplate.id}`, data);
      } else {
        await axios.post(`${API_URL}/admin/email-templates`, data);
      }
      setTemplateDialog(false);
      loadEmailTemplates();
    } catch (error) {
      console.error('Failed to save email template:', error);
      alert('Failed to save email template');
    } finally {
      setLoading(false);
    }
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'RFQ':
        return <FileText className="w-4 h-4" />;
      case 'AWARD':
        return <Award className="w-4 h-4" />;
      case 'NON_AWARD':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const getTemplateVariant = (type: string) => {
    switch (type) {
      case 'RFQ':
        return 'default';
      case 'AWARD':
        return 'default';
      case 'NON_AWARD':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Email Templates</h1>
            <p className="text-muted-foreground mt-2">
              Customize email templates for RFQ, awards, and non-awards
            </p>
          </div>
          <Button onClick={() => openTemplateDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Template
          </Button>
        </div>

        {/* Template Types Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {emailTemplates.filter(t => t.type === 'RFQ').length}
                  </div>
                  <p className="text-xs text-muted-foreground">RFQ Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Award className="w-5 h-5 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {emailTemplates.filter(t => t.type === 'AWARD').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Award Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
                  <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {emailTemplates.filter(t => t.type === 'NON_AWARD').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Non-Award Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Templates ({emailTemplates.length})</CardTitle>
            <CardDescription>Click any template to edit</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No email templates configured. Click "Add Template" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  emailTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <Badge variant={getTemplateVariant(template.type) as any} className="gap-1">
                          {getTemplateIcon(template.type)}
                          {template.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{template.subject}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                        {template.body?.substring(0, 100)}...
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openTemplateDialog(template)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Email Template Dialog */}
        <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Email Template</DialogTitle>
              <DialogDescription>
                Customize email templates with variables like {"{{projectName}}"}, {"{{vendorName}}"}, etc.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="templateType">Template Type</Label>
                <select
                  id="templateType"
                  value={templateForm.type}
                  onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="RFQ">RFQ - Request for Quote</option>
                  <option value="AWARD">Award - Congratulations Email</option>
                  <option value="NON_AWARD">Non-Award - Thank You Email</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="templateSubject">Subject Line</Label>
                <Input
                  id="templateSubject"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="RFQ for {{projectName}} - Due {{dueDate}}"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="templateBody">Email Body</Label>
                <Textarea
                  id="templateBody"
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  rows={16}
                  placeholder="Dear {{vendorName}},&#10;&#10;We are requesting a quote for {{projectName}}...&#10;&#10;Available variables: {{projectName}}, {{vendorName}}, {{dueDate}}, {{materialList}}, {{contactName}}"
                  className="font-mono text-sm"
                />
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs font-semibold mb-2">Available Variables:</p>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <code>{"{{projectName}}"}</code>
                  <code>{"{{vendorName}}"}</code>
                  <code>{"{{dueDate}}"}</code>
                  <code>{"{{contactName}}"}</code>
                  <code>{"{{contactEmail}}"}</code>
                  <code>{"{{materialList}}"}</code>
                  <code>{"{{totalAmount}}"}</code>
                  <code>{"{{contractNumber}}"}</code>
                  <code>{"{{projectLocation}}"}</code>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveEmailTemplate} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingTemplate ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
