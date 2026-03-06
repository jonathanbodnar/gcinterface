import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import TakeoffMaterialsList from './MaterialsList';

interface TakeoffData {
  version: string;
  units: { linear: string; area: string };
  sheets: Array<{ id: string; scale?: string; name?: string }>;
  rooms: Array<{ id: string; name?: string; area: number; program?: string; finishes?: Record<string, string> }>;
  walls: Array<{ id: string; length: number; partitionType?: string; height?: number }>;
  openings: Array<{ id: string; openingType: string; width?: number; height?: number }>;
  pipes: Array<{ id: string; service: string; diameterIn: number; length: number; material?: string }>;
  ducts: Array<{ id: string; size: string; length: number }>;
  fixtures: Array<{ id: string; fixtureType: string; count: number }>;
  meta?: { fileId?: string; jobId?: string };
}

interface TakeoffResultsProps {
  data: TakeoffData;
  onExport?: (format: 'json' | 'csv') => void;
}

export default function TakeoffResults({ data, onExport }: TakeoffResultsProps) {
  const [activeTab, setActiveTab] = useState('summary');

  const fmt = (num: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(num);
  const totalArea = data.rooms.reduce((s, r) => s + r.area, 0);
  const totalWall = data.walls.reduce((s, w) => s + w.length, 0);
  const totalPipe = data.pipes.reduce((s, p) => s + p.length, 0);
  const totalDuct = data.ducts.reduce((s, d) => s + d.length, 0);
  const totalFixtures = data.fixtures.reduce((s, f) => s + f.count, 0);

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'rooms', label: 'Rooms', count: data.rooms.length },
    { id: 'walls', label: 'Walls', count: data.walls.length },
    { id: 'pipes', label: 'Pipes', count: data.pipes.length },
    { id: 'ducts', label: 'Ducts', count: data.ducts.length },
    { id: 'fixtures', label: 'Fixtures', count: data.fixtures.length },
    { id: 'materials', label: 'Materials' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Takeoff Results</CardTitle>
        {onExport && (
          <div className="flex gap-2">
            <button onClick={() => onExport('json')} className="px-3 py-1.5 text-xs border rounded-md hover:bg-muted">JSON</button>
            <button onClick={() => onExport('csv')} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90">CSV</button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex gap-1 border-b mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {'count' in tab && tab.count !== undefined && (
                <Badge variant="secondary" className="ml-2 text-xs">{tab.count}</Badge>
              )}
            </button>
          ))}
        </div>

        {/* Summary */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
              <div className="text-2xl font-bold">{data.rooms.length}</div>
              <div className="text-sm text-muted-foreground">Rooms ({fmt(totalArea)} {data.units.area})</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
              <div className="text-2xl font-bold">{fmt(totalWall)}</div>
              <div className="text-sm text-muted-foreground">Wall Length ({data.units.linear})</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
              <div className="text-2xl font-bold">{fmt(totalPipe)}</div>
              <div className="text-sm text-muted-foreground">Pipe Length ({data.units.linear})</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4">
              <div className="text-2xl font-bold">{fmt(totalDuct)}</div>
              <div className="text-sm text-muted-foreground">Duct Length ({data.units.linear})</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4">
              <div className="text-2xl font-bold">{totalFixtures}</div>
              <div className="text-sm text-muted-foreground">Fixtures ({data.fixtures.length} types)</div>
            </div>
          </div>
        )}

        {/* Rooms */}
        {activeTab === 'rooms' && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Program</TableHead><TableHead className="text-right">Area ({data.units.area})</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.rooms.map((r) => (
                <TableRow key={r.id}><TableCell>{r.id}</TableCell><TableCell>{r.name || '-'}</TableCell><TableCell>{r.program || '-'}</TableCell><TableCell className="text-right">{fmt(r.area)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Walls */}
        {activeTab === 'walls' && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>ID</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Length ({data.units.linear})</TableHead><TableHead className="text-right">Height</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.walls.map((w) => (
                <TableRow key={w.id}><TableCell>{w.id}</TableCell><TableCell>{w.partitionType || '-'}</TableCell><TableCell className="text-right">{fmt(w.length)}</TableCell><TableCell className="text-right">{w.height ? fmt(w.height) : '-'}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pipes */}
        {activeTab === 'pipes' && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>ID</TableHead><TableHead>Service</TableHead><TableHead>Diameter</TableHead><TableHead className="text-right">Length ({data.units.linear})</TableHead><TableHead>Material</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.pipes.map((p) => (
                <TableRow key={p.id}><TableCell>{p.id}</TableCell><TableCell>{p.service}</TableCell><TableCell>{p.diameterIn}"</TableCell><TableCell className="text-right">{fmt(p.length)}</TableCell><TableCell>{p.material || '-'}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Ducts */}
        {activeTab === 'ducts' && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>ID</TableHead><TableHead>Size</TableHead><TableHead className="text-right">Length ({data.units.linear})</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.ducts.map((d) => (
                <TableRow key={d.id}><TableCell>{d.id}</TableCell><TableCell>{d.size}</TableCell><TableCell className="text-right">{fmt(d.length)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Fixtures */}
        {activeTab === 'fixtures' && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>ID</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Count</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.fixtures.map((f) => (
                <TableRow key={f.id}><TableCell>{f.id}</TableCell><TableCell>{f.fixtureType}</TableCell><TableCell className="text-right">{f.count}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Materials */}
        {activeTab === 'materials' && <TakeoffMaterialsList jobId={data.meta?.jobId} />}
      </CardContent>
    </Card>
  );
}
