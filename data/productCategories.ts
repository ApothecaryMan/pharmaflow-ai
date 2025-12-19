// Product Categories and Types Configuration (Sorted Alphabetically)

export const CATEGORIES = ['Medicine', 'Cosmetics', 'General'] as const;

export type Category = typeof CATEGORIES[number];

// Product types for each category - Sorted A to Z
export const MEDICINE_TYPES = [
  'Ampoule',
  'Capsule',
  'Cream',
  'Douche',
  'Drops',
  'Effervescent',
  'Enema',
  'Gel',
  'Granules',
  'Infusion Bottle',
  'Inhaler',
  'Lozenge',
  'Mouthwash',
  'Ointment',
  'Paint',
  'Patch',
  'Pessary',
  'Prefilled Syringe',
  'Sachet',
  'Spray',
  'Suppository',
  'Suspension',
  'Syrup',
  'Tablet',
  'Vial'
];

export const COSMETIC_TYPES = [
  'Body Lotion',
  'Body Splash',
  'Conditioner',
  'Deodorant',
  'Face Cream',
  'Face Wash',
  'Foundation',
  'Hair Dye',
  'Hair Mask',
  'Hair Oil',
  'Lip Balm',
  'Lipstick',
  'Mascara',
  'Micellar Water',
  'Nail Polish',
  'Perfume',
  'Serum',
  'Shampoo',
  'Soap Bar',
  'Sunscreen',
  'Toner',
  'Wipes'
];

export const GENERAL_TYPES = [
  'Baby Food',
  'Baby Milk',
  'Bandage',
  'Cannula',
  'Contact Lenses',
  'Cotton & Gauze',
  'Diapers',
  'Eye Care',
  'Feeding Accessories',
  'First Aid',
  'Medical Device',
  'Needle',
  'Oral Care',
  'Orthopedic Support',
  'Paper Products',
  'Personal Care',
  'Sexual Health',
  'Supplement',
  'Syringe',
  'Test Strips',
  'Thermometer'
];

// Helper function to get product types by category
export const getProductTypes = (category: string): string[] => {
  switch (category) {
    case 'Medicine': return MEDICINE_TYPES;
    case 'Cosmetics': return COSMETIC_TYPES;
    case 'General': return GENERAL_TYPES;
    default: return [];
  }
};