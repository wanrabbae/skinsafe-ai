FLOW FRONTEND (JIKA ADA DI DB POSTRES):
1. User ketik nama produk lalu klik cari.
2. Sistem loading: mengambil produk dari DB postgres.
3. Textarea daftar bahan yang dibawah bakal auto fill ingredients.

FLOW FRONTEND (JIKA TIDAK ADA DI DB POSTRES):
1. User ketik nama produk lalu klik cari
2. Sistem loading: meng scrape endpoint API yang ada di (nama endpoint) mencari 5 produk teratas saja, lalu hasil scrape di cache di react query atau di client side.
3. Muncul pop up modal untuk user memilih salah satu produknya.
4. Lalu User memilih produk, misal produk A, produk A tersebut di masukkan ke dalam database postgres.
5. Lalu textarea daftar bahan yang dibawah akan auto fill ingredients nya.