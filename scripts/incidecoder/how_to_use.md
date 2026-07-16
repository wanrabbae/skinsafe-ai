# default: baca brand dari brand.json — 20 produk per brand
node scripts/incidecoder/scrape.mjs

# ubah angka
node scripts/incidecoder/scrape.mjs --limit 50

# scrape semua produk di setiap brand (dari brand.json)
node scripts/incidecoder/scrape.mjs --all

# pakai file brand lain
node scripts/incidecoder/scrape.mjs --brands-file scripts/incidecoder/brand.json --limit 20

# override: brand spesifik (abaikan brand.json)
node scripts/incidecoder/scrape.mjs --brands wardah,skintific --limit 20
