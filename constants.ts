
import { Service, SalonSettings } from './types';

export const INITIAL_SERVICES: Service[] = [
  { id: '1', name: 'Design de Sobrancelha', price: 45, duration: 30, description: 'Modelagem profissional utilizando técnicas de visagismo para um olhar harmonioso.', isVisible: true },
  { id: '2', name: 'Limpeza de Pele', price: 120, duration: 60, description: 'Protocolo revitalizante com extração profunda e máscaras calmantes de alta performance.', isVisible: true },
  { id: '3', name: 'Manicure & Pedicure', price: 65, duration: 90, description: 'Cuidado completo das unhas com esmaltação premium e hidratação profunda.', isVisible: true },
  { id: '4', name: 'Drenagem Linfática', price: 150, duration: 60, description: 'Massagem manual suave para redução de edema e desintoxicação corporal.', isVisible: true },
];

const defaultAgendaDate = new Date();
defaultAgendaDate.setDate(defaultAgendaDate.getDate() + 15);

export const DEFAULT_SETTINGS: SalonSettings = {
  name: "Studio Moriá Estética",
  primaryColor: "tea", 
  logo: "https://lh3.googleusercontent.com/d/15KFidcKVQniucz9tEtmgKWLLKttnrGgd",
  lastUpdated: Date.now(),
  teamMembers: [
    { id: 'tm1', name: "Moriá (Proprietária)", assignedServiceIds: ['1', '2', '3', '4'] }
  ],
  businessHours: {
    start: "08:00",
    end: "19:00"
  },
  agendaOpenUntil: defaultAgendaDate.toISOString().split('T')[0],
  servicesSectionTitle: "Especialidades",
  servicesSectionSubtitle: "Nossos Procedimentos",
  socialLinks: {
    instagram: "https://www.instagram.com/studio_moria_estetica",
    facebook: "https://facebook.com/studiomoria",
    whatsapp: "+5513997724238",
  },
  usefulLinks: [
    { label: "Nossos Produtos", url: "#" },
    { label: "Blog de Estética", url: "#" },
    { label: "Tratamento de Dados (LGPD)", url: "#" },
  ],
  comments: [
    { author: "Juliana Mendes", text: "O Studio Moriá transformou minha autoestima. A equipe é super atenciosa e o ambiente é maravilhoso!" },
    { author: "Carla Pires", text: "Trabalho impecável nas sobrancelhas. Me sinto sempre renovada quando saio daqui." },
  ],
  photos: [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1787&auto=format&fit=crop",
  ]
};
