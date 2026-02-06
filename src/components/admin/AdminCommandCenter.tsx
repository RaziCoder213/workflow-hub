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
  PartyPopper
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Command Center</h1>
        <p className="text-muted-foreground">Real-time workforce overview and quick actions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('employees')}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Users className="w-8 h-8 text-primary mb-2" />
              <p className="text-2xl font-bold">{stats.totalEmployees}</p>
              <p className="text-xs text-muted-foreground">Total Staff</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Activity className="w-8 h-8 text-accent mb-2" />
              <p className="text-2xl font-bold text-accent">{stats.activeEmployees}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="w-8 h-8 text-accent mb-2" />
              <p className="text-2xl font-bold text-accent">{stats.onlineNow}</p>
              <p className="text-xs text-muted-foreground">Online Now</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Clock className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">{stats.todayCheckIns}</p>
              <p className="text-xs text-muted-foreground">Today's Check-ins</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('leaves')}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Calendar className="w-8 h-8 text-warning mb-2" />
              <p className="text-2xl font-bold text-warning">{stats.pendingLeaves}</p>
              <p className="text-xs text-muted-foreground">Pending Leaves</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('overtime')}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <AlertCircle className="w-8 h-8 text-info mb-2" />
              <p className="text-2xl font-bold text-info">{stats.pendingOvertime}</p>
              <p className="text-xs text-muted-foreground">Pending OT</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Staff */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                Staff Online Now
              </CardTitle>
              <CardDescription>Currently checked in employees</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {liveAttendance.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No staff currently online</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {liveAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                      <div>
                        <p className="font-medium">{record.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          Since {new Date(record.checkIn).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={record.isWFH ? 'secondary' : 'default'}>
                      {record.isWFH ? (
                        <><Home className="w-3 h-3 mr-1" /> WFH</>
                      ) : (
                        <><Building className="w-3 h-3 mr-1" /> Office</>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-warning" />
                Pending Approvals
              </CardTitle>
              <CardDescription>Items awaiting your action</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Pending Leaves */}
              {recentLeaves.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Leave Requests</h4>
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onNavigate('leaves')}>
                      View All <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {recentLeaves.slice(0, 3).map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <p className="text-sm font-medium">{leave.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            {leave.type} • {new Date(leave.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Overtime */}
              {recentOvertime.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Overtime Requests</h4>
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onNavigate('overtime')}>
                      View All <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {recentOvertime.slice(0, 3).map((ot) => (
                      <div key={ot.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <p className="text-sm font-medium">{ot.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            {ot.hours} hours • {ot.project}
                          </p>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentLeaves.length === 0 && recentOvertime.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-accent" />
                  All caught up! No pending approvals.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => onNavigate('employees')}>
              <Users className="w-6 h-6 mb-2" />
              <span>Manage Employees</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => onNavigate('performance')}>
              <TrendingUp className="w-6 h-6 mb-2" />
              <span>Performance Review</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => onNavigate('leaves')}>
              <Calendar className="w-6 h-6 mb-2" />
              <span>Leave Requests</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => onNavigate('permissions')}>
              <Activity className="w-6 h-6 mb-2" />
              <span>Role Permissions</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCommandCenter;
