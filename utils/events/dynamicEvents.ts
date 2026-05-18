import { dragonOnLogoEvent } from './instances/dragonOnLogo';
import { eidNavbarIconsEvent } from './instances/eidNavbarIcons';
import { moneyBonusCursorEvent } from './instances/moneyBonusCursor';
import { walkingCowEvent } from './instances/walkingCow';
import { winterPosSnowEvent, winterStatusPileEvent } from './instances/winterEvents';
import type { DynamicEvent } from './types';

export * from './types';

export const DYNAMIC_EVENTS: DynamicEvent[] = [
  eidNavbarIconsEvent,
  moneyBonusCursorEvent,
  dragonOnLogoEvent,
  winterPosSnowEvent,
  winterStatusPileEvent,
  walkingCowEvent,
];
