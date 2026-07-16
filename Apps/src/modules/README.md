# Module conventions

Setiap domain memakai empat layer:

- `route/`: handler HTTP yang dire-export tipis oleh `src/app/api/**/route.ts`.
- `actions/`: Server Actions untuk mutation dari UI.
- `service/`: business logic dan satu-satunya layer yang mengakses data milik module.
- `aggregator/`: read-only composition melalui public API module lain.

`index.ts` adalah public API read-only. Cross-module import hanya melalui `@/modules/<name>`. Di dalam module sendiri, gunakan relative import. Tambah module baru dengan empat folder tersebut dan barrel `index.ts`; jangan mengekspos route, action, atau service mutation lewat barrel.
