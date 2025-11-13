// Server/services/reviewAnalyzer.js
// Simple keyword-based sentiment + fraud detector (v1)

const positiveWords = [
  "good",
  "great",
  "excellent",
  "nice",
  "amazing",
  "perfect",
  "satisfied",
  "happy",
  "trust",
  "genuine",
];

const negativeWords = [
  "bad",
  "worst",
  "terrible",
  "horrible",
  "disappointed",
  "delay",
  "late",
  "rude",
  "cheated",
  "cheat",
];

const fraudWords = [
  "scam",
  "fraud",
  "fake",
  "counterfeit",
  "never delivered",
  "not delivered",
  "did not deliver",
  "didn't deliver",
  "stolen",
  "duplicate",
];

const nonDeliveryPatterns = [
  "never delivered",
  "not delivered",
  "did not deliver",
  "didn't deliver",
  "no delivery",
  "item not received",
  "never got the item",
];

const fakeProductPatterns = [
  "fake product",
  "counterfeit",
  "not original",
  "duplicate product",
  "not genuine",
];

function countMatches(text, words) {
  let count = 0;
  for (const w of words) {
    const regex = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

function includesAny(text, patterns) {
  text = text.toLowerCase();
  return patterns.some((p) => text.includes(p.toLowerCase()));
}

function analyzeReviewText(commentRaw) {
  const comment = (commentRaw || "").toLowerCase().trim();

  if (!comment) {
    return {
      sentimentScore: null,
      fraudKeywordsScore: null,
      toxicityScore: null,
      fraudFlags: {
        possibleScam: false,
        nonDelivery: false,
        fakeProduct: false,
      },
    };
  }

  const posCount = countMatches(comment, positiveWords);
  const negCount = countMatches(comment, negativeWords);
  const total = posCount + negCount;

  let sentimentScore = 0;
  if (total > 0) {
    sentimentScore = (posCount - negCount) / total; // range roughly -1..+1
  }

  const fraudCount = countMatches(comment, fraudWords);
  const fraudKeywordsScore = Math.min(fraudCount / 3, 1);

  const possibleScam = fraudKeywordsScore > 0;
  const nonDelivery = includesAny(comment, nonDeliveryPatterns);
  const fakeProduct = includesAny(comment, fakeProductPatterns);

  return {
    sentimentScore,
    fraudKeywordsScore,
    toxicityScore: null,
    fraudFlags: {
      possibleScam,
      nonDelivery,
      fakeProduct,
    },
  };
}

module.exports = { analyzeReviewText };
