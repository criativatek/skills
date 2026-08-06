# Changelog

## 2.0.1 — 2026-08-06
- CI: `actions/checkout` e `actions/setup-node` de v4 para v5. O runner já avisava que o Node 20
  destas actions está deprecado e a ser forçado para Node 24 — o deploy passava, mas partia quando
  removessem o fallback.
- CI: Node do build de 20 para 22 (LTS). O 20 chegou a fim de vida.

## 2.0.0 — 2026-08-06

Reorganização do guia **por frequência** em vez de por tipo de ferramenta. A estrutura antiga
(pré-requisitos / MCP / skills) punha ao mesmo nível o que se instala uma vez por máquina, o que
entra em cada projeto novo e o que se liga por uma tarefa. Colada inteira num projeto novo,
reinstalava globais que já lá estavam e ligava servidores com credenciais que esse projeto nunca
ia usar.

### Estrutura
- Secções novas: **A · Uma vez por máquina** (`#maquina`), **B · Por projeto** (`#projeto`),
  **C · Conforme a necessidade** (`#pontual`), mais **Como medir** (`#medir`).
- Os `id` dos cards mantêm-se; os anchors de secção antigos (`#prereq`, `#mcp`, `#plugins`)
  **redirecionam** para `#maquina` em vez de ficarem partidos.
- Chips de categoria passam a chips de **frequência**.
- Regra em C: **liga, usa, desliga** — tudo com `-s project` e `claude mcp remove` no fim.
- Cada bloco executável passa a ter, por cima, uma linha a dizer **o que faz à máquina** — a página
  é colada em agentes, tem de haver onde parar antes de correr.
- Hero stats deixam de contar servidores e skills (um contador que sobe premeia instalar mais):
  passam a 3 frequências / 7 skills globais / 1 MCP transversal.

### Orquestração de modelos
- `architect` passa a **Fable**, `reviewer` a **Opus**. No Max o Fable tem tecto de 50% do limite
  semanal — gasta-se onde a decisão é difícil de reverter, não a rever formulários e CSS.
- `reviewer` fica **sem `Bash`**: `disallowedTools: Write, Edit` não impede escritas por shell
  (`sed -i`, `>`), e o `permissionMode` do subagente pode ser sobreposto pelo modo da sessão.
  A única garantia é não dar a ferramenta. O `architect` mantém `Bash` — excepção deliberada,
  porque verificar contra dados reais é o que lhe dá valor.
- Cada subagente ganha **orçamento de saída** na definição. O relatório devolvido entra no contexto
  principal e é relido em todos os turnos seguintes.
- Notas novas: alias `fable` requer Claude Code 2.1.170+; `CLAUDE_CODE_SUBAGENT_MODEL` sobrepõe-se
  ao `model:` de todos os ficheiros.

### Cortes
- **Caveman** desce de obrigatório a opcional: numa sessão medida o output foi 838k de ~373M de
  tokens — fracção de por cento — e em troca degrada explicações.
- Fora: `full-output-enforcement` (contradiz os orçamentos de saída), `subagent-driven-development`
  e `dispatching-parallel-agents` (delegam por sistema, quando a configuração nova delega por
  excepção), Browser Tools (terceira ferramenta de browser), Sequential Thinking (o raciocínio já
  está no `effort`), e os duplicados `architecture-designer`, `diagnose` e
  `playwright-generate-test`.
- **Graphify** passa de recomendado a secção C: só compensa em codebase grande e desconhecida —
  num Laravel a convenção já é o mapa e o Boost dá o resto, e o grafo desactualiza-se a cada
  refactor.
- Bloco de 31 comandos `npx skills add` substituído por **sete skills globais**; o resto passa a
  por projeto.

### Segurança
- Aviso explícito para **não** pôr tokens no `env` do `~/.claude/settings.json` — dali são
  injectados em todas as sessões e todos os projetos.
- Hook de sessão com o aviso de que vai no `settings.json` do **projeto**: o stdout do hook entra
  directamente no contexto, portanto um hook global permitiria a qualquer repositório injectar
  conteúdo à escolha na sessão.
- Secção «Verificar tudo» ganha scan de segredos (`ghp_` **e** `github_pat_`) por ficheiro nomeado,
  e verificação do histórico do Git.

### Problemas comuns
Reescrito com o que se apurou na prática, não com hipóteses:
- `npx` a falhar com `Class extends value undefined is not a constructor or null` — não é a cache
  nem o pacote: é uma pasta de versão do nvm sobreposta por binários de outra major. Parte também
  o Chrome DevTools MCP e tudo o que arranque por `npx`.
- `gbrain ✗ Failed to connect` — processo órfão a segurar o lock do PGLite.
- `npx skills add` a imprimir `PromptScript does not support global skill installation` **e a
  instalar à mesma** — falha só um PromptScript acessório do mesmo pacote.

### Correcções
- Tabelas de 3 colunas rolam dentro da própria caixa abaixo de 560px, em vez de empurrar a página.
- `code.inl` passa a quebrar em palavras longas.

## 1.4.1 — 2026-07-22
- Fix: correcção da claim do Banana. A API de imagem do Gemini **não tem tier grátis** — é paga
  por defeito (sem billing devolve `429 · limit: 0`, verificado end-to-end). O «500 img/dia grátis»
  é só do AI Studio web, não da API. Nota clarificada + link para activar billing.

## 1.4.0 — 2026-07-22
- Adicionado o Banana (skill de geração de imagem via Gemini/Nano Banana, 500 img/dia grátis).
  Inclui nota Windows: precisa de symlink `python3.exe` porque os scripts chamam `python3`.
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
