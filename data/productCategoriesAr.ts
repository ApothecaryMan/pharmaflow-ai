// تكوين فئات المنتج وأنواعه (بالعربية - مرتبة أبجديًا)

export const CATEGORIES_AR = ['دواء', 'تجميل', 'عام'] as const;

export type CategoryAr = typeof CATEGORIES_AR[number];

// أنواع المنتجات لكل فئة
export const MEDICINE_TYPES_AR = [
  'أمبول',             // Ampoule
  'استحلاب',           // Lozenge
  'بخاخ',              // Inhaler
  'جل',                // Gel
  'حبيبات/أكياس',      // Granules
  'حقنة شرجية',        // Enema
  'حقنة معبأة',        // Prefilled Syringe
  'دش مهبلي',          // Douche
  'سبراي',             // Spray
  'شراب',              // Syrup
  'غسول فم',           // Mouthwash
  'فوار',              // Effervescent
  'فيال',              // Vial
  'قرص',               // Tablet
  'قطرة',              // Drops
  'كبسولة',            // Capsule
  'كريم',              // Cream
  'كيس',               // Sachet
  'لازقة طبية',        // Patch
  'لبوس',              // Suppository
  'لبوس مهبلي',        // Pessary
  'محلول',             // Infusion Bottle
  'مرهم',              // Ointment
  'مسة',               // Paint
  'معلق'               // Suspension
];

export const COSMETIC_TYPES_AR = [
  'بلسم',              // Conditioner
  'بودي سبلاش',        // Body Splash
  'تونر',              // Toner
  'حمام كريم',         // Hair Mask
  'روج',               // Lipstick
  'زيت شعر',           // Hair Oil
  'سيروم',             // Serum
  'شامبو',             // Shampoo
  'صابونة',            // Soap Bar
  'صبغة شعر',          // Hair Dye
  'طلاء أظافر',        // Nail Polish
  'عطر',               // Perfume
  'غسول وجه',          // Face Wash
  'كريم أساس',         // Foundation
  'كريم وجه',          // Face Cream
  'لوشن للجسم',        // Body Lotion
  'ماسكارا',           // Mascara
  'مرطب شفاه',         // Lip Balm
  'مزيل عرق',          // Deodorant
  'مناديل مبللة',      // Wipes
  'ميسيلار',           // Micellar Water
  'واقي شمس'           // Sunscreen
];

export const GENERAL_TYPES_AR = [
  'إسعافات أولية',     // First Aid
  'ترمومتر',           // Thermometer
  'جهاز طبي',          // Medical Device
  'حفاضات',            // Diapers
  'حليب أطفال',        // Baby Milk
  'دعامة',             // Orthopedic Support
  'رعاية العين',       // Eye Care
  'رعاية الفم',        // Oral Care
  'سرنجة',             // Syringe
  'سن',                // Needle
  'شرائط اختبار',      // Test Strips
  'صحة جنسية',         // Sexual Health
  'ضمادة/شاش',         // Bandage
  'طعام أطفال',        // Baby Food
  'عدسات لاصقة',       // Contact Lenses
  'عناية شخصية',       // Personal Care
  'قطن وشاش',          // Cotton & Gauze
  'كانيولا',           // Cannula
  'مستلزمات رضاعة',    // Feeding Accessories
  'مكمل غذائي',        // Supplement
  'منتجات ورقية'       // Paper Products
];

// دالة مساعدة للحصول على أنواع المنتجات حسب الفئة
export const getProductTypesAr = (category: string): string[] => {
  switch (category) {
    case 'دواء': return MEDICINE_TYPES_AR;
    case 'تجميل': return COSMETIC_TYPES_AR;
    case 'عام': return GENERAL_TYPES_AR;
    default: return [];
  }
};
