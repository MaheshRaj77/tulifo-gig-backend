// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'worker' | 'client' | 'admin' | 'support';
  avatarUrl?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkerProfile {
  userId: string;
  title?: string;
  bio?: string;
  skills: string[];
  hourlyRate?: number;
  currency: string;
  location?: string;
  timezone?: string;
  availability: AvailabilitySlot[];
  portfolio: PortfolioItem[];
  rating: number;
  reviewCount: number;
  completedJobs: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientProfile {
  userId: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  location?: string;
  timezone?: string;
  projectsPosted: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface PortfolioItem {
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
}

// Project Types
export interface Project {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  skills: string[];
  budget: Budget;
  duration?: Duration;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  type: 'fixed' | 'hourly';
  min?: number;
  max?: number;
  amount?: number;
  currency: string;
}

export interface Duration {
  min?: number;
  max?: number;
  unit: 'hours' | 'days' | 'weeks' | 'months';
}

export type ProjectStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
export type ProjectVisibility = 'public' | 'private' | 'invite_only';

// Bid Types
export interface Bid {
  id: string;
  projectId: string;
  workerId: string;
  amount: number;
  currency: string;
  proposal?: string;
  estimatedDuration?: number;
  status: BidStatus;
  createdAt: Date;
}

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

// Booking Types
export interface Booking {
  id: string;
  workerId: string;
  clientId: string;
  projectId?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  hourlyRate: number;
  totalAmount: number;
  currency: string;
  status: BookingStatus;
  meetingUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface BlockedSlot {
  id: string;
  workerId: string;
  startTime: Date;
  endTime: Date;
  reason?: string;
  createdAt: Date;
}

// Payment Types
export interface Payment {
  id: string;
  bookingId?: string;
  projectId?: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  createdAt: Date;
  completedAt?: Date;
}

export type PaymentMethod = 'card' | 'bank_transfer' | 'paypal' | 'crypto';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface Payout {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stripePayoutId?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Message Types
export interface Conversation {
  id: string;
  participants: string[];
  projectId?: string;
  lastMessage?: Message;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  attachments: Attachment[];
  readBy: string[];
  createdAt: Date;
}

export type MessageType = 'text' | 'file' | 'image' | 'system';

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export type NotificationType = 
  | 'bid_received'
  | 'bid_accepted'
  | 'bid_rejected'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'payment_sent'
  | 'message_received'
  | 'review_received';

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';

// Review Types
export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  tags: string[];
  createdAt: Date;
}

// Event Types for RabbitMQ
export interface Event {
  type: EventType;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type EventType =
  | 'user.created'
  | 'user.updated'
  | 'project.created'
  | 'project.updated'
  | 'bid.created'
  | 'bid.accepted'
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.completed'
  | 'payment.completed'
  | 'review.created';

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth Types
export interface TokenPayload {
  userId: string;
  email: string;
  role: User['role'];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
