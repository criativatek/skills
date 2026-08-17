import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { resolveProfile, renderAgentsScript, renderClaudemdBlock } from '../public/install/render.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = join(here, '..')

function readTextFile (relativePath) {
  return readFileSync(join(repositoryRoot, relativePath), 'utf8')
}

function readJsonFile (relativePath) {
  return JSON.parse(readTextFile(relativePath))
}

// O heredoc original foi escrito em Git Bash (LF) e o instalador pode escrever CRLF.
// Sem normalizar, o teste falha por ruido de fim de linha em vez de por regressao real.
function normalizeLineEndings (text) {
  return text.replace(/\r\n/g, '\n').replace(/\s+$/, '')
}

const base = readJsonFile('public/profiles/base.json')
const standard = readJsonFile('public/profiles/standard.json')

test('Standard gera o mesmo bloco de agentes que o site ja publicava', function () {
  const generated = renderAgentsScript(resolveProfile(base, standard))
  const fixture = readTextFile('src/__fixtures__/standard-agents.txt')

  assert.equal(normalizeLineEndings(generated), normalizeLineEndings(fixture))
})

test('Standard gera o mesmo bloco de CLAUDE.md que o site ja publicava', function () {
  const generated = renderClaudemdBlock(resolveProfile(base, standard))
  const fixture = readTextFile('src/__fixtures__/standard-claudemd.md')

  assert.equal(normalizeLineEndings(generated), normalizeLineEndings(fixture))
})

test('o perfil so declara overrides — os corpos vivem na base', function () {
  for (const agent of Object.values(standard.agents)) {
    assert.deepEqual(Object.keys(agent).sort(), ['effort', 'model'])
  }
  for (const agent of Object.values(base.agents)) {
    assert.equal(agent.model, undefined, 'a base nao fixa modelo')
    assert.ok(agent.body.length > 0)
  }
})

test('o merge sobrepoe o modelo sem perder o corpo', function () {
  const efficientLike = {
    schema: 1,
    id: 'teste',
    name: 'Teste',
    version: '1.0.0',
    extends: 'base',
    agents: { reviewer: { model: 'sonnet' } },
  }

  const resolved = resolveProfile(base, efficientLike)

  assert.equal(resolved.agents.reviewer.model, 'sonnet')
  assert.equal(resolved.agents.reviewer.body, base.agents.reviewer.body)
  assert.equal(resolved.agents.reviewer.effort, base.agents.reviewer.effort)
})

test('schema incompativel rebenta em vez de adivinhar', function () {
  assert.throws(
    function () { resolveProfile(base, Object.assign({}, standard, { schema: 99 })) },
    /schema incompativel/
  )
})

test('o index.json nao mente sobre os perfis publicados', function () {
  const index = readJsonFile('public/profiles/index.json')

  for (const listed of index.profiles) {
    const profile = readJsonFile(`public/profiles/${listed.id}.json`)

    // O deploy copia ficheiro a ficheiro e nunca apaga: um index novo pode chegar
    // antes do perfil. Se as versoes divergirem, o instalador tem de recusar.
    assert.equal(profile.version, listed.version, `versao de ${listed.id}`)
    assert.equal(profile.name, listed.name)
    assert.equal(profile.summary, listed.summary)
  }

  assert.ok(index.profiles.some(function (listed) { return listed.id === index.default }))
})

test('todos os perfis publicados resolvem e renderizam', function () {
  const index = readJsonFile('public/profiles/index.json')

  for (const listed of index.profiles) {
    const resolved = resolveProfile(base, readJsonFile(`public/profiles/${listed.id}.json`))

    assert.equal(Object.keys(resolved.agents).length, 4, `agentes de ${listed.id}`)
    assert.match(renderAgentsScript(resolved), /^mkdir -p ~\/\.claude\/agents/)
    assert.doesNotMatch(renderClaudemdBlock(resolved), /\{\{|\}\}/, `placeholder por substituir em ${listed.id}`)
  }
})

test('a tabela do CLAUDE.md segue o modelo do perfil, nao o da base', function () {
  const quality = Object.assign({}, standard, {
    id: 'quality',
    agents: Object.assign({}, standard.agents, { implementer: { model: 'opus', effort: 'high' } }),
  })

  const block = renderClaudemdBlock(resolveProfile(base, quality))

  assert.match(block, /\| `implementer` \| Opus \|/)
  assert.doesNotMatch(block, /\| `implementer` \| Sonnet \|/)
})
