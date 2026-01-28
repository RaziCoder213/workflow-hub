import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { User, UserRole, LeaveRequest, OvertimeRequest, AttendanceRecord, BreakSchedule } from '@/types';
import { 
  Users, 
  Clock, 
  Calendar, 
  Coffee,
  CheckCircle, 
  XCircle, 
  Star,
  Home,
  Building,
  UserPlus,
  Loader2,
  Mail,
  Trash2
} from 'lucide-react';

interface ManagementProps {
  view: string;
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  onRefresh: () => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const Management: React.FC<ManagementProps> = ({ 
  view, 
  leaveRequests, 
  overtimeRequests,
  onRefresh 
}) => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [liveAttendance, setLiveAttendance] = useState<AttendanceRecord[]>([]);
  const [breakSchedules, setBreakSchedules] = useState<BreakSchedule[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [reviewScores, setReviewScores] = useState({
    workPerformance: 5,
    qualityResults: 5,
    attendanceBehavior: 5,
    officePolicies: 5,
    teamContribution: 5,
    comments: '',
  });
  const [loading, setLoading] = useState(false);

  // New user creation state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Employee');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchAllUsers();
    fetchLiveAttendance();
    fetchBreakSchedules();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'Employee');
    if (data) setEmployees(data as User[]);
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAllUsers(data as User[]);
  };

  const fetchLiveAttendance = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', today)
      .eq('status', 'active');
    if (data) setLiveAttendance(data as AttendanceRecord[]);
  };

  const fetchBreakSchedules = async () => {
    const { data } = await supabase
      .from('break_schedule')
      .select('*')
      .order('day_of_week');
    if (data) {
      setBreakSchedules(data as BreakSchedule[]);
    } else {
      // Initialize with defaults if none exist
      const defaults = DAYS.map((_, i) => ({ day_of_week: i, start_hour: 15, end_hour: 16 }));
      setBreakSchedules(defaults);
    }
  };

  const handleLeaveAction = async (id: string, status: 'Approved' | 'Rejected') => {
    await supabase.from('leaves').update({ status }).eq('id', id);
    onRefresh();
  };

  const handleOvertimeAction = async (id: string, status: 'Approved' | 'Rejected') => {
    await supabase.from('overtime').update({ status }).eq('id', id);
    onRefresh();
  };

  const handleBreakUpdate = async (dayOfWeek: number, startHour: number, endHour: number) => {
    await supabase
      .from('break_schedule')
      .upsert({ day_of_week: dayOfWeek, start_hour: startHour, end_hour: endHour });
    fetchBreakSchedules();
  };

  const handlePerformanceSubmit = async () => {
    if (!selectedEmployee) return;
    setLoading(true);

    try {
      const employee = employees.find(e => e.id === selectedEmployee);
      await supabase.from('performance_reviews').insert({
        userId: selectedEmployee,
        reviewerId: 'admin',
        workPerformance: reviewScores.workPerformance,
        qualityResults: reviewScores.qualityResults,
        attendanceBehavior: reviewScores.attendanceBehavior,
        officePolicies: reviewScores.officePolicies,
        teamContribution: reviewScores.teamContribution,
        comments: reviewScores.comments,
        reviewDate: new Date().toISOString().split('T')[0],
      });
      
      setSelectedEmployee('');
      setReviewScores({
        workPerformance: 5,
        qualityResults: 5,
        attendanceBehavior: 5,
        officePolicies: 5,
        teamContribution: 5,
        comments: '',
      });
      alert('Performance review submitted successfully!');
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new user account
  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setCreateError('Name and email are required');
      return;
    }

    // Validate email domain for employees
    if (newUserRole === 'Employee' && !newUserEmail.endsWith('@hztech.biz')) {
      setCreateError('Employee emails must be @hztech.biz');
      return;
    }

    setCreateLoading(true);
    setCreateError('');

    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUserEmail)
        .maybeSingle();

      if (existing) {
        setCreateError('An account with this email already exists');
        setCreateLoading(false);
        return;
      }

      // Create profile
      const { error } = await supabase.from('profiles').insert({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        department: newUserDepartment,
      });

      if (error) throw error;

      // Reset form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('Employee');
      setNewUserDepartment('');
      setCreateDialogOpen(false);
      
      // Refresh lists
      fetchEmployees();
      fetchAllUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create account');
    } finally {
      setCreateLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    await supabase.from('profiles').delete().eq('id', userId);
    fetchEmployees();
    fetchAllUsers();
  }

  const pendingLeaves = leaveRequests.filter(r => r.status === 'Pending');
  const pendingOvertime = overtimeRequests.filter(r => r.status === 'Pending');

  // Command Center View
  if (view === 'command') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Command Center</h1>
          <p className="text-muted-foreground">Overview of your workforce</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{employees.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-accent" />
                Currently Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{liveAttendance.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-warning" />
                Pending Leaves
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{pendingLeaves.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-info" />
                Pending Overtime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-info">{pendingOvertime.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Live Staff */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Staff Online Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveAttendance.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No staff currently online</p>
            ) : (
              <div className="space-y-3">
                {liveAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {record.isWFH ? (
                        <Home className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Building className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{record.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          Since {new Date(record.checkIn).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={record.isWFH ? 'secondary' : 'default'}>
                      {record.isWFH ? 'WFH' : 'Office'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Employees View
  if (view === 'employees') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Create and manage employee accounts</p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Account</DialogTitle>
                <DialogDescription>
                  Add a new employee or HR user. They will log in using their @hztech.biz Google account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="newName">Full Name</Label>
                  <Input
                    id="newName"
                    placeholder="John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newEmail">Email Address</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder="john@hztech.biz"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Employees must use @hztech.biz email addresses
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Employee">Employee</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newDept">Department</Label>
                  <Input
                    id="newDept"
                    placeholder="Engineering, Marketing, etc."
                    value={newUserDepartment}
                    onChange={(e) => setNewUserDepartment(e.target.value)}
                  />
                </div>

                {createError && (
                  <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    {createError}
                  </p>
                )}

                <Button 
                  onClick={handleCreateUser} 
                  disabled={createLoading}
                  className="w-full"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Users ({allUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No users found</p>
            ) : (
              <div className="space-y-3">
                {allUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.name}</p>
                        <Badge variant={user.role === 'Admin' ? 'default' : user.role === 'HR' ? 'secondary' : 'outline'}>
                          {user.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email || 'No email'}
                        </p>
                        {user.department && (
                          <p className="text-sm text-muted-foreground">
                            {user.department}
                          </p>
                        )}
                      </div>
                    </div>
                    {user.role !== 'Admin' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Leaves View
  if (view === 'leaves') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Leave Requests</h1>
          <p className="text-muted-foreground">Approve or reject leave requests</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {pendingLeaves.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No pending leave requests</p>
            ) : (
              <div className="space-y-4">
                {pendingLeaves.map((request) => (
                  <div key={request.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{request.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.type} Leave • {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <p className="text-sm mb-4">{request.reason}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleLeaveAction(request.id, 'Approved')}
                        className="bg-accent hover:bg-accent/90"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleLeaveAction(request.id, 'Rejected')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Overtime View
  if (view === 'overtime') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Overtime Requests</h1>
          <p className="text-muted-foreground">Approve or reject additional hours</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {pendingOvertime.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No pending overtime requests</p>
            ) : (
              <div className="space-y-4">
                {pendingOvertime.map((request) => (
                  <div key={request.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{request.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.project} • {request.hours} hours • {new Date(request.date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <p className="text-sm mb-4">{request.reason}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleOvertimeAction(request.id, 'Approved')}
                        className="bg-accent hover:bg-accent/90"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleOvertimeAction(request.id, 'Rejected')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Break Schedule View
  if (view === 'breaks') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Break Schedule</h1>
          <p className="text-muted-foreground">Configure lunch break hours for each day</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {DAYS.map((day, index) => {
                const schedule = breakSchedules.find(s => s.day_of_week === index) || { 
                  day_of_week: index, 
                  start_hour: 15, 
                  end_hour: 16 
                };
                return (
                  <div key={day} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="w-28 font-medium">{day}</div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={schedule.start_hour.toString()}
                        onValueChange={(v) => handleBreakUpdate(index, parseInt(v), schedule.end_hour)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i.toString().padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>to</span>
                      <Select
                        value={schedule.end_hour.toString()}
                        onValueChange={(v) => handleBreakUpdate(index, schedule.start_hour, parseInt(v))}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i.toString().padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Performance View
  if (view === 'performance') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Performance Reviews</h1>
          <p className="text-muted-foreground">Evaluate employee performance</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Submit Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} - {emp.department || 'No Dept'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEmployee && (
              <>
                {[
                  { key: 'workPerformance', label: 'Work Performance' },
                  { key: 'qualityResults', label: 'Quality Results' },
                  { key: 'attendanceBehavior', label: 'Attendance & Behavior' },
                  { key: 'officePolicies', label: 'Office Policies' },
                  { key: 'teamContribution', label: 'Team Contribution' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between">
                      <Label>{label}</Label>
                      <span className="text-sm font-medium">
                        {reviewScores[key as keyof typeof reviewScores]}
                      </span>
                    </div>
                    <Slider
                      value={[reviewScores[key as keyof typeof reviewScores] as number]}
                      onValueChange={([v]) => setReviewScores({ ...reviewScores, [key]: v })}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>
                ))}

                <div className="space-y-2">
                  <Label>Comments</Label>
                  <Textarea
                    value={reviewScores.comments}
                    onChange={(e) => setReviewScores({ ...reviewScores, comments: e.target.value })}
                    placeholder="Additional feedback..."
                  />
                </div>

                <Button onClick={handlePerformanceSubmit} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Submit Review
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default Management;
