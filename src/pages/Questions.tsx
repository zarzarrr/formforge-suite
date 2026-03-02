import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { questionApi, lessonApi, unitApi } from '@/services/exam-api';
import { subjectApi, levelApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Pencil, Trash2, Search, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExcelImportDialog } from '@/components/ExcelImportDialog';
import { exportToExcel } from '@/lib/excel-utils';
import type { Question, QuestionOption, QuestionType, DifficultyLevel } from '@/types/exam';

const difficultyColors: Record<DifficultyLevel, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  hard: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const emptyOption = (): QuestionOption => ({ id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: '' });

export default function Questions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const presetLessonId = searchParams.get('lessonId') || '';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterLesson, setFilterLesson] = useState<string>(presetLessonId || 'all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);

  const [form, setForm] = useState<{
    text: string; lessonId: string; type: QuestionType; difficulty: DifficultyLevel;
    options: QuestionOption[]; correctAnswerId: string;
  }>({
    text: '', lessonId: presetLessonId, type: 'multiple_choice', difficulty: 'easy',
    options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
    correctAnswerId: '',
  });

  const { data: lessonsRes } = useQuery({ queryKey: ['lessons-flat'], queryFn: () => lessonApi.getAllFlat() });
  const { data: subjectsRes } = useQuery({ queryKey: ['subjects-all'], queryFn: () => subjectApi.getAll({ page: 1, limit: 1000 }) });
  const { data: levelsRes } = useQuery({ queryKey: ['levels-all'], queryFn: () => levelApi.getAll({ page: 1, limit: 1000 }) });
  const allLessons = lessonsRes?.data ?? [];
  const allSubjects = subjectsRes?.data ?? [];
  const allLevels = levelsRes?.data ?? [];

  // Filter lessons based on subject/level selection
  const filteredLessons = useMemo(() => {
    let items = allLessons;
    if (filterSubject !== 'all') items = items.filter(l => l.subjectId === filterSubject);
    if (filterLevel !== 'all') items = items.filter(l => l.levelId === filterLevel);
    return items;
  }, [allLessons, filterSubject, filterLevel]);

  const { data: questionsRes, isLoading } = useQuery({
    queryKey: ['questions', page, search, filterLesson, filterDifficulty, filterSubject, filterLevel],
    queryFn: () => questionApi.getAll({
      page, limit: 10, search,
      lessonId: filterLesson !== 'all' ? filterLesson : undefined,
      difficulty: filterDifficulty !== 'all' ? filterDifficulty : undefined,
    }),
  });

  // Client-side filter by subject/level (since questions link to lessons which have subjectId/levelId)
  const displayQuestions = useMemo(() => {
    let items = questionsRes?.data ?? [];
    if (filterSubject !== 'all') {
      const lessonIds = allLessons.filter(l => l.subjectId === filterSubject).map(l => l.id);
      items = items.filter(q => lessonIds.includes(q.lessonId));
    }
    if (filterLevel !== 'all') {
      const lessonIds = allLessons.filter(l => l.levelId === filterLevel).map(l => l.id);
      items = items.filter(q => lessonIds.includes(q.lessonId));
    }
    return items;
  }, [questionsRes?.data, filterSubject, filterLevel, allLessons]);

  const createMut = useMutation({
    mutationFn: (data: Omit<Question, 'id' | 'createdAt'>) => questionApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['questions'] }); toast({ title: 'Question created' }); setDialogOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Question> }) => questionApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['questions'] }); toast({ title: 'Question updated' }); setDialogOpen(false); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => questionApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['questions'] }); toast({ title: 'Question deleted' }); },
  });

  const resetForm = (type: QuestionType = 'multiple_choice') => {
    const opts = type === 'true_false'
      ? [{ id: `tf-true-${Date.now()}`, text: 'True' }, { id: `tf-false-${Date.now()}`, text: 'False' }]
      : [emptyOption(), emptyOption(), emptyOption(), emptyOption()];
    setForm({ text: '', lessonId: presetLessonId, type, difficulty: 'easy', options: opts, correctAnswerId: '' });
  };

  const openCreate = () => { setEditing(null); resetForm(); setDialogOpen(true); };
  const openEdit = (q: Question) => {
    setEditing(q);
    setForm({ text: q.text, lessonId: q.lessonId, type: q.type, difficulty: q.difficulty, options: [...q.options], correctAnswerId: q.correctAnswerId });
    setDialogOpen(true);
  };

  const handleTypeChange = (type: QuestionType) => {
    const opts = type === 'true_false'
      ? [{ id: `tf-true-${Date.now()}`, text: 'True' }, { id: `tf-false-${Date.now()}`, text: 'False' }]
      : [emptyOption(), emptyOption(), emptyOption(), emptyOption()];
    setForm(f => ({ ...f, type, options: opts, correctAnswerId: '' }));
  };

  const handleSubmit = () => {
    if (!form.text || !form.lessonId || !form.correctAnswerId) {
      toast({ title: 'Fill all required fields and select correct answer', variant: 'destructive' }); return;
    }
    if (form.type === 'multiple_choice' && form.options.some(o => !o.text.trim())) {
      toast({ title: 'All options must have text', variant: 'destructive' }); return;
    }
    const payload = { text: form.text, lessonId: form.lessonId, type: form.type, difficulty: form.difficulty, options: form.options, correctAnswerId: form.correctAnswerId };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  const getLessonName = (id: string) => allLessons.find(l => l.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Questions</h1>
          <p className="text-sm text-muted-foreground">Manage question bank for lessons</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => {
            const cols = [
              { key: 'text' as const, label: 'Question' },
              { key: 'lessonId' as const, label: 'Lesson', render: (q: Question) => getLessonName(q.lessonId) },
              { key: 'type' as const, label: 'Type' },
              { key: 'difficulty' as const, label: 'Difficulty' },
              { key: 'options' as const, label: 'Options', render: (q: Question) => q.options.map(o => o.text).join(' | ') },
              { key: 'correctAnswerId' as const, label: 'Correct Answer', render: (q: Question) => q.options.find(o => o.id === q.correctAnswerId)?.text ?? '' },
            ];
            exportToExcel(displayQuestions, cols, 'questions');
          }}><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-2" />Import</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Question</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search questions..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={filterSubject} onValueChange={v => { setFilterSubject(v); setFilterLesson('all'); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {allSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={v => { setFilterLevel(v); setFilterLesson('all'); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {allLevels.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterLesson} onValueChange={v => { setFilterLesson(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Lessons" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lessons</SelectItem>
                {filteredLessons.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={v => { setFilterDifficulty(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Lesson</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : !displayQuestions.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No questions found</TableCell></TableRow>
              ) : displayQuestions.map(q => (
                <TableRow key={q.id}>
                  <TableCell className="max-w-[300px]">
                    <p className="font-medium text-foreground truncate">{q.text}</p>
                    <p className="text-xs text-muted-foreground">{q.options.length} options</p>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{getLessonName(q.lessonId)}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{q.type === 'true_false' ? 'True/False' : 'MCQ'}</Badge></TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColors[q.difficulty]}`}>{q.difficulty}</span></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {questionsRes && questionsRes.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground self-center">Page {page} of {questionsRes.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= questionsRes.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        expectedColumns={['Question', 'Lesson', 'Type (true_false/multiple_choice)', 'Difficulty (easy/medium/hard)', 'Options (pipe separated)', 'Correct Answer']}
        onImport={(rows) => {
          let count = 0;
          rows.forEach(row => {
            const text = row['Question'] || row['question'] || '';
            if (!text) return;
            const lessonName = row['Lesson'] || row['lesson'] || '';
            const lesson = allLessons.find(l => l.name.toLowerCase() === lessonName.toLowerCase());
            if (!lesson) return;
            const type = (row['Type'] || row['type'] || 'multiple_choice') as QuestionType;
            const difficulty = (row['Difficulty'] || row['difficulty'] || 'easy') as DifficultyLevel;
            const optTexts = (row['Options'] || row['options'] || '').split('|').map((s: string) => s.trim()).filter(Boolean);
            const correctText = row['Correct Answer'] || row['correct answer'] || '';
            const options: QuestionOption[] = type === 'true_false'
              ? [{ id: `tf-t-${Date.now()}-${count}`, text: 'True' }, { id: `tf-f-${Date.now()}-${count}`, text: 'False' }]
              : optTexts.map((t: string, i: number) => ({ id: `imp-${Date.now()}-${count}-${i}`, text: t }));
            const correctOpt = options.find(o => o.text.toLowerCase() === correctText.toLowerCase());
            createMut.mutate({
              text, lessonId: lesson.id, type, difficulty, options,
              correctAnswerId: correctOpt?.id || options[0]?.id || '',
            });
            count++;
          });
          toast({ title: `Imported ${count} questions` });
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Question' : 'Add Question'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Lesson *</Label>
              <Select value={form.lessonId} onValueChange={v => setForm(f => ({ ...f, lessonId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select lesson" /></SelectTrigger>
                <SelectContent>{allLessons.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Question Text *</Label>
              <Input value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="Enter question" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: QuestionType) => handleTypeChange(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v: DifficultyLevel) => setForm(f => ({ ...f, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Options & Correct Answer *</Label>
              <RadioGroup value={form.correctAnswerId} onValueChange={v => setForm(f => ({ ...f, correctAnswerId: v }))} className="mt-2 space-y-2">
                {form.options.map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.id} id={opt.id} />
                    {form.type === 'true_false' ? (
                      <Label htmlFor={opt.id} className="cursor-pointer">{opt.text}</Label>
                    ) : (
                      <Input
                        value={opt.text}
                        onChange={e => {
                          const newOpts = [...form.options];
                          newOpts[i] = { ...newOpts[i], text: e.target.value };
                          setForm(f => ({ ...f, options: newOpts }));
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1"
                      />
                    )}
                  </div>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground mt-1">Select the radio button next to the correct answer</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
