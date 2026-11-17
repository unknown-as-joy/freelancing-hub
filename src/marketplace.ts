export type UserRole = 'admin' | 'client' | 'freelancer';

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  period: string;
  summary: string;
}

export interface UserSummary {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  status: 'active' | 'suspended';
  companyName?: string | null;
  location?: string | null;
  avatarColor: string;
  createdAt: string;
}

export interface FreelancerProfile {
  userId: number;
  name: string;
  username: string;
  email: string;
  avatarColor: string;
  location: string;
  headline: string;
  bio: string;
  hourlyRate: number;
  skills: string[];
  experience: ExperienceItem[];
  portfolioUrl: string;
  availability: 'available' | 'busy' | 'unavailable';
  verified: boolean;
  rating: number;
  reviewCount: number;
  completedProjects: number;
  totalEarned: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  isActive: boolean;
  jobCount?: number;
}

export interface Job {
  id: number;
  clientId: number;
  clientName: string;
  clientCompany: string;
  categoryId: number;
  categoryName: string;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  jobType: 'fixed' | 'hourly';
  experienceLevel: 'entry' | 'intermediate' | 'expert';
  skills: string[];
  deadline: string;
  status: 'open' | 'in_progress' | 'completed' | 'closed';
  featured: boolean;
  applicationCount: number;
  createdAt: string;
}

export interface JobApplication {
  id: number;
  jobId: number;
  jobTitle: string;
  freelancerId: number;
  freelancerName: string;
  freelancerUsername: string;
  freelancerHeadline: string;
  freelancerRating: number;
  clientId: number;
  coverLetter: string;
  bidAmount: number;
  deliveryDays: number;
  status: 'pending' | 'shortlisted' | 'hired' | 'rejected';
  createdAt: string;
}

export interface ServicePackage {
  id: number;
  freelancerId: number;
  freelancerName: string;
  freelancerUsername: string;
  freelancerHeadline: string;
  freelancerRating: number;
  categoryId: number;
  categoryName: string;
  title: string;
  description: string;
  price: number;
  deliveryDays: number;
  revisions: number;
  features: string[];
  status: 'active' | 'paused';
  createdAt: string;
}

export interface Project {
  id: number;
  orderCode: string;
  jobId: number | null;
  serviceId: number | null;
  clientId: number;
  clientName: string;
  freelancerId: number;
  freelancerName: string;
  title: string;
  description: string;
  agreedAmount: number;
  progress: number;
  deliverableNotes: string;
  deliverableUrl: string;
  paymentStatus: 'unpaid' | 'escrow' | 'released';
  status: 'active' | 'in_review' | 'completed' | 'cancelled';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: number;
  projectId: number;
  projectTitle: string;
  orderCode: string;
  clientId: number;
  clientName: string;
  freelancerId: number;
  freelancerName: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'refunded';
  referenceCode: string;
  createdAt: string;
}

export interface TransactionRecord {
  id: number;
  userId: number;
  userName: string;
  projectId: number | null;
  type: 'escrow_deposit' | 'freelancer_payout' | 'platform_commission' | 'withdrawal' | 'refund';
  amount: number;
  direction: 'credit' | 'debit';
  description: string;
  status: 'completed' | 'pending';
  createdAt: string;
}

export interface MessageThread {
  partnerId: number;
  partnerName: string;
  partnerUsername: string;
  partnerRole: UserRole;
  partnerAvatarColor: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  projectId: number | null;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  category: 'job' | 'project' | 'payment' | 'message' | 'review' | 'system';
  isRead: boolean;
  createdAt: string;
}

export interface ReviewItem {
  id: number;
  projectId: number;
  projectTitle: string;
  clientId: number;
  clientName: string;
  freelancerId: number;
  freelancerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface WebsiteSettings {
  siteName: string;
  ownerName: string;
  tagline: string;
  supportEmail: string;
  commissionPercent: number;
  currencySymbol: string;
  maintenanceMode: boolean;
  announcementText: string;
}

export interface RevenueSeries {
  daily: { labels: string[]; gross: number[]; commission: number[] };
  weekly: { labels: string[]; gross: number[]; commission: number[] };
  monthly: { labels: string[]; gross: number[]; commission: number[] };
  yearly: { labels: string[]; gross: number[]; commission: number[] };
}
