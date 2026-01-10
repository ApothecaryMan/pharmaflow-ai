import React from 'react';
import { StatusBarItem } from '../StatusBarItem';

export interface Employee {
  id: string;
  name: string;
  employeeCode: string;
}

interface UserInfoProps {
  userName?: string;
  userRole?: string;
  avatarUrl?: string;
  employees?: Employee[];
  currentEmployeeId?: string | null;
  onSelectEmployee?: (id: string) => void;
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
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    if (onSelectEmployee) {
      onSelectEmployee(id);
      setIsOpen(false);
    }
  };

  const displayName = userName || (language === 'AR' ? 'اختر موظف' : 'Select Employee');
  const displayRole = userRole || (employees.length > 0 ? (language === 'AR' ? 'الموظف الحالي' : 'Current Employee') : '');

  // If no employees or no handler, just show static info
  if (employees.length === 0 || !onSelectEmployee) {
    if (!userName) return null;
    return (
      <StatusBarItem
        icon="person"
        label={userRole ? `${userName} (${userRole})` : userName}
        tooltip={userRole}
        variant="default"
      />
    );
  }

  return (
    <div className="relative flex items-center h-full" ref={dropdownRef}>
      <StatusBarItem
        icon="person"
        label={displayName}
        tooltip={displayRole}
        onClick={() => setIsOpen(!isOpen)}
        variant={currentEmployeeId ? 'info' : 'warning'}
        className="min-w-[120px]"
      />

      {isOpen && (
        <div 
          className="absolute bottom-full right-0 mb-1 w-64 max-h-80 overflow-y-auto rounded-lg shadow-xl border z-50 mobile-safe-bottom"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase border-b" style={{ borderColor: 'var(--border-primary)' }}>
            {language === 'AR' ? 'تغيير الموظف' : 'Switch Employee'}
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
            {employees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => handleSelect(emp.id)}
                className={`w-full px-3 py-2 text-left hover:bg-white/5 transition-colors flex items-center justify-between group
                  ${currentEmployeeId === emp.id ? 'bg-blue-500/10' : ''}
                `}
              >
                <div>
                  <div className={`text-sm font-medium ${currentEmployeeId === emp.id ? 'text-blue-500' : 'text-[var(--text-primary)]'}`}>
                    {emp.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)]">
                    {emp.employeeCode}
                  </div>
                </div>
                {currentEmployeeId === emp.id && (
                  <span className="material-symbols-rounded text-blue-500 text-[16px]">check</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInfo;
