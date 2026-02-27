export type PolicyRuleMatch = {
  ruleId: string;
  label: string;
  matchedText: string;
};

type BlockedClaimRule = {
  id: string;
  label: string;
  pattern: RegExp;
};

export const BLOCKED_CLAIM_RULES: BlockedClaimRule[] = [
  {
    id: "warranty_guarantee",
    label: "Warranty/coverage guarantee",
    pattern: /\b(warranty|dealer warranty|manufacturer warranty)\b.{0,24}\b(guaranteed|guarantees?|always covered|must cover)\b/i,
  },
  {
    id: "legal_rights_claim",
    label: "Legal-rights certainty claim",
    pattern: /\b(you are legally entitled|the law guarantees|legal guarantee|must by law)\b/i,
  },
  {
    id: "exact_outcome_claim",
    label: "Exact repair outcome guarantee",
    pattern: /\b(guaranteed fix|will definitely fix|certain to fix|100% fix|cannot fail)\b/i,
  },
  {
    id: "exact_cost_claim",
    label: "Exact cost certainty claim",
    pattern: /\b(exact cost|exact price|fixed price for sure|guaranteed price)\b/i,
  },
];

export function findBlockedClaimMatches(text: string): PolicyRuleMatch[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const matches: PolicyRuleMatch[] = [];

  for (const rule of BLOCKED_CLAIM_RULES) {
    const result = normalized.match(rule.pattern);
    if (!result) {
      continue;
    }

    matches.push({
      ruleId: rule.id,
      label: rule.label,
      matchedText: result[0],
    });
  }

  return matches;
}
