
export enum View {
  CUSTOMER_HOME = 'CUSTOMER_HOME',
  CUSTOMER_LOGIN = 'CUSTOMER_LOGIN',
  CUSTOMER_REGISTER = 'CUSTOMER_REGISTER',
  CUSTOMER_PROFILE = 'CUSTOMER_PROFILE',
  CUSTOMER_DASHBOARD = 'CUSTOMER_DASHBOARD',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  ADMIN_CALENDAR = 'ADMIN_CALENDAR',
  ADMIN_FINANCE = 'ADMIN_FINANCE',
  ADMIN_CLIENTS = 'ADMIN_CLIENTS',
  ADMIN_CONFIRMATIONS = 'ADMIN_CONFIRMATIONS',
  ADMIN_SETTINGS = 'ADMIN_SETTINGS',
  ADMIN_MARKETING = 'ADMIN_MARKETING'
}

export interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  cpf: string;
  password?: string;
  profilePhoto?: string;
  receivesNotifications: boolean;
  agreedToTerms: boolean;
  history: Booking[];
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  category: string; 
  isVisible: boolean;
  isHighlighted?: boolean;
}

export interface BusinessHours {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface TeamMember {
  id: string;
  name: string;
  username: string; // Novo campo para login digitado
  password?: string;
  role: 'owner' | 'staff';
  assignedServiceIds: string[];
  businessHours?: BusinessHours;
  offDays?: number[]; 
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  teamMemberId?: string;
  teamMemberName?: string;
  dateTime: string;
  duration: number;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'blocked' | 'liberated';
  depositStatus: 'pending' | 'paid'; 
  rescheduledCount?: number; 
  agreedToCancellationPolicy: boolean;
  policyAgreedAt: string;
  policyAgreedText: string; 
  cancelledAt?: string;
  promotionId?: string;
  promotionTitle?: string;
  originalPrice?: number;
  discountApplied?: number;
  finalPrice?: number;
}

export interface WaitlistEntry {
  id: string;
  customerId: string;
  customerName: string;
  customerWhatsapp: string;
  serviceId: string;
  serviceName: string;
  preferredDate: string;
  status: 'active' | 'cancelled' | 'notified';
  createdAt: string;
  cancelledAt?: string | null;
}

export interface Promotion {
  id: string;
  title: string;
  content: string;
  type: 'promotion' | 'tip';
  discountPercentage: number; 
  applicableServiceIds: string[]; 
  linkedServiceId?: string; 
  targetCustomerIds: string[]; 
  startDate: string;
  endDate: string;
  createdAt: string;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  type: 'payable' | 'receivable';
  description: string;
  amount: number;
  date: string;
  dueDate?: string;
  status: 'pending' | 'paid';
  customerId?: string;
  customerName?: string;
  teamMemberId?: string; 
  promotionId?: string;
  paidAt?: string;
}

export interface SalonSettings {
  name: string;
  primaryColor: string;
  logo: string;
  address?: string;
  googleMapsLink?: string;
  lastUpdated: number;
  visitCount?: number;
  teamMembers: TeamMember[];
  businessHours: BusinessHours;
  agendaOpenUntil?: string;
  servicesSectionTitle?: string;
  servicesSectionSubtitle?: string;
  usefulLinks?: { label: string; url: string }[];
  comments?: { author: string; text: string }[];
  photos?: string[];
  socialLinks: {
    instagram: string;
    facebook: string;
    whatsapp: string;
  };
}
