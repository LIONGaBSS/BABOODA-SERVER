function nowIso() {
  return new Date().toISOString();
}

function dateOnly(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return dateOnly(d);
}

function dueDates(broadcastDate) {
  return [addDays(broadcastDate, 3), addDays(broadcastDate, 7), addDays(broadcastDate, 21)];
}

function progressSymbol(scores) {
  const arr = (scores || []).map(Number).filter((n) => Number.isFinite(n));
  if (arr.length < 2) return "Sideways";
  const diff = arr[arr.length - 1] - arr[0];
  if (diff >= 10) return "Upward";
  if (diff <= -10) return "Downward";
  return "Sideways";
}

function average(nums) {
  const arr = nums.map(Number).filter((n) => Number.isFinite(n));
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

module.exports = {
  nowIso,
  dateOnly,
  addDays,
  dueDates,
  progressSymbol,
  average,
  countBy
};
