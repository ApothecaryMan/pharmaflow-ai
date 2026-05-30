import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { AVAILABLE_FONTS_AR, AVAILABLE_FONTS_EN } from '../../../../config/fonts';
import { permissionsService } from '../../../../services/auth/permissionsService';
import { useSettings } from '../../../../context';
import { useData } from '../../../../context/DataContext';
import { TRANSLATIONS } from '../../../../i18n/translations';
import { type Language } from '../../../../types';
import { SegmentedControl } from '../../../common/SegmentedControl';
import { Switch } from '../../../common/Switch';
import { StatusBarItem } from '../StatusBarItem';

// --- Utility Components & Helpers ---



const SettingsRow: React.FC<{
  icon: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ icon, label, children, className = '' }) => (
  <div className={`flex items-center justify-between py-0.5 ${className}`}>
    <div className="flex items-center gap-2">
      <span 
        className="material-symbols-rounded text-(--text-secondary)"
        style={{ fontSize: 'var(--icon-settings)' }}
      >
        {icon}
      </span>
      <span className="text-xs font-medium text-(--text-primary)">{label}</span>
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

const SubmenuWrapper: React.FC<{
  isOpen: boolean;
  isMobile: boolean;
  children: React.ReactNode;
  title?: string;
}> = ({ isOpen, isMobile, children, title }) => {
  if (!isOpen) return null;

  const mobileClasses = 'relative w-full mt-2 p-2.5 space-y-2 rounded-xl border-none shadow-none bg-(--bg-page-surface)';

  // Default: top-aligned, grows downward. Ref callback flips if it overflows viewport.
  const desktopClasses = 'absolute top-0 w-64 rounded-xl shadow-2xl border border-(--border-divider) z-120 p-2.5 space-y-2 bg-(--bg-menu)';

  const desktopStyle: React.CSSProperties = {
    insetInlineEnd: 'calc(100% + 12px)',
  };

  // One-shot viewport check: flip vertical anchor if submenu overflows bottom
  const adjustRef = (el: HTMLDivElement | null) => {
    if (!el || isMobile) return;
    const rect = el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 8) {
      el.style.top = 'auto';
      el.style.bottom = '0';
    }
  };

  return (
    <div ref={adjustRef} className={isMobile ? mobileClasses : desktopClasses} style={isMobile ? undefined : desktopStyle}>
      {title && <label className="text-[10px] font-bold uppercase mb-1 block text-(--text-tertiary) border-b border-(--border-divider)/30 pb-1">{title}</label>}
      {children}
    </div>
  );
};

export interface SettingsMenuProps {
  dropDirection?: 'up' | 'down';
  showTrigger?: boolean;
  align?: 'start' | 'end';
  triggerVariant?: 'statusBar' | 'navbar';
  triggerSize?: number;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  dropDirection = 'up',
  showTrigger = true,
  align = 'start',
  triggerVariant = 'statusBar',
  triggerSize = 24,
}) => {
  const settings = useSettings();
  const {
    language, darkMode, setDarkMode, setTheme, availableThemes, theme: currentTheme,
    fontFamilyEN, setFontFamilyEN, fontFamilyAR, setFontFamilyAR,
    textTransform, setTextTransform, hideInactiveModules, setHideInactiveModules,
    navStyle, setNavStyle, developerMode, setDeveloperMode,
    showTicker, setShowTicker,
    showTickerSales, setShowTickerSales, showTickerInventory, setShowTickerInventory,
    showTickerCustomers, setShowTickerCustomers, showTickerTopSeller, setShowTickerTopSeller,
    borderRadius, setBorderRadius, sidebarStyle, setSidebarStyle,
    graphicStyle, setGraphicStyle, graphicFontVariant, setGraphicFontVariant,
    cardBorderLight, setCardBorderLight, enableCustomCardCss, setEnableCustomCardCss,
    customCardCss, setCustomCardCss, numeralSystem, setNumeralSystem,
    switchVariant, setSwitchVariant, badgeStyle, setBadgeStyle,
    modalPresentationMode, setModalPresentationMode,
    sidebarModalWidth, setSidebarModalWidth,
  } = settings;

  const { activeBranchId, updateBranch, activeBranch } = useData();
  const deliveryFee = activeBranch?.deliveryFee ?? 5;

  const [isOpen, setIsOpen] = useState(false);
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAR = language === 'AR';
  const t = TRANSLATIONS[language].settings;



  // Mobile Detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const closeAllSubmenus = useCallback(() => {
    setExpandedSubmenu(null);
  }, []);

  useEffect(() => { if (!isOpen) closeAllSubmenus(); }, [isOpen, closeAllSubmenus]);

  // Auto-close submenus when master switch is turned off
  useEffect(() => {
    if (!showTicker && expandedSubmenu === 'status') setExpandedSubmenu(null);
  }, [showTicker, expandedSubmenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSubmenu = (name: string) => {
    setExpandedSubmenu(prev => prev === name ? null : name);
  };

  const menuContainerClasses = useMemo(() => `
    absolute ${dropDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} 
    ${align === 'start' ? 'inset-s-0 origin-top-start' : 'inset-e-0 origin-top-end'}
    w-64 rounded-xl shadow-2xl border border-(--border-divider) z-110 animate-fade-in
    bg-(--bg-menu)
  `, [dropDirection, align]);

  return (
    <div className={`relative ${showTrigger && triggerVariant === 'statusBar' ? 'h-full flex items-center' : ''}`} ref={dropdownRef}>
      {showTrigger && (
        triggerVariant === 'statusBar' ? (
          <StatusBarItem icon="settings" tooltip={t.settings} variant={isOpen ? 'info' : 'default'} onClick={() => setIsOpen(!isOpen)} />
        ) : (
          <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-center w-10 h-10 ${isOpen ? 'text-primary-500' : 'text-(--text-secondary)'}`}>
            <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-settings)' }}>settings</span>
          </button>
        )
      )}

      {isOpen && (
        <div className={menuContainerClasses}>
          <div className="px-3 py-2 border-b border-(--border-divider) text-center">
            <span className="text-xs font-bold text-(--text-primary)">{t.settings}</span>
          </div>

            <div className="p-2 space-y-1.5" style={{ direction: isAR ? 'rtl' : 'ltr' }}>
              {/* --- Appearance Section --- */}
              <div className="space-y-1 relative">
                <SettingsRow icon="brightness_6" label={t.themesMenu}>
                  <button type="button" onClick={() => toggleSubmenu('themes')}>
                    <span 
                      className={`material-symbols-rounded transition-transform text-(--text-tertiary) ${expandedSubmenu === 'themes' ? 'rotate-180' : ''}`}
                      style={{ fontSize: 'var(--icon-settings)' }}
                    >
                      chevron_left
                    </span>
                  </button>
                </SettingsRow>

                <SubmenuWrapper isOpen={expandedSubmenu === 'themes'} isMobile={isMobile}>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-rounded text-(--text-secondary)" style={{ fontSize: 'var(--icon-settings)' }}>palette</span>
                    <SegmentedControl
                      value={currentTheme.name}
                      onChange={(val) => setTheme(availableThemes.find(th => th.name === val)!)}
                       size="xs" fullWidth shape="pill"
                      options={availableThemes.map(th => ({ label: '', value: th.name, dotColor: th.hex }))}
                    />
                  </div>
                  <SettingsRow icon="brightness_6" label={t.darkMode}>
                    <SegmentedControl value={darkMode} onChange={v => setDarkMode(v as boolean)}  size="xs"  shape="pill" iconSize="--icon-settings" options={[{ label: '', value: false, icon: 'light_mode' }, { label: '', value: true, icon: 'dark_mode' }]} />
                  </SettingsRow>
                  <SettingsRow icon="ad_units" label={t.badgeStyle}>
                    <SegmentedControl
                      value={badgeStyle || 'default'}
                      onChange={v => setBadgeStyle?.(v as any)}
                      size="xs"
                      shape="pill"
                      options={[
                        { label: t.badgeStyleDefault, value: 'default' },
                        { label: t.badgeStylePill, value: 'pill' },
                        { label: t.badgeStyleSlim, value: 'slim' },
                      ]}
                    />
                  </SettingsRow>
                  {developerMode && (
                    <>
                      <SettingsRow icon="rounded_corner" label={t.borderRadius}>
                        <SegmentedControl value={borderRadius || 'default'} onChange={v => setBorderRadius?.(v as any)}  size="xs" shape="pill" options={[{ label: t.radiusSharp, value: 'sharp' }, { label: t.radiusFull, value: 'full' }, { label: t.radiusDefault, value: 'default' }]} />
                      </SettingsRow>
                      
                      <div className="flex items-center gap-1.5 py-1">
                        <span className="material-symbols-rounded text-(--text-secondary)" style={{ fontSize: 'var(--icon-settings)' }}>toggle_on</span>
                        <div className="flex-1 overflow-x-auto scrollbar-none pb-0.5">
                          <SegmentedControl 
                            value={switchVariant || 'default'} 
                            onChange={v => setSwitchVariant?.(v as any)} 
                            size="xs" 
                            shape="pill" 
                            iconSize="--icon-settings"
                            options={[
                              { label: '', value: 'default', icon: 'done' },
                              { label: '', value: 'ios', icon: 'toggle_on' },
                              { label: '', value: 'minimal', icon: 'check_box_outline_blank' },
                              { label: '', value: 'slim', icon: 'horizontal_rule' },
                            ]} 
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {!darkMode && developerMode && (
                    <>
                      <SettingsRow icon="border_style" label={t.borderStyle || t.cardStyle}>
                        <SegmentedControl
                          value={cardBorderLight || 'default'}
                          onChange={v => setCardBorderLight?.(v as any)} 
                          size="xs" 
                          shape="pill" 
                          options={[
                            { label: t.cardThick, value: 'default' },
                            { label: t.cardThin, value: 'thin' },
                            { label: t.cardNone, value: 'none' },
                          ]} 
                        />
                      </SettingsRow>
                      <SettingsRow icon="code" label={t.customCardCss}>
                        <div className="flex flex-col gap-1.5 py-1 w-full">
                          <div className="flex items-center justify-end">
                            <Switch checked={enableCustomCardCss} onChange={setEnableCustomCardCss} theme={currentTheme.name.toLowerCase()} activeColor={currentTheme.hex} />
                          </div>
                          <textarea
                            value={customCardCss || ''}
                            onChange={(e) => setCustomCardCss?.(e.target.value)}
                            placeholder="box-shadow: 0px 4px 6px rgba(0,0,0,0.1);"
                            className="w-full text-xs p-2 rounded-lg bg-(--bg-input) border border-(--border-divider) text-(--text-primary) outline-hidden font-mono min-h-[60px] resize-y scrollbar-none"
                            spellCheck={false}
                            dir="ltr"
                          />
                        </div>
                      </SettingsRow>
                    </>
                  )}
                </SubmenuWrapper>
              </div>



              <div className="border-t border-(--border-divider) my-0.5 opacity-50" />

              {/* --- Navigation & Language --- */}
              {navStyle === 1 && (
                <SettingsRow icon="view_sidebar" label={t.sidebarStyle}>
                  <SegmentedControl value={sidebarStyle} onChange={v => setSidebarStyle(v as any)}  size="xs"  shape="pill" iconSize="--icon-settings" options={[{ label: '', value: 1, icon: 'view_sidebar' }, { label: '', value: 2, icon: 'dock_to_left' }, { label: '', value: 3, icon: 'mouse' }]} />
                </SettingsRow>
              )}
              <SettingsRow icon="dashboard_customize" label={t.designStyle}>
                <SegmentedControl value={navStyle || 1} onChange={v => setNavStyle(v as any)}  size="xs"  shape="pill" iconSize="--icon-settings" options={[{ label: '', value: 1, icon: 'view_sidebar' }, { label: '', value: 2, icon: 'web_asset' }]} />
              </SettingsRow>
              <SettingsRow icon="translate" label={t.language}>
                <SegmentedControl value={language} onChange={v => settings.setLanguage(v as any)}  size="xs" shape="pill" options={[{ label: 'EN', value: 'EN' }, { label: 'AR', value: 'AR' }]} />
              </SettingsRow>
              <div className="space-y-1 relative">
                <SettingsRow icon="dock_to_left" label={t.modalSettings}>
                  <button type="button" onClick={() => toggleSubmenu('modalSettings')}>
                    <span 
                      className={`material-symbols-rounded transition-transform text-(--text-tertiary) ${expandedSubmenu === 'modalSettings' ? 'rotate-180' : ''}`}
                      style={{ fontSize: 'var(--icon-settings)' }}
                    >
                      chevron_left
                    </span>
                  </button>
                </SettingsRow>
                <SubmenuWrapper 
                  isOpen={expandedSubmenu === 'modalSettings'} 
                  isMobile={isMobile} 
                  title={t.modalSettings}
                >
                  <SettingsRow icon="dock_to_left" label={t.modalPresentationStyle}>
                    <SegmentedControl
                      value={modalPresentationMode || 'modal'}
                      onChange={v => setModalPresentationMode?.(v as any)}
                      size="xs"
                      shape="pill"
                      options={[
                        { label: t.modalPresentationModeModal, value: 'modal' },
                        { label: t.modalPresentationModeSidebar, value: 'sidebar' },
                      ]}
                    />
                  </SettingsRow>
                  {modalPresentationMode === 'sidebar' && (
                    <SettingsRow icon="straighten" label={t.sidebarModalWidth}>
                      <SegmentedControl
                        value={sidebarModalWidth || 'md'}
                        onChange={v => setSidebarModalWidth?.(v as any)}
                        size="xs"
                        shape="pill"
                        options={[
                          { label: t.sidebarModalWidthNarrow, value: 'sm' },
                          { label: t.sidebarModalWidthStandard, value: 'md' },
                          { label: t.sidebarModalWidthWide, value: 'lg' },
                          { label: t.sidebarModalWidthExtraWide, value: 'xl' },
                        ]}
                      />
                    </SettingsRow>
                  )}
                </SubmenuWrapper>
              </div>
              <SettingsRow icon="text_fields" label={t.textTransform}>
                <Switch
                  checked={textTransform === 'uppercase'}
                  onChange={() => setTextTransform(textTransform === 'normal' ? 'uppercase' : 'normal')}
                  theme={currentTheme.name.toLowerCase()}
                  activeColor={currentTheme.hex}
                />
              </SettingsRow>

              <div className="border-t border-(--border-divider) my-0.5 opacity-50" />

              {/* --- Typography Section --- */}
              <div className="space-y-1 relative">
                <SettingsRow icon="font_download" label={t.typography}>
                  <button type="button" onClick={() => toggleSubmenu('typography')}>
                    <span 
                      className={`material-symbols-rounded transition-transform text-(--text-tertiary) ${expandedSubmenu === 'typography' ? 'rotate-180' : ''}`}
                      style={{ fontSize: 'var(--icon-settings)' }}
                    >
                      chevron_left
                    </span>
                  </button>
                </SettingsRow>
                <SubmenuWrapper isOpen={expandedSubmenu === 'typography'} isMobile={isMobile}>
                  <div className="space-y-1">
                    <label className="text-xs font-medium flex items-center gap-1.5 text-(--text-primary)"><span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-settings)' }}>text_fields</span>{t.fontEN}</label>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {AVAILABLE_FONTS_EN.map(f => (
                        <button 
                          key={f.value} 
                          onClick={() => setFontFamilyEN(f.value)} 
                          className={`px-2.5 py-1.5 rounded-lg border text-xs transition-all whitespace-nowrap flex-shrink-0 ${fontFamilyEN === f.value ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-(--border-divider) text-(--text-primary)'}`} 
                          style={{ fontFamily: f.value }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium flex items-center gap-1.5 text-(--text-primary)"><span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-settings)' }}>translate</span>{t.fontAR}</label>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {AVAILABLE_FONTS_AR.map(f => (
                        <button 
                          key={f.value} 
                          onClick={() => setFontFamilyAR(f.value)} 
                          className={`px-2.5 py-1.5 rounded-lg border text-xs transition-all whitespace-nowrap flex-shrink-0 ${fontFamilyAR === f.value ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-(--border-divider) text-(--text-primary)'}`} 
                          style={{ fontFamily: f.value }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {isAR && (
                    <SettingsRow icon="123" label={t.numeralSystem}>
                      <SegmentedControl
                        value={numeralSystem}
                        onChange={v => setNumeralSystem(v as any)}
                        size="xs"
                        shape="pill"
                        options={[
                          { label: t.numeralArabic, value: 'AR' },
                          { label: t.numeralLatin, value: 'EN' }
                        ]}
                      />
                    </SettingsRow>
                  )}
                  {isAR && (
                    <SettingsRow icon="style" label={t.graphicStyle}>
                      <SegmentedControl
                        value={!graphicStyle ? 'off' : graphicFontVariant}
                        onChange={(val) => {
                          if (val === 'off') {
                            setGraphicStyle(false);
                          } else {
                            setGraphicStyle(true);
                            setGraphicFontVariant(val as 'serif' | 'sans');
                          }
                        }}
                         size="xs" fullWidth shape="pill"
                        options={[
                          { label: 'إيقاف', value: 'off' },
                          { label: 'جرافيكي', value: 'serif', fontFamily: '"HeadingFont"' },
                          { label: 'مودرن', value: 'sans', fontFamily: '"GraphicSansFont"' },
                        ]}
                      />
                    </SettingsRow>
                  )}
                </SubmenuWrapper>
              </div>

              <div className="border-t border-(--border-divider) my-0.5 opacity-50" />

              {/* --- Workspace & Status Bar --- */}
              <SettingsRow icon="filter_center_focus" label={t.focusMode}><Switch checked={hideInactiveModules || false} onChange={setHideInactiveModules} theme={currentTheme.name.toLowerCase()} activeColor={currentTheme.hex} /></SettingsRow>
              {permissionsService.isOrgAdmin() && (
                <SettingsRow icon="science" label={t.developerMode}><Switch checked={developerMode || false} onChange={setDeveloperMode} theme={currentTheme.name.toLowerCase()} activeColor={currentTheme.hex} /></SettingsRow>
              )}

              {/* --- POS Settings --- */}
              {/* --- POS Settings --- */}
              <div className="pt-2 mt-2 border-t border-(--border-divider) space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-(--text-tertiary)">{t.posSettings}</label>
                <SettingsRow icon="moped" label={t.defaultDeliveryFee}>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={deliveryFee}
                      onChange={(e) => updateBranch?.(activeBranchId, { deliveryFee: Number(e.target.value) })}
                      className="w-16 h-7 bg-black/5 dark:bg-white/5 border-none rounded-md px-2 text-xs font-bold focus:ring-1 focus:ring-primary-500/50 text-center"
                    />
                    <span className="text-[10px] font-bold text-(--text-tertiary)">{t.egp}</span>
                  </div>
                </SettingsRow>
              </div>

              {showTicker !== undefined && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-(--text-tertiary)">{t.statusBarSettings}</label>
                  <div className="relative">
                    <SettingsRow icon="speed" label={t.quickStatuses}>
                      <Switch checked={showTicker || false} onChange={setShowTicker} theme={currentTheme.name.toLowerCase()} activeColor={currentTheme.hex} />
                      <button type="button" onClick={() => toggleSubmenu('status')}>
                        <span 
                          className={`material-symbols-rounded transition-transform text-(--text-tertiary) ${expandedSubmenu === 'status' ? 'rotate-180' : ''}`}
                          style={{ fontSize: 'var(--icon-settings)' }}
                        >
                          chevron_left
                        </span>
                      </button>
                    </SettingsRow>
                    <SubmenuWrapper isOpen={expandedSubmenu === 'status' && showTicker} isMobile={isMobile}>
                      <SettingsRow icon="trending_up" label={t.showSales} className="hover:bg-(--bg-menu-hover) px-2 rounded-lg"><Switch checked={showTickerSales} onChange={setShowTickerSales} theme={currentTheme.name.toLowerCase()} activeColor={currentTheme.hex} /></SettingsRow>
                      <SettingsRow icon="inventory_2" label={t.showInventory} className="hover:bg-(--bg-menu-hover) px-2 rounded-lg"><Switch checked={showTickerInventory} onChange={setShowTickerInventory} theme={currentTheme.name.toLowerCase()} activeColor={currentTheme.hex} /></SettingsRow>
                      <SettingsRow icon="group" label={t.showCustomers} className="hover:bg-(--bg-menu-hover) px-2 rounded-lg"><Switch checked={showTickerCustomers} onChange={setShowTickerCustomers} theme={currentTheme.name.toLowerCase()} activeColor={currentTheme.hex} /></SettingsRow>
                      <SettingsRow icon="star" label={t.showTopSeller} className="hover:bg-(--bg-menu-hover) px-2 rounded-lg"><Switch checked={showTickerTopSeller} onChange={setShowTickerTopSeller} theme={currentTheme.name.toLowerCase()} activeColor={currentTheme.hex} /></SettingsRow>
                    </SubmenuWrapper>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export default SettingsMenu;
