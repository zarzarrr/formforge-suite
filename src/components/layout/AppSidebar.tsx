import { 
  LayoutDashboard, GraduationCap, Users, UserCircle, Briefcase, 
  School, Layers, BookOpen, Settings, ChevronDown, LogOut, GraduationCap as EduIcon,
  CalendarCheck, ClipboardList, FileQuestion, Library, FileText
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useState } from 'react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const managementItems = [
  { title: 'Students', url: '/students', icon: GraduationCap },
  { title: 'Teachers', url: '/teachers', icon: Users },
  { title: 'Parents', url: '/parents', icon: UserCircle },
  { title: 'Managers', url: '/managers', icon: Briefcase },
  { title: 'Classes', url: '/classes', icon: School },
  { title: 'Levels', url: '/levels', icon: Layers },
  { title: 'Subjects', url: '/subjects', icon: BookOpen },
  { title: 'Lessons', url: '/lessons', icon: Library },
];

const attendanceItems = [
  { title: 'Student Attendance', url: '/attendance/students', icon: CalendarCheck },
  { title: 'Teacher Attendance', url: '/attendance/teachers', icon: ClipboardList },
  { title: 'Manager Attendance', url: '/attendance/managers', icon: CalendarCheck },
];

const examItems = [
  { title: 'Questions', url: '/questions', icon: FileQuestion },
  { title: 'Exams', url: '/exams', icon: FileText },
  { title: 'External Exams', url: '/external-exams', icon: ClipboardList },
];

export function AppSidebar() {
  const [managementOpen, setManagementOpen] = useState(true);
  const [attendanceOpen, setAttendanceOpen] = useState(true);
  const [examOpen, setExamOpen] = useState(true);

  return (
    <Sidebar className="border-r-0">
      {/* Logo Header */}
      <div className="p-5 border-b border-sidebar-border flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <EduIcon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-bold text-sm tracking-tight text-sidebar-foreground">EduManage</h2>
          <p className="text-xs text-sidebar-foreground/50">School Management</p>
        </div>
      </div>

      <SidebarContent className="px-3 py-4">
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/" 
                    end 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    activeClassName="!bg-primary !text-primary-foreground font-medium"
                  >
                    <LayoutDashboard className="h-[18px] w-[18px]" />
                    <span className="text-sm">Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management Section - Collapsible */}
        <SidebarGroup>
          <Collapsible open={managementOpen} onOpenChange={setManagementOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors">
              <span>Management</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", managementOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {managementItems.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                          activeClassName="!bg-primary !text-primary-foreground font-medium"
                        >
                          <item.icon className="h-[18px] w-[18px]" />
                          <span className="text-sm">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Attendance Section */}
        <SidebarGroup>
          <Collapsible open={attendanceOpen} onOpenChange={setAttendanceOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors">
              <span>Attendance</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", attendanceOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {attendanceItems.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                          activeClassName="!bg-primary !text-primary-foreground font-medium"
                        >
                          <item.icon className="h-[18px] w-[18px]" />
                          <span className="text-sm">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Online Exam Section */}
        <SidebarGroup>
          <Collapsible open={examOpen} onOpenChange={setExamOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors">
              <span>Online Exam</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", examOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {examItems.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                          activeClassName="!bg-primary !text-primary-foreground font-medium"
                        >
                          <item.icon className="h-[18px] w-[18px]" />
                          <span className="text-sm">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom items */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    activeClassName="!bg-primary !text-primary-foreground font-medium"
                  >
                    <Settings className="h-[18px] w-[18px]" />
                    <span className="text-sm">Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
