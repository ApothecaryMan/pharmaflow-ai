import { supabase } from '../../../lib/supabase';
import type { Employee } from '../../../types';

export const employeeRepository = {
  tableName: 'employees',

  mapFromDb(db: any): Employee {
    const branchName = db.branches
      ? Array.isArray(db.branches)
        ? db.branches[0]?.name
        : db.branches.name
      : undefined;
    const orgName = db.organizations
      ? Array.isArray(db.organizations)
        ? db.organizations[0]?.name
        : db.organizations.name
      : undefined;

    return {
      id: db.id,
      orgId: db.org_id,
      orgName,
      branchId: db.branch_id,
      branchName,
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
      endDate: db.end_date || undefined,
      salary: db.salary || undefined,
      notes: db.notes || undefined,
      username: db.username || undefined,
      userId: db.auth_user_id || undefined,
      password: db.password || undefined,
      biometricCredentialId: db.biometric_credential_id || undefined,
      biometricPublicKey: db.biometric_public_key || undefined,
      image: db.photo || undefined,
      coverStyle: db.cover_style || undefined,
      designSettings: db.design_settings || undefined,
      nationalIdCard: db.national_id_card || undefined,
      nationalIdCardBack: db.national_id_card_back || undefined,
      mainSyndicateCard: db.main_syndicate_card || undefined,
      subSyndicateCard: db.sub_syndicate_card || undefined,
    };
  },

  mapToDb(e: Partial<Employee>): any {
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
    if (e.endDate !== undefined) db.end_date = e.endDate;
    if (e.salary !== undefined) db.salary = e.salary;
    if (e.notes !== undefined) db.notes = e.notes;
    if (e.username !== undefined) db.username = e.username;
    if (e.userId !== undefined) db.auth_user_id = e.userId;
    if (e.password !== undefined) db.password = e.password;
    if (e.biometricCredentialId !== undefined) db.biometric_credential_id = e.biometricCredentialId;
    if (e.biometricPublicKey !== undefined) db.biometric_public_key = e.biometricPublicKey;
    if (e.image !== undefined) db.photo = e.image;
    if (e.coverStyle !== undefined) db.cover_style = e.coverStyle;
    if (e.designSettings !== undefined) db.design_settings = e.designSettings;
    if (e.nationalIdCard !== undefined) db.national_id_card = e.nationalIdCard;
    if (e.nationalIdCardBack !== undefined) db.national_id_card_back = e.nationalIdCardBack;
    if (e.mainSyndicateCard !== undefined) db.main_syndicate_card = e.mainSyndicateCard;
    if (e.subSyndicateCard !== undefined) db.sub_syndicate_card = e.subSyndicateCard;
    return db;
  },

  BASE_COLUMNS:
    'id, org_id, branch_id, employee_code, name, name_arabic, phone, email, position, department, role, start_date, status, end_date, salary, username, auth_user_id, photo, cover_style',

  async getAll(orgId: string, branchId?: string): Promise<Employee[]> {
    let query = supabase.from(this.tableName).select(this.BASE_COLUMNS).eq('org_id', orgId);

    if (branchId) {
      const ADMIN_ROLES = ['admin', 'pharmacist_owner', 'manager'];
      query = query.or(`branch_id.eq.${branchId},role.in.(${ADMIN_ROLES.join(',')})`);
    }

    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map((item) => this.mapFromDb(item));
  },

  async getById(id: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async getDocuments(id: string): Promise<Partial<Employee> | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('national_id_card, national_id_card_back, main_syndicate_card, sub_syndicate_card')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data
      ? {
          nationalIdCard: data.national_id_card || undefined,
          nationalIdCardBack: data.national_id_card_back || undefined,
          mainSyndicateCard: data.main_syndicate_card || undefined,
          subSyndicateCard: data.sub_syndicate_card || undefined,
        }
      : null;
  },

  async getDocument(id: string, column: string): Promise<string | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(column)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? data[column] : null;
  },

  async insert(employee: Employee): Promise<void> {
    const { error } = await supabase.from(this.tableName).insert(this.mapToDb(employee));
    if (error) throw error;
  },

  async update(id: string, updates: Partial<Employee>): Promise<Employee> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(this.mapToDb(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.mapFromDb(data);
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getByAuthUserId(userId: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('auth_user_id', userId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async getAllByAuthUserId(_userId: string): Promise<Employee[]> {
    // Use RPC to bypass RLS circular dependency on organizations/branches
    const { data, error } = await supabase.rpc('get_my_workspaces');
    if (error) throw error;
    return (data || []).map((item: any) => ({
      ...this.mapFromDb(item),
      orgName: item.org_name,
      branchName: item.branch_name,
    }));
  },

  async getByUsername(username: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('username', username)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async getEmailByUsername(username: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('get_email_by_username', { p_username: username });
    if (error) throw error;
    return data;
  },

  async getByEmail(email: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapFromDb(data) : null;
  },

  async upsert(employees: Employee[]): Promise<void> {
    if (employees.length === 0) return;
    const dbEmployees = employees.map((e) => this.mapToDb(e));
    const { error } = await supabase.from(this.tableName).upsert(dbEmployees);
    if (error) throw error;
  },

  /**
   * Links a legacy employee record to a global user profile
   * @param employeeId The local employee record ID
   * @param globalIdentifier The global @username or UUID to link to
   * @returns The updated employee, or throws an error if not found/failed
   */
  async linkGlobalAccount(employeeId: string, globalIdentifier: string): Promise<Employee> {
    // 1. Determine if identifier is UUID or username
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      globalIdentifier
    );

    // 2. Query user_profiles
    const query = supabase
      .from('user_profiles')
      .select('id, username')
      .eq(
        isUUID ? 'id' : 'username',
        isUUID ? globalIdentifier : globalIdentifier.replace(/^@/, '')
      )
      .single();

    const { data: profile, error: profileError } = await query;

    if (profileError || !profile) {
      throw new Error('Global account not found. Please verify the ID or Username.');
    }

    // 3. Update the employee record
    const { data: updatedEmployee, error: updateError } = await supabase
      .from(this.tableName)
      .update({
        auth_user_id: profile.id,
        username: profile.username,
      })
      .eq('id', employeeId)
      .select()
      .single();

    if (updateError || !updatedEmployee) {
      throw new Error('Failed to link account to the employee record.');
    }

    return this.mapFromDb(updatedEmployee);
  },
};
