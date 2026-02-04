/**
 * Sharding Utilities
 * Helper functions to manage time-based data partitioning.
 */

export const getShardKey = (baseKey: string, date: Date | string): string => {
  const d = new Date(date);
  const year = d.getFullYear(); // e.g. 2025
  const month = String(d.getMonth() + 1).padStart(2, '0'); // 01-12
  return `${baseKey}_${year}_${month}`;
};

export const getPreviousShardKeys = (baseKey: string, monthsBack: number = 3): string[] => {
  const keys: string[] = [];
  const today = new Date();

  for (let i = 1; i <= monthsBack; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    keys.push(getShardKey(baseKey, d));
  }
  return keys;
};

export const getAllShardKeys = (baseKey: string): string[] => {
  if (typeof localStorage === 'undefined') return [];
  
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // improved regex to match exact pattern strictly
    if (key && key.startsWith(`${baseKey}_`) && /_\d{4}_\d{2}$/.test(key)) {
      keys.push(key);
    }
  }
  return keys.sort().reverse(); // Newest first
};
