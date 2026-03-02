import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, X, PlusCircle, Check, ChevronsUpDown } from 'lucide-react';
import { teacherApi, subjectApi, classApi, levelApi, templateApi } from '@/services/api';
import { buildDynamicSchema, getDynamicDefaults } from '@/lib/schema-builder';
import type { Teacher, Level } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/DataTable';
import { DynamicFormFields } from '@/components/DynamicFormFields';
import { InlineSubjectCreate } from '@/components/InlineCreateDialog';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ExcelImportDialog } from '@/components/ExcelImportDialog';
import { cn } from '@/lib/utils';

export default function TeachersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  const { data: res, isLoading } = useQuery({ queryKey: ['teachers'], queryFn: () => teacherApi.getAll({ page: 1, limit: 1000 }) });
  const { data: tplRes } = useQuery({ queryKey: ['templates'], queryFn: () => templateApi.get() });
  const { data: subjectsRes } = useQuery({ queryKey: ['subjects'], queryFn: () => subjectApi.getAll({ page: 1, limit: 1000 }) });
  const { data: classesRes } = useQuery({ queryKey: ['classes'], queryFn: () => classApi.getAll({ page: 1, limit: 1000 }) });
  const { data: levelsRes } = useQuery({ queryKey: ['levels'], queryFn: () => levelApi.getAll({ page: 1, limit: 1000 }) });

  const fields = tplRes?.data?.teacher?.fields || [];

  const createMut = useMutation({ mutationFn: (d: Partial<Teacher>) => teacherApi.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); setDialogOpen(false); toast.success('Teacher created'); } });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }: any) => teacherApi.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); setDialogOpen(false); toast.success('Teacher updated'); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => teacherApi.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); toast.success('Teacher deleted'); } });

  const columns: Column<Teacher>[] = useMemo(() => [
    { key: 'firstname', label: 'First Name' },
    { key: 'lastname', label: 'Last Name' },
    { key: 'subjectIds', label: 'Subjects', render: t => t.subjectIds.map(id => subjectsRes?.data?.find(s => s.id === id)?.name).filter(Boolean).join(', ') || '—' },
    { key: 'classAssignments' as any, label: 'Classes', render: (t: Teacher) => {
      const assignments = t.classAssignments || [];
      if (assignments.length === 0) return '—';
      return assignments.map(a => {
        const cls = classesRes?.data?.find(c => c.id === a.classId);
        return cls?.name || a.classId;
      }).join(', ');
    }},
    ...fields.filter(f => f.visible).slice(0, 2).map(f => ({ key: f.name, label: f.label, render: (t: Teacher) => String(t.dynamicFields?.[f.name] ?? '—') })),
  ], [fields, subjectsRes, classesRes]);

  const handleImport = (rows: Record<string, string>[]) => {
    let count = 0;
    rows.forEach(row => {
      const teacher: Partial<Teacher> = { firstname: row['First Name'] || row['firstname'] || '', lastname: row['Last Name'] || row['lastname'] || '', subjectIds: [], classAssignments: [], dynamicFields: {} };
      if (teacher.firstname && teacher.lastname) { createMut.mutate(teacher); count++; }
    });
    toast.success(`Imported ${count} teachers`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Teachers</h1><p className="text-muted-foreground">{res?.total ?? 0} teachers</p></div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Teacher</Button>
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
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {(subjectsRes?.data || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterLevel !== 'all' || filterClass !== 'all' || filterSubject !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterLevel('all'); setFilterClass('all'); setFilterSubject('all'); }}>Clear filters</Button>
        )}
      </div>
      <DataTable data={(res?.data || []).filter((t: Teacher) => {
        const assignedClassIds = (t.classAssignments || []).map(a => a.classId);
        if (filterLevel !== 'all') {
          const levelClassIds = (classesRes?.data || []).filter((c: any) => c.levelId === filterLevel).map((c: any) => c.id);
          if (!assignedClassIds.some(id => levelClassIds.includes(id))) return false;
        }
        if (filterClass !== 'all') {
          if (!assignedClassIds.includes(filterClass)) return false;
        }
        if (filterSubject !== 'all') {
          if (!t.subjectIds.includes(filterSubject)) return false;
        }
        return true;
      })} columns={columns} isLoading={isLoading} searchPlaceholder="Search teachers..." onView={t => navigate(`/teachers/${t.id}`)} onEdit={t => { setEditing(t); setDialogOpen(true); }} onDelete={t => setDeleteTarget(t)} exportFilename="teachers" onImportClick={() => setImportOpen(true)} />
      <TeacherDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} fields={fields} subjects={subjectsRes?.data || []} classes={classesRes?.data || []} levels={levelsRes?.data || []} isSubmitting={createMut.isPending || updateMut.isPending} onSubmit={(data: any) => editing ? updateMut.mutate({ id: editing.id, ...data }) : createMut.mutate(data)} />
      <ExcelImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} expectedColumns={['First Name', 'Last Name']} />
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete teacher?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {deleteTarget?.firstname} {deleteTarget?.lastname}.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { deleteMut.mutate(deleteTarget!.id); setDeleteTarget(null); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TeacherDialog({ open, onOpenChange, editing, fields, subjects, classes, levels, isSubmitting, onSubmit }: any) {
  const schema = z.object({
    firstname: z.string().min(1, 'Required'),
    lastname: z.string().min(1, 'Required'),
    subjectIds: z.array(z.string()).optional(),
    classAssignments: z.array(z.object({
      classId: z.string().min(1, 'Select a class'),
      subjectIds: z.array(z.string()).min(1, 'Select at least one subject'),
    })).optional(),
    photo: z.string().optional(),
    ...buildDynamicSchema(fields)
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstname: '', lastname: '', subjectIds: [] as string[], classAssignments: [] as { classId: string; subjectIds: string[] }[], photo: '',
      ...getDynamicDefaults(fields)
    }
  });

  const { fields: assignmentFields, append, remove } = useFieldArray({ control: form.control, name: 'classAssignments' });
  const selectedSubjectIds: string[] = form.watch('subjectIds') || [];

  useEffect(() => {
    if (open) {
      form.reset({
        firstname: editing?.firstname || '', lastname: editing?.lastname || '',
        subjectIds: editing?.subjectIds || [], classAssignments: editing?.classAssignments || [],
        photo: editing?.dynamicFields?.photo || '',
        ...getDynamicDefaults(fields, editing?.dynamicFields)
      });
    }
  }, [open, editing, fields, form]);

  const handleSubmit = (data: any) => {
    const { firstname, lastname, subjectIds, classAssignments, photo, ...rest } = data;
    onSubmit({ firstname, lastname, subjectIds, classAssignments: classAssignments || [], dynamicFields: { ...rest, photo } });
  };

  const assignedClassIds = (form.watch('classAssignments') || []).map((a: any) => a.classId);

  // Get allowed subjects for a class based on level's subjectIds
  const getAllowedSubjectsForClass = (classId: string): string[] => {
    const cls = classes.find((c: any) => c.id === classId);
    if (!cls) return selectedSubjectIds;
    const level = levels.find((l: Level) => l.id === cls.levelId);
    if (!level || !level.subjectIds || level.subjectIds.length === 0) return selectedSubjectIds;
    return selectedSubjectIds.filter((sid: string) => level.subjectIds.includes(sid));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="photo" render={({ field }) => (
              <FormItem><PhotoUpload value={field.value} onChange={field.onChange} initials={(form.watch('firstname')?.[0] || '') + (form.watch('lastname')?.[0] || '')} /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="firstname" render={({ field }) => (<FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="lastname" render={({ field }) => (<FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="subjectIds" render={({ field }) => {
              const selected = field.value || [];
              return (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Subjects</FormLabel>
                    <InlineSubjectCreate onCreated={(id) => field.onChange([...selected, id])} />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !selected.length && "text-muted-foreground")}>
                          {selected.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {selected.slice(0, 3).map(id => {
                                const subj = subjects.find((s: any) => s.id === id);
                                return subj ? <Badge variant="secondary" key={id}>{subj.name}</Badge> : null;
                              })}
                              {selected.length > 3 && <Badge variant="secondary">+{selected.length - 3}</Badge>}
                            </div>
                          ) : "Select subjects"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search subjects..." />
                        <CommandEmpty>No subjects found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {subjects.map((s: any) => (
                            <CommandItem key={s.id} onSelect={() => {
                              const updated = selected.includes(s.id) ? selected.filter((x: string) => x !== s.id) : [...selected, s.id];
                              field.onChange(updated);
                            }}>
                              <Check className={cn("mr-2 h-4 w-4", selected.includes(s.id) ? "opacity-100" : "opacity-0")} />
                              {s.name} ({s.code})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              );
            }} />

            {/* Class Assignments with Subjects - subjects restricted by level */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Class Assignments</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ classId: '', subjectIds: [] })} disabled={selectedSubjectIds.length === 0}>
                  <PlusCircle className="mr-1 h-4 w-4" />Add Class
                </Button>
              </div>
              {selectedSubjectIds.length === 0 && <p className="text-xs text-muted-foreground">Select subjects first to assign classes.</p>}
              {assignmentFields.map((af, index) => {
                const currentClassId = form.watch(`classAssignments.${index}.classId`);
                const allowedSubjects = getAllowedSubjectsForClass(currentClassId);
                return (
                  <div key={af.id} className="rounded-md border p-3 space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(index)}><X className="h-3 w-3" /></Button>
                    <FormField control={form.control} name={`classAssignments.${index}.classId`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Class</FormLabel>
                        <Select value={field.value} onValueChange={(v) => {
                          field.onChange(v);
                          // Reset subject selection when class changes - remove disallowed subjects
                          const cls = classes.find((c: any) => c.id === v);
                          const lvl = cls ? levels.find((l: Level) => l.id === cls.levelId) : null;
                          if (lvl && lvl.subjectIds) {
                            const currentSubs = form.getValues(`classAssignments.${index}.subjectIds`) || [];
                            const filtered = currentSubs.filter((sid: string) => lvl.subjectIds.includes(sid));
                            form.setValue(`classAssignments.${index}.subjectIds`, filtered);
                          }
                        }}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {levels.map((l: any) => {
                              const lvlClasses = classes.filter((c: any) => c.levelId === l.id);
                              if (lvlClasses.length === 0) return null;
                              return (
                                <div key={l.id}>
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{l.name}</div>
                                  {lvlClasses.map((c: any) => {
                                    const alreadyAssigned = assignedClassIds.includes(c.id) && c.id !== currentClassId;
                                    return <SelectItem key={c.id} value={c.id} disabled={alreadyAssigned}>{c.name} {alreadyAssigned ? '(already assigned)' : ''}</SelectItem>;
                                  })}
                                </div>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Subject checkboxes - disabled if not in level's subjects */}
                    <FormField control={form.control} name={`classAssignments.${index}.subjectIds`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Subjects for this class</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {selectedSubjectIds.map(sid => {
                            const subj = subjects.find((s: any) => s.id === sid);
                            if (!subj) return null;
                            const isAllowed = allowedSubjects.includes(sid);
                            const checked = (field.value || []).includes(sid);
                            return (
                              <label key={sid} className={cn("flex items-center gap-1.5 text-sm", isAllowed ? "cursor-pointer" : "cursor-not-allowed opacity-50")}>
                                <Checkbox
                                  checked={checked}
                                  disabled={!isAllowed}
                                  onCheckedChange={c => {
                                    const v = field.value || [];
                                    field.onChange(c ? [...v, sid] : v.filter((x: string) => x !== sid));
                                  }}
                                />
                                {subj.name}
                                {!isAllowed && <span className="text-xs text-destructive">(not in level)</span>}
                              </label>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                );
              })}
            </div>

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
