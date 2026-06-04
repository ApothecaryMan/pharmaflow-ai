import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Camera, Pencil, Save, X } from 'lucide-react';
import type { UserProfile, EmploymentRequest } from '../../../types';
import { renderBanner, BANNER_STYLES } from '../../../utils/banners';
import { PROFILE_GLASS_CARD_BASE } from '../../../utils/themeStyles';
import { MAX_UPLOAD_SIZE_KB } from '../../../config';

type BannerId = typeof BANNER_STYLES[number]['id'];

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const readFileAsBase64 = (file: File, t: Translations): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_UPLOAD_SIZE_KB * 1024) {
      reject(new Error(t.employeeProfile.fileTooLarge.replace('{{size}}', MAX_UPLOAD_SIZE_KB.toString())));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
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

export const EditField: React.FC<EditFieldProps> = ({ icon, label, value, onChange, dir = 'ltr', type = 'text', disabled = false }) => (
  <div className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-2.5 ${disabled ? 'opacity-60' : ''}`}>
    <span className="material-symbols-rounded text-[18px] text-primary-500 shrink-0">{icon}</span>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] text-(--text-tertiary) font-bold truncate">{label}</p>
      {onChange && !disabled ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          dir={dir}
          className="w-full bg-transparent border-none outline-hidden text-xs font-semibold text-(--text-primary) p-0 m-0 focus:ring-0 placeholder:text-(--text-tertiary)"
          placeholder={label}
        />
      ) : (
        <p className="text-xs font-semibold text-(--text-primary) truncate" dir={dir}>{value}</p>
      )}
    </div>
  </div>
);

interface ProfileTabProps {
  profile: UserProfile | null;
  sessionName: string | undefined;
  sessionUsername: string | undefined;
  requests: EmploymentRequest[];
  isRTL: boolean;
  t: Translations;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile,
  sessionName,
  sessionUsername,
  requests,
  isRTL,
  t,
  onUpdateProfile,
  isEditing,
  setIsEditing
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [editFields, setEditFields] = useState({
    fullName: '',
    nameArabic: '',
    email: '',
    phone: '',
    licenseNumber: '',
  });
  const [coverStyle, setCoverStyle] = useState<BannerId>((profile?.coverStyle as BannerId) || 'pattern');
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const [removeImage, setRemoveImage] = useState(false);
  const [copied, setCopied] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

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
    () => requests.filter(r => r.status === 'accepted'),
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
      } as Partial<UserProfile>);
      setPreview(undefined);
      setRemoveImage(false);
      setIsEditing(false);
    } catch {
      // error handled upstream
    } finally {
      setIsSaving(false);
    }
  }, [onUpdateProfile, editFields, preview, removeImage, setIsEditing]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await readFileAsBase64(file, t);
      setPreview(base64);
      setRemoveImage(false);
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, [t]);

  const handleImageRemove = useCallback(() => {
    setPreview(undefined);
    setRemoveImage(true);
  }, []);

  const handleCoverChange = useCallback((id: BannerId) => {
    setCoverStyle(id);
    onUpdateProfile?.({ coverStyle: id } as Partial<UserProfile>);
  }, [onUpdateProfile]);

  const avatarSrc = removeImage ? undefined : (preview || (profile?.image?.startsWith('data:image/') ? profile.image : undefined));

  return (
    <div className="animate-fade-in">
      {/* Banner */}
      <div className="relative w-full aspect-[9/3] bg-(--bg-secondary) overflow-hidden select-none rounded-2xl group/cover">
        {renderBanner(coverStyle, { x: 0, y: 0 }, 1.2)}

        {/* Pattern picker overlay */}
        {isEditing && (
          <div className="absolute top-3 end-3 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 z-20">
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
        )}
      </div>

      {/* Avatar & Header */}
      <div className="relative px-6 pb-6 -mt-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5 mb-4 relative z-10">
          <div className="relative shrink-0">
            {/* Avatar with image support */}
            <label
              className={`block ${isEditing ? 'cursor-pointer' : ''} group`}
              title={isEditing ? t.employeeProfile.fileTooLarge.replace('{{size}}', MAX_UPLOAD_SIZE_KB.toString()) : undefined}
            >
              <div className="w-28 h-28 rounded-full border-4 border-(--bg-page-surface) overflow-hidden bg-(--bg-secondary) shadow-md flex items-center justify-center relative">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-primary-600/30 text-primary-500 text-3xl font-bold">
                    {getInitials(displayName)}
                  </div>
                )}
                {onUpdateProfile && isEditing && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-full flex items-center justify-center gap-3">
                    <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    {avatarSrc && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleImageRemove(); }}
                        type='button'
                        className="text-white opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-300"
                      >
                        <span className="material-symbols-rounded text-[22px]">delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              {onUpdateProfile && isEditing && (
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              )}
            </label>
            <span className="absolute bottom-1 end-1 w-7 h-7 rounded-full border-4 border-(--bg-page-surface) bg-emerald-500 flex items-center justify-center">
              <span className="material-symbols-rounded text-white text-[10px] font-bold select-none">check</span>
            </span>
          </div>

          <div className="flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl font-bold text-(--text-primary) flex items-center gap-2 flex-wrap">
                {displayName}
                {displayUsername && (
                  <span
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
                    className="text-xs font-normal text-(--text-secondary) bg-white/10 dark:bg-black/25 px-2 py-0.5 rounded-md border border-white/10 dark:border-white/5 font-mono select-all cursor-pointer"
                    dir="ltr"
                  >
                    {copied ? t.employeeProfile.copied : `@${displayUsername}`}
                  </span>
                )}
              </h3>
            </div>
            <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mt-1">
              {t.employeeProfile.independentEmployee}
            </p>
          </div>

        </div>

        {/* Info Grid or Edit Form */}
        <div className="space-y-4">
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500">
                {t.employeeProfile.personalInformation}
              </h4>
              {onUpdateProfile && (isEditing ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-(--bg-secondary) hover:bg-(--color-error)/10 text-(--text-tertiary) hover:text-(--color-error) text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
                    type='button'
                  >
                    <X className="w-3 h-3" />
                    {t.employeeProfile.cancel}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
                    type='button'
                  >
                    {isSaving ? (
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    {t.employeeProfile.save}
                  </button>
                </div>
              ) : (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-(--bg-secondary) hover:bg-primary-500/10 text-(--text-tertiary) hover:text-primary-500 text-[11px] font-bold transition-all active:scale-95"
                  type='button'
                >
                  <Pencil className="w-3 h-3" />
                  {t.employeeProfile.edit}
                </button>
              ))}
            </div>
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <EditField
                  icon='badge'
                  label={t.employeeProfile.fullName}
                  value={editFields.fullName}
                  onChange={v => setEditFields(prev => ({ ...prev, fullName: v }))}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <EditField
                  icon='translate'
                  label={t.employeeProfile.nameArabic}
                  value={editFields.nameArabic}
                  onChange={v => setEditFields(prev => ({ ...prev, nameArabic: v }))}
                  dir='rtl'
                />
                <EditField
                  icon='alternate_email'
                  label={t.employeeProfile.username}
                  value={`@${displayUsername}`}
                  dir='ltr'
                  disabled
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
                  onChange={v => setEditFields(prev => ({ ...prev, phone: v }))}
                  dir='ltr'
                  type='tel'
                />
                <EditField
                  icon='health_and_safety'
                  label={t.employeeProfile.licenseNo}
                  value={editFields.licenseNumber}
                  onChange={v => setEditFields(prev => ({ ...prev, licenseNumber: v }))}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <div className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-2.5`}>
                  <span className="material-symbols-rounded text-[18px] text-primary-500">calendar_month</span>
                  <div className="min-w-0">
                    <p className="text-[10px] text-(--text-tertiary) font-bold truncate">{t.employeeProfile.memberSince}</p>
                    <p className="text-xs font-semibold text-(--text-primary) truncate">{memberSince}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: 'badge', label: t.employeeProfile.fullName, value: displayName },
                  ...(profile?.nameArabic ? [{ icon: 'translate', label: t.employeeProfile.nameArabic, value: profile.nameArabic }] : []),
                  { icon: 'alternate_email', label: t.employeeProfile.username, value: `@${displayUsername}` },
                  ...(profile?.email ? [{ icon: 'mail', label: t.employeeProfile.email, value: profile.email }] : []),
                  ...(profile?.phone ? [{ icon: 'phone', label: t.employeeProfile.phone, value: profile.phone }] : []),
                  ...(profile?.licenseNumber ? [{ icon: 'health_and_safety', label: t.employeeProfile.licenseNo, value: profile.licenseNumber }] : []),
                  { icon: 'calendar_month', label: t.employeeProfile.memberSince, value: memberSince },
                ].map(item => (
                  <div key={item.label} className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-2.5`}>
                    <span className="material-symbols-rounded text-[18px] text-primary-500">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-(--text-tertiary) font-bold truncate">{item.label}</p>
                      <p className="text-xs font-semibold text-(--text-primary) truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500">
              {t.employeeProfile.overview}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className={`${PROFILE_GLASS_CARD_BASE} flex flex-col items-center justify-center py-3`}>
                <span className="material-symbols-rounded text-[22px] text-emerald-500">how_to_reg</span>
                <p className="text-lg font-bold text-(--text-primary) mt-1">{acceptedRequests.length}</p>
                <p className="text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider">{t.employeeProfile.employers}</p>
              </div>
              <div className={`${PROFILE_GLASS_CARD_BASE} flex flex-col items-center justify-center py-3`}>
                <span className="material-symbols-rounded text-[22px] text-amber-500">pending_actions</span>
                <p className="text-lg font-bold text-(--text-primary) mt-1">{requests.filter(r => r.status === 'pending').length}</p>
                <p className="text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider">{t.employeeProfile.pending}</p>
              </div>
              <div className={`${PROFILE_GLASS_CARD_BASE} flex flex-col items-center justify-center py-3 col-span-2 sm:col-span-1`}>
                <span className="material-symbols-rounded text-[22px] text-primary-500">work_history</span>
                <p className="text-lg font-bold text-(--text-primary) mt-1">{requests.length}</p>
                <p className="text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider">{t.employeeProfile.totalRequests}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
