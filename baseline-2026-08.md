# Baseline — antes da reestruturação A/B/C

Data: 2026-08-06. Máquina: Windows 11, `d:\HERD`.
Tirado **antes** de aplicar qualquer alteração do guia novo, para haver com que comparar
daqui a uma semana. Sem isto não se sabe o que funcionou — só que se mudou tudo ao mesmo tempo.

## 1 · Volume devolvido por chamada a `Agent`

Agregado dos `.jsonl` em `~/.claude/projects/`. 150 sessões analisadas,
intervalo **2026-07-17 → 2026-08-06**, 74 resultados de `Task` encontrados
(422 sessões no disco no total).

| Métrica | chars | ~tokens (÷4) |
|---|---:|---:|
| Mediana | 5 189 | 1 297 |
| Média | 10 012 | 2 503 |
| p90 | 24 251 | 6 063 |
| Máximo | 150 395 | ~37 600 |

A média a 2× a mediana é a leitura que interessa: a distribuição tem uma cauda de relatórios
enormes. O máximo — ~37,6k tokens devolvidos por um único subagente — entra no contexto
principal e é relido em **todos** os turnos seguintes da sessão.

Alvo depois dos orçamentos de saída nos `~/.claude/agents/*.md`: mediana perto de 1k tokens
e, sobretudo, **p90 e máximo a colapsar** — é aí que está o desperdício, não na mediana.

### Script para repetir a medição

```powershell
$logs = Get-ChildItem "$env:USERPROFILE\.claude\projects" -Recurse -Filter *.jsonl |
        Sort-Object LastWriteTime -Desc | Select-Object -First 150
$sizes = @()
foreach ($log in $logs) {
  foreach ($line in [System.IO.File]::ReadLines($log.FullName)) {
    if ($line -notlike '*"toolUseResult"*') { continue }
    try { $entry = $line | ConvertFrom-Json } catch { continue }
    if ($null -eq $entry.toolUseResult) { continue }
    $json = $entry.toolUseResult | ConvertTo-Json -Depth 8 -Compress
    if ($json -notlike '*subagent*' -and $entry.message.content.name -ne 'Task') { continue }
    $sizes += $json.Length
  }
}
$sorted = $sizes | Sort-Object
"n        : $($sizes.Count)"
"mediana  : $($sorted[[int]($sizes.Count/2)])"
"media    : $([math]::Round(($sizes|Measure-Object -Average).Average,0))"
"p90      : $($sorted[[int]($sizes.Count*0.9)])"
"maximo   : $($sorted[-1])"
```

## 2 · Estado da máquina antes de mexer

- **Subagentes:** os 4 existem em `~/.claude/agents/`, sem orçamentos de saída.
  `architect: fable`, `reviewer: fable` (ambos com `Bash`), nenhum com `permissionMode: plan`.
- **MCPs user scope:** `context7` ✓, `21st` ✓, `chrome-devtools` ✗ (Chrome sem
  `--remote-debugging-port=9222`), `gbrain` ✗ (lock órfão do PGLite), + connectors claude.ai
  (higgsfield, Canva, Gmail, Calendar ✓; Google Drive precisa de autorização; Prime ✗).
- **Skills globais:** ~120 pastas em `~/.claude/skills/`, das quais 55 do gstack.
  `skills-lock.json` só regista 2 (`copywriting`, `viral-captions-and-ctas`) — o resto entrou
  por outras vias.
- **Plugins activos:** `laravel-simplifier`, `codex`, `ponytail`, `caveman`.
- **`npx skills` partido:** `Class extends value undefined is not a constructor or null`,
  em Node v24.18.1 / npm 11.16.0. Falha já no `--version`.
- **Segredos em claro:** `ghp_` em `settings.json` (bloco `env`, injectado em todas as
  sessões) e em `.mcp.json`; `x-api-key` do 21st.dev em `~/.claude.json`.

## 3 · Por preencher — só o utilizador consegue

`/context all` e `/usage` são comandos de sessão; não correm por ferramenta. Correr **numa
sessão típica de trabalho real**, não numa sessão vazia, e colar aqui:

### `/context all`

```
(colar)
```

### `/usage` — 7 dias (`w`)

```
(colar)
```

Repetir as três medições uma semana depois de aplicar.
