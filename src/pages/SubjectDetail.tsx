import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { subjectApi, teacherApi, levelApi, classApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { SubjectLessonsEditor } from '@/components/SubjectLessonsEditor';
import type { Teacher, Level, SchoolClass } from '@/types';

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedLessonLevel, setSelectedLessonLevel] = useState<string | null>(null);

  const { data: subjectRes, isLoading } = useQuery({ queryKey: ['subject', id], queryFn: () => subjectApi.getById(id!), enabled: !!id });
  const { data: teachersRes } = useQuery({ queryKey: ['teachers'], queryFn: () => teacherApi.getAll({ page: 1, limit: 1000 }) });
  const { data: levelsRes } = useQuery({ queryKey: ['levels'], queryFn: () => levelApi.getAll({ page: 1, limit: 1000 }) });
  const { data: classesRes } = useQuery({ queryKey: ['classes'], queryFn: () => classApi.getAll({ page: 1, limit: 1000 }) });

  const subject = subjectRes?.data;
  const teachers = teachersRes?.data || [];
  const allLevels = levelsRes?.data || [];
  const allClasses = classesRes?.data || [];

  const subjectLevels = allLevels.filter((l: Level) => (l.subjectIds || []).includes(id!));
  const teachersForSubject = teachers.filter((t: Teacher) => t.subjectIds.includes(id!));

  if (isLoading) {
    return (<div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>);
  }
  if (!subject) {
    return (<div className="text-center py-12"><p className="text-muted-foreground">Subject not found</p><Button variant="outline" className="mt-4" onClick={() => navigate('/subjects')}>Back to Subjects</Button></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/subjects')}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{subject.name}</h1>
          <p className="text-muted-foreground">Code: {subject.code}</p>
        </div>
      </div>

      <Tabs defaultValue="information">
        <TabsList>
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
        </TabsList>

        <TabsContent value="information">
          <Card>
            <CardHeader><CardTitle>Subject Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{subject.name}</p></div>
                <div><p className="text-sm text-muted-foreground">Code</p><p className="font-medium">{subject.code}</p></div>
                <div className="md:col-span-2"><p className="text-sm text-muted-foreground">Description</p><p className="font-medium">{subject.description || '—'}</p></div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Statistics</p>
                <div className="grid grid-cols-2 gap-4">
                  <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{teachersForSubject.length}</p><p className="text-xs text-muted-foreground">Teachers</p></CardContent></Card>
                  <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{subjectLevels.length}</p><p className="text-xs text-muted-foreground">Levels</p></CardContent></Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers">
          <Card>
            <CardHeader><CardTitle>Teachers Teaching {subject.name}</CardTitle></CardHeader>
            <CardContent>
              {teachersForSubject.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No teachers assigned to this subject</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Classes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachersForSubject.map((teacher: Teacher) => {
                      const classesForSubject = teacher.classAssignments
                        .filter(ca => ca.subjectIds.includes(id!))
                        .map(ca => allClasses.find((c: SchoolClass) => c.id === ca.classId))
                        .filter(Boolean) as SchoolClass[];

                      const byLevel = new Map<string, SchoolClass[]>();
                      classesForSubject.forEach(cls => {
                        const arr = byLevel.get(cls.levelId) || [];
                        arr.push(cls);
                        byLevel.set(cls.levelId, arr);
                      });

                      return (
                        <TableRow key={teacher.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/teachers/${teacher.id}`)}>
                          <TableCell className="font-medium">{teacher.firstname} {teacher.lastname}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Array.from(byLevel.keys()).map(lvlId => {
                                const lvl = allLevels.find((l: Level) => l.id === lvlId);
                                return <Badge key={lvlId} variant="outline">{lvl?.name || lvlId}</Badge>;
                              })}
                              {classesForSubject.length === 0 && <span className="text-muted-foreground text-sm">—</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {classesForSubject.length > 0 ? classesForSubject.map(cls => (
                                <Badge key={cls.id} variant="secondary">{cls.name}</Badge>
                              )) : <span className="text-muted-foreground text-sm">No classes</span>}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lessons">
          <Card>
            <CardHeader><CardTitle>Lessons for {subject.name}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {subjectLevels.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No levels assigned to this subject</p>
              ) : (
                <Tabs value={selectedLessonLevel || ''} onValueChange={v => setSelectedLessonLevel(v)}>
                  <TabsList className="flex-wrap h-auto">
                    {subjectLevels.map((lvl: Level) => (
                      <TabsTrigger key={lvl.id} value={lvl.id}>{lvl.name}</TabsTrigger>
                    ))}
                  </TabsList>
                  {subjectLevels.map((lvl: Level) => (
                    <TabsContent key={lvl.id} value={lvl.id}>
                      <SubjectLessonsEditor subjectId={id!} levelId={lvl.id} />
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
