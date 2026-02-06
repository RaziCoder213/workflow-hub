import React from 'react';
import { User, LeaveRequest, OvertimeRequest } from '@/types';
import AdminCommandCenter from '@/components/admin/AdminCommandCenter';
import EmployeeManagement from '@/components/admin/EmployeeManagement';
import RolePermissions from '@/components/admin/RolePermissions';
import PerformanceManagement from '@/components/admin/PerformanceManagement';
import RequestsManagement from '@/components/admin/RequestsManagement';
import BreakScheduleManagement from '@/components/admin/BreakScheduleManagement';
import RewardsManagement from '@/components/admin/RewardsManagement';
import HolidayManagement from '@/components/admin/HolidayManagement';

interface ManagementProps {
  view: string;
  currentUser: User;
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  onRefresh: () => void;
  onNavigate: (view: string) => void;
}

export const Management: React.FC<ManagementProps> = ({ 
  view, 
  currentUser,
  leaveRequests, 
  overtimeRequests,
  onRefresh,
  onNavigate,
}) => {
  switch (view) {
    case 'command':
      return <AdminCommandCenter onNavigate={onNavigate} />;
    
    case 'employees':
      return <EmployeeManagement currentUser={currentUser} />;
    
    case 'permissions':
      return <RolePermissions />;
    
    case 'performance':
      return <PerformanceManagement currentUser={currentUser} />;
    
    case 'leaves':
      return (
        <RequestsManagement
          type="leaves"
          leaveRequests={leaveRequests}
          overtimeRequests={overtimeRequests}
          onRefresh={onRefresh}
        />
      );
    
    case 'overtime':
      return (
        <RequestsManagement
          type="overtime"
          leaveRequests={leaveRequests}
          overtimeRequests={overtimeRequests}
          onRefresh={onRefresh}
        />
      );
    
    case 'breaks':
      return <BreakScheduleManagement />;
    
    case 'rewards':
      return <RewardsManagement />;
    
    case 'holidays':
      return <HolidayManagement />;
    
    default:
      return <AdminCommandCenter onNavigate={onNavigate} />;
  }
};

export default Management;
