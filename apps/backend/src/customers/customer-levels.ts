// Customer levels, from verified visits only (a restaurant scanned the
// customer's visit code) - never self-reported, never GPS. Index = level - 1:
// Level 1 from the first visit, Level 2 at 3 visits, ... Level 5 at 50.
export const LEVEL_THRESHOLDS = [0, 3, 10, 25, 50] as const;
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

// Level 4 ("Critic") and up can be a public critic.
export const CRITIC_MIN_VISITS = LEVEL_THRESHOLDS[3];

export interface CriticFlags {
  isPublic: boolean;
  criticHidden: boolean;
  isStar: boolean;
  blockedAt: Date | null;
}

// A critic = a customer who chose a public profile and reached Level 4 (or
// was made a LiGETA Star by an admin), unless an admin took the status
// away or blocked them.
export function isCritic(c: CriticFlags, visitCount: number): boolean {
  return c.isPublic && !c.criticHidden && !c.blockedAt && (c.isStar || visitCount >= CRITIC_MIN_VISITS);
}

export function levelFor(visitCount: number): { level: number; nextLevelAt: number | null } {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (visitCount >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return { level, nextLevelAt: level < MAX_LEVEL ? LEVEL_THRESHOLDS[level] : null };
}
