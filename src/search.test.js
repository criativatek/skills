import test from 'node:test'
import assert from 'node:assert/strict'
import { fold, squash, substringDistance, allowedEdits, scoreName, compareByScore, toTerms, bodyMatches, indexText } from './search.js'

test('fold normaliza acentos e separadores', () => {
  assert.equal(fold('UI/UX Pro Max'), 'ui ux pro max')
  assert.equal(fold('ui-ux-pro-max'), 'ui ux pro max')
  assert.equal(fold('Higiene de sessão'), 'higiene de sessao')
  assert.equal(fold('  Chrome_DevTools  '), 'chrome devtools')
  assert.equal(fold(''), '')
  assert.equal(fold(null), '')
})

test('squash tira os separadores todos', () => {
  assert.equal(squash('UI/UX Pro Max'), 'uiuxpromax')
  assert.equal(squash('ui-ux-pro-max-cli'), 'uiuxpromaxcli')
})

test('substringDistance mede contra a melhor janela, não contra a string toda', () => {
  assert.equal(substringDistance('playwright', 'playwrightcli'), 0)
  assert.equal(substringDistance('uiuxpromx', 'uiuxpromaxcli'), 1)
  // `playwrigth` chega a `playwrigh` com uma inserção — o fim livre deixa a janela ser mais
  // curta que a agulha, por isso não são as 2 substituições do Levenshtein alinhado.
  assert.equal(substringDistance('playwrigth', 'playwrightcli'), 1)
  assert.equal(substringDistance('zzzzzzzzzz', 'playwrightcli'), 10)
  assert.equal(substringDistance('', 'seja o que for'), 0)
})

test('allowedEdits não tolera gralhas em termos curtos', () => {
  assert.equal(allowedEdits(3), 0)
  assert.equal(allowedEdits(4), 0)
  assert.equal(allowedEdits(5), 1)
  assert.equal(allowedEdits(8), 1)
  assert.equal(allowedEdits(9), 2)
})

test('scoreName encontra ui-ux-pro-max escrito de qualquer maneira', () => {
  const name = 'ui-ux-pro-max-cli'
  assert.equal(scoreName('ui-ux-pro-max', name), 0)
  assert.equal(scoreName('uiuxpromax', name), 0)
  assert.equal(scoreName('ui ux pro max', name), 0)
  assert.equal(scoreName('UI/UX Pro Max', name), 0)
  assert.equal(scoreName('pro-max', name), 1)
  assert.equal(scoreName('ui-ux-pro-mx', name), 3)
})

test('scoreName não inventa correspondências', () => {
  // `xpto` está a uma edição da janela `xpro` dentro de `uiuxpromaxcli` — é exactamente por isso
  // que termos com menos de 5 caracteres não levam tolerância a gralhas.
  assert.equal(scoreName('xpto', 'ui-ux-pro-max-cli'), null)
  assert.equal(scoreName('mysql', 'ui-ux-pro-max-cli'), null)
  assert.equal(scoreName('', 'ui-ux-pro-max-cli'), null)
  assert.equal(scoreName('gstack', ''), null)
})

test('scoreName tolera gralhas em nomes reais do guia', () => {
  assert.equal(scoreName('playwrigth', 'playwright-cli'), 3)
  assert.equal(scoreName('chrome-devtols', 'chrome-devtools'), 3)
  assert.equal(scoreName('sistematic-debugging', 'systematic-debugging'), 3)
})

test('scoreName aceita tokens soltos por prefixo', () => {
  assert.equal(scoreName('ui max', 'ui-ux-pro-max-cli'), 2)
  assert.equal(scoreName('devtools chrome', 'chrome-devtools'), 2)
  // `git com` colapsa em `gitcom`, que é prefixo exacto de `gitcommit` — apanha antes do nível 2.
  assert.equal(scoreName('git com', 'git-commit'), 0)
})

test('compareByScore ordena por qualidade e depois pelo nome mais curto', () => {
  const ordered = [
    { name: 'refactor-everything', score: 0 },
    { name: 'refactor', score: 0 },
    { name: 'refac', score: 1 }
  ].sort(compareByScore)
  assert.deepEqual(ordered.map(entry => entry.name), ['refactor', 'refactor-everything', 'refac'])
})

test('toTerms mantém junto o que foi escrito junto', () => {
  assert.deepEqual(toTerms('ui-ux-pro-max'), [{ folded: 'ui ux pro max', squashed: 'uiuxpromax' }])
  assert.equal(toTerms('ui ux pro max').length, 4)
  assert.deepEqual(toTerms('   '), [])
})

test('um identificador com hífen não bate por sílabas espalhadas', () => {
  // O cartão da orquestração tem `ui`, `ux`, `pro` e `max` dispersos pelo texto todo — não é um
  // resultado de `ui-ux-pro-max`.
  const disperso = indexText('aqui o proximo maximo de ux e de outra coisa')
  assert.equal(bodyMatches(toTerms('ui-ux-pro-max'), disperso), false)
  assert.equal(bodyMatches(toTerms('ui ux pro max'), disperso), true)
})

test('bodyMatches exige todos os termos, em qualquer das formas normalizadas', () => {
  const indexed = indexText('npm install -g ui-ux-pro-max-cli e depois uipro init')
  assert.equal(bodyMatches(toTerms('ui-ux-pro-max'), indexed), true)
  assert.equal(bodyMatches(toTerms('uiuxpromax'), indexed), true)
  assert.equal(bodyMatches(toTerms('uipro install'), indexed), true)
  assert.equal(bodyMatches(toTerms('uipro laravel'), indexed), false)
  assert.equal(bodyMatches(toTerms('   '), indexed), true)
})
