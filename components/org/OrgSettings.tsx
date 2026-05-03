import React, { useState, useEffect, useCallback } from 'react';
import { orgService } from '../../services/org/orgService';
import { permissionsService } from '../../services/auth/permissionsService';
import { branchService } from '../../services/org/branchService';
import { employeeService } from '../../services/hr/employeeService';
import { auditService, type AuditEntry } from '../../services/audit/auditService';
import type { Organization, OrgMember, Subscription, Employee, Branch } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';
import { SmartInput } from '../common/SmartInputs';
import { useData } from '../../context/DataContext';
import { InviteModal } from './InviteModal';

interface OrgSettingsProps {
  language: 'EN' | 'AR';
  color: string;
}

export const OrgSettings: React.FC<OrgSettingsProps> = ({ language, color }) => {
  const t = TRANSLATIONS[language];
  const { refreshAll } = useData();
  
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [stats, setStats] = useState({ branches: 0, staff: 0 });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingName, setEditingName] = useState('');

  const loadData = useCallback(async () => {
    try {
      const activeOrgId = orgService.getActiveOrgId();
      if (activeOrgId) {
        const [orgData, membersData, subData, branchesData, employeesData, logsData] = await Promise.all([
          orgService.getById(activeOrgId),
          orgService.getMembers(activeOrgId),
          orgService.getSubscription(activeOrgId),
          branchService.getAll(activeOrgId),
          employeeService.getAll(),
          auditService.getOrgLogs(activeOrgId, 10)
        ]);

        setOrg(orgData);
        setEditingName(orgData?.name || '');
        setMembers(membersData || []);
        setSubscription(subData);
        setAllEmployees(employeesData);
        setBranches(branchesData);
        setLogs(logsData);
        
        const orgBranches = branchesData.filter(b => b.orgId === activeOrgId);
        setStats({
          branches: orgBranches.length,
          staff: employeesData.filter(e => e.orgId === activeOrgId || orgBranches.some(b => b.id === e.branchId)).length
        });
      }
    } catch (error) {
      console.error('Failed to load organization data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateOrg = async () => {
    if (!org || !editingName.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await orgService.update(org.id, { name: editingName });
      await loadData();
      await refreshAll();
    } catch (error) {
      console.error('Failed to update organization:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Organization not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 ${language === 'AR' ? 'font-arabic' : ''}`}>
          {language === 'AR' ? 'إعدادات المنظمة' : 'Organization Settings'}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {language === 'AR' ? 'إدارة هوية المنظمة والاشتراكات والوصول' : 'Manage your organization identity, subscriptions, and access'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: General Info */}
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="material-symbols-rounded text-primary-500">business</span>
                {language === 'AR' ? 'المعلومات العامة' : 'General Information'}
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {language === 'AR' ? 'اسم المنظمة' : 'Organization Name'}
                </label>
                <div className="flex gap-3">
                  <SmartInput
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder={language === 'AR' ? 'ادخل اسم المنظمة' : 'Enter organization name'}
                    className="flex-1"
                  />
                  <button
                    onClick={handleUpdateOrg}
                    disabled={isSubmitting || editingName === org.name}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-30 transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-rounded text-lg">save</span>
                    )}
                    {language === 'AR' ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    {language === 'AR' ? 'معرف المنظمة' : 'Organization ID'}
                  </label>
                  <p className="text-sm font-mono text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 select-all">
                    {org.id}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    {language === 'AR' ? 'تاريخ الإنشاء' : 'Created At'}
                  </label>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 p-2">
                    {new Date(org.createdAt).toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Members List */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="material-symbols-rounded text-primary-600 dark:text-primary-400" style={{ fontSize: 'var(--icon-lg)' }}>business</span>
                {language === 'AR' ? 'الملف العام للمنظمة' : 'Organization Profile'}
              </h2>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {members.length} {language === 'AR' ? 'أعضاء' : 'Members'}
                </span>
              </div>
              
              {permissionsService.isOrgAdmin() && (
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="px-3 py-1.5 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  {TRANSLATIONS[language].organization.inviteMember}
                </button>
              )}
            </div>
            
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {members.map((member) => {
                const employee = allEmployees.find(e => e.id === member.id) || 
                                 allEmployees.find(e => e.userId === member.userId);
                
                return (
                  <div key={member.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold border border-zinc-200 dark:border-zinc-700">
                        {employee?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {employee?.name || (language === 'AR' ? 'عضو غير معروف' : 'Unknown Member')}
                        </h4>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                          {member.role === 'owner' ? (language === 'AR' ? 'مالك' : 'Owner') : (language === 'AR' ? 'عضو' : 'Member')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-tighter">{language === 'AR' ? 'تاريخ الانضمام' : 'Joined'}</p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {new Date(member.joinedAt).toLocaleDateString(language === 'AR' ? 'ar-EG' : 'en-US')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {members.length === 0 && (
                <div className="p-12 text-center text-zinc-500 text-sm">
                  {language === 'AR' ? 'لا يوجد أعضاء مضافين' : 'No members found'}
                </div>
              )}
            </div>
          </section>

          {/* Subscription Section */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex justify-between items-center">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="material-symbols-rounded text-primary-600 dark:text-primary-400" style={{ fontSize: 'var(--icon-lg)' }}>credit_card</span>
                {language === 'AR' ? 'خطة الاشتراك' : 'Subscription Plan'}
              </h2>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                subscription?.status === 'active' || subscription?.status === 'trial'
                  ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                  : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
              }`}>
                {subscription ? (language === 'AR' ? (subscription.plan === 'free' ? 'خطة مجانية' : 'خطة احترافية') : `${subscription.plan} Plan`) : (language === 'AR' ? 'غير مشترك' : 'No Plan')}
              </span>
            </div>
            
            <div className="p-6">
              {subscription ? (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-50/30 dark:bg-primary-500/5 border border-primary-100/50 dark:border-primary-500/10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    subscription.status === 'trial' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                  }`}>
                    <span className="material-symbols-rounded text-2xl">{subscription.status === 'trial' ? 'hourglass_top' : 'verified'}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {subscription.status === 'trial' 
                        ? (language === 'AR' ? 'فترة تجريبية نشطة' : 'Active Trial Period') 
                        : (language === 'AR' ? 'اشتراكك نشط' : 'Your subscription is active')}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {subscription.status === 'trial' 
                        ? (language === 'AR' ? `تنتهي في ${new Date(subscription.trialEndsAt!).toLocaleDateString('ar-EG')}` : `Ends on ${new Date(subscription.trialEndsAt!).toLocaleDateString()}`)
                        : (language === 'AR' ? 'تاريخ التجديد القادم غير متوفر' : 'Renewal date info not available')}
                    </p>
                  </div>
                  <button className="text-xs font-bold text-primary-600 hover:underline">
                    {language === 'AR' ? 'إدارة الفواتير' : 'Manage Billing'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-zinc-500 mb-4">{language === 'AR' ? 'لم يتم العثور على بيانات اشتراك' : 'No subscription data found'}</p>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-xs font-bold">
                    {language === 'AR' ? 'اختر خطة' : 'Choose a Plan'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Activity Timeline */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex justify-between items-center">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="material-symbols-rounded text-zinc-500" style={{ fontSize: 'var(--icon-lg)' }}>history</span>
                {language === 'AR' ? 'آخر النشاطات' : 'Organization Activity'}
              </h2>
              <button className="text-[10px] font-bold text-primary-600 uppercase tracking-widest hover:underline">
                {language === 'AR' ? 'عرض السجل الكامل' : 'View Full Logs'}
              </button>
            </div>
            
            <div className="p-6 relative">
              {logs.length > 0 ? (
                <div className="space-y-6">
                  {/* Vertical Line */}
                  <div className="absolute left-[39px] top-8 bottom-8 w-px bg-zinc-100 dark:bg-zinc-800"></div>
                  
                  {logs.map((log, idx) => {
                    const employee = allEmployees.find(e => e.id === log.userId) || 
                                     allEmployees.find(e => e.userId === log.userId);
                    const branch = branches.find(b => b.id === log.branchId);
                    
                    return (
                      <div key={log.id} className="relative flex gap-4 group">
                        {/* Dot */}
                        <div className="relative z-10 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 mt-1 flex-shrink-0 group-hover:border-primary-500 transition-colors"></div>
                        
                        <div className="flex-1">
                          <div className="flex justify-between items-baseline mb-1">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 italic">
                               {log.action}
                            </h4>
                            <span className="text-[10px] text-zinc-400 font-medium">
                              {new Date(log.timestamp).toLocaleTimeString(language === 'AR' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3">
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                              {typeof log.details === 'string' ? log.details : (log.details?.message || JSON.stringify(log.details))}
                            </p>
                            <div className="mt-2 flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase">
                                {employee?.name || log.userName || (language === 'AR' ? 'نظام' : 'System')}
                              </span>
                              <span className="text-[10px] text-zinc-300">•</span>
                              <span className="text-[10px] text-zinc-400">
                                {branch?.name || (language === 'AR' ? 'فرع غير معروف' : 'Unknown Branch')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="material-symbols-rounded text-4xl text-zinc-200 dark:text-zinc-800 mb-2">event_busy</span>
                  <p className="text-sm text-zinc-500">{language === 'AR' ? 'لا يوجد نشاط مسجل حالياً' : 'No recent activity found'}</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right: Sidebar Stats/Info */}
        <div className="space-y-6">
          <section className="bg-zinc-900 text-white rounded-2xl p-6 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-black mb-1">
                {language === 'AR' ? 'دعم الأولوية' : 'Priority Support'}
              </h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                {language === 'AR' 
                  ? 'بصفتك مستخدمًا للمنظمة، لديك وصول مباشر لفريق الدعم التقني لدينا.' 
                  : 'As an organization user, you have direct access to our priority technical support team.'}
              </p>
              <button className="w-full py-3 bg-white text-zinc-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors">
                {language === 'AR' ? 'تواصل مع الدعم' : 'Contact Support'}
              </button>
            </div>
            {/* Abstract Background Element */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl" />
          </section>

          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              {language === 'AR' ? 'ملخص المنظمة' : 'Org Summary'}
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">{language === 'AR' ? 'عدد الفروع' : 'Branches'}</span>
                <span className="font-bold">{stats.branches}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">{language === 'AR' ? 'إجمالي الموظفين' : 'Total Staff'}</span>
                <span className="font-bold">{stats.staff}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">{language === 'AR' ? 'نوع الاشتراك' : 'Plan Type'}</span>
                <span className="font-bold text-primary-500 uppercase">
                  {subscription ? (subscription.status === 'trial' ? `${subscription.plan} (TRIAL)` : subscription.plan) : 'NONE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Invite Modal */}
        {org && (
          <InviteModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            orgId={org.id}
            language={language}
          />
        )}
      </div>
    </div>
  );
};
