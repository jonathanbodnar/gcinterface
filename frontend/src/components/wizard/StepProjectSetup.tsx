import { useWizard } from '../../contexts/ProjectWizardContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const DISCIPLINES = [
  { id: 'A', label: 'Architectural', desc: 'Floor plans, elevations, sections' },
  { id: 'P', label: 'Plumbing', desc: 'Water, sewer, and drain systems' },
  { id: 'M', label: 'Mechanical', desc: 'HVAC, ventilation, and air systems' },
  { id: 'E', label: 'Electrical', desc: 'Power, lighting, and electrical systems' },
];

const TARGETS: Record<string, Array<{ id: string; label: string; disciplines: string[] }>> = {
  A: [
    { id: 'rooms', label: 'Rooms', disciplines: ['A'] },
    { id: 'walls', label: 'Walls', disciplines: ['A'] },
    { id: 'doors', label: 'Doors', disciplines: ['A'] },
    { id: 'windows', label: 'Windows', disciplines: ['A'] },
  ],
  P: [{ id: 'pipes', label: 'Pipes', disciplines: ['P'] }],
  M: [{ id: 'ducts', label: 'Ducts', disciplines: ['M'] }],
  PE: [{ id: 'fixtures', label: 'Fixtures', disciplines: ['P', 'E'] }],
};

export default function StepProjectSetup() {
  const { setupData, setSetupData } = useWizard();

  const toggleDiscipline = (id: string) => {
    const current = setupData.disciplines;
    const updated = current.includes(id)
      ? current.filter((d) => d !== id)
      : [...current, id];
    setSetupData({ disciplines: updated });

    // Remove targets that no longer have a valid discipline
    const allTargets = Object.values(TARGETS).flat();
    const validTargets = setupData.targets.filter((t) => {
      const target = allTargets.find((at) => at.id === t);
      return target && target.disciplines.some((d) => updated.includes(d));
    });
    setSetupData({ targets: validTargets });
  };

  const toggleTarget = (id: string) => {
    const current = setupData.targets;
    const updated = current.includes(id)
      ? current.filter((t) => t !== id)
      : [...current, id];
    setSetupData({ targets: updated });
  };

  const availableTargets = Object.values(TARGETS)
    .flat()
    .filter((t) => t.disciplines.some((d) => setupData.disciplines.includes(d)));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Project Setup</h2>
        <p className="text-muted-foreground">Name your project and configure analysis settings</p>
      </div>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>Basic details about this project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={setupData.name}
              onChange={(e) => setSetupData({ name: e.target.value })}
              placeholder="e.g., 25017 Melissa TX CDs SS-min"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="client">Client Name</Label>
              <Input
                id="client"
                value={setupData.clientName}
                onChange={(e) => setSetupData({ clientName: e.target.value })}
                placeholder="e.g., AT&T"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={setupData.location}
                onChange={(e) => setSetupData({ location: e.target.value })}
                placeholder="e.g., Melissa, TX"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={setupData.dueDate}
                onChange={(e) => setSetupData({ dueDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={setupData.notes}
              onChange={(e) => setSetupData({ notes: e.target.value })}
              placeholder="Any additional notes about this project..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Disciplines */}
      <Card>
        <CardHeader>
          <CardTitle>Disciplines</CardTitle>
          <CardDescription>Select which plan disciplines to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {DISCIPLINES.map((d) => (
              <button
                key={d.id}
                onClick={() => toggleDiscipline(d.id)}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                  setupData.disciplines.includes(d.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <div className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center ${
                  setupData.disciplines.includes(d.id) ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                }`}>
                  {setupData.disciplines.includes(d.id) && (
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-medium">{d.label} ({d.id})</div>
                  <div className="text-sm text-muted-foreground">{d.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Extraction Targets</CardTitle>
          <CardDescription>Choose what to extract from the plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableTargets.map((t) => (
              <Badge
                key={t.id}
                variant={setupData.targets.includes(t.id) ? 'default' : 'outline'}
                className="cursor-pointer px-4 py-2 text-sm"
                onClick={() => toggleTarget(t.id)}
              >
                {t.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
