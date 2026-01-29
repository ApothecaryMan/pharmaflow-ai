import React from 'react';
import { StatusBarItem } from '../StatusBarItem';
import { useContextMenu } from '../../../common/ContextMenu';

import { Employee } from '../../../../types';

import { useSmartDirection } from '../../../common/SmartInputs';
import { usePosSounds } from '../../../common/hooks/usePosSounds';

/*
 * RTL SUPPORT REMINDER
 * ====================
 * When creating StatusBar components, always add RTL support:
 *   dir={language === 'AR' ? 'rtl' : 'ltr'}
 * 
 * This ensures proper text direction for Arabic language.
 */

interface UserInfoProps {
  userName?: string;
  userRole?: string;
  avatarUrl?: string;
  employees?: Employee[];
  currentEmployeeId?: string | null;
  onSelectEmployee?: (id: string | null) => void;
  language?: 'EN' | 'AR';
}

export const UserInfo: React.FC<UserInfoProps> = ({
  userName,
  userRole,
  avatarUrl,
  employees = [],
  currentEmployeeId,
  onSelectEmployee,
  language = 'EN',
}) => {
  const [step, setStep] = React.useState<'idle' | 'username' | 'password'>('idle');
  const [inputVal, setInputVal] = React.useState(''); // Shared input for username/password
  const [tempEmployee, setTempEmployee] = React.useState<Employee | null>(null);
  const [isError, setIsError] = React.useState(false);
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { playSuccess, playError } = usePosSounds();

  // Auto-detect direction
  const dir = useSmartDirection(inputVal, language === 'AR' ? 'كلمة المرور...' : 'Password...');

  // Focus input on step change
  React.useEffect(() => {
    if (step !== 'idle' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  // Click outside handler
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (step !== 'idle') {
           resetState();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [step]);

  const resetState = () => {
    setStep('idle');
    setInputVal('');
    setTempEmployee(null);
    setIsError(false);
  };

  const handleStartLogin = () => {
    if (!onSelectEmployee) return;
    setStep('username');
    setInputVal(''); // Clear
    setIsError(false);
  };

  /* 
   * Check Auth
   */
  const checkAuth = async () => {
     if (step === 'username') {
         // Validate Username
         const query = inputVal.trim().toLowerCase();
         if (!query) return;

         // Find employee by name, code OR username
         const found = employees.find(emp => 
           emp.name.toLowerCase().includes(query) || 
           emp.employeeCode.toLowerCase() === query ||
           (emp.username && emp.username.toLowerCase() === query)
         );

         if (found) {
           setTempEmployee(found);
           setStep('password');
           setInputVal(''); // Clear for password
           setIsError(false);
         } else {
           setIsError(true);
           playError();
         }
       } else if (step === 'password') {
         // Validate Password
         if (tempEmployee && onSelectEmployee) {
             const inputPass = inputVal.trim();
             
             // Dynamic Import for security util
             const { verifyPassword } = await import('../../../../services/auth/hashUtils');

             let isValid = false;

             if (tempEmployee.password) {
                 // Verify Hash
                 isValid = await verifyPassword(inputPass, tempEmployee.password);
             } else {
                 // Fallback: If no password set, allow any non-empty input (Legacy Mode)
                 isValid = inputPass.length > 0;
             }

             if (isValid) {
                 playSuccess();
                 onSelectEmployee(tempEmployee.id);
                 resetState();
             } else {
                 setIsError(true);
                 playError();
             }
         }
       }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
       checkAuth();
    } else if (e.key === 'Escape') {
        resetState();
    }
  };

  const displayName = userName || (language === 'AR' ? 'تسجيل الدخول' : 'Login');
  const displayRole = userRole || (employees.length > 0 ? (language === 'AR' ? 'الموظف الحالي' : 'Current Employee') : '');

  // Render Logic
  if (!onSelectEmployee) {
    // Static View (No interaction if no logic)
    return (
      <StatusBarItem
        icon="person"
        label={userRole ? `${userName} (${userRole})` : userName}
        tooltip={userRole || userName}
        variant="default"
      />
    );
  }

  /* 
   * Context Menu for Sign Out
   */
  const { showMenu } = useContextMenu();

  const handleContextMenu = (e: React.MouseEvent) => {
      if (!currentEmployeeId || !onSelectEmployee) return;
      e.preventDefault();
      
      showMenu(e.clientX, e.clientY, [
          {
              label: language === 'AR' ? 'تسجيل الخروج' : 'Sign Out',
              icon: 'logout',
              danger: true,
              action: () => {
                  onSelectEmployee(null); // Sign Out
                  setStep('idle');
              }
          }
      ]);
  };

  // Improved Tooltip Construction
  let tooltipText = '';
  if (currentEmployeeId) {
      const roleText = userRole ? ` (${userRole})` : '';
      tooltipText = `${userName}${roleText}`;
  } else {
      tooltipText = language === 'AR' ? 'تسجيل الدخول' : 'Login';
  }

  return (
    <div className="relative flex items-center h-full" ref={containerRef} dir={language === 'AR' ? 'rtl' : 'ltr'}>
      {step === 'idle' ? (
        <div onContextMenu={handleContextMenu} className="h-full flex items-center">
             <StatusBarItem
                icon="person"
                label={currentEmployeeId ? userName : (language === 'AR' ? 'تسجيل الدخول' : 'Login')} // Show "Login" if no user
                tooltip={tooltipText}
                onClick={handleStartLogin}
                variant={currentEmployeeId ? 'info' : 'warning'}
                className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
             />
             {!currentEmployeeId && (
                <button
                    onClick={async () => {
                        try {
                            const { startAuthentication } = await import('@simplewebauthn/browser');
                            const { generateChallenge, bufferToBase64, isWebAuthnSupported, parseWebAuthnError } = await import('../../../../utils/webAuthnUtils');
                            const { authService } = await import('../../../../services/auth/authService');
                            
                            // Check if browser supports WebAuthn
                            if (!(await isWebAuthnSupported())) {
                                const msg = language === 'AR' 
                                    ? 'هذا المتصفح لا يدعم مفاتيح المرور (Passkeys). تأكد من استخدام HTTPS.' 
                                    : 'Browser does not support Passkeys. Ensure you are on HTTPS.';
                                alert(msg);
                                return;
                            }

                            // 1. Get Challenge from "Backend"
                            const challengeBuffer = generateChallenge();
                            const challengeBase64 = bufferToBase64(challengeBuffer);

                            // 2. Options for Authentication (Mocked backend response)
                            const publicKeyCredentialRequestOptions = {
                                challenge: challengeBase64,
                                rpId: window.location.hostname,
                                userVerification: "required" as UserVerificationRequirement,
                                timeout: 60000,
                            };

                            // 3. Start Authentication via Library
                            const asseResp = await startAuthentication({
                                optionsJSON: publicKeyCredentialRequestOptions as any
                            });

                            if (asseResp && onSelectEmployee) {
                                // 4. Verify on Backend
                                // For pilot, we check if the credential ID exists in our local list
                                const credentialId = asseResp.id; // Library gives us base64url id directly
                                
                                const result = await authService.loginWithBiometric(credentialId, employees);
                                if (result) {
                                    // User logged in
                                    playSuccess();
                                    onSelectEmployee(result.id);
                                    resetState();
                                } else {
                                    console.warn("Credential ID not found in local records:", credentialId);
                                    setIsError(true);
                                    playError();
                                }
                            }
                        } catch (err: any) {
                            console.error("Passkey login failed", err);
                            const { parseWebAuthnError } = await import('../../../../utils/webAuthnUtils');
                            setIsError(true);
                            playError();
                            alert(parseWebAuthnError(err, language as any));
                        }
                    }}
                    className="flex items-center justify-center h-full px-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors border-l border-gray-200 dark:border-gray-700"
                    title={language === 'AR' ? 'تسجيل الدخول بمفتاح المرور' : 'Login with Passkey'}
                >
                    <span className="material-symbols-rounded text-[18px] text-blue-500">fingerprint</span>
                </button>
             )}
        </div>
      ) : (
        <div className="flex items-center h-full px-2 gap-2 bg-white/50 dark:bg-gray-900/50 border-l border-r border-gray-300 dark:border-gray-700 min-w-[150px]">
           <span className={`material-symbols-rounded text-[16px] ${isError ? 'text-red-500' : 'text-blue-500 dark:text-blue-400'}`}>
              {step === 'username' ? 'badge' : 'lock'}
           </span>
           <input
              ref={inputRef}
              type={step === 'password' ? 'password' : 'text'}
              value={inputVal}
              onChange={(e) => {
                  setInputVal(e.target.value);
                  if (isError) setIsError(false);
              }}
              dir={dir}
              onKeyDown={handleKeyDown}
              placeholder={
                  step === 'username' 
                    ? (language === 'AR' ? 'اسم المستخدم...' : 'Username...') 
                    : (language === 'AR' ? 'كلمة المرور...' : 'Password...')
              }
              className={`bg-transparent border-none outline-none text-[11px] font-bold text-gray-800 dark:text-white placeholder-gray-500 w-24 focus:ring-0 ${isError ? 'text-red-500 dark:text-red-400' : ''}`}
              autoComplete="off"
           />
           {step === 'username' && isError && (
             <span className="text-[9px] text-red-500 ml-1 font-normal">
               {language === 'AR' ? 'غير موجود' : 'Not found'}
             </span>
           )}
        </div>
      )}
    </div>
  );
};

export default UserInfo;
