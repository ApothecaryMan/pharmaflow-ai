import fs from 'fs';
import path from 'path';
import { MENU_TRANSLATIONS } from '../i18n/menuTranslations.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';

interface ValidationResult {
  file: string;
  missing: string[];
  typeErrors: string[];
  warnings: string[];
  extraKeys: string[];
  isValid: boolean;
}

interface CodeHardcodeIssue {
  file: string;
  line: number;
  content: string;
  severity: 'error' | 'warning';
}

interface DetailedReport {
  timestamp: string;
  results: ValidationResult[];
  hardcodeIssues: CodeHardcodeIssue[];
  stats: {
    total: number;
    valid: number;
    failed: number;
    totalErrors: number;
    totalWarnings: number;
    hardcodedTextFound: number;
  };
}

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

// أنماط للبحث عن نصوص بدون ترجمة
const HARDCODE_PATTERNS = [
  // جميع النصوص بين علامات الاقتباس
  /"([^"]{3,})"(?![\s]*:)/g, // "text"
  /'([^']{3,})'(?![\s]*:)/g, // 'text'
  />([A-Z][^<]{3,})</g, // >Text<
];

// الاستثناءات (لا تحتاج ترجمة)
const IGNORED_PATTERNS = [
  /^[0-9]+$/, // أرقام فقط
  /^[A-Z0-9\-._]+$/, // IDs, UUIDs
  /^https?:\/\//, // URLs
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Emails
  /^\+?[0-9\-\s()]+$/, // Phone numbers
  /^[A-Z]{2,}$/, // اختصارات مثل OK, AR, EN
  /^[a-z]{1,3}$/, // متغيرات قصيرة (id, key, val, etc)
  /^[a-zA-Z_$][a-zA-Z0-9_$]*$/, // أسماء المتغيرات
  /^true|false|null|undefined$/i, // القيم البرمجية
  /^\.{3}$/, // علامات الحذف
];

// الكلمات الشائعة التي قد تكون متغيرات برمجية
const COMMON_TECHNICAL_WORDS = [
  'data',
  'error',
  'loading',
  'success',
  'warning',
  'info',
  'debug',
  'value',
  'name',
  'type',
  'status',
  'state',
  'props',
  'children',
  'className',
  'style',
  'onClick',
  'onChange',
  'disabled',
  'required',
];

class TranslationValidator {
  private results: ValidationResult[] = [];
  private hardcodeIssues: CodeHardcodeIssue[] = [];
  private stats = {
    total: 0,
    valid: 0,
    failed: 0,
    totalErrors: 0,
    totalWarnings: 0,
    hardcodedTextFound: 0,
  };
  private reportPath: string;
  private componentPath: string;

  constructor(reportPath?: string, componentPath?: string) {
    this.reportPath = reportPath || './translation-report.json';
    this.componentPath = componentPath || './components';
  }

  validate(): boolean {
    console.log(
      `${colors.cyan}${colors.bold}🔍 بدء الفحص الشامل للترجمات والنصوص المدمجة...${colors.reset}\n`
    );

    // 1. فحص ملفات الترجمة
    this.validateTranslationFiles();

    // 2. فحص النصوص المدمجة في الكود
    console.log(
      `${colors.magenta}${colors.bold}\n🔎 فحص النصوص المدمجة في الكود...${colors.reset}\n`
    );
    this.scanForHardcodedText();

    this.printReport();
    this.exportReport();

    return this.stats.failed === 0 && this.stats.hardcodedTextFound === 0;
  }

  private validateTranslationFiles(): void {
    console.log(`${colors.bold}📋 فحص ملفات الترجمة...${colors.reset}`);

    this.validateFile('translations.ts', TRANSLATIONS.EN, TRANSLATIONS.AR);
    this.validateFile('menuTranslations.ts', MENU_TRANSLATIONS.EN, MENU_TRANSLATIONS.AR);
  }

  private validateFile(fileName: string, enObj: any, arObj: any): void {
    const result: ValidationResult = {
      file: fileName,
      missing: [],
      typeErrors: [],
      warnings: [],
      extraKeys: [],
      isValid: true,
    };

    this.compareObjects(enObj, arObj, 'root', result);

    this.stats.total++;
    if (result.isValid && result.warnings.length === 0) {
      this.stats.valid++;
    } else {
      this.stats.failed++;
    }

    this.stats.totalErrors += result.missing.length + result.typeErrors.length;
    this.stats.totalWarnings += result.warnings.length + result.extraKeys.length;

    this.results.push(result);
  }

  private compareObjects(
    enObj: any,
    arObj: any,
    currentPath: string,
    result: ValidationResult
  ): void {
    const enKeys = Object.keys(enObj);
    const arKeys = new Set(Object.keys(arObj));

    for (const key of enKeys) {
      const path = currentPath === 'root' ? key : `${currentPath}.${key}`;

      if (!Object.hasOwn(arObj, key)) {
        result.missing.push(path);
        result.isValid = false;
        continue;
      }

      if (typeof enObj[key] === 'string' && typeof arObj[key] === 'string') {
        if (!arObj[key] || arObj[key].trim().length === 0) {
          result.warnings.push(`${path} - ترجمة فارغة`);
        }
        const lengthDiff = Math.abs(enObj[key].length - arObj[key].length);
        if (lengthDiff > 50 && enObj[key].length > 20) {
          result.warnings.push(`${path} - فرق كبير في الطول`);
        }
      }

      if (typeof enObj[key] === 'object' && enObj[key] !== null && !Array.isArray(enObj[key])) {
        if (typeof arObj[key] !== 'object' || Array.isArray(arObj[key])) {
          result.typeErrors.push(`${path}: عدم توافق النوع`);
          result.isValid = false;
        } else {
          this.compareObjects(enObj[key], arObj[key], path, result);
        }
      } else if (Array.isArray(enObj[key]) !== Array.isArray(arObj[key])) {
        result.typeErrors.push(`${path}: عدم توافق المصفوفة`);
        result.isValid = false;
      }
    }

    if (currentPath === 'root') {
      const enKeysSet = new Set(enKeys);
      for (const arKey of arKeys) {
        if (!enKeysSet.has(arKey)) {
          result.extraKeys.push(arKey);
          result.warnings.push(`مفتاح إضافي: ${arKey}`);
        }
      }
    }
  }

  private scanForHardcodedText(): void {
    if (!fs.existsSync(this.componentPath)) {
      console.log(
        `${colors.yellow}⚠️  مجلد المكونات غير موجود: ${this.componentPath}${colors.reset}`
      );
      return;
    }

    const files = this.getAllComponentFiles(this.componentPath);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // تخطي التعليقات وملفات الترجمة
          if (
            line.trim().startsWith('//') ||
            line.trim().startsWith('*') ||
            file.includes('i18n')
          ) {
            return;
          }

          // تخطي الأسطر التي تحتوي على TRANSLATIONS
          if (line.includes('TRANSLATIONS') || line.includes('t.') || line.includes('language')) {
            return;
          }

          // تخطي import/export
          if (line.trim().startsWith('import') || line.trim().startsWith('export')) {
            return;
          }

          // البحث عن نصوص مدمجة
          const matches = this.findHardcodedStrings(line);

          matches.forEach((match) => {
            if (!this.isIgnored(match)) {
              this.hardcodeIssues.push({
                file: this.getRelativePath(file),
                line: index + 1,
                content: match,
                severity: this.determineSeverity(match),
              });
              this.stats.hardcodedTextFound++;
            }
          });
        });
      } catch (error) {
        // تخطي الملفات التي لا يمكن قراءتها
      }
    }
  }

  private getAllComponentFiles(dir: string): string[] {
    const files: string[] = [];

    const walk = (currentPath: string) => {
      try {
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
          const fullPath = path.join(currentPath, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
              walk(fullPath);
            }
          } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.jsx')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // تخطي المجلدات التي لا يمكن قراءتها
      }
    };

    walk(dir);
    return files;
  }

  private findHardcodedStrings(line: string): string[] {
    const results: string[] = [];

    // الأنماط المختلفة للبحث عن النصوص المدمجة
    const patterns = [
      // placeholder="text"
      /placeholder\s*=\s*["']([^"']{2,})["']/gi,
      // title="text"
      /title\s*=\s*["']([^"']{2,})["']/gi,
      // aria-label="text"
      /aria-label\s*=\s*["']([^"']{2,})["']/gi,
      // alt="text"
      /alt\s*=\s*["']([^"']{2,})["']/gi,
      // label="text" أو label: "text"
      /label\s*[=:]\s*["']([^"']{2,})["']/gi,
      // >text< (JSX text)
      />([A-Z][^<>{][\w\s]*)</g,
      // عام: "text" أو 'text' (ليست في import/export)
      /(?<!import|export|from)\s+["']([^"']{3,})["'](?!\s*[,;])/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const text = (match[1] || match[0]).trim();

        // تخطي import/export statements
        if (line.includes('import') || line.includes('export') || line.includes('from')) {
          continue;
        }

        // تخطي الخصائص البرمجية (file paths, URLs في attributes)
        if (text.includes('/') || text.includes('.') || text.includes('http')) {
          continue;
        }

        // تخطي الكود
        if (text.includes('=>') || text.includes('${') || text.includes('function')) {
          continue;
        }

        if (text.length >= 2) {
          results.push(text);
        }
      }
    }

    return [...new Set(results)]; // إزالة التكرارات
  }

  private isIgnored(text: string): boolean {
    const lowerText = text.toLowerCase();

    // فحص الأنماط
    if (IGNORED_PATTERNS.some((pattern) => pattern.test(text))) {
      return true;
    }

    // فحص الكلمات التقنية الشائعة
    if (COMMON_TECHNICAL_WORDS.includes(lowerText)) {
      return true;
    }

    // تخطي الأسماء المعروفة (brand names، أسماء خاصة)
    const knownBrands = ['React', 'Vue', 'Angular', 'ZINC', 'TypeScript', 'JavaScript'];
    if (knownBrands.includes(text)) {
      return true;
    }

    // لا تتجاهل النصوص الطويلة التي تبدو مثل جمل (user-facing text)
    if (text.length > 4 && /[a-z]/.test(text)) {
      return false;
    }

    return false;
  }

  private determineSeverity(text: string): 'error' | 'warning' {
    // نصوص طويلة = خطأ أكيد
    if (text.length > 15) return 'error';

    // نصوص قصيرة قد تكون متغيرات أو أشياء أخرى = تحذير
    return 'warning';
  }

  private getRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath);
  }

  private printReport(): void {
    console.log(`${colors.bold}═══════════════════════════════════════${colors.reset}\n`);

    // عرض مشاكل الترجمات
    console.log(`${colors.bold}📋 تقرير ملفات الترجمة:${colors.reset}`);
    for (const result of this.results) {
      const status =
        result.isValid && result.warnings.length === 0
          ? `${colors.green}✅${colors.reset}`
          : result.isValid
            ? `${colors.yellow}⚠️${colors.reset}`
            : `${colors.red}❌${colors.reset}`;

      console.log(`  ${status} ${result.file}`);

      if (result.missing.length > 0) {
        console.log(`${colors.red}     ❌ مفاتيح ناقصة: ${result.missing.length}${colors.reset}`);
      }
      if (result.typeErrors.length > 0) {
        console.log(`${colors.red}     ❌ أخطاء النوع: ${result.typeErrors.length}${colors.reset}`);
      }
      if (result.warnings.length > 0) {
        console.log(`${colors.yellow}     ⚠️  تحذيرات: ${result.warnings.length}${colors.reset}`);
      }
    }

    // عرض النصوص المدمجة
    if (this.hardcodeIssues.length > 0) {
      console.log(`\n${colors.magenta}${colors.bold}🔴 نصوص مدمجة بدون ترجمة:${colors.reset}`);

      const errors = this.hardcodeIssues.filter((i) => i.severity === 'error');
      const warnings = this.hardcodeIssues.filter((i) => i.severity === 'warning');

      if (errors.length > 0) {
        console.log(`${colors.red}  أخطاء حرجة (${errors.length}):${colors.reset}`);
        errors.slice(0, 10).forEach((issue) => {
          console.log(`     ${colors.red}→${colors.reset} ${issue.file}:${issue.line}`);
          console.log(`       "${issue.content}"`);
        });
        if (errors.length > 10) {
          console.log(`     ... و ${errors.length - 10} أخطاء أخرى`);
        }
      }

      if (warnings.length > 0) {
        console.log(`${colors.yellow}  تحذيرات (${warnings.length}):${colors.reset}`);
        warnings.slice(0, 5).forEach((issue) => {
          console.log(
            `     ${colors.yellow}→${colors.reset} ${issue.file}:${issue.line} - "${issue.content}"`
          );
        });
        if (warnings.length > 5) {
          console.log(`     ... و ${warnings.length - 5} تحذيرات أخرى`);
        }
      }
    }

    this.printSummary();
  }

  private printSummary(): void {
    console.log(`\n${colors.bold}═══════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}📊 الملخص النهائي:${colors.reset}`);
    console.log(`  📁 ملفات الترجمة: ${this.stats.total}`);
    console.log(`  ${colors.green}✅ صحيح: ${this.stats.valid}${colors.reset}`);
    console.log(`  ${colors.red}❌ أخطاء: ${this.stats.failed}${colors.reset}`);
    console.log(`  ${colors.red}🔴 نصوص مدمجة: ${this.stats.hardcodedTextFound}${colors.reset}`);
    console.log(`  ${colors.yellow}🟡 تحذيرات: ${this.stats.totalWarnings}${colors.reset}\n`);

    const hasErrors =
      this.stats.failed > 0 || this.hardcodeIssues.filter((i) => i.severity === 'error').length > 0;

    if (!hasErrors) {
      console.log(
        `${colors.green}${colors.bold}✨ جميع الترجمات سليمة والكود نظيف!${colors.reset}\n`
      );
      process.exit(0);
    } else {
      console.log(`${colors.red}${colors.bold}❌ توجد مشاكل في الترجمات${colors.reset}`);
      console.log(`${colors.yellow}📝 التقرير محفوظ: ${this.reportPath}${colors.reset}\n`);
      process.exit(1);
    }
  }

  private exportReport(): void {
    const report: DetailedReport = {
      timestamp: new Date().toISOString(),
      results: this.results,
      hardcodeIssues: this.hardcodeIssues,
      stats: this.stats,
    };

    try {
      fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(
        `${colors.cyan}📄 التقرير محفوظ: ${path.resolve(this.reportPath)}${colors.reset}`
      );
    } catch (error) {
      console.error(`${colors.red}خطأ في الحفظ${colors.reset}`, error);
    }
  }
}

// تشغيل المدقق
const validator = new TranslationValidator();
const success = validator.validate();
process.exit(success ? 0 : 1);
