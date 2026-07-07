import { useEffect, useState } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { useAuthStore } from '../../stores/authStore';
import { employeeProfileRepository } from '../../services/hr/repositories/employeeProfileRepository';
import { employmentRequestRepository } from '../../services/hr/repositories/employmentRequestRepository';
import { orgService } from '../../services/org/orgService';
import type { EmploymentRequest, UserProfile } from '../../types';
import { Modal } from '../common/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: string;
}

const STATUS_CONFIG: Record<string, { icon: string; badgeClass: string }> = {
  pending: { icon: 'pending', badgeClass: 'badge-warning' },
  accepted: { icon: 'check_circle', badgeClass: 'badge-success' },
  rejected: { icon: 'cancel', badgeClass: 'badge-danger' },
};

export function InvitationListModal({ isOpen, onClose, language }: Props) {
  const [requests, setRequests] = useState<EmploymentRequest[]>([]);
  const [profilesByUsername, setProfilesByUsername] = useState<Map<string, UserProfile>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const branches = useAuthStore(s => s.branches);

  const t = TRANSLATIONS[language as 'EN' | 'AR'].employeeList as any;

  useEffect(() => {
    if (!isOpen) return;
    const fetchRequests = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const orgId = orgService.getActiveOrgId();
        if (!orgId)
          throw new Error(language === 'AR' ? 'لا توجد منظمة نشطة' : 'No active organization');
        const data = await employmentRequestRepository.getByOrg(orgId);
        setRequests(data);
        setIsLoading(false);

        const usernames = [...new Set(data.map((r) => r.targetUsername))];
        if (usernames.length > 0) {
          const profiles = await employeeProfileRepository.getByUsernames(usernames);
          const map = new Map<string, UserProfile>();
          profiles.forEach((p) => map.set(p.username, p));
          setProfilesByUsername(map);
        }
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
      }
    };
    fetchRequests();
  }, [isOpen, language]);

  const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: language === 'AR' ? 'قيد الانتظار' : 'Pending',
      accepted: language === 'AR' ? 'مقبول' : 'Accepted',
      rejected: language === 'AR' ? 'مرفوض' : 'Rejected',
    };
    return labels[status] || status;
  };

  const getBranchName = (branchId?: string) => {
    if (!branchId) return language === 'AR' ? 'غير محدد' : 'Unassigned';
    const branch = branches.find((b) => b.id === branchId);
    return branch?.name || branchId;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'AR' ? 'الدعوات المرسلة' : 'Sent Invitations'}
      icon='how_to_reg'
      size='lg'
      bodyClassName='p-1.5'
    >
      <div className='flex flex-col gap-1'>
        {isLoading ? (
          <div className='flex items-center justify-center py-16'>
            <span className='animate-spin rounded-full h-8 w-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100' />
          </div>
        ) : error ? (
          <div className='p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg mx-1.5 mt-1.5'>
            {error}
          </div>
        ) : requests.length === 0 ? (
          <div className='text-center py-16'>
            <div className='w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4'>
              <span className='material-symbols-rounded text-zinc-400 text-3xl'>how_to_reg</span>
            </div>
            <h3 className='text-lg font-bold text-zinc-500 dark:text-zinc-400 mb-1'>
              {language === 'AR' ? 'لا توجد دعوات' : 'No Invitations Yet'}
            </h3>
            <p className='text-sm text-zinc-400 dark:text-zinc-500'>
              {language === 'AR'
                ? 'لم يتم إرسال أي دعوات توظيف بعد'
                : 'No employment invitations have been sent yet'}
            </p>
          </div>
        ) : (
          <div className='flex flex-col gap-1 max-h-[420px] overflow-y-auto px-1'>
            {requests.map((req) => {
              const statusCfg = getStatusConfig(req.status);
              const profile = profilesByUsername.get(req.targetUsername);
              const initials = profile?.fullName
                ? profile.fullName
                    .split(' ')
                    .map((s) => s[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : req.targetUsername.replace('@', '').charAt(0).toUpperCase();
              return (
                <div
                  key={req.id}
                  className='flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700/50 transition-colors'
                >
                  <div className='w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden'>
                    {profile?.image ? (
                      <img src={profile.image} alt='' className='w-full h-full object-cover' />
                    ) : (
                      <span className='material-symbols-rounded text-zinc-500 dark:text-zinc-400 text-xl'>
                        person
                      </span>
                    )}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span
                        className='text-sm font-bold text-zinc-800 dark:text-zinc-200'
                        dir='ltr'
                      >
                        {req.targetUsername}
                      </span>
                      <span className={`gap-1 ${statusCfg.badgeClass}`}>
                        <span className='material-symbols-rounded'>{statusCfg.icon}</span>
                        {getStatusLabel(req.status)}
                      </span>
                    </div>
                    <div className='flex items-center gap-2 mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                      <span>{t.roles?.[req.role] || req.role}</span>
                      <span className='w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600' />
                      <span>{getBranchName(req.branchId)}</span>
                      {req.sentByName && (
                        <>
                          <span className='w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600' />
                          <span>
                            {language === 'AR' ? 'بواسطة' : 'by'} {req.sentByName}
                          </span>
                        </>
                      )}
                      {req.createdAt && (
                        <>
                          <span className='w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600' />
                          <span>{formatDate(req.createdAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className='flex justify-end px-1.5 pt-2'>
          <button
            type='button'
            onClick={onClose}
            className='px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black rounded-lg transition-all uppercase tracking-widest hover:opacity-90 active:scale-95 cursor-pointer'
          >
            {language === 'AR' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
