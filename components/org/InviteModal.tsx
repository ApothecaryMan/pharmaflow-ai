import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { SmartInput } from '../common/SmartInputs';
import { orgMembersService } from '../../services/org/orgMembersService';
import { ORG_ROLES } from '../../config/permissions';
import { getRoleLabel } from '../../config/employeeRoles';
import { TRANSLATIONS } from '../../i18n/translations';
import type { OrgRole } from '../../types';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  language: 'EN' | 'AR';
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  orgId,
  language
}) => {
  const t = TRANSLATIONS[language].organization.invites;
  const tParents = TRANSLATIONS[language].orgManagement;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const invite = await orgMembersService.invite(orgId, email, role);
      // In a real app, we'd send an email. 
      // Here we'll generate a link for the owner to share manually.
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/invite/${invite.token}`;
      setInviteLink(link);
    } catch (error) {
      console.error('Failed to create invite:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setEmail('');
    setRole('member');
    setInviteLink('');
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={reset}
      title={t.title}
      subtitle={t.subtitle}
      icon="person_add"
      width="max-w-md"
    >
      {!inviteLink ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              {t.email}
            </label>
            <SmartInput
              type="email"
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
              required
              placeholder="employee@pharmacy.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              {t.role}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ORG_ROLES.filter(r => r.id !== 'owner').map((r) => {
                const roleLabel = getRoleLabel(r.id, tParents);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id as OrgRole)}
                    className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                      role === r.id
                        ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-primary-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {roleLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email}
            className={`w-full py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-2xl hover:-translate-y-1'
            }`}
          >
            {isSubmitting ? '...' : t.send}
          </button>
        </form>
      ) : (
        <div className="space-y-6 text-center py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-4">
             <span className="material-symbols-rounded text-3xl">check_circle</span>
          </div>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.success}</p>
          
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
            <input 
              readOnly 
              value={inviteLink}
              className="flex-1 bg-transparent text-[10px] text-zinc-500 font-mono outline-none overflow-hidden text-ellipsis whitespace-nowrap"
            />
            <button 
              onClick={copyToClipboard}
              className="px-3 py-1 bg-primary-600 text-white rounded-lg text-[10px] font-bold shrink-0"
            >
              {copied ? t.copied : t.copy}
            </button>
          </div>

          <button
            onClick={reset}
            className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {language === 'AR' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      )}
    </Modal>
  );
};
