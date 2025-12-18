import { InvoiceTemplateOptions } from '../../components/sales/InvoiceTemplate';

interface SavedTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  options: InvoiceTemplateOptions;
}

/**
 * Loads the default receipt template from localStorage.
 * This ensures that printing across the app uses the configuration from the Receipt Designer.
 */
export function getDefaultTemplateOptions(language: 'EN' | 'AR'): InvoiceTemplateOptions {
  try {
    const saved = localStorage.getItem('receipt_templates');
    if (saved) {
      const templates: SavedTemplate[] = JSON.parse(saved);
      const defaultTemplate = templates.find(t => t.isDefault);
      if (defaultTemplate) {
        return { ...defaultTemplate.options, language };
      }
    }
  } catch (e) {
    console.error('Failed to load default template from localStorage', e);
  }

  // Fallback to legacy key if new templates system isn't found
  try {
    const legacy = localStorage.getItem('invoice_template_options');
    if (legacy) {
      return { ...JSON.parse(legacy), language };
    }
  } catch (e) {
      // Ignore
  }

  // Final fallback (hardcoded defaults)
  return {
    storeName: language === 'AR' ? 'صيدلية فارما فلو' : 'PharmaFlow Pharmacy',
    storeSubtitle: language === 'AR' ? 'نظام إدارة الصيدليات' : 'Pharmacy Management System',
    language
  };
}
