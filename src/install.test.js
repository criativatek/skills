import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { applyManagedBlock } from '../public/install/apply.mjs'
import { managedHeadings, resolveProfile, renderClaudemdBlock } from '../public/install/render.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = join(here, '..')

function readJsonFile (relativePath) {
  return JSON.parse(readFileSync(join(repositoryRoot, relativePath), 'utf8'))
}

const base = readJsonFile('public/profiles/base.json')
const standard = readJsonFile('public/profiles/standard.json')
const efficient = readJsonFile('public/profiles/efficient.json')

const HEADINGS = managedHeadings(base)
const STANDARD_BLOCK = renderClaudemdBlock(resolveProfile(base, standard))
const EFFICIENT_BLOCK = renderClaudemdBlock(resolveProfile(base, efficient))

// Um CLAUDE.md com a forma do real: coisas antes, o bloco publicado pelo site sem
// marcadores nenhuns, e coisas depois que nao podem ser tocadas.
function claudemdComSeccaoSemMarcadores () {
  return [
    '# Global Instructions — Pedro Alves',
    '',
    '## JavaScript — Variable Naming',
    '',
    'Nomes descritivos.',
    '',
    STANDARD_BLOCK,
    '',
    '## GBrain Configuration (configured by /setup-gbrain)',
    '- Mode: local-stdio',
    '',
  ].join('\n')
}

test('os títulos geridos saem do próprio template, não de uma lista à parte', function () {
  assert.deepEqual(HEADINGS, ['Orquestração de modelos', 'Regras de trabalho', 'Documentação'])
})

test('migra a secção sem marcadores em vez de acrescentar uma segunda política', function () {
  const existing = claudemdComSeccaoSemMarcadores()
  const result = applyManagedBlock(existing, EFFICIENT_BLOCK, HEADINGS)

  assert.equal(result.mode, 'migrado de secção sem marcadores')

  const ocorrencias = result.content.split('## Orquestração de modelos').length - 1
  assert.equal(ocorrencias, 1, 'ficaria uma política contraditória por cada ocorrência a mais')

  assert.ok(result.content.includes('# Global Instructions — Pedro Alves'))
  assert.ok(result.content.includes('## JavaScript — Variable Naming'))
  assert.ok(result.content.includes('## GBrain Configuration (configured by /setup-gbrain)'))
  assert.ok(result.content.includes('- Mode: local-stdio'))
  assert.ok(result.content.includes('<!-- perfil:início -->'))
  assert.ok(result.content.includes('<!-- perfil:fim -->'))
})

test('a migração leva as três secções, não só a primeira', function () {
  const result = applyManagedBlock(claudemdComSeccaoSemMarcadores(), EFFICIENT_BLOCK, HEADINGS)

  // As versoes antigas de "Regras de trabalho" e "Documentacao" nao podem sobrar
  // fora do bloco: seriam texto orfao a contradizer o gerado.
  assert.equal(result.content.split('## Regras de trabalho').length - 1, 1)
  assert.equal(result.content.split('## Documentação').length - 1, 1)
})

test('com marcadores, substitui só o que está entre eles', function () {
  const existing = [
    'antes',
    '<!-- perfil:início -->',
    STANDARD_BLOCK,
    '<!-- perfil:fim -->',
    'depois',
  ].join('\n')

  const result = applyManagedBlock(existing, EFFICIENT_BLOCK, HEADINGS)

  assert.equal(result.mode, 'substituído')
  assert.ok(result.content.startsWith('antes\n'))
  assert.ok(result.content.trimEnd().endsWith('depois'))
  assert.ok(result.content.includes('vão para o Kimi'))
  assert.ok(!result.content.includes('por excepção**, não por sistema'))
})

test('sem nada parecido, acrescenta no fim', function () {
  const result = applyManagedBlock('# Só isto\n', STANDARD_BLOCK, HEADINGS)

  assert.equal(result.mode, 'acrescentado no fim')
  assert.ok(result.content.startsWith('# Só isto\n'))
  assert.ok(result.content.includes('<!-- perfil:início -->'))
})

test('reinstalar duas vezes dá o mesmo ficheiro', function () {
  const primeira = applyManagedBlock(claudemdComSeccaoSemMarcadores(), EFFICIENT_BLOCK, HEADINGS)
  const segunda = applyManagedBlock(primeira.content, EFFICIENT_BLOCK, HEADINGS)

  assert.equal(segunda.mode, 'substituído')
  assert.equal(segunda.content, primeira.content)
})

test('ficheiro vazio não rebenta', function () {
  const result = applyManagedBlock('', STANDARD_BLOCK, HEADINGS)
  assert.ok(result.content.includes('## Orquestração de modelos'))
})
