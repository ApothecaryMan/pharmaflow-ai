// Configuration
export { PHARMACY_MENU } from './menuData';
export {
  getAllPageIds,
  getMenuTranslationsFromRegistry,
  getPageConfig,
  PAGE_REGISTRY,
} from './pageRegistry';

export { MANAGER_ROLES, ADMIN_AND_OWNER_ROLES } from './permissions';
export { EXPERIMENTS, isExperimentEnabled } from './experiments';
export { PLAN_FEATURES } from './planFeatures';
export type { Experiment } from './experiments';
export type { PlanFeature } from './planFeatures';

export const MAX_UPLOAD_SIZE_KB = 500;
