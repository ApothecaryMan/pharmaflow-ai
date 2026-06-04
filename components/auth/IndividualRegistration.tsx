import React, { useState } from 'react';
import { authService } from '../../services/auth/authService';

interface Props {
  onSuccess?: () => void;
  onLoginClick?: () => void;
  t: Translations;
  language?: string;
}

export function IndividualRegistration({ onSuccess, onLoginClick, t, language = 'EN' }: Props) {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formattedUsername = formData.username.startsWith('@') 
        ? formData.username 
        : `@${formData.username}`;

      const res = await authService.registerIndividual({
        ...formData,
        username: formattedUsername
      });

      if (!res.success) {
        throw new Error(res.message);
      }

      onSuccess?.();
    } catch (err: any) {
      setError(err.message || t.login?.errorGeneric);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role='alert' className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm'>
          <span>{error}</span>
        </div>
      )}

      <fieldset disabled={isLoading} className='space-y-4'>
        {/* Full Name */}
        <div className='flex flex-col gap-1.5'>
          <input
            type="text"
            required
            autoComplete='off'
            placeholder={language === 'AR' ? 'الاسم الكامل' : 'Full Name'}
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full bg-[#111111] border border-zinc-800 focus:border-zinc-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-hidden transition-all duration-200 placeholder:text-start cursor-text hover:bg-zinc-900"
          />
        </div>

        {/* Username */}
        <div className='flex flex-col gap-1.5'>
          <div className='relative'>
            <input
              type="text"
              required
              autoComplete='off'
              placeholder={language === 'AR' ? 'اسم المستخدم' : 'Username'}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() })}
              className="w-full bg-[#111111] border border-zinc-800 focus:border-zinc-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-hidden transition-all duration-200 text-start placeholder:text-start cursor-text hover:bg-zinc-900"
              dir='ltr'
            />
          </div>
        </div>

        {/* Email */}
        <div className='flex flex-col gap-1.5'>
          <input
            type="email"
            required
            autoComplete='off'
            placeholder={language === 'AR' ? 'البريد الإلكتروني' : 'Email Address'}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-[#111111] border border-zinc-800 focus:border-zinc-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-hidden transition-all duration-200 text-start placeholder:text-start cursor-text hover:bg-zinc-900"
            dir='ltr'
          />
        </div>

        {/* Phone */}
        <div className='flex flex-col gap-1.5'>
          <input
            type="tel"
            required
            autoComplete='off'
            placeholder={language === 'AR' ? 'رقم الهاتف' : 'Phone Number'}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-[#111111] border border-zinc-800 focus:border-zinc-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-hidden transition-all duration-200 text-start placeholder:text-start cursor-text hover:bg-zinc-900"
            dir='ltr'
          />
        </div>

        {/* Password */}
        <div className='flex flex-col gap-1.5'>
          <div className='relative'>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete='off'
              placeholder={language === 'AR' ? 'كلمة المرور' : 'Password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-[#111111] border border-zinc-800 focus:border-zinc-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-hidden transition-all duration-200 pr-10 text-start placeholder:text-start cursor-text hover:bg-zinc-900"
              dir='ltr'
            />
            <button type='button' onClick={toggleShowPassword} className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:text-white cursor-pointer'>
              <span className="material-symbols-rounded text-[20px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
      </fieldset>

      <button
        type='submit'
        disabled={isLoading}
        className='w-full bg-white hover:bg-zinc-200 disabled:bg-white/50 text-black font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-2'
      >
        {isLoading ? (
          <>
            <svg className='animate-spin w-4 h-4 text-black' xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{t.login?.signingIn || (language === 'AR' ? 'جاري التسجيل...' : 'Signing Up...')}</span>
          </>
        ) : (
          t.login?.signUpSubmit || (language === 'AR' ? 'إنشاء حساب' : 'Sign Up')
        )}
      </button>

      {onLoginClick && (
        <div className='flex items-center justify-center gap-1 text-sm pt-2'>
          <span className='text-zinc-500'>{t.login?.haveAccount || (language === 'AR' ? 'لديك حساب بالفعل؟' : 'Already have an account?')}</span>
          <button
            type='button'
            onClick={onLoginClick}
            className='text-white font-medium focus:outline-hidden transition-all duration-200 cursor-pointer hover:underline underline-offset-4'
          >
            {t.login?.loginLink || t.login?.loginText || (language === 'AR' ? 'تسجيل الدخول' : 'Login')}
          </button>
        </div>
      )}
    </form>
  );
}

