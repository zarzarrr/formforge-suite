import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi, parentApi, levelApi, classApi, templateApi } from '@/services/api';
import { DynamicView } from '@/components/DynamicView';
import { DynamicFormFields } from '@/components/DynamicFormFields';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { EntityAttendanceTab } from '@/components/EntityAttendanceTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, UserX, Clock, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({ queryKey: ['students', id], queryFn: () => studentApi.getById(id!) });
  const { data: tplRes } = useQuery({ queryKey: ['templates'], queryFn: () => templateApi.get() });
  const { data: parentsRes } = useQuery({ queryKey: ['parents'], queryFn: () => parentApi.getAll({ page: 1, limit: 1000 }) });
  const { data: levelsRes } = useQuery({ queryKey: ['levels'], queryFn: () => levelApi.getAll({ page: 1, limit: 1000 }) });
  const { data: classesRes } = useQuery({ queryKey: ['classes'], queryFn: () => classApi.getAll({ page: 1, limit: 1000 }) });

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const student = res?.data;
  const fields = tplRes?.data?.student?.fields || [];

  const updateMut = useMutation({
    mutationFn: (data: any) => studentApi.update(id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students', id] }); setEditOpen(false); toast.success('Student updated'); },
  });
  const deleteMut = useMutation({
    mutationFn: () => studentApi.delete(id!),
    onSuccess: () => { toast.success('Student deleted'); navigate('/students'); },
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!student) return <div className="text-center py-12 text-muted-foreground">Student not found</div>;

  const level = levelsRes?.data?.find(l => l.id === student.levelId);
  const cls = classesRes?.data?.find(c => c.id === student.classId);
  const studentParents = parentsRes?.data?.filter(p => student.parentIds.includes(p.id)) || [];
  const fullName = `${student.firstname} ${student.lastname}`;

  const openEdit = () => {
    setEditForm({ firstname: student.firstname, lastname: student.lastname, levelId: student.levelId, classId: student.classId || '', dynamicFields: { ...(student.dynamicFields || {}) } });
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/students')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{fullName}</h1>
          <p className="text-muted-foreground">ID: {student.id}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={openEdit}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
          <QRCodeDisplay entityType="students" entityId={student.id} entityName={fullName} />
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="absences" className="gap-2"><UserX className="h-4 w-4" />Absences</TabsTrigger>
          <TabsTrigger value="lates" className="gap-2"><Clock className="h-4 w-4" />Lates</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground">First Name</p><p className="font-medium">{student.firstname}</p></div>
                  <div><p className="text-sm text-muted-foreground">Last Name</p><p className="font-medium">{student.lastname}</p></div>
                  <div><p className="text-sm text-muted-foreground">Level</p><p className="font-medium">{level?.name || '—'}</p></div>
                  <div><p className="text-sm text-muted-foreground">Class</p><p className="font-medium">{cls?.name || '—'}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Parents</CardTitle></CardHeader>
              <CardContent>
                {studentParents.length === 0 ? <p className="text-muted-foreground">No parents assigned</p> : (
                  <div className="space-y-2">
                    {studentParents.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="font-medium cursor-pointer hover:text-primary" onClick={() => navigate(`/parents/${p.id}`)}>{p.firstname} {p.lastname}</span>
                        {student.parentRelations?.[p.id] && <Badge variant="outline">{student.parentRelations[p.id]}</Badge>}
                        {p.id === student.defaultParentId && <Badge variant="secondary">Default</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-lg">Additional Details</CardTitle></CardHeader>
              <CardContent><DynamicView fields={fields} data={student.dynamicFields || {}} /></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="absences">
          <EntityAttendanceTab entityType="student" entityId={student.id} entityName={fullName} recordType="absences" />
        </TabsContent>
        <TabsContent value="lates">
          <EntityAttendanceTab entityType="student" entityId={student.id} entityName={fullName} recordType="lates" />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>First Name</Label><Input value={editForm.firstname || ''} onChange={e => setEditForm((f: any) => ({ ...f, firstname: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input value={editForm.lastname || ''} onChange={e => setEditForm((f: any) => ({ ...f, lastname: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={editForm.levelId || ''} onValueChange={v => setEditForm((f: any) => ({ ...f, levelId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>{levelsRes?.data?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={editForm.classId || ''} onValueChange={v => setEditForm((f: any) => ({ ...f, classId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classesRes?.data?.filter(c => !editForm.levelId || c.levelId === editForm.levelId).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {fields.length > 0 && (
              <DynamicFormFields fields={fields} values={editForm.dynamicFields || {}} onChange={(vals) => setEditForm((f: any) => ({ ...f, dynamicFields: vals }))} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate(editForm)} disabled={updateMut.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete student?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {fullName}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate()}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
