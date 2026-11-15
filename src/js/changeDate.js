export default function timeAgo(value) {
  const date = value instanceof Date ? value : new Date(value);
  const seconds = (date.getTime() - Date.now()) / 1000;

  if (!Number.isFinite(seconds)) return "";
  if (Math.abs(seconds) < 5) return "الآن";

  const units = [
    ["year", 365 * 24 * 60 * 60],
    ["month", 30 * 24 * 60 * 60],
    ["week", 7 * 24 * 60 * 60],
    ["day", 24 * 60 * 60],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  const formatter = new Intl.RelativeTimeFormat("ar-EG", {
    numeric: "auto",
  });

  const [unit, length] = units.find(
    ([, length]) => Math.abs(seconds) >= length
  );

  return formatter.format(Math.round(seconds / length), unit);
}