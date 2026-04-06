const KEYWORD_GROUPS = {
  urgency: ["urgent", "immediately", "now", "asap", "today", "final notice", "expires", "act now"],
  authority: ["bank", "government", "police", "tax", "microsoft", "apple", "support team", "security team"],
  fear: ["suspended", "blocked", "disabled", "locked", "penalty", "fraud", "unauthorized", "breach"],
  reward: ["gift", "prize", "reward", "bonus", "free", "winner", "claim"],
  scarcity: ["limited", "few left", "last chance", "only today", "exclusive"],
  curiosity: ["see who viewed", "look what happened", "surprising", "secret", "shocking"]
};

const PATTERNS = {
  linkPresent: /(https?:\/\/|www\.|bit\.ly|tinyurl|t\.co|rb\.gy|ow\.ly)/i,
  moneyMention: /(\$|usd|eur|ils|₪|€|\bpayment\b|\btransfer\b|\binvoice\b)/i,
  contactPressure: /(verify|confirm|update|reset|claim|login|sign in|click below|tap below)/i,
  formattingPressure: /([A-Z]{4,}|!{2,}|\?{2,})/
};

function countMatches(text, terms) {
  const lower = text.toLowerCase();
  return terms.reduce((count, term) => {
    return count + (lower.includes(term.toLowerCase()) ? 1 : 0);
  }, 0);
}

function normalizeScore(matchCount, maxUsefulMatches = 3) {
  return Math.min(matchCount / maxUsefulMatches, 1);
}

export function analyzePsychology(text = "") {
  const groupScores = Object.fromEntries(
    Object.entries(KEYWORD_GROUPS).map(([group, words]) => [
      group,
      normalizeScore(countMatches(text, words))
    ])
  );

  const patternScores = {
    linkPresent: PATTERNS.linkPresent.test(text) ? 1 : 0,
    moneyMention: PATTERNS.moneyMention.test(text) ? 1 : 0,
    contactPressure: PATTERNS.contactPressure.test(text) ? 1 : 0,
    formattingPressure: PATTERNS.formattingPressure.test(text) ? 1 : 0
  };

  const factors = { ...groupScores, ...patternScores };
  const values = Object.values(factors);
  const totalScore = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

  const explanations = [];
  if (factors.urgency > 0) explanations.push("Uses urgency language");
  if (factors.authority > 0) explanations.push("References authority or official organizations");
  if (factors.fear > 0) explanations.push("Uses fear or threat language");
  if (factors.reward > 0) explanations.push("Offers a reward or prize");
  if (factors.linkPresent) explanations.push("Contains a link or shortened URL");
  if (factors.contactPressure) explanations.push("Pushes the user to verify, click, or sign in");
  if (factors.formattingPressure) explanations.push("Uses aggressive formatting");

  return {
    totalScore: Number(totalScore.toFixed(4)),
    factors,
    explanations
  };
}