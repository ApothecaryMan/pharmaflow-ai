/**
 * Type declarations for Tauri plugins that don't provide built-in types
 * or to fix module resolution issues.
 */

declare module '@tauri-apps/plugin-updater' {
  export interface Update {
    version: string;
    date?: string;
    body?: string;
    downloadAndInstall(onProgress?: (progress: { chunkLength: number; contentLength?: number }) => void): Promise<void>;
  }
  export function check(): Promise<Update | null>;
}

declare module '@tauri-apps/plugin-process' {
  export function relaunch(): Promise<void>;
  export function exit(code?: number): Promise<void>;
}


declare module '@tauri-apps/api/window' {
  export function getCurrentWindow(): any;
}

declare module '@mynaui/icons-react' {
  const content: any;
  export default content;
  export const Monitor: any;
  export const Grid: any;
  export const Box: any;
  export const Cart: any;
  export const CreditCard: any;
  export const UsersGroup: any;
  export const FileCheck: any;
  export const CogFour: any;
  export const BuildingOne: any;
  export const Printer: any;
  export const Download: any;
  export const Upload: any;
  export const Logout: any;
  export const Menu: any;
  export const ChevronDown: any;
  export const Search: any;
  export const FileText: any;
  export const CartCheck: any;
  export const User: any;
  export const UserSettings: any;
  export const GitBranch: any;
  export const Cog: any;
  export const CheckCircle: any;
  export const InfoCircle: any;
  export const Pencil: any;
  export const Circle: any;
}
