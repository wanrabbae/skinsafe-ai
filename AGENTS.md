## Always apply: graphify + ponytail

Untuk setiap sesi di repo ini, **selalu** terapkan **graphify** dan **ponytail**. Jangan menunggu user mengetik `/graphify` atau `ponytail`.

---

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the graphify skill before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
- Dirty `graphify-out/` files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

Skill path: `.codex/skills/graphify/SKILL.md`

---

## ponytail

Untuk **setiap** tugas coding (write, add, refactor, fix, review, design, pilih library/dependency): selalu terapkan **ponytail** di intensitas **full**, kecuali user bilang `stop ponytail` / `normal mode`, atau meminta `/ponytail lite|ultra`.

Prinsip:
1. Apakah ini perlu ada sama sekali? (YAGNI) — kalau spekulatif, skip dan bilang singkat.
2. Sudah ada di codebase? Reuse dulu.
3. Stdlib / fitur native platform dulu.
4. Dependency yang sudah terpasang dulu; jangan tambah dependency baru kalau beberapa baris cukup.
5. Solusi paling pendek yang benar-benar bekerja — bukan over-engineered.

Jangan drift ke over-building antar response. Off hanya jika user menghentikannya.

Skill path: `.codex/skills/ponytail/SKILL.md`
