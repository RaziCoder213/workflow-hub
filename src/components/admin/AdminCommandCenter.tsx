import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { User, AttendanceRecord, LeaveRequest, OvertimeRequest } from '@/types';
import { 
  Users, 
  Clock, 
  Calendar, 
  CheckCircle,
  AlertCircle,
  Home,
  Building,
  TrendingUp,
  Activity,
  ArrowRight,
  FileText,
  PartyPopper,
  ChevronRight
} from 'lucide-react';

interface AdminCommandCenterProps {
  onNavigate: (view: string) => void;
}

export const AdminCommandCenter: React.FC<AdminCommandCenterProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onlineNow: 0,
    pendingLeaves: 0,
    pendingOvertime: 0,
    todayCheckIns: 0,
  });
  const [liveAttendance, setLiveAttendance] = useState<AttendanceRecord[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<LeaveRequest[]>([]);
  const [recentOvertime, setRecentOvertime] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const today = new Date().toISOString().split('T')[0];

    const [
      profilesRes,
      attendanceRes,
      leavesRes,
      overtimeRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('attendance').select('*').eq('date', today),
      supabase.from('leaves').select('*').eq('status', 'Pending').order('created_at', { ascending: false }).limit(5),
      supabase.from('overtime').select('*').eq('status', 'Pending').order('created_at', { ascending: false }).limit(5),
    ]);

    if (profilesRes.data) {
      const employees = profilesRes.data;
      setStats(prev => ({
        ...prev,
        totalEmployees: employees.length,
        activeEmployees: employees.filter(e => (e.status || 'active') === 'active').length,
      }));
    }

    if (attendanceRes.data) {
      const attendance = attendanceRes.data as AttendanceRecord[];
      const active = attendance.filter(a => a.status === 'active');
      setLiveAttendance(active);
      setStats(prev => ({
        ...prev,
        onlineNow: active.length,
        todayCheckIns: attendance.length,
      }));
    }

    if (leavesRes.data) {
      setRecentLeaves(leavesRes.data as LeaveRequest[]);
      setStats(prev => ({ ...prev, pendingLeaves: leavesRes.data!.length }));
    }

    if (overtimeRes.data) {
      setRecentOvertime(overtimeRes.data as OvertimeRequest[]);
      setStats(prev => ({ ...prev, pendingOvertime: overtimeRes.data!.length }));
    }

    setLoading(false);
  };

  const StatCard = ({ 
    icon: Icon, 
    value, 
    label, 
    color = "primary",
    onClick 
  }: { 
    icon: any; 
    value: number | string; 
    label: string; 
    color?: string;
    onClick?: () => void;
  }) => (
    <Card 
      className={`${onClick ? 'cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200' : ''} bg-card border border-border`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color === 'primary' ? 'text-primary' : color === 'success' ? 'text-green-600' : color === 'warning' ? 'text-amber-500' : 'text-foreground'}`}>
              {value}
            </p>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color === 'primary' ? 'bg-primary/10' : color === 'success' ? 'bg-green-100' : color === 'warning' ? 'bg-amber-100' : 'bg-muted'}`}>
            <Icon className={`w-7 h-7 ${color === 'primary' ? 'text-primary' : color === 'success' ? 'text-green-600' : color === 'warning' ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </div>
        </div>
        {onClick && (
          <div className="mt-4 flex items-center text-sm text-primary font-medium">
            View details <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Command Center</h1>
          <p className="text-muted-foreground mt-1">Real-time workforce overview and quick actions</p>
        </div>
        <Badge variant="outline" className="w-fit text-sm px-4 py-2 border-primary/30 text-primary bg-primary/5">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          Live Dashboard
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          icon={Users} 
          value={stats.totalEmployees} 
          label="Total Staff" 
          color="primary"
          onClick={() => onNavigate('employees')} 
        />
        <StatCard 
          icon={Activity} 
          value={stats.activeEmployees} 
          label="Active Employees" 
          color="success"
        />
        <StatCard 
          icon={CheckCircle} 
          value={stats.onlineNow} 
          label="Online Now" 
          color="success"
        />
        <StatCard 
          icon={Clock} 
          value={stats.todayCheckIns} 
          label="Today's Check-ins" 
        />
        <StatCard 
          icon={Calendar} 
          value={stats.pendingLeaves} 
          label="Pending Leaves" 
          color="warning"
          onClick={() => onNavigate('leaves')} 
        />
        <StatCard 
          icon={AlertCircle} 
          value={stats.pendingOvertime} 
          label="Pending OT" 
          color="warning"
          onClick={() => onNavigate('overtime')} 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Live Staff */}
        <Card className="bg-card border border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-green-600" />
                  </div>
                  Staff Online Now
                </CardTitle>
                <CardDescription className="mt-2">Currently checked in employees</CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {stats.onlineNow}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {liveAttendance.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No staff currently online</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {liveAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {record.userName?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{record.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          Since {new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={record.isWFH ? 'secondary' : 'default'} className="gap-1.5">
                      {record.isWFH ? <Home className="w-3.5 h-3.5" /> : <Building className="w-3.5 h-3.5" />}
                      {record.isWFH ? 'WFH' : 'Office'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card className="bg-card border border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  Pending Approvals
                </CardTitle>
                <CardDescription className="mt-2">Items awaiting your action</CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1 bg-amber-100 text-amber-700">
                {stats.pendingLeaves + stats.pendingOvertime}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Pending Leaves */}
              {recentLeaves.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-foreground">Leave Requests</h4>
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-primary hover:text-primary/80" onClick={() => onNavigate('leaves')}>
                      View All <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {recentLeaves.slice(0, 3).map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {leave.userName?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{leave.userName}</p>
                            <p className="text-xs text-muted-foreground">
                              {leave.type} • {new Date(leave.startDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Pending
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Overtime */}
              {recentOvertime.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-foreground">Overtime Requests</h4>
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-primary hover:text-primary/80" onClick={() => onNavigate('overtime')}>
                      View All <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {recentOvertime.slice(0, 3).map((ot) => (
                      <div key={ot.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {ot.userName?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{ot.userName}</p>
                            <p className="text-xs text-muted-foreground">
                              {ot.hours} hours • {ot.project}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Pending
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentLeaves.length === 0 && recentOvertime.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p className="font-medium text-foreground">All caught up!</p>
                  <p className="text-sm">No pending approvals at the moment.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all duration-200" 
              onClick={() => onNavigate('employees')}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium">Manage Employees</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all duration-200" 
              onClick={() => onNavigate('performance')}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium">Performance Review</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all duration-200" 
              onClick={() => onNavigate('leaves')}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium">Leave Requests</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all duration-200" 
              onClick={() => onNavigate('projects')}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium">Projects</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all duration-200" 
              onClick={() => onNavigate('holidays')}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <PartyPopper className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium">Official Holidays</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all duration-200" 
              onClick={() => onNavigate('permissions')}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium">Role Permissions</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCommandCenter;
