export const RISK_CATEGORIES = {
    VERY_CONSERVATIVE: 'Very Conservative',
    CONSERVATIVE: 'Conservative',
    MODERATE_CONSERVATIVE: 'Moderate Conservative',
    MODERATE: 'Moderate',
    MODERATE_AGGRESSIVE: 'Moderate Aggressive',
    AGGRESSIVE: 'Aggressive'
  } as const;
  
  export const ASSET_ALLOCATIONS = {
    [RISK_CATEGORIES.VERY_CONSERVATIVE]: { equities: 20, bonds: 60, cash: 20, other: 0 },
    // ... other allocations
  };