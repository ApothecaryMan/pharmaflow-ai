import { type MenuItem, PHARMACY_MENU } from '../config/menuData.ts';
import { PAGE_REGISTRY } from '../config/pageRegistry.ts';
import { PermissionAction, ROLE_PERMISSIONS } from '../config/permissions.ts';

// 1. Extract Defined Permissions
const DEFINED_PERMISSIONS = new Set<string>();
Object.values(ROLE_PERMISSIONS).forEach((rolePerms) => {
  rolePerms.forEach((p) => DEFINED_PERMISSIONS.add(p));
});

console.log(`✅ Loaded ${DEFINED_PERMISSIONS.size} unique permissions from permissions.ts`);

// 2. Scan Menu Data
const menuErrors: string[] = [];
const scanMenu = (items: MenuItem[], path: string) => {
  items.forEach((item) => {
    const itemPath = `${path} > ${item.label}`;

    if (item.permission) {
      if (!DEFINED_PERMISSIONS.has(item.permission)) {
        menuErrors.push(`[MENU] Undefined permission '${item.permission}' at: ${itemPath}`);
      }
    }

    if (item.submenus) {
      item.submenus.forEach((sub) => {
        const subPath = `${itemPath} > ${sub.label}`;
        if (sub.permission) {
          if (!DEFINED_PERMISSIONS.has(sub.permission)) {
            menuErrors.push(`[MENU] Undefined permission '${sub.permission}' at: ${subPath}`);
          }
        }

        sub.items.forEach((subItem) => {
          if (typeof subItem === 'object' && subItem.permission) {
            if (!DEFINED_PERMISSIONS.has(subItem.permission)) {
              menuErrors.push(
                `[MENU] Undefined permission '${subItem.permission}' at: ${subPath} > ${subItem.label}`
              );
            }
          }
        });
      });
    }
  });
};

scanMenu(PHARMACY_MENU, 'Root');

// 3. Scan Page Registry
const pageErrors: string[] = [];
Object.entries(PAGE_REGISTRY).forEach(([key, config]) => {
  if (config.permission) {
    if (!DEFINED_PERMISSIONS.has(config.permission)) {
      pageErrors.push(`[PAGE] Undefined permission '${config.permission}' in pageConfig: ${key}`);
    }
  }
});

// 4. Report Results
console.log('\n--- RBAC Verification Report ---');
if (menuErrors.length === 0 && pageErrors.length === 0) {
  console.log('✅ SUCCESS: All permission references are valid.');
  process.exit(0);
} else {
  console.error(`❌ FOUND ERRORS:`);
  menuErrors.forEach((e) => console.error(e));
  pageErrors.forEach((e) => console.error(e));
  process.exit(1);
}
