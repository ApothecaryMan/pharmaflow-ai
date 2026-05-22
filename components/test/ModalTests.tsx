import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Modal, BUTTON_CLOSE_BASE } from '../common/Modal';
import { FilterDropdown } from '../common/FilterDropdown';
import { SmartInput, SmartPhoneInput, SmartEmailInput } from '../common/SmartInputs';
import { INPUT_BASE, BUTTON_BASE, GLASS_CARD_BASE } from '../../utils/themeStyles';
import { BANNER_STYLES, renderBanner } from '../../utils/banners';

interface ModalTestsProps {
  color: string;
  t: (key: string) => string;
  language: 'EN' | 'AR';
}

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';

interface ProfileData {
  nameEN: string;
  nameAR: string;
  roleEN: string;
  roleAR: string;
  email: string;
  phone: string;
  addressEN: string;
  addressAR: string;
  employeeId: string;
  joined: string;
  shiftEN: string;
  shiftAR: string;
  license: string;
  nationalIdCard?: string;
  nationalIdCardBack?: string;
  mainSyndicateCard?: string;
  subSyndicateCard?: string;
}

const MOCK_ID_FRONT = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
  <rect width="100%" height="100%" rx="16" fill="url(%23idGrad)" />
  <defs>
    <linearGradient id="idGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%230f766e" />
      <stop offset="100%" stop-color="%231e3b8a" />
    </linearGradient>
  </defs>
  <rect x="30" y="35" width="55" height="42" rx="6" fill="%23f59e0b" opacity="0.85" />
  <path d="M30 56 H85 M57 35 V77" stroke="%23b45309" strokeWidth="1.5" />
  <rect x="290" y="35" width="80" height="100" rx="10" fill="%23ffffff" opacity="0.1" />
  <circle cx="330" cy="70" r="20" fill="%23ffffff" opacity="0.25" />
  <path d="M305 125 C305 105, 355 105, 355 125 Z" fill="%23ffffff" opacity="0.25" />
  <rect x="30" y="95" width="180" height="8" rx="2" fill="%23ffffff" opacity="0.7" />
  <rect x="30" y="115" width="220" height="6" rx="2" fill="%23ffffff" opacity="0.5" />
  <rect x="30" y="130" width="150" height="6" rx="2" fill="%23ffffff" opacity="0.5" />
  <text x="30" y="170" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" letter-spacing="1" opacity="0.4">NATIONAL ID CARD / البطاقة الشخصية</text>
  <rect x="30" y="190" width="340" height="35" rx="8" fill="%23ffffff" opacity="0.1" />
  <text x="45" y="212" fill="%23ffffff" font-family="monospace" font-size="13" font-weight="bold" letter-spacing="2" opacity="0.7">EGY 12345678901234 EMP-0042</text>
</svg>`;

const MOCK_ID_BACK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
  <rect width="100%" height="100%" rx="16" fill="url(%23idGradBack)" />
  <defs>
    <linearGradient id="idGradBack" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%231e293b" />
      <stop offset="100%" stop-color="%230f172a" />
    </linearGradient>
  </defs>
  <rect x="0" y="30" width="400" height="45" fill="%23000000" opacity="0.8" />
  <rect x="20" y="95" width="260" height="35" fill="%23ffffff" opacity="0.9" />
  <path d="M30 115 Q60 100, 90 120 T150 105 T210 115" stroke="%232563eb" strokeWidth="2" fill="none" opacity="0.6" />
  <rect x="300" y="95" width="80" height="35" fill="%23ffffff" opacity="0.8" />
  <path d="M310 100 V125 M315 100 V125 M318 100 V125 M324 100 V125 M328 100 V125 M335 100 V125 M340 100 V125 M348 100 V125 M354 100 V125 M358 100 V125 M362 100 V125 M368 100 V125 M372 100 V125" stroke="%23000000" strokeWidth="2" />
  <rect x="20" y="155" width="160" height="5" rx="1.5" fill="%23ffffff" opacity="0.3" />
  <rect x="20" y="170" width="220" height="5" rx="1.5" fill="%23ffffff" opacity="0.3" />
  <rect x="20" y="185" width="180" height="5" rx="1.5" fill="%23ffffff" opacity="0.3" />
  <circle cx="330" cy="180" r="25" fill="%2338bdf8" opacity="0.25" />
  <circle cx="330" cy="180" r="15" fill="%23818cf8" opacity="0.2" />
</svg>`;

const MOCK_SYNDICATE_MAIN = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
  <rect width="100%" height="100%" rx="16" fill="url(%23synGrad)" />
  <defs>
    <linearGradient id="synGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23047857" />
      <stop offset="100%" stop-color="%23065f46" />
    </linearGradient>
  </defs>
  <path d="M 200,60 L 200,140 M 160,100 L 240,100" stroke="%23ffffff" strokeWidth="18" stroke-linecap="round" opacity="0.08" />
  <text x="30" y="45" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" letter-spacing="0.5" opacity="0.9">EGYPTIAN PHARMACISTS SYNDICATE</text>
  <text x="30" y="62" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" opacity="0.7">نقابة صيادلة مصر</text>
  <line x1="30" y1="75" x2="370" y2="75" stroke="%23ffffff" strokeWidth="1" opacity="0.2" />
  <rect x="30" y="95" width="70" height="85" rx="8" fill="%23ffffff" opacity="0.1" />
  <circle cx="65" cy="125" r="16" fill="%23ffffff" opacity="0.25" />
  <path d="M45 168 C45 152, 85 152, 85 168 Z" fill="%23ffffff" opacity="0.25" />
  <text x="120" y="115" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" opacity="0.95">Ahmed Mohamed</text>
  <text x="120" y="132" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="11" opacity="0.8">Lic-9821 / عضوية رقم</text>
  <circle cx="330" cy="135" r="22" fill="%23fbbf24" opacity="0.8" />
  <polygon points="330,120 335,130 345,130 338,137 340,147 330,140 320,147 322,137 315,130 325,130" fill="%23b45309" />
  <rect x="0" y="205" width="400" height="45" fill="%23064e3b" />
  <text x="30" y="232" fill="%23ffffff" font-family="monospace" font-size="11" font-weight="bold" opacity="0.6">ACTIVE MEMBER • عضو عامل</text>
</svg>`;

const MOCK_SYNDICATE_SUB = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
  <rect width="100%" height="100%" rx="16" fill="url(%23subSynGrad)" />
  <defs>
    <linearGradient id="subSynGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%234f46e5" />
      <stop offset="100%" stop-color="%233730a3" />
    </linearGradient>
  </defs>
  <path d="M 200,60 L 200,140 M 160,100 L 240,100" stroke="%23ffffff" strokeWidth="18" stroke-linecap="round" opacity="0.08" />
  <text x="30" y="45" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" letter-spacing="0.5" opacity="0.9">EGYPTIAN PHARMACISTS SYNDICATE - SUB</text>
  <text x="30" y="62" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" opacity="0.7">نقابة صيادلة مصر - الفرعية</text>
  <line x1="30" y1="75" x2="370" y2="75" stroke="%23ffffff" strokeWidth="1" opacity="0.2" />
  <rect x="30" y="95" width="70" height="85" rx="8" fill="%23ffffff" opacity="0.1" />
  <circle cx="65" cy="125" r="16" fill="%23ffffff" opacity="0.25" />
  <path d="M45 168 C45 152, 85 152, 85 168 Z" fill="%23ffffff" opacity="0.25" />
  <text x="120" y="115" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" opacity="0.95">Ahmed Mohamed</text>
  <text x="120" y="132" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="11" opacity="0.8">Sub-9821 / عضوية فرعية رقم</text>
  <circle cx="330" cy="135" r="22" fill="%2338bdf8" opacity="0.8" />
  <path d="M320 135 L328 143 L342 127" stroke="%231e3a8a" strokeWidth="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  <rect x="0" y="205" width="400" height="45" fill="%231e1b4b" />
  <text x="30" y="232" fill="%23ffffff" font-family="monospace" font-size="11" font-weight="bold" opacity="0.6">SUB MEMBER • عضو فرعي</text>
</svg>`;

const LOCAL_TRANSLATIONS = {
  EN: {
    profileCard: 'Profile Card',
    personalProfile: 'Personal Profile',
    editProfile: 'Edit Profile',
    viewProfileDetails: 'View profile details',
    updatePersonalInfo: 'Update your personal information',
    generalInfo: 'General Info',
    employeeId: 'Employee ID',
    joined: 'Joined',
    shift: 'Shift',
    license: 'License',
    onlineStatus: 'Online Status',
    graphicsBanner: 'Graphics Banner',
    editStatusBio: 'Edit Status Bio',
    writeAboutYourself: 'Write something about yourself...',
    contactInfo: 'Contact Information',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    activityStats: 'Activity Stats',
    sales: 'Sales',
    attendance: 'Attendance',
    rating: 'Rating',
    achievements: 'Achievements',
    totalSalesAmount: 'Total Sales Amount',
    workingHours: 'Working Hours',
    permissions: 'Permissions',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    appearanceStatus: 'Appearance & Status',
    personalInfo: 'Personal Information',
    contactJobDetails: 'Contact & Job Details',
    nameEnglish: 'Name (English)',
    nameArabic: 'Name (Arabic)',
    roleEnglish: 'Role/Job (English)',
    roleArabic: 'Role/Job (Arabic)',
    shiftEnglish: 'Shift (English)',
    shiftArabic: 'Shift (Arabic)',
    addressEnglish: 'Address (English)',
    addressArabic: 'Address (Arabic)',
    staffBadge: 'Staff',
    devBadge: 'Active Developer',
    nitroBadge: 'Nitro Booster',
    aboutStatus: 'About & Status',
    statusOnline: 'Online',
    statusIdle: 'Idle',
    statusDnd: 'DND',
    statusOffline: 'Invisible',

    fullNameEnglish: 'Full Name (English)',
    fullNameArabic: 'Full Name (Arabic)',
    branch: 'Branch',
    unassigned: 'Unassigned',
    department: 'Department',
    role: 'Role',
    status: 'Status',
    position: 'Position',
    salary: 'Salary',
    notes: 'Notes',
    additionalNotes: 'Additional notes...',
    changeImage: 'Change Image',
    removeImage: 'Remove Image',
    imageTooLarge: 'Image too large (max 500KB)',
    maxSizeNotice: 'Maximum 500KB',
    newEmployee: 'New Employee',
    username: 'Username',
    usernamePlaceholder: 'Login Username',
    passkey: 'Passkey',
    setupPasskey: 'Setup Passkey',
    passkeySet: 'Passkey Set',
    password: 'Password',
    passwordPlaceholder: 'Login Password',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    enterCurrentPasswordToVerify: 'Enter current password to verify your identity',
    verify: 'Verify',
    verified: 'Verified',
    incorrectPassword: 'Incorrect password',
    deleteCurrentPasskey: 'Delete current passkey for this employee?',
    passkeyRegistrationFailed: 'Passkey registration failed',
    browserNotSupportPasskeys: 'Browser does not support Passkeys. Ensure you are on HTTPS or Localhost.',
    officialDocuments: 'Official Documents',
    nationalIdCard: 'National ID Card',
    uploadFront: 'Upload Front',
    clickToUploadFront: 'Click to upload front',
    syndicateCards: 'Syndicate Cards',
    mainSyndicateCard: 'Main Syndicate Card',
    sub: 'Sub',
    uploadMain: 'Upload Main',
    uploadSub: 'Upload Sub',
    uploadBack: 'Upload Back',
    fileTooLarge: 'File too large (max 500KB)',
    frontFace: 'Front Face',
    backFace: 'Back Face',
    noIdCardImages: 'No ID card images uploaded',
    noSyndicateCardImages: 'No syndicate card images uploaded',
    confirmReset: 'Are you sure you want to reset password?',
    resetLinkSent: 'Reset link sent to email.',
    resetViaEmail: 'Reset via Email?',
    enterPasswordError: 'Enter password',
    verifiedNewPasswordMsg: 'Verified! You can now enter the new password',
    setupPasskeySuccess: 'Passkey registered successfully (mocked)',

    branchOptions: [
      { id: '1', name: 'Main Branch' },
      { id: '2', name: 'Maadi Branch' },
    ],
    departmentOptions: [
      { key: 'pharmacy', label: 'Pharmacy' },
      { key: 'sales', label: 'Sales' },
      { key: 'logistics', label: 'Logistics' },
      { key: 'marketing', label: 'Marketing' },
    ],
    roleOptions: [
      { key: 'pharmacist-manager', label: 'Pharmacist Manager' },
      { key: 'pharmacist', label: 'Pharmacist' },
      { key: 'officeboy', label: 'Office Boy' },
    ],
    statusOptions: [
      { key: 'active', label: 'Active' },
      { key: 'inactive', label: 'Inactive' },
      { key: 'holiday', label: 'Holiday' },
    ],
  },
  AR: {
    profileCard: 'بطاقة الملف',
    personalProfile: 'الصفحة الشخصية',
    editProfile: 'تعديل الملف الشخصي',
    viewProfileDetails: 'عرض بيانات الملف الشخصي',
    updatePersonalInfo: 'تعديل البيانات الشخصية والتخصيص',
    generalInfo: 'بيانات عامة',
    employeeId: 'كود الموظف',
    joined: 'انضمام',
    shift: 'دوام العمل',
    license: 'التصريح',
    onlineStatus: 'الحالة الشخصية',
    graphicsBanner: 'خلفية الجرافيكس',
    editStatusBio: 'تعديل الحالة الشخصية',
    writeAboutYourself: 'اكتب شيئاً عن نفسك...',
    contactInfo: 'بيانات التواصل',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    address: 'العنوان',
    activityStats: 'إحصائيات الأنشطة',
    sales: 'المبيعات',
    attendance: 'الحضور',
    rating: 'التقييم',
    achievements: 'الانجازات',
    totalSalesAmount: 'مبلغ المبيعات الكلي',
    workingHours: 'عدد ساعات العمل',
    permissions: 'الصلاحيات',
    saveChanges: 'حفظ التغييرات',
    cancel: 'إلغاء',
    appearanceStatus: 'المظهر والحالة',
    personalInfo: 'البيانات الشخصية',
    contactJobDetails: 'بيانات الاتصال والوظيفة',
    nameEnglish: 'الاسم (بالإنجليزية)',
    nameArabic: 'الاسم (بالعربية)',
    roleEnglish: 'الدور/الوظيفة (بالإنجليزية)',
    roleArabic: 'الدور/الوظيفة (بالعربية)',
    shiftEnglish: 'الوردية (بالإنجليزية)',
    shiftArabic: 'الوردية (بالعربية)',
    addressEnglish: 'العنوان (بالإنجليزية)',
    addressArabic: 'العنوان (بالعربية)',
    staffBadge: 'موظف',
    devBadge: 'مطور نشط',
    nitroBadge: 'داعم نيترو',
    aboutStatus: 'الحالة والنبذة',
    statusOnline: 'متصل',
    statusIdle: 'خامل',
    statusDnd: 'مشغول',
    statusOffline: 'مخفي',

    fullNameEnglish: 'الاسم بالكامل (بالإنجليزية)',
    fullNameArabic: 'الاسم بالكامل (بالعربية)',
    branch: 'الفرع',
    unassigned: 'غير معين',
    department: 'القسم',
    role: 'الدور',
    status: 'الحالة',
    position: 'المسمى الوظيفي',
    salary: 'الراتب',
    notes: 'ملاحظات',
    additionalNotes: 'ملاحظات إضافية...',
    changeImage: 'تغيير الصورة',
    removeImage: 'إزالة الصورة',
    imageTooLarge: 'حجم الصورة كبير جداً (الحد الأقصى 500KB)',
    maxSizeNotice: 'الحد الأقصى 500KB',
    newEmployee: 'موظف جديد',
    username: 'اسم المستخدم',
    usernamePlaceholder: 'اسم مستخدم الدخول',
    passkey: 'مفتاح المرور (Passkey)',
    setupPasskey: 'إعداد مفتاح المرور',
    passkeySet: 'تم ضبط المفتاح',
    password: 'كلمة المرور',
    passwordPlaceholder: 'كلمة مرور الدخول',
    changePassword: 'تغيير كلمة المرور',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    enterCurrentPasswordToVerify: 'أدخل كلمة المرور الحالية للتحقق من هويتك',
    verify: 'تحقق',
    verified: 'تم التحقق',
    incorrectPassword: 'كلمة المرور غير صحيحة',
    deleteCurrentPasskey: 'هل تريد حذف مفتاح المرور الحالي لهذا الموظف؟',
    passkeyRegistrationFailed: 'فشل تسجيل مفتاح المرور',
    browserNotSupportPasskeys: 'هذا المتصفح لا يدعم مفاتيح المرور (Passkeys). تأكد من استخدام HTTPS أو Localhost.',
    officialDocuments: 'المستندات الرسمية',
    nationalIdCard: 'البطاقة الشخصية',
    uploadFront: 'رفع الوجه الأمامي',
    clickToUploadFront: 'اضغط لرفع الوجه الأمامي',
    syndicateCards: 'كارنيهات النقابة',
    mainSyndicateCard: 'كارنية النقابة الرئيسية',
    sub: 'الفرعية',
    uploadMain: 'رفع الكارنيه الرئيسي',
    uploadSub: 'رفع الكارنيه الفرعي',
    uploadBack: 'رفع الوجه الخلفي',
    fileTooLarge: 'حجم الملف كبير جداً (الحد الأقصى 500KB)',
    frontFace: 'الوجه الأمامي',
    backFace: 'الوجه الخلفي',
    noIdCardImages: 'لا توجد صور للبطاقة الشخصية',
    noSyndicateCardImages: 'لا توجد صور لكارنيهات النقابة',
    confirmReset: 'هل أنت متأكد من إعادة تعيين كلمة المرور؟',
    resetLinkSent: 'تم إرسال رابط إعادة التعيين للبريد الإلكتروني.',
    resetViaEmail: 'استعادة بالإيميل؟',
    enterPasswordError: 'أدخل كلمة المرور',
    verifiedNewPasswordMsg: 'تم التحقق! يمكنك الآن إدخال كلمة المرور الجديدة',
    setupPasskeySuccess: 'تم تسجيل مفتاح المرور بنجاح (محاكاة)',

    branchOptions: [
      { id: '1', name: 'الفرع الرئيسي' },
      { id: '2', name: 'فرع المعادي' },
    ],
    departmentOptions: [
      { key: 'pharmacy', label: 'الصيدلية' },
      { key: 'sales', label: 'المبيعات' },
      { key: 'logistics', label: 'الخدمات اللوجستية' },
      { key: 'marketing', label: 'التسويق' },
    ],
    roleOptions: [
      { key: 'pharmacist-manager', label: 'صيدلي مدير' },
      { key: 'pharmacist', label: 'صيدلي' },
      { key: 'officeboy', label: 'عامل مكتب' },
    ],
    statusOptions: [
      { key: 'active', label: 'نشط' },
      { key: 'inactive', label: 'غير نشط' },
      { key: 'holiday', label: 'إجازة' },
    ],
  }
};

interface ModalConfig {
  size?: ModalSize;
  title?: string;
  subtitle?: string;
  icon?: string;
  closeOnBackdropClick?: boolean;
  headerActions?: React.ReactNode;
  testType?: 'standard' | 'multipage' | 'profile-card' | 'edit-profile';
}

export const ModalTests: React.FC<ModalTestsProps> = ({ color, t, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({});
  const [activePage, setActivePage] = useState('page1');
  const [bannerStyle, setBannerStyle] = useState<string>('pharma');
  const [userStatus, setUserStatus] = useState<'online' | 'idle' | 'dnd' | 'offline'>('online');
  const [customBio, setCustomBio] = useState('');

  // Profile data state
  const [profileData, setProfileData] = useState<ProfileData>({
    nameEN: 'Ahmed Mohamed',
    nameAR: 'أحمد محمد',
    roleEN: 'Pharmacist Manager • Main Branch',
    roleAR: 'صيدلي مدير • الفرع الرئيسي',
    email: 'ahmed@pharmaflow.com',
    phone: '+20 100 123 4567',
    addressEN: 'Cairo, Egypt',
    addressAR: 'القاهرة، مصر',
    employeeId: 'EMP-0042',
    joined: '2024-01-15',
    shiftEN: 'Morning',
    shiftAR: 'صباحي',
    license: 'Lic-9821',
    nationalIdCard: MOCK_ID_FRONT,
    nationalIdCardBack: MOCK_ID_BACK,
    mainSyndicateCard: MOCK_SYNDICATE_MAIN,
    subSyndicateCard: MOCK_SYNDICATE_SUB
  });

  // Edit form states
  const [editForm, setEditForm] = useState<ProfileData>({ ...profileData });
  const [editBannerStyle, setEditBannerStyle] = useState<string>(bannerStyle);
  const [editUserStatus, setEditUserStatus] = useState(userStatus);
  const [editCustomBio, setEditCustomBio] = useState(customBio);
  const [editTab, setEditTab] = useState('appearance');

  // Sync default bio when language changes
  useEffect(() => {
    setCustomBio(
      language === 'AR'
        ? '💊 صيدلي نهاراً، ومطور برمجيات ليلاً. أعمل على إبقاء PharmaFlow AI يعمل بسلاسة!'
        : '💊 Pharmacist by day, developer by night. Keeping PharmaFlow AI running smoothly!'
    );
  }, [language]);

  const openModal = (config: ModalConfig) => {
    setModalConfig(config);
    setIsOpen(true);
    // Reset page on open if it is a multipage modal
    if (config.testType === 'multipage' || config.testType === 'profile-card') {
      setActivePage('page1');
    }
    if (config.testType === 'edit-profile') {
      // Sync form values on open
      setEditForm({ ...profileData });
      setEditBannerStyle(bannerStyle);
      setEditUserStatus(userStatus);
      setEditCustomBio(customBio);
      setEditTab('appearance');
    }
  };

  const TestButton: React.FC<{
    label: string;
    config: ModalConfig;
    icon?: string;
    variant?: 'primary' | 'secondary';
  }> = ({ label, config, icon = 'open_in_new', variant = 'secondary' }) => (
    <button
      onClick={() => openModal(config)}
      className={`
        flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
        ${variant === 'primary'
          ? `bg-primary-500 text-white hover:bg-primary-600 shadow-lg hover:shadow-xl`
          : 'bg-(--bg-secondary) hover:bg-(--bg-hover) text-(--text-primary) border border-(--border-divider)'
        }
      `}
      style={variant === 'primary' ? { backgroundColor: 'var(--color-primary-500, #3b82f6)' } : {}}
    >
      <span className='material-symbols-rounded text-[20px]'>{icon}</span>
      {label}
    </button>
  );

  const SectionCard: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({
    title,
    icon,
    children,
  }) => (
    <div className='bg-(--bg-card) rounded-2xl p-6 shadow-xs border border-(--border-divider)'>
      <h3 className='text-lg font-semibold text-(--text-primary) flex items-center gap-2 mb-4'>
        <span
          className='material-symbols-rounded text-[24px]'
          style={{ color: 'var(--color-primary-500, #3b82f6)' }}
        >
          {icon}
        </span>
        {title}
      </h3>
      <div className='flex flex-wrap gap-3'>{children}</div>
    </div>
  );

  // Sample header action for testing
  const sampleHeaderAction = (
    <button className='px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'>
      Action
    </button>
  );

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div className='flex items-center gap-3'>
        <span
          className='material-symbols-rounded text-[32px]'
          style={{ color: 'var(--color-primary-500, #3b82f6)' }}
        >
          dialogs
        </span>
        <div>
          <h1 className='text-2xl font-bold text-(--text-primary) page-title'>
            {language === 'AR' ? 'اختبار النوافذ' : 'Modal Tests'}
          </h1>
          <p className='text-(--text-secondary) text-sm'>
            {language === 'AR'
              ? 'اختبر أحجام وميزات النوافذ المختلفة'
              : 'Test different modal sizes and features'}
          </p>
        </div>
      </div>

      {/* Size Tests */}
      <SectionCard title={language === 'AR' ? 'اختبار الأحجام' : 'Size Tests'} icon='aspect_ratio'>
        <TestButton
          label='SM'
          config={{ size: 'sm', title: 'Small Modal' }}
          icon='photo_size_select_small'
        />
        <TestButton label='MD' config={{ size: 'md', title: 'Medium Modal' }} icon='crop_square' />
        <TestButton label='LG' config={{ size: 'lg', title: 'Large Modal' }} icon='crop_din' />
        <TestButton
          label='XL'
          config={{ size: 'xl', title: 'Extra Large Modal' }}
          icon='crop_free'
        />
        <TestButton label='2XL' config={{ size: '2xl', title: '2XL Modal' }} icon='fullscreen' />
        <TestButton label='3XL' config={{ size: '3xl', title: '3XL Modal' }} icon='fit_screen' />
        <TestButton label='4XL' config={{ size: '4xl', title: '4XL Modal' }} icon='open_in_full' />
        <TestButton label='5XL' config={{ size: '5xl', title: '5XL Modal' }} icon='zoom_out_map' />
        <TestButton
          label='6XL'
          config={{ size: '6xl', title: '6XL Modal' }}
          icon='fullscreen_exit'
        />
        <TestButton
          label='Full'
          config={{ size: 'full', title: 'Full Width Modal' }}
          icon='aspect_ratio'
          variant='primary'
        />
      </SectionCard>

      {/* Feature Tests */}
      <SectionCard title={language === 'AR' ? 'اختبار الميزات' : 'Feature Tests'} icon='tune'>
        <TestButton
          label={language === 'AR' ? 'مع عنوان' : 'With Title'}
          config={{ title: 'Modal Title' }}
          icon='title'
        />
        <TestButton
          label={language === 'AR' ? 'مع عنوان فرعي' : 'With Subtitle'}
          config={{ title: 'Modal Title', subtitle: 'This is a subtitle description' }}
          icon='subtitles'
        />
        <TestButton
          label={language === 'AR' ? 'مع أيقونة' : 'With Icon'}
          config={{ title: 'Modal with Icon', icon: 'info' }}
          icon='add_reaction'
        />
        <TestButton
          label={language === 'AR' ? 'مع إجراءات' : 'With Header Actions'}
          config={{ title: 'Modal with Actions', headerActions: sampleHeaderAction }}
          icon='smart_button'
        />
        <TestButton
          label={language === 'AR' ? 'متعدد الصفحات' : 'Multi-page Modal'}
          config={{
            title: language === 'AR' ? 'نافذة متعددة الصفحات' : 'Multi-page Modal',
            testType: 'multipage',
            size: 'lg',
          }}
          icon='tab'
          variant='primary'
        />
        <TestButton
          label={language === 'AR' ? 'كامل الميزات' : 'Full Features'}
          config={{
            title: 'Complete Modal',
            subtitle: 'With all features enabled',
            icon: 'star',
            headerActions: sampleHeaderAction,
          }}
          icon='stars'
        />
      </SectionCard>

      {/* Behavior Tests */}
      <SectionCard title={language === 'AR' ? 'اختبار السلوك' : 'Behavior Tests'} icon='psychology'>
        <TestButton
          label={language === 'AR' ? 'إغلاق بالنقر على الخلفية' : 'Backdrop Click Close'}
          config={{ title: 'Click backdrop to close', closeOnBackdropClick: true }}
          icon='touch_app'
        />
        <TestButton
          label={language === 'AR' ? 'تعطيل إغلاق الخلفية' : 'Backdrop Close Disabled'}
          config={{ title: 'Backdrop click disabled', closeOnBackdropClick: false }}
          icon='block'
        />
        <TestButton
          label={language === 'AR' ? 'بدون عنوان' : 'No Title (Raw)'}
          config={{}}
          icon='crop_original'
        />
      </SectionCard>

      {/* Profile Modal Tests */}
      <SectionCard title={language === 'AR' ? 'نافذة الملف الشخصي' : 'Profile Modal'} icon='person'>
        <TestButton
          label={LOCAL_TRANSLATIONS[language].profileCard}
          config={{
            size: 'lg',
            testType: 'profile-card',
          }}
          icon='badge'
          variant='primary'
        />
        <TestButton
          label={LOCAL_TRANSLATIONS[language].editProfile}
          config={{
            title: LOCAL_TRANSLATIONS[language].editProfile,
            subtitle: LOCAL_TRANSLATIONS[language].updatePersonalInfo,
            icon: 'edit',
            size: 'lg',
            testType: 'edit-profile',
          }}
          icon='edit'
        />
        <TestButton
          label={language === 'AR' ? 'الصورة الشخصية' : 'Avatar Upload'}
          config={{
            title: language === 'AR' ? 'تغيير الصورة الشخصية' : 'Change Avatar',
            icon: 'account_circle',
            size: 'sm',
          }}
          icon='account_circle'
        />
        <TestButton
          label={language === 'AR' ? 'ملف كامل' : 'Full Profile'}
          config={{
            title: language === 'AR' ? 'الملف الشخصي الكامل' : 'Full Profile',
            subtitle: language === 'AR' ? 'جميع البيانات والإعدادات' : 'All details and settings',
            icon: 'person',
            size: 'xl',
            headerActions: sampleHeaderAction,
          }}
          icon='person'
          variant='primary'
        />
      </SectionCard>

      {/* The Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size={modalConfig.size}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        icon={modalConfig.icon}
        tabs={
          modalConfig.testType === 'multipage'
            ? [
              {
                label: language === 'AR' ? 'الصفحة 1' : 'Page 1',
                value: 'page1',
                icon: 'description',
              },
              {
                label: language === 'AR' ? 'الصفحة 2' : 'Page 2',
                value: 'page2',
                icon: 'settings',
              },
            ]
            : modalConfig.testType === 'profile-card'
              ? [
                {
                  label: LOCAL_TRANSLATIONS[language].personalProfile,
                  value: 'page1',
                  icon: 'person',
                },
                {
                  label: language === 'AR' ? 'التفاصيل' : 'Details',
                  value: 'page2',
                  icon: 'info',
                },
                {
                  label: LOCAL_TRANSLATIONS[language].achievements,
                  value: 'page3',
                  icon: 'emoji_events',
                },
                {
                  label: language === 'AR' ? 'المستندات' : 'Documents',
                  value: 'page4',
                  icon: 'description',
                },
              ]
              : undefined
        }
        activeTab={modalConfig.testType === 'multipage' || modalConfig.testType === 'profile-card' ? activePage : undefined}
        onTabChange={
          modalConfig.testType === 'multipage' || modalConfig.testType === 'profile-card' ? (val) => setActivePage(val as string) : undefined
        }
        headerActions={modalConfig.headerActions}
        closeOnBackdropClick={modalConfig.closeOnBackdropClick ?? true}
        bodyClassName={modalConfig.testType === 'profile-card' || modalConfig.testType === 'edit-profile' ? 'p-0 bg-(--bg-card)' : 'p-5'}
      >
        {/* Modal Content */}
        {modalConfig.testType === 'multipage' ? (
          <div className='space-y-4 animate-fade-in'>
            <div className='p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl'>
              {activePage === 'page1' ? (
                <div className='animate-fade-in'>
                  <span className='material-symbols-rounded text-6xl text-primary-500 mb-4'>
                    description
                  </span>
                  <h3 className='text-xl font-bold text-(--text-primary) mb-2'>
                    {language === 'AR' ? 'محتوى الصفحة الأولى' : 'Page 1 Content'}
                  </h3>
                  <p className='text-(--text-secondary)'>
                    {language === 'AR'
                      ? 'هذا هو المحتوى الخاص بالصفحة الأولى. يمكنك التبديل إلى الصفحة الثانية باستخدام عناصر التحكم في الأعلى.'
                      : 'This is the content for Page 1. You can switch to Page 2 using the controls above.'}
                  </p>
                </div>
              ) : (
                <div className='animate-fade-in'>
                  <span className='material-symbols-rounded text-6xl text-purple-500 mb-4'>
                    settings
                  </span>
                  <h3 className='text-xl font-bold text-(--text-primary) mb-2'>
                    {language === 'AR' ? 'محتوى الصفحة الثانية' : 'Page 2 Content'}
                  </h3>
                  <p className='text-(--text-secondary)'>
                    {language === 'AR'
                      ? 'هذا هو المحتوى الخاص بالصفحة الثانية. لاحظ كيف يتغير المحتوى دون إغلاق النافذة.'
                      : 'This is the content for Page 2. Notice how the content changes without closing the modal.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : modalConfig.testType === 'profile-card' ? (
          <div className='animate-fade-in'>
            {activePage === 'page1' ? (
              /* ── Page 1: Overview (Discord Style) ── */
              <div className='animate-fade-in'>
                {/* Banner Graphics */}
                <div className='relative w-full h-36 bg-(--bg-secondary) overflow-hidden'>
                  {renderBanner(bannerStyle)}
                </div>

                {/* Profile Avatar Overlapping & Content Container */}
                <div className='relative px-6 pb-6 pt-12'>
                  {/* Overlapping Avatar */}
                  <div className='absolute -top-12 start-6'>
                    <div className='relative'>
                      <div className='w-24 h-24 rounded-full border-4 border-(--bg-card) overflow-hidden bg-(--bg-secondary) shadow-md flex items-center justify-center'>
                        <span className='material-symbols-rounded text-(--text-tertiary) text-[56px] select-none'>
                          person
                        </span>
                      </div>

                      {/* Discord Status Indicator */}
                      <span
                        className={`absolute bottom-0.5 end-0.5 w-7 h-7 rounded-full border-4 border-(--bg-card) flex items-center justify-center transition-colors duration-300 ${userStatus === 'online'
                          ? 'bg-emerald-500'
                          : userStatus === 'idle'
                            ? 'bg-amber-500'
                            : userStatus === 'dnd'
                              ? 'bg-rose-500'
                              : 'bg-gray-400 dark:bg-gray-500'
                          }`}
                        title={userStatus}
                      >
                        {userStatus === 'dnd' && (
                          <span className='w-2.5 h-0.5 bg-white dark:bg-gray-900 rounded-full' />
                        )}
                        {userStatus === 'idle' && (
                          <span className='w-3.5 h-3.5 rounded-full bg-(--bg-card) absolute -top-1 -left-1' />
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Discord Badge Overlay */}
                  <div className='absolute -top-6 end-6 flex gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-white text-xs border border-white/10'>
                    <span className='material-symbols-rounded text-[14px]' title={LOCAL_TRANSLATIONS[language].staffBadge}>shield_person</span>
                    <span className='material-symbols-rounded text-[14px]' title={LOCAL_TRANSLATIONS[language].devBadge}>terminal</span>
                    <span className='material-symbols-rounded text-[14px]' title={LOCAL_TRANSLATIONS[language].nitroBadge}>bolt</span>
                  </div>

                  {/* Info Details Section */}
                  <div className='space-y-4'>
                    {/* Name, Role & Status Text */}
                    <div>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <h3 className='text-xl font-bold text-(--text-primary)'>
                          {language === 'AR' ? profileData.nameAR : profileData.nameEN}
                        </h3>
                        <span className='text-xs text-(--text-tertiary) font-medium'>@ahmed_mohamed</span>
                      </div>
                      <p className='text-sm font-semibold text-primary-600 dark:text-primary-400 mt-0.5'>
                        {language === 'AR' ? profileData.roleAR : profileData.roleEN}
                      </p>

                      {/* Custom Bio Status */}
                      <div className='mt-3 p-2 bg-(--bg-secondary)/50 rounded-lg border border-(--border-divider) text-xs text-(--text-secondary) italic flex items-center gap-2'>
                        <span className='material-symbols-rounded text-(--text-tertiary) text-[16px]'>chat_bubble</span>
                        <span>{customBio}</span>
                      </div>
                    </div>

                    {/* Profile Details */}
                    <div className='space-y-3 pt-2'>
                      <h4 className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary)'>
                        {LOCAL_TRANSLATIONS[language].generalInfo}
                      </h4>
                      <div className='grid grid-cols-2 gap-2'>
                        {[
                          { icon: 'badge', label: LOCAL_TRANSLATIONS[language].employeeId, value: profileData.employeeId },
                          { icon: 'calendar_month', label: LOCAL_TRANSLATIONS[language].joined, value: profileData.joined },
                          { icon: 'schedule', label: LOCAL_TRANSLATIONS[language].shift, value: language === 'AR' ? profileData.shiftAR : profileData.shiftEN },
                          { icon: 'health_and_safety', label: LOCAL_TRANSLATIONS[language].license, value: profileData.license },
                        ].map((item) => (
                          <div key={item.icon} className={`${GLASS_CARD_BASE} flex items-center gap-2.5`}>
                            <span className='material-symbols-rounded text-(--text-tertiary) text-[18px]'>{item.icon}</span>
                            <div className='min-w-0'>
                              <p className='text-[10px] text-(--text-tertiary) font-medium truncate'>{item.label}</p>
                              <p className='text-xs font-semibold text-(--text-primary) truncate'>{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activePage === 'page2' ? (
              /* ── Page 2: Details ── */
              <div className='animate-fade-in p-6 space-y-5'>
                {/* Contact Info */}
                <div>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary) mb-3'>
                    {LOCAL_TRANSLATIONS[language].contactInfo}
                  </h4>
                  <div className='space-y-2'>
                    {[
                      { icon: 'mail', label: LOCAL_TRANSLATIONS[language].email, value: profileData.email },
                      { icon: 'phone', label: LOCAL_TRANSLATIONS[language].phone, value: profileData.phone },
                      { icon: 'location_on', label: LOCAL_TRANSLATIONS[language].address, value: language === 'AR' ? profileData.addressAR : profileData.addressEN },
                    ].map((item) => (
                      <div key={item.icon} className={`${GLASS_CARD_BASE} flex items-center gap-2.5`}>
                        <span className='material-symbols-rounded text-(--text-tertiary) text-[18px]'>{item.icon}</span>
                        <div className='min-w-0 flex-1'>
                          <p className='text-[10px] font-medium text-(--text-tertiary) uppercase tracking-wide'>{item.label}</p>
                          <p className='text-xs font-semibold text-(--text-primary) truncate'>{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Permissions Summary */}
                <div>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary) mb-3'>
                    {LOCAL_TRANSLATIONS[language].permissions}
                  </h4>
                  <div className='flex flex-wrap gap-2'>
                    {[
                      language === 'AR' ? 'إدارة المخزون' : 'Inventory Mgmt',
                      language === 'AR' ? 'نقطة البيع' : 'POS Access',
                      language === 'AR' ? 'إدارة المشتريات' : 'Purchases',
                      language === 'AR' ? 'التقارير' : 'Reports',
                      language === 'AR' ? 'إدارة الموظفين' : 'Staff Mgmt',
                    ].map((perm) => (
                      <span
                        key={perm}
                        className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-500/20'
                      >
                        <span className='material-symbols-rounded text-[14px]'>check_circle</span>
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : activePage === 'page3' ? (
              /* ── Page 3: Achievements ── */
              <div className='animate-fade-in p-6 space-y-5'>
                {/* Stats */}
                <div>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-(--text-tertiary) mb-3'>
                    {LOCAL_TRANSLATIONS[language].achievements}
                  </h4>
                  <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                    {[
                      { label: LOCAL_TRANSLATIONS[language].sales, value: '1,247', icon: 'point_of_sale', color: '#10b981' },
                      { label: LOCAL_TRANSLATIONS[language].totalSalesAmount, value: language === 'AR' ? '154,250 ج.م' : '154,250 EGP', icon: 'payments', color: '#059669' },
                      { label: LOCAL_TRANSLATIONS[language].workingHours, value: language === 'AR' ? '186 ساعة' : '186 hrs', icon: 'schedule', color: '#3b82f6' },
                      { label: LOCAL_TRANSLATIONS[language].attendance, value: '96%', icon: 'event_available', color: '#6366f1' },
                      { label: LOCAL_TRANSLATIONS[language].rating, value: '4.8', icon: 'star', color: '#f59e0b' },
                    ].map((stat) => (
                      <div key={stat.label} className={`text-center ${GLASS_CARD_BASE} flex flex-col justify-between min-h-[90px]`}>
                        <span className='material-symbols-rounded text-[20px] mb-1 block' style={{ color: stat.color }}>{stat.icon}</span>
                        <div>
                          <p className='text-base font-bold text-(--text-primary)'>{stat.value}</p>
                          <p className='text-[10px] font-medium text-(--text-tertiary) uppercase'>{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── Page 4: Documents ── */
              <div className='animate-fade-in p-6 space-y-6'>
                {/* National ID Section */}
                <div className='space-y-1'>
                  <div className='text-xs font-semibold text-(--text-tertiary) uppercase px-1 flex items-center gap-2'>
                    <span
                      className='material-symbols-rounded'
                      style={{ fontSize: 'var(--icon-md)' }}
                    >
                      badge
                    </span>
                    {LOCAL_TRANSLATIONS[language].nationalIdCard}
                  </div>
                  {profileData.nationalIdCard || profileData.nationalIdCardBack ? (
                    <div className='bg-(--bg-secondary)/10 pt-2.5 pb-4 px-4 rounded-xl border border-(--border-divider) grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      {profileData.nationalIdCard && (
                        <div className='space-y-1.5'>
                          <span className='text-[10px] font-semibold text-(--text-tertiary) uppercase px-1'>
                            {LOCAL_TRANSLATIONS[language].frontFace}
                          </span>
                          <div className='w-full aspect-[8/5] border border-(--border-divider) rounded-xl overflow-hidden bg-(--bg-secondary)/30 shadow-md'>
                            <img
                              src={profileData.nationalIdCard}
                              alt='National ID Front'
                              className='w-full h-full object-cover'
                            />
                          </div>
                        </div>
                      )}
                      {profileData.nationalIdCardBack && (
                        <div className='space-y-1.5'>
                          <span className='text-[10px] font-semibold text-(--text-tertiary) uppercase px-1'>
                            {LOCAL_TRANSLATIONS[language].backFace}
                          </span>
                          <div className='w-full aspect-[8/5] border border-(--border-divider) rounded-xl overflow-hidden bg-(--bg-secondary)/30 shadow-md'>
                            <img
                              src={profileData.nationalIdCardBack}
                              alt='National ID Back'
                              className='w-full h-full object-cover'
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className='text-center py-8 bg-(--bg-secondary)/20 border border-(--border-divider) border-dashed rounded-xl'>
                      <p className='text-sm text-(--text-tertiary)'>
                        {LOCAL_TRANSLATIONS[language].noIdCardImages}
                      </p>
                    </div>
                  )}
                </div>

                {/* Syndicate Cards Section */}
                <div className='space-y-1'>
                  <div className='text-xs font-semibold text-(--text-tertiary) uppercase px-1 flex items-center gap-2'>
                    <span
                      className='material-symbols-rounded'
                      style={{ fontSize: 'var(--icon-md)' }}
                    >
                      card_membership
                    </span>
                    {LOCAL_TRANSLATIONS[language].syndicateCards}
                  </div>
                  {profileData.mainSyndicateCard || profileData.subSyndicateCard ? (
                    <div className='bg-(--bg-secondary)/10 pt-2.5 pb-4 px-4 rounded-xl border border-(--border-divider) grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      {profileData.mainSyndicateCard && (
                        <div className='space-y-1.5'>
                          <span className='text-[10px] font-semibold text-(--text-tertiary) uppercase px-1'>
                            {LOCAL_TRANSLATIONS[language].mainSyndicateCard}
                          </span>
                          <div className='w-full aspect-[8/5] border border-(--border-divider) rounded-xl overflow-hidden bg-(--bg-secondary)/30 shadow-md'>
                            <img
                              src={profileData.mainSyndicateCard}
                              alt='Main Syndicate Card'
                              className='w-full h-full object-cover'
                            />
                          </div>
                        </div>
                      )}
                      {profileData.subSyndicateCard && (
                        <div className='space-y-1.5'>
                          <span className='text-[10px] font-semibold text-(--text-tertiary) uppercase px-1'>
                            {LOCAL_TRANSLATIONS[language].sub}
                          </span>
                          <div className='w-full aspect-[8/5] border border-(--border-divider) rounded-xl overflow-hidden bg-(--bg-secondary)/30 shadow-md'>
                            <img
                              src={profileData.subSyndicateCard}
                              alt='Sub Syndicate Card'
                              className='w-full h-full object-cover'
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className='text-center py-8 bg-(--bg-secondary)/20 border border-(--border-divider) border-dashed rounded-xl'>
                      <p className='text-sm text-(--text-tertiary)'>
                        {LOCAL_TRANSLATIONS[language].noSyndicateCardImages}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : modalConfig.testType === 'edit-profile' ? (
          <div className='animate-fade-in flex flex-col h-full justify-between min-h-[450px]'>
            <div>
              {/* Edit Modal Tabs */}
              <div className='flex border-b border-(--border-divider) mb-5 px-6 overflow-x-auto scrollbar-none'>
                {[
                  { id: 'appearance', label: LOCAL_TRANSLATIONS[language].appearanceStatus, icon: 'palette' },
                  { id: 'personal', label: LOCAL_TRANSLATIONS[language].personalInfo, icon: 'person' },
                  { id: 'contact', label: LOCAL_TRANSLATIONS[language].contactJobDetails, icon: 'badge' },
                  { id: 'documents', label: LOCAL_TRANSLATIONS[language].officialDocuments, icon: 'description' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type='button'
                    onClick={() => setEditTab(tab.id)}
                    className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-all -mb-[2px] whitespace-nowrap ${editTab === tab.id
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
                          onClick={() => setEditBannerStyle(ban.id)}
                          className={`h-12 rounded-xl overflow-hidden relative border transition-all ${editBannerStyle === ban.id
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
                        { id: 'online', color: 'bg-emerald-500', name: LOCAL_TRANSLATIONS[language].statusOnline },
                        { id: 'idle', color: 'bg-amber-500', name: LOCAL_TRANSLATIONS[language].statusIdle },
                        { id: 'dnd', color: 'bg-rose-500', name: LOCAL_TRANSLATIONS[language].statusDnd },
                        { id: 'offline', color: 'bg-gray-400', name: LOCAL_TRANSLATIONS[language].statusOffline },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type='button'
                          onClick={() => setEditUserStatus(st.id as any)}
                          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${editUserStatus === st.id
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
                      <span className='material-symbols-rounded text-(--text-tertiary) absolute start-3 text-[18px]'>chat_bubble</span>
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
                      <span
                        className='material-symbols-rounded'
                        style={{ fontSize: 'var(--icon-md)' }}
                      >
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
                              onClick={() =>
                                setEditForm({ ...editForm, nationalIdCard: undefined })
                              }
                              className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-6 h-6 bg-gray-100 dark:bg-gray-800 ${BUTTON_CLOSE_BASE} rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-inner`}
                            >
                              <span
                                className='material-symbols-rounded'
                                style={{
                                  fontSize: 'var(--icon-md)',
                                  fontVariationSettings: "'wght' 700"
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
                              className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-6 h-6 bg-gray-100 dark:bg-gray-800 ${BUTTON_CLOSE_BASE} rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-inner`}
                            >
                              <span
                                className='material-symbols-rounded'
                                style={{
                                  fontSize: 'var(--icon-md)',
                                  fontVariationSettings: "'wght' 700"
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
                      <span
                        className='material-symbols-rounded'
                        style={{ fontSize: 'var(--icon-md)' }}
                      >
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
                              onClick={() =>
                                setEditForm({ ...editForm, mainSyndicateCard: undefined })
                              }
                              className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-6 h-6 bg-gray-100 dark:bg-gray-800 ${BUTTON_CLOSE_BASE} rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-inner`}
                            >
                              <span
                                className='material-symbols-rounded'
                                style={{
                                  fontSize: 'var(--icon-md)',
                                  fontVariationSettings: "'wght' 700"
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
                              onClick={() =>
                                setEditForm({ ...editForm, subSyndicateCard: undefined })
                              }
                              className={`absolute -top-2.5 ${language === 'AR' ? '-left-2.5' : '-right-2.5'} w-6 h-6 bg-gray-100 dark:bg-gray-800 ${BUTTON_CLOSE_BASE} rounded-md text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-inner`}
                            >
                              <span
                                className='material-symbols-rounded'
                                style={{
                                  fontSize: 'var(--icon-md)',
                                  fontVariationSettings: "'wght' 700"
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
                  // Commit changes to main states
                  setProfileData({ ...editForm });
                  setBannerStyle(editBannerStyle);
                  setUserStatus(editUserStatus);
                  setCustomBio(editCustomBio);
                  setIsOpen(false);
                }}
                className='flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90 shadow-md text-sm'
                style={{ backgroundColor: 'var(--color-primary-500, #3b82f6)' }}
              >
                {LOCAL_TRANSLATIONS[language].saveChanges}
              </button>
              <button
                type='button'
                onClick={() => setIsOpen(false)}
                className='px-4 py-2.5 rounded-xl font-medium text-(--text-primary) bg-(--bg-secondary) border border-(--border-divider) hover:bg-(--bg-hover) transition-colors text-sm'
              >
                {LOCAL_TRANSLATIONS[language].cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='p-4 bg-(--bg-secondary) border border-(--border-divider) rounded-xl'>
              <h4 className='font-medium text-gray-800 dark:text-white mb-2'>
                {language === 'AR' ? 'تكوين النافذة' : 'Modal Configuration'}
              </h4>
              <pre className='text-sm text-gray-600 dark:text-gray-400 overflow-auto'>
                {JSON.stringify(modalConfig, null, 2)}
              </pre>
            </div>

            <p className='text-(--text-secondary)'>
              {language === 'AR'
                ? 'هذا محتوى تجريبي للنافذة. يمكنك إغلاق النافذة بالضغط على زر الإغلاق أو الضغط على ESC أو النقر على الخلفية (إذا كان مفعلاً).'
                : 'This is sample modal content. You can close this modal by clicking the close button, pressing ESC, or clicking the backdrop (if enabled).'}
            </p>

            <div className='flex gap-3 pt-4'>
              <button
                onClick={() => setIsOpen(false)}
                className='flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors'
                style={{ backgroundColor: 'var(--color-primary-500, #3b82f6)' }}
              >
                {language === 'AR' ? 'إغلاق' : 'Close Modal'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
