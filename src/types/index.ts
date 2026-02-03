export type UserRole = 'Admin' | 'HR' | 'Employee';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  phoneNumber?: string;
  birthday?: string;
  avatar?: string;
  status?: UserStatus;
  created_at?: string;
  auth_user_id?: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  permission: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  totalWorkingSeconds: number;
  status: 'active' | 'completed' | 'idle-checkout' | 'lunch-checkout' | 'system-checkout';
  isWFH: boolean;
  created_at?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  type: 'Sick' | 'Casual' | 'Annual';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at?: string;
}

export interface OvertimeRequest {
  id: string;
  userId: string;
  userName: string;
  project: string;
  hours: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
  created_at?: string;
}

export interface BreakSchedule {
  day_of_week: number;
  start_hour: number;
  end_hour: number;
}

export interface PerformanceReview {
  id: string;
  userId: string;
  reviewerId: string;
  workPerformance: number;
  qualityResults: number;
  attendanceBehavior: number;
  officePolicies: number;
  teamContribution: number;
  comments?: string;
  reviewDate: string;
  created_at?: string;
}
