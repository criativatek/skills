import './style.css'

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

// Realce do item ativo na navegação lateral
var links = document.querySelectorAll('nav.toc a')
var sections = Array.from(links).map(function (a) { return document.querySelector(a.getAttribute('href')) })

function onScroll () {
  var pos = window.scrollY + 120
  var current = sections[0]
  sections.forEach(function (s) { if (s && s.offsetTop <= pos) current = s })
  links.forEach(function (a) {
    var active = a.getAttribute('href') === '#' + (current && current.id)
    a.style.color = active ? 'var(--fg)' : ''
    a.style.background = active ? 'var(--bg-soft)' : ''
    a.style.borderLeftColor = active ? 'var(--accent)' : 'transparent'
  })
}

window.addEventListener('scroll', onScroll)
onScroll()
