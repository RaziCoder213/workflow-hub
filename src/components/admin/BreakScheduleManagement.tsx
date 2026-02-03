import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { BreakSchedule } from '@/types';
import { Coffee, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const BreakScheduleManagement: React.FC = () => {
  const [schedules, setSchedules] = useState<BreakSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from('break_schedule')
      .select('*')
      .order('day_of_week');
    
    if (data && !error) {
      // Fill in missing days with defaults
      const fullSchedule = DAYS.map((_, i) => {
        const existing = data.find(s => s.day_of_week === i);
        return existing || { day_of_week: i, start_hour: 15, end_hour: 16 };
      });
      setSchedules(fullSchedule as BreakSchedule[]);
    } else {
      // Initialize with defaults
      const defaults = DAYS.map((_, i) => ({ day_of_week: i, start_hour: 15, end_hour: 16 }));
      setSchedules(defaults);
    }
    setLoading(false);
  };

  const handleUpdate = async (dayOfWeek: number, startHour: number, endHour: number) => {
    if (startHour >= endHour) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(dayOfWeek);
    const { error } = await supabase
      .from('break_schedule')
      .upsert({ day_of_week: dayOfWeek, start_hour: startHour, end_hour: endHour });

    if (error) {
      toast.error('Failed to update break schedule');
    } else {
      setSchedules(prev => prev.map(s => 
        s.day_of_week === dayOfWeek 
          ? { ...s, start_hour: startHour, end_hour: endHour }
          : s
      ));
      toast.success(`${DAYS[dayOfWeek]} break schedule updated`);
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Break Schedule</h1>
        <p className="text-muted-foreground">Configure lunch break hours for each day of the week</p>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50 border-muted">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Coffee className="w-8 h-8 text-primary mt-1" />
            <div>
              <h3 className="font-medium mb-1">Automatic Break Checkout</h3>
              <p className="text-sm text-muted-foreground">
                Employees will be automatically checked out during the scheduled break time for each day. 
                They can check back in once the break period ends.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Weekly Break Schedule
          </CardTitle>
          <CardDescription>
            Set the lunch break window for each day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div 
                key={schedule.day_of_week} 
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-muted/50 rounded-lg"
              >
                <div className="w-28 font-medium">{DAYS[schedule.day_of_week]}</div>
                
                <div className="flex items-center gap-2 flex-1">
                  <Select
                    value={schedule.start_hour.toString()}
                    onValueChange={(v) => handleUpdate(schedule.day_of_week, parseInt(v), schedule.end_hour)}
                    disabled={saving === schedule.day_of_week}
                  >
                    <SelectTrigger className="w-28">
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
                  
                  <span className="text-muted-foreground">to</span>
                  
                  <Select
                    value={schedule.end_hour.toString()}
                    onValueChange={(v) => handleUpdate(schedule.day_of_week, schedule.start_hour, parseInt(v))}
                    disabled={saving === schedule.day_of_week}
                  >
                    <SelectTrigger className="w-28">
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

                  {saving === schedule.day_of_week && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  {schedule.end_hour - schedule.start_hour} hour break
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BreakScheduleManagement;
