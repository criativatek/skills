// Renderer partilhado: a pagina, o profile.sh e os testes usam este ficheiro.
// Puro — sem fs, sem rede, sem dependencias. Quem chama trata de ler e escrever.
//
// Publicado em /install/render.mjs para o instalador o poder descarregar.

// Ordem fixa do frontmatter. Nao reordenar: o teste de nao-regressao compara
// byte a byte com o bloco que o site ja publicava.
const FRONTMATTER_ORDER = [
  'name',
  'description',
  'model',
  'effort',
  'tools',
  'disallowedTools',
  'permissionMode',
  'maxTurns',
]

const MODEL_DISPLAY_NAMES = {
  haiku: 'Haiku',
  sonnet: 'Sonnet',
  fable: 'Fable',
  opus: 'Opus',
}

export function modelDisplayName (model) {
  return MODEL_DISPLAY_NAMES[model] || model
}

/**
 * Junta base + perfil. O perfil so declara overrides; a base tem tudo o que nao varia.
 * Merge raso por agente — chega, porque nenhuma entrada de agente tem objectos aninhados.
 */
export function resolveProfile (base, profile) {
  if (base.schema !== profile.schema) {
    throw new Error(`schema incompativel: base ${base.schema}, perfil ${profile.schema}`)
  }

  const agents = {}
  for (const [agentName, baseEntry] of Object.entries(base.agents)) {
    agents[agentName] = Object.assign({}, baseEntry, profile.agents[agentName] || {})
  }

  return {
    schema: base.schema,
    id: profile.id,
    name: profile.name,
    version: profile.version,
    baseVersion: base.version,
    summary: profile.summary,
    goal: profile.goal,
    mainModel: profile.mainModel,
    claudemdGuidance: profile.claudemdGuidance,
    agents,
    claudemd: base.claudemd,
    dispatch: Object.assign({}, base.dispatch, profile.dispatch || {}),
    notes: profile.notes || [],
  }
}

/**
 * Conteudo de cada ~/.claude/agents/<nome>.md, indexado pelo nome do agente.
 * O instalador escreve isto; o bloco bash do site escreve o mesmo. Uma so montagem,
 * para os dois caminhos nao divergirem.
 */
export function renderAgentFiles (resolved) {
  const files = {}

  for (const [agentName, agent] of Object.entries(resolved.agents)) {
    const frontmatterLines = []
    for (const key of FRONTMATTER_ORDER) {
      const value = key === 'name' ? agentName : agent[key]
      if (value === undefined) continue
      frontmatterLines.push(`${key}: ${value}`)
    }

    files[agentName] = ['---', frontmatterLines.join('\n'), '---', agent.body].join('\n')
  }

  return files
}

/**
 * O bloco bash que escreve ~/.claude/agents/*.md.
 * Saida identica, byte a byte, ao que o cartao #orquestracao ja publicava.
 */
export function renderAgentsScript (resolved) {
  const blocks = ['mkdir -p ~/.claude/agents']

  for (const [agentName, content] of Object.entries(renderAgentFiles(resolved))) {
    blocks.push(`cat > ~/.claude/agents/${agentName}.md <<'MD'\n${content}\nMD`)
  }

  return blocks.join('\n\n')
}

/**
 * Titulos de nivel 2 que o bloco gerido ocupa no CLAUDE.md. Sai do proprio template,
 * para nao haver uma segunda lista a envelhecer noutro sitio.
 */
export function managedHeadings (base) {
  return base.claudemd.template
    .split('\n')
    .filter(function (line) { return line.startsWith('## ') })
    .map(function (line) { return line.slice(3).trim() })
}

/**
 * O bloco que vai para ~/.claude/CLAUDE.md. A tabela e gerada a partir dos agentes
 * resolvidos; o resto da prosa vem do template da base.
 */
export function renderClaudemdBlock (resolved) {
  const tableRows = Object.entries(resolved.agents).map(function ([agentName, agent]) {
    return `| \`${agentName}\` | ${modelDisplayName(agent.model)} | ${agent.claudemdWhen} |`
  })

  if (!resolved.claudemdGuidance) {
    throw new Error(`perfil ${resolved.id} sem claudemdGuidance`)
  }

  return resolved.claudemd.template
    .replace('{{GUIDANCE}}', resolved.claudemdGuidance)
    .replace('{{TABLE}}', tableRows.join('\n'))
}
