import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarIcon, Clock, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User, AttendanceRecord } from '@/types';
import { format, subDays, startOfMonth, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface CheckInsProps {
  user: User;
}

interface DailyCheckIn {
  date: string;
  userName: string;
  firstCheckIn: string;
  lastCheckOut: string | null;
  totalHours: number;
  sessions: AttendanceRecord[];
}

const CheckIns: React.FC<CheckInsProps> = ({ user }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [dailyCheckIns, setDailyCheckIns] = useState<DailyCheckIn[]>([]);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showAverage, setShowAverage] = useState(false);
  const [showFirstCheckInOut, setShowFirstCheckInOut] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [user.id, startDate, endDate]);

  useEffect(() => {
    processRecords();
  }, [records, showFirstCheckInOut]);

  const fetchRecords = async () => {
    setIsLoading(true);
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('userId', user.id)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: false })
      .order('checkIn', { ascending: true });

    if (data && !error) {
      setRecords(data as AttendanceRecord[]);
    }
    setIsLoading(false);
  };

  const processRecords = () => {
    // Group records by date
    const groupedByDate = records.reduce((acc, record) => {
      const date = record.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    }, {} as Record<string, AttendanceRecord[]>);

    // Process each day
    const dailyData: DailyCheckIn[] = Object.entries(groupedByDate).map(([date, sessions]) => {
      // Sort sessions by checkIn time
      const sortedSessions = sessions.sort((a, b) => 
        new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()
      );

      const firstSession = sortedSessions[0];
      const lastSession = sortedSessions[sortedSessions.length - 1];

      // Calculate total hours
      const totalSeconds = sessions.reduce((sum, s) => sum + (s.totalWorkingSeconds || 0), 0);
      const totalHours = totalSeconds / 3600;

      return {
        date,
        userName: firstSession.userName,
        firstCheckIn: firstSession.checkIn,
        lastCheckOut: lastSession.checkOut || null,
        totalHours: Math.round(totalHours * 10) / 10,
        sessions: sortedSessions,
      };
    });

    // Sort by date descending
    dailyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setDailyCheckIns(dailyData);
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return format(date, "EEE, do MMM, yyyy, h:mm a");
  };

  const formatDateDisplay = (dateStr: string) => {
    return format(parseISO(dateStr), 'MMMM d, yyyy');
  };

  // Calculate average hours
  const averageHours = dailyCheckIns.length > 0
    ? Math.round((dailyCheckIns.reduce((sum, d) => sum + d.totalHours, 0) / dailyCheckIns.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Clock className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Check-ins</h1>
          <p className="text-muted-foreground">View your daily attendance records</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter by Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showAverage"
                  checked={showAverage}
                  onCheckedChange={(checked) => setShowAverage(checked as boolean)}
                />
                <Label htmlFor="showAverage" className="cursor-pointer">
                  Show Average
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showFirstCheckInOut"
                  checked={showFirstCheckInOut}
                  onCheckedChange={(checked) => setShowFirstCheckInOut(checked as boolean)}
                />
                <Label htmlFor="showFirstCheckInOut" className="cursor-pointer">
                  Show First Check-in/out
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Stats */}
      {showAverage && dailyCheckIns.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Daily Hours</p>
                <p className="text-2xl font-bold">{averageHours} hours</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Days</p>
                <p className="text-2xl font-bold">{dailyCheckIns.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">
                  {Math.round(dailyCheckIns.reduce((sum, d) => sum + d.totalHours, 0) * 10) / 10}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check-ins Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : dailyCheckIns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No check-ins found for the selected date range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyCheckIns.map((dayRecord) => (
                    <TableRow key={dayRecord.date}>
                      <TableCell className="font-medium">{dayRecord.userName}</TableCell>
                      <TableCell>{formatDateTime(dayRecord.firstCheckIn)}</TableCell>
                      <TableCell>
                        {dayRecord.lastCheckOut 
                          ? formatDateTime(dayRecord.lastCheckOut)
                          : <Badge variant="secondary">Active</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={dayRecord.totalHours >= 8 ? "default" : "secondary"}
                          className={dayRecord.totalHours >= 8 ? "bg-green-600" : ""}
                        >
                          {dayRecord.totalHours}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckIns;
