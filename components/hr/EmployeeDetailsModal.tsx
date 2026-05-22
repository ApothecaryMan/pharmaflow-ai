import React, { useState } from 'react';
import { Modal, BUTTON_CLOSE_BASE } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { permissionsService } from '../../services/auth/permissionsService';
import { getRoleLabel } from '../../config/employeeRoles';
import type { Employee } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  language: string;
  t: typeof TRANSLATIONS.EN.employeeList;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({
  isOpen,
  onClose,
  employee,
  language,
  t,
}) => {
  const [activeViewTab, setActiveViewTab] = useState<'general' | 'credentials' | 'documents'>('general');

  const handleClose = () => {
    onClose();
    setActiveViewTab('general');
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (!employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t.viewDetails}
      size='3xl'
      height='80vh'
      hideCloseButton={true}
      footer={
        <div className='flex items-center justify-end gap-3'>
          <button
            onClick={handleClose}
            className={`${BUTTON_CLOSE_BASE} px-4 py-2 text-gray-600 dark:text-gray-300 rounded-lg font-medium`}
          >
            {t.modal.cancel}
          </button>
        </div>
      }
      headerActions={
        <SegmentedControl
          options={[
            {
              value: 'general',
              label: t.tabs.general,
              icon: 'person',
            },
            {
              value: 'credentials',
              label: t.tabs.credentials,
              icon: 'lock',
            },
            {
              value: 'documents',
              label: t.tabs.documents,
              icon: 'description',
            },
          ].filter(
            (opt) => opt.value !== 'credentials' || employee.role === 'pharmacist'
          )}
          value={activeViewTab}
          onChange={(value) => setActiveViewTab(value as 'general' | 'credentials' | 'documents')}
          iconSize='--icon-lg'
        />
      }
    >
      <div className='space-y-5'>
        {activeViewTab === 'general' ? (
          <>
            <div className='flex items-center gap-4 p-4 bg-(--bg-surface-neutral) rounded-xl border border-transparent dark:border-(--border-divider)'>
              {employee.image ? (
                <img
                  src={employee.image}
                  alt={employee.name}
                  className='w-16 h-16 rounded-full object-cover border-2 border-white dark:border-(--bg-card) ring-1 ring-(--border-divider)'
                />
              ) : (
                <div
                  className='w-16 h-16 rounded-full flex items-center justify-center bg-gray-200 dark:bg-zinc-900/50 text-gray-500 dark:text-gray-400 text-2xl font-bold border border-(--border-divider)'
                >
                  {getInitials(employee.name || '') === '?' || !employee.name?.trim() ? (
                    <span className='material-symbols-rounded block' style={{ fontSize: '2rem' }}>person</span>
                  ) : (
                    getInitials(employee.name)
                  )}
                </div>
              )}
              <div className='flex-1'>
                <h3 className='text-base font-bold text-gray-900 dark:text-white leading-tight'>
                  {employee.name}
                  {employee.biometricCredentialId && (
                    <span
                      className='material-symbols-rounded text-green-500 align-middle ml-2'
                      style={{ fontSize: 'var(--icon-lg)' }}
                      title={t.fingerprintEnabled}
                    >
                      fingerprint
                    </span>
                  )}
                </h3>
                <div className='flex items-center gap-2 text-xs text-gray-500 mt-0.5'>
                  <span>{employee.employeeCode}</span>
                  <span>•</span>
                  <span>{t.departments[employee.department as keyof typeof t.departments] || employee.department}</span>
                </div>
              </div>
              <div className='ml-auto'>
                {(() => {
                  const status = employee.status;
                  let badgeClass = 'badge-neutral';
                  let icon = 'cancel';
                  if (status === 'active') {
                    badgeClass = 'badge-success';
                    icon = 'check_circle';
                  } else if (status === 'holiday') {
                    badgeClass = 'badge-warning';
                    icon = 'beach_access';
                  }

                  return (
                    <span className={`${badgeClass} gap-1.5 text-[10px]`}>
                      <span className='material-symbols-rounded'>{icon}</span>
                      {t.statusOptions[status as keyof typeof t.statusOptions] || status}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className='grid grid-cols-2 gap-x-6 gap-y-4 pt-2'>
              <div className='space-y-1.5'>
                <div className='text-xs font-semibold text-gray-500 uppercase px-1'>
                  {t.position}
                </div>
                <div className='text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-(--bg-card) px-3 py-2.5 rounded-lg border border-(--border-divider) shadow-xs min-h-[42px] flex items-center'>
                  {employee.position || '-'}
                </div>
              </div>
              <div className='space-y-1.5'>
                <div className='text-xs font-semibold text-gray-500 uppercase px-1'>
                  {t.role}
                </div>
                <div className='text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-(--bg-card) px-3 py-2.5 rounded-lg border border-(--border-divider) shadow-xs min-h-[42px] flex items-center'>
                  {getRoleLabel(employee.role, t.roles)}
                </div>
              </div>
              <div className='space-y-1.5'>
                <div className='text-xs font-semibold text-gray-500 uppercase px-1'>
                  {t.phone}
                </div>
                <div
                  className='text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-(--bg-card) px-3 py-2.5 rounded-lg border border-(--border-divider) shadow-xs min-h-[42px] flex items-center'
                  dir='ltr'
                >
                  {employee.phone || '-'}
                </div>
              </div>
              <div className='space-y-1.5'>
                <div className='text-xs font-semibold text-gray-500 uppercase px-1'>
                  {t.email}
                </div>
                <div className='text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-(--bg-card) px-3 py-2.5 rounded-lg border border-(--border-divider) shadow-xs truncate min-h-[42px] flex items-center'>
                  {employee.email || '-'}
                </div>
              </div>
              {(permissionsService.can('reports.view_financial') || permissionsService.can('users.manage')) && (
                <div className='space-y-1.5'>
                  <div className='text-xs font-semibold text-gray-500 uppercase px-1'>
                    {t.salary}
                  </div>
                  <div className='text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-(--bg-card) px-3 py-2.5 rounded-lg border border-(--border-divider) shadow-xs min-h-[42px] flex items-center'>
                    {employee.salary ? employee.salary.toLocaleString() : '-'}
                  </div>
                </div>
              )}
              <div className='col-span-2 space-y-1.5'>
                <div className='text-xs font-semibold text-gray-500 uppercase px-1'>
                  {t.notes}
                </div>
                <div className='text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-(--bg-card) p-2.5 rounded-lg border border-(--border-divider) shadow-xs min-h-[5rem] whitespace-pre-wrap leading-relaxed space-y-0'>
                  {employee.notes || '-'}
                </div>
              </div>
            </div>
          </>
        ) : activeViewTab === 'credentials' ? (
          <div className='space-y-4'>
            <div className='bg-primary-50/50 dark:bg-primary-900/10 border border-(--border-divider) rounded-xl p-4'>
              <div className='flex items-start gap-3'>
                <span 
                  className='material-symbols-rounded text-primary-600 dark:text-primary-400 mt-0.5'
                  style={{ fontSize: 'var(--icon-lg)' }}
                >
                  lock_person
                </span>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-blue-900 dark:text-blue-100 mb-1'>
                    {t.registeredCredentials}
                  </p>
                </div>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4 pt-2'>
              <div className='bg-(--bg-card) p-3 rounded-xl border border-(--border-divider) shadow-sm'>
                <label className='text-xs font-semibold text-gray-500 uppercase px-1 block mb-1'>
                  {t.username || 'Username'}
                </label>
                <p className='text-sm font-medium text-gray-900 dark:text-white px-1'>
                  {employee.username || '-'}
                </p>
              </div>
              <div className='bg-(--bg-card) p-3 rounded-xl border border-(--border-divider) shadow-sm'>
                <label className='text-xs font-semibold text-gray-500 uppercase px-1 block mb-1'>
                  {t.password || 'Password'}
                </label>
                <p className='text-sm font-medium text-gray-900 dark:text-white px-1'>
                  ••••••••
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className='space-y-6'>
            {/* National ID Section */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2 pb-2 border-b border-(--border-divider)'>
                <span 
                  className='material-symbols-rounded text-gray-400'
                  style={{ fontSize: 'var(--icon-base)' }}
                >
                  badge
                </span>
                <h3 className='text-xs font-semibold text-gray-500 uppercase px-1'>
                  {t.nationalIdCard}
                </h3>
              </div>
              {employee.nationalIdCard || employee.nationalIdCardBack ? (
                <div className='grid grid-cols-1 gap-4'>
                  {employee.nationalIdCard && (
                    <div className='space-y-1'>
                      <span className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.frontFace}
                      </span>
                      <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl p-2 flex justify-center'>
                        <img
                          src={employee.nationalIdCard}
                          alt='National ID Front'
                          className='max-w-full max-h-[400px] object-contain rounded-lg'
                        />
                      </div>
                    </div>
                  )}
                  {employee.nationalIdCardBack && (
                    <div className='space-y-1'>
                      <span className='text-xs font-semibold text-gray-500 uppercase px-1'>
                        {t.backFace}
                      </span>
                      <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl p-2 flex justify-center'>
                        <img
                          src={employee.nationalIdCardBack}
                          alt='National ID Back'
                          className='max-w-full max-h-[400px] object-contain rounded-lg'
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-center py-8 bg-(--bg-card) border border-(--border-divider) border-dashed rounded-xl'>
                  <p className='text-sm text-gray-400'>
                    {t.noIdCardImages}
                  </p>
                </div>
              )}
            </div>

            {/* Syndicate Cards Section - Only for Pharmacists */}
            {employee.role === 'pharmacist' && (
              <div className='space-y-3'>
                <div className='flex items-center gap-2 pb-2 border-b border-(--border-divider)'>
                  <span 
                    className='material-symbols-rounded text-gray-400'
                    style={{ fontSize: 'var(--icon-base)' }}
                  >
                    card_membership
                  </span>
                  <h3 className='text-xs font-semibold text-gray-500 uppercase px-1'>
                    {t.syndicateCards}
                  </h3>
                </div>
                {employee.mainSyndicateCard || employee.subSyndicateCard ? (
                  <div className='grid grid-cols-1 gap-4'>
                    {employee.mainSyndicateCard && (
                      <div className='space-y-1'>
                        <span className='text-xs font-semibold text-gray-500 uppercase px-1'>
                          {t.mainSyndicateCard}
                        </span>
                        <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl p-2 flex justify-center'>
                          <img
                            src={employee.mainSyndicateCard}
                            alt='Main Syndicate'
                            className='max-w-full max-h-[400px] object-contain rounded-lg'
                          />
                        </div>
                      </div>
                    )}
                    {employee.subSyndicateCard && (
                      <div className='space-y-1'>
                        <span className='text-xs font-semibold text-gray-500 uppercase px-1'>
                          {t.subSyndicate}
                        </span>
                        <div className='bg-(--bg-card) border border-(--border-divider) rounded-xl p-2 flex justify-center'>
                          <img
                            src={employee.subSyndicateCard}
                            alt='Sub Syndicate'
                            className='max-w-full max-h-[400px] object-contain rounded-lg'
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='text-center py-8 bg-(--bg-card) border border-(--border-divider) border-dashed rounded-xl'>
                    <p className='text-sm text-gray-400'>
                      {t.noSyndicateImages}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
