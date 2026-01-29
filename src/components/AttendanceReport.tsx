import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { User, AttendanceRecord } from '@/types';
import { Calendar, Clock, TrendingUp, Home, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AttendanceReportProps {
  user: User;
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({ user }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('userId', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (data) {
        setRecords(data as AttendanceRecord[]);
      }
      setLoading(false);
    };
    fetchRecords();
  }, [user.id]);

  const formatHours = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const totalHours = records.reduce((acc, r) => acc + r.totalWorkingSeconds, 0);
  const avgHours = records.length > 0 ? totalHours / records.length : 0;
  const wfhDays = records.filter(r => r.isWFH).length;

  // Group by date
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
        <p className="text-muted-foreground">Your attendance history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Hours (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(totalHours)}</div>
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
                          weekday: 'long',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <Badge variant="secondary">{formatHours(totalDaySeconds)}</Badge>
                    </div>
                    <div className="space-y-2">
                      {dayRecords.map((record) => (
                        <div key={record.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                          <div className="flex items-center gap-2">
                            {record.isWFH ? (
                              <Home className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Building className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span>
                              {new Date(record.checkIn).toLocaleTimeString()} - {' '}
                              {record.checkOut 
                                ? new Date(record.checkOut).toLocaleTimeString()
                                : 'Active'}
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
