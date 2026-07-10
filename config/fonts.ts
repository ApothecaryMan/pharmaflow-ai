export interface FontOption {
  label: string;
  value: string;
  url: string;
}

export const AVAILABLE_FONTS_EN: FontOption[] = [
  {
    label: 'Default',
    value: 'En-Firewall',
    url: '',
  },
  {
    label: 'Inter',
    value: 'Inter',
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap',
  },
  {
    label: 'IBM Plex Sans',
    value: '"IBM Plex Sans"',
    url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@100;200;300;400;500;600;700&display=swap',
  },
];

export const AVAILABLE_FONTS_AR: FontOption[] = [
  {
    label: 'الافتراضي',
    value: 'Ar-Firewall',
    url: '',
  },
  {
    label: 'آي بي إم بليكس',
    value: '"IBM Plex Sans Arabic"',
    url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@100;200;300;400;500;600;700&display=swap',
  },
  {
    label: 'كايرو',
    value: 'Cairo',
    url: 'https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap',
  },
  {
    label: 'المراعي',
    value: 'Almarai',
    url: 'https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap',
  },
  {
    label: 'تجول',
    value: 'Tajawal',
    url: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap',
  },
  {
    label: 'ثمانية سيريف',
    value: '"HeadingFont"',
    url: '',
  },
  {
    label: 'ثمانية سانس',
    value: '"GraphicSansFont"',
    url: '',
  },
];
