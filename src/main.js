import './style.css'
import { fold, indexText, toTerms, bodyMatches, scoreName, compareByScore } from './search.js'
import { initProfilePicker } from './profiles.js'

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Botões de copiar código — só os comandos, sem linhas de comentário/vazias
document.querySelectorAll('.copy').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var pre = btn.parentElement.querySelector('pre')
    var raw = btn.parentElement.hasAttribute('data-raw')
    var text = raw
      ? pre.textContent.replace(/\s+$/, '')
      : pre.textContent
          .split('\n')
          .map(function (line) { return line.replace(/\s+$/, '') })
          .filter(function (line) { return line.trim() !== '' && line.trim().charAt(0) !== '#' })
          .join('\n')
    navigator.clipboard.writeText(text).then(function () {
      var old = btn.textContent
      btn.textContent = '✓ Copiado'
      btn.classList.add('ok')
      setTimeout(function () { btn.textContent = old; btn.classList.remove('ok') }, 1600)
    }).catch(function () {
      btn.textContent = 'Erro'
      setTimeout(function () { btn.textContent = 'Copiar' }, 1600)
    })
  })
})

// Realce do item ativo na navegação lateral + indicador deslizante
var toc = document.querySelector('nav.toc')
var indicator = document.querySelector('.toc-indicator')
var links = document.querySelectorAll('nav.toc a')
var sections = Array.from(links).map(function (a) { return document.querySelector(a.getAttribute('href')) })

function onScroll () {
  var pos = window.scrollY + 120
  var current = sections[0]
  var currentLink = links[0]
  sections.forEach(function (s, i) { if (s && s.offsetTop <= pos) { current = s; currentLink = links[i] } })
  links.forEach(function (a) {
    var active = a === currentLink
    a.style.color = active ? 'var(--fg)' : ''
    a.style.background = active ? 'rgba(255,255,255,.04)' : ''
  })
  if (indicator && toc && currentLink) {
    var tocRect = toc.getBoundingClientRect()
    var linkRect = currentLink.getBoundingClientRect()
    toc.style.setProperty('--toc-indicator-top', (linkRect.top - tocRect.top) + 'px')
    toc.style.setProperty('--toc-indicator-h', linkRect.height + 'px')
    toc.style.setProperty('--toc-indicator-op', '1')
  }
}

window.addEventListener('scroll', onScroll, { passive: true })
window.addEventListener('resize', onScroll)
onScroll()

// Barra de progresso de scroll
var progressBar = document.getElementById('scrollProgress')
var ticking = false
function updateProgress () {
  var doc = document.documentElement
  var scrollable = doc.scrollHeight - doc.clientHeight
  var pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0
  if (progressBar) progressBar.style.width = pct + '%'
  ticking = false
}
window.addEventListener('scroll', function () {
  if (!ticking) { window.requestAnimationFrame(updateProgress); ticking = true }
}, { passive: true })
updateProgress()

// Botão voltar ao topo
var toTop = document.getElementById('toTop')
if (toTop) {
  window.addEventListener('scroll', function () {
    toTop.classList.toggle('show', window.scrollY > 480)
  }, { passive: true })
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  })
}

// Scroll reveal com stagger
if ('IntersectionObserver' in window) {
  var revealTargets = document.querySelectorAll('main .card, main .note, main table, main ol.steps > li, main .rank-list')
  revealTargets.forEach(function (el, i) {
    el.classList.add('reveal')
    if (!reduceMotion) el.style.transitionDelay = (i % 6) * 60 + 'ms'
  })
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        revealObserver.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
  revealTargets.forEach(function (el) { revealObserver.observe(el) })
}

// Contadores animados nas estatísticas do hero
var heroStats = document.getElementById('heroStats')
if (heroStats && 'IntersectionObserver' in window) {
  var counters = heroStats.querySelectorAll('strong[data-count]')
  var countersObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return
      countersObserver.unobserve(entry.target)
      var el = entry.target
      var target = parseInt(el.getAttribute('data-count'), 10) || 0
      if (reduceMotion) { el.textContent = target; return }
      var start = null
      var duration = 1100
      function step (ts) {
        if (start === null) start = ts
        var progress = Math.min((ts - start) / duration, 1)
        var eased = 1 - Math.pow(1 - progress, 3)
        el.textContent = Math.round(eased * target)
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
  }, { threshold: 0.4 })
  counters.forEach(function (el) { countersObserver.observe(el) })
}

// ---------- Índice de entidades ----------
// Os nomes instaláveis já estão na página, dentro dos comandos que se copiam. Lê-los do DOM em
// vez de manter uma lista à parte significa que o catálogo e as sugestões não podem ficar
// dessincronizados do guia — quem acrescenta um cartão não tem de se lembrar de mais nada.

var KIND_LABELS = { skill: 'Skill', mcp: 'MCP', plugin: 'Plugin', ferramenta: 'Ferramenta', seccao: 'Secção' }

function cardTitle (card) {
  var heading = card.querySelector(':scope > h3')
  if (heading) {
    var clone = heading.cloneNode(true)
    clone.querySelectorAll('.tag').forEach(function (tag) { tag.remove() })
    return clone.textContent.replace(/\s+/g, ' ').trim()
  }
  var section = card.closest('section')
  var sectionHeading = section && section.querySelector('h2')
  return sectionHeading ? sectionHeading.textContent.replace(/\s+/g, ' ').trim() : ''
}

// `claude mcp add` aceita os flags antes do nome (`--transport http context7 …`) e depois dele
// (`mysql -s project`). Saltar pares flag+valor é a única forma de apanhar o nome nos dois casos.
function mcpNameFromLine (line) {
  var tokens = line.trim().split(/\s+/)
  var index = 3
  while (index < tokens.length) {
    var token = tokens[index]
    if (token === '--') return null
    if (token.charAt(0) === '-') { index += 2; continue }
    return /^[a-z0-9][a-z0-9-]*$/.test(token) ? token : null
  }
  return null
}

function entitiesFromLine (line) {
  var found = []

  // Ancorado ao `npx skills add`: um `--skill polish` citado numa frase — por exemplo a dizer que
  // esse comando deixou de funcionar — não é uma instalação e não pode entrar no catálogo.
  var skillMatch = line.match(/npx skills add\s+\S+.*?--skill\s+([a-z0-9][a-z0-9-]*)/)
  if (skillMatch) found.push({ name: skillMatch[1], kind: 'skill' })

  var pluginMatch = line.match(/claude plugin install\s+([a-z0-9][a-z0-9-]*)@/)
  if (pluginMatch) found.push({ name: pluginMatch[1], kind: 'plugin' })

  if (/^\s*claude mcp add\b/.test(line)) {
    var mcpName = mcpNameFromLine(line)
    if (mcpName) found.push({ name: mcpName, kind: 'mcp' })
  }

  var npmMatch = line.match(/npm install -g\s+(@?[a-z0-9][a-z0-9@/._-]*)/)
  if (npmMatch) found.push({ name: npmMatch[1], kind: 'ferramenta' })

  return found
}

// Linhas candidatas: os blocos copiáveis e os comandos inline. O `ui-ux-pro-max-cli` só existe
// num `code.inl` dentro de uma nota — se só se lessem os `<pre>`, ficava de fora.
function commandLines (card, selector) {
  var sources = []
  card.querySelectorAll(selector).forEach(function (node) { sources.push(node.textContent) })
  return sources.join('\n').split('\n').filter(function (line) {
    var trimmed = line.trim()
    return trimmed !== '' && trimmed.charAt(0) !== '#'
  })
}

// Metade dos cartões com comandos não tem `id` (MySQL, GitHub, Ponytail, Filesystem…). Sem
// âncora não há link do catálogo nem flash — dar-lhes uma a partir do título é mais barato do
// que escrever 9 `id` à mão e lembrar de o fazer no próximo cartão.
function ensureCardId (card) {
  if (!card.id) {
    var slug = fold(cardTitle(card)).replace(/ /g, '-').slice(0, 48)
    if (slug) card.id = 'card-' + slug
  }
  return card.id
}

var INSTALL_COMMAND = /^\s*(git clone|npm |npx |uv tool|composer |pip |brew |winget|scoop|claude plugin|claude mcp|\/[a-z])/

function buildEntityIndex (cards) {
  var entries = []
  var seen = Object.create(null)

  cards.forEach(function (card) {
    if (!ensureCardId(card)) return
    var lines = commandLines(card, 'pre, code.inl')
    var beforeCount = entries.length

    lines.forEach(function (line) {
      entitiesFromLine(line).forEach(function (entity) {
        var key = entity.kind + ':' + entity.name.toLowerCase()
        if (seen[key]) return
        seen[key] = true
        entries.push({
          name: entity.name,
          kind: entity.kind,
          install: line.trim(),
          cardId: card.id,
          cardTitle: cardTitle(card)
        })
      })
    })

    // Cartões que não declaram nada instalável por comando reconhecido — gstack, graphify,
    // codeburn — entram na mesma pelo título, com a primeira linha do bloco como instalação.
    // Só se essa linha for mesmo uma instalação: o `CLAUDE.md global` e o `Hook de sessão`
    // também abrem com um bloco copiável, mas não se instalam — o catálogo é do que se instala.
    if (entries.length === beforeCount) {
      // Só os blocos copiáveis: um `/clear` citado numa frase é `code.inl` e não é instalação.
      var install = commandLines(card, 'pre').filter(function (line) {
        return INSTALL_COMMAND.test(line)
      })[0]
      var title = cardTitle(card)
      if (install && title) {
        entries.push({ name: title, kind: 'ferramenta', install: install.trim(), cardId: card.id, cardTitle: title })
      }
    }
  })

  return entries
}

function buildSuggestTargets (cards, entries) {
  var targets = entries.slice()
  var seen = Object.create(null)
  entries.forEach(function (entry) { seen[entry.cardId + '|' + entry.name.toLowerCase()] = true })

  cards.forEach(function (card) {
    if (!ensureCardId(card)) return
    var title = cardTitle(card)
    if (!title) return
    var key = card.id + '|' + title.toLowerCase()
    if (seen[key]) return
    seen[key] = true
    targets.push({ name: title, kind: 'seccao', install: '', cardId: card.id, cardTitle: title })
  })

  return targets
}

function renderCatalog (entries) {
  var body = document.getElementById('catalogoBody')
  if (!body) return
  var counter = document.getElementById('catalogoCount')

  var sorted = entries.slice().sort(function (left, right) {
    return left.name.localeCompare(right.name, 'pt')
  })

  var html = sorted.map(function (entry) {
    return '<tr data-name="' + escapeAttribute(entry.name) + '" data-kind="' + entry.kind + '">' +
      '<td><code class="inl">' + escapeHtml(entry.name) + '</code></td>' +
      '<td><span class="kind kind-' + entry.kind + '">' + KIND_LABELS[entry.kind] + '</span></td>' +
      '<td class="catalog-cmd"><code class="inl">' + escapeHtml(entry.install) + '</code></td>' +
      '<td><a href="#' + entry.cardId + '" data-jump>' + escapeHtml(entry.cardTitle) + '</a></td>' +
      '</tr>'
  }).join('')

  body.innerHTML = html
  if (counter) counter.textContent = sorted.length + ' entradas'
}

function escapeHtml (value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttribute (value) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}

var allCards = Array.from(document.querySelectorAll('main .card'))
var catalogEntries = buildEntityIndex(allCards)
renderCatalog(catalogEntries)
var suggestTargets = buildSuggestTargets(allCards, catalogEntries)

// ---------- Pesquisa + filtros ----------
var searchInput = document.getElementById('siteSearch')
var searchCount = document.getElementById('searchCount')
var suggestList = document.getElementById('searchSuggest')
var noResults = document.getElementById('noResults')
var priorityChips = document.querySelectorAll('[data-filter-priority]')
var categoryChips = document.querySelectorAll('[data-filter-cat]')
var kindChips = document.querySelectorAll('[data-filter-kind]')
var allSections = Array.from(document.querySelectorAll('main > section'))

var filterState = { query: '', priority: 'all', category: 'all', kind: 'all' }
var wasFilterActive = false

function cardPriorities (card) {
  var out = []
  card.querySelectorAll(':scope > h3 .tag').forEach(function (t) {
    if (t.classList.contains('req')) out.push('req')
    else if (t.classList.contains('rec')) out.push('rec')
    else if (t.classList.contains('opt')) out.push('opt')
  })
  return out
}

function cardCategory (card) {
  var section = card.closest('section')
  return section ? section.id : ''
}

// Indexa o cartão inteiro. A versão anterior escolhia selectores à mão e deixava de fora o
// `p.effect`, as listas e os `id` — metade das razões para "pesquisei e não apareceu".
function cardIndex (card) {
  if (!card._searchIndex) card._searchIndex = indexText(card.textContent + ' ' + card.id)
  return card._searchIndex
}

function matchingEntities (query) {
  var cards = Object.create(null)
  var names = []
  if (!query.trim()) return { cards: cards, names: names }
  suggestTargets.forEach(function (target) {
    if (scoreName(query, target.name) === null) return
    cards[target.cardId] = true
    names.push(target.name)
  })
  return { cards: cards, names: names }
}

var ACCENT_CLASSES = { a: '[aáàâãä]', e: '[eéèêë]', i: '[iíìîï]', o: '[oóòôõö]', u: '[uúùûü]', c: '[cç]', n: '[nñ]' }

// Quem escreve `sessao` quer ver `sessão` realçado, e quem escreve `playwrigth` quer ver
// `playwright`. O primeiro resolve-se alargando cada vogal à sua família de acentos; o segundo
// juntando ao padrão o nome da entidade que a correspondência aproximada encontrou.
function highlightPattern (query, entityNames) {
  var rawTerms = query.trim().split(/\s+/).filter(function (term) { return term.length >= 2 })
  var sources = rawTerms.concat(entityNames)
  if (!sources.length) return null

  var escaped = sources
    .slice()
    .sort(function (left, right) { return right.length - left.length })
    .map(function (term) {
      return term
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/[aeioucn]/gi, function (character) { return ACCENT_CLASSES[character.toLowerCase()] })
    })

  return new RegExp('(' + escaped.join('|') + ')', 'gi')
}

function clearHighlights () {
  document.querySelectorAll('mark.hit').forEach(function (mark) {
    var parent = mark.parentNode
    parent.replaceChild(document.createTextNode(mark.textContent), mark)
    parent.normalize()
  })
}

// Sem isto o resultado é um cartão com um título que não diz o termo procurado — foi assim que
// "1 resultado" se passou a ler como "não encontrou nada".
function highlightCard (card, pattern) {
  var walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
  var textNodes = []
  while (walker.nextNode()) textNodes.push(walker.currentNode)

  textNodes.forEach(function (node) {
    if (!node.nodeValue.trim()) return
    if (node.parentElement && node.parentElement.closest('button, mark')) return

    pattern.lastIndex = 0
    if (!pattern.test(node.nodeValue)) return

    pattern.lastIndex = 0
    var fragment = document.createDocumentFragment()
    var lastIndex = 0
    var match
    while ((match = pattern.exec(node.nodeValue)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex, match.index)))
      }
      var mark = document.createElement('mark')
      mark.className = 'hit'
      mark.textContent = match[0]
      fragment.appendChild(mark)
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < node.nodeValue.length) {
      fragment.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex)))
    }
    node.parentNode.replaceChild(fragment, node)
  })
}

function applyFilters () {
  clearHighlights()

  var query = filterState.query.trim()
  var terms = toTerms(query)
  // `kind` fica de fora: filtra linhas do catálogo, não cartões. Se contasse aqui, escolher
  // "MCP" escondia tudo menos o catálogo — incluindo os próprios chips, sem caminho de volta.
  var anyFilterActive = !!terms.length || filterState.priority !== 'all' || filterState.category !== 'all'
  var entities = matchingEntities(query)
  var pattern = terms.length ? highlightPattern(query, entities.names) : null
  var totalVisible = 0

  allCards.forEach(function (card) {
    var passPriority = filterState.priority === 'all' || cardPriorities(card).indexOf(filterState.priority) !== -1
    var passCategory = filterState.category === 'all' || cardCategory(card) === filterState.category

    var rows = Array.from(card.querySelectorAll('table tr'))
    var matchedRows = rows.filter(function (row) {
      if (row.querySelector('th')) return false
      var rowKind = row.getAttribute('data-kind')
      if (rowKind && filterState.kind !== 'all' && rowKind !== filterState.kind) return false
      if (!terms.length) return true
      // As linhas do catálogo trazem o nome em `data-name` e passam pelo mesmo motor das
      // sugestões — senão uma gralha filtrava a tabela toda para fora.
      var name = row.getAttribute('data-name')
      if (name && scoreName(query, name) !== null) return true
      return bodyMatches(terms, indexText(row.textContent))
    })

    var filteringRows = !!terms.length || filterState.kind !== 'all'
    rows.forEach(function (row) {
      if (row.querySelector('th')) { row.classList.remove('is-hidden'); return }
      // Esconder linha nenhuma quando nada bate deixaria a tabela vazia num cartão que só ficou
      // visível pelo corpo — mostra-se inteira, é mais útil que uma moldura sem conteúdo.
      var hide = filteringRows && matchedRows.length > 0 && matchedRows.indexOf(row) === -1
      row.classList.toggle('is-hidden', hide)
    })

    var passSearch = !terms.length ||
      bodyMatches(terms, cardIndex(card)) ||
      matchedRows.length > 0 ||
      entities.cards[card.id] === true

    var visible = passPriority && passCategory && passSearch
    card.classList.toggle('is-hidden', !visible)
    // O reveal por IntersectionObserver deixa `opacity: 0` em tudo o que nunca esteve no ecrã —
    // e as notas e tabelas dentro do cartão são alvos de reveal por si. Um resultado que aparece
    // a meio da página não pode depender de ter sido visto antes.
    if (visible) {
      card.classList.add('is-visible')
      card.querySelectorAll('.reveal').forEach(function (target) { target.classList.add('is-visible') })
      totalVisible++
    }
  })

  if (pattern) {
    allCards.forEach(function (card) {
      if (!card.classList.contains('is-hidden')) highlightCard(card, pattern)
    })
  }

  // Secções sem cartões visíveis — incluindo as que não têm cartões de todo — só enchem o ecrã
  // entre o utilizador e o resultado.
  allSections.forEach(function (section) {
    var hasVisibleCard = section.querySelector('.card:not(.is-hidden)') !== null
    section.classList.toggle('is-hidden', anyFilterActive && !hasVisibleCard)
  })

  // As secções também têm leads, tabelas de introdução e listas de passos fora dos cartões. Sem
  // isto, pesquisar deixava no ecrã uma tabela inteira que não tem nada a ver com o termo, entre
  // o título da secção e o resultado.
  var main = document.querySelector('main')
  if (main) main.classList.toggle('is-filtering', anyFilterActive)

  if (searchCount) {
    searchCount.textContent = anyFilterActive
      ? totalVisible + (totalVisible === 1 ? ' resultado' : ' resultados')
      : ''
  }

  if (noResults) {
    noResults.hidden = !anyFilterActive || totalVisible > 0
    var echo = noResults.querySelector('b')
    if (echo) echo.textContent = query
  }

  // Pesquisar/filtrar a partir do hero deixa os resultados fora do ecrã sem isto —
  // dá a impressão de que a pesquisa "não faz nada".
  if (anyFilterActive && !wasFilterActive) {
    var toolbar = document.getElementById('toolbar')
    if (toolbar && toolbar.getBoundingClientRect().top > 20) {
      toolbar.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    }
  }
  wasFilterActive = anyFilterActive
}

function setChipGroup (chips, attribute, value) {
  chips.forEach(function (chip) {
    var active = chip.getAttribute(attribute) === value
    chip.classList.toggle('is-active', active)
    chip.setAttribute('aria-pressed', active ? 'true' : 'false')
  })
}

function resetFilters () {
  if (searchInput) searchInput.value = ''
  filterState = { query: '', priority: 'all', category: 'all', kind: 'all' }
  setChipGroup(priorityChips, 'data-filter-priority', 'all')
  setChipGroup(categoryChips, 'data-filter-cat', 'all')
  setChipGroup(kindChips, 'data-filter-kind', 'all')
  closeSuggestions()
  applyFilters()
}

// ---------- Sugestões ----------
var suggestions = []
var suggestActive = -1

function closeSuggestions () {
  suggestions = []
  suggestActive = -1
  if (!suggestList) return
  suggestList.hidden = true
  suggestList.innerHTML = ''
  if (searchInput) {
    searchInput.setAttribute('aria-expanded', 'false')
    searchInput.removeAttribute('aria-activedescendant')
  }
}

function renderSuggestions (query) {
  if (!suggestList) return
  if (query.trim().length < 2) { closeSuggestions(); return }

  suggestions = suggestTargets
    .map(function (target) {
      var score = scoreName(query, target.name)
      return score === null ? null : { name: target.name, score: score, target: target }
    })
    .filter(Boolean)
    .sort(compareByScore)
    .slice(0, 8)

  if (!suggestions.length) { closeSuggestions(); return }

  suggestActive = -1
  suggestList.innerHTML = suggestions.map(function (item, index) {
    return '<li class="suggest-item" id="suggest-' + index + '" role="option" aria-selected="false" data-index="' + index + '">' +
      '<span class="suggest-name"><code class="inl">' + escapeHtml(item.name) + '</code>' +
      '<span class="kind kind-' + item.target.kind + '">' + KIND_LABELS[item.target.kind] + '</span></span>' +
      '<span class="suggest-where">↳ ' + escapeHtml(item.target.cardTitle) + '</span>' +
      '</li>'
  }).join('')
  suggestList.hidden = false
  if (searchInput) searchInput.setAttribute('aria-expanded', 'true')
}

function moveSuggestion (delta) {
  if (!suggestions.length) return
  suggestActive = (suggestActive + delta + suggestions.length) % suggestions.length
  Array.from(suggestList.children).forEach(function (item, index) {
    var active = index === suggestActive
    item.setAttribute('aria-selected', active ? 'true' : 'false')
    if (active) item.scrollIntoView({ block: 'nearest' })
  })
  if (searchInput) searchInput.setAttribute('aria-activedescendant', 'suggest-' + suggestActive)
}

function gotoSuggestion (index) {
  var item = suggestions[index]
  if (!item) return
  var card = document.getElementById(item.target.cardId)
  closeSuggestions()
  resetFilters()
  if (!card) return
  card.classList.add('is-visible')
  card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
  jumpFlash(item.target.cardId)
}

if (searchInput) {
  var searchDebounce
  searchInput.addEventListener('input', function () {
    var value = searchInput.value
    renderSuggestions(value)
    clearTimeout(searchDebounce)
    searchDebounce = setTimeout(function () {
      filterState.query = value
      // Os chips são para navegar, a query é para encontrar. Deixá-los em AND com a pesquisa
      // dava zero resultados sem dizer porquê.
      if (value.trim()) {
        filterState.priority = 'all'
        filterState.category = 'all'
        setChipGroup(priorityChips, 'data-filter-priority', 'all')
        setChipGroup(categoryChips, 'data-filter-cat', 'all')
      }
      applyFilters()
    }, 120)
  })

  searchInput.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowDown') { event.preventDefault(); moveSuggestion(1); return }
    if (event.key === 'ArrowUp') { event.preventDefault(); moveSuggestion(-1); return }
    if (event.key === 'Enter' && suggestActive >= 0) { event.preventDefault(); gotoSuggestion(suggestActive); return }
    if (event.key !== 'Escape') return
    if (suggestList && !suggestList.hidden) { closeSuggestions(); return }
    if (searchInput.value) {
      searchInput.value = ''
      filterState.query = ''
      applyFilters()
    }
  })

  searchInput.addEventListener('focus', function () { renderSuggestions(searchInput.value) })
}

if (suggestList) {
  // `mousedown` e não `click`: o `blur` do input fecha a lista antes de o click chegar.
  suggestList.addEventListener('mousedown', function (event) {
    var item = event.target.closest('.suggest-item')
    if (!item) return
    event.preventDefault()
    gotoSuggestion(parseInt(item.getAttribute('data-index'), 10))
  })
}

document.addEventListener('click', function (event) {
  if (!suggestList || suggestList.hidden) return
  if (event.target.closest('.search-box')) return
  closeSuggestions()
})

priorityChips.forEach(function (chip) {
  chip.addEventListener('click', function () {
    setChipGroup(priorityChips, 'data-filter-priority', chip.getAttribute('data-filter-priority'))
    filterState.priority = chip.getAttribute('data-filter-priority')
    applyFilters()
  })
})

categoryChips.forEach(function (chip) {
  chip.addEventListener('click', function () {
    setChipGroup(categoryChips, 'data-filter-cat', chip.getAttribute('data-filter-cat'))
    filterState.category = chip.getAttribute('data-filter-cat')
    applyFilters()
  })
})

kindChips.forEach(function (chip) {
  chip.addEventListener('click', function () {
    setChipGroup(kindChips, 'data-filter-kind', chip.getAttribute('data-filter-kind'))
    filterState.kind = chip.getAttribute('data-filter-kind')
    applyFilters()
  })
})

// Atalho de teclado "/" para focar a pesquisa
document.addEventListener('keydown', function (e) {
  if (e.key !== '/') return
  var active = document.activeElement
  if (active && /^(INPUT|TEXTAREA)$/.test(active.tagName)) return
  if (searchInput) { e.preventDefault(); searchInput.focus() }
})

// Navegação (TOC + ranking): limpa filtros para garantir que o destino fica visível, e dá um flash no alvo
function jumpFlash (id) {
  var target = document.getElementById(id)
  if (!target) return
  setTimeout(function () {
    target.classList.remove('flash')
    void target.offsetWidth
    target.classList.add('flash')
  }, reduceMotion ? 0 : 550)
}

document.querySelectorAll('nav.toc a, .rank-list a, main table a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener('click', function () {
    resetFilters()
    var id = anchor.getAttribute('href').replace('#', '')
    if (anchor.hasAttribute('data-jump')) jumpFlash(id)
  })
})

// As secções passaram de #prereq/#mcp/#plugins para #maquina/#projeto/#pontual na v2.
// Os anchors antigos circulam desde a v1 — redireciona em vez de deixar o link partido.
var legacyAnchors = { prereq: 'maquina', mcp: 'maquina', plugins: 'maquina', 'design-marketing': 'design' }
function redirectLegacyHash () {
  var legacy = legacyAnchors[location.hash.replace('#', '')]
  if (legacy) location.replace('#' + legacy)
}
window.addEventListener('hashchange', redirectLegacyHash)
redirectLegacyHash()

applyFilters()

// Depois do índice de pesquisa: o catálogo indexa o Standard, que é o que o HTML traz.
initProfilePicker()
