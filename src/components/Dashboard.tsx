import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { User, AttendanceRecord, BreakSchedule } from '@/types';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Coffee, 
  Home, 
  Building, 
  Timer,
  TrendingUp,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface DashboardProps {
  user: User;
  currentSession: AttendanceRecord | null;
  todayTotalSeconds: number;
  breakSchedule: BreakSchedule | null;
  isBreakTime: boolean;
  idleSeconds: number;
  onCheckIn: (isWFH: boolean) => void;
  onCheckOut: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  currentSession,
  todayTotalSeconds,
  breakSchedule,
  isBreakTime,
  idleSeconds,
  onCheckIn,
  onCheckOut,
}) => {
  const [isWFH, setIsWFH] = useState(false);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);

  const REQUIRED_SECONDS = 8 * 60 * 60; // 8 hours
  const IDLE_LIMIT = 15 * 60; // 15 minutes
  const progressPercent = Math.min((todayTotalSeconds / REQUIRED_SECONDS) * 100, 100);
  const remainingSeconds = Math.max(REQUIRED_SECONDS - todayTotalSeconds, 0);
  const idleRemaining = IDLE_LIMIT - idleSeconds;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatHours = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  useEffect(() => {
    const fetchTodayRecords = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('userId', user.id)
        .eq('date', today)
        .order('checkIn', { ascending: true });
      
      if (data) {
        setTodayRecords(data as AttendanceRecord[]);
      }
    };
    fetchTodayRecords();
  }, [user.id, currentSession]);

  const breakStart = breakSchedule?.start_hour ?? 15;
  const breakEnd = breakSchedule?.end_hour ?? 16;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user.name}!</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <Badge variant={currentSession ? 'default' : 'secondary'} className="text-sm px-3 py-1">
          {currentSession ? (currentSession.isWFH ? 'Working from Home' : 'In Office') : 'Checked Out'}
        </Badge>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Daily Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Daily Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(todayTotalSeconds)}</div>
            <Progress value={progressPercent} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {formatHours(remainingSeconds)} remaining of 8h
            </p>
          </CardContent>
        </Card>

        {/* Current Session */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {currentSession ? formatTime(todayTotalSeconds) : '--:--:--'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentSession 
                ? `Started at ${new Date(currentSession.checkIn).toLocaleTimeString()}`
                : 'Not checked in'}
            </p>
          </CardContent>
        </Card>

        {/* Idle Timer */}
        <Card className={idleRemaining < 300 && currentSession ? 'border-warning' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Idle Timer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${idleRemaining < 300 && currentSession ? 'text-warning' : ''}`}>
              {currentSession ? formatTime(idleRemaining) : '15:00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentSession ? 'Auto-checkout if no activity' : 'Timer starts on check-in'}
            </p>
          </CardContent>
        </Card>

        {/* Break Schedule */}
        <Card className={isBreakTime ? 'border-info bg-info/5' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Coffee className="w-4 h-4" />
              Lunch Break
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {breakStart}:00 - {breakEnd}:00
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isBreakTime ? 'Currently on break' : 'Work hours excluded'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Check In/Out Section */}
      <Card>
        <CardContent className="pt-6">
          {isBreakTime ? (
            <div className="text-center py-8">
              <Coffee className="w-16 h-16 mx-auto text-info mb-4" />
              <h2 className="text-xl font-semibold mb-2">Lunch Break Time</h2>
              <p className="text-muted-foreground">
                Break hours: {breakStart}:00 - {breakEnd}:00
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Check-in will be available after break ends
              </p>
            </div>
          ) : currentSession ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  {currentSession.isWFH ? (
                    <Home className="w-6 h-6 text-accent" />
                  ) : (
                    <Building className="w-6 h-6 text-accent" />
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    You are currently checked in
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentSession.isWFH ? 'Working from Home' : 'Working from Office'}
                  </p>
                </div>
              </div>
              <Button onClick={onCheckOut} variant="destructive" size="lg">
                <LogOut className="w-4 h-4 mr-2" />
                Check Out
              </Button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="wfh-mode"
                    checked={isWFH}
                    onCheckedChange={setIsWFH}
                  />
                  <Label htmlFor="wfh-mode" className="flex items-center gap-2">
                    {isWFH ? <Home className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                    {isWFH ? 'Work from Home' : 'Work from Office'}
                  </Label>
                </div>
              </div>
              <Button onClick={() => onCheckIn(isWFH)} size="lg" className="bg-accent hover:bg-accent/90">
                <LogIn className="w-4 h-4 mr-2" />
                Check In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Sessions */}
      {todayRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today's Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {record.isWFH ? (
                      <Home className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Building className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(record.checkIn).toLocaleTimeString()} - {' '}
                        {record.checkOut 
                          ? new Date(record.checkOut).toLocaleTimeString()
                          : 'Active'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.isWFH ? 'WFH' : 'Office'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={record.status === 'active' ? 'default' : 'secondary'}>
                      {record.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatHours(record.totalWorkingSeconds)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Important Notice */}
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
            <div>
              <h3 className="font-medium text-warning">Important Reminders</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Ensure VPN is off before checking in</li>
                <li>• Set laptop time to Karachi timezone</li>
                <li>• 15 minutes of inactivity will auto-checkout</li>
                <li>• Lunch hours ({breakStart}:00-{breakEnd}:00) are excluded from work time</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
