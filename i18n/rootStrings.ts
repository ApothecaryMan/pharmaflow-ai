/**
 * Root-level strings used by App.tsx before any lazy-loaded content.
 * Kept intentionally tiny (~20 lines) so the main bundle never pulls the
 * full TRANSLATIONS object (6,106 lines / 238 KB).
 */
import type { Language } from '../types';

interface RootStrings {
  global: { loading: string };
  settings: {
    storageQuota: {
      warningTitle: string;
      warningMessage: string;
      criticalTitle: string;
      criticalMessage: string;
    };
  };
}

export const ROOT_STRINGS: Record<Language, RootStrings> = {
  EN: {
    global: { loading: 'Loading...' },
    settings: {
      storageQuota: {
        warningTitle: 'Storage Space Warning',
        warningMessage:
          'Local storage usage is high ({{percentage}}% of {{limit}}MB used). Please clear older branches or browser cache to avoid losing data.',
        criticalTitle: 'Storage Full',
        criticalMessage:
          'Failed to save data. Local storage limit exceeded. Please free up space immediately.',
      },
    },
  },
  AR: {
    global: { loading: 'جاري التحميل...' },
    settings: {
      storageQuota: {
        warningTitle: 'تحذير من مساحة التخزين',
        warningMessage:
          'مساحة التخزين للمتصفح المستخدمة مرتفعة (تم استخدام {{percentage}}% من أصل {{limit}} ميجابايت). يرجى مسح الفروع القديمة أو كاش المتصفح لتجنب فقدان البيانات.',
        criticalTitle: 'مساحة التخزين ممتلئة',
        criticalMessage:
          'فشل في حفظ البيانات. تم تجاوز الحد الأقصى للتخزين المحلي. يرجى توفير مساحة فوراً.',
      },
    },
  },
};
