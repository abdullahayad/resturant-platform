// 12500 -> "12,500". Done by hand rather than toLocaleString, whose
// grouping varies between Android versions.
export function formatIqd(amount: number): string {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
