export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // ═══════════════════════════════════════════
      // Multi-Tenant Tables
      // ═══════════════════════════════════════════

      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          logo_url: string | null
          status: 'active' | 'suspended' | 'deleted'
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          logo_url?: string | null
          status?: 'active' | 'suspended' | 'deleted'
        }
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }

      org_members: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
        }
        Update: Partial<Database['public']['Tables']['org_members']['Insert']>
      }

      subscriptions: {
        Row: {
          id: string
          org_id: string
          plan: 'free' | 'starter' | 'pro' | 'enterprise'
          status: 'active' | 'trial' | 'past_due' | 'cancelled'
          max_branches: number
          max_employees: number
          max_drugs: number
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          plan?: 'free' | 'starter' | 'pro' | 'enterprise'
          status?: 'active' | 'trial' | 'past_due' | 'cancelled'
          max_branches?: number
          max_employees?: number
          max_drugs?: number
        }
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }

      // ═══════════════════════════════════════════
      // Core Tables
      // ═══════════════════════════════════════════

      branches: {
        Row: {
          id: string
          org_id: string | null
          name: string
          code: string
          address: string | null
          phone: string | null
          status: 'active' | 'inactive'
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          org_id?: string | null
          name: string
          code: string
          address?: string | null
          phone?: string | null
          status?: 'active' | 'inactive'
        }
        Update: Partial<Database['public']['Tables']['branches']['Insert']>
      }

      employees: {
        Row: {
          id: string
          branch_id: string
          auth_user_id: string | null
          employee_code: string
          name: string
          name_arabic: string | null
          phone: string
          email: string | null
          position: string
          department: string
          role: string
          start_date: string
          status: string
          salary: number | null
          notes: string | null
          username: string | null
          photo: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: any
        Update: any
      }

      // ═══════════════════════════════════════════
      // Inventory Domain
      // ═══════════════════════════════════════════

      drugs: {
        Row: {
          id: string
          branch_id: string
          name: string
          name_arabic: string | null
          generic_name: string[] | null
          category: string
          price: number
          cost_price: number
          stock: number
          damaged_stock: number | null
          expiry_date: string | null
          barcode: string | null
          internal_code: string | null
          units_per_pack: number | null
          supplier_id: string | null
          max_discount: number | null
          dosage_form: string | null
          min_stock: number | null
          origin: string | null
          manufacturer: string | null
          tax: number | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: any
        Update: any
      }

      stock_batches: {
        Row: {
          id: string
          branch_id: string
          drug_id: string
          quantity: number
          expiry_date: string
          cost_price: number
          purchase_id: string | null
          date_received: string
          batch_number: string | null
          version: number
          created_at: string | null
        }
        Insert: any
        Update: any
      }

      stock_movements: {
        Row: {
          id: string
          drug_id: string
          drug_name_snapshot: string
          branch_id: string
          type: string
          quantity: number
          previous_stock: number
          new_stock: number
          reason: string | null
          notes: string | null
          reference_id: string | null
          transaction_id: string | null
          batch_id: string | null
          performed_by: string
          performed_by_name_snapshot: string | null
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          expiry_date: string | null
          timestamp: string
        }
        Insert: any
        Update: any
      }

      suppliers: {
        Row: {
          id: string
          branch_id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: any
        Update: any
      }

      // ═══════════════════════════════════════════
      // Sales Domain
      // ═══════════════════════════════════════════

      sales: {
        Row: {
          id: string
          serial_id: string | null
          branch_id: string
          date: string
          updated_at: string | null
          sold_by_employee_id: string | null
          daily_order_number: number | null
          total: number
          subtotal: number | null
          customer_name: string | null
          customer_code: string | null
          customer_phone: string | null
          customer_address: string | null
          payment_method: 'cash' | 'visa'
          sale_type: 'walk-in' | 'delivery' | null
          delivery_fee: number | null
          global_discount: number | null
          status: 'completed' | 'cancelled' | 'pending' | 'with_delivery' | 'on_way'
          processing_time_min: number | null
          created_at: string | null
        }
        Insert: any
        Update: any
      }

      sale_items: {
        Row: {
          id: string
          branch_id: string
          sale_id: string
          drug_id: string
          quantity: number
          price: number
          cost_price: number | null
          discount: number | null
          is_unit: boolean | null
        }
        Insert: any
        Update: any
      }

      sale_item_batches: {
        Row: {
          id: string
          branch_id: string
          sale_item_id: string
          batch_id: string
          quantity: number
          expiry_date: string
        }
        Insert: any
        Update: any
      }

      // ═══════════════════════════════════════════
      // Purchases Domain
      // ═══════════════════════════════════════════

      purchases: {
        Row: {
          id: string
          branch_id: string
          date: string
          supplier_id: string
          supplier_name_snapshot: string
          total_cost: number
          total_tax: number | null
          status: 'completed' | 'pending' | 'rejected'
          payment_type: 'cash' | 'credit' | null
          invoice_id: string | null
          external_invoice_id: string | null
          approved_by: string | null
          approval_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: any
        Update: any
      }

      purchase_items: {
        Row: {
          id: string
          branch_id: string
          purchase_id: string
          drug_id: string
          name: string
          quantity: number
          cost_price: number
          expiry_date: string | null
          dosage_form: string | null
          discount: number | null
          sale_price: number | null
          tax: number | null
          is_unit: boolean | null
          units_per_pack: number | null
        }
        Insert: any
        Update: any
      }

      // ═══════════════════════════════════════════
      // Returns Domain
      // ═══════════════════════════════════════════

      returns: {
        Row: {
          id: string
          branch_id: string
          sale_id: string
          date: string
          return_type: 'full' | 'partial' | 'unit'
          total_refund: number
          reason: string
          notes: string | null
          processed_by: string | null
        }
        Insert: any
        Update: any
      }

      return_items: {
        Row: {
          id: string
          branch_id: string
          return_id: string
          drug_id: string
          name: string
          quantity_returned: number
          is_unit: boolean | null
          original_price: number
          refund_amount: number
          reason: string | null
          condition: string
          dosage_form: string | null
        }
        Insert: any
        Update: any
      }

      purchase_returns: {
        Row: {
          id: string
          branch_id: string
          purchase_id: string
          supplier_id: string
          supplier_name_snapshot: string
          date: string
          total_refund: number
          status: 'pending' | 'approved' | 'completed'
          notes: string | null
        }
        Insert: any
        Update: any
      }

      purchase_return_items: {
        Row: {
          id: string
          branch_id: string
          purchase_return_id: string
          drug_id: string
          name: string
          quantity_returned: number
          is_unit: boolean | null
          units_per_pack: number | null
          cost_price: number
          refund_amount: number
          dosage_form: string | null
          reason: string
          condition: string
        }
        Insert: any
        Update: any
      }

      // ═══════════════════════════════════════════
      // CRM Domain
      // ═══════════════════════════════════════════

      customers: {
        Row: {
          id: string
          branch_id: string
          serial_id: string
          code: string
          name: string
          phone: string
          email: string | null
          governorate: string | null
          city: string | null
          area: string | null
          street_address: string | null
          insurance_provider: string | null
          policy_number: string | null
          chronic_conditions: string[] | null
          total_purchases: number | null
          points: number | null
          last_visit: string | null
          notes: string | null
          status: string | null
          vip: boolean | null
          registered_by: string | null
          created_at: string | null
        }
        Insert: any
        Update: any
      }

      // ═══════════════════════════════════════════
      // Operations Domain
      // ═══════════════════════════════════════════

      shifts: {
        Row: {
          id: string
          branch_id: string
          branch_name: string | null
          status: 'open' | 'closed'
          open_time: string
          close_time: string | null
          opened_by: string
          closed_by: string | null
          opening_balance: number
          closing_balance: number | null
          expected_balance: number | null
          cash_in: number | null
          cash_out: number | null
          cash_sales: number | null
          card_sales: number | null
          returns: number | null
          notes: string | null
          handover_receipt_number: number | null
        }
        Insert: any
        Update: any
      }

      cash_transactions: {
        Row: {
          id: string
          branch_id: string
          shift_id: string
          time: string
          type: string
          amount: number
          reason: string | null
          user_id: string
          related_sale_id: string | null
        }
        Insert: any
        Update: any
      }

      audit_logs: {
        Row: {
          id: string
          branch_id: string | null
          actor_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          details: Json | null
          timestamp: string
        }
        Insert: any
        Update: any
      }

      // Dynamic tables
      [key: string]: any
    }
    Views: {
      [key: string]: {
        Row: Record<string, unknown>
      }
    }
    Functions: {
      get_user_branch_id: {
        Args: Record<string, never>
        Returns: string
      }
      get_user_branch_ids: {
        Args: Record<string, never>
        Returns: string[]
      }
      get_user_org_ids: {
        Args: Record<string, never>
        Returns: string[]
      }
      [key: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      branch_status: 'active' | 'inactive'
      employee_status: 'active' | 'inactive' | 'holiday'
      employee_dept: 'sales' | 'pharmacy' | 'marketing' | 'hr' | 'it' | 'logistics'
      employee_role: 'admin' | 'pharmacist_owner' | 'pharmacist_manager' | 'pharmacist' | 'inventory_officer' | 'assistant' | 'hr_manager' | 'cashier' | 'senior_cashier' | 'delivery' | 'delivery_pharmacist' | 'officeboy' | 'manager'
      payment_method: 'cash' | 'visa'
      sale_type: 'walk-in' | 'delivery'
      sale_status: 'completed' | 'cancelled' | 'pending' | 'with_delivery' | 'on_way'
      purchase_status: 'completed' | 'pending' | 'rejected'
      return_type: 'full' | 'partial' | 'unit'
      return_reason: 'customer_request' | 'wrong_item' | 'damaged' | 'expired' | 'defective' | 'other'
      item_condition: 'sellable' | 'damaged' | 'expired' | 'other'
      shift_status: 'open' | 'closed'
      cash_tx_type: 'opening' | 'sale' | 'card_sale' | 'in' | 'out' | 'closing' | 'return'
      movement_type: 'initial' | 'sale' | 'purchase' | 'return_customer' | 'return_supplier' | 'adjustment' | 'damage' | 'transfer_in' | 'transfer_out' | 'correction'
      org_role: 'owner' | 'admin' | 'member'
      org_status: 'active' | 'suspended' | 'deleted'
      subscription_plan: 'free' | 'starter' | 'pro' | 'enterprise'
      subscription_status: 'active' | 'trial' | 'past_due' | 'cancelled'
      [key: string]: unknown
    }
  }
}
