import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Pencil, Download, Upload, UserX, Clock, BarChart3, ListPlus, ScanLine } from 'lucide-react';
import { AttendanceCalendarView } from '@/components/AttendanceCalendarView';
import { ViewToggle } from '@/components/ViewToggle';
import { toast } from 'sonner';
import { teacherAttendanceApi, getSessionOptions } from '@/services/attendance-api';
import { teacherApi, classApi, levelApi, subjectApi } from '@/services/api';
import { ExcelImportDialog } from '@/components/ExcelImportDialog';
import { exportToExcel } from '@/lib/excel-utils';
import { AttendanceQRScanner } from '@/components/AttendanceQRScanner';
import { DatePickerField } from '@/components/DatePickerField';
import type { TeacherAbsence, TeacherLate, AttendanceFilter } from '@/types/attendance';

const today = () => new Date().toISOString().split('T')[0];

export default function TeacherAttendance() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'absences' | 'lates' | 'stats'>('absences');
  const [filter, setFilter] = useState<AttendanceFilter>({});
  const [absDialog, setAbsDialog] = useState(false);
  const [lateDialog, setLateDialog] = useState(false);
  const [bulkAbsDialog, setBulkAbsDialog] = useState(false);
  const [bulkLateDialog, setBulkLateDialog] = useState(false);
  const [importAbsOpen, setImportAbsOpen] = useState(false);
  const [importLateOpen, setImportLateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'absence' | 'late' } | null>(null);
  const [editingAbsence, setEditingAbsence] = useState<TeacherAbsence | null>(null);
  const [editingLate, setEditingLate] = useState<TeacherLate | null>(null);
  const [absView, setAbsView] = useState<'table' | 'calendar'>('table');
  const [lateView, setLateView] = useState<'table' | 'calendar'>('table');

  const sessionOptions = getSessionOptions();
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formSession, setFormSession] = useState(sessionOptions[0]);
  const [formDate, setFormDate] = useState(today());
  const [formJustified, setFormJustified] = useState(false);
  const [formReason, setFormReason] = useState('');
  const [formPeriod, setFormPeriod] = useState(10);

  const [bulkRows, setBulkRows] = useState<{ teacherId: string; session: string; date: string; isJustified: boolean; reason?: string; period?: number }[]>([{ teacherId: '', session: sessionOptions[0], date: today(), isJustified: false, period: 10 }]);

  const { data: teachersRes } = useQuery({ queryKey: ['teachers-all'], queryFn: () => teacherApi.getAll({ page: 1, limit: 1000 }) });
  const { data: classesRes } = useQuery({ queryKey: ['classes-all'], queryFn: () => classApi.getAll({ page: 1, limit: 1000 }) });
  const { data: levelsRes } = useQuery({ queryKey: ['levels-all'], queryFn: () => levelApi.getAll({ page: 1, limit: 1000 }) });
  const { data: subjectsRes } = useQuery({ queryKey: ['subjects-all'], queryFn: () => subjectApi.getAll({ page: 1, limit: 1000 }) });
  const teachers = teachersRes?.data || [];
  const classes = classesRes?.data || [];
  const levels = levelsRes?.data || [];
  const subjects = subjectsRes?.data || [];

  const { data: absencesRes, isLoading: absLoading } = useQuery({ queryKey: ['teacher-absences', filter], queryFn: () => teacherAttendanceApi.getAbsences(filter) });
  const { data: latesRes, isLoading: lateLoading } = useQuery({ queryKey: ['teacher-lates', filter], queryFn: () => teacherAttendanceApi.getLates(filter) });
  const { data: statsRes } = useQuery({ queryKey: ['teacher-attendance-stats', filter], queryFn: () => teacherAttendanceApi.getStats(filter) });

  const absences = absencesRes?.data || [];
  const lates = latesRes?.data || [];
  const stats = statsRes?.data;

  const filteredAbsences = useMemo(() => {
    let items = absences;
    if (filter.entityId) items = items.filter(i => i.teacherId === filter.entityId);
    if (filter.classId) { const tIds = teachers.filter(t => t.classAssignments.some(ca => ca.classId === filter.classId)).map(t => t.id); items = items.filter(i => tIds.includes(i.teacherId)); }
    if (filter.levelId) { const cIds = classes.filter(c => c.levelId === filter.levelId).map(c => c.id); const tIds = teachers.filter(t => t.classAssignments.some(ca => cIds.includes(ca.classId))).map(t => t.id); items = items.filter(i => tIds.includes(i.teacherId)); }
    if ((filter as any).subjectId) { const tIds = teachers.filter(t => t.subjectIds.includes((filter as any).subjectId)).map(t => t.id); items = items.filter(i => tIds.includes(i.teacherId)); }
    return items;
  }, [absences, filter, teachers, classes]);

  const filteredLates = useMemo(() => {
    let items = lates;
    if (filter.entityId) items = items.filter(i => i.teacherId === filter.entityId);
    if (filter.classId) { const tIds = teachers.filter(t => t.classAssignments.some(ca => ca.classId === filter.classId)).map(t => t.id); items = items.filter(i => tIds.includes(i.teacherId)); }
    if (filter.levelId) { const cIds = classes.filter(c => c.levelId === filter.levelId).map(c => c.id); const tIds = teachers.filter(t => t.classAssignments.some(ca => cIds.includes(ca.classId))).map(t => t.id); items = items.filter(i => tIds.includes(i.teacherId)); }
    if ((filter as any).subjectId) { const tIds = teachers.filter(t => t.subjectIds.includes((filter as any).subjectId)).map(t => t.id); items = items.filter(i => tIds.includes(i.teacherId)); }
    return items;
  }, [lates, filter, teachers, classes]);

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['teacher-absences'] }); qc.invalidateQueries({ queryKey: ['teacher-lates'] }); qc.invalidateQueries({ queryKey: ['teacher-attendance-stats'] }); };

  const createAbsMut = useMutation({
    mutationFn: (d: Omit<TeacherAbsence, 'id' | 'createdAt'>) => teacherAttendanceApi.createAbsence(d),
    onSuccess: (res) => { if (!res.success) { toast.error(res.message); return; } invalidate(); setAbsDialog(false); toast.success('Absence added'); },
  });
  const updateAbsMut = useMutation({ mutationFn: ({ id, ...d }: { id: string } & Partial<TeacherAbsence>) => teacherAttendanceApi.updateAbsence(id, d), onSuccess: () => { invalidate(); setEditingAbsence(null); toast.success('Updated'); } });
  const deleteAbsMut = useMutation({ mutationFn: (id: string) => teacherAttendanceApi.deleteAbsence(id), onSuccess: () => { invalidate(); toast.success('Deleted'); } });
  const bulkAbsMut = useMutation({
    mutationFn: (d: Omit<TeacherAbsence, 'id' | 'createdAt'>[]) => teacherAttendanceApi.createAbsenceBulk(d),
    onSuccess: (res) => { invalidate(); setBulkAbsDialog(false); toast.success(res.message); },
  });

  const createLateMut = useMutation({
    mutationFn: (d: Omit<TeacherLate, 'id' | 'createdAt'>) => teacherAttendanceApi.createLate(d),
    onSuccess: (res) => { if (!res.success) { toast.error(res.message); return; } invalidate(); setLateDialog(false); toast.success('Late added'); },
  });
  const updateLateMut = useMutation({ mutationFn: ({ id, ...d }: { id: string } & Partial<TeacherLate>) => teacherAttendanceApi.updateLate(id, d), onSuccess: () => { invalidate(); setEditingLate(null); toast.success('Updated'); } });
  const deleteLateMut = useMutation({ mutationFn: (id: string) => teacherAttendanceApi.deleteLate(id), onSuccess: () => { invalidate(); toast.success('Deleted'); } });
  const bulkLateMut = useMutation({
    mutationFn: (d: Omit<TeacherLate, 'id' | 'createdAt'>[]) => teacherAttendanceApi.createLateBulk(d),
    onSuccess: (res) => { invalidate(); setBulkLateDialog(false); toast.success(res.message); },
  });

  const getTeacherName = (id: string) => { const t = teachers.find(x => x.id === id); return t ? `${t.firstname} ${t.lastname}` : id; };

  const resetAbsForm = (a?: TeacherAbsence) => { setFormTeacherId(a?.teacherId || ''); setFormSession(a?.session || sessionOptions[0]); setFormDate(a?.date || today()); setFormJustified(a?.isJustified || false); setFormReason(a?.reason || ''); };
  const resetLateForm = (l?: TeacherLate) => { setFormTeacherId(l?.teacherId || ''); setFormSession(l?.session || sessionOptions[0]); setFormDate(l?.date || today()); setFormJustified(l?.isJustified || false); setFormReason(l?.reason || ''); setFormPeriod(l?.period || 10); };

  const handleAbsSubmit = () => {
    if (!formTeacherId) { toast.error('Select a teacher'); return; }
    const data = { teacherId: formTeacherId, session: formSession, date: formDate, isJustified: formJustified, reason: formJustified ? formReason : undefined };
    if (editingAbsence) updateAbsMut.mutate({ id: editingAbsence.id, ...data });
    else createAbsMut.mutate(data);
  };

  const handleLateSubmit = () => {
    if (!formTeacherId) { toast.error('Select a teacher'); return; }
    const data = { teacherId: formTeacherId, session: formSession, date: formDate, isJustified: formJustified, reason: formJustified ? formReason : undefined, period: formPeriod };
    if (editingLate) updateLateMut.mutate({ id: editingLate.id, ...data });
    else createLateMut.mutate(data);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'absence') deleteAbsMut.mutate(deleteTarget.id);
    else deleteLateMut.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleScanSingleAbs = (ids: string[]) => { if (ids[0]) { resetAbsForm(); setFormTeacherId(ids[0]); setAbsDialog(true); } };
  const handleScanSingleLate = (ids: string[]) => { if (ids[0]) { resetLateForm(); setFormTeacherId(ids[0]); setLateDialog(true); } };
  const handleScanBulkAbs = (ids: string[]) => { setBulkRows(ids.map(id => ({ teacherId: id, session: sessionOptions[0], date: today(), isJustified: false }))); setBulkAbsDialog(true); };
  const handleScanBulkLate = (ids: string[]) => { setBulkRows(ids.map(id => ({ teacherId: id, session: sessionOptions[0], date: today(), isJustified: false, period: 10 }))); setBulkLateDialog(true); };

  const handleImportAbsences = (rows: Record<string, string>[]) => {
    const records = rows.map(r => ({ teacherId: r['Teacher ID'] || r['teacherId'] || '', session: r['Session'] || r['session'] || sessionOptions[0], date: r['Date'] || r['date'] || today(), isJustified: r['Justified']?.toLowerCase() === 'yes' || r['isJustified']?.toLowerCase() === 'true', reason: r['Reason'] || r['reason'] || undefined })).filter(r => r.teacherId);
    if (!records.length) { toast.error('No valid records'); return; }
    bulkAbsMut.mutate(records);
  };

  const handleImportLates = (rows: Record<string, string>[]) => {
    const records = rows.map(r => ({ teacherId: r['Teacher ID'] || r['teacherId'] || '', session: r['Session'] || r['session'] || sessionOptions[0], date: r['Date'] || r['date'] || today(), isJustified: r['Justified']?.toLowerCase() === 'yes' || r['isJustified']?.toLowerCase() === 'true', reason: r['Reason'] || r['reason'] || undefined, period: parseInt(r['Period'] || r['period'] || '10') || 10 })).filter(r => r.teacherId);
    if (!records.length) { toast.error('No valid records'); return; }
    bulkLateMut.mutate(records);
  };

  const addBulkRow = () => setBulkRows(prev => [...prev, { teacherId: '', session: sessionOptions[0], date: today(), isJustified: false, period: 10 }]);
  const removeBulkRow = (idx: number) => setBulkRows(prev => prev.filter((_, i) => i !== idx));
  const updateBulkRow = (idx: number, field: string, value: any) => setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const activeView = tab === 'absences' ? absView : lateView;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground">Teacher Attendance</h1><p className="text-sm text-muted-foreground">Track absences and lates by session</p></div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            {activeView !== 'calendar' && (
              <>
                <div className="space-y-1 flex flex-col"><Label className="text-xs">Date From</Label><DatePickerField value={filter.dateFrom || ''} onChange={v => setFilter(f => ({ ...f, dateFrom: v || undefined }))} placeholder="From date" className="w-40" /></div>
                <div className="space-y-1 flex flex-col"><Label className="text-xs">Date To</Label><DatePickerField value={filter.dateTo || ''} onChange={v => setFilter(f => ({ ...f, dateTo: v || undefined }))} placeholder="To date" className="w-40" /></div>
              </>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Teacher</Label>
              <Select value={filter.entityId || 'all'} onValueChange={v => setFilter(f => ({ ...f, entityId: v === 'all' ? undefined : v }))}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Teachers</SelectItem>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.firstname} {t.lastname}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Class</Label>
              <Select value={filter.classId || 'all'} onValueChange={v => setFilter(f => ({ ...f, classId: v === 'all' ? undefined : v }))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Classes</SelectItem>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Level</Label>
              <Select value={filter.levelId || 'all'} onValueChange={v => setFilter(f => ({ ...f, levelId: v === 'all' ? undefined : v }))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Levels</SelectItem>{levels.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Select value={(filter as any).subjectId || 'all'} onValueChange={v => setFilter(f => ({ ...f, subjectId: v === 'all' ? undefined : v } as any))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Subjects</SelectItem>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => setFilter({})}>Clear</Button>
            <div className="ml-auto">
              {tab === 'absences' && <ViewToggle view={absView} onViewChange={setAbsView} />}
              {tab === 'lates' && <ViewToggle view={lateView} onViewChange={setLateView} />}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="absences" className="gap-2"><UserX className="h-4 w-4" />Absences ({filteredAbsences.length})</TabsTrigger>
          <TabsTrigger value="lates" className="gap-2"><Clock className="h-4 w-4" />Lates ({filteredLates.length})</TabsTrigger>
          <TabsTrigger value="stats" className="gap-2"><BarChart3 className="h-4 w-4" />Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="absences" className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <Button size="sm" onClick={() => { resetAbsForm(); setAbsDialog(true); }}><Plus className="mr-2 h-4 w-4" />Add Absence</Button>
            <Button size="sm" variant="outline" onClick={() => { setBulkRows([{ teacherId: '', session: sessionOptions[0], date: today(), isJustified: false }]); setBulkAbsDialog(true); }}><ListPlus className="mr-2 h-4 w-4" />Bulk Add</Button>
            <Button size="sm" variant="outline" onClick={() => setImportAbsOpen(true)}><Upload className="mr-2 h-4 w-4" />Import</Button>
            <Button size="sm" variant="outline" onClick={() => exportToExcel(filteredAbsences.map(a => ({ ...a, teacherName: getTeacherName(a.teacherId), justified: a.isJustified ? 'Yes' : 'No', reason: a.reason || '' })), [{ key: 'teacherName', label: 'Teacher' }, { key: 'session', label: 'Session' }, { key: 'date', label: 'Date' }, { key: 'justified', label: 'Justified' }, { key: 'reason', label: 'Reason' }], 'teacher-absences')}><Download className="mr-2 h-4 w-4" />Export</Button>
          </div>
          {absLoading ? <Skeleton className="h-48 w-full" /> : absView === 'calendar' ? (
            <AttendanceCalendarView
              items={filteredAbsences}
              type="absences"
              getEntityName={(item) => getTeacherName(item.teacherId)}
              onEdit={(item) => { resetAbsForm(item as any); setEditingAbsence(item as any); }}
              onDelete={(item) => setDeleteTarget({ id: item.id, type: 'absence' })}
            />
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Session</TableHead><TableHead>Date</TableHead><TableHead>Justified</TableHead><TableHead>Reason</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredAbsences.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No absences found</TableCell></TableRow> :
                    filteredAbsences.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>{getTeacherName(a.teacherId)}</TableCell>
                        <TableCell>{a.session}</TableCell>
                        <TableCell>{a.date}</TableCell>
                        <TableCell><Badge variant={a.isJustified ? 'default' : 'destructive'}>{a.isJustified ? 'Yes' : 'No'}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{a.reason || '—'}</TableCell>
                        <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { resetAbsForm(a); setEditingAbsence(a); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ id: a.id, type: 'absence' })}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lates" className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <Button size="sm" onClick={() => { resetLateForm(); setLateDialog(true); }}><Plus className="mr-2 h-4 w-4" />Add Late</Button>
            <AttendanceQRScanner entityType="teachers" mode="single" onScanned={handleScanSingleLate} trigger={<Button size="sm" variant="outline"><ScanLine className="mr-2 h-4 w-4" />Scan Add</Button>} />
            <Button size="sm" variant="outline" onClick={() => { setBulkRows([{ teacherId: '', session: sessionOptions[0], date: today(), isJustified: false, period: 10 }]); setBulkLateDialog(true); }}><ListPlus className="mr-2 h-4 w-4" />Bulk Add</Button>
            <AttendanceQRScanner entityType="teachers" mode="bulk" onScanned={handleScanBulkLate} trigger={<Button size="sm" variant="outline"><ScanLine className="mr-2 h-4 w-4" />Bulk Scan</Button>} />
            <Button size="sm" variant="outline" onClick={() => setImportLateOpen(true)}><Upload className="mr-2 h-4 w-4" />Import</Button>
            <Button size="sm" variant="outline" onClick={() => exportToExcel(filteredLates.map(l => ({ ...l, teacherName: getTeacherName(l.teacherId), justified: l.isJustified ? 'Yes' : 'No', periodStr: `${l.period} min`, reason: l.reason || '' })), [{ key: 'teacherName', label: 'Teacher' }, { key: 'session', label: 'Session' }, { key: 'date', label: 'Date' }, { key: 'periodStr', label: 'Period' }, { key: 'justified', label: 'Justified' }, { key: 'reason', label: 'Reason' }], 'teacher-lates')}><Download className="mr-2 h-4 w-4" />Export</Button>
          </div>
          {lateLoading ? <Skeleton className="h-48 w-full" /> : lateView === 'calendar' ? (
            <AttendanceCalendarView
              items={filteredLates}
              type="lates"
              getEntityName={(item) => getTeacherName(item.teacherId)}
              onEdit={(item) => { resetLateForm(item as any); setEditingLate(item as any); }}
              onDelete={(item) => setDeleteTarget({ id: item.id, type: 'late' })}
            />
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Session</TableHead><TableHead>Date</TableHead><TableHead>Period</TableHead><TableHead>Justified</TableHead><TableHead>Reason</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredLates.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No lates found</TableCell></TableRow> :
                    filteredLates.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>{getTeacherName(l.teacherId)}</TableCell>
                        <TableCell>{l.session}</TableCell>
                        <TableCell>{l.date}</TableCell>
                        <TableCell>{l.period} min</TableCell>
                        <TableCell><Badge variant={l.isJustified ? 'default' : 'destructive'}>{l.isJustified ? 'Yes' : 'No'}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{l.reason || '—'}</TableCell>
                        <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { resetLateForm(l); setEditingLate(l); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ id: l.id, type: 'late' })}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats">
          {stats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Absences</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalAbsences}</p><p className="text-xs text-muted-foreground">{stats.justifiedAbsences} justified · {stats.unjustifiedAbsences} unjustified</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Lates</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalLates}</p><p className="text-xs text-muted-foreground">{stats.justifiedLates} justified · {stats.unjustifiedLates} unjustified</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Late Period</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.averageLatePeriod} min</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Justification Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalAbsences + stats.totalLates > 0 ? Math.round(((stats.justifiedAbsences + stats.justifiedLates) / (stats.totalAbsences + stats.totalLates)) * 100) : 0}%</p></CardContent></Card>
            </div>
          ) : <Skeleton className="h-32 w-full" />}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Absence Dialog */}
      <Dialog open={absDialog || !!editingAbsence} onOpenChange={o => { if (!o) { setAbsDialog(false); setEditingAbsence(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingAbsence ? 'Edit Absence' : 'Add Absence'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Teacher</Label><Select value={formTeacherId} onValueChange={setFormTeacherId}><SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.firstname} {t.lastname}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Session</Label><Select value={formSession} onValueChange={setFormSession}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sessionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Date</Label><DatePickerField value={formDate} onChange={setFormDate} /></div>
            <div className="flex items-center gap-2"><Switch checked={formJustified} onCheckedChange={v => { setFormJustified(v); if (!v) setFormReason(''); }} /><Label>Justified</Label></div>
            {formJustified && <div className="space-y-2"><Label>Reason</Label><Textarea value={formReason} onChange={e => setFormReason(e.target.value)} placeholder="Enter justification reason..." /></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setAbsDialog(false); setEditingAbsence(null); }}>Cancel</Button><Button onClick={handleAbsSubmit}>{editingAbsence ? 'Update' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Late Dialog */}
      <Dialog open={lateDialog || !!editingLate} onOpenChange={o => { if (!o) { setLateDialog(false); setEditingLate(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingLate ? 'Edit Late' : 'Add Late'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Teacher</Label><Select value={formTeacherId} onValueChange={setFormTeacherId}><SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.firstname} {t.lastname}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Session</Label><Select value={formSession} onValueChange={setFormSession}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sessionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Date</Label><DatePickerField value={formDate} onChange={setFormDate} /></div>
            <div className="space-y-2"><Label>Period of Late (minutes)</Label><Input type="number" min={1} value={formPeriod} onChange={e => setFormPeriod(parseInt(e.target.value) || 0)} /></div>
            <div className="flex items-center gap-2"><Switch checked={formJustified} onCheckedChange={v => { setFormJustified(v); if (!v) setFormReason(''); }} /><Label>Justified</Label></div>
            {formJustified && <div className="space-y-2"><Label>Reason</Label><Textarea value={formReason} onChange={e => setFormReason(e.target.value)} placeholder="Enter justification reason..." /></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setLateDialog(false); setEditingLate(null); }}>Cancel</Button><Button onClick={handleLateSubmit}>{editingLate ? 'Update' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Absence Dialog */}
      <Dialog open={bulkAbsDialog} onOpenChange={setBulkAbsDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bulk Add Absences</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {bulkRows.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-end flex-wrap border-b border-border pb-2">
                <div className="flex-1 min-w-[140px] space-y-1"><Label className="text-xs">Teacher</Label><Select value={row.teacherId} onValueChange={v => updateBulkRow(idx, 'teacherId', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.firstname} {t.lastname}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-xs">Session</Label><Select value={row.session} onValueChange={v => updateBulkRow(idx, 'session', v)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{sessionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-xs">Date</Label><DatePickerField value={row.date} onChange={v => updateBulkRow(idx, 'date', v)} className="w-36" /></div>
                <div className="flex items-center gap-1 pb-1"><Switch checked={row.isJustified} onCheckedChange={v => { updateBulkRow(idx, 'isJustified', v); if (!v) updateBulkRow(idx, 'reason', ''); }} /><Label className="text-xs">J</Label></div>
                {row.isJustified && <div className="w-full space-y-1"><Label className="text-xs">Reason</Label><Input value={row.reason || ''} onChange={e => updateBulkRow(idx, 'reason', e.target.value)} placeholder="Reason..." /></div>}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeBulkRow(idx)} disabled={bulkRows.length === 1}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addBulkRow}><Plus className="mr-2 h-4 w-4" />Add Row</Button>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBulkAbsDialog(false)}>Cancel</Button><Button onClick={() => { const valid = bulkRows.filter(r => r.teacherId); if (!valid.length) { toast.error('Add at least one valid row'); return; } bulkAbsMut.mutate(valid.map(r => ({ teacherId: r.teacherId, session: r.session, date: r.date, isJustified: r.isJustified, reason: r.isJustified ? r.reason : undefined }))); }}>Add {bulkRows.filter(r => r.teacherId).length} Absences</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Late Dialog */}
      <Dialog open={bulkLateDialog} onOpenChange={setBulkLateDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bulk Add Lates</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {bulkRows.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-end flex-wrap border-b border-border pb-2">
                <div className="flex-1 min-w-[140px] space-y-1"><Label className="text-xs">Teacher</Label><Select value={row.teacherId} onValueChange={v => updateBulkRow(idx, 'teacherId', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.firstname} {t.lastname}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-xs">Session</Label><Select value={row.session} onValueChange={v => updateBulkRow(idx, 'session', v)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{sessionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-xs">Date</Label><DatePickerField value={row.date} onChange={v => updateBulkRow(idx, 'date', v)} className="w-36" /></div>
                <div className="space-y-1"><Label className="text-xs">Min</Label><Input type="number" min={1} value={row.period ?? 10} onChange={e => updateBulkRow(idx, 'period', parseInt(e.target.value) || 0)} className="w-20" /></div>
                <div className="flex items-center gap-1 pb-1"><Switch checked={row.isJustified} onCheckedChange={v => { updateBulkRow(idx, 'isJustified', v); if (!v) updateBulkRow(idx, 'reason', ''); }} /><Label className="text-xs">J</Label></div>
                {row.isJustified && <div className="w-full space-y-1"><Label className="text-xs">Reason</Label><Input value={row.reason || ''} onChange={e => updateBulkRow(idx, 'reason', e.target.value)} placeholder="Reason..." /></div>}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeBulkRow(idx)} disabled={bulkRows.length === 1}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addBulkRow}><Plus className="mr-2 h-4 w-4" />Add Row</Button>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBulkLateDialog(false)}>Cancel</Button><Button onClick={() => { const valid = bulkRows.filter(r => r.teacherId); if (!valid.length) { toast.error('Add at least one valid row'); return; } bulkLateMut.mutate(valid.map(r => ({ teacherId: r.teacherId, session: r.session, date: r.date, isJustified: r.isJustified, reason: r.isJustified ? r.reason : undefined, period: r.period ?? 10 }))); }}>Add {bulkRows.filter(r => r.teacherId).length} Lates</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <ExcelImportDialog open={importAbsOpen} onOpenChange={setImportAbsOpen} onImport={handleImportAbsences} expectedColumns={['Teacher ID', 'Session', 'Date', 'Justified', 'Reason']} />
      <ExcelImportDialog open={importLateOpen} onOpenChange={setImportLateOpen} onImport={handleImportLates} expectedColumns={['Teacher ID', 'Session', 'Date', 'Period', 'Justified', 'Reason']} />
    </div>
  );
}
