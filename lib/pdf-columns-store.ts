export const PDF_COLUMNS = [
  "S No.", 
  "Customer Name", 
  "Mobile No.", 
  "ID", 
  "Type", 
  "Firm Name", 
  "Party Print", 
  "Sales Man", 
  "City", 
  "Order Val", 
  "Extra Wrk", 
  "Received", 
  "Balance", 
  "Work Rem", 
  "Call Rem"
];

export function getPdfColumnsConfig(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem("pdf_columns_config");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch(e) {}
  }
  // Default all to true
  return PDF_COLUMNS.reduce((acc, col) => ({ ...acc, [col]: true }), {});
}

export function savePdfColumnsConfig(config: Record<string, boolean>) {
  if (typeof window !== "undefined") {
    localStorage.setItem("pdf_columns_config", JSON.stringify(config));
  }
}
