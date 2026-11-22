# Baseline — diagnóstico de setup, 2026-11-22

Máquina: Windows 11, `d:\HERD`. Fonte: `.jsonl` em `~/.claude/projects/` dos últimos 60 dias
(341 ficheiros, 2.5 GB; 228 são de subagentes). Tirado **antes** das mudanças da 2.6.0 e da
limpeza do `settings.json` do mesmo dia, para haver com que comparar.

## Números

| Métrica | Valor | Alvo depois |
|---|---|---|
| Contexto na 1.ª chamada (mediana, 38 sessões) | **74k** tokens | ≤ 60k |
| — backoffice / impacto-hurizonte | 89–94k / 89k | ≤ 65k |
| Pico de contexto por sessão (mediana) | **645k** | < 500k (auto-compact a 50%) |
| Sessões que tocaram ~966k (tecto 1M) | 13 de 38 | 0 |
| Chamadas da sessão principal em Opus 5.5 `xhigh` | 95% | Opus `high` |
| Explore nativo → Opus | 54 lançamentos, 2 928 chamadas | Haiku |
| `explorer` (Haiku) | 3 lançamentos, 174 chamadas | — (substituído) |
| `kimi -p` / `implementer` | 2 / 42 | — |
| Skills instaladas / com pelo menos 1 uso | 134 / 33 | ~35 visíveis |
| MCPs em âmbito user | 12 (6 só usados no MK META ADS, gbrain com 0 usos) | 5 |
| `/clear` + `/compact` em 60 dias | 6 + 2 | — |

MCP por projecto: meta-ads 1 180 de 1 184 usos no MK META ADS; metricool 143/143; canva 38/38;
hurizonte 10/10; intermediar 6/6; mdist 100/115. Browser: claude-in-chrome 1 592,
chrome-devtools 695, gstack `browse` 1, `webapp-testing` 0.

### Primeira medição depois (2026-11-22, sessão nova `claude -p` em `d:\HERD\skills`)

- 1.ª chamada: **56.9k** tokens (antes 72k neste projecto, −21%).
- Explore: `isBuiltIn: false` (o do perfil) e as chamadas facturadas todas em `claude-haiku-5-5`.
  O `pickedEffortModel` do `.meta.json` continua a dizer Opus — não é o modelo do agente.

## O que mudou no mesmo dia (fora deste repo)

- `~/.claude/settings.json`: `skillOverrides` para 114 skills (`off` 18, `user-invocable-only` 87,
  `name-only` 9), `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50`, `async` nos hooks de telemetria.
- MCPs de marketing passaram para âmbito local do MK META ADS (as duas grafias da chave,
  `D:/` e `d:/`); gbrain removido.
- CLAUDE.md de 7 projectos encolhidos para 40–57 linhas; o resto foi para `docs/claude/`.

## Scripts para repetir

Todos leem só os `.jsonl`; correm em PowerShell 7.

```powershell
$projects = "$env:USERPROFILE\.claude\projects"
$recent = Get-ChildItem $projects -Recurse -Filter *.jsonl -File |
  Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) -and $_.FullName -notmatch '\\subagents\\' -and $_.Length -gt 50000 }

# 1 · Contexto na 1.ª chamada e pico por sessão
$usage = [regex]'"usage":\{"input_tokens":(\d+),"cache_creation_input_tokens":(\d+),"cache_read_input_tokens":(\d+)'
$rows = foreach ($file in $recent) {
  $first = $null; $peak = 0
  foreach ($line in [System.IO.File]::ReadLines($file.FullName)) {
    if (-not $line.Contains('"type":"assistant"')) { continue }
    $match = $usage.Match($line); if (-not $match.Success) { continue }
    $total = [int]$match.Groups[1].Value + [int]$match.Groups[2].Value + [int]$match.Groups[3].Value
    if (-not $first) { $first = $total }; if ($total -gt $peak) { $peak = $total }
  }
  if ($first) { [pscustomobject]@{ project = $file.Directory.Name; first = $first; peak = $peak } }
}
'1.ª chamada (mediana): ' + ($rows.first | Sort-Object)[[int]($rows.Count / 2)]
'pico (mediana): ' + ($rows.peak | Sort-Object)[[int]($rows.Count / 2)]

# 2 · Modelo efectivo por tipo de subagente
$model = [regex]'"model":"(claude-[^"]+)"'
Get-ChildItem $projects -Recurse -Filter *.meta.json -File | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) } |
  ForEach-Object {
    $meta = Get-Content $_.FullName -Raw | ConvertFrom-Json
    $transcript = $_.FullName -replace '\.meta\.json$', '.jsonl'
    # Só linhas facturadas: o transcript também cita o modelo do pai em entradas que não são chamadas.
    $billed = if (Test-Path $transcript) {
      [System.IO.File]::ReadLines($transcript) | Where-Object { $_.Contains('"type":"assistant"') -and $_.Contains('"usage"') } | Select-Object -First 1
    }
    "$($meta.agentType) -> $(if ($billed) { $model.Match($billed).Groups[1].Value })"
  } | Group-Object | Sort-Object Count -Descending | Format-Table Count, Name -AutoSize

# 3 · Uso de cada servidor MCP por projecto
$tool = [regex]'"type":"tool_use","id":"[^"]+","name":"mcp__([^_]+(?:_[^_]+)*?)__'
$byServer = @{}
foreach ($file in Get-ChildItem $projects -Recurse -Filter *.jsonl -File | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) }) {
  $project = ($file.FullName.Substring($projects.Length + 1) -split '\\')[0]
  foreach ($line in [System.IO.File]::ReadLines($file.FullName)) {
    if (-not $line.Contains('"name":"mcp__')) { continue }
    foreach ($match in $tool.Matches($line)) { $key = "$($match.Groups[1].Value) @ $project"; $byServer[$key] = 1 + $byServer[$key] }
  }
}
$byServer.GetEnumerator() | Sort-Object Value -Descending | Format-Table Value, Key -AutoSize
```

Se o 1 não descer, o contexto base está noutro sítio: correr `/context` numa sessão nova e ler a
divisão (sistema, ferramentas, MCP, skills, memória).
