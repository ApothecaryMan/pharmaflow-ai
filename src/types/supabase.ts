// Placeholder for Supabase types. 
// Run 'npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts' to overwrite.
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
      [key: string]: any;
    }
  }
}
