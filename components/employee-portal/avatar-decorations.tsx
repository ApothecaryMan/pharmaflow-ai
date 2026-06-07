import React from 'react';

export interface DecorationDef {
  id: string;
  name: string;
  nameAr: string;
  svg: React.ReactNode;
}

export const AVATAR_DECORATIONS: DecorationDef[] = [
  {
    id: 'none',
    name: 'None',
    nameAr: 'بدون',
    svg: null,
  },
  {
    id: 'cat_ears',
    name: 'Cat Ears',
    nameAr: 'آذان القط',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.95'>
          {/* LEFT EAR GROUP - POSITIONED & ROTATED FOR BORDER */}
          <g className='cat-ear-left'>
            {/* Outer Ear Fur */}
            <path 
              d='M20,38 C14,24 10,6 18,-6 C23,-12 29,-10 33,-2 C41,12 47,24 50,32 C38,32 28,35 20,38 Z' 
              fill='var(--svg-color, #D4A574)' 
              stroke='var(--svg-color, #B8864E)' 
              strokeWidth='1.5' 
              strokeLinejoin='round'
            />
            {/* Inner Ear Shadow */}
            <path 
              d='M25,34 C21,22 20,12 23,4 C24,12 26,22 28,29 Z' 
              fill='#F43F5E' 
              opacity='0.35'
            />
            {/* Inner Ear Pink */}
            <path 
              d='M25,34 C21,22 18,10 22,2 C25,-2 28,-2 31,3 C37,14 42,22 44,27 C36,28 30,31 25,34 Z' 
              fill='#FFB6C1' 
            />
            {/* White Ear Fluff */}
            <path 
              d='M44,27 C41,22 38,20 39,25 C36,21 34,20 35,26 C32,22 30,22 32,28 C36,28 40,27 44,27 Z' 
              fill='#FFFFFF'
            />
          </g>

          {/* RIGHT EAR GROUP - POSITIONED & ROTATED FOR BORDER */}
          <g className='cat-ear-right'>
            {/* Outer Ear Fur */}
            <path 
              d='M108,38 C114,24 118,6 110,-6 C105,-12 99,-10 95,-2 C87,12 81,24 78,32 C90,32 100,35 108,38 Z' 
              fill='var(--svg-color, #D4A574)' 
              stroke='var(--svg-color, #B8864E)' 
              strokeWidth='1.5' 
              strokeLinejoin='round'
            />
            {/* Inner Ear Shadow */}
            <path 
              d='M103,34 C107,22 108,12 105,4 C104,12 102,22 100,29 Z' 
              fill='#F43F5E' 
              opacity='0.35'
            />
            {/* Inner Ear Pink */}
            <path 
              d='M103,34 C107,22 110,10 106,2 C103,-2 100,-2 97,3 C91,14 86,22 84,27 C92,28 98,31 103,34 Z' 
              fill='#FFB6C1' 
            />
            {/* White Ear Fluff */}
            <path 
              d='M84,27 C87,22 90,20 89,25 C92,21 94,20 93,26 C96,22 98,22 96,28 C92,28 88,27 84,27 Z' 
              fill='#FFFFFF'
            />
          </g>
        </g>
      </svg>
    ),
  },
  {
    id: 'rabbit_ears',
    name: 'Rabbit Ears',
    nameAr: 'آذان الأرنب',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.98'>
          
          {/* LEFT EAR GROUP - TALL & CURVED FOR BORDER (الأذن اليسرى الطويلة والمنحنية للخارج) */}
          <g transform='translate(0, 0)' className='rabbit-ear-left'>
            
            {/* Outer Ear Fur (جسم الأذن الخارجي بلون الفراء الأساسي) */}
            <path 
              d='M20,38 C14,10 10,-20 25,-40 C35,-20 45,10 50,32 C38,32 28,35 20,38 Z' 
              fill='var(--svg-color, #E5E7EB)' // اللون الافتراضي رمادي فاتح للأرنب
              stroke='var(--svg-color-stroke, #9CA3AF)' 
              strokeWidth='1.2' 
              strokeLinejoin='round'
            />
            
            {/* Inner Ear Pink (الجزء الداخلي الوردي) */}
            <path 
              d='M25,34 C19,10 16,-15 25,-35 C33,-15 41,10 44,27 C36,28 30,31 25,34 Z' 
              fill='#FFB6C1' 
            />
            
            {/* Inner Ear Shadow (ظل لإعطاء عمق ثلاثي الأبعاد) */}
            <path 
              d='M25,34 C21,15 20,5 23,-5 C24,10 28,20 28,29 Z' 
              fill='#F43F5E' 
              opacity='0.25'
            />
            
            {/* White Ear Fluff (وبر أبيض ناعم عند قاعدة الأذن) */}
            <path 
              d='M44,27 C41,22 38,20 39,25 C36,21 34,20 35,26 C32,22 30,22 32,28 C36,28 40,27 44,27 Z' 
              fill='#FFFFFF'
            />
          </g>


          {/* RIGHT EAR GROUP - TALL & CURVED FOR BORDER (الأذن اليمنى الطويلة والمنحنية - معكوسة بالملي) */}
          <g transform='translate(0, 0)' className='rabbit-ear-right'>
            
            {/* Outer Ear Fur */}
            <path 
              d='M108,38 C114,10 118,-20 103,-40 C93,-20 83,10 78,32 C90,32 100,35 108,38 Z' 
              fill='var(--svg-color, #E5E7EB)' 
              stroke='var(--svg-color-stroke, #9CA3AF)' 
              strokeWidth='1.2' 
              strokeLinejoin='round'
            />
            
            {/* Inner Ear Pink */}
            <path 
              d='M103,34 C109,10 112,-15 103,-35 C95,-15 87,10 84,27 C92,28 98,31 103,34 Z' 
              fill='#FFB6C1' 
            />
            
            {/* Inner Ear Shadow */}
            <path 
              d='M103,34 C107,15 108,5 105,-5 C104,10 100,20 100,29 Z' 
              fill='#F43F5E' 
              opacity='0.25'
            />
            
            {/* White Ear Fluff */}
            <path 
              d='M84,27 C87,22 90,20 89,25 C92,21 94,20 93,26 C96,22 98,22 96,28 C92,28 88,27 84,27 Z' 
              fill='#FFFFFF'
            />
          </g>
        </g>
      </svg>
    ),
  },
  {
    id: 'crown',
    name: 'Crown',
    nameAr: 'تاج',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g transform='translate(0, -26)'>
          <path
            d='M12,52 L20,20 L34,36 L48,12 L62,36 L76,20 L90,36 L104,12 L116,52 Z'
            fill='var(--svg-color, #F5D742)'
            stroke='var(--svg-color, #D4A017)'
            strokeWidth='1.5'
            opacity='0.85'
          />
          <rect x='12' y='44' width='104' height='10' rx='2' fill='var(--svg-color, #F5D742)' stroke='var(--svg-color, #D4A017)' strokeWidth='1' opacity='0.85' />
          <circle cx='34' cy='16' r='3' fill='#E85D5D' />
          <circle cx='64' cy='12' r='4' fill='#5DA8E8' />
          <circle cx='94' cy='16' r='3' fill='#5DE87A' />
          <circle cx='20' cy='48' r='2.5' fill='#E85D5D' />
          <circle cx='48' cy='48' r='2.5' fill='#5DA8E8' />
          <circle cx='64' cy='48' r='3' fill='#E85D5D' />
          <circle cx='80' cy='48' r='2.5' fill='#5DE87A' />
          <circle cx='108' cy='48' r='2.5' fill='#E85D5D' />
        </g>
      </svg>
    ),
  },
  {
    id: 'fakhma',
    name: 'Fakhma',
    nameAr: 'فخامة',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g className='main-crown-group' opacity='0.95'>
          {/* 1. BACK SHADOW LAYER (العمق الخلفي للتاج) */}
          <path
            d='M 22,34 Q 64,41 106,34 L 112,18 Q 94,28 84,14 Q 74,26 64,4 Q 54,26 44,14 Q 34,28 16,18 Z'
            fill='var(--svg-color-dark, #B45309)'
            opacity='0.5'
          />

          {/* 2. MAIN GOLD FRONT PLATE (جسم التاج الذهبي الأساسي المنحني) */}
          <path
            d='M 20,34 Q 64,42 108,34 L 114,16 Q 95,26 84,11 Q 74,24 64,1 Q 54,24 44,11 Q 33,26 14,16 Z'
            fill='var(--svg-color, #F5D742)'
            stroke='var(--svg-color-border, #D97706)'
            strokeWidth='1.2'
            strokeLinejoin='round'
          />

          {/* 3. EMBOSSED EMBELLISHMENTS (زخارف ونقوش ذهبية داخلية) */}
          <path
            d='M 24,31 Q 64,38 104,31 M 44,15 Q 54,26 64,6 Q 74,26 84,15'
            stroke='#FEF08A'
            strokeWidth='0.8'
            strokeLinecap='round'
          />

          {/* 4. THE CROWN HEADBAND (الإطار السفلي المرصع) */}
          <path
            d='M 20,34 Q 64,42 108,34 L 106,39 Q 64,47 22,39 Z'
            fill='var(--svg-color-darker, #D97706)'
            stroke='var(--svg-color-border, #B45309)'
            strokeWidth='0.6'
          />

          {/* 5. ULTRA-DETAILED PEAK GEMS (الجواهر العلوية المقصوصة) */}
          {/* Central Royal Blue Diamond */}
          <polygon points='64,-1 68,4 64,9 60,4' fill='#38BDF8' stroke='#0284C7' strokeWidth='0.5' className='shimmering-gem' />
          {/* Left Mid Emerald */}
          <polygon points='44,9 47,12 44,15 41,12' fill='#34D399' stroke='#059669' strokeWidth='0.5' />
          {/* Right Mid Emerald */}
          <polygon points='84,9 87,12 84,15 81,12' fill='#34D399' stroke='#059669' strokeWidth='0.5' />
          {/* Left Outer Ruby */}
          <polygon points='14,14 17,17 14,20 11,17' fill='#F87171' stroke='#DC2626' strokeWidth='0.5' />
          {/* Right Outer Ruby */}
          <polygon points='114,14 117,17 114,20 111,17' fill='#F87171' stroke='#DC2626' strokeWidth='0.5' />

          {/* 6. HEADBAND EMBEDDED JEWELS (الجواهر المثبتة في حزام التاج السفلي) */}
          <circle cx='34' cy='37.5' r='2' fill='#F87171' className='shimmering-gem' />
          <circle cx='49' cy='39' r='2' fill='#34D399' />
          <circle cx='64' cy='39.5' r='2.5' fill='#38BDF8' className='shimmering-gem' />
          <circle cx='79' cy='39' r='2' fill='#34D399' />
          <circle cx='94' cy='37.5' r='2' fill='#F87171' className='shimmering-gem' />
        </g>
      </svg>
    ),
  },
  {
    id: 'royal_fedora_hat',
    name: 'Royal Hat',
    nameAr: 'قبعة فيدورا الملكية',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        {/* نستخدم translate لرفع القبعة وضبطها فوق الرأس بالظبط، و rotate لجعلها مائلة بشكل أنيق */}
        <g transform='translate(0, -34) rotate(-5, 64, 40)'>
          
          {/* 1. THE FEATHER ACCENT (الريشة الجانبية الأنيقة خلف الشريط) */}
          <g transform='translate(36, 12) rotate(-25)'>
            {/* القصبة أو الجزء السفلي الداكن للريشة */}
            <path d='M0,25 Q-6,12 2,0 Q6,12 0,25 Z' fill='var(--svg-color, #3B82F6)' opacity='0.5' />
            {/* الريشة الأساسية الفاتحة */}
            <path d='M0,22 Q-4,10 2,2 Q4,12 0,22 Z' fill='#FFFFFF' opacity='0.9' />
            {/* تفاصيل الريشة */}
            <path d='M0,22 L0,4' stroke='var(--svg-color, #3B82F6)' strokeWidth='0.5' />
          </g>

          {/* 2. HAT CROWN BACK SHADOW (الظل الداخلي لعمق تجويف القبعة) */}
          <path 
            d='M38,36 C38,18 46,14 64,14 C82,14 90,18 90,36 Z' 
            fill='#111827' 
            opacity='0.3' 
          />

          {/* 3. MAIN HAT CROWN (جسم القبعة العلوي المخروطي مع انبعاج الفيدورا الشهير من أعلى) */}
          <path 
            d='M38,36 C36,24 48,16 64,20 C80,16 92,24 90,36 C90,44 38,44 38,36 Z' 
            fill='var(--svg-color, #1E293B)' 
            stroke='var(--svg-color-dark, #0F172A)' 
            strokeWidth='1.2' 
            strokeLinejoin='round'
          />

          {/* 4. THE SILK RIBBON (شريط الستان الملكي المحيط بالقبعة) */}
          <path 
            d='M37.5,36 C37.5,39 42,42 64,42 C86,42 90.5,39 90.5,36 C90.5,39 86,44 64,44 C42,44 37.5,39 37.5,36 Z' 
            fill='#334155' 
          />
          {/* خط إضاءة نيون فوق الشريط */}
          <path 
            d='M37.5,37 Q64,42 90.5,37' 
            stroke='#64748B' 
            strokeWidth='0.8' 
            fill='none' 
          />
          {/* جزيء ذهبي صغير كإبزيم للشريط (Ribbon Buckle) */}
          <rect x='42' y='36' width='4' height='6' rx='1' fill='#FBBF24' stroke='#D97706' strokeWidth='0.5' />

          {/* 5. THE BRIM (حافة القبعة العريضة والمنحنية لأسفل لتطابق دوران الحساب) */}
          {/* الطبقة السفلية الداكنة للحافة لإعطاء عمق 3D */}
          <path 
            d='M14,42 Q64,54 114,42 C124,42 120,46 108,49 Q64,58 20,49 C8,46 4,42 14,42 Z' 
            fill='var(--svg-color-dark, #0F172A)' 
          />
          {/* الطبقة العلوية الأساسية للحافة */}
          <path 
            d='M16,40 Q64,52 112,40 C122,40 120,44 108,47 Q64,56 20,47 C8,44 6,40 16,40 Z' 
            fill='var(--svg-color, #1E293B)' 
            stroke='var(--svg-color-dark, #0F172A)' 
            strokeWidth='1' 
          />

          {/* 6. BRIM HIGHLIGHT (خط لمعان ناعم على أطراف حافة القبعة) */}
          <path 
            d='M20,41 Q64,53 108,41' 
            stroke='#94A3B8' 
            strokeWidth='0.6' 
            strokeLinecap='round' 
            fill='none' 
          />
        </g>
      </svg>
    ),
  },
  {
    id: 'golden_horus_wings',
    name: 'Golden Horus',
    nameAr: 'أجنحة حورس الذهبية',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.98'>
          {/* 1. ROYAL EGYPTIAN COLLAR (طوق الفراعنة الذهبي المحيط بالصورة) */}
          <circle cx='64' cy='64' r='54' stroke='#F59E0B' strokeWidth='3' />
          <circle cx='64' cy='64' r='51' stroke='#1E3A8A' strokeWidth='2' strokeDasharray='4 2' />
          <circle cx='64' cy='64' r='48' stroke='#0891B2' strokeWidth='1.5' strokeDasharray='2 4' />

          {/* 2. THE WINGED SUN DISK (قرص الشمس المجنح في الأعلى) */}
          <g transform='translate(64, 10)'>
            {/* Sun Disk */}
            <circle cx='0' cy='0' r='8' fill='#EF4444' stroke='#FBBF24' strokeWidth='1.5' />
            {/* Uraeus (أفاعي الكوبرا الملكية الجانبية) */}
            <path d='M-9,2 C-12,-4 -16,-2 -16,4 C-16,8 -12,8 -8,4' fill='none' stroke='#FBBF24' strokeWidth='1.5' />
            <path d='M9,2 C12,-4 16,-2 16,4 C16,8 12,8 8,4' fill='none' stroke='#FBBF24' strokeWidth='1.5' />
            {/* Top Wings (الأجنحة العلوية الممتدة من الشمس) */}
            <path d='M-10,0 C-20,-8 -35,-5 -45,5 C-30,0 -15,5 -10,8 Z' fill='#FBBF24' />
            <path d='M-12,2 C-22,-4 -33,-2 -40,5 C-30,2 -18,6 -10,8 Z' fill='#1E3A8A' />
            <path d='M10,0 C20,-8 35,-5 45,5 C30,0 15,5 10,8 Z' fill='#FBBF24' />
            <path d='M12,2 C22,-4 33,-2 40,5 C30,2 18,6 10,8 Z' fill='#1E3A8A' />
          </g>

          {/* 3. HORUS LOWER WINGS (أجنحة حورس السفلية التي تحتضن الإطار) */}
          {/* Left Lower Wing */}
          <g transform='translate(16, 80) rotate(15)'>
            {/* Golden Base */}
            <path d='M48,36 C30,36 10,20 0,-10 C5,5 20,20 48,25 Z' fill='#F59E0B' />
            {/* Lapis Lazuli (اللازورد الأزرق) */}
            <path d='M45,33 C28,33 12,18 4,-8 C8,6 20,18 45,22 Z' fill='#1E3A8A' />
            {/* Turquoise (الفيروز) */}
            <path d='M42,30 C26,30 14,16 8,-6 C11,6 20,16 42,19 Z' fill='#0891B2' />
            {/* Feather Cuts (تقطيعات الريش الذهبية) */}
            <path d='M30,35 L28,24 M20,29 L18,18 M10,18 L10,8' stroke='#FBBF24' strokeWidth='1.2' strokeLinecap='round' />
          </g>

          {/* Right Lower Wing */}
          <g transform='translate(112, 80) rotate(-15) scale(-1, 1)'>
            {/* Golden Base */}
            <path d='M48,36 C30,36 10,20 0,-10 C5,5 20,20 48,25 Z' fill='#F59E0B' />
            {/* Lapis Lazuli */}
            <path d='M45,33 C28,33 12,18 4,-8 C8,6 20,18 45,22 Z' fill='#1E3A8A' />
            {/* Turquoise */}
            <path d='M42,30 C26,30 14,16 8,-6 C11,6 20,16 42,19 Z' fill='#0891B2' />
            {/* Feather Cuts */}
            <path d='M30,35 L28,24 M20,29 L18,18 M10,18 L10,8' stroke='#FBBF24' strokeWidth='1.2' strokeLinecap='round' />
          </g>

          {/* 4. SACRED GEOMETRY & JEWELS (مجوهرات ورموز هندسية مقدسة) */}
          {/* الجعران أو الجوهرة السفلية */}
          <polygon points='64,112 68,120 64,128 60,120' fill='#1E3A8A' stroke='#FBBF24' strokeWidth='1.5' />
          <circle cx='64' cy='120' r='1.5' fill='#EF4444' />
          
          {/* نجوم ذهبية خماسية عائمة */}
          <path d='M16,40 L18,46 L24,46 L19,50 L21,56 L16,52 L11,56 L13,50 L8,46 L14,46 Z' fill='#FBBF24' transform='scale(0.5) translate(16, 40)' />
          <path d='M16,40 L18,46 L24,46 L19,50 L21,56 L16,52 L11,56 L13,50 L8,46 L14,46 Z' fill='#FBBF24' transform='scale(0.5) translate(220, 40)' />
        </g>
      </svg>
    ),
  },
  {
    id: 'angel_wings',
    name: 'Angel Wings',
    nameAr: 'أجنحة الملاك',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.95'>
          {/* LEFT WING GROUP */}
          {/* هنا تزود المسافة لليسار: غير الـ -10 لـ -15 أو -20 لتبتعد أكثر عن السنتر */}
          <g transform='translate(-13, 0)'>
            <g className='angel-wing-left'>
              {/* Base Backing & Outer Long Feathers */}
              <path
                d='M26,76 C14,54 -12,38 2,10 C10,-2 18,6 22,24 C26,42 28,62 26,76 Z'
                fill='var(--svg-color, #F0F8FF)'
                stroke='var(--svg-color-stroke, #CBD5E1)'
                strokeWidth='1'
                strokeLinejoin='round'
              />
              {/* Middle Soft Covert Feathers */}
              <path
                d='M24,60 C14,42 -4,28 6,14 C12,4 18,12 22,32 C24,46 25,54 24,60 Z'
                fill='#FFFFFF'
                stroke='#E2E8F0'
                strokeWidth='0.6'
              />
              {/* Lower Downy Feathers */}
              <path
                d='M26,76 C20,88 6,102 2,112 C10,114 20,98 26,76 Z'
                fill='var(--svg-color, #F0F8FF)'
                stroke='var(--svg-color-stroke, #CBD5E1)'
                strokeWidth='0.8'
                opacity='0.8'
              />
              {/* Fine Feather Quill Details */}
              <path d='M24,50 C12,36 0,26 6,14' stroke='#E2E8F0' strokeWidth='0.6' strokeLinecap='round' />
              <path d='M25,65 C16,52 6,42 10,32' stroke='#E2E8F0' strokeWidth='0.5' strokeLinecap='round' />
            </g>
          </g>

          {/* RIGHT WING GROUP */}
          {/* هنا تزود المسافة لليمين: غير الـ 10 لـ 15 أو 20 لتبتعد أكثر عن السنتر */}
          <g transform='translate(13, 0)'>
            <g className='angel-wing-right'>
              {/* Base Backing & Outer Long Feathers */}
              <path
                d='M102,76 C114,54 140,38 126,10 C118,-2 110,6 106,24 C102,42 100,62 102,76 Z'
                fill='var(--svg-color, #F0F8FF)'
                stroke='var(--svg-color-stroke, #CBD5E1)'
                strokeWidth='1'
                strokeLinejoin='round'
              />
              {/* Middle Soft Covert Feathers */}
              <path
                d='M104,60 C114,42 132,28 122,14 C116,4 110,12 106,32 C104,46 103,54 104,60 Z'
                fill='#FFFFFF'
                stroke='#E2E8F0'
                strokeWidth='0.6'
              />
              {/* Lower Downy Feathers */}
              <path
                d='M102,76 C108,88 122,102 126,112 C118,114 108,98 102,76 Z'
                fill='var(--svg-color, #F0F8FF)'
                stroke='var(--svg-color-stroke, #CBD5E1)'
                strokeWidth='0.8'
                opacity='0.8'
              />
              {/* Fine Feather Quill Details */}
              <path d='M104,50 C116,36 128,26 122,14' stroke='#E2E8F0' strokeWidth='0.6' strokeLinecap='round' />
              <path d='M103,65 C112,52 122,42 118,32' stroke='#E2E8F0' strokeWidth='0.5' strokeLinecap='round' />
            </g>
          </g>
        </g>
      </svg>
    ),
  },
 {
    id: 'flower_crown',
    name: 'Flower Crown',
    nameAr: 'إكليل الزهور',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g transform='translate(0, -10)'>
          {/* LAYER 1: BASE VINES & BACK LEAVES (أغصان اللبلاب الخلفية لتعطي عمق) */}
          <path 
            d='M 18,40 Q 64,12 110,40' 
            stroke='#166534' 
            strokeWidth='2.5' 
            strokeLinecap='round' 
            fill='none' 
          />
          <path 
            d='M 22,36 Q 64,16 106,36' 
            stroke='#4ADE80' 
            strokeWidth='1' 
            strokeLinecap='round' 
            fill='none' 
          />

          {/* DETAILED LEAVES WITH VEINS (أوراق شجر مفصلة مع عروقها الداخلية) */}
          {/* Left Leaf 1 */}
          <path d='M24,32 C16,28 14,18 24,16 C28,22 28,28 24,32 Z' fill='#15803D' stroke='#166534' strokeWidth='0.5' />
          <path d='M19,24 Q24,24 24,23' stroke='#86EFAC' strokeWidth='0.4' />
          {/* Left Leaf 2 */}
          <path d='M42,21 C36,12 40,4 48,8 C46,16 46,18 42,21 Z' fill='#22C55E' stroke='#15803D' strokeWidth='0.5' />
          <path d='M42,11 Q44,15 45,15' stroke='#DCFCE7' strokeWidth='0.4' />
          {/* Right Leaf 1 */}
          <path d='M86,21 C92,12 88,4 80,8 C82,16 82,18 86,21 Z' fill='#22C55E' stroke='#15803D' strokeWidth='0.5' />
          <path d='M86,11 Q84,15 83,15' stroke='#DCFCE7' strokeWidth='0.4' />
          {/* Right Leaf 2 */}
          <path d='M104,32 C112,28 114,18 104,16 C100,22 100,28 104,32 Z' fill='#15803D' stroke='#166534' strokeWidth='0.5' />
          <path d='M109,24 Q104,24 104,23' stroke='#86EFAC' strokeWidth='0.4' />

          {/* GOLDEN FLOWER BUDS (براعم زهور صغيرة ذهبية تملأ الفراغات) */}
          <circle cx='38' cy='28' r='2.5' fill='#FBBF24' stroke='#D97706' strokeWidth='0.5' />
          <circle cx='90' cy='28' r='2.5' fill='#FBBF24' stroke='#D97706' strokeWidth='0.5' />
          <circle cx='56' cy='17' r='2' fill='#FDA4AF' />
          <circle cx='72' cy='17' r='2' fill='#FDA4AF' />

          {/* FLOWER 1 (Left Outer - Pink Layered Rose) */}
          <g transform='translate(30, 36)'>
            {/* Outer Petals */}
            <g fill='#E11D48'>
              <path d='M0,-11 C-7,-11 -9,-4 0,-2 C9,-4 7,-11 0,-11 Z' transform='rotate(0)' />
              <path d='M0,-11 C-7,-11 -9,-4 0,-2 C9,-4 7,-11 0,-11 Z' transform='rotate(72)' />
              <path d='M0,-11 C-7,-11 -9,-4 0,-2 C9,-4 7,-11 0,-11 Z' transform='rotate(144)' />
              <path d='M0,-11 C-7,-11 -9,-4 0,-2 C9,-4 7,-11 0,-11 Z' transform='rotate(216)' />
              <path d='M0,-11 C-7,-11 -9,-4 0,-2 C9,-4 7,-11 0,-11 Z' transform='rotate(288)' />
            </g>
            {/* Inner Light Petals */}
            <g fill='#FF6B9D'>
              <path d='M0,-7 C-4,-7 -5,-2 0,-1 C5,-2 4,-7 0,-7 Z' transform='rotate(36)' />
              <path d='M0,-7 C-4,-7 -5,-2 0,-1 C5,-2 4,-7 0,-7 Z' transform='rotate(108)' />
              <path d='M0,-7 C-4,-7 -5,-2 0,-1 C5,-2 4,-7 0,-7 Z' transform='rotate(180)' />
              <path d='M0,-7 C-4,-7 -5,-2 0,-1 C5,-2 4,-7 0,-7 Z' transform='rotate(252)' />
              <path d='M0,-7 C-4,-7 -5,-2 0,-1 C5,-2 4,-7 0,-7 Z' transform='rotate(324)' />
            </g>
            {/* Core */}
            <circle cx='0' cy='0' r='2.5' fill='#FFD700' stroke='#CA8A04' strokeWidth='0.5' />
          </g>

          {/* FLOWER 2 (Left Mid - Detailed Orange Blossom) */}
          <g transform='translate(48, 24)'>
            <g fill='#F97316' stroke='#EA580C' strokeWidth='0.4'>
              <path d='M0,-9 C-5,-9 -6,-3 0,-1 C6,-3 5,-9 0,-9 Z' transform='rotate(0)' />
              <path d='M0,-9 C-5,-9 -6,-3 0,-1 C6,-3 5,-9 0,-9 Z' transform='rotate(72)' />
              <path d='M0,-9 C-5,-9 -6,-3 0,-1 C6,-3 5,-9 0,-9 Z' transform='rotate(144)' />
              <path d='M0,-9 C-5,-9 -6,-3 0,-1 C6,-3 5,-9 0,-9 Z' transform='rotate(216)' />
              <path d='M0,-9 C-5,-9 -6,-3 0,-1 C6,-3 5,-9 0,-9 Z' transform='rotate(288)' />
            </g>
            {/* Highlights on Petals */}
            <path d='M0,-8 L0,-4' stroke='#FFEDD5' strokeWidth='0.6' strokeLinecap='round' transform='rotate(0)' />
            <path d='M0,-8 L0,-4' stroke='#FFEDD5' strokeWidth='0.6' strokeLinecap='round' transform='rotate(72)' />
            <path d='M0,-8 L0,-4' stroke='#FFEDD5' strokeWidth='0.6' strokeLinecap='round' transform='rotate(144)' />
            <path d='M0,-8 L0,-4' stroke='#FFEDD5' strokeWidth='0.6' strokeLinecap='round' transform='rotate(216)' />
            <path d='M0,-8 L0,-4' stroke='#FFEDD5' strokeWidth='0.6' strokeLinecap='round' transform='rotate(288)' />
            <circle cx='0' cy='0' r='2.5' fill='#FEF08A' />
          </g>

          {/* FLOWER 3 (Center Main - Premium 3D Peony) */}
          <g transform='translate(64, 17)'>
            {/* Deep Shadow Base */}
            <circle cx='0' cy='2' r='12' fill='#9F1239' opacity='0.3' />
            {/* Outer Giant Petals */}
            <g fill='#9F1239'>
              <path d='M0,-13 C-8,-13 -11,-4 0,-2 C11,-4 8,-13 0,-13 Z' transform='rotate(0)' />
              <path d='M0,-13 C-8,-13 -11,-4 0,-2 C11,-4 8,-13 0,-13 Z' transform='rotate(60)' />
              <path d='M0,-13 C-8,-13 -11,-4 0,-2 C11,-4 8,-13 0,-13 Z' transform='rotate(120)' />
              <path d='M0,-13 C-8,-13 -11,-4 0,-2 C11,-4 8,-13 0,-13 Z' transform='rotate(180)' />
              <path d='M0,-13 C-8,-13 -11,-4 0,-2 C11,-4 8,-13 0,-13 Z' transform='rotate(240)' />
              <path d='M0,-13 C-8,-13 -11,-4 0,-2 C11,-4 8,-13 0,-13 Z' transform='rotate(300)' />
            </g>
            {/* Mid Crimson Layer */}
            <g fill='#F43F5E'>
              <path d='M0,-11 C-7,-11 -9,-3 0,-1 C9,-3 7,-11 0,-11 Z' transform='rotate(30)' />
              <path d='M0,-11 C-7,-11 -9,-3 0,-1 C9,-3 7,-11 0,-11 Z' transform='rotate(90)' />
              <path d='M0,-11 C-7,-11 -9,-3 0,-1 C9,-3 7,-11 0,-11 Z' transform='rotate(150)' />
              <path d='M0,-11 C-7,-11 -9,-3 0,-1 C9,-3 7,-11 0,-11 Z' transform='rotate(210)' />
              <path d='M0,-11 C-7,-11 -9,-3 0,-1 C9,-3 7,-11 0,-11 Z' transform='rotate(270)' />
              <path d='M0,-11 C-7,-11 -9,-3 0,-1 C9,-3 7,-11 0,-11 Z' transform='rotate(330)' />
            </g>
            {/* Inner Soft Pink Crown */}
            <g fill='#FF85A2'>
              <circle cx='0' cy='-6' r='3' />
              <circle cx='5' cy='-3' r='3' />
              <circle cx='4' cy='4' r='3' />
              <circle cx='-4' cy='4' r='3' />
              <circle cx='-5' cy='-3' r='3' />
            </g>
            {/* Center Pistils */}
            <circle cx='0' cy='0' r='3' fill='#FFD700' stroke='#B45309' strokeWidth='0.5' />
            <circle cx='-1' cy='-1' r='0.7' fill='#FFF' />
            <circle cx='1' cy='1' r='0.7' fill='#FFF' />
          </g>

          {/* FLOWER 4 (Right Mid - Detailed Purple Orchid) */}
          <g transform='translate(80, 24)'>
            <g fill='#A855F7' stroke='#7E22CE' strokeWidth='0.4'>
              <path d='M0,-9 C-5,-9 -6,-3 0,-1 C6,-3 5,-9 0,-9 Z' transform='rotate(0)' />
              <path d='M0,-9 C-5,-9 -6,-3 0,-1 C6,-3 5,-9 0,-9 Z' transform='rotate(72)' />
              <path d='M0,-9 C-5,-9 -6,-3 0,-1 C6,-3 5,-9 0,-9 Z' transform='rotate(144)' />
              <path d='M0,-9 C-5,-9 -6,-3 0,-1 C6,-3 5,-9 0,-9 Z' transform='rotate(216)' />
              <path d='M0,-9 C-5,-9 -6,-3 0,-1 C6,-3 5,-9 0,-9 Z' transform='rotate(288)' />
            </g>
            {/* Highlights on Petals */}
            <path d='M0,-8 L0,-4' stroke='#F3E8FF' strokeWidth='0.6' strokeLinecap='round' transform='rotate(0)' />
            <path d='M0,-8 L0,-4' stroke='#F3E8FF' strokeWidth='0.6' strokeLinecap='round' transform='rotate(72)' />
            <path d='M0,-8 L0,-4' stroke='#F3E8FF' strokeWidth='0.6' strokeLinecap='round' transform='rotate(144)' />
            <path d='M0,-8 L0,-4' stroke='#F3E8FF' strokeWidth='0.6' strokeLinecap='round' transform='rotate(216)' />
            <path d='M0,-8 L0,-4' stroke='#F3E8FF' strokeWidth='0.6' strokeLinecap='round' transform='rotate(288)' />
            <circle cx='0' cy='0' r='2.5' fill='#FEF08A' />
          </g>

          {/* FLOWER 5 (Right Outer - Orange Layered Rose) */}
          <g transform='translate(98, 36)'>
            {/* Outer Petals */}
            <g fill='#D97706'>
              <path d='M0,-11 C-7,-11 -9,-4 0,-2 C9,-4 7,-11 0,-11 Z' transform='rotate(0)' />
              <path d='M0,-11 C-7,-11 -9,-4 0,-2 C9,-4 7,-11 0,-11 Z' transform='rotate(72)' />
              <path d='M0,-11 C-7,-11 -9,-4 0,-2 C9,-4 7,-11 0,-11 Z' transform='rotate(144)' />
              <path d='M0,-11 C-7,-11 -9,-4 0,-2 C9,-4 7,-11 0,-11 Z' transform='rotate(216)' />
              <path d='M0,-11 C-7,-11 -9,-4 0,-2 C9,-4 7,-11 0,-11 Z' transform='rotate(288)' />
            </g>
            {/* Inner Light Petals */}
            <g fill='#FF9F43'>
              <path d='M0,-7 C-4,-7 -5,-2 0,-1 C5,-2 4,-7 0,-7 Z' transform='rotate(36)' />
              <path d='M0,-7 C-4,-7 -5,-2 0,-1 C5,-2 4,-7 0,-7 Z' transform='rotate(108)' />
              <path d='M0,-7 C-4,-7 -5,-2 0,-1 C5,-2 4,-7 0,-7 Z' transform='rotate(180)' />
              <path d='M0,-7 C-4,-7 -5,-2 0,-1 C5,-2 4,-7 0,-7 Z' transform='rotate(252)' />
              <path d='M0,-7 C-4,-7 -5,-2 0,-1 C5,-2 4,-7 0,-7 Z' transform='rotate(324)' />
            </g>
            {/* Core */}
            <circle cx='0' cy='0' r='2.5' fill='#FFD700' stroke='#CA8A04' strokeWidth='0.5' />
          </g>
        </g>
      </svg>
    ),
  },
  {
    id: 'star_halo',
    name: 'Star Halo',
    nameAr: 'هالة النجوم',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g transform='translate(0, -8)'>
          {/* 1. BACK GLOW RING (طوق النور السحري الخلفي) */}
          <path 
            d='M 14,42 Q 64,10 114,42' 
            stroke='var(--svg-color, #FFD700)' 
            strokeWidth='4' 
            strokeLinecap='round' 
            opacity='0.15'
            fill='none'
          />
          <path 
            d='M 14,42 Q 64,10 114,42' 
            stroke='#FFF' 
            strokeWidth='1' 
            strokeLinecap='round' 
            opacity='0.4'
            fill='none'
          />

          {/* 2. BACKGROUND SHIMMERING PARTICLES (جزيئات البريق السحرية العائمة) */}
          <circle cx='32' cy='22' r='1.5' fill='#FFF' opacity='0.7' />
          <circle cx='40' cy='16' r='1' fill='#FFE4E1' opacity='0.6' />
          <circle cx='54' cy='11' r='2' fill='var(--svg-color, #FFD700)' opacity='0.8' />
          <circle cx='74' cy='11' r='1.5' fill='#FFF' opacity='0.9' />
          <circle cx='88' cy='16' r='2' fill='var(--svg-color, #FFD700)' opacity='0.8' />
          <circle cx='96' cy='22' r='1' fill='#FFE4E1' opacity='0.6' />

          {/* 3. CENTRAL MAIN STAR (النجمة الملكية الكبرى في المنتصف 8-Points) */}
          <g transform='translate(64, 10)'>
            {/* Soft Outer Glow */}
            <path d='M0,-14 Q0,0 -14,0 Q0,0 0,14 Q0,0 14,0 Q0,0 0,-14 Z' fill='var(--svg-color, #FFD700)' opacity='0.3' />
            {/* Primary Sharp 4 Points */}
            <path d='M0,-12 Q0,0 -12,0 Q0,0 0,12 Q0,0 12,0 Q0,0 0,-12 Z' fill='#FFF' />
            {/* Secondary Diagonal 4 Points */}
            <path d='M0,-8 Q0,0 -8,0 Q0,0 0,8 Q0,0 8,0 Q0,0 0,-8 Z' fill='var(--svg-color, #FFD700)' transform='rotate(45)' />
            {/* Center Core */}
            <circle cx='0' cy='0' r='1.5' fill='#FFF' />
          </g>

          {/* 4. MID STARS (النجمتان المتوسطتان يميناً ويساراً) */}
          {/* Left Mid Star */}
          <g transform='translate(40, 19)'>
            <path d='M0,-9 Q0,0 -9,0 Q0,0 0,9 Q0,0 9,0 Q0,0 0,-9 Z' fill='var(--svg-color, #FFD700)' />
            <path d='M0,-7 Q0,0 -7,0 Q0,0 0,7 Q0,0 7,0 Q0,0 0,-7 Z' fill='#FFF' />
          </g>
          {/* Right Mid Star */}
          <g transform='translate(88, 19)'>
            <path d='M0,-9 Q0,0 -9,0 Q0,0 0,9 Q0,0 9,0 Q0,0 0,-9 Z' fill='var(--svg-color, #FFD700)' />
            <path d='M0,-7 Q0,0 -7,0 Q0,0 0,7 Q0,0 7,0 Q0,0 0,-7 Z' fill='#FFF' />
          </g>

          {/* 5. OUTER STARS (النجوم الخارجية المستقرة على حافة البوردر) */}
          {/* Left Outer Star */}
          <g transform='translate(18, 38)'>
            <path d='M0,-8 Q0,0 -8,0 Q0,0 0,8 Q0,0 8,0 Q0,0 0,-8 Z' fill='var(--svg-color, #FFD700)' />
            <path d='M0,-5 Q0,0 -5,0 Q0,0 0,5 Q0,0 5,0 Q0,0 0,-5 Z' fill='#FFF' />
            <circle cx='-4' cy='4' r='0.6' fill='#FFF' />
          </g>
          {/* Right Outer Star */}
          <g transform='translate(110, 38)'>
            <path d='M0,-8 Q0,0 -8,0 Q0,0 0,8 Q0,0 8,0 Q0,0 0,-8 Z' fill='var(--svg-color, #FFD700)' />
            <path d='M0,-5 Q0,0 -5,0 Q0,0 0,5 Q0,0 5,0 Q0,0 0,-5 Z' fill='#FFF' />
            <circle cx='4' cy='4' r='0.6' fill='#FFF' />
          </g>

          {/* 6. TINY DIAMOND SPARKS (ومضات ماسية صغيرة جداً لإغناء المشهد) */}
          <polygon points='53,22 55,24 53,26 51,24' fill='#FFF' opacity='0.9' />
          <polygon points='75,22 77,24 75,26 73,24' fill='#FFF' opacity='0.9' />
          <polygon points='26,27 27,28 26,29 25,28' fill='var(--svg-color, #FFD700)' />
          <polygon points='102,27 103,28 102,29 101,28' fill='var(--svg-color, #FFD700)' />
        </g>
      </svg>
    ),
  },
  {
    id: 'cosmic_ring_stars',
    name: 'Cosmic Ring Stars',
    nameAr: 'طوق النجوم الكوني',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        {/* 1. BACKGROUND GLOW RING (حلقة الضوء النيون الخلفية المحيطة بالكامل) */}
        <circle 
          cx='64' 
          cy='64' 
          r='54' 
          stroke='var(--svg-color, #FFD700)' 
          strokeWidth='3' 
          opacity='0.15' 
        />
        <circle 
          cx='64' 
          cy='64' 
          r='54' 
          stroke='#FFFFFF' 
          strokeWidth='0.8' 
          strokeDasharray='4 8' 
          opacity='0.4' 
        />

        {/* 2. THE 4 MAIN CARDINAL STARS (النجوم الأربعة الكبرى في الاتجاهات الأساسية) */}
        {/* Top Star (North) */}
        <g transform='translate(64, 10)'>
          <path d='M0,-8 Q0,0 -8,0 Q0,0 0,8 Q0,0 8,0 Q0,0 0,-8 Z' fill='var(--svg-color, #FFD700)' />
          <path d='M0,-6 Q0,0 -6,0 Q0,0 0,6 Q0,0 6,0 Q0,0 0,-6 Z' fill='#FFF' />
        </g>
        {/* Bottom Star (South) */}
        <g transform='translate(64, 118)'>
          <path d='M0,-8 Q0,0 -8,0 Q0,0 0,8 Q0,0 8,0 Q0,0 0,-8 Z' fill='var(--svg-color, #FFD700)' />
          <path d='M0,-6 Q0,0 -6,0 Q0,0 0,6 Q0,0 6,0 Q0,0 0,-6 Z' fill='#FFF' />
        </g>
        {/* Left Star (West) */}
        <g transform='translate(10, 64)'>
          <path d='M0,-8 Q0,0 -8,0 Q0,0 0,8 Q0,0 8,0 Q0,0 0,-8 Z' fill='var(--svg-color, #FFD700)' />
          <path d='M0,-6 Q0,0 -6,0 Q0,0 0,6 Q0,0 6,0 Q0,0 0,-6 Z' fill='#FFF' />
        </g>
        {/* Right Star (East) */}
        <g transform='translate(118, 64)'>
          <path d='M0,-8 Q0,0 -8,0 Q0,0 0,8 Q0,0 8,0 Q0,0 0,-8 Z' fill='var(--svg-color, #FFD700)' />
          <path d='M0,-6 Q0,0 -6,0 Q0,0 0,6 Q0,0 6,0 Q0,0 0,-6 Z' fill='#FFF' />
        </g>

        {/* 3. DIAGONAL SPARKS (الومضات الماسية المتوسطة على الزوايا المائلة) */}
        {/* Top-Left */}
        <g transform='translate(26, 26)'>
          <path d='M0,-5 Q0,0 -5,0 Q0,0 0,5 Q0,0 5,0 Q0,0 0,-5 Z' fill='var(--svg-color, #FFD700)' />
          <circle cx='0' cy='0' r='1' fill='#FFF' />
        </g>
        {/* Top-Right */}
        <g transform='translate(102, 26)'>
          <path d='M0,-5 Q0,0 -5,0 Q0,0 0,5 Q0,0 5,0 Q0,0 0,-5 Z' fill='var(--svg-color, #FFD700)' />
          <circle cx='0' cy='0' r='1' fill='#FFF' />
        </g>
        {/* Bottom-Left */}
        <g transform='translate(26, 102)'>
          <path d='M0,-5 Q0,0 -5,0 Q0,0 0,5 Q0,0 5,0 Q0,0 0,-5 Z' fill='var(--svg-color, #FFD700)' />
          <circle cx='0' cy='0' r='1' fill='#FFF' />
        </g>
        {/* Bottom-Right */}
        <g transform='translate(102, 102)'>
          <path d='M0,-5 Q0,0 -5,0 Q0,0 0,5 Q0,0 5,0 Q0,0 0,-5 Z' fill='var(--svg-color, #FFD700)' />
          <circle cx='0' cy='0' r='1' fill='#FFF' />
        </g>

        {/* 4. ORBITAL MAGIC DUST (جزيئات سحرية صغيرة موزعة بدقة لتكملة الحلقة الكاملة) */}
        {/* Top Arc Fillers */}
        <circle cx='45' cy='14' r='1.5' fill='#FFF' opacity='0.8' />
        <circle cx='83' cy='14' r='1.5' fill='#FFF' opacity='0.8' />
        {/* Bottom Arc Fillers */}
        <circle cx='45' cy='114' r='1.5' fill='#FFF' opacity='0.8' />
        <circle cx='83' cy='114' r='1.5' fill='#FFF' opacity='0.8' />
        {/* Left Arc Fillers */}
        <circle cx='14' cy='45' r='1.2' fill='var(--svg-color, #FFD700)' />
        <circle cx='14' cy='83' r='1.2' fill='var(--svg-color, #FFD700)' />
        {/* Right Arc Fillers */}
        <circle cx='114' cy='45' r='1.2' fill='var(--svg-color, #FFD700)' />
        <circle cx='114' cy='83' r='1.2' fill='var(--svg-color, #FFD700)' />

        {/* Tiny Geometric Diamond Points */}
        <polygon points='64,22 65,23 64,24 63,23' fill='#FFF' />
        <polygon points='64,104 65,105 64,106 63,105' fill='#FFF' />
        <polygon points='22,64 23,65 22,66 21,65' fill='#FFF' />
        <polygon points='104,64 105,65 104,66 103,65' fill='#FFF' />
      </svg>
    ),
  },
  {
    id: 'arcane_astral_sigil',
    name: 'Arcane Astral Sigil',
    nameAr: 'ختم الأركين النجمي',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        {/* 1. OUTER MAGICAL RINGS (الحلقات السحرية المتداخلة لتعطي عمق أسطوري) */}
        <circle 
          cx='64' 
          cy='64' 
          r='58' 
          stroke='var(--svg-color, #A855F7)' 
          strokeWidth='1.5' 
          opacity='0.4' 
        />
        <circle 
          cx='64' 
          cy='64' 
          r='54' 
          stroke='var(--svg-color, #A855F7)' 
          strokeWidth='0.8' 
          strokeDasharray='6 3 1 3' 
          opacity='0.6' 
        />
        <circle 
          cx='64' 
          cy='64' 
          r='50' 
          stroke='#FFFFFF' 
          strokeWidth='0.5' 
          opacity='0.3' 
        />

        {/* 2. ARCANE RUNES & SIGIL LINES (خطوط الختم والحروف الرونية على الأطراف) */}
        {/* Top/Bottom/Left/Right Bracket Accents */}
        <path d='M54,6 Q64,2 74,6' stroke='#FFFFFF' strokeWidth='1.2' strokeLinecap='round' opacity='0.8' />
        <path d='M54,122 Q64,126 74,122' stroke='#FFFFFF' strokeWidth='1.2' strokeLinecap='round' opacity='0.8' />
        <path d='M6,54 Q2,64 6,74' stroke='#FFFFFF' strokeWidth='1.2' strokeLinecap='round' opacity='0.8' />
        <path d='M122,54 Q126,64 122,74' stroke='#FFFFFF' strokeWidth='1.2' strokeLinecap='round' opacity='0.8' />

        {/* 3. FLOATING FANTASY CRYSTALS (البلورات الكريستالية العائمة ثلاثية الأبعاد) */}
        {/* Top Crystal */}
        <g transform='translate(64, 10)'>
          <polygon points='0,-8 4,0 0,8 -4,0' fill='#FFFFFF' />
          <polygon points='0,-8 0,8 4,0' fill='var(--svg-color, #A855F7)' opacity='0.5' />
        </g>
        {/* Bottom Crystal */}
        <g transform='translate(64, 118)'>
          <polygon points='0,-8 4,0 0,8 -4,0' fill='#FFFFFF' />
          <polygon points='0,-8 0,8 -4,0' fill='var(--svg-color, #A855F7)' opacity='0.5' />
        </g>
        {/* Left Crystal */}
        <g transform='translate(10, 64)'>
          <polygon points='0,-4 8,0 0,4 -8,0' fill='#FFFFFF' />
          <polygon points='0,-4 8,0 0,4' fill='var(--svg-color, #A855F7)' opacity='0.5' />
        </g>
        {/* Right Crystal */}
        <g transform='translate(118, 64)'>
          <polygon points='0,-4 8,0 0,4 -8,0' fill='#FFFFFF' />
          <polygon points='0,-4 -8,0 0,4' fill='var(--svg-color, #A855F7)' opacity='0.5' />
        </g>

        {/* 4. FOUR CORNER FANTASY CRESTS (الشعارات السحرية المتقاطعة على الزوايا) */}
        {/* Top-Left Crest */}
        <g transform='translate(28, 28) rotate(45)'>
          <rect x='-4' y='-4' width='8' height='8' stroke='var(--svg-color, #A855F7)' strokeWidth='1' fill='#111827' />
          <circle cx='0' cy='0' r='1.5' fill='#FFFFFF' />
        </g>
        {/* Top-Right Crest */}
        <g transform='translate(100, 28) rotate(45)'>
          <rect x='-4' y='-4' width='8' height='8' stroke='var(--svg-color, #A855F7)' strokeWidth='1' fill='#111827' />
          <circle cx='0' cy='0' r='1.5' fill='#FFFFFF' />
        </g>
        {/* Bottom-Left Crest */}
        <g transform='translate(28, 100) rotate(45)'>
          <rect x='-4' y='-4' width='8' height='8' stroke='var(--svg-color, #A855F7)' strokeWidth='1' fill='#111827' />
          <circle cx='0' cy='0' r='1.5' fill='#FFFFFF' />
        </g>
        {/* Bottom-Right Crest */}
        <g transform='translate(100, 100) rotate(45)'>
          <rect x='-4' y='-4' width='8' height='8' stroke='var(--svg-color, #A855F7)' strokeWidth='1' fill='#111827' />
          <circle cx='0' cy='0' r='1.5' fill='#FFFFFF' />
        </g>

        {/* 5. ASTRAL SPARKS & MAGIC PARTICLES (شرارات الطاقة النجمية المتوهجة) */}
        {/* Sharp 4-point Stars Filling the Gaps */}
        <path d='M64,24 Q64,28 60,28 Q64,28 64,32 Q64,28 68,28 Q64,28 64,24 Z' fill='#FFFFFF' />
        <path d='M64,96 Q64,100 60,100 Q64,100 64,104 Q64,100 68,100 Q64,100 64,96 Z' fill='#FFFFFF' />
        <path d='M28,64 Q28,68 24,68 Q28,68 28,72 Q28,68 32,68 Q28,68 28,64 Z' fill='var(--svg-color, #A855F7)' />
        <path d='M100,64 Q100,68 96,68 Q100,68 100,72 Q100,68 104,68 Q100,68 100,64 Z' fill='var(--svg-color, #A855F7)' />

        {/* Micro Light Dust */}
        <circle cx='46' cy='16' r='1' fill='#FFFFFF' opacity='0.7' />
        <circle cx='82' cy='16' r='1' fill='#FFFFFF' opacity='0.7' />
        <circle cx='16' cy='46' r='1' fill='var(--svg-color, #A855F7)' />
        <circle cx='112' cy='46' r='1' fill='var(--svg-color, #A855F7)' />
        <circle cx='16' cy='82' r='1' fill='var(--svg-color, #A855F7)' />
        <circle cx='112' cy='82' r='1' fill='var(--svg-color, #A855F7)' />
        <circle cx='46' cy='112' r='1' fill='#FFFFFF' opacity='0.7' />
        <circle cx='82' cy='112' r='1' fill='#FFFFFF' opacity='0.7' />
      </svg>
    ),
  },
  {
    id: 'cyber_orbital_shroud',
    name: 'Cyber Orbital Shroud',
    nameAr: 'الغلاف المداري السميك',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        {/* 1. EXTRA THICK GLOW BASE (الهالة الخلفية الضخمة للإطار السميك) */}
        <circle 
          cx='64' 
          cy='64' 
          r='54' 
          stroke='var(--svg-color, #00F0FF)' 
          strokeWidth='10' 
          opacity='0.15' 
        />

        {/* 2. THE MAIN THICK ORBITAL RING (الطوق الرئيسي السميك المقطع هندسياً) */}
        {/* تم تقسيم الطوق لـ 4 أقواس عريضة منفصلة لإعطاء مظهر السايبورغ/الميكانيكي الفخم */}
        <circle 
          cx='64' 
          cy='64' 
          r='54' 
          stroke='var(--svg-color, #00F0FF)' 
          strokeWidth='7' 
          strokeDasharray='70 15' 
          strokeLinecap='round'
          opacity='0.85' 
        />
        
        {/* 3. INNER CORE LIGHT RING (خط الضوء الأبيض النقي الحاد في منتصف القطر السميك) */}
        <circle 
          cx='64' 
          cy='64' 
          r='54' 
          stroke='#FFFFFF' 
          strokeWidth='1.5' 
          strokeDasharray='40 45 60 25' 
          opacity='0.9' 
        />

        {/* 4. TECH-DOTS EMBEDDED IN THE TRACK (النقاط الضوئية المحفورة داخل المسار العريض) */}
        <g fill='#111827'>
          <circle cx='64' cy='10' r='1.5' />
          <circle cx='64' cy='118' r='1.5' />
          <circle cx='10' cy='64' r='1.5' />
          <circle cx='118' cy='64' r='1.5' />
          {/* Diagonal Dots */}
          <circle cx='26' cy='26' r='1.2' fill='#FFF' />
          <circle cx='102' cy='26' r='1.2' fill='#FFF' />
          <circle cx='26' cy='102' r='1.2' fill='#FFF' />
          <circle cx='102' cy='102' r='1.2' fill='#FFF' />
        </g>

        {/* 5. HEAVY CORNER SHROUDS (دعامات حماية ميكانيكية بارزة على الأركان المائلة) */}
        {/* Top-Left Heavy Corner */}
        <path d='M20,20 L14,26 M20,20 L26,14 M20,20 L12,12' stroke='#FFFFFF' strokeWidth='2' strokeLinecap='round' opacity='0.8' />
        {/* Top-Right Heavy Corner */}
        <path d='M108,20 L114,26 M108,20 L102,14 M108,20 L116,12' stroke='#FFFFFF' strokeWidth='2' strokeLinecap='round' opacity='0.8' />
        {/* Bottom-Left Heavy Corner */}
        <path d='M20,108 L14,102 M20,108 L26,114 M20,108 L12,116' stroke='#FFFFFF' strokeWidth='2' strokeLinecap='round' opacity='0.8' />
        {/* Bottom-Right Heavy Corner */}
        <path d='M108,108 L114,102 M108,108 L102,114 M108,108 L116,116' stroke='#FFFFFF' strokeWidth='2' strokeLinecap='round' opacity='0.8' />

        {/* 6. ORBITAL ENERGY FLARES (ومضات طاقة حادة تخرج من فتحات الإطار السميك) */}
        <polygon points='64,1 67,7 64,6 61,7' fill='var(--svg-color, #00F0FF)' />
        <polygon points='64,127 67,121 64,122 61,121' fill='var(--svg-color, #00F0FF)' />
        <polygon points='1,64 7,67 6,64 7,61' fill='var(--svg-color, #00F0FF)' />
        <polygon points='127,64 121,67 122,64 121,61' fill='var(--svg-color, #00F0FF)' />
      </svg>
    ),
  },
  {
    id: 'enchanted_leaf_wreath',
    name: 'Enchanted Leaves',
    nameAr: 'إكليل الأوراق السحرية',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        {/* 1. BACKGROUND ORGANIC GLOW (الهالة الضوئية الخضراء الدافئة خلف الأوراق) */}
        <circle 
          cx='64' 
          cy='64' 
          r='54' 
          stroke='var(--svg-color, #22C55E)' 
          strokeWidth='6' 
          opacity='0.12' 
        />
        
        {/* 2. MAIN VINE WEAVE (الأغصان الدائرية الأساسية المحيطة بالحساب) */}
        <circle cx='64' cy='64' r='54' stroke='var(--svg-color, #15803D)' strokeWidth='1.2' opacity='0.4' />
        <circle cx='64' cy='64' r='52' stroke='#4ADE80' strokeWidth='0.6' strokeDasharray='3 6' opacity='0.5' />

        {/* 3. 360° LEAF CROWN SYSTEM (توزيع الأوراق على كامل المحيط الدائري بزوايا متناسقة) */}
        {/* Top Center Main Leaf Cluster */}
        <g transform='translate(64, 10)'>
          <path d='M0,-8 C-5,-6 -6,2 0,4 C6,2 5,-6 0,-8 Z' fill='var(--svg-color, #22C55E)' stroke='#166534' strokeWidth='0.6' />
          <path d='M0,-6 L0,2' stroke='#BBF7D0' strokeWidth='0.4' />
        </g>
        <g transform='translate(54, 12) rotate(-20)'>
          <path d='M0,-6 C-4,-5 -5,1 0,3 C4,1 3,-5 0,-6 Z' fill='#4ADE80' />
        </g>
        <g transform='translate(74, 12) rotate(20)'>
          <path d='M0,-6 C-4,-5 -5,1 0,3 C4,1 3,-5 0,-6 Z' fill='#4ADE80' />
        </g>

        {/* Right Arc Leaves (الأوراق الموزعة على الجانب الأيمن لتهبط للأسفل) */}
        <g transform='translate(92, 21) rotate(45)'>
          <path d='M0,-7 C-4,-5 -5,2 0,4 C4,2 3,-5 0,-7 Z' fill='var(--svg-color, #22C55E)' stroke='#166534' strokeWidth='0.5' />
          <path d='M10,-2 C6,-3 2,1 4,3 Z' fill='#16A34A' />
        </g>
        <g transform='translate(112, 42) rotate(75)'>
          <path d='M0,-7 C-4,-5 -5,2 0,4 C4,2 3,-5 0,-7 Z' fill='var(--svg-color, #22C55E)' stroke='#166534' strokeWidth='0.5' />
        </g>
        <g transform='translate(118, 64) rotate(90)'>
          <path d='M0,-8 C-5,-6 -6,2 0,4 C6,2 5,-6 0,-8 Z' fill='#16A34A' stroke='#14532D' strokeWidth='0.6' />
          <path d='M0,-6 L0,2' stroke='#86EFAC' strokeWidth='0.4' />
        </g>
        <g transform='translate(112, 86) rotate(115)'>
          <path d='M0,-7 C-4,-5 -5,2 0,4 C4,2 3,-5 0,-7 Z' fill='var(--svg-color, #22C55E)' stroke='#166534' strokeWidth='0.5' />
        </g>
        <g transform='translate(92, 107) rotate(135)'>
          <path d='M0,-7 C-4,-5 -5,2 0,4 C4,2 3,-5 0,-7 Z' fill='var(--svg-color, #22C55E)' stroke='#166534' strokeWidth='0.5' />
          <path d='M-10,-2 C-6,-3 -2,1 -4,3 Z' fill='#4ADE80' />
        </g>

        {/* Bottom Center Point (نقطة التقاط الغصينين في الأسفل) */}
        <g transform='translate(64, 118) rotate(180)'>
          <path d='M0,-8 C-5,-6 -6,2 0,4 C6,2 5,-6 0,-8 Z' fill='var(--svg-color, #22C55E)' stroke='#166534' strokeWidth='0.6' />
          <circle cx='0' cy='6' r='2' fill='#EF4444' /> {/* ثمرة برية صغيرة حمراء لكسر اللون */}
        </g>

        {/* Left Arc Leaves (الأوراق الموزعة على الجانب الأيسر صعوداً للأعلى) */}
        <g transform='translate(36, 107) rotate(-135)'>
          <path d='M0,-7 C-4,-5 -5,2 0,4 C4,2 3,-5 0,-7 Z' fill='var(--svg-color, #22C55E)' stroke='#166534' strokeWidth='0.5' />
          <path d='M10,-2 C6,-3 2,1 4,3 Z' fill='#16A34A' />
        </g>
        <g transform='translate(16, 86) rotate(-115)'>
          <path d='M0,-7 C-4,-5 -5,2 0,4 C4,2 3,-5 0,-7 Z' fill='var(--svg-color, #22C55E)' stroke='#166534' strokeWidth='0.5' />
        </g>
        <g transform='translate(10, 64) rotate(-90)'>
          <path d='M0,-8 C-5,-6 -6,2 0,4 C6,2 5,-6 0,-8 Z' fill='#16A34A' stroke='#14532D' strokeWidth='0.6' />
          <path d='M0,-6 L0,2' stroke='#86EFAC' strokeWidth='0.4' />
        </g>
        <g transform='translate(16, 42) rotate(-75)'>
          <path d='M0,-7 C-4,-5 -5,2 0,4 C4,2 3,-5 0,-7 Z' fill='var(--svg-color, #22C55E)' stroke='#166534' strokeWidth='0.5' />
        </g>
        <g transform='translate(36, 21) rotate(-45)'>
          <path d='M0,-7 C-4,-5 -5,2 0,4 C4,2 3,-5 0,-7 Z' fill='var(--svg-color, #22C55E)' stroke='#166534' strokeWidth='0.5' />
          <path d='M-10,-2 C-6,-3 -2,1 -4,3 Z' fill='#4ADE80' />
        </g>

        {/* 4. FOREST MAGIC DUST (ذرات بريق الغابات العائمة حول الأوراق) */}
        <circle cx='50' cy='15' r='1' fill='#FFF' opacity='0.8' />
        <circle cx='78' cy='15' r='1' fill='#FFF' opacity='0.8' />
        <circle cx='116' cy='53' r='1.2' fill='var(--svg-color, #22C55E)' />
        <circle cx='12' cy='53' r='1.2' fill='var(--svg-color, #22C55E)' />
        <circle cx='100' cy='96' r='1' fill='#FFF' opacity='0.7' />
        <circle cx='28' cy='96' r='1' fill='#FFF' opacity='0.7' />
        
        {/* Small Sprouted Buds (براعم صغيرة نابتة) */}
        <circle cx='64' cy='6' r='1.5' fill='#FBBF24' />
        <circle cx='122' cy='64' r='1.5' fill='#FBBF24' />
        <circle cx='6' cy='64' r='1.5' fill='#FBBF24' />
      </svg>
    ),
  },
  
 {
    id: 'twin_butterflies',
    name: 'Twin Butterflies',
    nameAr: 'الفراشات التوأم',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        
        {/* ================= BUTTERFLY 1: TOP RIGHT (الفراشة الكبرى - أعلى اليمين) ================= */}
        <g transform='translate(96, 24) rotate(-15)'>
          {/* Antennae */}
          <path d='M-1,-14 C-4,-22 -10,-24 -14,-22' stroke='var(--svg-color-stroke, #7C3AED)' strokeWidth='0.8' strokeLinecap='round' />
          <path d='M1,-14 C4,-22 10,-24 14,-22' stroke='var(--svg-color-stroke, #7C3AED)' strokeWidth='0.8' strokeLinecap='round' />
          <circle cx='-14' cy='-22' r='1' fill='var(--svg-color, #C084FC)' />
          <circle cx='14' cy='-22' r='1' fill='var(--svg-color, #C084FC)' />

          {/* Hindwings - Lower Layer */}
          <path d='M-2,0 C-14,4 -18,16 -10,24 C-4,28 -1,14 -2,0 Z' fill='#C084FC' stroke='#7C3AED' strokeWidth='0.8' opacity='0.9' />
          <path d='M2,0 C14,4 18,16 10,24 C4,28 1,14 2,0 Z' fill='#C084FC' stroke='#7C3AED' strokeWidth='0.8' opacity='0.9' />

          {/* Forewings - Main Upper Layer */}
          <path d='M-2,-4 C-18,-12 -28,-6 -24,12 C-20,24 -8,12 -2,-4 Z' fill='var(--svg-color, #A855F7)' stroke='#6B21A8' strokeWidth='1.2' />
          <path d='M2,-4 C18,-12 28,-6 24,12 C20,24 8,12 2,-4 Z' fill='var(--svg-color, #A855F7)' stroke='#6B21A8' strokeWidth='1.2' />

          {/* Internal Wing Veins */}
          <path d='M-2,-4 C-8,0 -16,4 -20,10' stroke='#F3E8FF' strokeWidth='0.6' opacity='0.7' />
          <path d='M-6,-2 C-12,-4 -18,-4 -22,-1' stroke='#F3E8FF' strokeWidth='0.5' opacity='0.6' />
          <path d='M2,-4 C8,0 16,4 20,10' stroke='#F3E8FF' strokeWidth='0.6' opacity='0.7' />
          <path d='M6,-2 C12,-4 18,-4 22,-1' stroke='#F3E8FF' strokeWidth='0.5' opacity='0.6' />

          {/* Glowing Spots */}
          <circle cx='-18' cy='4' r='1.5' fill='#FFF' opacity='0.9' />
          <circle cx='-14' cy='10' r='1' fill='#FDE047' />
          <circle cx='18' cy='4' r='1.5' fill='#FFF' opacity='0.9' />
          <circle cx='14' cy='10' r='1' fill='#FDE047' />

          {/* Body */}
          <circle cx='0' cy='-14' r='2' fill='#4C1D95' />
          <path d='M-2,-12 L2,-12 L1.5,-2 L-1.5,-2 Z' fill='#5B21B6' />
          <path d='M-1.5,-2 C-2.5,4 -2.5,10 0,16 C2.5,10 2.5,4 1.5,-2 Z' fill='#6D28D9' stroke='#4C1D95' strokeWidth='0.4' />
          <line x1='0' y1='2' x2='0' y2='12' stroke='#DDD' strokeWidth='0.6' opacity='0.8' />
        </g>

        {/* ================= BUTTERFLY 2: BOTTOM LEFT (الفراشة الصغيرة - أسفل اليسار) ================= */}
        {/* تم تصغير الحجم باستخدام scale(0.75) وتمييلها بزاوية rotate(45) لتواكب انحناء البوردر السفلي */}
        <g transform='translate(26, 96) rotate(35) scale(0.75)'>
          {/* Antennae */}
          <path d='M-1,-14 C-4,-22 -10,-24 -14,-22' stroke='var(--svg-color-stroke, #7C3AED)' strokeWidth='0.8' strokeLinecap='round' />
          <path d='M1,-14 C4,-22 10,-24 14,-22' stroke='var(--svg-color-stroke, #7C3AED)' strokeWidth='0.8' strokeLinecap='round' />
          <circle cx='-14' cy='-22' r='1' fill='var(--svg-color, #C084FC)' />
          <circle cx='14' cy='-22' r='1' fill='var(--svg-color, #C084FC)' />

          {/* Hindwings - Lower Layer */}
          <path d='M-2,0 C-14,4 -18,16 -10,24 C-4,28 -1,14 -2,0 Z' fill='#C084FC' stroke='#7C3AED' strokeWidth='0.8' opacity='0.9' />
          <path d='M2,0 C14,4 18,16 10,24 C4,28 1,14 2,0 Z' fill='#C084FC' stroke='#7C3AED' strokeWidth='0.8' opacity='0.9' />

          {/* Forewings - Main Upper Layer */}
          <path d='M-2,-4 C-18,-12 -28,-6 -24,12 C-20,24 -8,12 -2,-4 Z' fill='var(--svg-color, #A855F7)' stroke='#6B21A8' strokeWidth='1.2' />
          <path d='M2,-4 C18,-12 28,-6 24,12 C20,24 8,12 2,-4 Z' fill='var(--svg-color, #A855F7)' stroke='#6B21A8' strokeWidth='1.2' />

          {/* Internal Wing Veins */}
          <path d='M-2,-4 C-8,0 -16,4 -20,10' stroke='#F3E8FF' strokeWidth='0.6' opacity='0.7' />
          <path d='M2,-4 C8,0 16,4 20,10' stroke='#F3E8FF' strokeWidth='0.6' opacity='0.7' />

          {/* Glowing Spots */}
          <circle cx='-17' cy='5' r='1.2' fill='#FFF' opacity='0.9' />
          <circle cx='17' cy='5' r='1.2' fill='#FFF' opacity='0.9' />

          {/* Body */}
          <circle cx='0' cy='-14' r='2' fill='#4C1D95' />
          <path d='M-2,-12 L2,-12 L1.5,-2 L-1.5,-2 Z' fill='#5B21B6' />
          <path d='M-1.5,-2 C-2.5,4 -2.5,10 0,16 C2.5,10 2.5,4 1.5,-2 Z' fill='#6D28D9' stroke='#4C1D95' strokeWidth='0.4' />
        </g>

        {/* MAGIC AURA DUST (جزيئات بريق سحرية تربط الفراشتين على طول الإطار) */}
        <circle cx='80' cy='14' r='1' fill='#FFF' opacity='0.6' />
        <circle cx='114' cy='46' r='1.2' fill='var(--svg-color, #A855F7)' />
        <circle cx='118' cy='68' r='0.8' fill='#FFF' />
        <circle cx='46' cy='114' r='1.2' fill='var(--svg-color, #A855F7)' />
        <circle cx='14' cy='76' r='1' fill='#FFF' opacity='0.7' />
        <circle cx='12' cy='54' r='0.8' fill='var(--svg-color, #A855F7)' />
      </svg>
    ),
  },
  {
    id: 'devil_horns',
    name: 'Devil Horns',
    nameAr: 'قرون الشيطان',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.95'>
          
          {/* LEFT HORN GROUP (القرن الأيسر الحاد والمحزز) */}
          <g>
            {/* Left Horn Back Shadow (ظلال العمق الخلفية ثلاثية الأبعاد) */}
            <path
              d='M28,42 C16,36 10,20 18,4 C22,-2 26,-1 28,6 C30,14 34,26 34,36 Z'
              fill='var(--svg-color-dark, #7F1D1D)'
              opacity='0.4'
            />
            {/* Left Horn Main Body (جسم القرن الأساسي) */}
            <path
              d='M28,40 C14,34 8,16 18,1 C21,-3 24,-1 26,6 C28,14 32,26 32,35 Z'
              fill='var(--svg-color, #DC2626)'
              stroke='var(--svg-color-stroke, #991B1B)'
              strokeWidth='1.2'
              strokeLinejoin='round'
            />
            {/* Left Horn Ribbed Ridges (التحزيزات والتجاعيد العرضية الفاخرة) */}
            <path d='M19,28 Q24,29 27,27' stroke='#7F1D1D' strokeWidth='1' strokeLinecap='round' />
            <path d='M16,21 Q22,22 25,20' stroke='#7F1D1D' strokeWidth='1' strokeLinecap='round' />
            <path d='M15,14 Q20,15 23,13' stroke='#7F1D1D' strokeWidth='0.8' strokeLinecap='round' />
            <path d='M16,8  Q20,9  22,7'  stroke='#7F1D1D' strokeWidth='0.8' strokeLinecap='round' />
            {/* Front Light Highlight (خط لمعان أمامي نيون لإبراز الحافة) */}
            <path 
              d='M25,6 C27,14 31,24 31,32' 
              stroke='#FCA5A5' 
              strokeWidth='0.6' 
              strokeLinecap='round' 
              opacity='0.8'
            />
          </g>


          {/* RIGHT HORN GROUP (القرن الأيمن الحاد والمحزز - معكوس بالملي) */}
          <g>
            {/* Right Horn Back Shadow (ظلال العمق الخلفية ثلاثية الأبعاد) */}
            <path
              d='M100,42 C112,36 118,20 110,4 C106,-2 102,-1 100,6 C98,14 94,26 94,36 Z'
              fill='var(--svg-color-dark, #7F1D1D)'
              opacity='0.4'
            />
            {/* Right Horn Main Body (جسم القرن الأساسي) */}
            <path
              d='M100,40 C114,34 120,16 110,1 C107,-3 104,-1 102,6 C100,14 96,26 96,35 Z'
              fill='var(--svg-color, #DC2626)'
              stroke='var(--svg-color-stroke, #991B1B)'
              strokeWidth='1.2'
              strokeLinejoin='round'
            />
            {/* Right Horn Ribbed Ridges (التحزيزات والتجاعيد العرضية الفاخرة) */}
            <path d='M109,28 Q104,29 101,27' stroke='#7F1D1D' strokeWidth='1' strokeLinecap='round' />
            <path d='M112,21 Q106,22 103,20' stroke='#7F1D1D' strokeWidth='1' strokeLinecap='round' />
            <path d='M113,14 Q108,15 105,13' stroke='#7F1D1D' strokeWidth='0.8' strokeLinecap='round' />
            <path d='M112,8  Q108,9  106,7'  stroke='#7F1D1D' strokeWidth='0.8' strokeLinecap='round' />
            {/* Front Light Highlight (خط لمعان أمامي نيون لإبراز الحافة) */}
            <path 
              d='M103,6 C101,14 97,24 97,32' 
              stroke='#FCA5A5' 
              strokeWidth='0.6' 
              strokeLinecap='round' 
              opacity='0.8'
            />
          </g>

          {/* SPARKS & EMBER PIXELS (شرارات لهب داكنة متساقطة حول حواف القرون) */}
          <circle cx='12' cy='12' r='1' fill='#EF4444' />
          <circle cx='116' cy='12' r='1' fill='#EF4444' />
          <polygon points='33,3 34,5 32,5' fill='var(--svg-color, #DC2626)' opacity='0.7' />
          <polygon points='95,3 96,5 94,5' fill='var(--svg-color, #DC2626)' opacity='0.7' />
        </g>
      </svg>
    ),
  },
  {
    id: 'overlord_chaos_horns',
    name: 'Chaos Horns',
    nameAr: 'قرون سيد الفوضى',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.98'>
          
          {/* LEFT HORN: OVERLORD STYLE (القرن الأيسر المدرع العملاق) */}
          <g>
            {/* 1. Base Magical Energy Ring (حلقة الطاقة النيون المحيطة بقاعدة القرن) */}
            <ellipse cx='26' cy='42' rx='10' ry='4' fill='none' stroke='#FCA5A5' strokeWidth='1.5' opacity='0.8' transform='rotate(-15, 26, 42)' />
            <ellipse cx='26' cy='42' rx='8' ry='3' fill='none' stroke='var(--svg-color, #DC2626)' strokeWidth='2' transform='rotate(-15, 26, 42)' />
            
            {/* 2. Deep Back Dynamic Shadow */}
            <path
              d='M24,40 C10,32 -2,12 6,-6 C12,-14 20,-8 20,4 C20,16 26,28 28,38 Z'
              fill='var(--svg-color-dark, #450A0A)'
              opacity='0.5'
            />
            
            {/* 3. Main Horn Blade (الجسم الشيطاني المدرع الرئيسي للقرن) */}
            <path
              d='M22,38 C8,30 -4,14 4,-8 C10,-16 17,-10 18,2 C18,14 23,26 26,36 Z'
              fill='var(--svg-color, #DC2626)'
              stroke='var(--svg-color-stroke, #7F1D1D)'
              strokeWidth='1.5'
              strokeLinejoin='round'
            />
            
            {/* 4. Heavy Armor Ridges (الحراشف والدروع العرضية البارزة) */}
            <path d='M11,21 Q17,24 20,18' stroke='#450A0A' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M7,12  Q13,15 16,9'  stroke='#450A0A' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M5,2   Q10,4  12,-1' stroke='#450A0A' strokeWidth='1.2' strokeLinecap='round' />
            
            {/* 5. Core Lava Glow (عرق الحمم المضيء المنساب في قلب القرن ليعطي توهج خارق) */}
            <path 
              d='M14,-4 C12,6 15,16 21,28' 
              stroke='#FEF08A' 
              strokeWidth='1' 
              strokeLinecap='round' 
              opacity='0.9'
            />
            <path 
              d='M14,-4 C12,6 15,16 21,28' 
              stroke='#F97316' 
              strokeWidth='2.5' 
              strokeLinecap='round' 
              opacity='0.5'
            />
          </g>


          {/* RIGHT HORN: OVERLORD STYLE (القرن الأيمن المدرع العملاق - معكوس بالملي) */}
          <g>
            {/* 1. Base Magical Energy Ring */}
            <ellipse cx='102' cy='42' rx='10' ry='4' fill='none' stroke='#FCA5A5' strokeWidth='1.5' opacity='0.8' transform='rotate(15, 102, 42)' />
            <ellipse cx='102' cy='42' rx='8' ry='3' fill='none' stroke='var(--svg-color, #DC2626)' strokeWidth='2' transform='rotate(15, 102, 42)' />
            
            {/* 2. Deep Back Dynamic Shadow */}
            <path
              d='M104,40 C118,32 130,12 122,-6 C116,-14 108,-8 108,4 C108,16 102,28 100,38 Z'
              fill='var(--svg-color-dark, #450A0A)'
              opacity='0.5'
            />
            
            {/* 3. Main Horn Blade */}
            <path
              d='M106,38 C120,30 132,14 124,-8 C118,-16 111,-10 110,2 C110,14 105,26 102,36 Z'
              fill='var(--svg-color, #DC2626)'
              stroke='var(--svg-color-stroke, #7F1D1D)'
              strokeWidth='1.5'
              strokeLinejoin='round'
            />
            
            {/* 4. Heavy Armor Ridges */}
            <path d='M117,21 Q111,24 108,18' stroke='#450A0A' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M121,12 Q115,15 112,9'  stroke='#450A0A' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M123,2  Q118,4  116,-1' stroke='#450A0A' strokeWidth='1.2' strokeLinecap='round' />
            
            {/* 5. Core Lava Glow */}
            <path 
              d='M114,-4 C116,6 113,16 107,28' 
              stroke='#FEF08A' 
              strokeWidth='1' 
              strokeLinecap='round' 
              opacity='0.9'
            />
            <path 
              d='M114,-4 C116,6 113,16 107,28' 
              stroke='#F97316' 
              strokeWidth='2.5' 
              strokeLinecap='round' 
              opacity='0.5'
            />
          </g>

          {/* ARCANE CHAOS SPARKS (شرارات طاقة سحرية عائمة حول القرن) */}
          <circle cx='8' cy='4' r='1.5' fill='#FBBF24' />
          <circle cx='120' cy='4' r='1.5' fill='#FBBF24' />
          <polygon points='14,-14 16,-10 12,-10' fill='#FFF' />
          <polygon points='114,-14 116,-10 112,-10' fill='#FFF' />
        </g>
      </svg>
    ),
  },
  {
    id: 'heart',
    name: 'Heart',
    nameAr: 'قلب',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.95'>
          {/* BACKGROUND LIGHT HALO (طوق النور والبريق الخلفي الوردي) */}
          <path 
            d='M 14,50 Q 64,8 114,50' 
            stroke='var(--svg-color, #FF4D6D)' 
            strokeWidth='3' 
            strokeLinecap='round' 
            opacity='0.15'
            fill='none'
          />

          {/* 1. HEART 1 (القلب الملكي الأكبر في السنتر العلوي بالظبط - X=64, Y=12) */}
          <g transform='translate(64, 12)'>
            {/* Shadow Depth */}
            <path d='M0,12 C-10,3 -14,-5 -7,-10 C-2,-13 0,-7 0,-7 C0,-7 2,-13 7,-10 C14,-5 10,3 0,12 Z' fill='var(--svg-color-dark, #C9184A)' opacity='0.3' transform='translate(0, 1)' />
            {/* Main Body */}
            <path d='M0,12 C-10,3 -14,-5 -7,-10 C-2,-13 0,-7 0,-7 C0,-7 2,-13 7,-10 C14,-5 10,3 0,12 Z' fill='var(--svg-color, #FF4D6D)' stroke='#9B002A' strokeWidth='1' />
            {/* 3D Highlight Curve (نصف قلب فاتح ليعطي تأثير مجسم عاكس للضوء) */}
            <path d='M0,11 C-8,3 -11,-4 -6,-8 C-2,-11 0,-6 0,-6 Z' fill='#FFB3C1' opacity='0.6' />
            {/* Core Gloss */}
            <circle cx='-3' cy='-4' r='1.5' fill='#FFF' opacity='0.8' />
          </g>

          {/* 2. HEART 2 (القلب المتوسط الأيسر - X=28, Y=26) */}
          <g transform='translate(28, 26) rotate(-15)'>
            <path d='M0,9 C-8,2 -10,-4 -5,-8 C-1,-10 0,-5 0,-5 C0,-5 1,-10 5,-8 C10,-4 8,2 0,9 Z' fill='var(--svg-color, #FF4D6D)' stroke='#9B002A' strokeWidth='0.8' />
            <path d='M0,8 C-6,2 -8,-3 -4,-6 C-1,-8 0,-4 0,-4 Z' fill='#FFB3C1' opacity='0.5' />
            <circle cx='-2' cy='-3' r='1' fill='#FFF' opacity='0.8' />
          </g>

          {/* 3. HEART 3 (القلب المتوسط الأيمن - X=100, Y=26) */}
          <g transform='translate(100, 26) rotate(15)'>
            <path d='M0,9 C-8,2 -10,-4 -5,-8 C-1,-10 0,-5 0,-5 C0,-5 1,-10 5,-8 C10,-4 8,2 0,9 Z' fill='var(--svg-color, #FF4D6D)' stroke='#9B002A' strokeWidth='0.8' />
            <path d='M0,8 C-6,2 -8,-3 -4,-6 C-1,-8 0,-4 0,-4 Z' fill='#FFB3C1' opacity='0.5' />
            <circle cx='-2' cy='-3' r='1' fill='#FFF' opacity='0.8' />
          </g>

          {/* 4. HEART 4 (القلب الخارجي الأيسر المستقر تماماً خارج الفريم - X=10, Y=54) */}
          <g transform='translate(10, 54) rotate(-30)'>
            <path d='M0,8 C-7,2 -9,-3 -4,-7 C-1,-9 0,-4 0,-4 C0,-4 1,-9 4,-7 C9,-3 7,2 0,8 Z' fill='var(--svg-color, #FF4D6D)' stroke='#9B002A' strokeWidth='0.7' />
            <path d='M0,7 C-5,2 -7,-3 -3,-5 C-1,-7 0,-4 0,-4 Z' fill='#FFB3C1' opacity='0.5' />
            <circle cx='-1.5' cy='-2' r='0.8' fill='#FFF' />
          </g>

          {/* 5. HEART 5 (القلب الخارجي الأيمن المستقر تماماً خارج الفريم - X=118, Y=54) */}
          <g transform='translate(118, 54) rotate(30)'>
            <path d='M0,8 C-7,2 -9,-3 -4,-7 C-1,-9 0,-4 0,-4 C0,-4 1,-9 4,-7 C9,-3 7,2 0,8 Z' fill='var(--svg-color, #FF4D6D)' stroke='#9B002A' strokeWidth='0.7' />
            <path d='M0,7 C-5,2 -7,-3 -3,-5 C-1,-7 0,-4 0,-4 Z' fill='#FFB3C1' opacity='0.5' />
            <circle cx='-1.5' cy='-2' r='0.8' fill='#FFF' />
          </g>

          {/* MAGIC LOVE PARTICLES (ذرات غبار وومضات سحرية متساقطة بين القلوب) */}
          {/* ومضات ماسية صغيرة */}
          <polygon points='46,16 48,18 46,20 44,18' fill='#FFF' opacity='0.8' />
          <polygon points='82,16 84,18 82,20 80,18' fill='#FFF' opacity='0.8' />
          <polygon points='16,36 17,37 16,38 15,37' fill='var(--svg-color, #FF4D6D)' />
          <polygon points='112,36 113,37 112,38 111,37' fill='var(--svg-color, #FF4D6D)' />
          
          {/* ذرات ضوئية دائرية */}
          <circle cx='64' cy='26' r='1.2' fill='#FFF' opacity='0.6' />
          <circle cx='38' cy='20' r='1.5' fill='var(--svg-color, #FF4D6D)' opacity='0.7' />
          <circle cx='90' cy='20' r='1.5' fill='var(--svg-color, #FF4D6D)' opacity='0.7' />
          <circle cx='18' cy='48' r='1' fill='#FFF' />
          <circle cx='110' cy='48' r='1' fill='#FFF' />
        </g>
      </svg>
    ),
  },
  {
    id: 'heart_ring',
    name: 'Heart Ring',
    nameAr: 'حلقة قلب',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.95'>
          {/* 1. BACKGROUND HEART GLOW HALO (طوق إضاءة خلفي دافئ حول القلوب) */}
          <circle cx='64' cy='64' r='54' stroke='var(--svg-color, #FF4D6D)' strokeWidth='3' opacity='0.12' />

          {/* 2. THE TOP MAIN PREMIUM HEART (القلب الملكي الأكبر في الأعلى عند السنتر) */}
          <g transform='translate(64, 10)'>
            {/* Shadow layer */}
            <path d='M0,10 C-10,3 -14,-7 -7,-11 C-2,-14 0,-6 0,-6 C0,-6 2,-14 7,-11 C14,-7 10,3 0,10 Z' fill='#98002E' opacity='0.4' transform='translate(0, 1)' />
            {/* Main body */}
            <path d='M0,10 C-10,3 -14,-7 -7,-11 C-2,-14 0,-6 0,-6 C0,-6 2,-14 7,-11 C14,-7 10,3 0,10 Z' fill='var(--svg-color, #FF4D6D)' stroke='#98002E' strokeWidth='1' />
            {/* Glass Highlight lines (لمعان داخلي يعطي شكل زجاجي 3D) */}
            <path d='M-5,-7 C-7,-4 -5,0 -2,2' stroke='#FFF' strokeWidth='0.8' strokeLinecap='round' opacity='0.6' />
            <circle cx='5' cy='-6' r='1' fill='#FFF' opacity='0.7' />
          </g>

          {/* 3. THE RING HEARTS SYSTEM (القلوب المتدرجة الموزعة على كامل محيط الفريم من بره) */}
          
          {/* LEFT UPPER ACCENT HEARTS */}
          <g transform='translate(32, 21) rotate(-35)'>
            <path d='M0,7 C-7,2 -10,-5 -5,-8 C-1,-10 0,-4 0,-4 C0,-4 1,-10 5,-8 C10,-5 7,2 0,7 Z' fill='var(--svg-color, #FF4D6D)' stroke='#98002E' strokeWidth='0.8' />
            <path d='M-3,-5 C-5,-3 -3,0 0,1' stroke='#FFF' strokeWidth='0.6' opacity='0.6' />
          </g>
          <g transform='translate(14, 43) rotate(-65)'>
            <path d='M0,6 C-6,2 -8,-4 -4,-7 C-1,-9 0,-3 0,-3 C0,-3 1,-9 4,-7 C8,-4 6,2 0,6 Z' fill='var(--svg-color, #FF4D6D)' stroke='#98002E' strokeWidth='0.7' />
          </g>

          {/* LEFT CENTER MAIN HEART */}
          <g transform='translate(8, 64) rotate(-90)'>
            <path d='M0,9 C-9,3 -12,-6 -6,-10 C-2,-12 0,-5 0,-5 C0,-5 2,-12 6,-10 C12,-6 9,3 0,9 Z' fill='var(--svg-color, #FF4D6D)' stroke='#98002E' strokeWidth='0.9' />
            <path d='M-4,-6 C-6,-3 -4,0 0,2' stroke='#FFF' strokeWidth='0.7' opacity='0.6' />
          </g>

          {/* LEFT LOWER ACCENT HEARTS */}
          <g transform='translate(14, 85) rotate(-115)'>
            <path d='M0,6 C-6,2 -8,-4 -4,-7 C-1,-9 0,-3 0,-3 C0,-3 1,-9 4,-7 C8,-4 6,2 0,6 Z' fill='var(--svg-color, #FF4D6D)' stroke='#98002E' strokeWidth='0.7' />
          </g>
          <g transform='translate(32, 107) rotate(-145)'>
            <path d='M0,7 C-7,2 -10,-5 -5,-8 C-1,-10 0,-4 0,-4 C0,-4 1,-10 5,-8 C10,-5 7,2 0,7 Z' fill='var(--svg-color, #FF4D6D)' stroke='#98002E' strokeWidth='0.8' />
          </g>

          {/* BOTTOM MAIN HEART */}
          <g transform='translate(64, 118) rotate(180)'>
            <path d='M0,9 C-9,3 -12,-6 -6,-10 C-2,-12 0,-5 0,-5 C0,-5 2,-12 6,-10 C12,-6 9,3 0,9 Z' fill='var(--svg-color, #FF4D6D)' stroke='#98002E' strokeWidth='0.9' />
            <path d='M-4,-6 C-6,-3 -4,0 0,2' stroke='#FFF' strokeWidth='0.7' opacity='0.6' />
          </g>

          {/* RIGHT LOWER ACCENT HEARTS */}
          <g transform='translate(96, 107) rotate(145)'>
            <path d='M0,7 C-7,2 -10,-5 -5,-8 C-1,-10 0,-4 0,-4 C0,-4 1,-10 5,-8 C10,-5 7,2 0,7 Z' fill='var(--svg-color, #FF4D6D)' stroke='#98002E' strokeWidth='0.8' />
          </g>
          <g transform='translate(114, 85) rotate(115)'>
            <path d='M0,6 C-6,2 -8,-4 -4,-7 C-1,-9 0,-3 0,-3 C0,-3 1,-9 4,-7 C8,-4 6,2 0,6 Z' fill='var(--svg-color, #FF4D6D)' stroke='#98002E' strokeWidth='0.7' />
          </g>

          {/* RIGHT CENTER MAIN HEART */}
          <g transform='translate(120, 64) rotate(90)'>
            <path d='M0,9 C-9,3 -12,-6 -6,-10 C-2,-12 0,-5 0,-5 C0,-5 2,-12 6,-10 C12,-6 9,3 0,9 Z' fill='var(--svg-color, #FF4D6D)' stroke='#98002E' strokeWidth='0.9' />
            <path d='M-4,-6 C-6,-3 -4,0 0,2' stroke='#FFF' strokeWidth='0.7' opacity='0.6' />
          </g>

          {/* RIGHT UPPER ACCENT HEARTS */}
          <g transform='translate(114, 43) rotate(65)'>
            <path d='M0,6 C-6,2 -8,-4 -4,-7 C-1,-9 0,-3 0,-3 C0,-3 1,-9 4,-7 C8,-4 6,2 0,6 Z' fill='var(--svg-color, #FF4D6D)' stroke='#98002E' strokeWidth='0.7' />
          </g>
          <g transform='translate(96, 21) rotate(35)'>
            <path d='M0,7 C-7,2 -10,-5 -5,-8 C-1,-10 0,-4 0,-4 C0,-4 1,-10 5,-8 C10,-5 7,2 0,7 Z' fill='var(--svg-color, #FF4D6D)' stroke='#98002E' strokeWidth='0.8' />
            <path d='M-3,-5 C-5,-3 -3,0 0,1' stroke='#FFF' strokeWidth='0.6' opacity='0.6' />
          </g>

          {/* 4. VALENTINE MAGIC PIXELS (ذرات لمعان ونجوم صغيرة لملء الفراغات ع الفريم) */}
          <circle cx='48' cy='13' r='1.2' fill='#FFF' opacity='0.8' />
          <circle cx='80' cy='13' r='1.2' fill='#FFF' opacity='0.8' />
          <circle cx='122' cy='52' r='1' fill='var(--svg-color, #FF4D6D)' />
          <circle cx='6' cy='52' r='1' fill='var(--svg-color, #FF4D6D)' />
          <polygon points='48,114 49,116 47,116' fill='#FFF' />
          <polygon points='80,114 81,116 79,116' fill='#FFF' />
        </g>
      </svg>
    ),
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    nameAr: 'ندفة الثلج',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.95'>

          {/* 1. CENTRAL MAIN SNOWFLAKE (الندفة الكريستالية الكبرى الفاخرة في السنتر العلوي - X=64, Y=12) */}
          <g transform='translate(64, 12)'>
            {/* توهج خلفي ناعم للبلورة */}
            <circle cx='0' cy='0' r='8' fill='#93C5FD' opacity='0.25' filter='blur(1px)' />
            {/* المحاور الستة الرئيسية للبلورة مع التفريعات الحادة المتناسقة */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <g key={i} transform={`rotate(${angle})`}>
                {/* العمود الفقري للبلورة */}
                <line x1='0' y1='0' x2='0' y2='-11' stroke='#FFFFFF' strokeWidth='1.2' strokeLinecap='round' />
                <line x1='0' y1='0' x2='0' y2='-11' stroke='var(--svg-color, #60A5FA)' strokeWidth='0.6' strokeLinecap='round' />
                {/* تفريعات علوية حادة (V-Shaped Chevrons) */}
                <path d='M-3.5,-8 L0,-5.5 L3.5,-8' stroke='#FFFFFF' strokeWidth='1' strokeLinecap='round' fill='none' />
                {/* تفريعات سفلية ناعمة */}
                <path d='M-2,-4.5 L0,-3 L2,-4.5' stroke='var(--svg-color, #60A5FA)' strokeWidth='0.8' strokeLinecap='round' fill='none' />
              </g>
            ))}
            {/* قلب البلورة الماسي المضيء */}
            <polygon points='0,-2.5 2.5,0 0,2.5 -2.5,0' fill='#FFFFFF' />
            <circle cx='0' cy='0' r='1' fill='var(--svg-color, #60A5FA)' />
          </g>

          {/* 2. MID SNOWFLAKES (الندفتان المتوسطتان على الجانبين المائلين من الخارج) */}
          {/* Left Mid Snowflake (X=26, Y=26) */}
          <g transform='translate(26, 26) rotate(15)'>
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <g key={i} transform={`rotate(${angle})`}>
                <line x1='0' y1='0' x2='0' y2='-8' stroke='#FFFFFF' strokeWidth='1' strokeLinecap='round' />
                <path d='M-2.5,-5.5 L0,-3.5 L2.5,-5.5' stroke='var(--svg-color, #60A5FA)' strokeWidth='0.8' fill='none' />
              </g>
            ))}
            <circle cx='0' cy='0' r='1.2' fill='#FFFFFF' />
          </g>
          {/* Right Mid Snowflake (X=102, Y=26) */}
          <g transform='translate(102, 26) rotate(-15)'>
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <g key={i} transform={`rotate(${angle})`}>
                <line x1='0' y1='0' x2='0' y2='-8' stroke='#FFFFFF' strokeWidth='1' strokeLinecap='round' />
                <path d='M-2.5,-5.5 L0,-3.5 L2.5,-5.5' stroke='var(--svg-color, #60A5FA)' strokeWidth='0.8' fill='none' />
              </g>
            ))}
            <circle cx='0' cy='0' r='1.2' fill='#FFFFFF' />
          </g>

          {/* 3. OUTER EDGE SNOWFLAKES (الندفتان الصغيرتان المستقرتان على حافة الفريم السفلي الجانبي) */}
          {/* Left Outer Snowflake (X=10, Y=52) */}
          <g transform='translate(10, 52)'>
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <g key={i} transform={`rotate(${angle})`}>
                <line x1='0' y1='0' x2='0' y2='-6' stroke='var(--svg-color, #60A5FA)' strokeWidth='0.8' />
              </g>
            ))}
            <circle cx='0' cy='0' r='1' fill='#FFFFFF' />
          </g>
          {/* Right Outer Snowflake (X=118, Y=52) */}
          <g transform='translate(118, 52)'>
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <g key={i} transform={`rotate(${angle})`}>
                <line x1='0' y1='0' x2='0' y2='-6' stroke='var(--svg-color, #60A5FA)' strokeWidth='0.8' />
              </g>
            ))}
            <circle cx='0' cy='0' r='1' fill='#FFFFFF' />
          </g>

          {/* 4. MAGIC ICE DUST & DIAMOND FLASHES (ذرات الثلج المضيئة والومضات الماسية المتساقطة) */}
          {/* ومضات صقيع رباعية حادة كالألماس */}
          <path d='M44,18 Q44,21 41,21 Q44,21 44,24 Q44,21 47,21 Q44,21 44,18 Z' fill='#FFFFFF' />
          <path d='M84,18 Q84,21 81,21 Q84,21 84,24 Q84,21 87,21 Q84,21 84,18 Z' fill='#FFFFFF' />
          <path d='M16,36 Q16,38 14,38 Q16,38 16,40 Q16,38 18,38 Q16,38 16,36 Z' fill='var(--svg-color, #60A5FA)' opacity='0.7' />
          <path d='M112,36 Q112,38 110,38 Q112,38 112,40 Q112,38 114,38 Q112,38 112,36 Z' fill='var(--svg-color, #60A5FA)' opacity='0.7' />

          {/* كرات الصقيع الثلجية الدقيقة المتناثرة بدقة */}
          <circle cx='64' cy='27' r='1.2' fill='#FFFFFF' opacity='0.8' />
          <circle cx='34' cy='15' r='1.5' fill='var(--svg-color, #60A5FA)' />
          <circle cx='94' cy='15' r='1.5' fill='var(--svg-color, #60A5FA)' />
          <circle cx='20' cy='46' r='1' fill='#FFFFFF' />
          <circle cx='108' cy='46' r='1' fill='#FFFFFF' />
          <circle cx='54' cy='8' r='1' fill='#E0F2FE' />
          <circle cx='74' cy='8' r='1' fill='#E0F2FE' />
        </g>
      </svg>
    ),
  },
{
    id: 'fairy_wings',
    name: 'Fairy Wings',
    nameAr: 'أجنحة الجنية',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.9'>
          {/* LEFT WINGS */}
          {/* Left Upper Wing - Base Membrane */}
          <path
            d='M28,68 C12,50 -10,32 6,10 C18,-4 38,4 38,32 C38,48 34,60 28,68 Z'
            fill='var(--svg-color, #E879F9)'
            stroke='var(--svg-color, #C026D3)'
            strokeWidth='1'
            opacity='0.6'
          />
          {/* Left Upper Wing - Internal Intricate Veins */}
          <path d='M28,68 C24,46 22,26 6,10' stroke='var(--svg-color, #C026D3)' strokeWidth='0.8' opacity='0.7' />
          <path d='M24,46 C16,32 20,16 38,4' stroke='var(--svg-color, #C026D3)' strokeWidth='0.6' opacity='0.6' />
          <path d='M26,56 C32,46 36,38 38,32' stroke='var(--svg-color, #C026D3)' strokeWidth='0.6' opacity='0.6' />
          
          {/* Left Upper Wing - Magic Luminous Core */}
          <path
            d='M26,60 C14,46 -2,32 8,14 C16,2 32,10 32,32 Z'
            fill='#FCE7F3'
            opacity='0.45'
          />

          {/* Left Lower Wing - Base Membrane */}
          <path
            d='M28,72 C14,84 -4,102 10,116 C22,124 34,108 30,84 C29,78 29,74 28,72 Z'
            fill='var(--svg-color, #E879F9)'
            stroke='var(--svg-color, #C026D3)'
            strokeWidth='1'
            opacity='0.5'
          />
          {/* Left Lower Wing - Internal Veins */}
          <path d='M28,72 C22,88 18,102 10,116' stroke='var(--svg-color, #C026D3)' strokeWidth='0.7' opacity='0.6' />
          <path d='M20,92 C12,96 6,104 10,116' stroke='var(--svg-color, #C026D3)' strokeWidth='0.5' opacity='0.5' />


          {/* RIGHT WINGS (Perfect Mirror Images) */}
          {/* Right Upper Wing - Base Membrane */}
          <path
            d='M100,68 C116,50 138,32 122,10 C110,-4 90,4 90,32 C90,48 94,60 100,68 Z'
            fill='var(--svg-color, #E879F9)'
            stroke='var(--svg-color, #C026D3)'
            strokeWidth='1'
            opacity='0.6'
          />
          {/* Right Upper Wing - Internal Intricate Veins */}
          <path d='M100,68 C104,46 106,26 122,10' stroke='var(--svg-color, #C026D3)' strokeWidth='0.8' opacity='0.7' />
          <path d='M104,46 C112,32 108,16 90,4' stroke='var(--svg-color, #C026D3)' strokeWidth='0.6' opacity='0.6' />
          <path d='M102,56 C96,46 92,38 90,32' stroke='var(--svg-color, #C026D3)' strokeWidth='0.6' opacity='0.6' />
          
          {/* Right Upper Wing - Magic Luminous Core */}
          <path
            d='M102,60 C114,46 130,32 120,14 C112,2 96,10 96,32 Z'
            fill='#FCE7F3'
            opacity='0.45'
          />

          {/* Right Lower Wing - Base Membrane */}
          <path
            d='M100,72 C114,84 132,102 118,116 C106,124 94,108 98,84 C99,78 99,74 100,72 Z'
            fill='var(--svg-color, #E879F9)'
            stroke='var(--svg-color, #C026D3)'
            strokeWidth='1'
            opacity='0.5'
          />
          {/* Right Lower Wing - Internal Veins */}
          <path d='M100,72 C106,88 110,102 118,116' stroke='var(--svg-color, #C026D3)' strokeWidth='0.7' opacity='0.6' />
          <path d='M108,92 C116,96 122,104 118,116' stroke='var(--svg-color, #C026D3)' strokeWidth='0.5' opacity='0.5' />
        </g>
      </svg>
    ),
  },
 {
    id: 'dragon_wings',
    name: 'Dragon Wings',
    nameAr: 'أجنحة التنين',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.85'>
          {/* LEFT WING GROUP */}
          <g className='wing-group-left'>
            {/* Main Membrane & Blade */}
            <path
              d='M24,90 C18,74 16,50 22,26 C16,12 8,6 12,18 C8,34 2,46 0,56 C4,70 8,82 2,90 C8,98 16,98 24,90Z'
              fill='var(--svg-color, #DC2626)'
              stroke='var(--svg-color, #991B1B)'
              strokeWidth='1.2'
            />
            {/* Upper Horn & Structural Ridge */}
            <path
              d='M22,26 C14,16 6,8 14,4 C18,2 22,8 26,16 C22,24 20,34 24,46 C18,38 18,30 22,26Z'
              fill='var(--svg-color, #B91C1C)'
              stroke='var(--svg-color, #7F1D1D)'
              strokeWidth='0.8'
            />
          </g>
          
          {/* RIGHT WING GROUP */}
          <g className='wing-group-right'>
            {/* Main Membrane & Blade */}
            <path
              d='M104,90 C110,74 112,50 106,26 C112,12 120,6 116,18 C120,34 126,46 128,56 C124,70 120,82 126,90 C120,98 112,98 104,90Z'
              fill='var(--svg-color, #DC2626)'
              stroke='var(--svg-color, #991B1B)'
              strokeWidth='1.2'
            />
            {/* Upper Horn & Structural Ridge */}
            <path
              d='M106,26 C114,16 122,8 114,4 C110,2 106,8 102,16 C106,24 108,34 104,46 C110,38 110,30 106,26Z'
              fill='var(--svg-color, #B91C1C)'
              stroke='var(--svg-color, #7F1D1D)'
              strokeWidth='0.8'
            />
          </g>
        </g>
      </svg>
    ),
  },
 {
    id: 'phoenix_wings',
    name: 'Phoenix Wings',
    nameAr: 'أجنحة الفينيق',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.95'>
          {/* LEFT WING - WIDENED OUTWARD */}
          {/* الجناح الأيسر - تم توسيعه بالكامل للخارج */}
          {/* Left Outer Primary Wing-Blade */}
          <path
            d='M12,75 C2,50 -23,35 -19,12 C-9,18 5,45 12,75 Z'
            fill='var(--svg-color, #F97316)'
            stroke='var(--svg-color, #EA580C)'
            strokeWidth='1.2'
          />
          {/* Left Outer Feather Flares */}
          <path
            d='M-3,50 C-13,35 -29,22 -21,2 C-17,-4 -9,8 -3,50 Z'
            fill='#EA580C'
            opacity='0.8'
          />
          {/* Left Mid Wing - Glowing Layer */}
          <path
            d='M15,65 C9,48 -8,30 -5,18 C1,12 11,48 15,65 Z'
            fill='#FB923C'
            stroke='#D97706'
            strokeWidth='0.8'
            opacity='0.9'
          />
          {/* Left Inner Crest - Golden Highlights */}
          <path
            d='M19,70 C17,58 7,45 9,32 C13,28 21,52 19,70 Z'
            fill='#FCD34D'
            stroke='#F59E0B'
            strokeWidth='0.6'
          />
          {/* Left Lower Trailing Plume */}
          <path
            d='M12,78 C7,95 -13,112 -17,122 C-9,124 3,106 12,78 Z'
            fill='var(--svg-color, #F97316)'
            stroke='#EA580C'
            strokeWidth='0.8'
            opacity='0.85'
          />

          {/* RIGHT WING - WIDENED OUTWARD */}
          {/* الجناح الأيمن - تم توسيعه بالكامل للخارج */}
          {/* Right Outer Primary Wing-Blade */}
          <path
            d='M116,75 C126,50 151,35 147,12 C137,18 123,45 116,75 Z'
            fill='var(--svg-color, #F97316)'
            stroke='var(--svg-color, #EA580C)'
            strokeWidth='1.2'
          />
          {/* Right Outer Feather Flares */}
          <path
            d='M131,50 C141,35 157,22 149,2 C145,-4 137,8 131,50 Z'
            fill='#EA580C'
            opacity='0.8'
          />
          {/* Right Mid Wing - Glowing Layer */}
          <path
            d='M113,65 C119,48 136,30 133,18 C127,12 117,48 113,65 Z'
            fill='#FB923C'
            stroke='#D97706'
            strokeWidth='0.8'
            opacity='0.9'
          />
          {/* Right Inner Crest - Golden Highlights */}
          <path
            d='M109,70 C111,58 121,45 119,32 C115,28 107,52 109,70 Z'
            fill='#FCD34D'
            stroke='#F59E0B'
            strokeWidth='0.6'
          />
          {/* Right Lower Trailing Plume */}
          <path
            d='M116,78 C121,95 141,112 145,122 C137,124 125,106 116,78 Z'
            fill='var(--svg-color, #F97316)'
            stroke='#EA580C'
            strokeWidth='0.8'
            opacity='0.85'
          />
        </g>
      </svg>
    ),
  },
  {
    id: 'mechanical_wings',
    name: 'Mechanical Wings',
    nameAr: 'أجنحة ميكانيكية',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.85'>
          <path
            d='M16,68 C8,52 6,34 12,18 L18,22 L14,36 L24,30 L20,44 L30,38 L24,54 L34,48 L28,62Z'
            fill='var(--svg-color, #94A3B8)'
            stroke='var(--svg-color, #64748B)'
            strokeWidth='1.2'
            strokeLinejoin='round'
          />
          <path
            d='M12,18 C10,10 16,4 22,8 C24,12 22,18 18,22Z'
            fill='var(--svg-color, #CBD5E1)'
            stroke='var(--svg-color, #94A3B8)'
            strokeWidth='0.8'
          />
          <circle cx='16' cy='44' r='2' fill='#38BDF8' opacity='0.8' />
          <circle cx='26' cy='36' r='2' fill='#38BDF8' opacity='0.8' />
          <circle cx='20' cy='28' r='1.5' fill='#38BDF8' opacity='0.8' />
          <path
            d='M112,68 C120,52 122,34 116,18 L110,22 L114,36 L104,30 L108,44 L98,38 L104,54 L94,48 L100,62Z'
            fill='var(--svg-color, #94A3B8)'
            stroke='var(--svg-color, #64748B)'
            strokeWidth='1.2'
            strokeLinejoin='round'
          />
          <path
            d='M116,18 C118,10 112,4 106,8 C104,12 106,18 110,22Z'
            fill='var(--svg-color, #CBD5E1)'
            stroke='var(--svg-color, #94A3B8)'
            strokeWidth='0.8'
          />
          <circle cx='112' cy='44' r='2' fill='#38BDF8' opacity='0.8' />
          <circle cx='102' cy='36' r='2' fill='#38BDF8' opacity='0.8' />
          <circle cx='108' cy='28' r='1.5' fill='#38BDF8' opacity='0.8' />
        </g>
      </svg>
    ),
  },
  {
    id: 'feathery_wings',
    name: 'Feathery Wings',
    nameAr: 'أجنحة ريشية',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.85'>
          <path
            d='M6,66 C-6,48 -4,26 8,10 Q12,4 18,8 Q16,18 14,28 Q20,16 28,12 Q32,10 34,16 Q28,26 22,36 Q30,24 38,20 Q42,18 42,24 Q34,36 26,48 Q18,58 10,66Z'
            fill='var(--svg-color, #E2E8F0)'
            stroke='var(--svg-color, #94A3B8)'
            strokeWidth='0.8'
            strokeLinejoin='round'
          />
          <path
            d='M10,58 Q6,48 8,36 Q10,28 16,30 Q14,40 12,50Z'
            fill='#FFFFFF'
            opacity='0.6'
          />
          <path
            d='M122,66 C134,48 132,26 120,10 Q116,4 110,8 Q112,18 114,28 Q108,16 100,12 Q96,10 94,16 Q100,26 106,36 Q98,24 90,20 Q86,18 86,24 Q94,36 102,48 Q110,58 118,66Z'
            fill='var(--svg-color, #E2E8F0)'
            stroke='var(--svg-color, #94A3B8)'
            strokeWidth='0.8'
            strokeLinejoin='round'
          />
          <path
            d='M118,58 Q122,48 120,36 Q118,28 112,30 Q114,40 116,50Z'
            fill='#FFFFFF'
            opacity='0.6'
          />
        </g>
      </svg>
    ),
  },
  {
    id: 'legendary_phoenix_aura',
    name: 'Phoenix Aura',
    nameAr: 'هالة العنقاء الأسطورية',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.98'>
          {/* 1. BASE HEAT RING (طوق الحرارة والإشعاع الخلفي للصورة) */}
          <circle cx='64' cy='64' r='54' stroke='var(--svg-color, #F59E0B)' strokeWidth='2' opacity='0.3' />
          <circle cx='64' cy='64' r='56' stroke='#EF4444' strokeWidth='0.8' strokeDasharray='4 8' opacity='0.6' />

          {/* 2. TOP PHOENIX CREST (تاج الفينيكس الناري العائم أعلى الصورة) */}
          <g transform='translate(64, 8)'>
            <path d='M0,-16 C14,-6 18,6 0,8 C-18,6 -14,-6 0,-16 Z' fill='#EF4444' opacity='0.5' />
            <path d='M0,-12 C8,-4 12,6 0,10 C-12,6 -8,-4 0,-12 Z' fill='#F97316' opacity='0.8' />
            <path d='M0,-8 C5,0 8,8 0,12 C-8,8 -5,0 0,-8 Z' fill='#FEF08A' />
            {/* ألسنة لهب جانبية صغيرة للتاج */}
            <path d='M2,2 Q10,-4 14,0 Q10,4 2,6 Z' fill='#F59E0B' />
            <path d='M-2,2 Q-10,-4 -14,0 Q-10,4 -2,6 Z' fill='#F59E0B' />
          </g>

          {/* 3. BOTTOM INTERLOCKING TAIL FEATHERS (ذيل العنقاء المتقاطع ببراعة أسفل الصورة) */}
          <g transform='translate(64, 116)'>
            <path d='M0,12 C8,4 12,-4 0,-10 C-12,-4 -8,4 0,12 Z' fill='#EF4444' />
            <path d='M0,8 C5,2 8,-4 0,-8 C-8,-4 -5,2 0,8 Z' fill='#F59E0B' />
            {/* الريش الطويل الممتد يميناً ويساراً من الأسفل */}
            <path d='M4,4 C14,14 24,10 30,0 C20,8 10,6 2,-2 Z' fill='var(--svg-color, #F59E0B)' />
            <path d='M-4,4 C-14,14 -24,10 -30,0 C-20,8 -10,6 -2,-2 Z' fill='var(--svg-color, #F59E0B)' />
          </g>

          {/* 4. LEFT WING OF FIRE (جناح اللهب الأيسر الملتف حول البوردر الخارجي) */}
          <g transform='translate(14, 64)'>
            {/* طبقة اللهب الحمراء العميقة */}
            <path d='M6,36 C-8,16 -12,-10 6,-32 C-10,-5 -5,16 10,32 Z' fill='#991B1B' opacity='0.9' />
            {/* طبقة اللهب البرتقالية الوسطى */}
            <path d='M8,30 C-4,15 -8,-5 8,-25 C-4,-5 0,15 12,25 Z' fill='#EF4444' />
            {/* ريش اللهب الذهبي الأمامي الساطع */}
            <path d='M10,24 C2,10 0,-2 10,-15 C2,0 4,10 12,20 Z' fill='#F59E0B' />
            {/* شفرات نارية حادة متطايرة من الجناح */}
            <path d='M2,5 Q-12,0 -16,-10 Q-6,-2 4,0 Z' fill='#F59E0B' />
            <path d='M4,-10 Q-8,-15 -10,-25 Q-2,-15 6,-10 Z' fill='#FEF08A' />
          </g>

          {/* 5. RIGHT WING OF FIRE (جناح اللهب الأيمن الملتف - معكوس بالملي) */}
          <g transform='translate(114, 64)'>
            <path d='M-6,36 C8,16 12,-10 -6,-32 C10,-5 5,16 -10,32 Z' fill='#991B1B' opacity='0.9' />
            <path d='M-8,30 C4,15 8,-5 -8,-25 C4,-5 0,15 -12,25 Z' fill='#EF4444' />
            <path d='M-10,24 C-2,10 0,-2 -10,-15 C-2,0 -4,10 -12,20 Z' fill='#F59E0B' />
            <path d='M-2,5 Q12,0 16,-10 Q6,-2 -4,0 Z' fill='#F59E0B' />
            <path d='M-4,-10 Q8,-15 10,-25 Q2,-15 -6,-10 Z' fill='#FEF08A' />
          </g>

          {/* 6. FLOATING EMBERS (جزيئات وشرارات نار متطايرة في الهواء) */}
          <circle cx='20' cy='20' r='1.5' fill='#FEF08A' />
          <circle cx='108' cy='20' r='1.5' fill='#FEF08A' />
          <polygon points='30,100 32,96 28,96' fill='#F59E0B' />
          <polygon points='98,100 100,96 96,96' fill='#F59E0B' />
          <circle cx='10' cy='44' r='1' fill='#EF4444' />
          <circle cx='118' cy='44' r='1' fill='#EF4444' />
        </g>
      </svg>
    ),
  },
  {
    id: 'arcane_timekeeper',
    name: 'Arcane Timekeeper',
    nameAr: 'أسطرلاب الزمن',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.98'>
          {/* 1. OUTER GEAR TEETH (أسنان التروس الميكانيكية الخارجية) */}
          <circle cx='64' cy='64' r='58' stroke='#78350F' strokeWidth='4' strokeDasharray='6 6' />
          <circle cx='64' cy='64' r='58' stroke='#B45309' strokeWidth='1.5' strokeDasharray='6 6' />

          {/* 2. MAIN BRASS FRAME (الإطار النحاسي الأساسي المزدوج) */}
          <circle cx='64' cy='64' r='54' stroke='#D97706' strokeWidth='2.5' />
          <circle cx='64' cy='64' r='51' stroke='#F59E0B' strokeWidth='1' opacity='0.7' />

          {/* 3. INNER CLOCKWORK TICKS (علامات الثواني الدقيقة كأنها ساعة حقيقية) */}
          <circle cx='64' cy='64' r='48' stroke='var(--svg-color, #FCD34D)' strokeWidth='4' strokeDasharray='1 4' opacity='0.5' />

          {/* 4. CARDINAL POINTERS (مؤشرات البوصلة الذهبية في الاتجاهات الأربعة) */}
          <g fill='#F59E0B' stroke='#78350F' strokeWidth='0.5'>
            <polygon points='64,2 68,12 60,12' />
            <polygon points='64,126 68,116 60,116' />
            <polygon points='2,64 12,60 12,68' />
            <polygon points='126,64 116,60 116,68' />
          </g>

          {/* 5. MAGICAL HEX-TECH COGS (تروس السحر المتداخلة في الزوايا المائلة) */}
          {/* Top-Left Cog */}
          <g transform='translate(24, 24)'>
            <circle cx='0' cy='0' r='12' stroke='#92400E' strokeWidth='3' strokeDasharray='4 3' />
            <circle cx='0' cy='0' r='9' stroke='#D97706' strokeWidth='1.5' />
            <line x1='-9' y1='0' x2='9' y2='0' stroke='#D97706' strokeWidth='1.5' />
            <line x1='0' y1='-9' x2='0' y2='9' stroke='#D97706' strokeWidth='1.5' />
            <circle cx='0' cy='0' r='3' fill='#22D3EE' opacity='0.9' />
            <circle cx='0' cy='0' r='1.5' fill='#FFF' />
          </g>
          {/* Bottom-Right Cog */}
          <g transform='translate(104, 104)'>
            <circle cx='0' cy='0' r='12' stroke='#92400E' strokeWidth='3' strokeDasharray='4 3' />
            <circle cx='0' cy='0' r='9' stroke='#D97706' strokeWidth='1.5' />
            <line x1='-9' y1='0' x2='9' y2='0' stroke='#D97706' strokeWidth='1.5' />
            <line x1='0' y1='-9' x2='0' y2='9' stroke='#D97706' strokeWidth='1.5' />
            <circle cx='0' cy='0' r='3' fill='#22D3EE' opacity='0.9' />
            <circle cx='0' cy='0' r='1.5' fill='#FFF' />
          </g>

          {/* 6. ASTRAL MAGIC GLOW & RUNES (إشعاع السحر الأزرق وخطوط الطاقة المتقطعة) */}
          <circle cx='64' cy='64' r='62' stroke='#22D3EE' strokeWidth='0.8' strokeDasharray='10 15 5 15' opacity='0.8' />
          {/* مسارات طاقة تعبر الفريم */}
          <path d='M24,24 Q64,0 104,24' stroke='#06B6D4' strokeWidth='1.5' fill='none' strokeDasharray='4 4' opacity='0.6' />
          <path d='M24,104 Q64,128 104,104' stroke='#06B6D4' strokeWidth='1.5' fill='none' strokeDasharray='4 4' opacity='0.6' />
          
          {/* 7. FLOATING GLOW PARTICLES (نقاط مضيئة عائمة) */}
          <circle cx='40' cy='12' r='2' fill='#67E8F9' />
          <circle cx='88' cy='12' r='1.5' fill='#67E8F9' opacity='0.8' />
          <circle cx='12' cy='40' r='2' fill='#67E8F9' />
          <circle cx='116' cy='40' r='1.5' fill='#67E8F9' opacity='0.8' />
        </g>
      </svg>
    ),
  },
  {
    id: 'sakura_blossom_wind',
    name: 'Sakura Wind',
    nameAr: 'رياح الساكورا',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.95'>
          {/* 1. WIND CURRENTS (تيارات الهواء الوردية الخفيفة في الخلفية) */}
          <path d='M 16,110 C 64,130 110,96 122,56' fill='none' stroke='#FBCFE8' strokeWidth='1' strokeDasharray='6 6' opacity='0.7' />
          <path d='M 6,50 C 20,10 70,0 114,24' fill='none' stroke='#FBCFE8' strokeWidth='1' strokeDasharray='10 8' opacity='0.7' />

          {/* 2. CHERRY BLOSSOM BRANCHES (أغصان الشجر المتعرجة حول البوردر) */}
          {/* الغصن الرئيسي من أسفل اليسار لأعلى اليسار */}
          <path d='M 14,94 C 6,64 24,24 54,12' fill='none' stroke='#451A03' strokeWidth='3.5' strokeLinecap='round' />
          {/* الغصن السفلي الممتد لليمين */}
          <path d='M 14,94 C 44,120 84,110 106,84' fill='none' stroke='#451A03' strokeWidth='2.5' strokeLinecap='round' />
          {/* الغصن العلوي الممتد لليمين */}
          <path d='M 54,12 C 70,6 90,12 106,24' fill='none' stroke='#451A03' strokeWidth='1.5' strokeLinecap='round' />

          {/* 3. SAKURA FLOWERS (زهور الساكورا الخماسية البتلات) */}
          {/* دالة الزهرة مدمجة كـ <g> لسهولة الاستخدام والتكرار بدون مكونات خارجية */}
          
          {/* زهرة 1: أسفل اليسار */}
          <g transform='translate(16, 92) scale(1.3) rotate(15)'>
            <g fill='var(--svg-color, #FBCFE8)' stroke='#F472B6' strokeWidth='0.5'>
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(0)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(72)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(144)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(216)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(288)' />
            </g>
            <circle cx='0' cy='0' r='1.5' fill='#BE185D' />
          </g>

          {/* زهرة 2: منتصف اليسار */}
          <g transform='translate(20, 50) scale(1) rotate(-20)'>
            <g fill='var(--svg-color, #FBCFE8)' stroke='#F472B6' strokeWidth='0.5'>
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(0)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(72)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(144)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(216)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(288)' />
            </g>
            <circle cx='0' cy='0' r='1.5' fill='#BE185D' />
          </g>

          {/* زهرة 3: أعلى المنتصف */}
          <g transform='translate(54, 12) scale(1.4) rotate(45)'>
            <g fill='var(--svg-color, #FBCFE8)' stroke='#F472B6' strokeWidth='0.5'>
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(0)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(72)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(144)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(216)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(288)' />
            </g>
            <circle cx='0' cy='0' r='1.5' fill='#BE185D' />
          </g>

          {/* زهرة 4: يمين علوي */}
          <g transform='translate(96, 20) scale(0.9) rotate(70)'>
            <g fill='var(--svg-color, #FBCFE8)' stroke='#F472B6' strokeWidth='0.5'>
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(0)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(72)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(144)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(216)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(288)' />
            </g>
            <circle cx='0' cy='0' r='1.5' fill='#BE185D' />
          </g>

          {/* زهرة 5: يمين سفلي */}
          <g transform='translate(90, 106) scale(1.1) rotate(-40)'>
            <g fill='var(--svg-color, #FBCFE8)' stroke='#F472B6' strokeWidth='0.5'>
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(0)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(72)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(144)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(216)' />
              <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' transform='rotate(288)' />
            </g>
            <circle cx='0' cy='0' r='1.5' fill='#BE185D' />
          </g>

          {/* 4. FLOATING PETALS (بتلات متطايرة مع الهواء برة الفريم) */}
          <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' fill='#FBCFE8' stroke='#F472B6' strokeWidth='0.5' transform='translate(100, 50) rotate(45) scale(0.8)' />
          <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' fill='#FBCFE8' stroke='#F472B6' strokeWidth='0.5' transform='translate(116, 70) rotate(110) scale(1)' />
          <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' fill='#FBCFE8' stroke='#F472B6' strokeWidth='0.5' transform='translate(80, 10) rotate(-30) scale(0.7)' />
          <path d='M0,0 C-3,-5 -4,-9 0,-10 C4,-9 3,-5 0,0' fill='#FBCFE8' stroke='#F472B6' strokeWidth='0.5' transform='translate(10, 30) rotate(60) scale(0.6)' />
        </g>
      </svg>
    ),
  },
  {
    id: 'toxic_symbiote',
    name: 'Toxic Symbiote',
    nameAr: 'السيمبيوت السام',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.98'>
          {/* 1. CORRUPTED BASE RING (الحلقة الأساسية المتهالكة والمأكولة) */}
          <circle cx='64' cy='64' r='54' stroke='#1F2937' strokeWidth='4' />
          <circle cx='64' cy='64' r='54' stroke='var(--svg-color, #22C55E)' strokeWidth='1.5' strokeDasharray='15 30 10 40 5 20' opacity='0.6' />

          {/* 2. THE DARK SLIME MASSES (كتل السيمبيوت السوداء اللزجة التي تلتهم الإطار) */}
          <g fill='#030712'>
            {/* Top-Right Slime Infestation */}
            <path d='M64,6 C80,8 96,16 108,28 C116,36 122,50 120,60 C114,46 100,32 86,22 C76,14 66,10 64,6 Z' />
            <path d='M70,8 Q85,25 110,40 Q100,25 80,12 Z' fill='#111827' /> {/* 3D Highlight */}

            {/* Bottom-Left Slime Infestation */}
            <path d='M64,122 C48,120 32,112 20,100 C12,92 6,78 8,68 C14,82 28,96 42,106 C52,114 62,118 64,122 Z' />
            <path d='M58,120 Q43,103 18,88 Q28,103 48,116 Z' fill='#111827' /> {/* 3D Highlight */}
          </g>

          {/* 3. ALIEN TENTACLES & SPIKES (مخالب وأشواك عضوية تخرج من الإطار) */}
          <g fill='#030712'>
            {/* Top Spikes */}
            <path d='M80,14 Q88,-4 92,10 Q86,8 84,18 Z' />
            <path d='M96,20 Q110,6 106,24 Q100,20 94,26 Z' />
            {/* Bottom Spikes */}
            <path d='M48,114 Q40,132 36,118 Q42,120 44,110 Z' />
            <path d='M32,108 Q18,122 22,104 Q28,108 34,102 Z' />
          </g>

          {/* 4. TOXIC NEON VEINS (عروق السم الخضراء المضيئة التي تنبض داخل السيمبيوت) */}
          <g stroke='var(--svg-color, #22C55E)' strokeWidth='1.2' strokeLinecap='round' fill='none'>
            {/* Right Veins */}
            <path d='M78,16 Q90,26 102,40' />
            <path d='M90,26 Q100,20 106,24' strokeWidth='0.8' />
            {/* Left Veins */}
            <path d='M50,112 Q38,102 26,88' />
            <path d='M38,102 Q28,108 22,104' strokeWidth='0.8' />
          </g>

          {/* 5. SLIME DRIPS & GLOWING SPORES (قطرات لزجة تتساقط وجراثيم مضيئة عائمة) */}
          <g fill='#030712'>
            <path d='M104,44 Q106,56 104,60 Q102,56 100,44 Z' />
            <path d='M24,84 Q22,72 24,68 Q26,72 28,84 Z' />
            <circle cx='104' cy='62' r='1.5' />
            <circle cx='24' cy='66' r='1.5' />
          </g>

          {/* Glowing Toxic Spores */}
          <circle cx='86' cy='12' r='2' fill='var(--svg-color, #22C55E)' opacity='0.9' />
          <circle cx='106' cy='16' r='1' fill='var(--svg-color, #22C55E)' opacity='0.6' />
          <circle cx='42' cy='116' r='2' fill='var(--svg-color, #22C55E)' opacity='0.9' />
          <circle cx='22' cy='112' r='1' fill='var(--svg-color, #22C55E)' opacity='0.6' />
          
          {/* Eyes in the dark (عيون مرعبة مضيئة في الظلام) */}
          <path d='M96,30 Q100,28 104,32 Q100,32 96,30 Z' fill='#22C55E' />
          <path d='M32,98 Q28,100 24,96 Q28,96 32,98 Z' fill='#22C55E' />
        </g>
      </svg>
    ),
  },
  {
    id: 'quantum_astral_orbitals',
    name: 'Quantum Orbitals',
    nameAr: 'المدارات الكمية',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.98'>
          {/* 1. EVENT HORIZON RINGS (حلقات أفق الحد المحيطة بالصورة الشخصية مباشرة) */}
          <circle cx='64' cy='64' r='54' stroke='var(--svg-color, #06B6D4)' strokeWidth='1' strokeDasharray='2 6' opacity='0.6' />
          <circle cx='64' cy='64' r='58' stroke='#8B5CF6' strokeWidth='0.5' opacity='0.4' />

          {/* 2. ORBITAL 1: THE CYAN RING (المدار الأول المائل - يمثل مسار طاقة نيون) */}
          <g transform='rotate(-15, 64, 64)'>
            {/* Back Half (النصف الخلفي الخفيف ليعطي عمق للداخل) */}
            <path d='M 124,64 A 60,18 0 0,0 4,64' stroke='var(--svg-color, #06B6D4)' strokeWidth='0.8' opacity='0.25' />
            {/* Front Half (النصف الأمامي السميك والبارز للخارج) */}
            <path d='M 4,64 A 60,18 0 0,0 124,64' stroke='var(--svg-color, #06B6D4)' strokeWidth='1.2' opacity='0.8' />
            
            {/* Glowing Comet Trail (ذيل المذنب المضيء الذي يجري على المسار الأمامي) */}
            <path d='M 64,82 A 60,18 0 0,0 124,64' stroke='var(--svg-color, #06B6D4)' strokeWidth='4' strokeLinecap='round' opacity='0.3' />
            <path d='M 64,82 A 60,18 0 0,0 124,64' stroke='#FFFFFF' strokeWidth='1.5' strokeLinecap='round' opacity='0.9' />
            
            {/* Quantum Core / Planet (النواة أو الكوكب المستقر على المدار) */}
            <circle cx='94' cy='79.6' r='4' fill='var(--svg-color, #06B6D4)' opacity='0.5' />
            <circle cx='94' cy='79.6' r='1.5' fill='#FFFFFF' />
            <circle cx='100' cy='82' r='0.8' fill='#FFFFFF' /> {/* Mini Moon */}
          </g>

          {/* 3. ORBITAL 2: THE MAGENTA RING (المدار الثاني المائل بحدة) */}
          <g transform='rotate(50, 64, 64)'>
            {/* Back Half */}
            <path d='M 122,64 A 58,24 0 0,0 6,64' stroke='#D946EF' strokeWidth='0.8' opacity='0.25' />
            {/* Front Half */}
            <path d='M 6,64 A 58,24 0 0,0 122,64' stroke='#D946EF' strokeWidth='1.2' opacity='0.8' />
            
            {/* Glowing Comet Trail */}
            <path d='M 6,64 A 58,24 0 0,0 64,88' stroke='#D946EF' strokeWidth='4' strokeLinecap='round' opacity='0.3' />
            <path d='M 6,64 A 58,24 0 0,0 64,88' stroke='#FFFFFF' strokeWidth='1.5' strokeLinecap='round' opacity='0.9' />
            
            {/* Quantum Core / Planet */}
            <circle cx='23' cy='81' r='3.5' fill='#D946EF' opacity='0.5' />
            <circle cx='23' cy='81' r='1.5' fill='#FFFFFF' />
          </g>

          {/* 4. ORBITAL 3: THE VIOLET RING (المدار الثالث الرأسي تقريباً) */}
          <g transform='rotate(-75, 64, 64)'>
            {/* Back Half */}
            <path d='M 120,64 A 56,14 0 0,0 8,64' stroke='#8B5CF6' strokeWidth='0.8' opacity='0.25' />
            {/* Front Half */}
            <path d='M 8,64 A 56,14 0 0,0 120,64' stroke='#8B5CF6' strokeWidth='1.2' opacity='0.8' />
            
            {/* Glowing Comet Trail */}
            <path d='M 64,78 A 56,14 0 0,0 120,64' stroke='#8B5CF6' strokeWidth='4' strokeLinecap='round' opacity='0.3' />
            <path d='M 64,78 A 56,14 0 0,0 120,64' stroke='#FFFFFF' strokeWidth='1.5' strokeLinecap='round' opacity='0.9' />
            
            {/* Quantum Core / Planet */}
            <circle cx='112.5' cy='71' r='3.5' fill='#8B5CF6' opacity='0.5' />
            <circle cx='112.5' cy='71' r='1.5' fill='#FFFFFF' />
            {/* Faint Back Planet */}
            <circle cx='103.6' cy='54.1' r='1' fill='#FFFFFF' opacity='0.6' /> 
          </g>

          {/* 5. ASTRAL GLOW LENS FLARES (توهج بصري على أطراف الإطار) */}
          <path d='M 8,64 Q 10,50 14,64 Q 10,78 8,64 Z' fill='var(--svg-color, #06B6D4)' opacity='0.8' />
          <path d='M 120,64 Q 118,50 114,64 Q 118,78 120,64 Z' fill='#D946EF' opacity='0.8' />

          {/* 6. COSMIC DUST & CONSTELLATIONS (نجوم وذرات كونية موزعة بذكاء) */}
          <g fill='#FFFFFF'>
            {/* Top Left Sharp Star */}
            <path d='M20,20 Q20,24 16,24 Q20,24 20,28 Q20,24 24,24 Q20,24 20,20 Z' opacity='0.9' />
            {/* Bottom Right Sharp Star */}
            <path d='M108,108 Q108,112 104,112 Q108,112 108,116 Q108,112 112,112 Q108,112 108,108 Z' opacity='0.9' />
            
            {/* Floating Energy Particles */}
            <circle cx='30' cy='12' r='1' opacity='0.5' />
            <circle cx='100' cy='20' r='1.5' fill='var(--svg-color, #06B6D4)' opacity='0.7' />
            <circle cx='14' cy='90' r='1' fill='#D946EF' opacity='0.7' />
            <circle cx='90' cy='116' r='1.2' opacity='0.6' />
          </g>
        </g>
      </svg>
    ),
  },
  {
    id: 'neon_cosmic_vortex',
    name: 'Cosmic Vortex',
    nameAr: 'دوامة المجرة',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>

        <g opacity='0.95'>
          {/* 1. BASE GALAXY GLOW (الهالة الخلفية العميقة للدوامة) */}
          <circle cx='64' cy='64' r='56' stroke='#5B21B6' strokeWidth='12' opacity='0.25' />
          <circle cx='64' cy='64' r='54' stroke='#D946EF' strokeWidth='8' opacity='0.2' />
          <circle cx='64' cy='64' r='58' stroke='#06B6D4' strokeWidth='6' opacity='0.15' />

          {/* 2. SLOW DEEP PURPLE TRACKS (المسارات البنفسجية العميقة والبطيئة) */}
          <g className='vortex-origin spin-slower-rev'>
            <circle cx='64' cy='64' r='57' stroke='#7C3AED' strokeWidth='4' strokeDasharray='40 80 20 60' strokeLinecap='round' opacity='0.7' />
            <circle cx='64' cy='64' r='52' stroke='#8B5CF6' strokeWidth='2' strokeDasharray='10 40 80 30' strokeLinecap='round' opacity='0.6' />
          </g>

          {/* 3. MEDIUM MAGENTA/PINK STREAKS (خطوط الطاقة الوردية المتوسطة السرعة) */}
          <g className='vortex-origin spin-slow'>
            <circle cx='64' cy='64' r='55' stroke='#E879F9' strokeWidth='3' strokeDasharray='60 30 10 80' strokeLinecap='round' opacity='0.9' />
            <circle cx='64' cy='64' r='60' stroke='#D946EF' strokeWidth='1.5' strokeDasharray='20 60 40 50' strokeLinecap='round' opacity='0.8' />
            <circle cx='64' cy='64' r='50' stroke='#F472B6' strokeWidth='2.5' strokeDasharray='15 90 30 70' strokeLinecap='round' opacity='0.85' />
          </g>

          {/* 4. FAST CYAN/TEAL ENERGY (مسارات النيون السماوية السريعة جداً) */}
          <g className='vortex-origin spin-med-rev'>
            <circle cx='64' cy='64' r='58' stroke='#22D3EE' strokeWidth='2' strokeDasharray='30 70 15 50' strokeLinecap='round' />
            <circle cx='64' cy='64' r='53' stroke='#06B6D4' strokeWidth='3' strokeDasharray='5 40 80 60' strokeLinecap='round' />
            <circle cx='64' cy='64' r='62' stroke='#67E8F9' strokeWidth='1' strokeDasharray='50 100 10 40' strokeLinecap='round' opacity='0.7' />
          </g>

          {/* 5. HYPER-SPEED WHITE COMETS (مذنبات الإضاءة البيضاء الخاطفة) */}
          <g className='vortex-origin spin-fast'>
            <circle cx='64' cy='64' r='56' stroke='#FFFFFF' strokeWidth='1.5' strokeDasharray='4 120 2 80' strokeLinecap='round' opacity='0.9' />
            <circle cx='64' cy='64' r='54' stroke='#FFFFFF' strokeWidth='1' strokeDasharray='10 150 4 60' strokeLinecap='round' opacity='0.7' />
          </g>

          {/* 6. FLOATING MAGIC PARTICLES (جزيئات النجوم وغبار المجرة المضيء المتناثر) */}
          <g className='vortex-origin spin-slow'>
            {/* Cyan Particles */}
            <circle cx='64' cy='6' r='1.5' fill='#22D3EE' className='pulse-glow' />
            <circle cx='118' cy='44' r='1' fill='#22D3EE' />
            <circle cx='18' cy='94' r='1.2' fill='#06B6D4' />
            <circle cx='98' cy='112' r='1' fill='#67E8F9' className='pulse-glow' />
            
            {/* Magenta Particles */}
            <circle cx='20' cy='30' r='1.5' fill='#E879F9' className='pulse-glow' />
            <circle cx='104' cy='24' r='1.2' fill='#D946EF' />
            <circle cx='12' cy='64' r='1' fill='#F472B6' />
            <circle cx='74' cy='120' r='1.5' fill='#E879F9' className='pulse-glow' />
          </g>

          {/* Counter-rotating Particles for depth */}
          <g className='vortex-origin spin-med-rev'>
            <circle cx='44' cy='10' r='1' fill='#FFFFFF' />
            <circle cx='110' cy='84' r='1.5' fill='#FFFFFF' className='pulse-glow' />
            <circle cx='34' cy='114' r='1' fill='#E879F9' />
            <circle cx='6' cy='44' r='1.2' fill='#22D3EE' />
            <circle cx='94' cy='12' r='1' fill='#D946EF' />
          </g>

          {/* Static intense core sparks */}
          <circle cx='28' cy='28' r='0.8' fill='#FFFFFF' />
          <circle cx='100' cy='100' r='0.8' fill='#FFFFFF' />
          <circle cx='102' cy='36' r='1' fill='#FFFFFF' opacity='0.6' />
          <circle cx='26' cy='102' r='1' fill='#FFFFFF' opacity='0.6' />
        </g>
      </svg>
    ),
  },
  {
    id: 'stellar_constellations',
    name: 'Stellar Constellation',
    nameAr: 'الكوكبة الفلكية',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>

        <g opacity='0.98'>
          {/* 1. ASTRAL GLOBE RINGS (حلقات الكرة الفلكية في الخلفية) */}
          <g className='astral-origin spin-ring'>
            <circle cx='64' cy='64' r='54' stroke='var(--svg-color, #FBBF24)' strokeWidth='0.6' strokeDasharray='2 4' opacity='0.5' />
            <circle cx='64' cy='64' r='58' stroke='#FDE68A' strokeWidth='1.2' strokeDasharray='40 10 10 10' opacity='0.3' />
            {/* علامات البوصلة الفلكية الصغيرة على الحلقة */}
            <line x1='64' y1='2' x2='64' y2='6' stroke='#FBBF24' strokeWidth='1.5' />
            <line x1='64' y1='122' x2='64' y2='126' stroke='#FBBF24' strokeWidth='1.5' />
            <line x1='2' y1='64' x2='6' y2='64' stroke='#FBBF24' strokeWidth='1.5' />
            <line x1='122' y1='64' x2='126' y2='64' stroke='#FBBF24' strokeWidth='1.5' />
          </g>

          {/* 2. CONSTELLATION MAP LINES (خطوط خريطة الأبراج الهندسية المضيئة) */}
          <g className='pulsing-line' stroke='var(--svg-color, #FDE047)' strokeWidth='0.8' strokeDasharray='3 3' fill='none' strokeLinecap='round'>
            {/* Left Constellation */}
            <path d='M20,20 L45,8 L75,12' />
            <path d='M20,20 L10,45 L14,75 L28,108' />
            {/* Right Constellation */}
            <path d='M108,20 L120,48 L102,75 L116,100 L85,115' />
            {/* Cross-linking fine lines */}
            <path d='M10,45 L28,60 L14,75' strokeWidth='0.4' strokeDasharray='1 4' />
            <path d='M120,48 L98,55 L102,75' strokeWidth='0.4' strokeDasharray='1 4' />
          </g>

          {/* 3. CONSTELLATION NODES (عُقد التقاطع النجمية الصغيرة) */}
          <g fill='#FFFFFF' stroke='#F59E0B' strokeWidth='0.5'>
            {/* Left Nodes */}
            <circle cx='45' cy='8' r='1.5' />
            <circle cx='75' cy='12' r='1.2' />
            <circle cx='10' cy='45' r='1.5' />
            <circle cx='14' cy='75' r='1.2' />
            <circle cx='28' cy='60' r='1' opacity='0.8' />
            {/* Right Nodes */}
            <circle cx='120' cy='48' r='1.5' />
            <circle cx='102' cy='75' r='1.5' />
            <circle cx='85' cy='115' r='1.2' />
            <circle cx='98' cy='55' r='1' opacity='0.8' />
          </g>

          {/* 4. THE GRAND STARS (النجوم الماسية الكبرى ذات الأطراف الحادة) */}
          {/* North Star (Polaris) - Top Left */}
          <g transform='translate(20, 20)' style={{ transformOrigin: '20px 20px' }} className='twinkle-slow'>
            <path d='M0,-12 Q0,0 12,0 Q0,0 0,12 Q0,0 -12,0 Q0,0 0,-12 Z' fill='#FFFFFF' />
            <path d='M0,-8 Q0,0 8,0 Q0,0 0,8 Q0,0 -8,0 Q0,0 0,-8 Z' fill='var(--svg-color, #FBBF24)' opacity='0.8' transform='rotate(45)' />
            <circle cx='0' cy='0' r='2' fill='#FFFFFF' />
          </g>

          {/* Sirius Star - Top Right (أكبر نجمة) */}
          <g transform='translate(108, 20)' style={{ transformOrigin: '108px 20px' }} className='twinkle-fast'>
            {/* Glow Aura */}
            <circle cx='0' cy='0' r='14' fill='#FBBF24' opacity='0.15' />
            {/* Primary 4 Points */}
            <path d='M0,-16 Q0,0 16,0 Q0,0 0,16 Q0,0 -16,0 Q0,0 0,-16 Z' fill='#FFFFFF' />
            {/* Secondary 4 Points */}
            <path d='M0,-10 Q0,0 10,0 Q0,0 0,10 Q0,0 -10,0 Q0,0 0,-10 Z' fill='var(--svg-color, #F59E0B)' opacity='0.9' transform='rotate(45)' />
            <circle cx='0' cy='0' r='2.5' fill='#FFFFFF' />
          </g>

          {/* Antares Star - Bottom Left */}
          <g transform='translate(28, 108)' style={{ transformOrigin: '28px 108px' }} className='twinkle-fast'>
            <path d='M0,-10 Q0,0 10,0 Q0,0 0,10 Q0,0 -10,0 Q0,0 0,-10 Z' fill='#FFFFFF' />
            <path d='M0,-6 Q0,0 6,0 Q0,0 0,6 Q0,0 -6,0 Q0,0 0,-6 Z' fill='var(--svg-color, #FBBF24)' opacity='0.8' transform='rotate(45)' />
            <circle cx='0' cy='0' r='1.5' fill='#FFFFFF' />
          </g>

          {/* Rigel Star - Bottom Right */}
          <g transform='translate(116, 100)' style={{ transformOrigin: '116px 100px' }} className='twinkle-slow'>
            <path d='M0,-10 Q0,0 10,0 Q0,0 0,10 Q0,0 -10,0 Q0,0 0,-10 Z' fill='#FFFFFF' />
            <path d='M0,-6 Q0,0 6,0 Q0,0 0,6 Q0,0 -6,0 Q0,0 0,-6 Z' fill='var(--svg-color, #FBBF24)' opacity='0.8' transform='rotate(45)' />
            <circle cx='0' cy='0' r='1.5' fill='#FFFFFF' />
          </g>

          {/* 5. COSMIC STARDUST (غبار النجوم المضيء المتناثر في الفراغ) */}
          <g fill='#FEF08A'>
            <polygon points='54,1 55,3 54,5 53,3' className='twinkle-fast' />
            <polygon points='86,3 87,5 86,7 85,5' className='twinkle-slow' />
            <polygon points='4,60 5,62 4,64 3,62' opacity='0.7' />
            <polygon points='124,80 125,82 124,84 123,82' opacity='0.7' />
            <circle cx='60' cy='124' r='1' opacity='0.6' />
            <circle cx='40' cy='116' r='1.5' opacity='0.8' />
            <circle cx='96' cy='94' r='0.8' opacity='0.9' />
          </g>
        </g>
      </svg>
    ),
  },
  {
  id: 'alchemy_seal',
  name: 'Alchemy Seal',
  nameAr: 'ختم الخيمياء',
  svg: (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <style>{`
        .seal-origin { transform-origin: 64px 64px; }
        @keyframes rotate-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rotate-reverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes ether-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes float-up {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
        .spin-cw { animation: rotate-slow 20s linear infinite; }
        .spin-ccw { animation: rotate-reverse 15s linear infinite; }
        .pulse { animation: ether-pulse 3s ease-in-out infinite; }
        .float { animation: float-up 4s ease-in-out infinite; }
      `}</style>

      {/* 1. OUTER ORBITAL RINGS */}
      <g className='seal-origin spin-cw'>
        <circle cx='64' cy='64' r='60' stroke='var(--svg-color, #A78BFA)' strokeWidth='0.5' strokeDasharray='4 8' />
        <path d='M64 4 A60 60 0 0 1 64 124 A60 60 0 0 1 64 4' stroke='var(--svg-color, #C4B5FD)' strokeWidth='1' fill='none' />
      </g>

      {/* 2. ROTATING GEOMETRIC CORE */}
      <g className='seal-origin spin-ccw' stroke='var(--svg-color, #818CF8)' strokeWidth='1.5'>
        <rect x='44' y='44' width='40' height='40' transform='rotate(45 64 64)' fill='none' />
        <line x1='64' y1='24' x2='64' y2='104' strokeDasharray='4 4' />
        <line x1='24' y1='64' x2='104' y2='64' strokeDasharray='4 4' />
      </g>

      {/* 3. ALCHEMICAL NODES */}
      <g fill='#E0E7FF' stroke='#4F46E5' strokeWidth='1'>
        <circle cx='64' cy='24' r='3' className='pulse' />
        <circle cx='64' cy='104' r='3' className='pulse' style={{ animationDelay: '1s' }} />
        <circle cx='24' cy='64' r='3' className='pulse' style={{ animationDelay: '1.5s' }} />
        <circle cx='104' cy='64' r='3' className='pulse' style={{ animationDelay: '0.5s' }} />
      </g>

      {/* 4. CENTRAL CRYSTAL */}
      <g transform='translate(64, 64)'>
        <circle r='8' fill='url(#grad1)' />
        <defs>
          <radialGradient id='grad1' cx='50%' cy='50%' r='50%'>
            <stop offset='0%' stopColor='#FFFFFF' />
            <stop offset='100%' stopColor='#6366F1' />
          </radialGradient>
        </defs>
      </g>

      {/* 5. ETHER PARTICLES */}
      <g className='float'>
        <circle cx='50' cy='100' r='1.5' fill='#C7D2FE' />
      </g>
      <g className='float' style={{ animationDelay: '2s' }}>
        <circle cx='78' cy='100' r='1' fill='#E0E7FF' />
      </g>
      <g className='float' style={{ animationDelay: '1s' }}>
        <circle cx='64' cy='90' r='1.2' fill='#A5B4FC' />
      </g>
    </svg>
  ),
}
];

export const DECORATION_KEYFRAMES = `
.decoration-carousel svg * {
  animation-play-state: paused !important;
}

@keyframes vortex-spin-cw {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes vortex-spin-ccw {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(-360deg); }
}
@keyframes particle-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
.vortex-origin { transform-box: fill-box; transform-origin: 50% 50%; }
.spin-fast { animation: vortex-spin-cw 4s linear infinite; }
.spin-med-rev { animation: vortex-spin-ccw 6s linear infinite; }
.spin-slow { animation: vortex-spin-cw 9s linear infinite; }
.spin-slower-rev { animation: vortex-spin-ccw 12s linear infinite; }
.pulse-glow { animation: particle-pulse 3s ease-in-out infinite; }

@keyframes astral-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes star-twinkle {
  0%, 100% { opacity: 0.6; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 4px rgba(253,230,138,0.8)); }
}
@keyframes slow-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
.astral-origin { transform-box: fill-box; transform-origin: 50% 50%; }
.spin-ring { animation: astral-spin 30s linear infinite; }
.twinkle-fast { animation: star-twinkle 2s ease-in-out infinite; }
.twinkle-slow { animation: star-twinkle 3.5s ease-in-out infinite; }
.pulsing-line { animation: slow-pulse 4s ease-in-out infinite; }

@keyframes cat-twitch-left {
  0%, 90%, 94%, 98%, 100% { transform: rotate(0deg); }
  92%, 96% { transform: rotate(-5deg) scaleY(0.96); }
}
@keyframes cat-twitch-right {
  0%, 86%, 90%, 94%, 100% { transform: rotate(0deg); }
  88%, 92% { transform: rotate(5deg) scaleY(0.96); }
}
.cat-ear-left {
  transform-origin: 35px 35px;
  animation: cat-twitch-left 4.5s ease-in-out infinite;
}
.cat-ear-right {
  transform-origin: 93px 35px;
  animation: cat-twitch-right 4.5s ease-in-out infinite;
}
@keyframes crown-float {
  0%, 100% { transform: translateY(-25px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(0.5deg); }
}
@keyframes gem-shimmer {
  0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 2px rgba(255,255,255,0.5)); }
  50% { opacity: 1; filter: drop-shadow(0 0 6px rgba(255,255,255,0.9)); }
}
.main-crown-group {
  transform-origin: 64px 35px;
  animation: crown-float 3.5s ease-in-out infinite;
}
.shimmering-gem {
  animation: gem-shimmer 2s ease-in-out infinite;
}
@keyframes angel-flap-left {
  0%, 100% { transform: scaleX(1) rotate(0deg); }
  50% { transform: scaleX(0.88) rotate(3deg); }
}
@keyframes angel-flap-right {
  0%, 100% { transform: scaleX(1) rotate(0deg); }
  50% { transform: scaleX(0.88) rotate(-3deg); }
}
.angel-wing-left {
  transform-origin: 26px 76px;
  animation: angel-flap-left 4.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}
.angel-wing-right {
  transform-origin: 102px 76px;
  animation: angel-flap-right 4.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}
@keyframes dragon-flap-left {
  0%, 100% { transform: scaleX(1) rotate(0deg); }
  50% { transform: scaleX(0.72) rotate(6deg); }
}
@keyframes dragon-flap-right {
  0%, 100% { transform: scaleX(1) rotate(0deg); }
  50% { transform: scaleX(0.72) rotate(-6deg); }
}
.wing-group-left {
  transform-origin: 24px 82px;
  animation: dragon-flap-left 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}
.wing-group-right {
  transform-origin: 104px 82px;
  animation: dragon-flap-right 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}
`;

export const DECORATION_MAP = new Map(AVATAR_DECORATIONS.map((d) => [d.id, d]));

export const getDecoration = (id: string | null | undefined): React.ReactNode => {
  if (!id) return null;
  return DECORATION_MAP.get(id)?.svg ?? null;
};
