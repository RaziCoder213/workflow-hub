import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { User, AttendanceRecord } from '@/types';
import { Calendar, Clock, TrendingUp, Home, Building, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AttendanceReportProps {
  user: User;
}

const WEEKLY_REQUIRED = 5 * 8 * 3600;

export const AttendanceReport: React.FC<AttendanceReportProps> = ({ user }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklySeconds, setWeeklySeconds] = useState(0);
  const [yearlySeconds, setYearlySeconds] = useState(0);
  const [weeklyAdj, setWeeklyAdj] = useState(0);
  const [yearlyAdj, setYearlyAdj] = useState(0);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const weekStartStr = monday.toISOString().split('T')[0];
    const yearStart = `${now.getFullYear()}-01-01`;

    const [recordsRes, adjustmentsRes] = await Promise.all([
      supabase.from('attendance').select('*').eq('userId', user.id).order('date', { ascending: false }).limit(90),
      supabase.from('hours_adjustments').select('*').eq('employee_id', user.id),
    ]);

    const allRecords = (recordsRes.data || []) as AttendanceRecord[];
    setRecords(allRecords);

    setWeeklySeconds(allRecords.filter(r => r.date >= weekStartStr).reduce((s, r) => s + r.totalWorkingSeconds, 0));
    setYearlySeconds(allRecords.filter(r => r.date >= yearStart).reduce((s, r) => s + r.totalWorkingSeconds, 0));

    const adjs = adjustmentsRes.data || [];
    setWeeklyAdj(adjs.filter((a: any) => a.week_start >= weekStartStr).reduce((s: number, a: any) => s + (a.adjustment_seconds || 0), 0));
    setYearlyAdj(adjs.filter((a: any) => a.week_start >= yearStart).reduce((s: number, a: any) => s + (a.adjustment_seconds || 0), 0));

    setLoading(false);
  };

  const formatHours = (seconds: number) => {
    const abs = Math.abs(seconds);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    return `${seconds < 0 ? '-' : ''}${h}h ${m}m`;
  };

  const totalWeekly = weeklySeconds + weeklyAdj;
  const weeklyPct = Math.min(100, (totalWeekly / WEEKLY_REQUIRED) * 100);
  const weeklyRemaining = Math.max(0, WEEKLY_REQUIRED - totalWeekly);
  const totalYearly = yearlySeconds + yearlyAdj;

  const totalHours30 = records.slice(0, 30).reduce((acc, r) => acc + r.totalWorkingSeconds, 0);
  const avgHours = records.length > 0 ? totalHours30 / Math.min(records.length, 30) : 0;
  const wfhDays = records.filter(r => r.isWFH).length;

  const groupedByDate = records.reduce((acc, record) => {
    const date = record.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {} as Record<string, AttendanceRecord[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance Report</h1>
        <p className="text-muted-foreground">Your attendance history and hours summary</p>
      </div>

      {/* My Hours Summary */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            My Hours Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">This Week</span>
              <span className="font-medium">{formatHours(totalWeekly)} / 40h</span>
            </div>
            <Progress value={weeklyPct} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{weeklyPct.toFixed(0)}% completed</span>
              <span>{formatHours(weeklyRemaining)} remaining</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground">Weekly Tracked</p>
              <p className="text-lg font-bold">{formatHours(weeklySeconds)}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground">Weekly Adj.</p>
              <p className="text-lg font-bold">{formatHours(weeklyAdj)}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground">Yearly Total</p>
              <p className="text-lg font-bold">{formatHours(totalYearly)}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground">Yearly Adj.</p>
              <p className="text-lg font-bold">{formatHours(yearlyAdj)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Hours (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(totalHours30)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Average Daily
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(avgHours)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Home className="w-4 h-4" />
              WFH Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wfhDays}</div>
          </CardContent>
        </Card>
      </div>

      {/* Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : Object.keys(groupedByDate).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No attendance records yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByDate).map(([date, dayRecords]) => {
                const totalDaySeconds = dayRecords.reduce((acc, r) => acc + r.totalWorkingSeconds, 0);
                return (
                  <div key={date} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </p>
                      <Badge variant="secondary">{formatHours(totalDaySeconds)}</Badge>
                    </div>
                    <div className="space-y-2">
                      {dayRecords.map((record) => (
                        <div key={record.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                          <div className="flex items-center gap-2">
                            {record.isWFH ? <Home className="w-4 h-4 text-muted-foreground" /> : <Building className="w-4 h-4 text-muted-foreground" />}
                            <span>
                              {new Date(record.checkIn).toLocaleTimeString()} -{' '}
                              {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'Active'}
                            </span>
                          </div>
                          <span className="text-muted-foreground">{formatHours(record.totalWorkingSeconds)}</span>
                        </div>
                      ))}
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

export default AttendanceReport;
