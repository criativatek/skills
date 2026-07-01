import './style.css'

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Botões de copiar código
document.querySelectorAll('.copy').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var pre = btn.parentElement.querySelector('pre')
    var text = pre.textContent.replace(/\s+$/, '')
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
  var revealTargets = document.querySelectorAll('main .card, main .note, main table, main ol.steps > li')
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
