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
      employees: {
        Row: {
          id: string
          branch_id: string
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
          created_at: string | null
        }
        Insert: any
        Update: any
      }
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
          description: string | null
          status: string
        }
        Insert: any
        Update: any
      }
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
      audit_logs: {
        Row: {
          id: string
          branch_id: string | null
          actor_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          details: Json | null
          ip_address: string | null
          created_at: string | null
        }
        Insert: any
        Update: any
      }
      // Added dynamically later if needed
      [key: string]: any
    }
    Views: {
      [key: string]: {
        Row: Record<string, unknown>
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      [key: string]: unknown
    }
  }
}
