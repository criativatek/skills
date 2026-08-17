#!/usr/bin/env node
// Instalador de perfis de orquestração.
//
// Não se corre directamente: o profile.sh descarrega este ficheiro e o render.mjs
// para uma pasta temporária e chama `node apply.mjs`. Aqui só há leitura, escrita
// e rede — a montagem dos blocos vive toda no render.mjs, partilhada com o site.

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

import {
  resolveProfile,
  renderAgentFiles,
  renderClaudemdBlock,
  managedHeadings,
} from './render.mjs'

const BLOCK_START = '<!-- perfil:início -->'
const BLOCK_END = '<!-- perfil:fim -->'

const SCHEMA_SUPPORTED = 1

const claudeDirectory = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
const agentsDirectory = join(claudeDirectory, 'agents')
const statePath = join(claudeDirectory, 'profile-state.json')
const resolvedPath = join(claudeDirectory, 'profile-resolved.json')
const previousResolvedPath = join(claudeDirectory, 'profile-resolved.prev.json')
const claudemdPath = join(claudeDirectory, 'CLAUDE.md')

// ---------------------------------------------------------------- utilitários

function readJsonFileIfExists (path) {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

// UTF-8 sem BOM e LF. Um BOM antes do `---` invalida o frontmatter em silêncio,
// e o CRLF do Windows suja o diff contra o que o site publica.
function writeTextFile (path, content) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content.replace(/\r\n/g, '\n'), { encoding: 'utf8' })
}

function timestampWithOffset (now) {
  const offsetMinutes = -now.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const pad = function (value) { return String(Math.floor(Math.abs(value))).padStart(2, '0') }
  return (
    now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
    'T' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) +
    sign + pad(offsetMinutes / 60) + ':' + pad(offsetMinutes % 60)
  )
}

function checkSchema (document, label) {
  if (document.schema !== SCHEMA_SUPPORTED) {
    throw new Error(
      `${label} usa schema ${document.schema}; este instalador só sabe ler ${SCHEMA_SUPPORTED}. ` +
      'Actualiza o instalador em vez de adivinhar o formato.'
    )
  }
}

// ------------------------------------------------------- bloco gerido no CLAUDE.md

/**
 * Substitui o bloco gerido, preservando tudo o resto do ficheiro.
 *
 * Três casos, por ordem:
 *   1. já tem marcadores  -> substitui entre eles
 *   2. tem as secções sem marcadores (o que o site publicava antes) -> envolve e substitui
 *   3. não tem nada       -> acrescenta no fim
 *
 * O caso 2 é o que evita ficar com duas políticas contraditórias no mesmo ficheiro.
 */
export function applyManagedBlock (existingContent, block, headings) {
  const wrapped = `${BLOCK_START}\n${block}\n${BLOCK_END}`

  const startIndex = existingContent.indexOf(BLOCK_START)
  const endIndex = existingContent.indexOf(BLOCK_END)
  if (startIndex !== -1 && endIndex !== -1) {
    return {
      content: existingContent.slice(0, startIndex) + wrapped + existingContent.slice(endIndex + BLOCK_END.length),
      mode: 'substituído',
    }
  }

  const lines = existingContent.split('\n')
  const firstHeading = `## ${headings[0]}`
  const sectionStart = lines.findIndex(function (line) { return line.trim() === firstHeading })

  if (sectionStart !== -1) {
    // Fim = primeiro título de nível 2 que já não pertence ao bloco gerido.
    let sectionEnd = lines.length
    for (let index = sectionStart + 1; index < lines.length; index += 1) {
      const line = lines[index]
      if (!line.startsWith('## ')) continue
      if (headings.includes(line.slice(3).trim())) continue
      sectionEnd = index
      break
    }

    const before = lines.slice(0, sectionStart).join('\n')
    const after = lines.slice(sectionEnd).join('\n')
    return {
      content: `${before}${wrapped}\n\n${after}`,
      mode: 'migrado de secção sem marcadores',
    }
  }

  const separator = existingContent.endsWith('\n') ? '\n' : '\n\n'
  return { content: existingContent + separator + wrapped + '\n', mode: 'acrescentado no fim' }
}

// ---------------------------------------------------------------- rede / origem

async function fetchJson (baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`)
  if (!response.ok) throw new Error(`${path} devolveu ${response.status}`)
  return response.json()
}

async function loadFromSite (baseUrl, profileId) {
  const index = await fetchJson(baseUrl, '/profiles/index.json')
  checkSchema(index, 'index.json')

  const listed = index.profiles.find(function (entry) { return entry.id === profileId })
  if (!listed) {
    throw new Error(`perfil "${profileId}" não existe. Publicados: ${index.profiles.map(function (entry) { return entry.id }).join(', ')}`)
  }

  const [base, profile, quotaPolicy] = await Promise.all([
    fetchJson(baseUrl, '/profiles/base.json'),
    fetchJson(baseUrl, `/profiles/${profileId}.json`),
    fetchJson(baseUrl, '/profiles/quota-policy.json'),
  ])

  checkSchema(base, 'base.json')
  checkSchema(profile, `${profileId}.json`)
  checkSchema(quotaPolicy, 'quota-policy.json')

  // O deploy copia ficheiro a ficheiro e nunca apaga: um index novo pode chegar antes
  // do perfil. Recusar é melhor do que instalar uma mistura das duas versões.
  if (profile.version !== listed.version) {
    throw new Error(
      `${profileId}.json está na versão ${profile.version} mas o index anuncia ${listed.version}. ` +
      'Deploy a meio — tenta daqui a um minuto.'
    )
  }

  return { base, profile, quotaPolicy, headings: managedHeadings(base) }
}

// ---------------------------------------------------------------- plano de escrita

function buildPlan (base, profile, quotaPolicy) {
  const resolved = resolveProfile(base, profile)
  const agentFiles = renderAgentFiles(resolved)

  const writes = Object.entries(agentFiles).map(function ([agentName, content]) {
    return { path: join(agentsDirectory, `${agentName}.md`), content }
  })

  return {
    resolved,
    quotaPolicy,
    claudemdBlock: renderClaudemdBlock(resolved),
    writes,
  }
}

function describePlan (plan, currentState) {
  const current = currentState && currentState.current
  const lines = []

  lines.push(
    `Perfil actual: ${current ? current.id + ' ' + current.version : '(nenhum registado)'}` +
    `   →   ${plan.resolved.id} ${plan.resolved.version}`
  )
  const currentPolicy = currentState && currentState.quota_policy ? currentState.quota_policy.version : '(nenhuma)'
  lines.push(`Quota-policy:  ${currentPolicy} → ${plan.quotaPolicy.version}`)
  lines.push('')
  lines.push('Vai alterar:')
  for (const write of plan.writes) lines.push(`  ${write.path}`)
  lines.push(`  bloco ${BLOCK_START} de ${claudemdPath}`)
  lines.push(`  ${statePath}`)
  lines.push(`  ${resolvedPath}`)
  if (existsSync(claudemdPath)) lines.push(`  (cópia de segurança do CLAUDE.md actual)`)
  lines.push('')
  lines.push('Não altera:')
  lines.push(`  resto de ${claudemdPath}`)
  for (const untouched of untouchedNeighbours()) lines.push(`  ${untouched}`)

  return lines.join('\n')
}

// Aquilo por que uma pessoa se preocupa antes de correr um instalador numa máquina
// que já tem configuração. Ordem alfabética empurrava estes para fora do corte e
// mostrava `cache/` em vez de `settings.json` — a lista ficava verdadeira e inútil.
const REASSURING_ENTRIES = [
  'settings.json', 'settings.local.json', '.mcp.json', 'skills', 'plugins', 'hooks', 'commands',
]

/**
 * O que fica intacto ao lado do que se escreve. Derivado do que existe na pasta,
 * não de uma lista fixa — uma lista fixa mente no dia em que o instalador crescer.
 */
function untouchedNeighbours () {
  const written = new Set([
    'agents', 'CLAUDE.md', 'profile-state.json', 'profile-resolved.json', 'profile-resolved.prev.json',
  ])

  if (!existsSync(claudeDirectory)) return []

  const present = readdirSync(claudeDirectory).filter(function (entry) { return !written.has(entry) })

  const priority = REASSURING_ENTRIES.filter(function (entry) { return present.includes(entry) })
  const remaining = present
    .filter(function (entry) { return !priority.includes(entry) && !entry.startsWith('.') })
    .sort()

  const shown = priority.concat(remaining).slice(0, 10)
  const hidden = priority.length + remaining.length - shown.length

  const paths = shown.map(function (entry) { return join(claudeDirectory, entry) })
  // Nunca deixar o corte parecer cobertura completa.
  if (hidden > 0) paths.push(`(e mais ${hidden} entradas, todas intactas)`)

  return paths
}

function backupExistingAgents (stamp) {
  if (!existsSync(agentsDirectory)) return null

  const existing = readdirSync(agentsDirectory).filter(function (entry) { return entry.endsWith('.md') })
  if (existing.length === 0) return null

  const backupDirectory = join(agentsDirectory, `.bak-${stamp}`)
  mkdirSync(backupDirectory, { recursive: true })
  for (const entry of existing) copyFileSync(join(agentsDirectory, entry), join(backupDirectory, entry))

  return backupDirectory
}

function install (plan, currentState, now) {
  const stamp = timestampWithOffset(now).replace(/[:+]/g, '-')
  const backupDirectory = backupExistingAgents(stamp)

  for (const write of plan.writes) writeTextFile(write.path, write.content)

  const existingClaudemd = existsSync(claudemdPath) ? readFileSync(claudemdPath, 'utf8') : ''

  // O CLAUDE.md é escrito à mão e não vive em nenhum repositório. A migração da secção
  // sem marcadores é a operação mais destrutiva deste instalador: guardar antes.
  let claudemdBackupPath = null
  if (existingClaudemd) {
    claudemdBackupPath = join(claudeDirectory, `CLAUDE.md.bak-${stamp}`)
    writeTextFile(claudemdBackupPath, existingClaudemd)
  }

  const applied = applyManagedBlock(existingClaudemd, plan.claudemdBlock, plan.headings)
  writeTextFile(claudemdPath, applied.content)

  if (existsSync(resolvedPath)) copyFileSync(resolvedPath, previousResolvedPath)
  writeTextFile(resolvedPath, JSON.stringify({ resolved: plan.resolved, quotaPolicy: plan.quotaPolicy }, null, 2) + '\n')

  writeTextFile(statePath, JSON.stringify({
    schema: SCHEMA_SUPPORTED,
    current: { id: plan.resolved.id, version: plan.resolved.version },
    previous: currentState && currentState.current ? currentState.current : null,
    quota_policy: { version: plan.quotaPolicy.version },
    installed_at: timestampWithOffset(now),
    files: plan.writes.map(function (write) { return write.path }),
  }, null, 2) + '\n')

  return { backupDirectory, claudemdBackupPath, claudemdMode: applied.mode }
}

// ---------------------------------------------------------------- entrada

function parseArguments (argv) {
  const options = { profileId: null, dryRun: false, rollback: false, baseUrl: 'https://skills.criativatek.com' }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--profile') options.profileId = argv[++index]
    else if (argument === '--dry-run') options.dryRun = true
    else if (argument === '--rollback') options.rollback = true
    else if (argument === '--base-url') options.baseUrl = argv[++index]
  }

  return options
}

async function main () {
  const options = parseArguments(process.argv.slice(2))
  const currentState = readJsonFileIfExists(statePath)
  const now = new Date()

  if (options.rollback) {
    const previous = readJsonFileIfExists(previousResolvedPath)
    if (!previous) throw new Error('não há perfil anterior guardado — nada para repor')

    // Sem rede: repõe do que ficou em disco na instalação anterior.
    const plan = {
      resolved: previous.resolved,
      quotaPolicy: previous.quotaPolicy,
      claudemdBlock: renderClaudemdBlock(previous.resolved),
      headings: managedHeadings({ claudemd: previous.resolved.claudemd }),
      writes: Object.entries(renderAgentFiles(previous.resolved)).map(function ([agentName, content]) {
        return { path: join(agentsDirectory, `${agentName}.md`), content }
      }),
    }

    if (options.dryRun) {
      console.log(describePlan(plan, currentState))
      return
    }

    const outcome = install(plan, currentState, now)
    console.log(`Reposto o perfil ${plan.resolved.id} ${plan.resolved.version}.`)
    console.log(`CLAUDE.md: bloco ${outcome.claudemdMode}.`)
  if (outcome.claudemdBackupPath) console.log(`CLAUDE.md anterior guardado em ${outcome.claudemdBackupPath}`)
    console.log('\nSó produz efeito em sessão nova — o CLAUDE.md é lido no arranque e os agentes ao spawn.')
    return
  }

  if (!options.profileId) throw new Error('falta --profile <id> (ou --rollback)')

  const loaded = await loadFromSite(options.baseUrl, options.profileId)
  const plan = buildPlan(loaded.base, loaded.profile, loaded.quotaPolicy)
  plan.headings = loaded.headings

  if (options.dryRun) {
    console.log(describePlan(plan, currentState))
    console.log('\n(--dry-run: nada foi escrito)')
    return
  }

  const outcome = install(plan, currentState, now)

  console.log(`Instalado o perfil ${plan.resolved.name} ${plan.resolved.version}.`)
  if (outcome.backupDirectory) console.log(`Agentes anteriores guardados em ${outcome.backupDirectory}`)
  console.log(`CLAUDE.md: bloco ${outcome.claudemdMode}.`)
  if (outcome.claudemdBackupPath) console.log(`CLAUDE.md anterior guardado em ${outcome.claudemdBackupPath}`)
  console.log('\nSó produz efeito em sessão nova — o CLAUDE.md é lido no arranque e os agentes ao spawn.')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(function (error) {
    console.error('erro: ' + error.message)
    process.exit(1)
  })
}
