
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
  ADMIN_VEO = 'ADMIN_VEO',
  ADMIN_SETTINGS = 'ADMIN_SETTINGS'
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
  isVisible: boolean;
}

export interface BusinessHours {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface TeamMember {
  id: string;
  name: string;
  assignedServiceIds: string[];
  businessHours?: BusinessHours; // Horário individual opcional
  offDays?: number[]; // Dias de folga (0-6, onde 0 é domingo)
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
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'blocked';
  depositStatus: 'pending' | 'paid'; // NOVO: Controle de sinal
  rescheduledCount?: number; 
}

export interface WaitlistEntry {
  id: string;
  customerId: string;
  customerName: string;
  customerWhatsapp: string;
  serviceId: string;
  serviceName: string;
  preferredDate: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'payable' | 'receivable';
  description: string;
  amount: number;
  date: string;
  dueDate?: string;
  paidAt?: string; 
  status: 'pending' | 'paid';
  customerId?: string;
  customerName?: string;
  serviceId?: string;
  serviceName?: string;
  observation?: string;
}

export interface SalonSettings {
  name: string;
  primaryColor: string;
  logo: string;
  lastUpdated: number;
  teamMembers: TeamMember[];
  businessHours: BusinessHours;
  servicesSectionTitle?: string;
  servicesSectionSubtitle?: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    whatsapp: string;
  };
  usefulLinks: Array<{ label: string; url: string }>;
  comments: Array<{ author: string; text: string }>;
  photos: string[];
}
