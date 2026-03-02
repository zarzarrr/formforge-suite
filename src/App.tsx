import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Index";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import Teachers from "./pages/Teachers";
import TeacherDetail from "./pages/TeacherDetail";
import Parents from "./pages/Parents";
import ParentDetail from "./pages/ParentDetail";
import Managers from "./pages/Managers";
import ManagerDetail from "./pages/ManagerDetail";
import Classes from "./pages/Classes";
import Levels from "./pages/Levels";
import LevelDetail from "./pages/LevelDetail";
import Subjects from "./pages/Subjects";
import SubjectDetail from "./pages/SubjectDetail";
import Settings from "./pages/Settings";
import StudentAttendance from "./pages/StudentAttendance";
import TeacherAttendance from "./pages/TeacherAttendance";
import ManagerAttendance from "./pages/ManagerAttendance";
import ExamLessons from "./pages/Lessons";
import ExamQuestions from "./pages/Questions";
import ExamsList from "./pages/Exams";
import TakeExam from "./pages/TakeExam";
import ExamDetail from "./pages/ExamDetail";
import ScanExam from "./pages/ScanExam";
import ExternalExams from "./pages/ExternalExams";
import ExternalExamDetail from "./pages/ExternalExamDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentDetail />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/teachers/:id" element={<TeacherDetail />} />
            <Route path="/parents" element={<Parents />} />
            <Route path="/parents/:id" element={<ParentDetail />} />
            <Route path="/managers" element={<Managers />} />
            <Route path="/managers/:id" element={<ManagerDetail />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/levels" element={<Levels />} />
            <Route path="/levels/:id" element={<LevelDetail />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/subjects/:id" element={<SubjectDetail />} />
            <Route path="/attendance/students" element={<StudentAttendance />} />
            <Route path="/attendance/students" element={<StudentAttendance />} />
            <Route path="/attendance/teachers" element={<TeacherAttendance />} />
            <Route path="/attendance/managers" element={<ManagerAttendance />} />
            <Route path="/lessons" element={<ExamLessons />} />
            <Route path="/questions" element={<ExamQuestions />} />
            <Route path="/exams" element={<ExamsList />} />
            <Route path="/exams/:id" element={<ExamDetail />} />
            <Route path="/exams/:id/take" element={<TakeExam />} />
            <Route path="/exams/:id/scan" element={<ScanExam />} />
            <Route path="/external-exams" element={<ExternalExams />} />
            <Route path="/external-exams/:id" element={<ExternalExamDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
