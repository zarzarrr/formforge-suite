import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { managerApi, classApi, templateApi } from '@/services/api';
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
import { ArrowLeft, UserX, Clock, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function ManagerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({ queryKey: ['managers', id], queryFn: () => managerApi.getById(id!) });
  const { data: tplRes } = useQuery({ queryKey: ['templates'], queryFn: () => templateApi.get() });
  const { data: classesRes } = useQuery({ queryKey: ['classes'], queryFn: () => classApi.getAll({ page: 1, limit: 1000 }) });

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const manager = res?.data;
  const fields = tplRes?.data?.manager?.fields || [];

  const updateMut = useMutation({
    mutationFn: (data: any) => managerApi.update(id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['managers', id] }); setEditOpen(false); toast.success('Manager updated'); },
  });
  const deleteMut = useMutation({
    mutationFn: () => managerApi.delete(id!),
    onSuccess: () => { toast.success('Manager deleted'); navigate('/managers'); },
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!manager) return <div className="text-center py-12 text-muted-foreground">Manager not found</div>;

  const fullName = `${manager.firstname} ${manager.lastname}`;

  const openEdit = () => {
    setEditForm({ firstname: manager.firstname, lastname: manager.lastname, dynamicFields: { ...(manager.dynamicFields || {}) } });
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/managers')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold flex-1 truncate">{fullName}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={openEdit}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
          <QRCodeDisplay entityType="managers" entityId={manager.id} entityName={fullName} />
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
              <CardHeader><CardTitle className="text-lg">Assigned Classes</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {manager.classIds.map(cid => <Badge key={cid} variant="outline">{classesRes?.data?.find(c => c.id === cid)?.name || cid}</Badge>)}
                {manager.classIds.length === 0 && <p className="text-muted-foreground">None assigned</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
              <CardContent><DynamicView fields={fields} data={manager.dynamicFields || {}} /></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="absences">
          <EntityAttendanceTab entityType="manager" entityId={manager.id} entityName={fullName} recordType="absences" />
        </TabsContent>
        <TabsContent value="lates">
          <EntityAttendanceTab entityType="manager" entityId={manager.id} entityName={fullName} recordType="lates" />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Manager</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>First Name</Label><Input value={editForm.firstname || ''} onChange={e => setEditForm((f: any) => ({ ...f, firstname: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input value={editForm.lastname || ''} onChange={e => setEditForm((f: any) => ({ ...f, lastname: e.target.value }))} /></div>
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
          <AlertDialogHeader><AlertDialogTitle>Delete manager?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {fullName}.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMut.mutate()}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
