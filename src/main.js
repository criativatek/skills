import './style.css'

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Botões de copiar código — só os comandos, sem linhas de comentário/vazias
document.querySelectorAll('.copy').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var pre = btn.parentElement.querySelector('pre')
    var text = pre.textContent
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

// ---------- Pesquisa + filtros ----------
var searchInput = document.getElementById('siteSearch')
var searchCount = document.getElementById('searchCount')
var priorityChips = document.querySelectorAll('[data-filter-priority]')
var categoryChips = document.querySelectorAll('[data-filter-cat]')
var allCards = Array.from(document.querySelectorAll('main .card'))
var filterableSections = ['prereq', 'mcp', 'plugins', 'problemas']

var filterState = { query: '', priority: 'all', category: 'all' }

function normalize (s) { return (s || '').toLowerCase() }

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

function cardSearchText (card) {
  if (card._searchText) return card._searchText
  var parts = []
  var h3 = card.querySelector(':scope > h3')
  if (h3) parts.push(h3.textContent)
  card.querySelectorAll(':scope > .desc, h4, .note, .codeblock pre').forEach(function (el) { parts.push(el.textContent) })
  card._searchText = normalize(parts.join(' '))
  return card._searchText
}

function applyFilters () {
  var terms = filterState.query.trim() ? normalize(filterState.query).trim().split(/\s+/) : []
  var anyFilterActive = !!terms.length || filterState.priority !== 'all' || filterState.category !== 'all'
  var totalVisible = 0

  allCards.forEach(function (card) {
    var passPriority = filterState.priority === 'all' || cardPriorities(card).indexOf(filterState.priority) !== -1
    var passCategory = filterState.category === 'all' || cardCategory(card) === filterState.category

    var rows = card.querySelectorAll('table tr')
    var hasTable = rows.length > 0
    var anyRowVisible = false
    rows.forEach(function (row) {
      if (row.querySelector('th')) { row.classList.remove('is-hidden'); return }
      var rowText = normalize(row.textContent)
      var rowMatches = !terms.length || terms.every(function (t) { return rowText.indexOf(t) !== -1 })
      row.classList.toggle('is-hidden', !!terms.length && !rowMatches)
      if (rowMatches) anyRowVisible = true
    })

    var cardTextMatches = !terms.length || terms.every(function (t) { return cardSearchText(card).indexOf(t) !== -1 })
    var passSearch = !terms.length || cardTextMatches || (hasTable && anyRowVisible)

    var visible = passPriority && passCategory && passSearch
    card.classList.toggle('is-hidden', !visible)
    if (visible) totalVisible++
  })

  filterableSections.forEach(function (id) {
    var section = document.getElementById(id)
    if (!section) return
    var visibleCards = section.querySelectorAll('.card:not(.is-hidden)').length
    var notice = section.querySelector('.no-match')
    if (notice) notice.hidden = !anyFilterActive || visibleCards !== 0
  })

  if (searchCount) {
    searchCount.textContent = anyFilterActive
      ? totalVisible + (totalVisible === 1 ? ' resultado' : ' resultados')
      : ''
  }
}

function resetFilters () {
  if (searchInput) searchInput.value = ''
  filterState = { query: '', priority: 'all', category: 'all' }
  priorityChips.forEach(function (c) { c.classList.toggle('is-active', c.getAttribute('data-filter-priority') === 'all'); c.setAttribute('aria-pressed', c.getAttribute('data-filter-priority') === 'all') })
  categoryChips.forEach(function (c) { c.classList.toggle('is-active', c.getAttribute('data-filter-cat') === 'all'); c.setAttribute('aria-pressed', c.getAttribute('data-filter-cat') === 'all') })
  applyFilters()
}

if (searchInput) {
  var searchDebounce
  searchInput.addEventListener('input', function () {
    var val = searchInput.value
    clearTimeout(searchDebounce)
    searchDebounce = setTimeout(function () { filterState.query = val; applyFilters() }, 120)
  })
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && searchInput.value) {
      searchInput.value = ''
      filterState.query = ''
      applyFilters()
    }
  })
}

priorityChips.forEach(function (chip) {
  chip.addEventListener('click', function () {
    priorityChips.forEach(function (c) { c.classList.remove('is-active'); c.setAttribute('aria-pressed', 'false') })
    chip.classList.add('is-active')
    chip.setAttribute('aria-pressed', 'true')
    filterState.priority = chip.getAttribute('data-filter-priority')
    applyFilters()
  })
})

categoryChips.forEach(function (chip) {
  chip.addEventListener('click', function () {
    categoryChips.forEach(function (c) { c.classList.remove('is-active'); c.setAttribute('aria-pressed', 'false') })
    chip.classList.add('is-active')
    chip.setAttribute('aria-pressed', 'true')
    filterState.category = chip.getAttribute('data-filter-cat')
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

document.querySelectorAll('nav.toc a, .rank-list a').forEach(function (a) {
  a.addEventListener('click', function () {
    resetFilters()
    var id = a.getAttribute('href').replace('#', '')
    if (a.hasAttribute('data-jump')) jumpFlash(id)
  })
})

applyFilters()
