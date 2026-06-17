import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TicketStatus, Priority } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function statusClass(status: TicketStatus) {
  switch (status) {
    case 'New': return 'status-new';
    case 'Assigned': return 'status-assigned';
    case 'In Progress': return 'status-progress';
    case 'Waiting for User':
    case 'Waiting for Vendor': return 'status-waiting';
    case 'Resolved': return 'status-resolved';
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
  'Software Issue',
  'Network Issue',
  'Access Request',
  'Microsoft 365 / Email',
  'ERP / System Issue',
  'Printer / Scanner',
  'Cybersecurity',
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

export const statuses = [
  'New',
  'Assigned',
  'In Progress',
  'Waiting for User',
  'Waiting for Vendor',
  'Resolved',
  'Closed',
  'Cancelled'
] as const;
