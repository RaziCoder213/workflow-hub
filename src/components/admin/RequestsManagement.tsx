import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { LeaveRequest, OvertimeRequest } from '@/types';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  FileText,
  Loader2,
  CalendarCheck,
  CalendarX,
  AlertCircle,
  Search,
  Filter,
  CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';

interface RequestsManagementProps {
  type: 'leaves' | 'overtime';
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  onRefresh: () => void;
}

export const RequestsManagement: React.FC<RequestsManagementProps> = ({
  type,
  leaveRequests,
  overtimeRequests,
  onRefresh,
}) => {
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [leaveType, setLeaveType] = useState('all');

  const handleLeaveAction = async (id: string, status: 'Approved' | 'Rejected') => {
    setProcessing(id);
    const { error } = await supabase.from('leaves').update({ status }).eq('id', id);
    if (error) {
      toast.error('Failed to update leave request');
    } else {
      toast.success(`Leave request ${status.toLowerCase()}`);
      onRefresh();
    }
    setProcessing(null);
  };

  const handleOvertimeAction = async (id: string, status: 'Approved' | 'Rejected') => {
    setProcessing(id);
    const { error } = await supabase.from('overtime').update({ status }).eq('id', id);
    if (error) {
      toast.error('Failed to update overtime request');
    } else {
      toast.success(`Overtime request ${status.toLowerCase()}`);
      onRefresh();
    }
    setProcessing(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>;
    }
  };

  const StatCard = ({ icon: Icon, value, label, color }: { icon: any; value: number; label: string; color: string }) => (
    <Card className="bg-card border border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            color.includes('amber') ? 'bg-amber-100' : 
            color.includes('green') ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Filtering logic
  const applyFilters = <T extends { userName: string; status: string }>(
    items: T[], 
    getDate: (item: T) => string
  ) => {
    return items.filter(item => {
      // Status filter
      if (activeTab === 'pending' && item.status !== 'Pending') return false;
      if (activeTab === 'approved' && item.status !== 'Approved') return false;
      if (activeTab === 'rejected' && item.status !== 'Rejected') return false;
      
      // Search filter
      if (search && !item.userName.toLowerCase().includes(search.toLowerCase())) return false;
      
      // Date range filter
      const itemDate = getDate(item);
      if (dateFrom && itemDate < dateFrom) return false;
      if (dateTo && itemDate > dateTo) return false;

      return true;
    });
  };

  if (type === 'leaves') {
    const filteredLeaves = useMemo(() => {
      let items = applyFilters(leaveRequests, (r) => r.startDate);
      if (leaveType !== 'all') {
        items = items.filter(r => r.type === leaveType);
      }
      return items;
    }, [leaveRequests, activeTab, search, dateFrom, dateTo, leaveType]);

    const pendingCount = leaveRequests.filter(l => l.status === 'Pending').length;
    const approvedCount = leaveRequests.filter(l => l.status === 'Approved').length;
    const rejectedCount = leaveRequests.filter(l => l.status === 'Rejected').length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leave Requests</h1>
          <p className="text-muted-foreground mt-1">Review and manage employee leave applications</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={AlertCircle} value={pendingCount} label="Pending" color="text-amber-600" />
          <StatCard icon={CalendarCheck} value={approvedCount} label="Approved" color="text-green-600" />
          <StatCard icon={CalendarX} value={rejectedCount} label="Rejected" color="text-red-600" />
        </div>

        {/* Filters */}
        <Card className="bg-card border border-border">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="w-full lg:w-44">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Sick">Sick</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full lg:w-40" placeholder="From" />
                <span className="text-muted-foreground">—</span>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full lg:w-40" placeholder="To" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border">
          <CardHeader className="pb-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid w-full sm:w-auto grid-cols-3 h-12">
                <TabsTrigger value="pending" className="gap-2 px-6">
                  Pending
                  {pendingCount > 0 && <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2 px-6">Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2 px-6">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {filteredLeaves.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-foreground">No matching leave requests</p>
                <p className="text-muted-foreground">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLeaves.map((request) => (
                  <div key={request.id} className="p-5 bg-muted/30 border border-border rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-semibold text-primary">
                            {request.userName?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground text-lg">{request.userName}</span>
                            <Badge variant="outline" className="font-medium">{request.type}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">
                              {new Date(request.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} 
                              {' — '}
                              {new Date(request.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{request.reason}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 ml-16 lg:ml-0">
                        {request.status === 'Pending' ? (
                          <>
                            <Button
                              onClick={() => handleLeaveAction(request.id, 'Approved')}
                              disabled={processing === request.id}
                              className="bg-green-600 hover:bg-green-700 h-10 px-5"
                            >
                              {processing === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleLeaveAction(request.id, 'Rejected')}
                              disabled={processing === request.id}
                              className="h-10 px-5"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          getStatusBadge(request.status)
                        )}
                      </div>
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

  // Overtime requests
  const filteredOvertime = useMemo(() => {
    return applyFilters(overtimeRequests, (r) => r.date);
  }, [overtimeRequests, activeTab, search, dateFrom, dateTo]);

  const pendingCount = overtimeRequests.filter(o => o.status === 'Pending').length;
  const approvedCount = overtimeRequests.filter(o => o.status === 'Approved').length;
  const rejectedCount = overtimeRequests.filter(o => o.status === 'Rejected').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Overtime Requests</h1>
        <p className="text-muted-foreground mt-1">Review and manage additional hours requests</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={AlertCircle} value={pendingCount} label="Pending" color="text-amber-600" />
        <StatCard icon={CheckCircle} value={approvedCount} label="Approved" color="text-green-600" />
        <StatCard icon={XCircle} value={rejectedCount} label="Rejected" color="text-red-600" />
      </div>

      {/* Filters */}
      <Card className="bg-card border border-border">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full lg:w-40" />
              <span className="text-muted-foreground">—</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full lg:w-40" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border">
        <CardHeader className="pb-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full sm:w-auto grid-cols-3 h-12">
              <TabsTrigger value="pending" className="gap-2 px-6">
                Pending
                {pendingCount > 0 && <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2 px-6">Approved</TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2 px-6">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredOvertime.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-foreground">No matching overtime requests</p>
              <p className="text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOvertime.map((request) => (
                <div key={request.id} className="p-5 bg-muted/30 border border-border rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-primary">
                          {request.userName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-foreground text-lg">{request.userName}</span>
                          <Badge variant="outline" className="font-medium">{request.hours} hours</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            <span className="font-medium">{request.project}</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(request.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{request.reason}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-16 lg:ml-0">
                      {request.status === 'Pending' ? (
                        <>
                          <Button
                            onClick={() => handleOvertimeAction(request.id, 'Approved')}
                            disabled={processing === request.id}
                            className="bg-green-600 hover:bg-green-700 h-10 px-5"
                          >
                            {processing === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleOvertimeAction(request.id, 'Rejected')}
                            disabled={processing === request.id}
                            className="h-10 px-5"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        getStatusBadge(request.status)
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestsManagement;
