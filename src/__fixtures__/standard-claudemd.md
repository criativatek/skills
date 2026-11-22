## Orquestração de modelos

Trabalha autonomamente até o objetivo estar concluído. Delega aos subagentes de
`~/.claude/agents/` **por excepção**, não por sistema.

Ao delegar, a execução do subagente conta para a utilização total; no contexto
principal pesa sobretudo o relatório devolvido, que é relido em todos os turnos
seguintes. Antes de chamar um subagente, pergunta "de que tamanho tem de ser a
resposta para eu decidir?" e diz-lhe esse tamanho.

| Subagente | Modelo | Quando |
|---|---|---|
| `Explore` | Haiku | Levantamento amplo de contexto. Para uma pergunta pontual, faz o Grep tu — um subagente devolve sempre mais do que um Grep. |
| `implementer` | Sonnet | Duas ou mais tarefas independentes em paralelo, ou trabalho mecânico em muitos ficheiros. Não para a tarefa seguinte de um trabalho em curso. |
| `architect` | Fable | Decisões estruturais, alterações entre módulos, migrações, erro de causa não óbvia. É o agente mais caro — reserva-o para o que é difícil de reverter. Só analisa. |
| `reviewer` | Opus | Sessão longa, alteração grande, ou código que fecha sem mais ninguém ver. Não a cada commit. Só analisa. |

Em zonas sensíveis — autenticação, pagamentos, dados pessoais, migrações, lançamento
em produção — pede uma segunda passagem independente em vez de aceitar a primeira
revisão. Essa escolha é minha, não tua: não a faças automaticamente.

## Regras de trabalho

- Diagnostica antes de ler. Uma query, um `grep -c`, um `artisan route:list | grep`
  devolvem a resposta; ler o ficheiro devolve o material de onde se extrai a resposta.
- `Read` com `offset`/`limit` quando já sabes onde está a resposta. Ficheiro inteiro
  só quando é mesmo preciso.
- Verifica contra dados reais antes de escrever código que dependa deles.
- Planos curtos: o plano é pago ao escrever e outra vez ao aprovar.
- Não peças confirmação para decisões técnicas reversíveis.
- Corre testes, lint e análise estática antes de dar uma tarefa por concluída.

## Documentação

Documenta o que não se lê no código: decisões e o porquê, o que foge à convenção,
armadilhas descobertas à força, acessos que não se adivinham.
Não documentes o que o código já diz — o que cada método faz, a estrutura de pastas,
listas de rotas ou modelos.
Antes de fechar uma tarefa não-trivial, pergunta o que foi preciso descobrir que não
estava escrito em lado nenhum, e escreve só isso.
Mantém o CLAUDE.md do projeto dentro de um ecrã: é relido em todos os turnos de todas
as sessões.