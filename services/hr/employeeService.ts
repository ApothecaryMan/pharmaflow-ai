/**
 * Employee Service - Staff management operations
 * Online-Only implementation using Supabase
 */

import { BaseDomainService } from '../core/baseDomainService';
import type { Employee } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { supabase } from '../../lib/supabase';
import { orgService } from '../org/orgService';

class EmployeeServiceImpl extends BaseDomainService<Employee> {
  protected tableName = 'employees';

  public mapFromDb(db: any): Employee {
    return {
      id: db.id,
      orgId: db.org_id,
      branchId: db.branch_id,
      employeeCode: db.employee_code,
      name: db.name,
      nameArabic: db.name_arabic || undefined,
      phone: db.phone,
      email: db.email || undefined,
      position: db.position,
      department: db.department,
      role: db.role,
      startDate: db.start_date,
      status: db.status,
      salary: db.salary || undefined,
      notes: db.notes || undefined,
      username: db.username || undefined,
      userId: db.auth_user_id || undefined,
      password: db.password || undefined,
      biometricCredentialId: db.biometric_credential_id || undefined,
      biometricPublicKey: db.biometric_public_key || undefined,
      image: db.photo || undefined,
      nationalIdCard: db.national_id_card || undefined,
      nationalIdCardBack: db.national_id_card_back || undefined,
      mainSyndicateCard: db.main_syndicate_card || undefined,
      subSyndicateCard: db.sub_syndicate_card || undefined,
    };
  }

  public mapToDb(e: Partial<Employee>): any {
    const db: any = {};
    if (e.id !== undefined) db.id = e.id;
    if (e.orgId !== undefined) db.org_id = e.orgId;
    if (e.branchId !== undefined) db.branch_id = e.branchId;
    if (e.employeeCode !== undefined) db.employee_code = e.employeeCode;
    if (e.name !== undefined) db.name = e.name;
    if (e.nameArabic !== undefined) db.name_arabic = e.nameArabic;
    if (e.phone !== undefined) db.phone = e.phone;
    if (e.email !== undefined) db.email = e.email;
    if (e.position !== undefined) db.position = e.position;
    if (e.department !== undefined) db.department = e.department;
    if (e.role !== undefined) db.role = e.role;
    if (e.startDate !== undefined) db.start_date = e.startDate;
    if (e.status !== undefined) db.status = e.status;
    if (e.salary !== undefined) db.salary = e.salary;
    if (e.notes !== undefined) db.notes = e.notes;
    if (e.username !== undefined) db.username = e.username;
    if (e.userId !== undefined) db.auth_user_id = e.userId;
    if (e.password !== undefined) db.password = e.password;
    if (e.biometricCredentialId !== undefined) db.biometric_credential_id = e.biometricCredentialId;
    if (e.biometricPublicKey !== undefined) db.biometric_public_key = e.biometricPublicKey;
    if (e.image !== undefined) db.photo = e.image;
    if (e.nationalIdCard !== undefined) db.national_id_card = e.nationalIdCard;
    if (e.nationalIdCardBack !== undefined) db.national_id_card_back = e.nationalIdCardBack;
    if (e.mainSyndicateCard !== undefined) db.main_syndicate_card = e.mainSyndicateCard;
    if (e.subSyndicateCard !== undefined) db.sub_syndicate_card = e.subSyndicateCard;
    return db;
  }

  async getAll(branchId?: string | 'ALL', orgId?: string): Promise<Employee[]> {
    const settings = await settingsService.getAll();
    const effectiveOrgId = orgId !== undefined ? orgId : (orgService.getActiveOrgId() || settings.orgId);
    const isAll = typeof branchId === 'string' && branchId.toLowerCase() === 'all';
    const effectiveBranchId = isAll ? undefined : (branchId || settings.activeBranchId || settings.branchCode);
    
    try {
      if (effectiveOrgId === '') return []; // Prevent fetching everything
      if (!effectiveOrgId) return []; // Must have an org context
      
      let query = supabase.from(this.tableName).select('*');
      
      if (effectiveOrgId) {
        query = query.eq('org_id', effectiveOrgId);
      }
      
      if (effectiveBranchId) {
        // For branch-specific fetch, we also include admins/managers who might not have a branchId set
        // or need to be visible across branches.
        const ADMIN_ROLES = ['admin', 'pharmacist_owner', 'manager'];
        query = query.or(`branch_id.eq.${effectiveBranchId},role.in.(${ADMIN_ROLES.join(',')})`);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map(item => this.mapFromDb(item));
    } catch (err) {
      console.error('[EmployeeService] getAll failed:', err);
      return [];
    }
  }

  async create(employee: Employee, branchId?: string, orgId?: string): Promise<Employee> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || employee.branchId || settings.activeBranchId || settings.branchCode;
    const effectiveOrgId = orgId || employee.orgId || settings.orgId;
    
    const newEmployee: Employee = {
      ...employee,
      id: employee.id || idGenerator.uuid(),
      branchId: effectiveBranchId,
      orgId: effectiveOrgId,
    } as Employee;

    // Generate employee code if missing
    if (!newEmployee.employeeCode) {
      const all = await this.getAll('all', effectiveOrgId);
      const maxSerial = all.reduce((max, emp) => {
        const num = parseInt((emp.employeeCode || '').replace('EMP-', '') || '0');
        return Math.max(max, isNaN(num) ? 0 : num);
      }, 0);
      newEmployee.employeeCode = `EMP-${String(maxSerial + 1).padStart(3, '0')}`;
    }

    const dbEmployee = this.mapToDb(newEmployee);
    
    // Safety check for multi-tenant isolation
    if (!dbEmployee.org_id) {
      console.warn('[EmployeeService] Creating employee without org_id. This may fail RLS checks.');
    }

    const { error } = await supabase.from(this.tableName).insert(dbEmployee);
    if (error) {
      console.error('[EmployeeService] Create failed:', error);
      throw error;
    }

    return newEmployee;
  }

  async save(employees: Employee[], branchId?: string): Promise<void> {
    const settings = await settingsService.getAll();
    const effectiveBranchId = branchId || settings.activeBranchId || settings.branchCode;
    
    const dbEmployees = employees.map(e => this.mapToDb({
      ...e,
      branchId: e.branchId || effectiveBranchId,
      orgId: e.orgId || settings.orgId
    }));

    if (dbEmployees.length > 0) {
      const { error } = await supabase.from(this.tableName).upsert(dbEmployees);
      if (error) throw error;
    }
  }
}

export const employeeService = new EmployeeServiceImpl();
