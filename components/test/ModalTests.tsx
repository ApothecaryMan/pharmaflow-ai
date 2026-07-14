import { motion } from 'framer-motion';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { ProfileCardModal } from './ProfileCardModal';
import { ProfileEditModal } from './ProfileEditModal';

interface ModalTestsProps {
  color: string;
  t: (key: string) => string;
  language: 'EN' | 'AR';
}

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';

export interface ProfileData {
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
 <text x="30" y="125" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" letter-spacing="0.5" opacity="0.95">EGYPTIAN PHARMACISTS SYNDICATE</text>
 <text x="30" y="142" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" opacity="0.75">نقابة صيادلة مصر</text>
 <line x1="30" y1="160" x2="370" y2="160" stroke="%23ffffff" strokeWidth="1" opacity="0.25" />
 <text x="30" y="185" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" opacity="0.95">Ahmed Mohamed</text>
 <text x="30" y="202" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="11" opacity="0.8">Pharmacist Manager / صيدلي مدير</text>
 <circle cx="240" cy="195" r="18" fill="%2310b981" opacity="0.8" />
 <path d="M232 195 L238 201 L250 189" stroke="%23ffffff" strokeWidth="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
 <rect x="0" y="222" width="400" height="28" fill="%230f172a" />
 <text x="30" y="240" fill="%23ffffff" font-family="monospace" font-size="11" font-weight="bold" opacity="0.6">MEMBER SINCE 2024 • عضو منذ</text>
</svg>`;

const MOCK_ID_BACK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
 <rect width="100%" height="100%" rx="16" fill="%231e293b" />
 <rect x="0" y="30" width="400" height="45" fill="%230f172a" />
 <rect x="30" y="100" width="220" height="60" fill="%23e2e8f0" opacity="0.15" />
 <line x1="40" y1="110" x2="160" y2="110" stroke="%23ffffff" strokeWidth="4" opacity="0.5" />
 <line x1="40" y1="125" x2="200" y2="125" stroke="%23ffffff" strokeWidth="4" opacity="0.5" />
 <line x1="40" y1="140" x2="130" y2="140" stroke="%23ffffff" strokeWidth="4" opacity="0.5" />
 <rect x="290" y="100" width="80" height="80" fill="%23f8fafc" />
 <path d="M300 110 H360 V170 H300 Z" fill="none" stroke="%230f172a" strokeWidth="2" />
 <rect x="310" y="120" width="10" height="40" fill="%230f172a" />
 <rect x="325" y="130" width="10" height="30" fill="%230f172a" />
 <rect x="340" y="115" width="10" height="45" fill="%230f172a" />
 <text x="30" y="200" fill="%2394a3b8" font-family="monospace" font-size="10">ID-9821420042 / رقم الهوية الوطنية</text>
 <text x="30" y="215" fill="%2394a3b8" font-family="monospace" font-size="10">EXP: 2031-01-14 / تاريخ الانتهاء</text>
</svg>`;

const MOCK_SYNDICATE_MAIN = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
 <rect width="100%" height="100%" rx="16" fill="url(%23synGrad)" />
 <defs>
 <linearGradient id="synGrad" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stop-color="%231e3b8a" />
 <stop offset="100%" stop-color="%23311042" />
 </linearGradient>
 </defs>
 <rect x="30" y="30" width="340" height="190" rx="12" fill="%23ffffff" opacity="0.05" />
 <circle cx="200" cy="125" r="70" fill="none" stroke="%23ffffff" strokeWidth="1" opacity="0.1" />
 <text x="30" y="55" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" letter-spacing="0.5" opacity="0.9">EGYPTIAN PHARMACISTS SYNDICATE</text>
 <text x="30" y="72" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" opacity="0.7">نقابة صيادلة مصر - النقابة العامة</text>
 <line x1="30" y1="85" x2="370" y2="85" stroke="%23ffffff" strokeWidth="1" opacity="0.2" />
 <rect x="30" y="105" width="70" height="85" rx="8" fill="%23ffffff" opacity="0.1" />
 <circle cx="65" cy="135" r="16" fill="%23ffffff" opacity="0.25" />
 <path d="M45 178 C45 162, 85 162, 85 178 Z" fill="%23ffffff" opacity="0.25" />
 <text x="120" y="125" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" opacity="0.95">Ahmed Mohamed</text>
 <text x="120" y="142" fill="%23ffffff" font-family="system-ui, sans-serif" font-size="11" opacity="0.8">Mgr-9821 / عضوية رقم</text>
 <circle cx="330" cy="145" r="22" fill="%23fbbf24" opacity="0.8" />
 <path d="M320 145 L328 153 L342 137" stroke="%231e3b8a" strokeWidth="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
 <rect x="0" y="215" width="400" height="35" fill="%231e1b4b" />
 <text x="30" y="235" fill="%23ffffff" font-family="monospace" font-size="11" font-weight="bold" opacity="0.6">GENERAL MEMBER • عضو عامل</text>
</svg>`;

const MOCK_SYNDICATE_SUB = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
 <rect width="100%" height="100%" rx="16" fill="url(%23synSubGrad)" />
 <defs>
 <linearGradient id="synSubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stop-color="%23111827" />
 <stop offset="100%" stop-color="%230f766e" />
 </linearGradient>
 </defs>
 <rect x="30" y="25" width="340" height="180" rx="12" fill="%23ffffff" opacity="0.05" />
 <circle cx="200" cy="115" r="60" fill="none" stroke="%23ffffff" strokeWidth="1" opacity="0.08" />
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

export const LOCAL_TRANSLATIONS = {
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
    adjustBanner: 'Adjust Background',
    dragToPan: 'Drag to position background',
    bannerZoom: 'Zoom',
    resetPosition: 'Reset',
    done: 'Done',
    bannerPreview: 'Banner Preview',
    eyedropper: 'Color Picker',

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
    browserNotSupportPasskeys:
      'Browser does not support Passkeys. Ensure you are on HTTPS or Localhost.',
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
      { key: 'pharmacist-assistant', label: 'Pharmacist Assistant' },
      { key: 'sales-associate', label: 'Sales Associate' },
      { key: 'logistics-officer', label: 'Logistics Officer' },
      { key: 'it-administrator', label: 'IT Administrator' },
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
    adjustBanner: 'تعديل موضع الخلفية',
    dragToPan: 'اسحب لضبط موضع الخلفية',
    bannerZoom: 'التكبير',
    resetPosition: 'إعادة تعيين',
    done: 'تم',
    bannerPreview: 'معاينة الغلاف',
    eyedropper: 'قطارة الألوان',

    fullNameEnglish: 'الاسم بالكامل (بالإنجليزية)',
    fullNameArabic: 'الاسم بالكامل (بالعربية)',
    branch: 'الفرع',
    unassigned: 'غير محدد',
    department: 'القسم',
    role: 'الدور الوظيفي',
    status: 'الحالة',
    position: 'المنصب الوظيفي',
    salary: 'الراتب',
    notes: 'ملاحظات',
    additionalNotes: 'ملاحظات إضافية...',
    changeImage: 'تغيير الصورة',
    removeImage: 'حذف الصورة',
    imageTooLarge: 'حجم الصورة كبير جداً (الأقصى 500 كيلوبايت)',
    maxSizeNotice: 'الحد الأقصى 500 كيلوبايت',
    newEmployee: 'موظف جديد',
    username: 'اسم المستخدم',
    usernamePlaceholder: 'اسم المستخدم لتسجيل الدخول',
    passkey: 'مفتاح المرور',
    setupPasskey: 'إعداد مفتاح المرور',
    passkeySet: 'تم إعداد مفتاح المرور',
    password: 'كلمة المرور',
    passwordPlaceholder: 'كلمة مرور تسجيل الدخول',
    changePassword: 'تغيير كلمة المرور',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    enterCurrentPasswordToVerify: 'أدخل كلمة المرور الحالية للتحقق من هويتك',
    verify: 'تحقق',
    verified: 'تم التحقق',
    incorrectPassword: 'كلمة المرور غير صحيحة',
    deleteCurrentPasskey: 'هل تريد حذف مفتاح المرور الحالي لهذا الموظف؟',
    passkeyRegistrationFailed: 'فشل تسجيل مفتاح المرور',
    browserNotSupportPasskeys:
      'المتصفح لا يدعم مفاتيح المرور. تأكد من استخدام بروتوكول آمن HTTPS أو Localhost.',
    officialDocuments: 'الوثائق الرسمية',
    nationalIdCard: 'بطاقة الرقم القومي',
    uploadFront: 'رفع الوجه الأمامي',
    clickToUploadFront: 'اضغط لرفع الوجه الأمامي',
    syndicateCards: 'كارنيهات النقابة',
    mainSyndicateCard: 'الكارنيه العام',
    sub: 'الفرعي',
    uploadMain: 'رفع الكارنيه العام',
    uploadSub: 'رفع الكارنيه الفرعي',
    uploadBack: 'رفع الوجه الخلفي',
    fileTooLarge: 'حجم الملف كبير جداً (الأقصى 500 كيلوبايت)',
    frontFace: 'الوجه الأمامي',
    backFace: 'الوجه الخلفي',
    noIdCardImages: 'لم يتم رفع صور لبطاقة الرقم القومي',
    noSyndicateCardImages: 'لم يتم رفع صور لكارنيهات النقابة',
    confirmReset: 'هل أنت متأكد من إعادة تعيين كلمة المرور؟',
    resetLinkSent: 'تم إرسال رابط إعادة التعيين إلى البريد الإلكتروني.',
    resetViaEmail: 'إعادة تعيين عبر البريد الإلكتروني؟',
    enterPasswordError: 'أدخل كلمة المرور',
    verifiedNewPasswordMsg: 'تم التحقق بنجاح! يمكنك الآن إدخال كلمة المرور الجديدة',
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
      { key: 'pharmacist-assistant', label: 'مساعد صيدلي' },
      { key: 'sales-associate', label: 'مسؤول مبيعات' },
      { key: 'logistics-officer', label: 'مسؤول لوجستيات' },
      { key: 'it-administrator', label: 'مدير تكنولوجيا المعلومات' },
    ],
    statusOptions: [
      { key: 'active', label: 'نشط' },
      { key: 'inactive', label: 'غير نشط' },
      { key: 'holiday', label: 'إجازة' },
    ],
  },
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

const LogoAsterisk = ({
  color = 'currentColor',
  scale = 1.4,
}: {
  color?: string;
  scale?: number;
}) => (
  <g transform={`translate(70 70) scale(${scale})`} fill={color}>
    <rect x='-4' y='-35' width='8' height='70' rx='.5' transform='rotate(45)' />
    <rect x='-4' y='-35' width='8' height='20' rx='.5' />
    <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(-45)' />
    <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(90)' />
    <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(135)' />
    <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(180)' />
    <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(270)' />
  </g>
);

const LogoSpinnersPlayground = ({ language }: { language: 'EN' | 'AR' }) => {
  return (
    <div className='bg-(--bg-card) rounded-2xl p-6 shadow-xs border border-(--border-divider)'>
      <h3 className='text-lg font-semibold text-(--text-primary) flex items-center gap-2 mb-4'>
        <span
          className='material-symbols-rounded text-[24px]'
          style={{ color: 'var(--color-primary-500, #3b82f6)' }}
        >
          progress_activity
        </span>
        {language === 'AR' ? 'مختبر سبينر التحميل' : 'Logo Loading Spinners Lab'}
      </h3>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
        {/* V1: Smooth Spin (No Box) */}
        <div className='flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50'>
          <svg
            viewBox='0 0 140 140'
            className='w-16 h-16 text-primary-500 animate-spin'
            style={{ animationDuration: '2s' }}
          >
            <title>Smooth Asterisk</title>
            <LogoAsterisk />
          </svg>
          <span className='mt-4 text-sm font-medium text-gray-600 dark:text-gray-400'>
            Smooth Asterisk
          </span>
        </div>

        {/* V2: Stepped Spin (Clockwise Ticks) */}
        <div className='flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50'>
          <svg
            viewBox='0 0 140 140'
            className='w-16 h-16 text-primary-500 animate-spin'
            style={{ animationDuration: '1.5s', animationTimingFunction: 'steps(8)' }}
          >
            <title>Stepped Asterisk</title>
            <LogoAsterisk />
          </svg>
          <span className='mt-4 text-sm font-medium text-gray-600 dark:text-gray-400'>
            Stepped Asterisk
          </span>
        </div>

        {/* V3a: Orbiting Dots */}
        <div className='flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50'>
          <svg viewBox='0 0 140 140' className='w-16 h-16'>
            <title>Orbiting Dots</title>
            <g
              className='animate-spin'
              style={{ transformOrigin: '70px 70px', animationDuration: '3s' }}
            >
              <circle cx='70' cy='16' r='5' fill='var(--color-primary-500, #3b82f6)' />
              <circle cx='124' cy='70' r='5' fill='var(--color-primary-500, #3b82f6)' />
              <circle cx='70' cy='124' r='5' fill='var(--color-primary-500, #3b82f6)' />
              <circle cx='16' cy='70' r='5' fill='var(--color-primary-500, #3b82f6)' />
            </g>
            <LogoAsterisk scale={0.7} />
          </svg>
          <span className='mt-4 text-sm font-medium text-gray-600 dark:text-gray-400'>
            Orbiting Dots
          </span>
        </div>

        {/* V3b: Pulse Ring */}
        <div className='flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50'>
          <svg viewBox='0 0 140 140' className='w-16 h-16'>
            <title>Pulse Ring</title>
            <motion.circle
              cx='70'
              cy='70'
              r='30'
              fill='none'
              stroke='var(--color-primary-500, #3b82f6)'
              strokeWidth='2'
              animate={{ r: [28, 56, 28], opacity: [0.7, 0, 0.7] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
            />
            <motion.circle
              cx='70'
              cy='70'
              r='30'
              fill='none'
              stroke='var(--color-primary-500, #3b82f6)'
              strokeWidth='2'
              animate={{ r: [28, 56, 28], opacity: [0.7, 0, 0.7] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 0.6 }}
            />
            <motion.circle
              cx='70'
              cy='70'
              r='30'
              fill='none'
              stroke='var(--color-primary-500, #3b82f6)'
              strokeWidth='2'
              animate={{ r: [28, 56, 28], opacity: [0.7, 0, 0.7] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 1.2 }}
            />
            <LogoAsterisk scale={0.7} />
          </svg>
          <span className='mt-4 text-sm font-medium text-gray-600 dark:text-gray-400'>
            Pulse Ring
          </span>
        </div>

        {/* V3c: Radar Sweep */}
        <div className='flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50'>
          <svg viewBox='0 0 140 140' className='w-16 h-16'>
            <title>Radar Sweep</title>
            <circle
              cx='70'
              cy='70'
              r='56'
              fill='none'
              stroke='var(--color-primary-500, #3b82f6)'
              strokeWidth='1'
              opacity='0.25'
            />
            <g
              className='animate-spin'
              style={{ transformOrigin: '70px 70px', animationDuration: '2s' }}
            >
              <path
                d='M70 70 L70 14 A56 56 0 0 1 126 70 Z'
                fill='var(--color-primary-500, #3b82f6)'
                opacity='0.15'
              />
            </g>
            <LogoAsterisk scale={0.7} />
          </svg>
          <span className='mt-4 text-sm font-medium text-gray-600 dark:text-gray-400'>
            Radar Sweep
          </span>
        </div>

        {/* V3d: Morph Scale */}
        <div className='flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50'>
          <motion.svg
            viewBox='0 0 140 140'
            className='w-16 h-16 text-primary-500'
            animate={{ scale: [0.5, 1.25, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{ transformOrigin: 'center' }}
          >
            <title>Morph Scale</title>
            <LogoAsterisk />
          </motion.svg>
          <span className='mt-4 text-sm font-medium text-gray-600 dark:text-gray-400'>
            Morph Scale
          </span>
        </div>

        {/* V3e: Bounce */}
        <div className='flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50'>
          <motion.svg
            viewBox='0 0 140 140'
            className='w-16 h-16 text-primary-500'
            animate={{ y: [0, -12, 0] }}
            transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut' }}
          >
            <title>Bounce</title>
            <LogoAsterisk />
          </motion.svg>
          <span className='mt-4 text-sm font-medium text-gray-600 dark:text-gray-400'>Bounce</span>
        </div>

        {/* V3f: Spinning Ring */}
        <div className='flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50'>
          <svg viewBox='0 0 140 140' className='w-16 h-16'>
            <title>Spinning ring animation</title>
            <circle
              cx='70'
              cy='70'
              r='50'
              fill='none'
              stroke='var(--color-primary-500, #3b82f6)'
              strokeWidth='3'
              strokeLinecap='round'
              strokeDasharray='70 240'
              className='animate-spin'
              style={{ transformOrigin: '70px 70px', animationDuration: '1.5s' }}
            />
            <LogoAsterisk scale={0.7} />
          </svg>
          <span className='mt-4 text-sm font-medium text-gray-600 dark:text-gray-400'>
            Spinning Ring
          </span>
        </div>

        {/* V3g: Advanced Multi-Ring Pro */}
        <div className='flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50'>
          <svg viewBox='0 0 140 140' className='w-16 h-16'>
            <title>Multi-Ring Pro</title>
            <defs>
              <linearGradient id='ringGrad' x1='0%' y1='0%' x2='100%' y2='100%'>
                <stop offset='0%' stopColor='var(--color-primary-400, #60a5fa)' />
                <stop offset='100%' stopColor='var(--color-primary-700, #1d4ed8)' />
              </linearGradient>
            </defs>
            {/* Outer ring - slow reverse */}
            <circle
              cx='70'
              cy='70'
              r='50'
              fill='none'
              stroke='url(#ringGrad)'
              strokeWidth='2.5'
              strokeLinecap='round'
              strokeDasharray='40 275'
              className='animate-spin'
              style={{
                transformOrigin: '70px 70px',
                animationDuration: '4s',
                animationDirection: 'reverse',
              }}
              opacity='0.7'
            />
            {/* Middle ring - medium */}
            <circle
              cx='70'
              cy='70'
              r='40'
              fill='none'
              stroke='var(--color-primary-400, #60a5fa)'
              strokeWidth='2'
              strokeLinecap='round'
              strokeDasharray='55 195'
              className='animate-spin'
              style={{ transformOrigin: '70px 70px', animationDuration: '2.5s' }}
            />
            {/* Inner ring - fast reverse */}
            <circle
              cx='70'
              cy='70'
              r='30'
              fill='none'
              stroke='var(--color-primary-300, #93c5fd)'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeDasharray='25 160'
              className='animate-spin'
              style={{
                transformOrigin: '70px 70px',
                animationDuration: '1.2s',
                animationDirection: 'reverse',
              }}
            />
            {/* Slow-spinning asterisk */}
            <g
              className='animate-spin'
              style={{ transformOrigin: '70px 70px', animationDuration: '8s' }}
            >
              <LogoAsterisk scale={0.5} color='var(--color-primary-500, #3b82f6)' />
            </g>
          </svg>
          <span className='mt-4 text-sm font-medium text-gray-600 dark:text-gray-400'>
            Multi-Ring Pro
          </span>
        </div>

        {/* V4: Elastic Spin */}
        <div className='flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50'>
          <motion.svg
            viewBox='0 0 140 140'
            className='w-16 h-16 text-primary-500'
            animate={{ rotate: [0, 180, 360] }}
            transition={{ repeat: Infinity, ease: 'easeInOut', duration: 1.5 }}
          >
            <title>Elastic Asterisk</title>
            <LogoAsterisk />
          </motion.svg>
          <span className='mt-4 text-sm font-medium text-gray-600 dark:text-gray-400'>
            Elastic Asterisk
          </span>
        </div>
      </div>
    </div>
  );
};

export const ModalTests: React.FC<ModalTestsProps> = ({ color: _color, t: _t, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({});
  const [activePage, setActivePage] = useState('page1');
  const [bannerStyle, setBannerStyle] = useState<string>('pharma');
  const [bannerOffset, setBannerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [bannerZoom, setBannerZoom] = useState<number>(1.2);
  const [userStatus, setUserStatus] = useState<'online' | 'idle' | 'dnd' | 'offline'>('online');
  const [customBio, setCustomBio] = useState('');
  const [customAccentColor, setCustomAccentColor] = useState<string | null>(null);

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
    subSyndicateCard: MOCK_SYNDICATE_SUB,
  });

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
 ${
   variant === 'primary'
     ? `bg-primary-500 text-white hover:bg-primary-600 shadow-lg hover:shadow-xl`
     : 'bg-(--bg-secondary) hover:bg-(--bg-hover) text-(--text-primary) border border-(--border-divider)'
 }
 `}
      style={variant === 'primary' ? { backgroundColor: 'var(--color-primary-500, #3b82f6)' } : {}}
      type='button'
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
    <button
      className='px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
      type='button'
    >
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

      <LogoSpinnersPlayground language={language} />

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
        isOpen={
          isOpen &&
          modalConfig.testType !== 'profile-card' &&
          modalConfig.testType !== 'edit-profile'
        }
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
            : undefined
        }
        activeTab={modalConfig.testType === 'multipage' ? activePage : undefined}
        onTabChange={
          modalConfig.testType === 'multipage' ? (val) => setActivePage(val as string) : undefined
        }
        headerActions={modalConfig.headerActions}
        closeOnBackdropClick={modalConfig.closeOnBackdropClick ?? true}
        bodyClassName='p-5'
      >
        {/* Modal Content */}
        {modalConfig.testType === 'multipage' ? (
          <div className='space-y-4 '>
            <div className='p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl'>
              {activePage === 'page1' ? (
                <div className=''>
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
                <div className=''>
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
                type='button'
              >
                {language === 'AR' ? 'إغلاق' : 'Close Modal'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Profile Card Modal */}
      <ProfileCardModal
        isOpen={isOpen && modalConfig.testType === 'profile-card'}
        onClose={() => setIsOpen(false)}
        language={language}
        profileData={profileData}
        bannerStyle={bannerStyle}
        bannerOffset={bannerOffset}
        bannerZoom={bannerZoom}
        userStatus={userStatus}
        customBio={customBio}
        customAccentColor={customAccentColor}
      />

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isOpen && modalConfig.testType === 'edit-profile'}
        onClose={() => setIsOpen(false)}
        language={language}
        profileData={profileData}
        bannerStyle={bannerStyle}
        bannerOffset={bannerOffset}
        bannerZoom={bannerZoom}
        userStatus={userStatus}
        customBio={customBio}
        customAccentColor={customAccentColor}
        onSave={(data) => {
          setProfileData(data.profileData);
          setBannerStyle(data.bannerStyle);
          setBannerOffset(data.bannerOffset);
          setBannerZoom(data.bannerZoom);
          setUserStatus(data.userStatus);
          setCustomBio(data.customBio);
          setCustomAccentColor(data.customAccentColor);
          setIsOpen(false);
        }}
      />
    </div>
  );
};
