export type BuildingCsvRow = {
  contractNo: string;
  customerName: string;
  buildingName: string;
  startDate: string;
  endDate: string;
  serviceFee: number;
};

const normalize = (value: string) => value.trim().replace(/^"|"$/g, "");
const numberValue = (value: string) => Number(value.replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^\d]/g, "")) || 0;

export function parseBuildingsCsv(text: string): BuildingCsvRow[] {
  if (!text.trim()) return [];
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const split = (line: string) => line.split(/[,;\t]/).map(normalize);
  const headers = split(lines[0]);
  const header = headers.join("|");
  const hasHeader = /قرارداد|مشتری|ساختمان|هزینه/.test(header);
  const find = (...names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));
  const indexes = {
    no: find("شماره قرارداد"), customer: find("نام مشتری", "مشتری"), building: find("نام ساختمان", "ساختمان"),
    start: find("تاریخ شروع"), end: find("تاریخ پایان"), fee: find("هزینه سرویس", "مبلغ سرویس", "هزینه هر دوره"),
  };
  return lines.slice(hasHeader ? 1 : 0).map((line) => {
    const t = split(line);
    const at = (index: number, fallback: number) => t[index >= 0 ? index : fallback] || "";
    return { contractNo: numberValue(at(indexes.no, 0)).toString(), customerName: at(indexes.customer, 1), buildingName: at(indexes.building, 2), startDate: at(indexes.start, 3), endDate: at(indexes.end, 4), serviceFee: numberValue(at(indexes.fee, 5)) };
  }).filter(row => row.contractNo || row.buildingName);
}
