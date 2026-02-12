import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { Clock, Plus, Search, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HoursAdjustmentProps {
  currentUser: User;
}

interface Adjustment {
  id: string;
  employee_id: string;
  employee_name: string;
  adjusted_by: string;
  adjusted_by_name: string;
  adjustment_seconds: number;
  reason: string;
  week_start: string;
  created_at: string;
}

const HoursAdjustment: React.FC<HoursAdjustmentProps> = ({ currentUser }) => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [reason, setReason] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
    fetchAdjustments();
    // Default to current week's Monday
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    setWeekStart(monday.toISOString().split('T')[0]);
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('status', 'active').order('name');
    if (data) setEmployees(data as unknown as User[]);
  };

  const fetchAdjustments = async () => {
    const { data } = await supabase
      .from('hours_adjustments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setAdjustments(data as Adjustment[]);
  };

  const handleSubmit = async () => {
    if (!selectedEmployee || !reason || (!hours && !minutes)) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    const totalSeconds = ((parseInt(hours || '0') * 3600) + (parseInt(minutes || '0') * 60)) * (adjustType === 'deduct' ? -1 : 1);
    const emp = employees.find(e => e.id === selectedEmployee);

    setLoading(true);
    const { error } = await supabase.from('hours_adjustments').insert({
      employee_id: selectedEmployee,
      employee_name: emp?.name || '',
      adjusted_by: currentUser.id,
      adjusted_by_name: currentUser.name,
      adjustment_seconds: totalSeconds,
      reason,
      week_start: weekStart,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to save adjustment', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Hours ${adjustType === 'add' ? 'added' : 'deducted'} successfully` });
      setSelectedEmployee('');
      setHours('');
      setMinutes('');
      setReason('');
      setShowForm(false);
      fetchAdjustments();
    }
    setLoading(false);
  };

  const formatAdjustment = (seconds: number) => {
    const abs = Math.abs(seconds);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const prefix = seconds >= 0 ? '+' : '-';
    return `${prefix}${h}h ${m}m`;
  };

  const filtered = adjustments.filter(a =>
    a.employee_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hours Adjustment</h1>
          <p className="text-muted-foreground">Adjust employee working hours when needed</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Adjustment
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Create Hours Adjustment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Employee</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Week Starting</label>
                <Input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Adjustment Type</label>
                <Select value={adjustType} onValueChange={(v) => setAdjustType(v as 'add' | 'deduct')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Hours</SelectItem>
                    <SelectItem value="deduct">Deduct Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Hours" min="0" value={hours} onChange={e => setHours(e.target.value)} />
                  <Input type="number" placeholder="Minutes" min="0" max="59" value={minutes} onChange={e => setMinutes(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Textarea placeholder="Explain reason for adjustment..." value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : 'Save Adjustment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Adjustment History
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search employee..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No adjustments found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(adj => (
                <div key={adj.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{adj.employee_name}</p>
                    <p className="text-sm text-muted-foreground">{adj.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Week of {new Date(adj.week_start).toLocaleDateString()} • By {adj.adjusted_by_name}
                    </p>
                  </div>
                  <Badge variant={adj.adjustment_seconds >= 0 ? 'default' : 'destructive'} className="self-start sm:self-center text-sm">
                    {formatAdjustment(adj.adjustment_seconds)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HoursAdjustment;
