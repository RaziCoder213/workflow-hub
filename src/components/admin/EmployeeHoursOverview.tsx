import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { Clock, Search, Users, Calendar, TrendingUp } from 'lucide-react';

interface EmployeeHours {
  employee: User;
  weeklySeconds: number;
  weeklyAdjustments: number;
  yearlySeconds: number;
  yearlyAdjustments: number;
  totalWeekly: number;
  totalYearly: number;
}

const WEEKLY_REQUIRED = 5 * 8 * 3600; // 40 hours
const YEARLY_REQUIRED = 52 * 40 * 3600; // ~2080 hours

const EmployeeHoursOverview: React.FC = () => {
  const [employeeHours, setEmployeeHours] = useState<EmployeeHours[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [profilesRes, attendanceRes, adjustmentsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('status', 'active').order('name'),
      supabase.from('attendance').select('userId, totalWorkingSeconds, date'),
      supabase.from('hours_adjustments').select('employee_id, adjustment_seconds, week_start'),
    ]);

    const profiles = (profilesRes.data || []) as unknown as User[];
    const attendance = attendanceRes.data || [];
    const adjustments = adjustmentsRes.data || [];

    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const weekStartStr = monday.toISOString().split('T')[0];
    const yearStart = `${now.getFullYear()}-01-01`;

    const depts = new Set<string>();
    
    const hours: EmployeeHours[] = profiles.map(emp => {
      if (emp.department) depts.add(emp.department);

      const empAttendance = attendance.filter(a => a.userId === emp.id);
      const weeklySeconds = empAttendance
        .filter(a => a.date && a.date >= weekStartStr)
        .reduce((sum, a) => sum + (a.totalWorkingSeconds || 0), 0);
      const yearlySeconds = empAttendance
        .filter(a => a.date && a.date >= yearStart)
        .reduce((sum, a) => sum + (a.totalWorkingSeconds || 0), 0);

      const empAdjustments = adjustments.filter(a => a.employee_id === emp.id);
      const weeklyAdj = empAdjustments
        .filter(a => a.week_start >= weekStartStr)
        .reduce((sum, a) => sum + (a.adjustment_seconds || 0), 0);
      const yearlyAdj = empAdjustments
        .filter(a => a.week_start >= yearStart)
        .reduce((sum, a) => sum + (a.adjustment_seconds || 0), 0);

      return {
        employee: emp,
        weeklySeconds,
        weeklyAdjustments: weeklyAdj,
        yearlySeconds,
        yearlyAdjustments: yearlyAdj,
        totalWeekly: weeklySeconds + weeklyAdj,
        totalYearly: yearlySeconds + yearlyAdj,
      };
    });

    setDepartments(Array.from(depts));
    setEmployeeHours(hours);
    setLoading(false);
  };

  const formatHours = (seconds: number) => {
    const abs = Math.abs(seconds);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    return `${seconds < 0 ? '-' : ''}${h}h ${m}m`;
  };

  const getWeeklyStatus = (seconds: number) => {
    const pct = (seconds / WEEKLY_REQUIRED) * 100;
    if (pct >= 95) return 'default';
    if (pct >= 75) return 'secondary';
    return 'destructive';
  };

  const filtered = employeeHours.filter(eh => {
    const matchSearch = eh.employee.name.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || eh.employee.department === filterDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Employee Hours Overview</h1>
        <p className="text-muted-foreground">Track weekly and yearly working hours for all employees</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{employeeHours.length}</p>
                <p className="text-xs text-muted-foreground">Active Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {filtered.filter(e => (e.totalWeekly / WEEKLY_REQUIRED) >= 0.95).length}
                </p>
                <p className="text-xs text-muted-foreground">On Track This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {filtered.filter(e => (e.totalWeekly / WEEKLY_REQUIRED) < 0.75).length}
                </p>
                <p className="text-xs text-muted-foreground">Below Target</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search employees..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Hours Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No employees found</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(eh => {
                const weeklyPct = Math.min(100, (eh.totalWeekly / WEEKLY_REQUIRED) * 100);
                const weeklyRemaining = Math.max(0, WEEKLY_REQUIRED - eh.totalWeekly);
                return (
                  <div key={eh.employee.id} className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {eh.employee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{eh.employee.name}</p>
                          <p className="text-xs text-muted-foreground">{eh.employee.department || 'No dept'} • {eh.employee.role}</p>
                        </div>
                      </div>
                      <Badge variant={getWeeklyStatus(eh.totalWeekly)}>
                        {weeklyPct.toFixed(0)}% this week
                      </Badge>
                    </div>
                    
                    {/* Weekly progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Weekly: {formatHours(eh.totalWeekly)} / 40h</span>
                        <span>{formatHours(weeklyRemaining)} remaining</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${weeklyPct >= 95 ? 'bg-primary' : weeklyPct >= 75 ? 'bg-amber-500' : 'bg-destructive'}`}
                          style={{ width: `${weeklyPct}%` }} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground">Tracked</p>
                        <p className="font-semibold">{formatHours(eh.weeklySeconds)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground">Adjustments</p>
                        <p className="font-semibold">{formatHours(eh.weeklyAdjustments)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground">Yearly Total</p>
                        <p className="font-semibold">{formatHours(eh.totalYearly)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground">Yearly Adj.</p>
                        <p className="font-semibold">{formatHours(eh.yearlyAdjustments)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeHoursOverview;
