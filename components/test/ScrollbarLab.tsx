import React, { useState } from 'react';
import { PageHeader } from '../common/PageHeader';

interface ScrollbarDesign {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  className: string;
  colorClass: string;
  cssCode: string;
}

interface ScrollbarLabProps {
  color?: string;
  t?: any;
  language: 'EN' | 'AR';
}

export const ScrollbarLab: React.FC<ScrollbarLabProps> = ({ language }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollbarDesigns: ScrollbarDesign[] = [
    {
      id: 'phantom-ghost',
      nameEn: 'Phantom Blade (Ghost Stripe)',
      nameAr: 'الشريط الخفي (المسطح النحيف)',
      descriptionEn: '100% invisible by default. Fades in as an ultra-thin, flat 3px sharp line of faded gray when mouse enters.',
      descriptionAr: 'مخفي تماماً بنسبة 100%. يظهر كشريط مسطح رمادي باهت فائق النحافة (3 بكسل) وبحواف حادة عند دخول الفأرة.',
      icon: 'linear_scale',
      className: 'scrollbar-ghost',
      colorClass: 'from-zinc-400 to-zinc-650',
      cssCode: `.scrollbar-ghost {
  scrollbar-width: none !important; /* Hide for Firefox */
}
.scrollbar-ghost:hover {
  scrollbar-width: auto !important; /* Show for Firefox */
}
.scrollbar-ghost::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}
.scrollbar-ghost::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-ghost::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 0px;
  transition: background-color 0.2s ease;
}
.scrollbar-ghost:hover::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
}
.scrollbar-ghost:hover::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.6);
}`,
    },
    {
      id: 'neon-glow',
      nameEn: 'Neon Breeze (Glassmorphic)',
      nameAr: 'نسيم النيون (الزجاجي المضيء)',
      descriptionEn: 'Vibrant neon gradient glow with glassmorphic track, perfect for modern dark mode interfaces.',
      descriptionAr: 'وهج نيون متدرج وحيوي مع مسار زجاجي، مثالي لواجهات الوضع الداكن الحديثة.',
      icon: 'electric_bolt',
      className: 'scrollbar-neon',
      colorClass: 'from-blue-500 to-indigo-600',
      cssCode: `.scrollbar-neon {
  scrollbar-width: auto !important;
  scrollbar-color: auto !important;
}
.scrollbar-neon::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.scrollbar-neon::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 99px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.scrollbar-neon::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #3b82f6, #6366f1);
  border-radius: 99px;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
}
.scrollbar-neon::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #60a5fa, #818cf8);
}`,
    },
    {
      id: 'stealth-blade',
      nameEn: 'Stealth Blade (Minimalist)',
      nameAr: 'الشفرة الخفية (البسيط التفاعلي)',
      descriptionEn: 'Ultra-thin, zero-intrusive indicator that elegantly expands its width on container hover.',
      descriptionAr: 'مؤشر فائق النحافة وغير مزعج على الإطلاق، يتسع عرضه بأناقة عند حوم الفأرة فوق الحاوية.',
      icon: 'visibility_off',
      className: 'scrollbar-stealth',
      colorClass: 'from-zinc-700 to-zinc-900',
      cssCode: `.scrollbar-stealth {
  scrollbar-width: auto !important;
  scrollbar-color: auto !important;
}
.scrollbar-stealth::-webkit-scrollbar {
  width: 4px;
  height: 4px;
  transition: width 0.3s ease;
}
.scrollbar-stealth:hover::-webkit-scrollbar {
  width: 8px;
}
.scrollbar-stealth::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-stealth::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.25);
  border-radius: 99px;
}
.scrollbar-stealth::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.6);
}`,
    },
    {
      id: 'aurora-wave',
      nameEn: 'Liquid Aurora (Gradient Wave)',
      nameAr: 'الشفق السائل (موجة التدرج)',
      descriptionEn: 'Bold liquid sunset gradient that adds high energy and beautiful character to card containers.',
      descriptionAr: 'تدرج غروب الشمس السائل والجريء الذي يضيف طاقة وحيوية رائعة إلى حاويات البطاقات.',
      icon: 'waves',
      className: 'scrollbar-aurora',
      colorClass: 'from-pink-500 to-rose-600',
      cssCode: `.scrollbar-aurora {
  scrollbar-width: auto !important;
  scrollbar-color: auto !important;
}
.scrollbar-aurora::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.scrollbar-aurora::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
}
.scrollbar-aurora::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #ec4899, #f43f5e, #eab308);
  border-radius: 6px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.scrollbar-aurora::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #f472b6, #fb7185, #facc15);
  border: 2px solid transparent;
  background-clip: padding-box;
}`,
    },
    {
      id: 'cyberpunk-terminal',
      nameEn: 'Retro Terminal (Cyberpunk)',
      nameAr: 'المنفذ القديم (سايبربانك)',
      descriptionEn: 'Nostalgic solid terminal style with neon amber, pixel borders, and grid-aligned dashed track.',
      descriptionAr: 'نمط منفذ الأوامر الكلاسيكي مع لون الكهرمان النيون، حدود بكسلية، ومسار متقطع متناسق.',
      icon: 'terminal',
      className: 'scrollbar-cyber',
      colorClass: 'from-amber-500 to-yellow-655',
      cssCode: `.scrollbar-cyber {
  scrollbar-width: auto !important;
  scrollbar-color: auto !important;
}
.scrollbar-cyber::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}
.scrollbar-cyber::-webkit-scrollbar-track {
  background: rgba(245, 158, 11, 0.03);
  border: 1px dashed rgba(245, 158, 11, 0.3);
}
.scrollbar-cyber::-webkit-scrollbar-thumb {
  background: #f59e0b;
  border: 2px solid #000;
  box-shadow: inset 0 0 0 1px #fbbf24;
}
.scrollbar-cyber::-webkit-scrollbar-thumb:hover {
  background: #fbbf24;
}`,
    },
    {
      id: 'velvet-organic',
      nameEn: 'Soft Velvet (Organic Fluid)',
      nameAr: 'المخمل الناعم (الانسيابي العضوي)',
      descriptionEn: 'Extremely gentle, comfortable pastel design that seamlessly blends into premium corporate themes.',
      descriptionAr: 'تصميم لطيف ومريح للغاية بألوان هادئة، يندمج بسلاسة فائقة مع سمات الشركات الراقية.',
      icon: 'bubble_chart',
      className: 'scrollbar-velvet',
      colorClass: 'from-emerald-500 to-teal-650',
      cssCode: `.scrollbar-velvet {
  scrollbar-width: auto !important;
  scrollbar-color: auto !important;
}
.scrollbar-velvet::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.scrollbar-velvet::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-velvet::-webkit-scrollbar-thumb {
  background: rgba(16, 185, 129, 0.25);
  border-radius: 99px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.scrollbar-velvet::-webkit-scrollbar-thumb:hover {
  background: rgba(16, 185, 129, 0.7);
  border: 2px solid transparent;
  background-clip: padding-box;
}`,
    },
  ];

  const handleCopy = (design: ScrollbarDesign) => {
    navigator.clipboard.writeText(design.cssCode);
    setCopiedId(design.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const dummyParagraphs = language === 'AR' 
    ? [
        "هذا النص مخصص لمعاينة التمرير. يتيح لك تصميم سكرول بار مخصص تحسين واجهة المستخدم بشكل كبير وجعلها تبدو أكثر تميزاً واحترافية.",
        "نحن نؤمن بأن التفاصيل الصغيرة هي التي تصنع الفارق الحقيقي بين التطبيقات العادية والتطبيقات الاستثنائية فائقة الجودة.",
        "يمكنك تجربة تمرير الصفحة للأعلى وللأسفل لملاحظة سلاسة حركة المؤشر وتفاعله مع حركات الفأرة المختلفة.",
        "انسخ كود CSS المخصص المرفق بكل تصميم واستخدمه مباشرة في مشاريعك للحصول على مظهر فني فوري ومبهر!"
      ]
    : [
        "This content is generated to demonstrate the custom scrollbar in action. Tailoring your scrollbars drastically enhances the look and feel of data containers.",
        "We believe that micro-details are what set apart a generic application from a truly world-class, premium digital experience.",
        "Try scrolling up and down inside this card component to observe the visual feedback, hover transitions, and fluid movement.",
        "Simply copy the clean, self-contained CSS snippet for any style and drop it directly into your own design system!"
      ];

  return (
    <div className="h-full space-y-6 animate-fade-in overflow-y-auto p-6 scrollbar-sandbox" dir={language === 'AR' ? 'rtl' : 'ltr'}>
      {/* Scope CSS Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Overriding Webkit disabling standard property */
        .scrollbar-sandbox .scrollbar-ghost, 
        .scrollbar-sandbox .scrollbar-neon, 
        .scrollbar-sandbox .scrollbar-stealth, 
        .scrollbar-sandbox .scrollbar-aurora, 
        .scrollbar-sandbox .scrollbar-cyber, 
        .scrollbar-sandbox .scrollbar-velvet {
          scrollbar-width: auto !important;
          scrollbar-color: auto !important;
        }

        /* Ghost Scrollbar - Invisible by default, flat 0 radius and ultra-thin 3px of FADED GRAY */
        .scrollbar-sandbox .scrollbar-ghost {
          scrollbar-width: none !important;
        }
        .scrollbar-sandbox .scrollbar-ghost:hover {
          scrollbar-width: auto !important;
        }
        .scrollbar-sandbox .scrollbar-ghost::-webkit-scrollbar {
          display: block !important;
          width: 3px !important;
          height: 3px !important;
        }
        .scrollbar-sandbox .scrollbar-ghost::-webkit-scrollbar-track {
          background: transparent !important;
          border: none !important;
        }
        .scrollbar-sandbox .scrollbar-ghost::-webkit-scrollbar-thumb {
          background: transparent !important;
          border-radius: 0px !important;
          border: none !important;
          background-clip: border-box !important;
          transition: background-color 0.2s ease !important;
        }
        .scrollbar-sandbox .scrollbar-ghost:hover::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3) !important;
        }
        .scrollbar-sandbox .scrollbar-ghost:hover::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.6) !important;
        }

        /* Neon Glow Scrollbar */
        .scrollbar-sandbox .scrollbar-neon::-webkit-scrollbar {
          display: block !important;
          width: 8px !important;
          height: 8px !important;
        }
        .scrollbar-sandbox .scrollbar-neon::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02) !important;
          border-radius: 99px !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        .scrollbar-sandbox .scrollbar-neon::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #3b82f6, #6366f1) !important;
          border-radius: 99px !important;
          box-shadow: 0 0 8px rgba(99, 102, 241, 0.5) !important;
          border: none !important;
          background-clip: border-box !important;
        }
        .scrollbar-sandbox .scrollbar-neon::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #60a5fa, #818cf8) !important;
        }

        /* Stealth Blade Scrollbar */
        .scrollbar-sandbox .scrollbar-stealth::-webkit-scrollbar {
          display: block !important;
          width: 4px !important;
          height: 4px !important;
          transition: width 0.3s ease !important;
        }
        .scrollbar-sandbox .scrollbar-stealth:hover::-webkit-scrollbar {
          width: 8px !important;
        }
        .scrollbar-sandbox .scrollbar-stealth::-webkit-scrollbar-track {
          background: transparent !important;
          border: none !important;
        }
        .scrollbar-sandbox .scrollbar-stealth::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.25) !important;
          border-radius: 99px !important;
          border: none !important;
          background-clip: border-box !important;
        }
        .scrollbar-sandbox .scrollbar-stealth::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.6) !important;
        }

        /* Liquid Aurora Scrollbar */
        .scrollbar-sandbox .scrollbar-aurora::-webkit-scrollbar {
          display: block !important;
          width: 10px !important;
          height: 10px !important;
        }
        .scrollbar-sandbox .scrollbar-aurora::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.03) !important;
          border-radius: 6px !important;
          border: none !important;
        }
        .scrollbar-sandbox .scrollbar-aurora::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #ec4899, #f43f5e, #eab308) !important;
          border-radius: 6px !important;
          border: 2px solid transparent !important;
          background-clip: padding-box !important;
        }
        .scrollbar-sandbox .scrollbar-aurora::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #f472b6, #fb7185, #facc15) !important;
        }

        /* Retro Cyberpunk Scrollbar */
        .scrollbar-sandbox .scrollbar-cyber::-webkit-scrollbar {
          display: block !important;
          width: 12px !important;
          height: 12px !important;
        }
        .scrollbar-sandbox .scrollbar-cyber::-webkit-scrollbar-track {
          background: rgba(245, 158, 11, 0.03) !important;
          border: 1px dashed rgba(245, 158, 11, 0.3) !important;
        }
        .scrollbar-sandbox .scrollbar-cyber::-webkit-scrollbar-thumb {
          background: #f59e0b !important;
          border: 2px solid #000 !important;
          box-shadow: inset 0 0 0 1px #fbbf24 !important;
          border-radius: 0px !important;
          background-clip: border-box !important;
        }
        .scrollbar-sandbox .scrollbar-cyber::-webkit-scrollbar-thumb:hover {
          background: #fbbf24 !important;
        }

        /* Velvet Organic Scrollbar */
        .scrollbar-sandbox .scrollbar-velvet::-webkit-scrollbar {
          display: block !important;
          width: 8px !important;
          height: 8px !important;
        }
        .scrollbar-sandbox .scrollbar-velvet::-webkit-scrollbar-track {
          background: transparent !important;
          border: none !important;
        }
        .scrollbar-sandbox .scrollbar-velvet::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.25) !important;
          border-radius: 99px !important;
          border: 2px solid transparent !important;
          background-clip: padding-box !important;
        }
        .scrollbar-sandbox .scrollbar-velvet::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.7) !important;
        }
      ` }} />

      {/* Dynamic Unified PageHeader */}
      <PageHeader
        title={language === 'AR' ? 'معرض مصمم السكرول بار المخصص' : 'Custom Scrollbar Design Studio'}
        subtitle={language === 'AR' ? 'استكشف وانسخ 6 تصميمات سكرول بار مذهلة وفائقة الجودة لواجهاتك الفاخرة' : 'Explore and copy 6 high-aesthetic, production-grade custom scrollbar styles'}
        sticky={false}
        mb="mb-6"
      />

      {/* Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scrollbarDesigns.map((design) => (
          <div 
            key={design.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Header Icon & Title */}
              <div className="flex items-center gap-3.5 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${design.colorClass} flex items-center justify-center text-white shadow-xs`}>
                  <span className="material-symbols-rounded text-[22px]">{design.icon}</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white">
                    {language === 'AR' ? design.nameAr : design.nameEn}
                  </h3>
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">
                    ID: {design.id}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-5 h-8 overflow-hidden text-ellipsis">
                {language === 'AR' ? design.descriptionAr : design.descriptionEn}
              </p>

              {/* Scrollable Container Showcase */}
              <div 
                className={`h-40 overflow-y-auto p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 mb-5 select-none transition-all duration-300 ${design.className}`}
              >
                <div className="space-y-3.5">
                  {dummyParagraphs.map((para, idx) => (
                    <p key={idx} className="text-[11px] leading-relaxed text-zinc-650 dark:text-zinc-400 font-medium">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between">
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">
                CSS self-contained
              </span>
              <button
                onClick={() => handleCopy(design)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                  copiedId === design.id
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <span className="material-symbols-rounded text-[18px]">
                  {copiedId === design.id ? 'check' : 'content_copy'}
                </span>
                {copiedId === design.id
                  ? (language === 'AR' ? 'تم النسخ!' : 'Copied!')
                  : (language === 'AR' ? 'نسخ كود CSS' : 'Copy CSS')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
