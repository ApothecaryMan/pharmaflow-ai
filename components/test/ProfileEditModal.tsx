import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { BANNER_STYLES, renderBanner } from '../../utils/banners';
import { PROFILE_GLASS_CARD_BASE } from '../../utils/themeStyles';
import { BUTTON_CLOSE_BASE, Modal } from '../common/Modal';
import { LOCAL_TRANSLATIONS, type ProfileData } from './ModalTests';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'EN' | 'AR';
  profileData: ProfileData;
  bannerStyle: string;
  bannerOffset: { x: number; y: number };
  bannerZoom: number;
  userStatus: 'online' | 'idle' | 'dnd' | 'offline';
  customBio: string;
  customAccentColor: string | null;
  onSave: (data: {
    profileData: ProfileData;
    bannerStyle: string;
    bannerOffset: { x: number; y: number };
    bannerZoom: number;
    userStatus: 'online' | 'idle' | 'dnd' | 'offline';
    customBio: string;
    customAccentColor: string | null;
  }) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  language,
  profileData,
  bannerStyle,
  bannerOffset,
  bannerZoom,
  userStatus,
  customBio,
  customAccentColor,
  onSave,
}) => {
  // Form and appearance states
  const [editForm, setEditForm] = useState<ProfileData>({ ...profileData });
  const [editBannerStyle, setEditBannerStyle] = useState<string>(bannerStyle);
  const [editBannerOffset, setEditBannerOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [editBannerZoom, setEditBannerZoom] = useState<number>(1.2);
  const [isEditingPosition, setIsEditingPosition] = useState<boolean>(false);
  const [editUserStatus, setEditUserStatus] = useState(userStatus);
  const [editCustomBio, setEditCustomBio] = useState(customBio);
  const [editTab, setEditTab] = useState('appearance');
  const [editCustomAccentColor, setEditCustomAccentColor] = useState<string | null>(
    customAccentColor
  );

  const colorInputRef = useRef<HTMLInputElement>(null);
  const bannerEditorRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const startOffsetRef = useRef({ x: 0, y: 0 });

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditForm({ ...profileData });
      setEditBannerStyle(bannerStyle);
      setEditBannerOffset(bannerOffset);
      setEditBannerZoom(bannerZoom);
      setIsEditingPosition(false);
      setEditUserStatus(userStatus);
      setEditCustomBio(customBio);
      setEditTab('appearance');
      setEditCustomAccentColor(customAccentColor);
    }
  }, [
    isOpen,
    profileData,
    bannerStyle,
    bannerOffset,
    bannerZoom,
    userStatus,
    customBio,
    customAccentColor,
  ]);

  // Drag and pan logic
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !bannerEditorRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      const childDx = dx / editBannerZoom;
      const childDy = dy / editBannerZoom;

      let targetX = startOffsetRef.current.x + childDx;
      let targetY = startOffsetRef.current.y + childDy;

      const rect = bannerEditorRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const maxOffsetX = Math.max(0, (width * (editBannerZoom - 1)) / (2 * editBannerZoom));
      const maxOffsetY = Math.max(0, (height * (editBannerZoom - 1)) / (2 * editBannerZoom));

      targetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, targetX));
      targetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, targetY));

      setEditBannerOffset({ x: targetX, y: targetY });
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !bannerEditorRef.current || e.touches.length === 0) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;

      const childDx = dx / editBannerZoom;
      const childDy = dy / editBannerZoom;

      let targetX = startOffsetRef.current.x + childDx;
      let targetY = startOffsetRef.current.y + childDy;

      const rect = bannerEditorRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const maxOffsetX = Math.max(0, (width * (editBannerZoom - 1)) / (2 * editBannerZoom));
      const maxOffsetY = Math.max(0, (height * (editBannerZoom - 1)) / (2 * editBannerZoom));

      targetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, targetX));
      targetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, targetY));

      setEditBannerOffset({ x: targetX, y: targetY });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [editBannerZoom]);

  // Handle bounds adjust on zoom change
  useEffect(() => {
    if (!bannerEditorRef.current) return;
    const rect = bannerEditorRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const maxOffsetX = Math.max(0, (width * (editBannerZoom - 1)) / (2 * editBannerZoom));
    const maxOffsetY = Math.max(0, (height * (editBannerZoom - 1)) / (2 * editBannerZoom));

    setEditBannerOffset((prev) => ({
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, prev.x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, prev.y)),
    }));
  }, [editBannerZoom]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!bannerEditorRef.current) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    startOffsetRef.current = { ...editBannerOffset };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!bannerEditorRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    isDraggingRef.current = true;
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    startOffsetRef.current = { ...editBannerOffset };
  };

  const handleEyeDropperClick = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          setEditCustomAccentColor(result.sRGBHex);
        }
      } catch (e) {
        console.error('EyeDropper failed, falling back to color input', e);
        colorInputRef.current?.click();
      }
    } else {
      colorInputRef.current?.click();
    }
  };

  const activeBanner = BANNER_STYLES.find((b) => b.id === editBannerStyle);
  const bannerAccent = editCustomAccentColor || activeBanner?.accentColor;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='lg'
      title={LOCAL_TRANSLATIONS[language].editProfile}
      subtitle={LOCAL_TRANSLATIONS[language].updatePersonalInfo}
      icon='edit'
      style={
        {
          '--bg-card': bannerAccent
            ? `color-mix(in srgb, ${bannerAccent} 12%, var(--bg-card-base))`
            : undefined,
          border: bannerAccent ? '4px solid transparent' : undefined,
          backgroundImage: bannerAccent
            ? `linear-gradient(var(--bg-card), var(--bg-card)), linear-gradient(135deg, ${bannerAccent}, var(--modal-border-gradient-end))`
            : undefined,
          backgroundOrigin: bannerAccent ? 'border-box' : undefined,
          backgroundClip: bannerAccent ? 'content-box, border-box' : undefined,
          boxShadow: 'none',
          '--primary-500': bannerAccent || undefined,
          '--primary-600': bannerAccent
            ? `color-mix(in srgb, ${bannerAccent} 85%, black)`
            : undefined,
          '--primary-400': bannerAccent
            ? `color-mix(in srgb, ${bannerAccent} 85%, white)`
            : undefined,
          '--primary-300': bannerAccent
            ? `color-mix(in srgb, ${bannerAccent} 60%, white)`
            : undefined,
        } as React.CSSProperties
      }
      closeOnBackdropClick={true}
      bodyClassName='p-0 bg-(--bg-card)'
    >
      <div className='animate-fade-in flex flex-col h-full justify-between min-h-[450px]'>
        <div>
          {/* Edit Modal Tabs */}
          <div className='flex border-b border-(--border-divider) mb-5 px-6 overflow-x-auto scrollbar-none'>
            {[
              {
                id: 'appearance',
                label: LOCAL_TRANSLATIONS[language].appearanceStatus,
                icon: 'palette',
              },
              { id: 'personal', label: LOCAL_TRANSLATIONS[language].personalInfo, icon: 'person' },
              {
                id: 'contact',
                label: LOCAL_TRANSLATIONS[language].contactJobDetails,
                icon: 'badge',
              },
              {
                id: 'documents',
                label: LOCAL_TRANSLATIONS[language].officialDocuments,
                icon: 'description',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type='button'
                onClick={() => setEditTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                  editTab === tab.id
                    ? 'border-primary-500 text-primary-500 font-bold'
                    : 'border-transparent text-(--text-secondary) hover:text-(--text-primary) hover:border-(--border-divider)'
                }`}
              >
                <span className='material-symbols-rounded text-[18px]'>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Appearance & Status */}
          {editTab === 'appearance' && (
            <div className='space-y-5 px-6 pb-6 animate-fade-in'>
              {/* Banner Position Adjustment Preview / Editor */}
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].bannerPreview}
                  </label>
                  <div className='flex items-center gap-1.5'>
                    <input
                      ref={colorInputRef}
                      type='color'
                      className='hidden'
                      value={editCustomAccentColor || activeBanner?.accentColor || '#3b82f6'}
                      onChange={(e) => setEditCustomAccentColor(e.target.value)}
                    />
                    <button
                      type='button'
                      onClick={handleEyeDropperClick}
                      className='px-2.5 py-1 rounded-lg border border-(--border-divider) bg-(--bg-secondary) hover:bg-(--bg-hover) text-xs font-semibold text-(--text-primary) flex items-center gap-1.5 transition-all shadow-xs'
                    >
                      <span className='material-symbols-rounded text-[16px] text-primary-500'>
                        colorize
                      </span>
                      <span>{LOCAL_TRANSLATIONS[language].eyedropper}</span>
                      {editCustomAccentColor && (
                        <span
                          className='w-3 h-3 rounded-full border border-white/20 shadow-xs'
                          style={{ backgroundColor: editCustomAccentColor }}
                        />
                      )}
                    </button>
                    {editCustomAccentColor && (
                      <button
                        type='button'
                        onClick={() => setEditCustomAccentColor(null)}
                        className='p-1 rounded-lg border border-(--border-divider) bg-(--bg-secondary) hover:bg-(--bg-hover) text-xs font-semibold text-(--text-secondary) hover:text-red-500 transition-colors'
                        title={language === 'AR' ? 'إلغاء اللون المخصص' : 'Clear custom color'}
                      >
                        <span className='material-symbols-rounded text-[14px]'>close</span>
                      </button>
                    )}
                  </div>
                </div>
                {!isEditingPosition ? (
                  <div className='group relative w-full h-24 rounded-xl overflow-hidden bg-(--bg-secondary) border border-(--border-divider) shadow-inner'>
                    {renderBanner(editBannerStyle, editBannerOffset, editBannerZoom)}

                    {/* Hover Overlay with Edit Position Button */}
                    <div className='absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]'>
                      <button
                        type='button'
                        onClick={() => setIsEditingPosition(true)}
                        className='flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 hover:bg-white text-gray-900 font-bold text-xs'
                      >
                        <span className='material-symbols-rounded text-[16px]'>pan_tool</span>
                        {LOCAL_TRANSLATIONS[language].adjustBanner}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className='space-y-3 p-4 rounded-xl border border-(--border-divider) bg-(--bg-secondary)/20 animate-fade-in'>
                    <div
                      ref={bannerEditorRef}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                      className='relative w-full h-44 rounded-xl overflow-hidden bg-(--bg-secondary) border border-(--border-divider) cursor-move select-none shadow-inner'
                    >
                      {renderBanner(editBannerStyle, editBannerOffset, editBannerZoom)}

                      {/* Instructional Overlay */}
                      <div className='absolute inset-x-0 bottom-0 py-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center gap-1.5 text-[11px] text-white/90 font-medium pointer-events-none'>
                        <span className='material-symbols-rounded text-[15px] animate-pulse'>
                          drag_pan
                        </span>
                        {LOCAL_TRANSLATIONS[language].dragToPan}
                      </div>
                    </div>

                    {/* Zoom & Actions Control Bar */}
                    <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1'>
                      {/* Zoom Slider */}
                      <div className='flex-1 flex items-center gap-3 bg-(--bg-secondary)/40 px-3 py-1.5 rounded-xl border border-(--border-divider)/60'>
                        <span className='material-symbols-rounded text-(--text-tertiary) text-[18px]'>
                          zoom_in
                        </span>
                        <span className='text-xs font-semibold text-(--text-secondary) min-w-[32px]'>
                          {editBannerZoom.toFixed(1)}x
                        </span>
                        <input
                          type='range'
                          min='1.0'
                          max='2.5'
                          step='0.1'
                          value={editBannerZoom}
                          onChange={(e) => setEditBannerZoom(parseFloat(e.target.value))}
                          className='flex-1 h-1 bg-(--border-divider) rounded-lg appearance-none cursor-pointer accent-primary-500'
                        />
                      </div>

                      {/* Reset & Done Buttons */}
                      <div className='flex items-center gap-2'>
                        <button
                          type='button'
                          onClick={() => {
                            setEditBannerOffset({ x: 0, y: 0 });
                            setEditBannerZoom(1.2);
                            setEditCustomAccentColor(null);
                          }}
                          className='px-3.5 py-2 rounded-xl border border-(--border-divider) bg-(--bg-secondary) text-xs font-semibold text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--text-primary)'
                        >
                          {LOCAL_TRANSLATIONS[language].resetPosition}
                        </button>
                        <button
                          type='button'
                          onClick={() => setIsEditingPosition(false)}
                          className='px-4 py-2 rounded-xl bg-primary-500 text-white text-xs font-bold hover:bg-primary-600'
                        >
                          {LOCAL_TRANSLATIONS[language].done}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Graphics Banner Selector */}
              <div className='space-y-2'>
                <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                  {LOCAL_TRANSLATIONS[language].graphicsBanner}
                </label>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                  {BANNER_STYLES.map((ban) => (
                    <button
                      key={ban.id}
                      type='button'
                      onClick={() => {
                        setEditBannerStyle(ban.id);
                        setEditCustomAccentColor(null);
                      }}
                      className={`h-12 rounded-xl overflow-hidden relative border ${
                        editBannerStyle === ban.id
                          ? 'ring-2 ring-primary-500 border-transparent scale-102 shadow-md'
                          : 'border-(--border-divider) hover:scale-102 hover:shadow-xs'
                      }`}
                    >
                      {/* Live mini-preview inside the button */}
                      {ban.render()}
                      {/* Title overlay */}
                      <div className='absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition-colors text-[11px] font-bold text-white shadow-inner'>
                        {language === 'AR' ? ban.nameAR : ban.nameEN}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Selector */}
              <div className='space-y-2'>
                <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                  {LOCAL_TRANSLATIONS[language].onlineStatus}
                </label>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                  {[
                    {
                      id: 'online',
                      color: 'bg-emerald-500',
                      name: LOCAL_TRANSLATIONS[language].statusOnline,
                    },
                    {
                      id: 'idle',
                      color: 'bg-amber-500',
                      name: LOCAL_TRANSLATIONS[language].statusIdle,
                    },
                    {
                      id: 'dnd',
                      color: 'bg-rose-500',
                      name: LOCAL_TRANSLATIONS[language].statusDnd,
                    },
                    {
                      id: 'offline',
                      color: 'bg-gray-400',
                      name: LOCAL_TRANSLATIONS[language].statusOffline,
                    },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type='button'
                      onClick={() => setEditUserStatus(st.id as any)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold ${
                        editUserStatus === st.id
                          ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/10 text-primary-600 dark:text-primary-400 font-bold'
                          : 'border-(--border-divider) hover:bg-(--bg-hover) text-(--text-secondary)'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                      <span>{st.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Status/Bio Input */}
              <div className='space-y-2'>
                <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                  {LOCAL_TRANSLATIONS[language].editStatusBio}
                </label>
                <div className='relative flex items-center'>
                  <span className='material-symbols-rounded text-(--text-tertiary) absolute start-3 text-[18px]'>
                    info
                  </span>
                  <input
                    type='text'
                    value={editCustomBio}
                    onChange={(e) => setEditCustomBio(e.target.value)}
                    placeholder={LOCAL_TRANSLATIONS[language].writeAboutYourself}
                    className='w-full ps-10 pe-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) placeholder-(--text-tertiary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Personal Info */}
          {editTab === 'personal' && (
            <div className='space-y-4 px-6 pb-6 animate-fade-in'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Name English */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].nameEnglish}
                  </label>
                  <input
                    type='text'
                    value={editForm.nameEN}
                    onChange={(e) => setEditForm({ ...editForm, nameEN: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>

                {/* Name Arabic */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].nameArabic}
                  </label>
                  <input
                    type='text'
                    value={editForm.nameAR}
                    onChange={(e) => setEditForm({ ...editForm, nameAR: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>

                {/* Role English */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].roleEnglish}
                  </label>
                  <input
                    type='text'
                    value={editForm.roleEN}
                    onChange={(e) => setEditForm({ ...editForm, roleEN: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>

                {/* Role Arabic */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].roleArabic}
                  </label>
                  <input
                    type='text'
                    value={editForm.roleAR}
                    onChange={(e) => setEditForm({ ...editForm, roleAR: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Contact & Job Details */}
          {editTab === 'contact' && (
            <div className='space-y-4 px-6 pb-6 animate-fade-in overflow-y-auto max-h-[320px]'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Email */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].email}
                  </label>
                  <input
                    type='email'
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>

                {/* Phone */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].phone}
                  </label>
                  <input
                    type='text'
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>

                {/* Address English */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].addressEnglish}
                  </label>
                  <input
                    type='text'
                    value={editForm.addressEN}
                    onChange={(e) => setEditForm({ ...editForm, addressEN: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>

                {/* Address Arabic */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].addressArabic}
                  </label>
                  <input
                    type='text'
                    value={editForm.addressAR}
                    onChange={(e) => setEditForm({ ...editForm, addressAR: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>

                {/* Shift English */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].shiftEnglish}
                  </label>
                  <input
                    type='text'
                    value={editForm.shiftEN}
                    onChange={(e) => setEditForm({ ...editForm, shiftEN: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>

                {/* Shift Arabic */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].shiftArabic}
                  </label>
                  <input
                    type='text'
                    value={editForm.shiftAR}
                    onChange={(e) => setEditForm({ ...editForm, shiftAR: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>

                {/* Employee ID */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].employeeId}
                  </label>
                  <input
                    type='text'
                    value={editForm.employeeId}
                    onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>

                {/* License Code */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].license}
                  </label>
                  <input
                    type='text'
                    value={editForm.license}
                    onChange={(e) => setEditForm({ ...editForm, license: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>

                {/* Joined Date */}
                <div className='space-y-2'>
                  <label className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].joined}
                  </label>
                  <input
                    type='text'
                    value={editForm.joined}
                    onChange={(e) => setEditForm({ ...editForm, joined: e.target.value })}
                    className='w-full px-4 py-2.5 rounded-xl border border-(--border-divider) bg-(--bg-input) text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all'
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Documents Upload */}
          {editTab === 'documents' && (
            <div className='space-y-5 px-6 pb-6 animate-fade-in'>
              {/* National ID Upload Section */}
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-(--text-tertiary) uppercase px-1 flex items-center gap-2'>
                  <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>
                    badge
                  </span>
                  {LOCAL_TRANSLATIONS[language].nationalIdCard}
                </label>
                <div className='bg-(--bg-secondary)/10 pt-2.5 pb-4 px-4 rounded-xl border border-(--border-divider) grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {/* Front Face */}
                  <div className='space-y-1.5'>
                    <span className='text-[10px] font-semibold text-(--text-tertiary) uppercase px-1'>
                      {LOCAL_TRANSLATIONS[language].frontFace}
                    </span>
                    {editForm.nationalIdCard ? (
                      <div className='relative group w-full aspect-[8/5] bg-(--bg-secondary)/30 border border-(--border-divider) rounded-xl shadow-md'>
                        <img
                          src={editForm.nationalIdCard}
                          alt='National ID Front'
                          className='w-full h-full object-cover rounded-xl'
                        />
                        <button
                          type='button'
                          onClick={() => setEditForm({ ...editForm, nationalIdCard: undefined })}
                          className={`absolute -top-2.5 ${
                            language === 'AR' ? '-left-2.5' : '-right-2.5'
                          } w-6 h-6 bg-gray-100 dark:bg-gray-800 ${BUTTON_CLOSE_BASE} rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 flex items-center justify-center`}
                        >
                          <span
                            className='material-symbols-rounded'
                            style={{
                              fontSize: 'var(--icon-md)',
                              fontVariationSettings: "'wght' 700",
                            }}
                          >
                            close
                          </span>
                        </button>
                      </div>
                    ) : (
                      <label className='flex flex-col items-center justify-center gap-2 p-4 w-full aspect-[8/5] border-2 border-dashed border-(--border-divider) rounded-xl hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer bg-(--bg-input)/50'>
                        <span
                          className='material-symbols-rounded text-gray-400'
                          style={{ fontSize: 'var(--icon-lg)' }}
                        >
                          upload
                        </span>
                        <span className='text-xs text-gray-600 dark:text-gray-300 font-medium'>
                          {LOCAL_TRANSLATIONS[language].uploadFront}
                        </span>
                        <input
                          type='file'
                          accept='image/*'
                          className='hidden'
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 500 * 1024) {
                                alert(LOCAL_TRANSLATIONS[language].fileTooLarge);
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditForm({
                                  ...editForm,
                                  nationalIdCard: reader.result as string,
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Back Face */}
                  <div className='space-y-1.5'>
                    <span className='text-[10px] font-semibold text-(--text-tertiary) uppercase px-1'>
                      {LOCAL_TRANSLATIONS[language].backFace}
                    </span>
                    {editForm.nationalIdCardBack ? (
                      <div className='relative group w-full aspect-[8/5] bg-(--bg-secondary)/30 border border-(--border-divider) rounded-xl shadow-md'>
                        <img
                          src={editForm.nationalIdCardBack}
                          alt='National ID Back'
                          className='w-full h-full object-cover rounded-xl'
                        />
                        <button
                          type='button'
                          onClick={() =>
                            setEditForm({ ...editForm, nationalIdCardBack: undefined })
                          }
                          className={`absolute -top-2.5 ${
                            language === 'AR' ? '-left-2.5' : '-right-2.5'
                          } w-6 h-6 bg-gray-100 dark:bg-gray-800 ${BUTTON_CLOSE_BASE} rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 flex items-center justify-center `}
                        >
                          <span
                            className='material-symbols-rounded'
                            style={{
                              fontSize: 'var(--icon-md)',
                              fontVariationSettings: "'wght' 700",
                            }}
                          >
                            close
                          </span>
                        </button>
                      </div>
                    ) : (
                      <label className='flex flex-col items-center justify-center gap-2 p-4 w-full aspect-[8/5] border-2 border-dashed border-(--border-divider) rounded-xl hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer bg-(--bg-input)/50'>
                        <span
                          className='material-symbols-rounded text-gray-400'
                          style={{ fontSize: 'var(--icon-lg)' }}
                        >
                          upload
                        </span>
                        <span className='text-xs text-gray-600 dark:text-gray-300 font-medium'>
                          {LOCAL_TRANSLATIONS[language].uploadBack}
                        </span>
                        <input
                          type='file'
                          accept='image/*'
                          className='hidden'
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 500 * 1024) {
                                alert(LOCAL_TRANSLATIONS[language].fileTooLarge);
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditForm({
                                  ...editForm,
                                  nationalIdCardBack: reader.result as string,
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Syndicate Card Upload Section */}
              <div className='space-y-1'>
                <label className='text-xs font-semibold text-(--text-tertiary) uppercase px-1 flex items-center gap-2'>
                  <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>
                    card_membership
                  </span>
                  {LOCAL_TRANSLATIONS[language].syndicateCards}
                </label>
                <div className='bg-(--bg-secondary)/10 pt-2.5 pb-4 px-4 rounded-xl border border-(--border-divider) grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {/* Main Syndicate Card */}
                  <div className='space-y-1.5'>
                    <span className='text-[10px] font-semibold text-(--text-tertiary) uppercase px-1'>
                      {LOCAL_TRANSLATIONS[language].mainSyndicateCard}
                    </span>
                    {editForm.mainSyndicateCard ? (
                      <div className='relative group w-full aspect-[8/5] bg-(--bg-secondary)/30 border border-(--border-divider) rounded-xl shadow-md'>
                        <img
                          src={editForm.mainSyndicateCard}
                          alt='Main Syndicate Card'
                          className='w-full h-full object-cover rounded-xl'
                        />
                        <button
                          type='button'
                          onClick={() => setEditForm({ ...editForm, mainSyndicateCard: undefined })}
                          className={`absolute -top-2.5 ${
                            language === 'AR' ? '-left-2.5' : '-right-2.5'
                          } w-6 h-6 bg-gray-100 dark:bg-gray-800 ${BUTTON_CLOSE_BASE} rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 flex items-center justify-center`}
                        >
                          <span
                            className='material-symbols-rounded'
                            style={{
                              fontSize: 'var(--icon-md)',
                              fontVariationSettings: "'wght' 700",
                            }}
                          >
                            close
                          </span>
                        </button>
                      </div>
                    ) : (
                      <label className='flex flex-col items-center justify-center gap-2 p-4 w-full aspect-[8/5] border-2 border-dashed border-(--border-divider) rounded-xl hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer bg-(--bg-input)/50'>
                        <span
                          className='material-symbols-rounded text-gray-400'
                          style={{ fontSize: 'var(--icon-lg)' }}
                        >
                          upload
                        </span>
                        <span className='text-xs text-gray-600 dark:text-gray-300 font-medium'>
                          {LOCAL_TRANSLATIONS[language].uploadMain}
                        </span>
                        <input
                          type='file'
                          accept='image/*'
                          className='hidden'
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 500 * 1024) {
                                alert(LOCAL_TRANSLATIONS[language].fileTooLarge);
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditForm({
                                  ...editForm,
                                  mainSyndicateCard: reader.result as string,
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Sub Syndicate Card */}
                  <div className='space-y-1.5'>
                    <span className='text-[10px] font-semibold text-(--text-tertiary) uppercase px-1'>
                      {LOCAL_TRANSLATIONS[language].sub}
                    </span>
                    {editForm.subSyndicateCard ? (
                      <div className='relative group w-full aspect-[8/5] bg-(--bg-secondary)/30 border border-(--border-divider) rounded-xl shadow-md'>
                        <img
                          src={editForm.subSyndicateCard}
                          alt='Sub Syndicate Card'
                          className='w-full h-full object-cover rounded-xl'
                        />
                        <button
                          type='button'
                          onClick={() => setEditForm({ ...editForm, subSyndicateCard: undefined })}
                          className={`absolute -top-2.5 ${
                            language === 'AR' ? '-left-2.5' : '-right-2.5'
                          } w-6 h-6 bg-gray-100 dark:bg-gray-800 ${BUTTON_CLOSE_BASE} rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 flex items-center justify-center`}
                        >
                          <span
                            className='material-symbols-rounded'
                            style={{
                              fontSize: 'var(--icon-md)',
                              fontVariationSettings: "'wght' 700",
                            }}
                          >
                            close
                          </span>
                        </button>
                      </div>
                    ) : (
                      <label className='flex flex-col items-center justify-center gap-2 p-4 w-full aspect-[8/5] border-2 border-dashed border-(--border-divider) rounded-xl hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer bg-(--bg-input)/50'>
                        <span
                          className='material-symbols-rounded text-gray-400'
                          style={{ fontSize: 'var(--icon-lg)' }}
                        >
                          upload
                        </span>
                        <span className='text-xs text-gray-600 dark:text-gray-300 font-medium'>
                          {LOCAL_TRANSLATIONS[language].uploadSub}
                        </span>
                        <input
                          type='file'
                          accept='image/*'
                          className='hidden'
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 500 * 1024) {
                                alert(LOCAL_TRANSLATIONS[language].fileTooLarge);
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditForm({
                                  ...editForm,
                                  subSyndicateCard: reader.result as string,
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Profile Action Buttons */}
        <div className='flex gap-3 px-6 py-4 border-t border-(--border-divider) bg-(--bg-secondary)/10 rounded-b-2xl mt-auto'>
          <button
            type='button'
            onClick={() => {
              onSave({
                profileData: editForm,
                bannerStyle: editBannerStyle,
                bannerOffset: editBannerOffset,
                bannerZoom: editBannerZoom,
                userStatus: editUserStatus,
                customBio: editCustomBio,
                customAccentColor: editCustomAccentColor,
              });
              onClose();
            }}
            className='flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90 shadow-md text-sm'
            style={{ backgroundColor: 'var(--color-primary-500, #3b82f6)' }}
          >
            {LOCAL_TRANSLATIONS[language].saveChanges}
          </button>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2.5 rounded-xl font-medium text-(--text-primary) bg-(--bg-secondary) border border-(--border-divider) hover:bg-(--bg-hover) transition-colors text-sm'
          >
            {LOCAL_TRANSLATIONS[language].cancel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
