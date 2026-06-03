import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Briefcase, Building2, CheckCircle2, XCircle, Clock, Pencil, Save, X, Camera, ImageIcon, FileText } from 'lucide-react';
import type { UserProfile, EmploymentRequest } from '../../types';
import { renderBanner, BANNER_STYLES } from '../../utils/banners';
import { PROFILE_GLASS_CARD_BASE } from '../../utils/themeStyles';
import { SegmentedControl } from '../common/SegmentedControl';

interface EmployeePortalProfileProps {
  profile: UserProfile | null;
  sessionName: string | undefined;
  sessionUsername: string | undefined;
  requests: EmploymentRequest[];
  language?: string;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
}

type ProfileTab = 'profile' | 'history' | 'documents';

type BannerId = typeof BANNER_STYLES[number]['id'];

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const statusIcon = (status: string) => {
  switch (status) {
    case 'accepted': return <CheckCircle2 className="w-3.5 h-3.5" />;
    case 'rejected': return <XCircle className="w-3.5 h-3.5" />;
    default: return <Clock className="w-3.5 h-3.5" />;
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case 'accepted': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20';
    case 'rejected': return 'text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20';
    default: return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20';
  }
};

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 500 * 1024) {
      reject(new Error('File too large (max 500KB)'));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const EmployeePortalProfile: React.FC<EmployeePortalProfileProps> = ({
  profile,
  sessionName,
  sessionUsername,
  requests,
  language,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [isEditing, setIsEditing] = useState(false);
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
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const isRTL = language === 'AR';

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

  const hasDocuments = !!(profile?.nationalIdCard || profile?.nationalIdCardBack || profile?.mainSyndicateCard || profile?.subSyndicateCard);

  const tabs = [
    { value: 'profile' as const, label: isRTL ? 'الملف الشخصي' : 'Profile', icon: 'person' },
    { value: 'history' as const, label: isRTL ? 'السجل الوظيفي' : 'Work History', icon: 'work_history' },
    ...(hasDocuments || isEditing ? [{ value: 'documents' as const, label: isRTL ? 'المستندات' : 'Documents', icon: 'description' }] : []),
  ];

  const startEditing = useCallback(() => {
    setEditFields({
      fullName: profile?.fullName || sessionName || '',
      nameArabic: profile?.nameArabic || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      licenseNumber: profile?.licenseNumber || '',
    });
    setIsEditing(true);
  }, [profile, sessionName]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setPreview(undefined);
    setRemoveImage(false);
    setEditFields({ fullName: '', nameArabic: '', email: '', phone: '', licenseNumber: '' });
  }, []);

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
  }, [onUpdateProfile, editFields, preview]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await readFileAsBase64(file);
      setPreview(base64);
      setRemoveImage(false);
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, []);

  const handleImageRemove = useCallback(() => {
    setPreview(undefined);
    setRemoveImage(true);
  }, []);

  const handleCoverChange = useCallback((id: BannerId) => {
    setCoverStyle(id);
    onUpdateProfile?.({ coverStyle: id } as Partial<UserProfile>);
  }, [onUpdateProfile]);

  const handleDocUpload = useCallback(async (field: keyof Pick<UserProfile, 'nationalIdCard' | 'nationalIdCardBack' | 'mainSyndicateCard' | 'subSyndicateCard'>, file: File) => {
    if (!onUpdateProfile) return;
    setUploadingDoc(field);
    try {
      const base64 = await readFileAsBase64(file);
      await onUpdateProfile({ [field]: base64 } as Partial<UserProfile>);
    } catch (err) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setUploadingDoc(null);
    }
  }, [onUpdateProfile]);

  const handleDocRemove = useCallback(async (field: keyof Pick<UserProfile, 'nationalIdCard' | 'nationalIdCardBack' | 'mainSyndicateCard' | 'subSyndicateCard'>) => {
    if (!onUpdateProfile) return;
    setDeletingDoc(field);
    try {
      await onUpdateProfile({ [field]: null } as unknown as Partial<UserProfile>);
    } finally {
      setDeletingDoc(null);
    }
  }, [onUpdateProfile]);

  const avatarSrc = removeImage ? undefined : (preview || (profile?.image?.startsWith('data:image/') ? profile.image : undefined));

  return (
    <div className="animate-fade-in text-(--text-primary)">
      {/* Tab Bar */}
      <SegmentedControl
        options={tabs}
        value={activeTab}
        onChange={setActiveTab}
        size="sm"
        className="mb-6"
        iconSize="16px"
      />

      {activeTab === 'profile' && (
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
                <label className={`block ${isEditing ? 'cursor-pointer' : ''} group`}>
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
                      <span className="text-xs font-normal text-(--text-secondary) bg-white/10 dark:bg-black/25 px-2 py-0.5 rounded-md border border-white/10 dark:border-white/5 font-mono select-all" dir="ltr">
                        @{displayUsername}
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mt-1">
                  {isRTL ? 'موظف مستقل' : 'Independent Employee'}
                </p>
              </div>

            </div>

            {/* Info Grid or Edit Form */}
            <div className="space-y-4">
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500">
                    {isRTL ? 'المعلومات الشخصية' : 'Personal Information'}
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
                        {isRTL ? 'إلغاء' : 'Cancel'}
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
                        {isRTL ? 'حفظ' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startEditing}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-(--bg-secondary) hover:bg-primary-500/10 text-(--text-tertiary) hover:text-primary-500 text-[11px] font-bold transition-all active:scale-95"
                      type='button'
                    >
                      <Pencil className="w-3 h-3" />
                      {isRTL ? 'تعديل' : 'Edit'}
                    </button>
                  ))}
                </div>
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <EditField
                      icon='badge'
                      label={isRTL ? 'الاسم الكامل' : 'Full Name'}
                      value={editFields.fullName}
                      onChange={v => setEditFields(prev => ({ ...prev, fullName: v }))}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                    <EditField
                      icon='translate'
                      label={isRTL ? 'الاسم بالعربية' : 'Name (Arabic)'}
                      value={editFields.nameArabic}
                      onChange={v => setEditFields(prev => ({ ...prev, nameArabic: v }))}
                      dir='rtl'
                    />
                    <EditField
                      icon='alternate_email'
                      label={isRTL ? 'اسم المستخدم' : 'Username'}
                      value={`@${displayUsername}`}
                      dir='ltr'
                      disabled
                    />
                    <EditField
                      icon='mail'
                      label={isRTL ? 'البريد الإلكتروني' : 'Email'}
                      value={editFields.email}
                      dir='ltr'
                      type='email'
                      disabled
                    />
                    <EditField
                      icon='phone'
                      label={isRTL ? 'الهاتف' : 'Phone'}
                      value={editFields.phone}
                      onChange={v => setEditFields(prev => ({ ...prev, phone: v }))}
                      dir='ltr'
                      type='tel'
                    />
                    <EditField
                      icon='health_and_safety'
                      label={isRTL ? 'رقم الترخيص' : 'License No.'}
                      value={editFields.licenseNumber}
                      onChange={v => setEditFields(prev => ({ ...prev, licenseNumber: v }))}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                    <div className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-2.5`}>
                      <span className="material-symbols-rounded text-[18px] text-primary-500">calendar_month</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-(--text-tertiary) font-bold truncate">{isRTL ? 'عضو منذ' : 'Member Since'}</p>
                        <p className="text-xs font-semibold text-(--text-primary) truncate">{memberSince}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: 'badge', label: isRTL ? 'الاسم الكامل' : 'Full Name', value: displayName },
                      ...(profile?.nameArabic ? [{ icon: 'translate', label: isRTL ? 'الاسم بالعربية' : 'Name (Arabic)', value: profile.nameArabic }] : []),
                      { icon: 'alternate_email', label: isRTL ? 'اسم المستخدم' : 'Username', value: `@${displayUsername}` },
                      ...(profile?.email ? [{ icon: 'mail', label: isRTL ? 'البريد الإلكتروني' : 'Email', value: profile.email }] : []),
                      ...(profile?.phone ? [{ icon: 'phone', label: isRTL ? 'الهاتف' : 'Phone', value: profile.phone }] : []),
                      ...(profile?.licenseNumber ? [{ icon: 'health_and_safety', label: isRTL ? 'رقم الترخيص' : 'License No.', value: profile.licenseNumber }] : []),
                      { icon: 'calendar_month', label: isRTL ? 'عضو منذ' : 'Member Since', value: memberSince },
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
                  {isRTL ? 'نظرة عامة' : 'Overview'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className={`${PROFILE_GLASS_CARD_BASE} flex flex-col items-center justify-center py-3`}>
                    <span className="material-symbols-rounded text-[22px] text-emerald-500">how_to_reg</span>
                    <p className="text-lg font-bold text-(--text-primary) mt-1">{acceptedRequests.length}</p>
                    <p className="text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider">{isRTL ? 'جهات العمل' : 'Employers'}</p>
                  </div>
                  <div className={`${PROFILE_GLASS_CARD_BASE} flex flex-col items-center justify-center py-3`}>
                    <span className="material-symbols-rounded text-[22px] text-amber-500">pending_actions</span>
                    <p className="text-lg font-bold text-(--text-primary) mt-1">{requests.filter(r => r.status === 'pending').length}</p>
                    <p className="text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider">{isRTL ? 'معلق' : 'Pending'}</p>
                  </div>
                  <div className={`${PROFILE_GLASS_CARD_BASE} flex flex-col items-center justify-center py-3 col-span-2 sm:col-span-1`}>
                    <span className="material-symbols-rounded text-[22px] text-primary-500">work_history</span>
                    <p className="text-lg font-bold text-(--text-primary) mt-1">{requests.length}</p>
                    <p className="text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider">{isRTL ? 'إجمالي الطلبات' : 'Total Requests'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="animate-fade-in space-y-6">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {isRTL ? 'المستندات الرسمية' : 'Official Documents'}
            </h4>

            {/* National ID - Front */}
            <DocCard
              title={isRTL ? 'البطاقة الشخصية (الوجه الأمامي)' : 'National ID (Front)'}
              image={profile?.nationalIdCard}
              onUpload={onUpdateProfile ? (file) => handleDocUpload('nationalIdCard', file) : undefined}
              onRemove={onUpdateProfile ? () => handleDocRemove('nationalIdCard') : undefined}
              isExpanded={expandedDocs.has('nationalIdCard')}
              onToggleExpand={() => setExpandedDocs(prev => { const n = new Set(prev); n.has('nationalIdCard') ? n.delete('nationalIdCard') : n.add('nationalIdCard'); return n; })}
              loading={uploadingDoc === 'nationalIdCard'}
              deleting={deletingDoc === 'nationalIdCard'}
            />

            {/* National ID - Back */}
            <DocCard
              title={isRTL ? 'البطاقة الشخصية (الوجه الخلفي)' : 'National ID (Back)'}
              image={profile?.nationalIdCardBack}
              onUpload={onUpdateProfile ? (file) => handleDocUpload('nationalIdCardBack', file) : undefined}
              onRemove={onUpdateProfile ? () => handleDocRemove('nationalIdCardBack') : undefined}
              isExpanded={expandedDocs.has('nationalIdCardBack')}
              onToggleExpand={() => setExpandedDocs(prev => { const n = new Set(prev); n.has('nationalIdCardBack') ? n.delete('nationalIdCardBack') : n.add('nationalIdCardBack'); return n; })}
              loading={uploadingDoc === 'nationalIdCardBack'}
              deleting={deletingDoc === 'nationalIdCardBack'}
            />

            {/* Syndicate Card */}
            <DocCard
              title={isRTL ? 'كارنيه النقابة' : 'Syndicate Card'}
              image={profile?.mainSyndicateCard}
              onUpload={onUpdateProfile ? (file) => handleDocUpload('mainSyndicateCard', file) : undefined}
              onRemove={onUpdateProfile ? () => handleDocRemove('mainSyndicateCard') : undefined}
              isExpanded={expandedDocs.has('mainSyndicateCard')}
              onToggleExpand={() => setExpandedDocs(prev => { const n = new Set(prev); n.has('mainSyndicateCard') ? n.delete('mainSyndicateCard') : n.add('mainSyndicateCard'); return n; })}
              loading={uploadingDoc === 'mainSyndicateCard'}
              deleting={deletingDoc === 'mainSyndicateCard'}
            />

            {/* Sub Syndicate Card */}
            <DocCard
              title={isRTL ? 'كارنيه النقابة الفرعية' : 'Sub Syndicate Card'}
              image={profile?.subSyndicateCard}
              onUpload={onUpdateProfile ? (file) => handleDocUpload('subSyndicateCard', file) : undefined}
              onRemove={onUpdateProfile ? () => handleDocRemove('subSyndicateCard') : undefined}
              isExpanded={expandedDocs.has('subSyndicateCard')}
              onToggleExpand={() => setExpandedDocs(prev => { const n = new Set(prev); n.has('subSyndicateCard') ? n.delete('subSyndicateCard') : n.add('subSyndicateCard'); return n; })}
              loading={uploadingDoc === 'subSyndicateCard'}
              deleting={deletingDoc === 'subSyndicateCard'}
            />
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="animate-fade-in space-y-6">
          {acceptedRequests.length === 0 ? (
            <div className="p-12 rounded-2xl border border-dashed border-(--border-color) bg-(--bg-secondary)/30 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-(--bg-tertiary) flex items-center justify-center mb-3">
                <Briefcase className="w-7 h-7 text-(--text-tertiary)" />
              </div>
              <h4 className="text-base font-medium text-(--text-primary) mb-1">
                {isRTL ? 'لا يوجد سجل وظيفي بعد' : 'No Work History Yet'}
              </h4>
              <p className="text-sm text-(--text-tertiary) max-w-sm">
                {isRTL
                  ? 'عندما تقبل طلب توظيف من إحدى الصيدليات، سيظهر هنا في سجل عملك.'
                  : 'When you accept an employment request from a pharmacy, it will appear here in your work history.'}
              </p>
            </div>
          ) : (
            <div className="relative before:absolute before:top-2 before:bottom-2 before:start-3.5 before:w-0.5 before:bg-(--border-divider) space-y-4">
              {acceptedRequests.map((req) => (
                <div key={req.id} className="relative ps-8 flex items-start gap-3">
                  <div className="absolute start-1.5 top-2 w-4 h-4 rounded-full border-4 border-(--bg-page-surface) bg-primary-500 shadow-sm" />
                  <div className={`${PROFILE_GLASS_CARD_BASE} flex-1`}>
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-4 h-4 text-primary-500 shrink-0" />
                        <h5 className="text-xs font-bold text-(--text-primary) truncate">{req.orgName}</h5>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor(req.status)}`}>
                        {statusIcon(req.status)}
                        {req.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{req.role}</span>
                      {req.createdAt && (
                        <span className="text-[10px] text-(--text-tertiary)">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending Requests */}
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {isRTL ? 'الطلبات المعلقة' : 'Pending Requests'}
              </h4>
              <div className="space-y-2">
                {requests.filter(r => r.status === 'pending').map((req) => (
                  <div key={req.id} className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-3`}>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-(--text-primary) truncate">{req.orgName}</p>
                      <p className="text-[10px] text-(--text-tertiary) capitalize">{req.role}</p>
                    </div>
                    {req.createdAt && (
                      <span className="text-[10px] text-(--text-tertiary) whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

EmployeePortalProfile.displayName = 'EmployeePortalProfile';

// ---------------------------------------------------------------------------
// EditField sub-component
// ---------------------------------------------------------------------------

interface EditFieldProps {
  icon: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  dir?: string;
  type?: string;
  disabled?: boolean;
}

const EditField: React.FC<EditFieldProps> = ({ icon, label, value, onChange, dir = 'ltr', type = 'text', disabled = false }) => (
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

// ---------------------------------------------------------------------------
// DocCard sub-component
// ---------------------------------------------------------------------------

interface DocCardProps {
  title: string;
  image: string | undefined;
  onUpload?: (file: File) => void;
  onRemove?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  loading?: boolean;
  deleting?: boolean;
}

const DocCard: React.FC<DocCardProps> = ({ title, image, onUpload, onRemove, isExpanded, onToggleExpand, loading, deleting }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`${PROFILE_GLASS_CARD_BASE} p-3`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <ImageIcon className="w-4 h-4 text-primary-500 shrink-0" />
          <span className="text-xs font-bold text-(--text-primary) truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {image && (
            <button onClick={onToggleExpand} className="p-1 text-(--text-tertiary) hover:text-primary-500 transition-colors" type='button'>
              <span className="material-symbols-rounded text-[16px]">{isExpanded ? 'close_fullscreen' : 'open_in_full'}</span>
            </button>
          )}
          {!image && onUpload && (
            <>
              <button onClick={() => inputRef.current?.click()} className="p-1 text-(--text-tertiary) hover:text-primary-500 transition-colors" type='button' disabled={loading}>
                {loading ? (
                  <span className="w-[16px] h-[16px] border-2 border-(--text-tertiary)/30 border-t-(--text-tertiary) rounded-full animate-spin block" />
                ) : (
                  <span className="material-symbols-rounded text-[16px]">upload</span>
                )}
              </button>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            </>
          )}
          {image && onRemove && (
            <button onClick={onRemove} className="p-1 text-(--text-tertiary) hover:text-red-500 transition-colors" type='button' disabled={deleting}>
              {deleting ? (
                <span className="w-[16px] h-[16px] border-2 border-(--text-tertiary)/30 border-t-(--text-tertiary) rounded-full animate-spin block" />
              ) : (
                <span className="material-symbols-rounded text-[16px]">delete</span>
              )}
            </button>
          )}
          {!image && onUpload && (
            <span className="text-[10px] text-(--text-tertiary) font-medium">{'No file'}</span>
          )}
        </div>
      </div>
      {isExpanded && image && (
        <div className="mt-3 rounded-xl overflow-hidden border border-(--border-color)">
          <img src={image} alt={title} className="w-full object-cover" />
        </div>
      )}
    </div>
  );
};
