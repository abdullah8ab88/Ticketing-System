import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import type { TicketStatus, Priority } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(timestamp?: Timestamp) {
  if (!timestamp) return '—';
  return format(timestamp.toDate(), 'MMM d, yyyy · h:mm a');
}

export function statusClass(status: TicketStatus) {
  switch (status) {
    case 'New': return 'status-new';
    case 'In Progress': return 'status-progress';
    case 'Closed': return 'status-closed';
    case 'Cancelled': return 'status-cancelled';
    default: return 'status-new';
  }
}

export function priorityClass(priority: Priority) {
  switch (priority) {
    case 'Urgent': return 'bg-rose-50 text-rose-700';
    case 'High': return 'bg-orange-50 text-orange-700';
    case 'Medium': return 'bg-amber-50 text-amber-700';
    case 'Low': return 'bg-slate-100 text-slate-600';
  }
}

export const categories = [
  'Hardware Issue',
  'New device',
  'Software Issue',
  'Network Issue',
  'Access Request',
  'Microsoft 365 / Email',
  'ERP / System Issue',
  'Printer / Scanner',
  'Other'
];

export const departments = [
  'IT',
  'Finance',
  'HR',
  'Operations',
  'Sales',
  'Control Room',
  'Medical Services',
  'Supply Chain',
  'Management'
];

export const employeeDepartments = [
  'Medical Services Delivery',
  'Service Prep & Supply Chain',
  'Control Command Centre',
  'Human Resources',
  'Finance',
  'Information Technology',
  'Sales / Business Development',
  'Management',
  'Other'
];

export const statuses = [
  'New',
  'In Progress',
  'Closed',
  'Cancelled'
] as const;
