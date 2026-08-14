// Motor de correspondência da pesquisa. Sem DOM — testável com `node --test`.
//
// Dois problemas concretos deste guia:
//  · os nomes são identificadores com separadores (`ui-ux-pro-max`, `chrome-devtools`) e quem
//    procura escreve-os de todas as maneiras — com espaços, sem nada, com barras;
//  · o texto é pt-PT com acentos, e ninguém escreve `sessão` na caixa de pesquisa.
// `fold` resolve os dois de uma vez: tudo passa a minúsculas sem diacríticos, com qualquer
// separador convertido em espaço. `squash` é a mesma coisa sem espaço nenhum, para o caso de
// `uiuxpromax`.

export function fold (value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function squash (value) {
  return fold(value).replace(/ /g, '')
}

// Distância de edição aproximada de `needle` contra a melhor janela de `haystack`.
// Primeira linha a zeros (início livre) e mínimo da última linha (fim livre) — é o Levenshtein
// clássico de substring aproximada. Sem isto, `ui-ux-pro-mx` nunca chegaria a
// `ui-ux-pro-max-cli`: a diferença de comprimento sozinha já excedia o limite de edições.
export function substringDistance (needle, haystack) {
  if (!needle) return 0
  if (!haystack) return needle.length

  var previousRow = new Array(haystack.length + 1).fill(0)
  var currentRow = new Array(haystack.length + 1)

  for (var needleIndex = 1; needleIndex <= needle.length; needleIndex++) {
    currentRow[0] = needleIndex
    for (var haystackIndex = 1; haystackIndex <= haystack.length; haystackIndex++) {
      var substitutionCost = needle.charCodeAt(needleIndex - 1) === haystack.charCodeAt(haystackIndex - 1) ? 0 : 1
      currentRow[haystackIndex] = Math.min(
        previousRow[haystackIndex] + 1,
        currentRow[haystackIndex - 1] + 1,
        previousRow[haystackIndex - 1] + substitutionCost
      )
    }
    var swap = previousRow
    previousRow = currentRow
    currentRow = swap
  }

  var best = Infinity
  for (var column = 0; column <= haystack.length; column++) {
    if (previousRow[column] < best) best = previousRow[column]
  }
  return best
}

// Abaixo de 5 caracteres não há tolerância a gralhas: com 4 letras quase tudo fica a uma edição
// de quase tudo (`xpto` cai dentro de `ui-ux-pro-max-cli` pela janela `xpro`).
export function allowedEdits (length) {
  if (length < 5) return 0
  if (length <= 8) return 1
  return 2
}

// null = não corresponde. Caso contrário 0..4, menor é melhor.
export function scoreName (query, name) {
  var queryFolded = fold(query)
  var nameFolded = fold(name)
  if (!queryFolded || !nameFolded) return null

  var querySquashed = queryFolded.replace(/ /g, '')
  var nameSquashed = nameFolded.replace(/ /g, '')

  if (nameSquashed.indexOf(querySquashed) === 0) return 0
  if (nameFolded.indexOf(queryFolded) !== -1 || nameSquashed.indexOf(querySquashed) !== -1) return 1

  var nameTokens = nameFolded.split(' ')
  var queryTokens = queryFolded.split(' ')
  var everyTokenIsPrefix = queryTokens.every(function (queryToken) {
    return nameTokens.some(function (nameToken) { return nameToken.indexOf(queryToken) === 0 })
  })
  if (everyTokenIsPrefix) return 2

  var maxEdits = allowedEdits(querySquashed.length)
  if (!maxEdits) return null

  var distance = substringDistance(querySquashed, nameSquashed)
  if (distance > maxEdits) return null
  return distance === 1 ? 3 : 4
}

// Ordena por qualidade da correspondência e, em empate, pelo nome mais curto — entre
// `refactor` e `refactoring-patterns`, quem escreveu `refactor` queria o primeiro.
export function compareByScore (left, right) {
  if (left.score !== right.score) return left.score - right.score
  if (left.name.length !== right.name.length) return left.name.length - right.name.length
  return left.name.localeCompare(right.name)
}

// Um termo por bloco separado por espaço no que foi escrito, não por palavra depois de dobrar.
// `ui-ux-pro-max` é uma coisa só: partido em `ui`+`ux`+`pro`+`max` bastava um cartão longo ter as
// quatro sílabas espalhadas para entrar nos resultados. Já `ui ux pro max`, escrito com espaços,
// são quatro termos — aí a separação foi intenção de quem escreveu.
export function toTerms (query) {
  return String(query || '')
    .trim()
    .split(/\s+/)
    .map(function (chunk) {
      var folded = fold(chunk)
      return folded ? { folded: folded, squashed: folded.replace(/ /g, '') } : null
    })
    .filter(Boolean)
}

// Corpo dos cartões: só correspondência exacta, e sobre as duas formas normalizadas. Fuzzy aqui
// seria lento (30 cartões × milhares de caracteres) e traria falsos positivos a cada termo curto.
export function bodyMatches (terms, indexed) {
  return terms.every(function (term) {
    return indexed.folded.indexOf(term.folded) !== -1 || indexed.squashed.indexOf(term.squashed) !== -1
  })
}

export function indexText (value) {
  var folded = fold(value)
  return { folded: folded, squashed: folded.replace(/ /g, '') }
}
