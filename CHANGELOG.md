# Changelog

## 2.4.0 — 2026-08-14
- **Task Observer** entra em `A · Uma vez por máquina` como **obrigatório**, e no top da secção
  «Por onde começar» (que passa de 6 para 7). Observa a sessão, regista correcções e padrões num
  log, e num ciclo de revisão separado propõe skills novas — sem alterar nenhuma sozinha.
  `npx skills add https://github.com/rebelytics/one-skill-to-rule-them-all --skill task-observer -g`
- Task Observer: o cartão diz o preço em números. O `SKILL.md` tem **24,9 KB** (~7k tokens) e a
  skill foi feita para estar activa a sessão inteira — pela regra das skills globais, o corpo entra
  quando é invocada e fica até ao fim. É a skill mais cara do guia; em sessões curtas ou mecânicas,
  não invocar. E aponta a sobreposição com `learn`, GBrain e a regra de memória do CLAUDE.md global.
- **Motion** entra em `B · Por projeto` como **obrigatório**.
  `claude mcp add --transport http motion https://mcp.motion.dev -s project` — endpoint sondado,
  sem token nem conta, duas ferramentas: `search-motion-docs` e `generate-css-easing`. A segunda é
  a que justifica o servidor: gera curvas `linear()` de mola, que nenhuma pesquisa de documentação
  produz. Docs do Motion já vinham pelo Context7.
- Motion: ressalva de que o `MotionScore` (auditoria de jank e layout thrash) e o editor de
  transições estão noutro endpoint (`/plus`) e exigem Motion+ pago. E de que o instalador oficial
  `npx motion-ai` é interactivo e reescreve a configuração MCP no sítio — daí a linha manual.
- Contador do hero passa de 7 para 8 skills globais; o cartão das skills globais aponta a oitava.

## 2.3.0 — 2026-08-14
- **Correcção: a instalação da `impeccable` estava partida.** O repositório reestruturou-se e já não
  expõe as skills à unidade — `npx skills add …/impeccable --skill polish` devolve
  `No matching skills found`. Passou a ser **uma** skill com os 23 verbos lá dentro, invocados por
  `/impeccable <verbo>`. Comando corrigido e aviso para quem tem as antigas soltas em
  `~/.claude/skills/`: duas versões do mesmo conselho carregadas ao mesmo tempo.
- Design ganha cartão próprio (`#design`), separado de marketing. O guia cobria 3 skills de design;
  o `leonxlnx/taste-skill` sozinho tem 13. Agora são 10, agrupadas por camada — base, linguagem
  visual, trabalho sobre o existente, material gráfico — com tabela de quando cada uma é a certa.
- Design: entram `frontend-design`, `high-end-visual-design`, `minimalist-ui`,
  `industrial-brutalist-ui`, `extract-design-system`, `emil-design-eng` e `brandkit`. Todos os
  comandos foram verificados por instalação real — os nomes das skills do `taste-skill` **não** são
  os nomes das pastas (`minimalist-skill` instala-se como `minimalist-ui`).
- Design: aviso de que `minimalist-ui` e `industrial-brutalist-ui` definem paletas e grelhas
  incompatíveis — uma de cada vez. E que `dataviz` e `artifact-design` já vêm embutidas no Claude
  Code, não se instalam.
- Design: aponta a sobreposição com o gstack (`/design-consultation`, `/design-review`,
  `/design-html`, `/design-shotgun`) em vez de a deixar por descobrir.
- Marketing fica com copy, SEO, social e conteúdo, mais a ressalva de que a `seo-audit` só tem o que
  medir em páginas públicas. `#design-marketing` redirecciona para `#design`.
- Catálogo: a extracção do `--skill` passou a exigir `npx skills add` na mesma linha. Um comando
  citado numa frase — a dizer que deixou de funcionar — estava a entrar no catálogo como instalação.

## 2.2.0 — 2026-08-14
- Pesquisa: passa a encontrar skills pelo nome. Escrever `ui-ux-pro-max` não dava nada porque o
  índice era uma lista de selectores escolhidos à mão (`h3`, `.desc`, `h4`, `.note`,
  `.codeblock pre`) e a comparação era `indexOf` sobre `toLowerCase()`. Agora indexa o cartão
  inteiro e normaliza os dois lados: sem acentos e com `-` `_` `/` `.` tratados como separador.
  `ui-ux-pro-max`, `uiuxpromax`, `ui ux pro max`, `UI/UX Pro Max` e `sessao` chegam todos ao sítio.
- Pesquisa: tolerância a gralhas (`playwrigth`, `ui-ux-pro-mx`) por distância de edição contra a
  melhor janela do nome — 1 edição entre 5 e 8 caracteres, 2 acima. Abaixo de 5 não há tolerância:
  com 4 letras quase tudo fica a uma edição de quase tudo.
- Pesquisa: um identificador escrito junto conta como um termo. `ui-ux-pro-max` deixou de bater em
  cartões longos só por terem `ui`, `ux`, `pro` e `max` espalhados pelo texto.
- Pesquisa: dropdown de sugestões com o nome da skill/MCP, o tipo, e o cartão onde vive. Setas,
  Enter e Escape; activar salta para o cartão e dá-lhe um flash.
- Pesquisa: o termo encontrado fica realçado no resultado — incluindo com acentos diferentes dos
  escritos, e o nome da entidade quando a correspondência foi aproximada.
- Pesquisa: escrever repõe os chips de prioridade e frequência. Estavam em AND com a query e
  davam zero resultados sem dizer porquê.
- Pesquisa: com filtro activo escondem-se as secções sem resultados e o conteúdo fora dos cartões
  (leads, tabelas de introdução, listas de passos). Antes ficava no ecrã uma tabela inteira sem
  relação com o termo, entre o utilizador e o resultado.
- Pesquisa: estado vazio explícito com atalho para o catálogo, em vez de uma página em branco com
  «0 resultados» na barra.
- Pesquisa: cartões e notas que nunca tinham entrado no ecrã ficavam em `opacity: 0` ao serem
  desfiltrados — o reveal é forçado no que passa a estar visível.
- **Catálogo A–Z** — secção nova com as 44 skills, MCP, plugins e ferramentas que o guia instala,
  com o comando e o link para o cartão. É gerado a partir dos próprios comandos da página, por
  isso não pode ficar dessincronizado. Filtro por tipo.
- Motor de correspondência isolado em `src/search.js`, sem DOM, com testes: `npm test`.

## 2.1.0 — 2026-08-10
- Codex: card passa a cobrir também **geração de imagem**. O Codex CLI traz a skill `$imagegen`
  (gpt-image-2) embutida e incluída na subscrição ChatGPT Plus/Pro/Business — sem API key, sem
  billing separado. Com o comando `codex exec`, o caminho de destino obrigatório no prompt (senão
  o PNG fica em `~/.codex/generated_images/<uuid>/`) e o detalhe das plicas simples em bash.
- Codex: avisos de custo e limite — turnos de imagem queimam a quota do Plus 3–5× mais depressa que
  os de texto; sem transparência nativa (alpha continua a ser SVG); 4K em beta instável.
- Banana: a nota do «sem tier grátis» passa a mandar quem já paga ChatGPT Plus para o Codex, em vez
  de o deixar montar billing na Google para o mesmo resultado.

## 2.0.2 — 2026-08-06
- Problemas comuns: a entrada do `Class extends value undefined` estava incompleta. Não parte só o
  `npx` — parte **toda a camada de rede do npm**: `npm view`, `npm install -g`, `claude update` e
  todos os MCP que arrancam por `npx`. Os comandos offline continuam a passar, o que faz parecer
  que o npm está bom.
- Problemas comuns: entrada nova para a armadilha da correcção. No nvm-windows os pacotes globais
  são **por versão** — `nvm use` órfã o `claude`, `codex`, `gemini` e `codeburn` de uma só vez, e
  o `claude` sai do PATH. Com o comando para listar o que ficou para trás e reinstalar.

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
