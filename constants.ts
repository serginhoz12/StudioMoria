
import { Service, SalonSettings, InventoryItem } from './types';

export const APP_VERSION = "1.0.9";
export const LAST_UPDATE_DATE = "04/03";

export const INITIAL_SERVICES: Service[] = [
  { id: '1', name: 'Design de Sobrancelha', price: 45, duration: 30, description: 'Modelagem profissional utilizando técnicas de visagismo para um olhar harmonioso.', category: 'Olhar', isVisible: true, isHighlighted: false },
  { id: '2', name: 'Limpeza de Pele', price: 120, duration: 60, description: 'Protocolo revitalizante com extração profunda e máscaras calmantes de alta performance.', category: 'Rosto', isVisible: true, isHighlighted: false },
  { id: '3', name: 'Manicure & Pedicure', price: 65, duration: 90, description: 'Cuidado completo das unhas com esmaltação premium e hidratação profunda.', category: 'Unhas', isVisible: true, isHighlighted: false },
  { id: '4', name: 'Drenagem Linfática', price: 150, duration: 60, description: 'Massagem manual suave para redução de edema e desintoxicação corporal.', category: 'Corpo', isVisible: true, isHighlighted: false },
];

const defaultAgendaDate = new Date();
defaultAgendaDate.setDate(defaultAgendaDate.getDate() + 15);

export const DEFAULT_SETTINGS: SalonSettings = {
  name: "Studio Moriá Estética",
  primaryColor: "tea", 
  logo: "https://lh3.googleusercontent.com/d/15KFidcKVQniucz9tEtmgKWLLKttnrGgd",
  address: "Rua Santa Monica, Sítio Novo - Cubatão SP",
  googleMapsLink: "https://www.google.com/maps/search/?api=1&query=-23.9004600,-46.4425140",
  lastUpdated: Date.now(),
  visitCount: 0,
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
  ],
  loyaltyConfig: {
    enabled: true,
    pointsPerReal: 1,
    minPointsToRedeem: 500,
    rewardDescription: "R$ 50,00 de desconto em qualquer procedimento"
  }
};

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'i1', name: 'Cera Depilatória Mel', category: 'Depilação', quantity: 5, minQuantity: 2, unit: 'kg', lastRestockedAt: new Date().toISOString() },
  { id: 'i2', name: 'Shampoo Pós-Química', category: 'Cabelo', quantity: 12, minQuantity: 5, unit: 'un', lastRestockedAt: new Date().toISOString() },
  { id: 'i3', name: 'Esmalte Vermelho Paixão', category: 'Unhas', quantity: 3, minQuantity: 5, unit: 'un', lastRestockedAt: new Date().toISOString() },
];
