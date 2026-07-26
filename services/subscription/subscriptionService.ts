import { PLAN_FEATURES, type PlanFeature } from '../../config/planFeatures';
import { authService } from '../auth/authService';
import { orgRepository } from '../org/repositories/orgRepository';
import type { Subscription } from '../../types/org';
import type { SubscriptionPlan } from '../../types/auth';

export interface SubscriptionService {
  can(feature: PlanFeature): Promise<boolean>;
  getPlan(orgId: string): Promise<SubscriptionPlan | undefined>;
  getSubscription(orgId: string): Promise<Subscription | null>;
}

class SubscriptionServiceImpl implements SubscriptionService {
  async can(feature: PlanFeature): Promise<boolean> {
    const session = authService.getCurrentUserSync();
    if (!session?.orgId) return false;

    if (session.orgRole === 'owner') return true;

    const plan = await this.getPlan(session.orgId);
    if (!plan) return false;

    return (PLAN_FEATURES[plan] ?? []).includes(feature);
  }

  async getPlan(orgId: string): Promise<SubscriptionPlan | undefined> {
    const sub = await this.getSubscription(orgId);
    return sub?.plan;
  }

  async getSubscription(orgId: string): Promise<Subscription | null> {
    return orgRepository.getSubscription(orgId);
  }
}

export const subscriptionService = new SubscriptionServiceImpl();
