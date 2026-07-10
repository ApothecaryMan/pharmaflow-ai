import React, { useEffect, useState, useMemo } from 'react';
import { getSmartDirection } from '../common/SmartInputs';
import { useSettings } from '../../context';
import type { ViewState } from '../../types';

/* ──────────────────────────────────────────────
   DATA TYPES
   ────────────────────────────────────────────── */

interface Product {
  id: string;
  iconSvg: string;
  nameEn: string;
  nameAr: string;
  priceEn: string;
  priceAr: string;
  bestForEn: string;
  bestForAr: string;
  indicationsEn: string;
  indicationsAr: string;
  usageEn: string;
  usageAr: string;
  ingredients: string[];
}

interface IngredientRow {
  name: string;
  present: [boolean, boolean, boolean, boolean];
  note?: string;
}

interface SectionConfig {
  titleEn: string;
  titleAr: string;
  noteEn: string;
  noteAr: string;
}

interface StatItem {
  icon: string;
  labelEn: string;
  labelAr: string;
  value: string;
}

interface TrixComparisonData {
  header: {
    kickerEn: string;
    kickerAr: string;
    brandEn: string;
    brandAr: string;
    subEn: string;
    subAr: string;
    stampEn: string;
    stampAr: string;
  };
  quickSection: SectionConfig;
  matrixSection: SectionConfig;
  detailSection: SectionConfig;
  products: Product[];
  ingredients: IngredientRow[];
  matrixNotes: { noteEn: string; noteAr: string };
  stats: StatItem[];
  footerEn: string;
  footerAr: string;
  disclaimerEn: string;
  disclaimerAr: string;
}

interface ColorPalette {
  paper: string;
  card: string;
  ink: string;
  inkSoft: string;
  rule: string;
  stamp: string;
  tag: string;
  gradientLine: string;
  tableHeaderBg: string;
  tableRowEven: string;
  marginLine: string;
}

/* ──────────────────────────────────────────────
   DATA —  all static content lives here
   ────────────────────────────────────────────── */

const TRIX_DATA: TrixComparisonData = {
  header: {
    kickerEn: 'Pharmacist worksheet — from official site',
    kickerAr: 'ورقة عمل صيدلي — من واقع الموقع الرسمي',
    brandEn: 'TRIX',
    brandAr: 'TRIX',
    subEn: 'Full comparison of TRIX shampoos by Hayah Labs — focused on active ingredients',
    subAr: 'مقارنة شاملة بين أنواع شامبو تريكس من معامل حياة — بالتركيز على المكوّنات الفعّالة',
    stampEn: 'HAYAH\nLABS',
    stampAr: 'HAYAH\nLABS',
  },
  quickSection: {
    titleEn: 'The Four Formulas — At a Glance',
    titleAr: 'الأربع تركيبات بسرعة',
    noteEn: 'Each formula targets a different hair concern. All 200ml, suitable for all hair types.',
    noteAr: 'كل نوع اتصمم لمشكلة شعر مختلفة، وكلهم بحجم 200 مل ومناسبين لكل أنواع الشعر',
  },
  matrixSection: {
    titleEn: 'Who Has What? — Active Ingredient Matrix',
    titleAr: 'مين موجود في مين؟ — مصفوفة المكوّنات الفعّالة',
    noteEn: 'Every officially listed active ingredient per formula, side by side.',
    noteAr: 'قائمة كل المكوّنات الفعّالة المُعلنة رسميًا في كل تركيبة، جنب بعض',
  },
  detailSection: {
    titleEn: 'Each Formula in Detail',
    titleAr: 'بطاقة كل نوع بالتفصيل',
    noteEn: 'Price, indications, usage — as published on the official site.',
    noteAr: 'السعر، دواعي الاستخدام، وطريقة الاستعمال زي ما هي في الموقع الرسمي',
  },
  products: [
    {
      id: 'hair-loss',
      iconSvg: 'M12 3 C9 7 7 11 8 15 C8.5 17.5 10 19 12 19 M9 16.3 L12 20 L15 16.3',
      nameEn: 'Anti Hair Loss',
      nameAr: 'مضاد تساقط الشعر',
      priceEn: '~150-199 EGP / 200ml',
      priceAr: '~150–199 ج.م / 200ml',
      bestForEn: 'Androgenic alopecia · Telogen effluvium',
      bestForAr: 'ثعلبة ذكورية · تساقط انتقالي',
      indicationsEn: 'Androgenic alopecia · Telogen effluvium · Weak, brittle hair',
      indicationsAr: 'ثعلبة ذكورية · تساقط انتقالي · شعر ضعيف وهش',
      usageEn: 'Apply to wet hair, massage until lather, rinse — suitable for daily use and sensitive scalps.',
      usageAr: 'يوضع على الشعر المبلل، يُدلّك حتى الرغوة، ثم يُشطف — مناسب للاستخدام اليومي والفروة الحساسة',
      ingredients: ['Capauxein™ G2', 'Protectagen™', 'Panthenol', 'Glycerin'],
    },
    {
      id: 'dandruff',
      iconSvg: 'M6 3 L6 9 M3.5 4.5 L8.5 7.5 M8.5 4.5 L3.5 7.5 M16.5 9 L16.5 14 M14.2 10.3 L18.8 12.7 M18.8 10.3 L14.2 12.7 M9.5 15 L9.5 20 M7.2 16.3 L11.8 18.7 M11.8 16.3 L7.2 18.7',
      nameEn: 'Anti-Dandruff',
      nameAr: 'مضاد القشرة',
      priceEn: '~150 EGP / 200ml',
      priceAr: '~150 ج.م / 200ml',
      bestForEn: 'Severe dandruff · Oily scalp',
      bestForAr: 'قشرة شديدة · فروة دهنية',
      indicationsEn: 'Severe dandruff · Oily scalp · Seborrheic dermatitis',
      indicationsAr: 'قشرة شديدة · فروة رأس دهنية والتهاب جلدي دهني',
      usageEn: 'Apply to damp hair and scalp, gentle massage, leave 2-3 min, rinse with warm water — use 2-3 times weekly.',
      usageAr: 'يوضع على الشعر والفروة المبللة، تدليك لطيف، يُترك 2-3 دقايق، شطف بمياه دافية — يُستخدم 2-3 مرات أسبوعيًا',
      ingredients: ['Sclareance', 'Piroctone Olamine', 'Salicylic Acid', 'Biotin', 'Ginseng', 'Chamomile'],
    },
    {
      id: 'revitalizing',
      iconSvg: 'M7 2 C8 6 9.5 8 8.5 11 L11 12.5 M12.5 12 L10 13.5 L12.5 15 L11 17 C10.2 19 10.8 20.5 10 22',
      nameEn: 'Revitalizing',
      nameAr: 'منعش',
      priceEn: '~150 EGP / 200ml',
      priceAr: '~150 ج.م / 200ml',
      bestForEn: 'Damaged · weak hair',
      bestForAr: 'شعر تالف وهش',
      indicationsEn: 'Damaged, weak, and exhausted hair',
      indicationsAr: 'شعر تالف وهش ومنهك',
      usageEn: 'Apply to wet hair, massage until lather, then rinse.',
      usageAr: 'يوضع على الشعر المبلل، يُدلّك حتى الرغوة، ثم يُشطف',
      ingredients: ['FiberHance', 'N-Durhance', 'Glycerin', 'Panthenol'],
    },
    {
      id: 'volumizing',
      iconSvg: 'M6 3 C8 7 4 11 6 15 C8 19 4 21 6 23 M12 3 C14 7 10 11 12 15 C14 19 10 21 12 23 M18 3 C20 7 16 11 18 15 C20 19 16 21 18 23',
      nameEn: 'Volumizing',
      nameAr: 'مكثف',
      priceEn: '~150 EGP / 200ml',
      priceAr: '~150 ج.م / 200ml',
      bestForEn: 'Fine · flat · aging hair',
      bestForAr: 'شعر رفيع · شعر مسنّ',
      indicationsEn: 'Fine, flat, brittle hair; age-related density loss',
      indicationsAr: 'شعر رفيع ومسطّح وهش، وشعر بيفقد كثافته مع العمر',
      usageEn: 'Apply to wet hair, massage until lather, then rinse.',
      usageAr: 'يوضع على الشعر المبلل، يُدلّك حتى الرغوة، ثم يُشطف',
      ingredients: ['Natrosol Plus', 'Caffeine', 'Glycerin', 'Biotin', 'Panthenol'],
    },
  ],
  ingredients: [
    { name: 'Glycerin', present: [true, true, true, true] },
    { name: 'Panthenol', present: [true, false, true, true] },
    { name: 'Ultra mild washing agents', present: [true, true, false, false] },
    { name: 'Biotin', present: [false, true, false, true] },
    { name: 'Capauxein™ G2', present: [true, false, false, false] },
    { name: 'Protectagen™', present: [true, false, false, false] },
    { name: 'Sclareance', present: [false, true, false, false] },
    { name: 'Piroctone Olamine', present: [false, true, false, false] },
    { name: 'Salicylic Acid', present: [false, true, false, false] },
    { name: 'Ginseng', present: [false, true, false, false] },
    { name: 'Chamomile', present: [false, true, false, false] },
    { name: 'FiberHance', present: [false, false, true, false] },
    { name: 'N-Durhance', present: [false, false, true, false] },
    { name: 'Natrosol Plus', present: [false, false, false, true] },
    { name: 'Caffeine', present: [false, false, false, true] },
  ],
  matrixNotes: {
    noteEn: 'Glycerin is the only ingredient shared across all four formulas. After that, each formula has its own unique "fingerprint" ingredients.',
    noteAr: 'الجليسرين (Glycerin) هو المكوّن الوحيد المشترك في الأربع تركيبات — كل نوع بعد كده بياخد "بصمته" من مكوّنات خاصة بيه لوحده.',
  },
  stats: [
    { icon: 'science', labelEn: 'Total Products', labelAr: 'إجمالي المنتجات', value: '48' },
    { icon: 'branding_watermark', labelEn: 'Active Brands', labelAr: 'العلامات النشطة', value: '12' },
    { icon: 'inventory_2', labelEn: 'Low Stock Items', labelAr: 'المنتجات منخفضة المخزون', value: '3' },
    { icon: 'local_shipping', labelEn: 'Pending Orders', labelAr: 'الطلبات المعلقة', value: '7' },
  ],
  footerEn: 'Source: hayahlaboratories.com — Prices and offers change. Check the official site before purchasing.',
  footerAr: 'المصدر: hayahlaboratories.com — الأسعار والعروض بتتغيّر باستمرار، راجع الموقع الرسمي قبل الشراء',
  disclaimerEn: 'Comparison worksheet only, not medical advice.',
  disclaimerAr: 'ورقة للمقارنة فقط، مش استشارة طبية',
};

/* ──────────────────────────────────────────────
   COMPONENT
   ────────────────────────────────────────────── */

interface TrixComparisonTemplateProps {
  language?: 'EN' | 'AR';
  color?: string;
  t?: any;
  onViewChange?: (view: ViewState) => void;
}

const COLUMN_KEYS = ['Hair Loss', 'Dandruff', 'Revital.', 'Volume'] as const;

const TITLE_FONT = '"GraphicSansFont"';
const TITLE_FEATURES = '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1';
const TITLE_STYLE: React.CSSProperties = {
  fontFamily: TITLE_FONT,
  fontFeatureSettings: TITLE_FEATURES,
};

const LIGHT: ColorPalette = {
  paper: '#EEF1E7',
  card: '#FBFAF4',
  ink: '#202A3D',
  inkSoft: '#55627A',
  rule: '#B9C7D8',
  stamp: '#A6403C',
  tag: '#96731F',
  gradientLine: 'rgba(185,199,216,0.55)',
  tableHeaderBg: 'rgba(185,199,216,0.18)',
  tableRowEven: 'rgba(185,199,216,0.10)',
  marginLine: 'rgba(166,64,60,0.35)',
};

const DARK: ColorPalette = {
  paper: '#282828',
  card: '#323232',
  ink: '#f3f4f6',
  inkSoft: '#9ca3af',
  rule: '#3d3d3d',
  stamp: '#ff6b6b',
  tag: '#f0c040',
  gradientLine: 'rgba(61,61,61,0.55)',
  tableHeaderBg: 'rgba(61,61,61,0.30)',
  tableRowEven: 'rgba(61,61,61,0.15)',
  marginLine: 'rgba(255,107,107,0.20)',
};

const TickIcon: React.FC<{ stamp: string }> = ({ stamp }) => (
  <svg viewBox='0 0 20 20' className='inline-block align-middle' style={{ width: 18, height: 18 }}>
    <path d='M3 10.3 C5 12.3 7 14.3 8.4 15.4 C11.4 11 14.5 6.4 17 3.4'
      stroke={stamp} fill='none' strokeWidth={2.3} strokeLinecap='round' strokeLinejoin='round' />
  </svg>
);

const DirSpan: React.FC<{ text: string; className?: string; style?: React.CSSProperties }> = ({
  text, className, style,
}) => {
  const dir = getSmartDirection(text);
  const isAr = dir === 'rtl';
  return (
    <span
      dir={dir}
      className={className}
      style={{
        fontFamily: isAr ? "'Harmattan', sans-serif" : "'Patrick Hand', cursive",
        unicodeBidi: 'isolate',
        ...style,
      }}
    >
      {text}
    </span>
  );
};

const DirBlock: React.FC<{ text: string; className?: string; style?: React.CSSProperties }> = ({
  text, className, style,
}) => {
  const dir = getSmartDirection(text);
  const isAr = dir === 'rtl';
  return (
    <div
      dir={dir}
      className={className}
      style={{
        fontFamily: isAr ? "'Harmattan', sans-serif" : "'Patrick Hand', cursive",
        whiteSpace: 'pre-wrap',
        ...style,
      }}
    >
      {text}
    </div>
  );
};

export const TrixComparisonTemplate: React.FC<TrixComparisonTemplateProps> = ({
  language = 'EN',
  color = '#6366f1',
}) => {
  const isAr = language === 'AR';
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const { darkMode } = useSettings();
  const C: ColorPalette = useMemo(() => (darkMode ? DARK : LIGHT), [darkMode]);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Harmattan:wght@400;500;600;700&family=Patrick+Hand&display=swap';
    link.onload = () => setFontsLoaded(true);
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, []);

  if (!fontsLoaded) {
    return (
      <div className='h-full flex items-center justify-center' style={{ borderRadius: 0, background: C.paper }}>
        <span style={{ color: C.ink, fontFamily: "'Patrick Hand', cursive", fontSize: 18 }}>
          Loading fonts…
        </span>
      </div>
    );
  }

  const D = TRIX_DATA;
  const products = D.products;
  const matrixNotes = D.matrixNotes;

  const sectionTitleStyle: React.CSSProperties = {
    fontFamily: TITLE_FONT,
    fontFeatureSettings: TITLE_FEATURES,
    fontSize: 34,
    fontWeight: 700,
    margin: '46px 0 6px',
    borderBottom: `1.5px dashed ${C.inkSoft}`,
    paddingBottom: 6,
    color: C.ink,
  };

  const sectionNoteStyle: React.CSSProperties = {
    fontFamily: TITLE_FONT,
    fontFeatureSettings: TITLE_FEATURES,
    color: C.inkSoft,
    fontSize: 15,
    margin: '0 0 22px',
  };

  return (
    <div
      className='h-full flex flex-col overflow-hidden'
      style={{
        background: `
          repeating-linear-gradient(
            ${C.paper} 0px, ${C.paper} 33px,
            ${C.gradientLine} 34px, ${C.paper} 35px
          )
        `,
        backgroundColor: C.paper,
        color: C.ink,
        fontFamily: "'Aref Ruqaa', serif",
        fontSize: 18,
        lineHeight: 1.65,
        position: 'relative',
        borderRadius: 0,
      }}
    >
      {/* red margin line */}
      <div
        style={{
          position: 'fixed',
          top: 0, bottom: 0,
          [isAr ? 'left' : 'right']: 46,
          width: 2,
          background: C.marginLine,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <div className='flex-1 overflow-y-auto' style={{ position: 'relative', zIndex: 1 }}>
        <div className='max-w-[1400px] mx-auto px-4 md:px-8 py-10 pb-[70px]'>

          {/* ═══ LETTERHEAD ═══ */}
          <header
            style={{
              borderBottom: `2px solid ${C.ink}`,
              paddingBottom: 18,
              marginBottom: 34,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: TITLE_FONT,
                  fontFeatureSettings: TITLE_FEATURES,
                  fontSize: 16,
                  color: C.inkSoft,
                  letterSpacing: 1,
                  marginBottom: 2,
                }}
              >
                {isAr ? D.header.kickerAr : D.header.kickerEn}
              </div>
              <div
                style={{
                  fontFamily: TITLE_FONT,
                  fontFeatureSettings: TITLE_FEATURES,
                  fontSize: 64,
                  lineHeight: 1,
                  fontWeight: 700,
                  color: C.ink,
                }}
              >
                {isAr ? D.header.brandAr : D.header.brandEn}
              </div>
              <DirBlock
                text={isAr ? D.header.subAr : D.header.subEn}
                style={{ fontSize: 20, color: C.inkSoft, marginTop: 4 }}
              />
            </div>
            <div
              style={{
                width: 78, height: 78,
                border: `2px solid ${C.stamp}`,
                transform: 'rotate(45deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  transform: 'rotate(-45deg)',
                  color: C.stamp,
                  fontFamily: TITLE_FONT,
                  fontFeatureSettings: TITLE_FEATURES,
                  fontWeight: 700,
                  fontSize: 15,
                  textAlign: 'center',
                  lineHeight: 1.1,
                }}
              >
                {isAr ? D.header.stampAr : D.header.stampEn}
              </span>
            </div>
          </header>

          {/* ═══ QUICK CARDS ═══ */}
          <section>
            <h2 style={sectionTitleStyle}>
              {isAr ? D.quickSection.titleAr : D.quickSection.titleEn}
            </h2>
            <p style={sectionNoteStyle}>
              {isAr ? D.quickSection.noteAr : D.quickSection.noteEn}
            </p>

            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
              {products.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: `1.5px solid ${C.ink}`,
                    background: C.card,
                    padding: '16px 14px 18px',
                    borderRadius: 0,
                  }}
                >
                  <svg width={34} height={34} viewBox='0 0 24 24'
                    style={{ fill: 'none', stroke: C.ink, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', marginBottom: 8 }}
                  >
                    <path d={p.iconSvg} />
                  </svg>
                  <div
                    style={{
                      ...TITLE_STYLE,
                      fontSize: 26,
                      fontWeight: 700,
                      lineHeight: 1.05,
                      marginBottom: 4,
                      color: C.ink,
                    }}
                  >
                    {isAr ? p.nameAr : p.nameEn}
                  </div>
                  <DirSpan text={isAr ? p.bestForAr : p.bestForEn}
                    style={{ fontSize: 16, color: C.inkSoft, display: 'block' }}
                  />
                  <DirBlock
                    text={(isAr ? 'الأفضل لـ: ' : 'Best for: ') + (isAr ? p.bestForAr : p.bestForEn)}
                    style={{ marginTop: 10, fontSize: 13, color: C.tag, borderTop: `1px dashed ${C.rule}`, paddingTop: 8 }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ═══ INGREDIENT MATRIX ═══ */}
          <section>
            <h2 style={sectionTitleStyle}>
              {isAr ? D.matrixSection.titleAr : D.matrixSection.titleEn}
            </h2>
            <p style={sectionNoteStyle}>
              {isAr ? D.matrixSection.noteAr : D.matrixSection.noteEn}
            </p>

            <div style={{ overflowX: 'auto', border: `1.5px solid ${C.ink}`, borderRadius: 0 }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse', minWidth: 620, background: C.card,
              }}>
                <thead>
                  <tr>
                    <th style={{
                      textAlign: isAr ? 'right' : 'left',
                      background: C.ink,
                      color: C.paper,
                      fontSize: 20,
                      fontWeight: 700,
                      padding: '9px 10px',
                      border: `1px solid ${C.rule}`,
                    }}>
                      <span style={{ fontFamily: TITLE_FONT, fontFeatureSettings: TITLE_FEATURES, color: C.paper, fontSize: 20, fontWeight: 700 }}>
                        {isAr ? 'المكوّن' : 'Ingredient'}
                      </span>
                    </th>
                    {COLUMN_KEYS.map((col) => (
                      <th key={col} style={{
                        background: C.ink,
                        color: C.paper,
                        fontFamily: TITLE_FONT,
                        fontFeatureSettings: TITLE_FEATURES,
                        fontSize: 20,
                        fontWeight: 700,
                        padding: '9px 10px',
                        border: `1px solid ${C.rule}`,
                        textAlign: 'center',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {D.ingredients.map((row, i) => (
                    <tr key={row.name} style={{
                      background: i % 2 === 0 ? C.tableRowEven : 'transparent',
                    }}>
                      <th style={{
                        textAlign: isAr ? 'right' : 'left',
                        fontFamily: "'Patrick Hand', cursive",
                        fontSize: 15,
                        background: C.tableHeaderBg,
                        whiteSpace: 'nowrap',
                        padding: '9px 10px',
                        border: `1px solid ${C.rule}`,
                        fontWeight: 400,
                        color: C.ink,
                      }}>
                        {row.name}
                      </th>
                      {row.present.map((has, ci) => (
                        <td key={ci} style={{
                          padding: '9px 10px',
                          border: `1px solid ${C.rule}`,
                          textAlign: 'center',
                          color: C.rule,
                        }}>
                          {has ? <TickIcon stamp={C.stamp} /> : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                fontSize: 15,
                color: C.tag,
                border: `1.5px solid ${C.tag}`,
                padding: '10px 14px',
                maxWidth: 360,
                margin: '18px 2px 0 auto',
                transform: 'rotate(-1.2deg)',
                borderRadius: 0,
              }}
            >
              <span style={{ ...TITLE_STYLE, fontSize: 18, color: C.tag, fontWeight: 700, marginInlineEnd: 4 }}>
                {isAr ? 'ملحوظة: ' : 'Note: '}
              </span>
              <DirSpan text={isAr ? matrixNotes.noteAr : matrixNotes.noteEn} style={{ color: C.tag }} />
            </div>
          </section>

          {/* ═══ DETAIL CARDS ═══ */}
          <section>
            <h2 style={sectionTitleStyle}>
              {isAr ? D.detailSection.titleAr : D.detailSection.titleEn}
            </h2>
            <p style={sectionNoteStyle}>
              {isAr ? D.detailSection.noteAr : D.detailSection.noteEn}
            </p>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-[22px]'>
              {products.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: `1.5px solid ${C.ink}`,
                    background: C.card,
                    padding: '20px 20px 22px',
                    borderRadius: 0,
                    position: 'relative',
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    borderBottom: `1.5px dashed ${C.rule}`,
                    paddingBottom: 10,
                    marginBottom: 12,
                  }}>
                    <div
                      style={{
                        ...TITLE_STYLE,
                        fontSize: 30,
                        fontWeight: 700,
                        color: C.ink,
                      }}
                    >
                      {isAr ? p.nameAr : p.nameEn}
                    </div>
                    <DirSpan text={isAr ? p.priceAr : p.priceEn}
                      style={{ fontSize: 14, color: C.stamp, whiteSpace: 'nowrap', textAlign: 'right' }}
                    />
                  </div>

                  <h4 style={{ ...TITLE_STYLE, fontSize: 19, margin: '12px 0 4px', color: C.tag }}>
                    {isAr ? 'دواعي الاستخدام' : 'Indications'}
                  </h4>
                  <DirBlock
                    text={isAr ? p.indicationsAr : p.indicationsEn}
                    style={{ margin: '0 0 4px', fontSize: 16, color: C.ink }}
                  />

                  <h4 style={{ ...TITLE_STYLE, fontSize: 19, margin: '12px 0 4px', color: C.tag }}>
                    {isAr ? 'طريقة الاستخدام' : 'Usage'}
                  </h4>
                  <DirBlock
                    text={isAr ? p.usageAr : p.usageEn}
                    style={{ margin: '0 0 4px', fontSize: 16, color: C.ink }}
                  />

                  <h4 style={{ ...TITLE_STYLE, fontSize: 19, margin: '12px 0 4px', color: C.tag }}>
                    {isAr ? 'المكوّنات الفعّالة' : 'Active Ingredients'}
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                    {p.ingredients.map((ing) => (
                      <span
                        key={ing}
                        style={{
                          fontFamily: "'Patrick Hand', cursive",
                          fontSize: 13,
                          border: `1px solid ${C.inkSoft}`,
                          padding: '2px 8px',
                          color: C.inkSoft,
                          borderRadius: 0,
                        }}
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ═══ FOOTER ═══ */}
          <footer style={{
            marginTop: 50,
            borderTop: `2px solid ${C.ink}`,
            paddingTop: 14,
            fontFamily: "'Patrick Hand', cursive",
            fontSize: 14,
            color: C.inkSoft,
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <DirSpan text={isAr ? D.footerAr : D.footerEn} style={{ color: C.inkSoft }} />
            <DirSpan text={isAr ? D.disclaimerAr : D.disclaimerEn} style={{ color: C.inkSoft }} />
          </footer>

        </div>
      </div>
    </div>
  );
};
