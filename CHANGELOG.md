# Changelog

## 1.3.0 — 2026-07-21
- `framer-motion` → `motion` na tabela de stacks (novo nome do pacote, import `motion/react`).
- Adicionado o Higgsfield (geração de imagem/vídeo AI, OAuth sem API key) como opcional para
  quem trabalha em conteúdo. Avisa sobre o duplicado se já existir o connector no claude.ai.
- Adicionado o MCP do shadcn (registo de componentes, sem API key). Nota: é por projeto,
  não user scope — escreve `.mcp.json` na raiz e depende de `components.json`.
- 21st.dev actualizado: passa de "opcional — pago" a **recomendado**. O CLI `@21st-dev/cli install`
  foi substituído pelo endpoint HTTP `https://21st.dev/api/mcp` com header `x-api-key`, e o tier
  gratuito deixou de ser ~5 pedidos/mês — busca semântica e logos são ilimitados, só a instalação
  de código está limitada a 2/dia. Acrescentado aviso sobre a chave em claro no `~/.claude.json`.

## 1.2.1 — 2026-07-13
- Fix: pesquisar a partir do topo da página (hero) não mostrava resultados visíveis —
  a caixa de pesquisa recebe foco sem fazer scroll, deixando os cards filtrados fora
  do ecrã. Agora a página desce automaticamente para os resultados na primeira pesquisa.

## 1.2.0 — 2026-07-13
- Adicionado GBrain (memória persistente local) como obrigatório à secção de Pré-requisitos.

## 1.1.1 — 2026-07-02
- Removido o Manifest do guia.

## 1.1.0 — 2026-07-01
- Adicionado Manifest (router de modelos open-source) à secção de Plugins & Skills.

## 1.0.0
- Setup inicial do guia MCP/Skills CriativaTek.
