import { Camera, ChevronDown, ChevronUp, Pencil, Save, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_UPLOAD_SIZE_KB } from '../../../config';
import type { Employee, EmploymentRequest, UserProfile } from '../../../types';
import { BANNER_STYLES, renderBanner } from '../../../utils/banners';
import { PROFILE_GLASS_CARD_BASE } from '../../../utils/themeStyles';
import { Tooltip } from '../../common/Tooltip';

const PROFILE_GLASS_CARD_NO_BORDER = PROFILE_GLASS_CARD_BASE
  .split(' ')
  .filter(c => c !== 'border' && !c.startsWith('border-') && !c.startsWith('dark:border-'))
  .join(' ') + ' border border-transparent';
import { ColorPicker, FRAME_COLORS } from '../avatar-color-settings';
import { AVATAR_DECORATIONS, DECORATION_KEYFRAMES, getDecoration } from '../avatar-decorations';
import type { RingStyle } from '../avatar-ring';
import AvatarRing, { AnimationToggle, RING_STYLES } from '../avatar-ring';

type BannerId = (typeof BANNER_STYLES)[number]['id'];

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const readFileAsBase64 = (
  file: File,
  t: Translations,
  readerRef?: React.MutableRefObject<FileReader | null>
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_UPLOAD_SIZE_KB * 1024) {
      reject(
        new Error(t.employeeProfile.fileTooLarge.replace('{{size}}', MAX_UPLOAD_SIZE_KB.toString()))
      );
      return;
    }
    if (readerRef?.current) {
      readerRef.current.abort();
      readerRef.current.onloadend = null;
      readerRef.current.onerror = null;
    }
    const reader = new FileReader();
    if (readerRef) readerRef.current = reader;
    reader.onloadend = () => {
      reader.onloadend = null;
      reader.onerror = null;
      if (readerRef) readerRef.current = null;
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reader.onloadend = null;
      reader.onerror = null;
      if (readerRef) readerRef.current = null;
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

interface EditFieldProps {
  icon: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  dir?: string;
  type?: string;
  disabled?: boolean;
}

export const EditField: React.FC<EditFieldProps> = ({
  icon,
  label,
  value,
  onChange,
  dir = 'ltr',
  type = 'text',
  disabled = false,
}) => (
  <div
    className={`${PROFILE_GLASS_CARD_NO_BORDER} flex items-center gap-2.5 ${disabled ? 'opacity-60' : ''}`}
  >
    <span className='material-symbols-rounded text-[18px] text-primary-500 shrink-0'>{icon}</span>
    <div className='min-w-0 flex-1'>
      <p className='text-[10px] text-(--text-tertiary) font-bold truncate'>{label}</p>
      {onChange && !disabled ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir={dir}
          className='w-full bg-transparent border-none outline-hidden text-xs font-semibold text-(--text-primary) p-0 m-0 focus:ring-0 placeholder:text-(--text-tertiary)'
          placeholder={label}
        />
      ) : (
        <p className='text-xs font-semibold text-(--text-primary) truncate' dir={dir}>
          {value}
        </p>
      )}
    </div>
  </div>
);

interface ProfileTabProps {
  profile: UserProfile | null;
  sessionName: string | undefined;
  sessionUsername: string | undefined;
  requests: EmploymentRequest[];
  workspaces?: (Employee & { branches?: { name: string }; organizations?: { name: string } })[];
  isRTL: boolean;
  t: Translations;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
  onUpdateWorkspacePassword?: (employeeId: string, newPassword: string) => Promise<void>;
  onRegisterWorkspaceFingerprint?: (employeeId: string, username: string) => Promise<void>;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  isLoading?: boolean;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile,
  sessionName,
  sessionUsername,
  requests,
  workspaces = [],
  isRTL,
  t,
  onUpdateProfile,
  onUpdateWorkspacePassword,
  onRegisterWorkspaceFingerprint,
  isEditing,
  setIsEditing,
  isLoading,
}) => {
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isRegisteringFingerprint, setIsRegisteringFingerprint] = useState<string | null>(null);
  const [collapsedWorkspaces, setCollapsedWorkspaces] = useState<Set<string>>(
    () => new Set(workspaces.map((w) => w.id))
  );
  const [visibleCredentials, setVisibleCredentials] = useState<Set<string>>(new Set());

  const toggleWorkspace = (id: string) => {
    setCollapsedWorkspaces((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCredentials = (id: string) => {
    setVisibleCredentials((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const calculateDuration = (startDateStr: string | undefined, endDateStr?: string) => {
    if (!startDateStr) return '—';
    const start = new Date(startDateStr);
    const end = endDateStr ? new Date(endDateStr) : new Date();
    if (isNaN(start.getTime())) return '—';
    if (isNaN(end.getTime())) return '—';

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months--;
      const lastMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += lastMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} ${t.employeeProfile.years}`);
    if (months > 0) parts.push(`${months} ${t.employeeProfile.months}`);
    if (days > 0 && years === 0) parts.push(`${days} ${t.employeeProfile.days}`);

    if (parts.length === 0) return `0 ${t.employeeProfile.days}`;

    return parts.join(` ${t.employeeProfile.and} `);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return {
          container: 'bg-emerald-500/10 text-emerald-500',
          icon: 'check_circle',
        };
      case 'holiday':
        return {
          container: 'bg-amber-500/10 text-amber-500',
          icon: 'beach_access',
        };
      case 'pending':
        return {
          container: 'bg-blue-500/10 text-blue-500',
          icon: 'pending',
        };
      case 'inactive':
      default:
        return {
          container: 'bg-red-500/10 text-red-500',
          icon: 'cancel',
        };
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [editFields, setEditFields] = useState({
    fullName: '',
    nameArabic: '',
    email: '',
    phone: '',
    licenseNumber: '',
  });
  const [coverStyle, setCoverStyle] = useState<BannerId>(
    (profile?.coverStyle as BannerId) || 'pattern'
  );
  const [bannerZoom, setBannerZoom] = useState(() => profile?.designSettings?.banner?.zoom ?? 1.2);
  const [bannerOffset, setBannerOffset] = useState(() => ({
    x: profile?.designSettings?.banner?.offsetX ?? 0,
    y: profile?.designSettings?.banner?.offsetY ?? 0,
  }));
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const [removeImage, setRemoveImage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarDecoration, setAvatarDecoration] = useState(
    () => profile?.designSettings?.avatar?.decorationId ?? 'none'
  );
  const [decorationAnimated, setDecorationAnimated] = useState(
    () => profile?.designSettings?.avatar?.decorationAnimated ?? true
  );
  const [frameColor, setFrameColor] = useState<string | null>(
    () => profile?.designSettings?.avatar?.frameColor ?? null
  );
  const [ringStyle, setRingStyle] = useState<RingStyle>(
    () => (profile?.designSettings?.avatar?.ringStyle as RingStyle) ?? 'solid'
  );
  const [ringThickness, setRingThickness] = useState(
    () => profile?.designSettings?.avatar?.ringThickness ?? 4
  );
  const [ringAnimated, setRingAnimated] = useState(
    () => profile?.designSettings?.avatar?.ringAnimated ?? false
  );

  useEffect(() => {
    if (profile?.designSettings) {
      const ds = profile.designSettings;
      if (ds.banner) {
        if (ds.banner.zoom !== undefined) setBannerZoom(ds.banner.zoom);
        setBannerOffset({
          x: ds.banner.offsetX ?? 0,
          y: ds.banner.offsetY ?? 0,
        });
      }
      if (ds.avatar) {
        if (ds.avatar.decorationId !== undefined) setAvatarDecoration(ds.avatar.decorationId);
        if (ds.avatar.decorationAnimated !== undefined)
          setDecorationAnimated(ds.avatar.decorationAnimated);
        if (ds.avatar.frameColor !== undefined) setFrameColor(ds.avatar.frameColor);
        if (ds.avatar.ringStyle !== undefined) setRingStyle(ds.avatar.ringStyle as RingStyle);
        if (ds.avatar.ringThickness !== undefined) setRingThickness(ds.avatar.ringThickness);
        if (ds.avatar.ringAnimated !== undefined) setRingAnimated(ds.avatar.ringAnimated);
      }
    }
  }, [profile]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);
  const readerRef = useRef<FileReader | null>(null);

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  const handleBannerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      offsetStart.current = { ...bannerOffset };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [bannerOffset]
  );

  const handleBannerPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = (e.clientX - dragStart.current.x) / bannerZoom;
      const dy = (e.clientY - dragStart.current.y) / bannerZoom;
      setBannerOffset({
        x: offsetStart.current.x + dx,
        y: offsetStart.current.y + dy,
      });
    },
    [isDragging, bannerZoom]
  );

  const handleBannerPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!isEditing) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setBannerZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
    },
    [isEditing]
  );

  useEffect(() => {
    if (isEditing) {
      setShowHint(true);
      const timer = setTimeout(() => setShowHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  useEffect(() => {
    const id = 'decoration-keyframes';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = DECORATION_KEYFRAMES;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (readerRef.current) {
        readerRef.current.abort();
        readerRef.current.onloadend = null;
        readerRef.current.onerror = null;
        readerRef.current = null;
      }
      setPreview(undefined);
    };
  }, []);

  React.useEffect(() => {
    if (profile?.coverStyle) setCoverStyle(profile.coverStyle as BannerId);
  }, [profile?.coverStyle]);

  const displayName = profile?.fullName || sessionName || '...';
  const displayUsername = (profile?.username || sessionUsername || '').replace(/^@/, '');
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  const acceptedRequests = useMemo(
    () => requests.filter((r) => r.status === 'accepted'),
    [requests]
  );

  const startEditing = useCallback(() => {
    setEditFields({
      fullName: profile?.fullName || sessionName || '',
      nameArabic: profile?.nameArabic || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      licenseNumber: profile?.licenseNumber || '',
    });
    setIsEditing(true);
  }, [profile, sessionName, setIsEditing]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setPreview(undefined);
    setRemoveImage(false);
    setEditFields({ fullName: '', nameArabic: '', email: '', phone: '', licenseNumber: '' });
  }, [setIsEditing]);

  const handleSave = useCallback(async () => {
    if (!onUpdateProfile) return;
    setIsSaving(true);
    try {
      await onUpdateProfile({
        fullName: editFields.fullName.trim() || undefined,
        nameArabic: editFields.nameArabic.trim() || null,
        phone: editFields.phone.trim() || null,
        licenseNumber: editFields.licenseNumber.trim() || null,
        ...(preview && { image: preview }),
        ...(removeImage && { image: null }),
        designSettings: {
          avatar: {
            decorationId: avatarDecoration,
            decorationAnimated,
            frameColor,
            ringStyle,
            ringThickness,
            ringAnimated,
          },
          banner: {
            zoom: bannerZoom,
            offsetX: bannerOffset.x,
            offsetY: bannerOffset.y,
          },
        },
      } as Partial<UserProfile>);
      setPreview(undefined);
      setRemoveImage(false);
      setIsEditing(false);
    } catch {
      // error handled upstream
    } finally {
      setIsSaving(false);
    }
  }, [
    onUpdateProfile,
    editFields,
    preview,
    removeImage,
    setIsEditing,
    avatarDecoration,
    decorationAnimated,
    frameColor,
    ringStyle,
    ringThickness,
    ringAnimated,
    bannerZoom,
    bannerOffset,
  ]);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const base64 = await readFileAsBase64(file, t, readerRef);
        setPreview(base64);
        setRemoveImage(false);
      } catch (err) {
        if (err instanceof Error) alert(err.message);
      }
      if (imageInputRef.current) imageInputRef.current.value = '';
    },
    [t]
  );

  const handleImageRemove = useCallback(() => {
    setPreview(undefined);
    setRemoveImage(true);
  }, []);

  const handleCoverChange = useCallback(
    (id: BannerId) => {
      setCoverStyle(id);
      onUpdateProfile?.({ coverStyle: id } as Partial<UserProfile>);
    },
    [onUpdateProfile]
  );

  const avatarSrc = removeImage
    ? undefined
    : preview || (profile?.image?.startsWith('data:image/') ? profile.image : undefined);

  return (
    <div className='animate-fade-in'>
      {/* Banner */}
      <div
        ref={bannerRef}
        className={`relative w-full aspect-[9/3] sm:aspect-[9/2] bg-(--bg-secondary) overflow-hidden select-none rounded-2xl ${isEditing ? 'cursor-grab touch-none' : ''} ${isDragging ? 'cursor-grabbing' : ''} group/cover`}
        onPointerDown={isEditing ? handleBannerPointerDown : undefined}
        onPointerMove={isEditing ? handleBannerPointerMove : undefined}
        onPointerUp={isEditing ? handleBannerPointerUp : undefined}
        onPointerCancel={isEditing ? handleBannerPointerUp : undefined}
        onWheel={handleWheel}
      >
        {renderBanner(coverStyle, bannerOffset, bannerZoom)}

        {/* Edit controls overlay */}
        {isEditing && (
          <div className='absolute inset-0 z-30 flex flex-col justify-between pointer-events-none'>
            {/* Top controls: dot picker + zoom */}
            <div className='flex items-start justify-between gap-2 p-3'>
              {/* Pattern picker */}
              <div className='flex items-center gap-1 bg-white/80 dark:bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-black/10 dark:border-white/10 pointer-events-auto'>
                {BANNER_STYLES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleCoverChange(b.id)}
                    className={`w-4 h-4 rounded-full border-2 transition-all hover:scale-125 ${coverStyle === b.id ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: b.accentColor }}
                    title={isRTL ? b.nameAR : b.nameEN}
                    type='button'
                  />
                ))}
              </div>

              {/* Zoom controls */}
              <div className='flex items-center gap-1 bg-white/80 dark:bg-black/40 backdrop-blur-md px-2 py-1 rounded-xl border border-black/10 dark:border-white/10 pointer-events-auto'>
                <button
                  type='button'
                  onClick={() =>
                    setBannerZoom((prev) => Math.max(MIN_ZOOM, +(prev - 0.1).toFixed(1)))
                  }
                  disabled={bannerZoom <= MIN_ZOOM}
                  className='w-6 h-6 flex items-center justify-center rounded text-[14px] font-bold text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors'
                >
                  −
                </button>
                <span className='w-8 text-center text-[11px] font-semibold text-(--text-primary) tabular-nums'>
                  {bannerZoom.toFixed(1)}x
                </span>
                <button
                  type='button'
                  onClick={() =>
                    setBannerZoom((prev) => Math.min(MAX_ZOOM, +(prev + 0.1).toFixed(1)))
                  }
                  disabled={bannerZoom >= MAX_ZOOM}
                  className='w-6 h-6 flex items-center justify-center rounded text-[14px] font-bold text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors'
                >
                  +
                </button>
                <div className='w-px h-4 bg-black/20 dark:bg-white/20 mx-0.5' />
                <button
                  type='button'
                  onClick={() => {
                    setBannerZoom(1.2);
                    setBannerOffset({ x: 0, y: 0 });
                  }}
                  className='w-6 h-6 flex items-center justify-center rounded text-[18px] font-bold text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 transition-colors leading-none'
                  title={isRTL ? 'إعادة تعيين' : 'Reset'}
                >
                  ⟲
                </button>
              </div>
            </div>

            {/* Bottom hint */}
            <div className='flex justify-center pb-2'>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full bg-black/40 text-white/70 backdrop-blur-sm transition-opacity duration-500 ${showHint ? 'opacity-100' : 'opacity-0'}`}
              >
                {isRTL ? 'اسحب للتحريك · قرص للتكبير' : 'Drag to pan · Scroll to zoom'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Avatar & Header */}
      <div className='relative px-6 pb-6 -mt-12'>
        <div className='flex flex-row items-end gap-5 mb-4 relative z-10' dir='ltr'>
          <div className='relative shrink-0'>
            {/* Avatar with image support */}
            <label
              htmlFor='avatar-upload'
              className={`block ${isEditing ? 'cursor-pointer' : ''} group`}
              title={
                isEditing
                  ? t.employeeProfile.fileTooLarge.replace(
                      '{{size}}',
                      MAX_UPLOAD_SIZE_KB.toString()
                    )
                  : undefined
              }
            >
              <div
                className='w-28 h-28 rounded-full border-4 overflow-visible bg-(--bg-secondary) shadow-md flex items-center justify-center relative'
                style={{ borderColor: frameColor ? 'transparent' : 'var(--bg-page-surface)' }}
              >
                {/* Inner clipped container keeps image/initials inside the circle */}
                <div className='absolute inset-0 rounded-full overflow-hidden'>
                  {avatarSrc ? (
                    <img src={avatarSrc} alt='' className='w-full h-full object-cover' />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-primary-600/30 text-primary-500 text-3xl font-bold'>
                      {getInitials(displayName)}
                    </div>
                  )}
                </div>
                {avatarDecoration !== 'none' && (
                  <div
                    className={`absolute -inset-2 pointer-events-none z-[1] ${!decorationAnimated ? 'pause-animations' : ''}`}
                  >
                    {getDecoration(avatarDecoration)}
                  </div>
                )}
                {frameColor && (
                  <div className='absolute -inset-2 pointer-events-none z-0'>
                    <AvatarRing
                      color={frameColor}
                      style={ringStyle}
                      thickness={ringThickness}
                      animated={ringAnimated}
                    />
                  </div>
                )}
                {onUpdateProfile && isEditing && (
                  <div className='absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-full flex items-center justify-center gap-3 z-[2]'>
                    <Camera className='w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity' />
                    {avatarSrc && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageRemove();
                        }}
                        type='button'
                        className='text-white opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-300'
                      >
                        <span className='material-symbols-rounded text-[22px]'>delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              {onUpdateProfile && isEditing && (
                <input
                  id='avatar-upload'
                  ref={imageInputRef}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={handleImageUpload}
                />
              )}
            </label>
            <span className='absolute bottom-1 end-1 w-7 h-7 rounded-full border-4 border-(--bg-page-surface) bg-emerald-500 flex items-center justify-center z-[3]'>
              <span className='material-symbols-rounded text-white text-[10px] font-bold select-none'>
                check
              </span>
            </span>
          </div>

          <div className='flex-1 min-w-0 pb-2'>
            <div className='flex items-center gap-3 flex-wrap'>
              <h3 className='text-xl font-bold text-(--text-primary) flex items-center gap-2 flex-wrap'>
                {displayName}
                {displayUsername && (
                  <button
                    type='button'
                    onClick={async () => {
                      const textToCopy = `@${displayUsername}`;
                      try {
                        if (navigator.clipboard && window.isSecureContext) {
                          await navigator.clipboard.writeText(textToCopy);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        } else {
                          // Fallback for non-secure contexts / older browsers
                          const textArea = document.createElement('textarea');
                          textArea.value = textToCopy;
                          textArea.style.position = 'fixed';
                          document.body.appendChild(textArea);
                          textArea.focus();
                          textArea.select();
                          const successful = document.execCommand('copy');
                          document.body.removeChild(textArea);
                          if (successful) {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }
                        }
                      } catch (err) {
                        console.error('Failed to copy text: ', err);
                      }
                    }}
                    className='text-xs font-normal text-(--text-secondary) bg-black/5 dark:bg-black/25 px-2 py-0.5 rounded-md border border-black/10 dark:border-white/5 font-mono select-all cursor-pointer'
                    dir='ltr'
                  >
                    {copied ? t.employeeProfile.copied : `@${displayUsername}`}
                  </button>
                )}
              </h3>
            </div>
            <p className='text-xs font-semibold mt-1'>
              {workspaces.length > 0 ? (
                <span className='text-emerald-600 dark:text-emerald-400'>
                  {workspaces.length === 1
                    ? [workspaces[0].orgName, workspaces[0].branchName].filter(Boolean).join(' - ')
                    : workspaces
                        .map((w) => w.orgName)
                        .filter(Boolean)
                        .join(', ') || (isRTL ? 'موظف' : 'Employed')}
                </span>
              ) : (
                <span className='text-primary-600 dark:text-primary-400'>
                  {isRTL ? 'غير موظف' : 'Unemployed'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Decoration picker in edit mode */}
        {isEditing && (
          <div className='mb-4'>
            <div className='flex items-center justify-between mb-2'>
              <p className='text-[10px] font-bold uppercase tracking-wider text-(--text-tertiary)'>
                {isRTL ? 'إطار الصورة' : 'Avatar Frame'}
              </p>
              <AnimationToggle
                animating={decorationAnimated}
                onToggle={() => setDecorationAnimated(!decorationAnimated)}
                isRTL={isRTL}
              />
            </div>
            <div
              className={`decoration-carousel flex items-center gap-3 overflow-x-auto flex-nowrap scrollbar-none pt-8 pb-4 px-3 -mx-6 ${!decorationAnimated ? 'pause-animations' : ''}`}
            >
              {AVATAR_DECORATIONS.map((dec) => (
                <button
                  key={dec.id}
                  type='button'
                  onClick={() => setAvatarDecoration(dec.id)}
                  className='w-12 h-12 flex items-center justify-center relative overflow-visible transition-transform duration-150 hover:scale-110 active:scale-95 snap-start shrink-0'
                  title={isRTL ? dec.nameAr : dec.name}
                >
                  {/* Mini avatar circle */}
                  <div
                    className={`absolute inset-1 rounded-full overflow-hidden bg-(--bg-secondary) flex items-center justify-center transition-shadow duration-150 ${
                      avatarDecoration === dec.id
                        ? 'ring-2 ring-primary-500 shadow-md'
                        : 'ring-1 ring-(--border-secondary) shadow-sm'
                    }`}
                  >
                    <div className='w-full h-full bg-gradient-to-br from-primary-500/10 to-primary-600/20' />
                  </div>
                  {/* Decoration overlay matching real avatar layout */}
                  {dec.svg ? (
                    <div className='absolute inset-0 pointer-events-none z-[1]'>{dec.svg}</div>
                  ) : (
                    <span className='material-symbols-rounded text-[14px] text-(--text-tertiary) z-[1]'>
                      close
                    </span>
                  )}
                  {dec.isAnimated && (
                    <div className='absolute inset-0 z-10 flex items-center justify-center pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'>
                      <svg
                        width='24'
                        height='24'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                        className='text-white'
                      >
                        {decorationAnimated ? (
                          <>
                            <rect x='6' y='4' width='4' height='16' rx='1' />
                            <rect x='14' y='4' width='4' height='16' rx='1' />
                          </>
                        ) : (
                          <polygon points='5,3 19,12 5,21' />
                        )}
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className='pt-1.5 space-y-3'>
              <ColorPicker
                label={isRTL ? 'لون الإطار' : 'Frame Color'}
                colors={FRAME_COLORS}
                selected={frameColor}
                onChange={(c) => {
                  setFrameColor(c);
                  if (!c) setRingAnimated(false);
                }}
                isRTL={isRTL}
              />
              {frameColor && (
                <>
                  <div className='space-y-1.5'>
                    <p className='text-[10px] font-bold uppercase tracking-wider text-(--text-tertiary)'>
                      {isRTL ? 'نمط الإطار' : 'Ring Style'}
                    </p>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      {RING_STYLES.filter((s) => s.id !== 'animated').map((s) => (
                        <button
                          key={s.id}
                          type='button'
                          onClick={() => setRingStyle(s.id)}
                          className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-all duration-150 border ${
                            ringStyle === s.id
                              ? 'bg-primary-500 text-white border-primary-500'
                              : 'bg-(--bg-secondary) text-(--text-secondary) border-(--border-secondary) hover:border-primary-300 dark:hover:border-primary-600'
                          }`}
                        >
                          {isRTL ? s.nameAr : s.name}
                        </button>
                      ))}
                      <AnimationToggle
                        animating={ringAnimated}
                        onToggle={() => setRingAnimated(!ringAnimated)}
                        isRTL={isRTL}
                      />
                    </div>
                  </div>

                  <div className='flex items-end gap-3'>
                    <div className='flex-1 space-y-1.5'>
                      <div className='flex items-center justify-between'>
                        <p className='text-[10px] font-bold uppercase tracking-wider text-(--text-tertiary)'>
                          {isRTL ? 'سماكة الإطار' : 'Ring Thickness'}
                        </p>
                        <span className='text-[11px] text-(--text-tertiary)'>{ringThickness}</span>
                      </div>
                      <input
                        type='range'
                        min='2'
                        max='10'
                        value={ringThickness}
                        onChange={(e) => setRingThickness(Number(e.target.value))}
                        className='w-full h-1.5 rounded-full appearance-none cursor-pointer bg-(--border-secondary) accent-primary-500'
                        style={{ accentColor: 'var(--primary-500, #8b5cf6)' }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Info Grid or Edit Form */}
        <div className='space-y-4'>
          <div className='space-y-3 pt-2'>
            <div className='flex items-center justify-between'>
              <h4 className='text-xs font-bold uppercase tracking-wider text-primary-500'>
                {t.employeeProfile.personalInformation}
              </h4>
              {onUpdateProfile &&
                (isEditing ? (
                  <div className='flex items-center gap-1.5'>
                    <button
                      onClick={cancelEditing}
                      disabled={isSaving}
                      className='flex items-center gap-1 px-3 py-1.5 rounded-lg bg-(--bg-secondary) hover:bg-(--color-error)/10 text-(--text-tertiary) hover:text-(--color-error) text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50'
                      type='button'
                    >
                      <X className='w-3 h-3' />
                      {t.employeeProfile.cancel}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className='flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50'
                      type='button'
                    >
                      {isSaving ? (
                        <span className='w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                      ) : (
                        <Save className='w-3 h-3' />
                      )}
                      {t.employeeProfile.save}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startEditing}
                    className='flex items-center gap-1 px-3 py-1.5 rounded-lg bg-(--bg-secondary) hover:bg-primary-500/10 text-(--text-secondary) hover:text-primary-500 text-[11px] font-bold transition-all active:scale-95 shadow-xs'
                    type='button'
                  >
                    <Pencil className='w-3 h-3' />
                    {t.employeeProfile.edit}
                  </button>
                ))}
            </div>
            {isEditing ? (
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <EditField
                  icon='badge'
                  label={t.employeeProfile.fullName}
                  value={editFields.fullName}
                  onChange={(v) => setEditFields((prev) => ({ ...prev, fullName: v }))}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <EditField
                  icon='translate'
                  label={t.employeeProfile.nameArabic}
                  value={editFields.nameArabic}
                  onChange={(v) => setEditFields((prev) => ({ ...prev, nameArabic: v }))}
                  dir='rtl'
                />
                <EditField
                  icon='mail'
                  label={t.employeeProfile.email}
                  value={editFields.email}
                  dir='ltr'
                  type='email'
                  disabled
                />
                <EditField
                  icon='phone'
                  label={t.employeeProfile.phone}
                  value={editFields.phone}
                  onChange={(v) => setEditFields((prev) => ({ ...prev, phone: v }))}
                  dir='ltr'
                  type='tel'
                />
                <EditField
                  icon='health_and_safety'
                  label={t.employeeProfile.licenseNo}
                  value={editFields.licenseNumber}
                  onChange={(v) => setEditFields((prev) => ({ ...prev, licenseNumber: v }))}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <div className={`${PROFILE_GLASS_CARD_NO_BORDER} flex items-center gap-2.5`}>
                  <span className='material-symbols-rounded text-[18px] text-primary-500'>
                    calendar_month
                  </span>
                  <div className='min-w-0'>
                    <p className='text-[10px] text-(--text-tertiary) font-bold truncate'>
                      {t.employeeProfile.memberSince}
                    </p>
                    <p className='text-xs font-semibold text-(--text-primary) truncate'>
                      {memberSince}
                    </p>
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              <div className='grid grid-cols-2 gap-2 animate-pulse'>
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`${PROFILE_GLASS_CARD_NO_BORDER} flex items-center gap-2.5 h-12`}
                  >
                    <div className='w-4 h-4 rounded bg-black/10 dark:bg-white/10 shrink-0'></div>
                    <div className='flex-1 space-y-1.5 min-w-0'>
                      <div className='h-2 bg-black/10 dark:bg-white/10 rounded w-1/3'></div>
                      <div className='h-3 bg-black/10 dark:bg-white/10 rounded w-2/3'></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='grid grid-cols-2 gap-2'>
                {[
                  { icon: 'badge', label: t.employeeProfile.fullName, value: displayName },
                  ...(profile?.nameArabic
                    ? [
                        {
                          icon: 'translate',
                          label: t.employeeProfile.nameArabic,
                          value: profile.nameArabic,
                        },
                      ]
                    : []),
                  ...(profile?.email
                    ? [{ icon: 'mail', label: t.employeeProfile.email, value: profile.email }]
                    : []),
                  ...(profile?.phone
                    ? [{ icon: 'phone', label: t.employeeProfile.phone, value: profile.phone }]
                    : []),
                  ...(profile?.licenseNumber
                    ? [
                        {
                          icon: 'health_and_safety',
                          label: t.employeeProfile.licenseNo,
                          value: profile.licenseNumber,
                        },
                      ]
                    : []),
                  {
                    icon: 'calendar_month',
                    label: t.employeeProfile.memberSince,
                    value: memberSince,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`${PROFILE_GLASS_CARD_NO_BORDER} flex items-center gap-2.5`}
                  >
                    <span className='material-symbols-rounded text-[18px] text-primary-500'>
                      {item.icon}
                    </span>
                    <div className='min-w-0'>
                      <p className='text-[10px] text-(--text-tertiary) font-bold truncate'>
                        {item.label}
                      </p>
                      <p className='text-xs font-semibold text-(--text-primary) truncate'>
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Login & Fingerprint Credentials (Workspaces) */}
          {(workspaces.length > 0 || isLoading) && (
            <div className='space-y-3 pt-2'>
              <h4 className='text-xs font-bold uppercase tracking-wider text-primary-500'>
                {t.employeeProfile.workspacesAndCredentials}
              </h4>
              <div className='flex flex-col gap-4'>
                {isLoading ? (
                  <>
                    <div className={`${PROFILE_GLASS_CARD_NO_BORDER} p-4 space-y-3 animate-pulse`}>
                      <div className='flex items-center justify-between border-b border-black/10 dark:border-white/5 pb-3'>
                        <div className='h-4 bg-black/10 dark:bg-white/10 rounded w-1/3'></div>
                        <div className='h-4 bg-black/10 dark:bg-white/10 rounded w-16'></div>
                      </div>
                      <div className='grid grid-cols-2 sm:grid-cols-5 gap-y-3 gap-x-4 border-b border-black/10 dark:border-white/5 pb-3'>
                        {[...Array(5)].map((_, i) => (
                          <div key={i}>
                            <div className='h-3 bg-black/10 dark:bg-white/10 rounded w-16 mb-2'></div>
                            <div className='h-3 bg-black/10 dark:bg-white/10 rounded w-24'></div>
                          </div>
                        ))}
                      </div>
                      <div className='border-b border-black/10 dark:border-white/5 pb-3'>
                        <div className='h-3 bg-black/10 dark:bg-white/10 rounded w-20 mb-2'></div>
                        <div className='h-3 bg-black/10 dark:bg-white/10 rounded w-full'></div>
                      </div>
                      <div className='flex flex-col gap-2 pt-3'>
                        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                          <div className='flex gap-4'>
                            <div>
                              <div className='h-3 bg-black/10 dark:bg-white/10 rounded w-16 mb-2'></div>
                              <div className='h-5 bg-black/10 dark:bg-white/10 rounded w-20'></div>
                            </div>
                            <div>
                              <div className='h-3 bg-black/10 dark:bg-white/10 rounded w-16 mb-2'></div>
                              <div className='h-5 bg-black/10 dark:bg-white/10 rounded w-20'></div>
                            </div>
                          </div>
                          <div className='grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto'>
                            <div className='h-7 bg-black/10 dark:bg-white/10 rounded w-full sm:w-28'></div>
                            <div className='h-7 bg-black/10 dark:bg-white/10 rounded w-full sm:w-28'></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className={`${PROFILE_GLASS_CARD_NO_BORDER} p-5 ${collapsedWorkspaces.has(ws.id) ? '' : 'space-y-4'}`}
                    >
                      <div
                        className={`flex items-center justify-between cursor-pointer select-none group transition-colors ${collapsedWorkspaces.has(ws.id) ? '' : 'border-b border-black/10 dark:border-white/5 pb-4'}`}
                        onClick={() => toggleWorkspace(ws.id)}
                      >
                        <span className='text-sm font-bold text-(--text-primary) flex items-center gap-2'>
                          {ws.orgName ? (
                            <span className='text-base'>
                              {ws.orgName} - {ws.branchName || t.employeeProfile.unknownBranch}
                            </span>
                          ) : (
                            <span className='text-base'>
                              {ws.branchName || t.employeeProfile.unknownBranch}
                            </span>
                          )}
                        </span>
                        <div className='flex items-center gap-3'>
                          <div
                            className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 ${getStatusStyle(ws.status).container}`}
                          >
                            <span className='material-symbols-rounded' style={{ fontSize: '16px' }}>
                              {getStatusStyle(ws.status).icon}
                            </span>
                            {(t.employeeList.statusOptions as any)[ws.status] || ws.status}
                          </div>
                          <div className='w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-(--text-tertiary) group-hover:bg-black/10 dark:group-hover:bg-white/10 group-hover:text-(--text-primary) transition-all'>
                            {collapsedWorkspaces.has(ws.id) ? (
                              <ChevronDown className='w-5 h-5' />
                            ) : (
                              <ChevronUp className='w-5 h-5' />
                            )}
                          </div>
                        </div>
                      </div>

                      {!collapsedWorkspaces.has(ws.id) && (
                        <div className='space-y-4 animate-fade-in'>
                          <div className='grid grid-cols-2 sm:grid-cols-5 gap-y-4 gap-x-4 border-b border-black/10 dark:border-white/5 pb-4'>
                            <div>
                              <span className='text-[10px] font-bold text-(--text-tertiary) uppercase flex items-center gap-1'>
                                <span className='material-symbols-rounded text-[14px]'>domain</span>
                                {t.employeeList.department}
                              </span>
                              <div className='text-xs font-semibold mt-1 text-(--text-primary) truncate'>
                                {ws.department
                                  ? (t.employeeList.departments as any)[ws.department] ||
                                    ws.department
                                  : '—'}
                              </div>
                            </div>
                            <div>
                              <span className='text-[10px] font-bold text-(--text-tertiary) uppercase flex items-center gap-1'>
                                <span className='material-symbols-rounded text-[14px]'>
                                  admin_panel_settings
                                </span>
                                {t.employeeList.role}
                              </span>
                              <div className='text-xs font-semibold mt-1 text-(--text-primary) truncate'>
                                {ws.role ? (t.employeeList.roles as any)[ws.role] || ws.role : '—'}
                              </div>
                            </div>
                            <div>
                              <span className='text-[10px] font-bold text-(--text-tertiary) uppercase flex items-center gap-1'>
                                <span className='material-symbols-rounded text-[14px]'>work</span>
                                {t.employeeList.position}
                              </span>
                              <div className='text-xs font-semibold mt-1 text-(--text-primary) truncate'>
                                {ws.position || '—'}
                              </div>
                            </div>
                            <div>
                              <span className='text-[10px] font-bold text-(--text-tertiary) uppercase flex items-center gap-1'>
                                <span className='material-symbols-rounded text-[14px]'>
                                  payments
                                </span>
                                {t.employeeList.salary}
                              </span>
                              <div className='text-xs font-semibold mt-1 text-(--text-primary) truncate'>
                                {ws.salary ? `${ws.salary} ${t.global.currency}` : '—'}
                              </div>
                            </div>
                            {(ws.status !== 'inactive' || ws.endDate) && (
                              <div>
                                <span className='text-[10px] font-bold text-(--text-tertiary) uppercase flex items-center gap-1'>
                                  <span className='material-symbols-rounded text-[14px]'>
                                    history_toggle_off
                                  </span>
                                  {t.employeeProfile.duration}
                                </span>
                                <div className='text-xs font-semibold mt-1 text-(--text-primary) truncate'>
                                  {calculateDuration(
                                    ws.startDate,
                                    ws.status === 'inactive' ? ws.endDate : undefined
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className='border-b border-black/10 dark:border-white/5 pb-3'>
                            <span className='text-[10px] font-bold text-(--text-tertiary) uppercase flex items-center gap-1 mb-2'>
                              <span className='material-symbols-rounded text-[14px]'>
                                military_tech
                              </span>
                              {t.employeeList.tabs.achievements ||
                                (isRTL ? 'الإنجازات' : 'Achievements')}
                            </span>

                            <div className='flex flex-wrap items-center gap-x-4 gap-y-2 text-xs mt-2'>
                              {/* Transactions Stat */}
                              <Tooltip
                                position='top'
                                content={
                                  <div className='flex items-center gap-2'>
                                    <span>
                                      {isRTL ? 'مبيعات:' : 'Sales:'}{' '}
                                      <span className='font-bold ml-0.5'>0</span>
                                    </span>
                                    <span className='w-px h-2.5 bg-white/30 dark:bg-black/30'></span>
                                    <span>
                                      {isRTL ? 'مرتجعات:' : 'Returns:'}{' '}
                                      <span className='font-bold ml-0.5'>0</span>
                                    </span>
                                  </div>
                                }
                              >
                                <div
                                  tabIndex={0}
                                  className='group relative flex items-center gap-1.5 p-1 -m-1 rounded hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none'
                                >
                                  <span className='material-symbols-rounded text-[16px] text-emerald-500'>
                                    point_of_sale
                                  </span>
                                  <span className='font-bold text-(--text-primary)'>0</span>
                                  <span className='text-(--text-tertiary)'>
                                    {isRTL ? 'معاملة' : 'Transactions'}
                                  </span>
                                </div>
                              </Tooltip>

                              <div className='hidden sm:block w-px h-3 bg-black/10 dark:bg-white/10'></div>

                              {/* Items Stat */}
                              <Tooltip
                                position='top'
                                content={
                                  <div className='flex items-center gap-2'>
                                    <span>
                                      {isRTL ? 'أدوية:' : 'Medicine:'}{' '}
                                      <span className='font-bold ml-0.5'>0</span>
                                    </span>
                                    <span className='w-px h-2.5 bg-white/30 dark:bg-black/30'></span>
                                    <span>
                                      {isRTL ? 'تجميل:' : 'Cosmetics:'}{' '}
                                      <span className='font-bold ml-0.5'>0</span>
                                    </span>
                                  </div>
                                }
                              >
                                <div
                                  tabIndex={0}
                                  className='group relative flex items-center gap-1.5 p-1 -m-1 rounded hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none'
                                >
                                  <span className='material-symbols-rounded text-[16px] text-blue-500'>
                                    package_2
                                  </span>
                                  <span className='font-bold text-(--text-primary)'>0</span>
                                  <span className='text-(--text-tertiary)'>
                                    {isRTL ? 'منتج' : 'Items'}
                                  </span>
                                </div>
                              </Tooltip>

                              <div className='hidden sm:block w-px h-3 bg-black/10 dark:bg-white/10'></div>

                              {/* Days Stat */}
                              <Tooltip
                                position='top'
                                content={
                                  <div className='flex items-center gap-2'>
                                    <span>
                                      {isRTL ? 'حضور:' : 'Present:'}{' '}
                                      <span className='font-bold ml-0.5'>0</span>
                                    </span>
                                    <span className='w-px h-2.5 bg-white/30 dark:bg-black/30'></span>
                                    <span>
                                      {isRTL ? 'غياب/إجازة:' : 'Absent:'}{' '}
                                      <span className='font-bold ml-0.5'>0</span>
                                    </span>
                                  </div>
                                }
                              >
                                <div
                                  tabIndex={0}
                                  className='group relative flex items-center gap-1.5 p-1 -m-1 rounded hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none'
                                >
                                  <span className='material-symbols-rounded text-[16px] text-blue-400'>
                                    schedule
                                  </span>
                                  <span className='font-bold text-(--text-primary)'>0</span>
                                  <span className='text-(--text-tertiary)'>
                                    {isRTL ? 'يوم عمل' : 'Days'}
                                  </span>
                                </div>
                              </Tooltip>
                            </div>
                          </div>

                          <div className='mt-4'>
                            <button
                              type='button'
                              onClick={() => toggleCredentials(ws.id)}
                              className='flex items-center gap-1.5 text-[10px] font-bold text-(--text-tertiary) uppercase hover:text-(--text-primary) transition-colors'
                            >
                              <span className='material-symbols-rounded text-[14px]'>
                                {visibleCredentials.has(ws.id) ? 'visibility' : 'visibility_off'}
                              </span>
                              {isRTL ? 'بيانات الدخول' : 'Credentials'}
                            </button>

                            {visibleCredentials.has(ws.id) && (
                              <div className='mt-4 space-y-3'>
                                <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                                  <div className='flex gap-4'>
                                    <div>
                                      <span className='text-[10px] font-bold text-(--text-tertiary) uppercase flex items-center gap-1'>
                                        <span className='material-symbols-rounded text-[14px]'>
                                          account_circle
                                        </span>
                                        {t.login.username}
                                      </span>
                                      <div
                                        className='text-xs font-mono mt-1 text-(--text-primary) bg-black/5 dark:bg-black/20 px-2 py-1 rounded w-fit'
                                        dir='ltr'
                                      >
                                        {ws.username || '—'}
                                      </div>
                                    </div>
                                    <div>
                                      <span className='text-[10px] font-bold text-(--text-tertiary) uppercase flex items-center gap-1'>
                                        <span className='material-symbols-rounded text-[14px]'>
                                          key
                                        </span>
                                        {t.login.password || 'Password'}
                                      </span>
                                      <div
                                        className={`text-xs font-mono mt-1 px-2 py-1 rounded w-fit max-w-[130px] truncate ${ws.password ? 'text-(--text-primary) bg-black/5 dark:bg-black/20' : 'text-red-500 bg-red-500/10'}`}
                                        dir='ltr'
                                      >
                                        {ws.password || (isRTL ? 'لم يتم تعيينه' : 'Not Set')}
                                      </div>
                                    </div>
                                  </div>
                                  <div className='grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto'>
                                    <button
                                      type='button'
                                      onClick={() => {
                                        setEditingPasswordId(
                                          editingPasswordId === ws.id ? null : ws.id
                                        );
                                        setNewPassword('');
                                      }}
                                      className='flex items-center justify-center gap-1 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 px-2 py-1.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold transition-colors w-full sm:w-auto'
                                    >
                                      <span className='material-symbols-rounded text-[14px]'>
                                        password
                                      </span>
                                      {ws.password
                                        ? t.employeeProfile.changePassword || 'Change Password'
                                        : isRTL
                                          ? 'إنشاء كلمة مرور'
                                          : 'Create Password'}
                                    </button>

                                    <button
                                      type='button'
                                      disabled={
                                        isRegisteringFingerprint === ws.id ||
                                        !onRegisterWorkspaceFingerprint
                                      }
                                      onClick={async () => {
                                        try {
                                          setIsRegisteringFingerprint(ws.id);
                                          await onRegisterWorkspaceFingerprint?.(
                                            ws.id,
                                            ws.username || ''
                                          );
                                        } finally {
                                          setIsRegisteringFingerprint(null);
                                        }
                                      }}
                                      className={`flex items-center justify-center gap-1 px-2 py-1.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold transition-colors disabled:opacity-50 w-full sm:w-auto ${
                                        ws.biometricCredentialId
                                          ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                          : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-(--text-tertiary)'
                                      }`}
                                    >
                                      {isRegisteringFingerprint === ws.id ? (
                                        <span className='w-3.5 h-3.5 border-2 rounded-full animate-spin border-t-transparent'></span>
                                      ) : (
                                        <span className='material-symbols-rounded text-[14px]'>
                                          fingerprint
                                        </span>
                                      )}
                                      {ws.biometricCredentialId
                                        ? t.employeeProfile.fingerprintEnabled ||
                                          'Fingerprint Enabled'
                                        : t.employeeProfile.setupPasskey || 'Setup Passkey'}
                                    </button>
                                  </div>
                                </div>

                                {editingPasswordId === ws.id && (
                                  <div className='flex items-center gap-2 bg-black/10 p-2 rounded'>
                                    <input
                                      type='password'
                                      placeholder={t.employeeProfile.newPassword || 'New Password'}
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      className='flex-1 bg-transparent text-xs border-b border-black/20 dark:border-white/20 px-1 py-1 focus:outline-none focus:border-primary-500'
                                    />
                                    <button
                                      type='button'
                                      disabled={
                                        !newPassword ||
                                        isUpdatingPassword ||
                                        !onUpdateWorkspacePassword
                                      }
                                      onClick={async () => {
                                        try {
                                          setIsUpdatingPassword(true);
                                          await onUpdateWorkspacePassword?.(ws.id, newPassword);
                                          setEditingPasswordId(null);
                                          setNewPassword('');
                                        } finally {
                                          setIsUpdatingPassword(false);
                                        }
                                      }}
                                      className='px-3 py-1 bg-primary-500 text-white rounded text-[10px] font-bold disabled:opacity-50'
                                    >
                                      {isUpdatingPassword
                                        ? '...'
                                        : t.employeeProfile.save || 'Save'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className='space-y-3 pt-2'>
            <h4 className='text-xs font-bold uppercase tracking-wider text-primary-500'>
              {t.employeeProfile.overview}
            </h4>
            {isLoading ? (
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2 animate-pulse'>
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`${PROFILE_GLASS_CARD_NO_BORDER} flex flex-col items-center justify-center py-3 ${i === 2 ? 'col-span-2 sm:col-span-1' : ''}`}
                  >
                    <div className='w-6 h-6 bg-black/10 dark:bg-white/10 rounded-full mb-2'></div>
                    <div className='h-5 bg-black/10 dark:bg-white/10 rounded w-8 mb-1'></div>
                    <div className='h-2 bg-black/10 dark:bg-white/10 rounded w-16'></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                <div
                  className={`${PROFILE_GLASS_CARD_NO_BORDER} flex flex-col items-center justify-center py-3`}
                >
                  <span className='material-symbols-rounded text-[22px] text-emerald-500'>
                    how_to_reg
                  </span>
                  <p className='text-lg font-bold text-(--text-primary) mt-1'>
                    {acceptedRequests.length}
                  </p>
                  <p className='text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider'>
                    {t.employeeProfile.employers}
                  </p>
                </div>
                <div
                  className={`${PROFILE_GLASS_CARD_NO_BORDER} flex flex-col items-center justify-center py-3`}
                >
                  <span className='material-symbols-rounded text-[22px] text-amber-500'>
                    pending_actions
                  </span>
                  <p className='text-lg font-bold text-(--text-primary) mt-1'>
                    {requests.filter((r) => r.status === 'pending').length}
                  </p>
                  <p className='text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider'>
                    {t.employeeProfile.pending}
                  </p>
                </div>
                <div
                  className={`${PROFILE_GLASS_CARD_NO_BORDER} flex flex-col items-center justify-center py-3 col-span-2 sm:col-span-1`}
                >
                  <span className='material-symbols-rounded text-[22px] text-primary-500'>
                    work_history
                  </span>
                  <p className='text-lg font-bold text-(--text-primary) mt-1'>{requests.length}</p>
                  <p className='text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider'>
                    {t.employeeProfile.totalRequests}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
