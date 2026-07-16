export function formatProfileLabel(value: string | null) {
  if (!value) return "Belum diketahui";

  const names: Record<string, string> = {
    acne: "Jerawat",
    aging: "Penuaan",
    breastfeeding: "Menyusui",
    combination: "Kombinasi",
    discomfort: "Iritasi/tidak nyaman",
    dryness: "Kering",
    dullness: "Kusam",
    high: "Tinggi",
    hydrating: "Butuh hidrasi",
    low: "Rendah",
    medium: "Sedang",
    none: "Tidak hamil/menyusui",
    normal: "Normal",
    oily: "Berminyak",
    oiliness: "Minyak berlebih",
    pregnant: "Hamil",
    redness: "Kemerahan",
    sensitive: "Sensitif",
    "uneven skintone": "Warna tidak merata",
  };

  return names[value] ?? value.replaceAll("_", " ");
}
