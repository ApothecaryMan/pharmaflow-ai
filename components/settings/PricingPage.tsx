/**
 * PricingPage — Zinc Pharmacy OS Subscription Plans
 *
 * Converted from zinc_pricing_fixed.html reference.
 * Preserves exact design: Syne + Space Mono fonts, black background,
 * chemical formula branding, and monthly/annual toggle.
 */

import React, { useState } from 'react';

// ── Data ──

const PRICES = { pro: 199, max: 499 };

interface PlanFeature {
  text: string;
  highlighted?: boolean;
}

interface Plan {
  tier: string;
  formula: React.ReactNode;
  name: string;
  features: PlanFeature[];
  featuresLabel: string;
  isFeatured?: boolean;
  badge?: string;
  isFree?: boolean;
  cta: string;
  ctaPrimary?: boolean;
}

const PLANS: Plan[] = [
  {
    tier: 'Free tier',
    formula: <>ZnO</>,
    name: 'Zinc Oxide — Starter',
    isFree: true,
    cta: 'Get Started',
    ctaPrimary: true,
    featuresLabel: 'Includes',
    features: [
      { text: 'فرع واحد' },
      { text: 'حتى 3 مستخدمين' },
      { text: 'إدارة المخزون الأساسية' },
      { text: 'تقارير شهرية محدودة' },
      { text: 'دعم عبر البريد' },
    ],
  },
  {
    tier: 'Pro tier',
    formula: <>ZnSO<sub>4</sub></>,
    name: 'Zinc Sulfate — Professional',
    isFeatured: true,
    badge: 'Most Popular',
    cta: 'Start Free Trial',
    ctaPrimary: true,
    featuresLabel: 'Everything in ZnO, plus',
    features: [
      { text: 'حتى 5 فروع', highlighted: true },
      { text: 'مستخدمين غير محدودين', highlighted: true },
      { text: 'تقارير وتحليلات متقدمة', highlighted: true },
      { text: 'ربط بأجهزة الباركود', highlighted: true },
      { text: 'دعم أولوية 24/7', highlighted: true },
      { text: 'إشعارات انتهاء الصلاحية', highlighted: true },
    ],
  },
  {
    tier: 'Max tier',
    formula: <>Zn(NO<sub>3</sub>)<sub>2</sub></>,
    name: 'Zinc Nitrate — Enterprise',
    cta: 'Contact Sales',
    ctaPrimary: true,
    featuresLabel: 'Everything in ZnSO₄, plus',
    features: [
      { text: 'فروع غير محدودة' },
      { text: 'API مفتوح للتكامل' },
      { text: 'داشبورد تحليلي مخصص' },
      { text: 'مدير حساب مخصص' },
      { text: 'نسخ احتياطي يومي تلقائي' },
      { text: 'SLA 99.9% uptime مضمون' },
    ],
  },
];

// ── Check SVG ──

const CheckIcon: React.FC<{ highlighted?: boolean }> = ({ highlighted }) => (
  <svg className='zn-check' viewBox='0 0 14 14' fill='none'>
    <polyline
      points='2,7 5.5,10.5 12,3.5'
      stroke={highlighted ? '#444' : '#2a2a2a'}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

// ── Styles ──

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;700;800&display=swap');

:root {
  --zn-bg: #f1f3f5;
  --zn-text: #000;
  --zn-card-bg: #fff;
  --zn-grid-bg: #dee2e6;
  --zn-border: #ced4da;
  --zn-accent: #868e96;
  --zn-muted: #adb5bd;
  --zn-formula: #000;
  --zn-btn-border: #dee2e6;
  --zn-btn-text: #495057;
  --zn-btn-hover-bg: #e9ecef;
}

.dark {
  --zn-bg: #000;
  --zn-text: #fff;
  --zn-card-bg: #000;
  --zn-grid-bg: #1a1a1a;
  --zn-border: #2a2a2a;
  --zn-accent: #555;
  --zn-muted: #444;
  --zn-formula: #fff;
  --zn-btn-border: #1e1e1e;
  --zn-btn-text: #555;
  --zn-btn-hover-bg: #0d0d0d;
}

.zn-root{background:var(--zn-bg);padding:3rem 0 4rem;font-family:'Syne',sans-serif !important;color:var(--zn-text);min-height:100%;border-radius:0;transition: background 0.3s, color 0.3s}
.zn-header{text-align:center;margin-bottom:2.5rem}
.zn-brand{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.25em;color:var(--zn-accent);text-transform:uppercase;margin-bottom:.75rem}
.zn-title{font-family:'Syne',sans-serif !important;font-size:2rem !important;font-weight:800 !important;color:var(--zn-text);margin:0 0 .5rem;letter-spacing:-.02em !important}
.zn-subtitle{font-family:'Space Mono',monospace;font-size:11px;color:var(--zn-muted)}
.zn-toggle-wrap{display:flex;align-items:center;justify-content:center;gap:14px;margin:1.5rem 0 2.5rem}
.zn-toggle-label{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:color .2s}
.zn-toggle-label.active{color:var(--zn-text)}
.zn-toggle-label.inactive{color:var(--zn-muted)}
.zn-switch{width:44px;height:24px;background:var(--zn-grid-bg);border:1px solid var(--zn-border);border-radius:12px;cursor:pointer;position:relative;transition:background .2s}
.zn-switch.on{background:var(--zn-bg);border-color:var(--zn-accent)}
.zn-knob{width:18px;height:18px;background:var(--zn-accent);border-radius:50%;position:absolute;top:2px;left:3px;transition:transform .2s,background .2s}
.zn-switch.on .zn-knob{transform:translateX(20px);background:var(--zn-text)}
.zn-save-badge{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.1em;color:var(--zn-text);background:var(--zn-grid-bg);border:1px solid var(--zn-border);padding:3px 8px;opacity:0;transition:opacity .2s}
.zn-save-badge.visible{opacity:1}
.zn-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--zn-grid-bg);border:1px solid var(--zn-grid-bg);max-width:860px;margin:0 auto}
.zn-card{position:relative;background:var(--zn-card-bg);padding:2.5rem 1.75rem 2rem;transition:background .2s;cursor:default}
.zn-card:hover{background:var(--zn-btn-hover-bg)}
.zn-card.featured{background:var(--zn-card-bg)}
.zn-card.featured:hover{background:var(--zn-btn-hover-bg)}
.zn-tier-label{font-family:'Space Mono',monospace;font-size:14px;letter-spacing:.25em;color:var(--zn-accent);text-transform:uppercase;margin-bottom:1.25rem;font-weight:700}
.zn-formula-wrap{height:64px;display:flex;align-items:center;margin-bottom:.25rem}
.zn-formula{font-family:'Space Mono',monospace;font-size:2.4rem;font-weight:700;color:var(--zn-formula);letter-spacing:-.02em;line-height:1;white-space:nowrap}
.zn-formula sup,.zn-formula sub{font-size:.6em;font-weight:700}
.zn-formula sub{vertical-align:sub}
.zn-formula sup{vertical-align:super}
.zn-plan-name{font-size:12px;color:var(--zn-text);font-family:'Space Mono',monospace;margin-bottom:1.5rem;letter-spacing:.05em;height:42px;display:flex;align-items:center}
.zn-price-block{margin-bottom:1.75rem;height:100px}
.zn-old{font-family:'Space Mono',monospace;font-size:11px;color:var(--zn-muted);text-decoration:line-through;height:16px;margin-bottom:2px}
.zn-amount{font-family:'Syne',sans-serif !important;font-size:2rem !important;font-weight:800 !important;color:var(--zn-text);letter-spacing:-.03em !important;line-height:1}
.zn-amount-free{font-family:'Syne',sans-serif !important;font-size:1.75rem !important;font-weight:800 !important;color:var(--zn-text)}
.zn-period{font-family:'Space Mono',monospace;font-size:11px;color:var(--zn-muted);margin-top:6px}
.zn-btn{display:block;width:100%;padding:.75rem 1rem;background:transparent;border:1px solid var(--zn-btn-border);color:var(--zn-btn-text);font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.15em;text-transform:uppercase;cursor:pointer;transition:border-color .2s,color .2s,background .2s;margin-bottom:2rem;text-align:center;box-sizing:border-box}
.zn-btn:hover{border-color:var(--zn-accent);color:var(--zn-text);background:var(--zn-btn-hover-bg)}
.zn-btn.primary{border-color:var(--zn-text);color:var(--zn-text)}
.zn-btn.primary:hover{background:var(--zn-text);color:var(--zn-bg)}
.zn-divider{border:none;border-top:1px solid var(--zn-border);margin-bottom:1.5rem}
.zn-features-label{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.15em;color:#666;text-transform:uppercase;margin-bottom:1.25rem;font-weight:500}
.zn-feature{display:flex;align-items:flex-start;gap:.75rem;margin-bottom:.875rem}
.zn-check{width:14px;height:14px;flex-shrink:0;margin-top:2px}
.zn-feature-text{font-size:13px;color:var(--zn-muted);line-height:1.4}
.zn-card:hover .zn-feature-text{color:var(--zn-text)}
.zn-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.15em;color:var(--zn-text);background:var(--zn-card-bg);border:1px solid var(--zn-border);padding:4px 12px;text-transform:uppercase;white-space:nowrap;z-index:10}
.zn-footer{text-align:center;margin-top:2rem;font-family:'Space Mono',monospace;font-size:10px;color:var(--zn-muted);letter-spacing:.1em}

@media (max-width: 768px) {
  .zn-grid{grid-template-columns:1fr;max-width:400px}
  .zn-title{font-size:1.5rem}
}
`;

// ── Component ──

interface PricingPageProps {
  color?: string;
  t?: any;
  language?: string;
}

export const PricingPage: React.FC<PricingPageProps> = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const getPrice = (monthly: number) => {
    return isAnnual ? Math.round(monthly * 0.9) : monthly;
  };

  const renderPriceBlock = (plan: Plan) => {
    if (plan.isFree) {
      return (
        <div className='zn-price-block'>
          <div className='zn-old'>&nbsp;</div>
          <div className='zn-amount-free' style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>Free</div>
          <div className='zn-period'>forever</div>
        </div>
      );
    }

    const monthlyPrice = plan.tier === 'Pro tier' ? PRICES.pro : PRICES.max;
    const displayPrice = getPrice(monthlyPrice);

    return (
      <div className='zn-price-block'>
        <div className='zn-old'>
          {isAnnual ? `EGP ${monthlyPrice}/mo` : '\u00A0'}
        </div>
        <div className='zn-amount' style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, lineHeight: 1 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.5rem', fontWeight: 700, color: 'var(--zn-text)', marginBottom: '2px', letterSpacing: '-0.02em' }}>EGP</div>
          {displayPrice}
          <span style={{ fontSize: '1rem', fontWeight: 400, color: '#444', fontFamily: "'Space Mono', monospace" }}>/mo</span>
        </div>
        <div className='zn-period'>
          {isAnnual
            ? `billed annually — EGP ${displayPrice * 12}/yr`
            : 'billed monthly'}
        </div>
      </div>
    );
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;700;800&display=swap" rel="stylesheet" />
      <style>{styles}</style>
      <div className='zn-root' dir="ltr">
        {/* Header */}
        <div className='zn-header'>
          <p className='zn-brand'>Zinc Pharmacy OS — Pricing</p>
          <h1 className='zn-title' style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>Choose your compound</h1>
          <p className='zn-subtitle'>// three tiers. one stack.</p>
        </div>

        {/* Billing Toggle */}
        <div className='zn-toggle-wrap'>
          <span
            className={`zn-toggle-label ${isAnnual ? 'inactive' : 'active'}`}
            onClick={() => setIsAnnual(false)}
          >
            Monthly
          </span>
          <div
            className={`zn-switch ${isAnnual ? 'on' : ''}`}
            onClick={() => setIsAnnual((v) => !v)}
          >
            <div className='zn-knob' />
          </div>
          <span
            className={`zn-toggle-label ${isAnnual ? 'active' : 'inactive'}`}
            onClick={() => setIsAnnual(true)}
          >
            Annual
          </span>
          <span className={`zn-save-badge ${isAnnual ? 'visible' : ''}`}>Save 10%</span>
        </div>

        {/* Plan Cards Grid */}
        <div className='zn-grid'>
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`zn-card ${plan.isFeatured ? 'featured' : ''}`}
            >
              {plan.badge && <div className='zn-badge'>{plan.badge}</div>}
              <p className='zn-tier-label'>{plan.tier}</p>
              <div className='zn-formula-wrap'>
                <span className='zn-formula'>{plan.formula}</span>
              </div>
              <p className='zn-plan-name'>{plan.name}</p>

              {renderPriceBlock(plan)}

              <button className={`zn-btn ${plan.ctaPrimary ? 'primary' : ''}`}>
                {plan.cta}
              </button>

              <hr className='zn-divider' />

              <p className='zn-features-label'>{plan.featuresLabel}</p>
              {plan.features.map((f, i) => (
                <div className='zn-feature' key={i}>
                  <CheckIcon highlighted={f.highlighted} />
                  <span className='zn-feature-text'>{f.text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <p className='zn-footer'>
          // All plans include Arabic &amp; English UI — RTL support included
        </p>
      </div>
    </>
  );
};
