import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { managerApi, classApi, levelApi, templateApi } from '@/services/api';
import { buildDynamicSchema, getDynamicDefaults } from '@/lib/schema-builder';
import type { Manager } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTable, type Column } from '@/components/DataTable';
import { DynamicFormFields } from '@/components/DynamicFormFields';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ExcelImportDialog } from '@/components/ExcelImportDialog';

export default function ManagersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Manager | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Manager | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');

  const { data: res, isLoading } = useQuery({ queryKey: ['managers'], queryFn: () => managerApi.getAll({ page: 1, limit: 1000 }) });
  const { data: tplRes } = useQuery({ queryKey: ['templates'], queryFn: () => templateApi.get() });
  const { data: classesRes } = useQuery({ queryKey: ['classes'], queryFn: () => classApi.getAll({ page: 1, limit: 1000 }) });
  const { data: levelsRes } = useQuery({ queryKey: ['levels'], queryFn: () => levelApi.getAll({ page: 1, limit: 1000 }) });
  const fields = tplRes?.data?.manager?.fields || [];

  const createMut = useMutation({ mutationFn: (d: Partial<Manager>) => managerApi.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['managers'] }); setDialogOpen(false); toast.success('Manager created'); } });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }: any) => managerApi.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['managers'] }); setDialogOpen(false); toast.success('Manager updated'); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => managerApi.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['managers'] }); toast.success('Manager deleted'); } });

  const columns: Column<Manager>[] = useMemo(() => [
    { key: 'firstname', label: 'First Name' },
    { key: 'lastname', label: 'Last Name' },
    { key: 'classIds', label: 'Classes', render: m => m.classIds.map(id => classesRes?.data?.find(c => c.id === id)?.name).filter(Boolean).join(', ') || '—' },
    ...fields.filter(f => f.visible).slice(0, 2).map(f => ({ key: f.name, label: f.label, render: (m: Manager) => String(m.dynamicFields?.[f.name] ?? '—') })),
  ], [fields, classesRes]);

  const handleSubmit = (data: any) => { const { firstname, lastname, classIds, photo, ...rest } = data; const payload = { firstname, lastname, classIds, dynamicFields: { ...rest, photo } }; editing ? updateMut.mutate({ id: editing.id, ...payload }) : createMut.mutate(payload); };

  const handleImport = (rows: Record<string, string>[]) => {
    let count = 0;
    rows.forEach(row => {
      const m: Partial<Manager> = { firstname: row['First Name'] || row['firstname'] || '', lastname: row['Last Name'] || row['lastname'] || '', classIds: [], dynamicFields: {} };
      if (m.firstname && m.lastname) { createMut.mutate(m); count++; }
    });
    toast.success(`Imported ${count} managers`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Managers</h1><p className="text-muted-foreground">{res?.total ?? 0} managers</p></div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Manager</Button>
      </div>
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterLevel} onValueChange={v => { setFilterLevel(v); setFilterClass('all'); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Levels" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {(levelsRes?.data || []).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {(classesRes?.data || []).filter((c: any) => filterLevel === 'all' || c.levelId === filterLevel).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterLevel !== 'all' || filterClass !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterLevel('all'); setFilterClass('all'); }}>Clear filters</Button>
        )}
      </div>
      <DataTable data={(res?.data || []).filter((m: Manager) => {
        if (filterLevel !== 'all') {
          const levelClassIds = (classesRes?.data || []).filter((c: any) => c.levelId === filterLevel).map((c: any) => c.id);
          if (!m.classIds.some(id => levelClassIds.includes(id))) return false;
        }
        if (filterClass !== 'all') {
          if (!m.classIds.includes(filterClass)) return false;
        }
        return true;
      })} columns={columns} isLoading={isLoading} searchPlaceholder="Search managers..." onView={m => navigate(`/managers/${m.id}`)} onEdit={m => { setEditing(m); setDialogOpen(true); }} onDelete={m => setDeleteTarget(m)} exportFilename="managers" onImportClick={() => setImportOpen(true)} />
      <ManagerDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} fields={fields} classes={classesRes?.data || []} levels={levelsRes?.data || []} isSubmitting={createMut.isPending || updateMut.isPending} onSubmit={handleSubmit} />
      <ExcelImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} expectedColumns={['First Name', 'Last Name']} />
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete manager?</AlertDialogTitle><AlertDialogDescription>Permanently delete {deleteTarget?.firstname} {deleteTarget?.lastname}?</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { deleteMut.mutate(deleteTarget!.id); setDeleteTarget(null); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ManagerDialog({ open, onOpenChange, editing, fields, classes, levels, isSubmitting, onSubmit }: any) {
  const schema = z.object({
    firstname: z.string().min(1, 'Required'),
    lastname: z.string().min(1, 'Required'),
    classIds: z.array(z.string()).optional(),
    photo: z.string().optional(),
    ...buildDynamicSchema(fields)
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstname: '',
      lastname: '',
      classIds: [] as string[],
      photo: '',
      ...getDynamicDefaults(fields)
    }
  });

  useEffect(() => {
    if (open) {
      form.reset({
        firstname: editing?.firstname || '',
        lastname: editing?.lastname || '',
        classIds: editing?.classIds || [],
        photo: editing?.dynamicFields?.photo || '',
        ...getDynamicDefaults(fields, editing?.dynamicFields)
      });
    }
  }, [open, editing, fields, form]);

  const selectedClassIds: string[] = form.watch('classIds') || [];

  // Group classes by level
  const levelGroups = useMemo(() => {
    return levels.map((level: any) => ({
      ...level,
      classes: classes.filter((c: any) => c.levelId === level.id),
    })).filter((g: any) => g.classes.length > 0);
  }, [levels, classes]);

  const toggleClass = (classId: string) => {
    const current = form.getValues('classIds') || [];
    const updated = current.includes(classId)
      ? current.filter((id: string) => id !== classId)
      : [...current, classId];
    form.setValue('classIds', updated);
  };

  const toggleLevel = (levelClasses: any[]) => {
    const current = form.getValues('classIds') || [];
    const levelClassIds = levelClasses.map((c: any) => c.id);
    const allSelected = levelClassIds.every((id: string) => current.includes(id));
    const updated = allSelected
      ? current.filter((id: string) => !levelClassIds.includes(id))
      : [...new Set([...current, ...levelClassIds])];
    form.setValue('classIds', updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Manager' : 'Add Manager'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="photo" render={({ field }) => (
              <FormItem>
                <PhotoUpload value={field.value} onChange={field.onChange} initials={(form.watch('firstname')?.[0] || '') + (form.watch('lastname')?.[0] || '')} />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="firstname" render={({ field }) => (
                <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lastname" render={({ field }) => (
                <FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            {/* Classes as level-grouped table */}
            <FormField
              control={form.control}
              name="classIds"
              render={() => (
                <FormItem>
                  <FormLabel>Assign Classes</FormLabel>
                  <div className="rounded-md border max-h-64 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Level / Class</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {levelGroups.map((group: any) => {
                          const levelClassIds = group.classes.map((c: any) => c.id);
                          const allSelected = levelClassIds.every((id: string) => selectedClassIds.includes(id));
                          const someSelected = levelClassIds.some((id: string) => selectedClassIds.includes(id)) && !allSelected;
                          return (
                            <React.Fragment key={group.id}>
                              <TableRow className="bg-muted/50 font-medium">
                                <TableCell className="py-2">
                                  <Checkbox
                                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                                    onCheckedChange={() => toggleLevel(group.classes)}
                                  />
                                </TableCell>
                                <TableCell className="py-2 font-semibold text-sm">
                                  {group.name}
                                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                                    ({levelClassIds.filter((id: string) => selectedClassIds.includes(id)).length}/{levelClassIds.length})
                                  </span>
                                </TableCell>
                              </TableRow>
                              {group.classes.map((cls: any) => (
                                <TableRow key={cls.id}>
                                  <TableCell className="py-1.5 pl-6">
                                    <Checkbox
                                      checked={selectedClassIds.includes(cls.id)}
                                      onCheckedChange={() => toggleClass(cls.id)}
                                    />
                                  </TableCell>
                                  <TableCell className="py-1.5 pl-8 text-sm">{cls.name}</TableCell>
                                </TableRow>
                              ))}
                            </React.Fragment>
                          );
                        })}
                        {levelGroups.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground py-4">No classes available</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DynamicFormFields fields={fields} control={form.control} />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}