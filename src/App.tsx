import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { supabase } from '@/integrations/supabase/client';
import { User, AttendanceRecord, LeaveRequest, OvertimeRequest, BreakSchedule } from '@/types';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import LeaveRequests from '@/components/LeaveRequests';
import OvertimeRequests from '@/components/OvertimeRequests';
import AttendanceReport from '@/components/AttendanceReport';
import Profile from '@/components/Profile';
import Performance from '@/components/Performance';
import Management from '@/components/Management';
import Rewards from '@/components/Rewards';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  FileText, 
  User as UserIcon,
  Star,
  LogOut,
  Users,
  Coffee,
  Menu,
  X,
  Gift
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentSession, setCurrentSession] = useState<AttendanceRecord | null>(null);
  const [todayTotalSeconds, setTodayTotalSeconds] = useState(0);
  const [breakSchedule, setBreakSchedule] = useState<BreakSchedule | null>(null);
  const [isBreakTime, setIsBreakTime] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const IDLE_LIMIT = 15 * 60; // 15 minutes
  const REQUIRED_SECONDS = 8 * 60 * 60; // 8 hours

  const isAdmin = user?.role === 'Admin' || user?.role === 'HR';

  // Fetch break schedule for today
  const fetchBreakSchedule = useCallback(async () => {
    const dayOfWeek = new Date().getDay();
    const { data } = await supabase
      .from('break_schedule')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .maybeSingle();
    
    if (data) {
      setBreakSchedule(data as BreakSchedule);
    } else {
      // Default 3-4 PM
      setBreakSchedule({ day_of_week: dayOfWeek, start_hour: 15, end_hour: 16 });
    }
  }, []);

  // Fetch active session
  const fetchActiveSession = useCallback(async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('userId', user.id)
      .eq('date', today)
      .eq('status', 'active')
      .maybeSingle();
    
    if (data) {
      setCurrentSession(data as AttendanceRecord);
    } else {
      setCurrentSession(null);
    }
  }, [user]);

  // Calculate today's total seconds
  const calculateTodayTotal = useCallback(async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance')
      .select('totalWorkingSeconds, status')
      .eq('userId', user.id)
      .eq('date', today);
    
    if (data) {
      const total = data.reduce((acc, record) => acc + (record.totalWorkingSeconds || 0), 0);
      setTodayTotalSeconds(total);
    }
  }, [user]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    if (!user) return;

    const [leavesRes, overtimeRes] = await Promise.all([
      supabase.from('leaves').select('*').order('created_at', { ascending: false }),
      supabase.from('overtime').select('*').order('created_at', { ascending: false }),
    ]);

    if (leavesRes.data) setLeaveRequests(leavesRes.data as LeaveRequest[]);
    if (overtimeRes.data) setOvertimeRequests(overtimeRes.data as OvertimeRequest[]);
  }, [user]);

  // Check if currently break time
  const checkBreakTime = useCallback(() => {
    if (!breakSchedule) return false;
    const now = new Date();
    const hour = now.getHours();
    return hour >= breakSchedule.start_hour && hour < breakSchedule.end_hour;
  }, [breakSchedule]);

  // Check in handler
  const handleCheckIn = async (isWFH: boolean) => {
    if (!user || isBreakTime) return;

    const now = new Date();
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        userId: user.id,
        userName: user.name,
        date: now.toISOString().split('T')[0],
        checkIn: now.toISOString(),
        totalWorkingSeconds: 0,
        status: 'active',
        isWFH,
      })
      .select()
      .single();

    if (data && !error) {
      setCurrentSession(data as AttendanceRecord);
      setIdleSeconds(0);
    }
  };

  // Check out handler
  const handleCheckOut = async (status: string = 'completed') => {
    if (!currentSession) return;

    const now = new Date();
    await supabase
      .from('attendance')
      .update({
        checkOut: now.toISOString(),
        totalWorkingSeconds: todayTotalSeconds,
        status,
      })
      .eq('id', currentSession.id);

    setCurrentSession(null);
    calculateTodayTotal();
  };

  // Handle logout
  const handleLogout = () => {
    if (currentSession) {
      handleCheckOut('system-checkout');
    }
    setUser(null);
    setCurrentView('dashboard');
  };

  // Activity detection - reset idle timer
  useEffect(() => {
    if (!currentSession) return;

    const resetIdle = () => setIdleSeconds(0);
    
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('click', resetIdle);
    window.addEventListener('scroll', resetIdle);

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('click', resetIdle);
      window.removeEventListener('scroll', resetIdle);
    };
  }, [currentSession]);

  // Main timer - runs every second
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const isBreak = checkBreakTime();
      setIsBreakTime(isBreak);

      if (currentSession) {
        // Handle break time auto-checkout
        if (isBreak) {
          handleCheckOut('lunch-checkout');
          return;
        }

        // Increment working seconds
        setTodayTotalSeconds((prev) => {
          const newTotal = prev + 1;
          
          // Auto checkout at 8 hours
          if (newTotal >= REQUIRED_SECONDS) {
            handleCheckOut('system-checkout');
          }
          
          return newTotal;
        });

        // Increment idle seconds
        setIdleSeconds((prev) => {
          const newIdle = prev + 1;
          
          // Auto checkout at 15 minutes idle
          if (newIdle >= IDLE_LIMIT) {
            handleCheckOut('idle-checkout');
          }
          
          return newIdle;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, currentSession, checkBreakTime]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchBreakSchedule();
      fetchActiveSession();
      calculateTodayTotal();
      fetchAllData();
    }
  }, [user, fetchBreakSchedule, fetchActiveSession, calculateTodayTotal, fetchAllData]);

  // Login screen
  if (!user) {
    return (
      <>
        <Login onLogin={setUser} />
        <Toaster />
      </>
    );
  }

  // Navigation items
  const employeeNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'leaves', label: 'Leave Requests', icon: FileText },
    { id: 'overtime', label: 'Additional Hours', icon: Clock },
    { id: 'rewards', label: 'Rewards', icon: Gift },
    { id: 'performance', label: 'Performance', icon: Star },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  const adminNav = [
    { id: 'command', label: 'Command Center', icon: LayoutDashboard },
    { id: 'employees', label: 'All Employees', icon: Users },
    { id: 'leaves', label: 'Leave Requests', icon: FileText },
    { id: 'overtime', label: 'Overtime Requests', icon: Clock },
    { id: 'breaks', label: 'Break Schedule', icon: Coffee },
    { id: 'performance', label: 'Performance', icon: Star },
  ];

  const navItems = isAdmin ? adminNav : employeeNav;

  const renderContent = () => {
    if (isAdmin) {
      return (
        <Management
          view={currentView}
          leaveRequests={leaveRequests}
          overtimeRequests={overtimeRequests}
          onRefresh={fetchAllData}
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            user={user}
            currentSession={currentSession}
            todayTotalSeconds={todayTotalSeconds}
            breakSchedule={breakSchedule}
            isBreakTime={isBreakTime}
            idleSeconds={idleSeconds}
            onCheckIn={handleCheckIn}
            onCheckOut={() => handleCheckOut('completed')}
          />
        );
      case 'attendance':
        return <AttendanceReport user={user} />;
      case 'leaves':
        return (
          <LeaveRequests
            user={user}
            requests={leaveRequests}
            onRefresh={fetchAllData}
          />
        );
      case 'overtime':
        return (
          <OvertimeRequests
            user={user}
            requests={overtimeRequests}
            todayTotalSeconds={todayTotalSeconds}
            onRefresh={fetchAllData}
          />
        );
      case 'rewards':
        return <Rewards user={user} todayTotalSeconds={todayTotalSeconds} />;
      case 'performance':
        return <Performance user={user} />;
      case 'profile':
        return <Profile user={user} onUpdate={setUser} />;
      default:
        return (
          <Dashboard
            user={user}
            currentSession={currentSession}
            todayTotalSeconds={todayTotalSeconds}
            breakSchedule={breakSchedule}
            isBreakTime={isBreakTime}
            idleSeconds={idleSeconds}
            onCheckIn={handleCheckIn}
            onCheckOut={() => handleCheckOut('completed')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-sidebar-background text-sidebar-foreground
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Employee Portal</h1>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-sidebar-foreground h-9 w-9"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-sidebar-foreground/70 mt-1">
            {user.name} • {user.role}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-colors text-left
                ${currentView === item.id 
                  ? 'bg-sidebar-accent text-sidebar-primary' 
                  : 'hover:bg-sidebar-accent/50'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-9 w-9"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold">Employee Portal</h1>
          </div>
          <ThemeToggle />
        </header>

        {/* Content */}
        <div className="p-4 md:p-6 lg:p-8">
          {renderContent()}
        </div>
      </main>

      <Toaster />
    </div>
  );
};

export default App;
