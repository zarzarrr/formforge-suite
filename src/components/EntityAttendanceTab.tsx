import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { AttendanceCalendarView } from '@/components/AttendanceCalendarView';
import { DatePickerField } from '@/components/DatePickerField';
import { ViewToggle } from '@/components/ViewToggle';
import { toast } from 'sonner';
import { studentAttendanceApi, teacherAttendanceApi, managerAttendanceApi, getSessionOptions } from '@/services/attendance-api';

const today = () => new Date().toISOString().split('T')[0];

interface EntityAttendanceTabProps {
  entityType: 'student' | 'teacher' | 'manager';
  entityId: string;
  entityName: string;
  recordType: 'absences' | 'lates';
}

export function EntityAttendanceTab({ entityType, entityId, entityName, recordType }: EntityAttendanceTabProps) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Date filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [formDate, setFormDate] = useState(today());
  const [formJustified, setFormJustified] = useState(false);
  const [formReason, setFormReason] = useState('');
  const [formPeriod, setFormPeriod] = useState(10);
  const [formSession, setFormSession] = useState(getSessionOptions()[0] || '');

  const filter = { entityId };

  const api: any = entityType === 'student' ? studentAttendanceApi : entityType === 'teacher' ? teacherAttendanceApi : managerAttendanceApi;

  const absQuery = useQuery<any>({
    queryKey: [`${entityType}-absences`, filter],
    queryFn: () => api.getAbsences(filter),
    enabled: recordType === 'absences',
  });
  const lateQuery = useQuery<any>({
    queryKey: [`${entityType}-lates`, filter],
    queryFn: () => api.getLates(filter),
    enabled: recordType === 'lates',
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [`${entityType}-absences`] });
    qc.invalidateQueries({ queryKey: [`${entityType}-lates`] });
    qc.invalidateQueries({ queryKey: [`${entityType}-attendance-stats`] });
  };

  const isAbsences = recordType === 'absences';
  const rawItems: any[] = isAbsences ? (absQuery.data?.data || []) : (lateQuery.data?.data || []);
  const isLoading = isAbsences ? absQuery.isLoading : lateQuery.isLoading;

  // Apply date filters
  const items = useMemo(() => {
    let filtered = rawItems;
    if (dateFrom) filtered = filtered.filter(i => i.date >= dateFrom);
    if (dateTo) filtered = filtered.filter(i => i.date <= dateTo);
    return filtered;
  }, [rawItems, dateFrom, dateTo]);

  const createMut = useMutation({
    mutationFn: (data: any) => {
      if (isAbsences) return (api as any).createAbsence(data);
      return (api as any).createLate(data);
    },
    onSuccess: (res: any) => {
      if (!res.success) { toast.error(res.message); return; }
      invalidate();
      setDialogOpen(false);
      toast.success(`${isAbsences ? 'Absence' : 'Late'} added`);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: any) => {
      if (isAbsences) return (api as any).updateAbsence(id, data);
      return (api as any).updateLate(id, data);
    },
    onSuccess: () => { invalidate(); setEditingId(null); setDialogOpen(false); toast.success('Updated'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => {
      if (isAbsences) return (api as any).deleteAbsence(id);
      return (api as any).deleteLate(id);
    },
    onSuccess: () => { invalidate(); toast.success('Deleted'); },
  });

  const resetForm = (item?: any) => {
    setFormDate(item?.date || today());
    setFormJustified(item?.isJustified || false);
    setFormReason(item?.reason || '');
    setFormPeriod(item?.period || 10);
    setFormSession(item?.session || getSessionOptions()[0] || '');
  };

  const handleSubmit = () => {
    const idField = entityType === 'student' ? 'studentId' : entityType === 'teacher' ? 'teacherId' : 'managerId';
    const base: any = {
      [idField]: entityId,
      date: formDate,
      isJustified: formJustified,
      reason: formJustified ? formReason : undefined,
    };
    if (entityType === 'teacher') base.session = formSession;
    if (!isAbsences) base.period = formPeriod;

    if (editingId) {
      updateMut.mutate({ id: editingId, ...base });
    } else {
      createMut.mutate(base);
    }
  };

  const sessionOptions = getSessionOptions();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{items.length} {recordType} for {entityName}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode !== 'calendar' && (
            <>
              <div className="flex flex-col">
                <Label className="text-xs">From</Label>
                <DatePickerField value={dateFrom} onChange={setDateFrom} placeholder="From date" className="w-32 h-8" />
              </div>
              <div className="flex flex-col">
                <Label className="text-xs">To</Label>
                <DatePickerField value={dateTo} onChange={setDateTo} placeholder="To date" className="w-32 h-8" />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }} className="self-end">Clear</Button>
              )}
            </>
          )}
          <div className="self-end"><ViewToggle view={viewMode} onViewChange={setViewMode} /></div>
          <Button size="sm" className="self-end" onClick={() => { resetForm(); setEditingId(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Add {isAbsences ? 'Absence' : 'Late'}
          </Button>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : viewMode === 'calendar' ? (
        <AttendanceCalendarView
          isShowMixed={false}
          items={items}
          type={recordType}
          showEntity={false}
          onEdit={(item) => { resetForm(item); setEditingId(item.id); setDialogOpen(true); }}
          onDelete={(item) => setDeleteTarget(item.id)}
        />
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {entityType === 'teacher' && <TableHead>Session</TableHead>}
                <TableHead>Date</TableHead>
                {!isAbsences && <TableHead>Period</TableHead>}
                <TableHead>Justified</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={entityType === 'teacher' ? 6 : 5} className="text-center text-muted-foreground py-8">No {recordType} found</TableCell></TableRow>
              ) : items.map((item: any) => (
                <TableRow key={item.id}>
                  {entityType === 'teacher' && <TableCell>{item.session}</TableCell>}
                  <TableCell>{item.date}</TableCell>
                  {!isAbsences && <TableCell>{item.period} min</TableCell>}
                  <TableCell><Badge variant={item.isJustified ? 'default' : 'destructive'}>{item.isJustified ? 'Yes' : 'No'}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.reason || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { resetForm(item); setEditingId(item.id); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); setEditingId(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Edit' : 'Add'} {isAbsences ? 'Absence' : 'Late'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {entityType === 'teacher' && (
              <div className="space-y-2">
                <Label>Session</Label>
                <Select value={formSession} onValueChange={setFormSession}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{sessionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Date</Label><DatePickerField value={formDate} onChange={setFormDate} /></div>
            {!isAbsences && <div className="space-y-2"><Label>Period (minutes)</Label><Input type="number" min={1} value={formPeriod} onChange={e => setFormPeriod(parseInt(e.target.value) || 0)} /></div>}
            <div className="flex items-center gap-2"><Switch checked={formJustified} onCheckedChange={v => { setFormJustified(v); if (!v) setFormReason(''); }} /><Label>Justified</Label></div>
            {formJustified && <div className="space-y-2"><Label>Reason</Label><Textarea value={formReason} onChange={e => setFormReason(e.target.value)} placeholder="Enter reason..." /></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingId(null); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>{editingId ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {isAbsences ? 'absence' : 'late'}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteTarget) { deleteMut.mutate(deleteTarget); setDeleteTarget(null); } }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
