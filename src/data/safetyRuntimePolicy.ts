export type RuntimeRiskTier = 'tier_0' | 'tier_1' | 'tier_2' | 'tier_3';
export type RuntimeMode = 'normal' | 'softened' | 'restricted' | 'safety_mode' | 'prolonged_safe_mode';

export type RuntimeFlags = {
  tracking_enabled: boolean;
  progress_visible: boolean;
  optimization_enabled: boolean;
  adaptive_coaching_enabled: boolean;
  community_posting_enabled: boolean;
  wearable_interpretation_enabled: boolean;
};

export const outgrowSafetyRuntimePolicy = {
  version: '1.0.0',
  name: 'outgrow_safety_runtime_policy',
  default_risk_tier: 'tier_0' as RuntimeRiskTier,
  tier_rules: {
    tier_0: {
      mode: 'normal' as RuntimeMode,
      flags: {
        tracking_enabled: true,
        progress_visible: true,
        optimization_enabled: true,
        adaptive_coaching_enabled: true,
        community_posting_enabled: true,
        wearable_interpretation_enabled: true
      }
    },
    tier_1: {
      mode: 'softened' as RuntimeMode,
      flags: {
        tracking_enabled: true,
        progress_visible: true,
        optimization_enabled: true,
        adaptive_coaching_enabled: true,
        community_posting_enabled: true,
        wearable_interpretation_enabled: true
      }
    },
    tier_2: {
      mode: 'restricted' as RuntimeMode,
      flags: {
        tracking_enabled: true,
        progress_visible: false,
        optimization_enabled: false,
        adaptive_coaching_enabled: false,
        community_posting_enabled: false,
        wearable_interpretation_enabled: false
      }
    },
    tier_3: {
      mode: 'safety_mode' as RuntimeMode,
      flags: {
        tracking_enabled: false,
        progress_visible: false,
        optimization_enabled: false,
        adaptive_coaching_enabled: false,
        community_posting_enabled: false,
        wearable_interpretation_enabled: false
      }
    }
  },
  prolonged_safe_mode: {
    base_duration_hours: 48,
    allowed_surfaces: ['kind', 'journaling', 'profile']
  }
};

export const policyTierFromNumber = (tier: 0 | 1 | 2 | 3): RuntimeRiskTier => `tier_${tier}` as RuntimeRiskTier;

export const resolveTierRule = (tier: 0 | 1 | 2 | 3) =>
  outgrowSafetyRuntimePolicy.tier_rules[policyTierFromNumber(tier)];
