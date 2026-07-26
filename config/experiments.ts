export const EXPERIMENTS = {
  newCheckoutFlow: import.meta.env.VITE_EXP_NEW_CHECKOUT === 'true',
  aiRecommendations: false,
  betaInventoryView: false,
} as const;

export type Experiment = keyof typeof EXPERIMENTS;

export const isExperimentEnabled = (exp: Experiment): boolean => EXPERIMENTS[exp];
