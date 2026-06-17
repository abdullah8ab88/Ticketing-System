import type { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'it_manager' | 'agent' | 'staff';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TicketStatus = 'New' | 'Assigned' | 'In Progress' | 'Waiting for User' | 'Waiting for Vendor' | 'Resolved' | 'Closed' | 'Cancelled';
export type CommentVisibility = 'public' | 'internal';



export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  active: boolean;
  pending: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export type Attachment = {
  name: string;
  url: string;
  path: string;
};

export type Ticket = {
  id: string;
  ticketNo: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: TicketStatus;
  department: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  assignedToId?: string;
  assignedToName?: string;
  attachments?: Attachment[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  closedAt?: Timestamp;
};

export type TicketComment = {
  id: string;
  authorId: string;
  authorName: string;
  visibility: CommentVisibility;
  body: string;
  createdAt?: Timestamp;
};
