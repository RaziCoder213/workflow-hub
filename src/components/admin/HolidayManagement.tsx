import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { OfficialHoliday } from '@/types';
import { toast } from 'sonner';
import { format, isBefore, isToday, addDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Trash2, 
  Edit, 
  Bell,
  PartyPopper,
  AlertCircle
} from 'lucide-react';

export const HolidayManagement: React.FC = () => {
  const [holidays, setHolidays] = useState<OfficialHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<OfficialHoliday | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    const { data, error } = await supabase
      .from('official_holidays')
      .select('*')
      .order('holiday_date', { ascending: true });

    if (error) {
      toast.error('Failed to fetch holidays');
      return;
    }

    setHolidays(data as OfficialHoliday[]);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!title || !selectedDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const holidayData = {
      title,
      description: description || null,
      holiday_date: format(selectedDate, 'yyyy-MM-dd'),
    };

    if (editingHoliday) {
      const { error } = await supabase
        .from('official_holidays')
        .update(holidayData)
        .eq('id', editingHoliday.id);

      if (error) {
        toast.error('Failed to update holiday');
        return;
      }
      toast.success('Holiday updated successfully');
    } else {
      const { error } = await supabase
        .from('official_holidays')
        .insert(holidayData);

      if (error) {
        toast.error('Failed to create holiday');
        return;
      }
      toast.success('Holiday created successfully');

      // Send notifications for the new holiday
      await sendHolidayNotifications(title, selectedDate);
    }

    resetForm();
    fetchHolidays();
  };

  const sendHolidayNotifications = async (holidayTitle: string, holidayDate: Date) => {
    // Get all active employees
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('status', 'active');

    if (!profiles || profiles.length === 0) return;

    // Check if notification is for tomorrow
    const tomorrow = startOfDay(addDays(new Date(), 1));
    const holidayDay = startOfDay(holidayDate);
    
    const notificationType = holidayDay.getTime() === tomorrow.getTime() ? 'tomorrow' : 'upcoming';
    const message = notificationType === 'tomorrow' 
      ? `Tomorrow (${format(holidayDate, 'EEEE, MMM d')}) is an official holiday: ${holidayTitle}. No check-in required.`
      : `New official holiday scheduled: ${holidayTitle} on ${format(holidayDate, 'EEEE, MMM d, yyyy')}.`;

    // Create notifications for all employees
    const notifications = profiles.map(profile => ({
      user_id: profile.id,
      user_name: profile.name,
      title: notificationType === 'tomorrow' ? '🎉 Tomorrow is a Holiday!' : '📅 New Holiday Announced',
      message,
      type: 'holiday',
      metadata: { holiday_date: format(holidayDate, 'yyyy-MM-dd'), holiday_title: holidayTitle }
    }));

    const { error } = await supabase.from('notifications').insert(notifications);
    
    if (!error) {
      toast.success(`Notifications sent to ${profiles.length} employees`);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('official_holidays')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete holiday');
      return;
    }

    toast.success('Holiday deleted successfully');
    fetchHolidays();
  };

  const handleEdit = (holiday: OfficialHoliday) => {
    setEditingHoliday(holiday);
    setTitle(holiday.title);
    setDescription(holiday.description || '');
    setSelectedDate(new Date(holiday.holiday_date));
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedDate(undefined);
    setEditingHoliday(null);
    setIsDialogOpen(false);
  };

  const sendReminderNotifications = async () => {
    // Find tomorrow's holidays
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const tomorrowHolidays = holidays.filter(h => h.holiday_date === tomorrow);

    if (tomorrowHolidays.length === 0) {
      toast.info('No holidays scheduled for tomorrow');
      return;
    }

    for (const holiday of tomorrowHolidays) {
      await sendHolidayNotifications(holiday.title, new Date(holiday.holiday_date));
    }
  };

  const upcomingHolidays = holidays.filter(h => !isBefore(new Date(h.holiday_date), startOfDay(new Date())));
  const pastHolidays = holidays.filter(h => isBefore(new Date(h.holiday_date), startOfDay(new Date())));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Official Holidays</h1>
          <p className="text-muted-foreground">Manage company-wide holidays and send notifications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={sendReminderNotifications}>
            <Bell className="w-4 h-4 mr-2" />
            Send Tomorrow's Reminders
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Holiday
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <PartyPopper className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingHolidays.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming Holidays</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{holidays.length}</p>
                <p className="text-sm text-muted-foreground">Total Holidays This Year</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {upcomingHolidays.length > 0 
                    ? format(new Date(upcomingHolidays[0].holiday_date), 'MMM d')
                    : 'None'}
                </p>
                <p className="text-sm text-muted-foreground">Next Holiday</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Holidays */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5" />
            Upcoming Holidays
          </CardTitle>
          <CardDescription>These holidays will deduct 8 hours from weekly required hours</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingHolidays.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No upcoming holidays scheduled</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Holiday</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingHolidays.map((holiday) => {
                  const holidayDate = new Date(holiday.holiday_date);
                  const isHolidayToday = isToday(holidayDate);
                  const isTomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd') === holiday.holiday_date;

                  return (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{format(holidayDate, 'EEEE')}</span>
                          <span className="text-sm text-muted-foreground">
                            {format(holidayDate, 'MMM d, yyyy')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{holiday.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {holiday.description || '-'}
                      </TableCell>
                      <TableCell>
                        {isHolidayToday ? (
                          <Badge variant="default" className="bg-accent">Today</Badge>
                        ) : isTomorrow ? (
                          <Badge variant="secondary">Tomorrow</Badge>
                        ) : (
                          <Badge variant="outline">Upcoming</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(holiday)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(holiday.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Past Holidays */}
      {pastHolidays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Past Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Holiday</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastHolidays.map((holiday) => (
                  <TableRow key={holiday.id} className="opacity-60">
                    <TableCell>
                      {format(new Date(holiday.holiday_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{holiday.title}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {holiday.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(holiday.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Holiday Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? 'Edit Holiday' : 'Add Official Holiday'}
            </DialogTitle>
            <DialogDescription>
              {editingHoliday 
                ? 'Update the holiday details below'
                : 'Create a new company-wide holiday. Employees will be notified automatically.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Holiday Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Independence Day"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the holiday..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingHoliday ? 'Update Holiday' : 'Create Holiday'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HolidayManagement;
