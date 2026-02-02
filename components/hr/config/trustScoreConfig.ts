/**
 * TrustScore Algorithm Configuration
 * Weights and thresholds for behavioral CSAT calculation
 */

export const TRUST_SCORE_WEIGHTS = {
  RETURN: 1.2,
  LOYALTY: 1.0,
  BASKET: 0.3,
  SPEED: 0.5,
  BASE: 2.5
} as const;

export const TRUST_SCORE_RANGE = {
  MIN: 1.0,
  MAX: 5.0
} as const;

export const LOYALTY_THRESHOLDS = {
  EXCEPTIONAL: 0.65,
  STRONG: 0.5,
  GOOD: 0.35,
  FAIR: 0.2,
  POOR: 0.1
} as const;

export const LOYALTY_SCORES = {
  EXCEPTIONAL: 1.0,
  STRONG: 0.8,
  GOOD: 0.5,
  FAIR: 0.2,
  POOR: 0,
  CRITICAL: -0.4
} as const;

export const RETURN_THRESHOLDS = {
  ZERO: 0,
  EXCELLENT: 0.5,
  GOOD: 0.8,
  FAIR: 1.0,
  ACCEPTABLE: 1.2,
  WARNING: 1.5,
  CRITICAL: 2.0
} as const;

export const RETURN_SCORES = {
  ZERO: 1.0,
  EXCELLENT: 0.8,
  GOOD: 0.5,
  FAIR: 0.3,
  ACCEPTABLE: 0,
  WARNING: -0.3,
  CRITICAL: -0.6,
  SEVERE: -1.0
} as const;

export const BASKET_THRESHOLDS = {
  LARGE: 1.4,
  ABOVE_AVG: 1.1,
  AVERAGE: 0.8,
  BELOW_AVG: 0.6
} as const;

export const BASKET_SCORES = {
  LARGE: 0.3,
  ABOVE_AVG: 0.15,
  AVERAGE: 0,
  BELOW_AVG: -0.1,
  SMALL: -0.2
} as const;

export const SPEED_THRESHOLDS = {
  EXCELLENT: 25,
  VERY_GOOD: 40,
  GOOD: 55,
  FAIR: 75,
  AVERAGE: 100,
  SLOW: 130
} as const;

export const SPEED_SCORES = {
  HEALTHY: {
    EXCELLENT: 0.5,
    VERY_GOOD: 0.35,
    GOOD: 0.2,
    FAIR: 0.1,
    AVERAGE: 0,
    SLOW: -0.15,
    VERY_SLOW: -0.3
  },
  UNHEALTHY: {
    FAST: -0.1,
    AVERAGE: 0,
    SLOW: -0.2
  }
} as const;

export const MEDIAN_FALLBACKS = {
  RETURN_BASELINE: 0.001,
  AVG_BASKET: 1
} as const;
