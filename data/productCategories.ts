// Product Categories and Types Configuration (Unified)
// This file serves as the single source of truth for product data in all languages.

export const CATEGORIES_DATA = [
  { id: 'Medicine', en: 'Medicine', ar: 'دواء' },
  { id: 'Cosmetics', en: 'Cosmetics', ar: 'تجميل' },
  { id: 'General', en: 'General', ar: 'عام' }
] as const;

export type CategoryId = typeof CATEGORIES_DATA[number]['id'];

// Data structure for product types with translations
interface ProductTypeData {
  en: string; // English Name (Key)
  ar: string; // Arabic Name
}

// Medicine Types
export const MEDICINE_TYPES_DATA: ProductTypeData[] = [
  { en: 'Ampoule', ar: 'أمبول' },
  { en: 'Capsule', ar: 'كبسولة' },
  { en: 'Cream', ar: 'كريم' },
  { en: 'Douche', ar: 'دش مهبلي' },
  { en: 'Drops', ar: 'قطرة' },
  { en: 'Effervescent', ar: 'فوار' },
  { en: 'Enema', ar: 'حقنة شرجية' },
  { en: 'Gel', ar: 'جل' },
  { en: 'Granules', ar: 'حبيبات/أكياس' },
  { en: 'Infusion Bottle', ar: 'محلول' },
  { en: 'Inhaler', ar: 'بخاخ' },
  { en: 'Lozenge', ar: 'استحلاب' },
  { en: 'Mouthwash', ar: 'غسول فم' },
  { en: 'Ointment', ar: 'مرهم' },
  { en: 'Paint', ar: 'مسة' },
  { en: 'Patch', ar: 'لازقة طبية' },
  { en: 'Pessary', ar: 'لبوس مهبلي' },
  { en: 'Prefilled Syringe', ar: 'حقنة معبأة' },
  { en: 'Sachet', ar: 'كيس' },
  { en: 'Spray', ar: 'سبراي' },
  { en: 'Suppository', ar: 'لبوس' },
  { en: 'Suspension', ar: 'معلق' },
  { en: 'Syrup', ar: 'شراب' },
  { en: 'Tablet', ar: 'قرص' },
  { en: 'Vial', ar: 'فيال' }
];

// Cosmetic Types
export const COSMETICS_TYPES_DATA: ProductTypeData[] = [
  { en: 'Body Lotion', ar: 'لوشن للجسم' },
  { en: 'Body Splash', ar: 'بودي سبلاش' },
  { en: 'Conditioner', ar: 'بلسم' },
  { en: 'Deodorant', ar: 'مزيل عرق' },
  { en: 'Face Cream', ar: 'كريم وجه' },
  { en: 'Face Wash', ar: 'غسول وجه' },
  { en: 'Foundation', ar: 'كريم أساس' },
  { en: 'Hair Dye', ar: 'صبغة شعر' },
  { en: 'Hair Mask', ar: 'حمام كريم' },
  { en: 'Hair Oil', ar: 'زيت شعر' },
  { en: 'Lip Balm', ar: 'مرطب شفاه' },
  { en: 'Lipstick', ar: 'روج' },
  { en: 'Mascara', ar: 'ماسكارا' },
  { en: 'Micellar Water', ar: 'ميسيلار' },
  { en: 'Nail Polish', ar: 'طلاء أظافر' },
  { en: 'Perfume', ar: 'عطر' },
  { en: 'Serum', ar: 'سيروم' },
  { en: 'Shampoo', ar: 'شامبو' },
  { en: 'Soap Bar', ar: 'صابونة' },
  { en: 'Sunscreen', ar: 'واقي شمس' },
  { en: 'Toner', ar: 'تونر' },
  { en: 'Wipes', ar: 'مناديل مبللة' }
];

// General Types
export const GENERAL_TYPES_DATA: ProductTypeData[] = [
  { en: 'Baby Food', ar: 'طعام أطفال' },
  { en: 'Baby Milk', ar: 'حليب أطفال' },
  { en: 'Bandage', ar: 'ضمادة/شاش' },
  { en: 'Cannula', ar: 'كانيولا' },
  { en: 'Contact Lenses', ar: 'عدسات لاصقة' },
  { en: 'Cotton & Gauze', ar: 'قطن وشاش' },
  { en: 'Diapers', ar: 'حفاضات' },
  { en: 'Eye Care', ar: 'رعاية العين' },
  { en: 'Feeding Accessories', ar: 'مستلزمات رضاعة' },
  { en: 'First Aid', ar: 'إسعافات أولية' },
  { en: 'Medical Device', ar: 'جهاز طبي' },
  { en: 'Needle', ar: 'سن' },
  { en: 'Oral Care', ar: 'رعاية الفم' },
  { en: 'Orthopedic Support', ar: 'دعامة' },
  { en: 'Paper Products', ar: 'منتجات ورقية' },
  { en: 'Personal Care', ar: 'عناية شخصية' },
  { en: 'Sexual Health', ar: 'صحة جنسية' },
  { en: 'Supplement', ar: 'مكمل غذائي' },
  { en: 'Syringe', ar: 'سرنجة' },
  { en: 'Test Strips', ar: 'شرائط اختبار' },
  { en: 'Thermometer', ar: 'ترمومتر' }
];

// --- Helper Functions ---

/**
 * Get available categories in the specified language, sorted alphabetically.
 */
export const getCategories = (lang: 'en' | 'ar' = 'en'): string[] => {
  const isAr = lang === 'ar';
  return CATEGORIES_DATA.map(c => isAr ? c.ar : c.en).sort((a, b) => a.localeCompare(b, isAr ? 'ar' : 'en'));
};

/**
 * Get product types for a given category (in any language) returned in the target language.
 * Result is sorted alphabetically in the target language.
 */
export const getProductTypes = (categoryName: string, lang: 'en' | 'ar' = 'en'): string[] => {
  // 1. Identify valid category ID from input name (fuzzy match against EN or AR)
  const categoryId = CATEGORIES_DATA.find(c => c.en === categoryName || c.ar === categoryName)?.id;
  
  // 2. Select data source based on ID
  let data: ProductTypeData[] = [];
  switch (categoryId) {
    case 'Medicine': data = MEDICINE_TYPES_DATA; break;
    case 'Cosmetics': data = COSMETICS_TYPES_DATA; break;
    case 'General': data = GENERAL_TYPES_DATA; break;
    default: return []; // Check if maybe the categoryName IS the category ID (fallback)
  }

  // 3. Map to target language and sort
  const isAr = lang === 'ar';
  return data.map(item => isAr ? item.ar : item.en).sort((a, b) => a.localeCompare(b, isAr ? 'ar' : 'en'));
};

/**
 * Check if a specific category Name (in EN or AR) corresponds to the 'Medicine' ID.
 * Useful for conditional logic like showing Active Ingredients.
 */
export const isMedicineCategory = (categoryName: string): boolean => {
  return CATEGORIES_DATA.some(c => c.id === 'Medicine' && (c.en === categoryName || c.ar === categoryName));
};