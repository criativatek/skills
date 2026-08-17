// Selector de perfil de orquestração.
//
// O Standard fica escrito à mão no HTML — é o que se vê sem JS, com o fetch em baixo,
// ou a meio de um deploy. Este ficheiro só reescreve os blocos quando se escolhe outro
// perfil, e repõe o HTML original quando se volta ao Standard.
//
// O renderer é o mesmo ficheiro que o profile.sh descarrega: uma implementação só,
// para a página e o instalador não divergirem. Importado por caminho e empacotado
// pelo Vite — buscá-lo por URL em runtime falhava em produção, onde o servidor
// entrega .mjs como application/octet-stream e o browser recusa o módulo.
import { resolveProfile, renderAgentsScript, renderClaudemdBlock, modelDisplayName } from '../public/install/render.mjs'

var STORAGE_KEY = 'orquestracao-perfil'

var picker = document.getElementById('profilePicker')
var chipContainer = picker && picker.querySelector('.profile-chips')
var summaryElement = picker && picker.querySelector('.profile-summary')
var notesElement = document.getElementById('profileNotes')
var activeElement = document.getElementById('claudemdProfileActive')

var flowElement = document.getElementById('profileFlow')
var agentsElement = document.getElementById('profileAgents')
var claudemdElement = document.getElementById('profileClaudemd')
var tableElement = document.getElementById('profileTable')

// Instantâneo do que o HTML traz: repor isto é sempre mais seguro do que voltar a
// gerar o Standard e torcer para que o espaçamento coincida.
var originalContent = null

function captureOriginal () {
  originalContent = {
    flow: flowElement.textContent,
    agents: agentsElement.textContent,
    claudemd: claudemdElement.textContent,
    table: tableElement.innerHTML,
  }
}

function fetchJson (path) {
  return fetch(path).then(function (response) {
    if (!response.ok) throw new Error(path + ' devolveu ' + response.status)
    return response.json()
  })
}

function renderFlow (resolved) {
  var lines = [
    'Pedido',
    '  ↓',
    'Modelo principal da sessão — coordenador (' + resolved.mainModel + ')',
  ]

  var agentNames = Object.keys(resolved.agents)
  agentNames.forEach(function (agentName, index) {
    var agent = resolved.agents[agentName]
    var branch = index === agentNames.length - 1 ? '  └── ' : '  ├── '
    // Larguras 13 e 7 vêm do diagrama que já estava no HTML — o Standard é reposto
    // a partir do instantâneo, por isso um erro aqui só aparecia nos outros perfis.
    lines.push(
      branch +
        padRight(agentName, 13) +
        '· ' + padRight(modelDisplayName(agent.model), 7) +
        '· ' + agent.flowLabel
    )
  })

  return lines.join('\n')
}

function padRight (text, width) {
  var padded = text
  while (padded.length < width) padded += ' '
  return padded
}

function updateTable (resolved) {
  Array.from(tableElement.rows).forEach(function (row) {
    var agentName = row.cells[0] && row.cells[0].textContent.trim()
    var agent = resolved.agents[agentName]
    if (!agent) return
    row.cells[1].textContent = modelDisplayName(agent.model)
    row.cells[2].textContent = agent.effort
  })
}

function renderNotes (notes) {
  notesElement.innerHTML = ''
  notes.forEach(function (note) {
    var item = document.createElement('li')
    item.textContent = note
    notesElement.appendChild(item)
  })
  notesElement.hidden = notes.length === 0
}

function applyProfile (profileId, index, base) {
  var listed = index.profiles.find(function (entry) { return entry.id === profileId })
  summaryElement.textContent = listed ? listed.summary : ''
  activeElement.textContent = 'A mostrar o bloco do perfil ' + (listed ? listed.name : profileId) + '.'
  activeElement.hidden = profileId === index.default

  Array.from(chipContainer.children).forEach(function (chip) {
    chip.setAttribute('aria-pressed', String(chip.dataset.profile === profileId))
  })

  if (profileId === index.default) {
    flowElement.textContent = originalContent.flow
    agentsElement.textContent = originalContent.agents
    claudemdElement.textContent = originalContent.claudemd
    tableElement.innerHTML = originalContent.table
    renderNotes([])
    return Promise.resolve()
  }

  return fetchJson('/profiles/' + profileId + '.json').then(function (profile) {
    if (profile.version !== listed.version) {
      throw new Error('versão de ' + profileId + ' não bate com o index')
    }

    var resolved = resolveProfile(base, profile)
    flowElement.textContent = renderFlow(resolved)
    agentsElement.textContent = renderAgentsScript(resolved)
    claudemdElement.textContent = renderClaudemdBlock(resolved)
    updateTable(resolved)
    renderNotes(resolved.notes)
  })
}

function buildChips (index, onSelect) {
  index.profiles.forEach(function (listed) {
    var chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'profile-chip'
    chip.textContent = listed.name
    chip.dataset.profile = listed.id
    chip.setAttribute('aria-pressed', 'false')
    chip.addEventListener('click', function () { onSelect(listed.id) })
    chipContainer.appendChild(chip)
  })
}

export function initProfilePicker () {
  if (!picker || !flowElement || !agentsElement || !claudemdElement || !tableElement) return

  captureOriginal()

  Promise.all([
    fetchJson('/profiles/index.json'),
    fetchJson('/profiles/base.json'),
  ])
    .then(function (loaded) {
      var index = loaded[0]
      var base = loaded[1]

      function select (profileId) {
        applyProfile(profileId, index, base)
          .then(function () {
            try { localStorage.setItem(STORAGE_KEY, profileId) } catch (error) { /* modo privado */ }
          })
          .catch(function () {
            // Perfil em falta ou versão desalinhada a meio de um deploy: volta ao
            // que o HTML traz, em vez de deixar o cartão a meio.
            applyProfile(index.default, index, base)
          })
      }

      buildChips(index, select)
      picker.hidden = false

      var stored = null
      try { stored = localStorage.getItem(STORAGE_KEY) } catch (error) { /* modo privado */ }
      var initial = index.profiles.some(function (listed) { return listed.id === stored })
        ? stored
        : index.default

      select(initial)
    })
    .catch(function () {
      // Sem os JSON não há escolha a oferecer. O Standard já está no HTML.
      picker.hidden = true
    })
}
