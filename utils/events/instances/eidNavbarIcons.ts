import type { DynamicEvent } from '../types';

export const eidNavbarIconsEvent: DynamicEvent = {
  id: 'eid-navbar-icons',
  enabled: true,
  type: 'NAVBAR_ICONS',
  payload: {
    logo: {
      light: '/Event/eid-said-black-v1.svg',
      dark: '/Event/eid-said-white-v1.svg',
    },
    gradient: {
      colors: ['#FF001F', '#FF7F00', '#FFEF00', '#00F11D', '#0079FF', '#4A00E0', '#8E2DE2'],
    },
    dashboard: 'Moon', // Eid Hilal / Crescent 🌙
    inventory: 'Sparkles', // Festive sparkles ✨
    sales: 'Gift', // Eidiya / Gift icon 🎁
    purchase: 'ShoppingBag', // Eid clothing & holiday shopping 🛍️
    customers: 'Smile', // Warm smiles and greetings 😊
    prescriptions: 'Heart', // Healing, care, and love ❤️
    finance: 'DollarCircle', // Eidiya money distribution 🪙
    reports: 'MoonStar', // Success, achievements, and celebrations 🏆
    hr: 'Home', // Family reunions and Eid gatherings 🏠
    compliance: 'Shield', // Peace and safety during the holiday 🛡️
    settings: 'Star', // Shiniest settings ⭐
    test: 'FlaskConical', // Experimental fun 🧪
  },
  startDate: '2026-05-26T00:00:00Z',
  endDate: '2026-05-30T00:00:00Z',
  targetPages: 'all',
  priority: 100,
};
