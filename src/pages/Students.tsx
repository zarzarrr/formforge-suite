import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { studentApi, parentApi, levelApi, classApi, templateApi } from '@/services/api';
import { buildDynamicSchema, getDynamicDefaults } from '@/lib/schema-builder';
import type { Student } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/DataTable';
import { DynamicFormFields } from '@/components/DynamicFormFields';
import { InlineParentCreate } from '@/components/InlineCreateDialog';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ExcelImportDialog } from '@/components/ExcelImportDialog';
import { cn } from '@/lib/utils';

export default function StudentsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');

  const { data: studentsRes, isLoading } = useQuery({ queryKey: ['students'], queryFn: () => studentApi.getAll({ page: 1, limit: 1000 }) });
  const { data: tplRes } = useQuery({ queryKey: ['templates'], queryFn: () => templateApi.get() });
  const { data: parentsRes } = useQuery({ queryKey: ['parents'], queryFn: () => parentApi.getAll({ page: 1, limit: 1000 }) });
  const { data: levelsRes } = useQuery({ queryKey: ['levels'], queryFn: () => levelApi.getAll({ page: 1, limit: 1000 }) });
  const { data: classesRes } = useQuery({ queryKey: ['classes'], queryFn: () => classApi.getAll({ page: 1, limit: 1000 }) });

  const template = tplRes?.data?.student;
  const fields = template?.fields || [];

  const createMut = useMutation({
    mutationFn: (d: Partial<Student>) => studentApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setDialogOpen(false); toast.success('Student created'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...d }: any) => studentApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setDialogOpen(false); toast.success('Student updated'); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => studentApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.success('Student deleted'); },
  });

  const columns: Column<Student>[] = useMemo(() => {
    const base: Column<Student>[] = [
      { key: 'id', label: 'ID' },
      { key: 'firstname', label: 'First Name' },
      { key: 'lastname', label: 'Last Name' },
      { key: 'levelId', label: 'Level', render: s => levelsRes?.data?.find(l => l.id === s.levelId)?.name || s.levelId },
      { key: 'classId', label: 'Class', render: s => classesRes?.data?.find(c => c.id === s.classId)?.name || s.classId || '—' },
    ];
    const dynamic = fields.filter(f => f.visible).slice(0, 3).map(f => ({
      key: f.name, label: f.label, render: (s: Student) => String(s.dynamicFields?.[f.name] ?? '—'),
    }));
    return [...base, ...dynamic];
  }, [fields, levelsRes, classesRes]);

  const handleImport = (rows: Record<string, string>[]) => {
    let count = 0;
    rows.forEach(row => {
      const student: Partial<Student> = {
        firstname: row['First Name'] || row['firstname'] || '',
        lastname: row['Last Name'] || row['lastname'] || '',
        levelId: row['levelId'] || '',
        classId: row['classId'] || '',
        parentIds: [],
        dynamicFields: {},
      };
      if (student.firstname && student.lastname) {
        createMut.mutate(student);
        count++;
      }
    });
    toast.success(`Imported ${count} students`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">{studentsRes?.total ?? 0} students</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Student</Button>
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
      <DataTable
        data={(studentsRes?.data || []).filter((s: Student) => {
          if (filterLevel !== 'all' && s.levelId !== filterLevel) return false;
          if (filterClass !== 'all' && s.classId !== filterClass) return false;
          return true;
        })}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search students..."
        onView={s => navigate(`/students/${s.id}`)}
        onEdit={s => { setEditing(s); setDialogOpen(true); }}
        onDelete={s => setDeleteTarget(s)}
        exportFilename="students"
        onImportClick={() => setImportOpen(true)}
      />
      <StudentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        fields={fields}
        parents={parentsRes?.data || []}
        levels={levelsRes?.data || []}
        classes={classesRes?.data || []}
        isSubmitting={createMut.isPending || updateMut.isPending}
        onSubmit={(data: any) => editing ? updateMut.mutate({ id: editing.id, ...data }) : createMut.mutate(data)}
      />
      <ExcelImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} expectedColumns={['First Name', 'Last Name', 'levelId', 'classId']} />
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete {deleteTarget?.firstname} {deleteTarget?.lastname}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteMut.mutate(deleteTarget!.id); setDeleteTarget(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StudentDialog({ open, onOpenChange, editing, fields, parents, levels, classes, isSubmitting, onSubmit }: any) {
  const dynamicSchema = buildDynamicSchema(fields);
  const schema = z.object({
    firstname: z.string().min(1, 'First name is required'),
    lastname: z.string().min(1, 'Last name is required'),
    levelId: z.string().min(1, 'Level is required'),
    classId: z.string().optional(),
    parentIds: z.array(z.string()).optional(),
    defaultParentId: z.string().optional(),
    parentRelations: z.record(z.string()).optional(),
    photo: z.string().optional(),
    ...dynamicSchema,
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstname: '', lastname: '', levelId: '', classId: '', parentIds: [], defaultParentId: '', parentRelations: {}, photo: '',
      ...getDynamicDefaults(fields),
    },
  });

  // Reset form when dialog opens or when editing/fields change
  useEffect(() => {
    if (open) {
      form.reset({
        firstname: editing?.firstname || '',
        lastname: editing?.lastname || '',
        levelId: editing?.levelId || '',
        classId: editing?.classId || '',
        parentIds: editing?.parentIds || [],
        defaultParentId: editing?.defaultParentId || '',
        parentRelations: editing?.parentRelations || {},
        photo: editing?.dynamicFields?.photo || '',
        ...getDynamicDefaults(fields, editing?.dynamicFields),
      });
    }
  }, [open, editing, fields, form]);

  const watchLevel = form.watch('levelId');
  const filteredClasses = classes.filter((c: any) => c.levelId === watchLevel);

  const handleSubmit = (data: any) => {
    const { firstname, lastname, levelId, classId, parentIds, defaultParentId, parentRelations, photo, ...rest } = data;
    onSubmit({ firstname, lastname, levelId, classId, parentIds, defaultParentId, parentRelations, dynamicFields: { ...rest, photo } });
  };

  // Multi-select for parents
  const selectedParentIds = form.watch('parentIds') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Student' : 'Add Student'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="levelId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Level *</FormLabel>
                  <Select onValueChange={(v) => { field.onChange(v); form.setValue('classId', ''); }} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger></FormControl>
                    <SelectContent>{levels.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="classId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger></FormControl>
                    <SelectContent>{filteredClasses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Multi-select for Parents */}
            <FormField
              control={form.control}
              name="parentIds"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Parents</FormLabel>
                    <InlineParentCreate
                      onCreated={(id) => {
                        // Add the newly created parent to the selection
                        field.onChange([...selectedParentIds, id]);
                      }}
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !selectedParentIds.length && "text-muted-foreground"
                          )}
                        >
                          {selectedParentIds.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {selectedParentIds.slice(0, 2).map((id) => {
                                const parent = parents.find((p: any) => p.id === id);
                                return parent ? (
                                  <Badge variant="secondary" key={id}>
                                    {parent.firstname} {parent.lastname}
                                  </Badge>
                                ) : null;
                              })}
                              {selectedParentIds.length > 2 && (
                                <Badge variant="secondary">+{selectedParentIds.length - 2}</Badge>
                              )}
                            </div>
                          ) : (
                            "Select parents"
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search parents..." />
                        <CommandEmpty>No parents found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {parents.map((parent: any) => (
                            <CommandItem
                              key={parent.id}
                              onSelect={() => {
                                const current = field.value || [];
                                const updated = current.includes(parent.id)
                                  ? current.filter((id: string) => id !== parent.id)
                                  : [...current, parent.id];
                                field.onChange(updated);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedParentIds.includes(parent.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {parent.firstname} {parent.lastname}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Relation names for selected parents */}
            {selectedParentIds.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Parent Relations</Label>
                <div className="space-y-2">
                  {selectedParentIds.map((pid: string) => {
                    const parent = parents.find((p: any) => p.id === pid);
                    if (!parent) return null;
                    const relations = form.watch('parentRelations') || {};
                    return (
                      <div key={pid} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground min-w-[120px] truncate">{parent.firstname} {parent.lastname}</span>
                        <Input
                          placeholder="e.g. Father, Mother, Guardian"
                          value={relations[pid] || ''}
                          onChange={e => {
                            const updated = { ...relations, [pid]: e.target.value };
                            form.setValue('parentRelations', updated);
                          }}
                          className="flex-1 h-8 text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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