# Roteiro E2E — Descoberta de Solicitações (cozinheiro)

> Checklist manual para validar ponta‑a‑ponta o fluxo
> `Solicitacao → Proposta → Pedido` depois das mudanças documentadas
> em `PLAN_COZINHEIRO_SOLICITACOES.md`.
>
> Ambiente alvo: MySQL local + Flask (`nutrilho/src/app.py`) + Expo
> (`nutrisyinc/`) rodando no mesmo host, acessível pelo dispositivo
> via IP LAN ou ngrok (`EXPO_PUBLIC_API_URL`).

## 0. Pré‑requisitos

- MySQL com o schema `prato_ideal` acessível; credenciais em
`nutrilho/src/.env` batem.
- `nutrilho`:
  - `pip install -r requirements.txt` (ou venv já ativo).
  - `python src/app.py` sobe em `http://0.0.0.0:8000` sem erros
  de migração (espere ver os prints de `[migrate solicitacoes …]`
  caso a tabela já exista).
- `nutrisyinc`:
  - `EXPO_PUBLIC_API_URL` apontando para o backend (sem barra
  final).
  - `npx expo start -c` sobe; app abre no dispositivo/emulador.
- Duas contas preparadas (pode ser via app ou via HTML prototype):
  - **Cliente** com senha válida (6–50, cobrindo upper/lower/
  digit/special).
  - **Cozinheiro** com `tipo_entrega` preenchido (selector na
  tela de cadastro).
- **Smoke test HTTP opcional** com `curl`/`httpie` usando cookies
de sessão:
  - `POST /api/login` como cozinheiro → 200.
  - `GET /api/solicitacoes/abertas` → 200 + JSON
  `{ solicitacoes, total, limit, offset }`.

---

## 1. Cliente cria uma `Solicitacao`

1. [ ] Login como cliente → aterrissa em `/home`.
2. [ ] Tocar "Enviar minha receita" → `/(user)/enviar-receita`.
3. [ ] Modo **Foto**:
  - Selecionar um PDF/JPG/PNG com `expo-document-picker`.
  - Preencher **Para quantos dias?** (ex.: 5) e
  **Quantas refeições por dia?** (ex.: 3).
  - Observações adicionais: "Sem lactose, low carb" (ajuda a
  testar o filtro de busca mais tarde).
  - Submeter → toast/alert de sucesso, redireciona para
  `/home`.
4. [ ] Na home do cliente, a nova solicitação aparece com
  `situacao = 'aguardando_cozinheiro'` (badge/label "Aguardando").

**Verificação de DB (opcional):**

```sql
SELECT id, cliente_id, situacao, data_criacao
FROM solicitacoes
ORDER BY id DESC LIMIT 1;
```

Deve trazer a linha recém-criada com `situacao = 'aguardando_cozinheiro'`.

---

## 2. Cozinheiro descobre a solicitação

1. [ ] Logout do cliente (ou usar outro dispositivo/emulador).
2. [ ] Login como cozinheiro → aterrissa em `/(cook)/dashboard`.
3. [ ] **Card "Solicitações"** no stats row mostra `1` (ou +1) e o
  número coincide com o contador do endpoint.
4. [ ] Seção **Oportunidades** exibe a solicitação recém-criada
  como `SolicitacaoCard` compact.
5. [ ] Tocar em **Ver todas (N)** → navega para
  `/(cook)/solicitacoes`.
6. [ ] Header mostra "N disponíveis".
7. [ ] A solicitação aparece na lista com:
  - Nome do cliente no formato "Primeiro S." (sem nome
   completo, sem email/telefone/endereço).
  - Resumo "5 dias · 3 refeições/dia".
  - Chip "Receita anexa" quando houve upload.
  - Badge "Aguardando".
8. [ ] Filtros:
  - Chip **Sem lactose** → a solicitação continua visível.
  - Chip **Hipertrofia** → (se não casar com texto) a
  solicitação some. Desmarcar o chip → ela volta.
  - Buscar manualmente "lactose" → reduz para resultados que
  casam. Limpar busca → volta ao normal.
9. [ ] Pull to refresh atualiza sem erros.

**Verificação HTTP direta (opcional):**

```bash
# Cookies do login na flag -b
curl -b cookies.txt \
  "http://localhost:8000/api/solicitacoes/abertas?q=lactose"
```

Deve retornar `total >= 1` e um item com os campos descritos acima.

---

## 3. Cozinheiro envia proposta

1. [ ] Tocar no card da solicitação → `/(cook)/solicitacao/[id]`.
2. [ ] Detalhe mostra:
  - Grid KV (dias, refeições, porções, calorias).
  - Blocos de Restrições / Observações conforme preenchido.
  - Botão **Abrir receita anexa** abre o PDF/imagem no app
  nativo (PDF viewer do sistema, galeria, navegador). Se a URL
  for relativa (`/api/uploads/...`), ela é prefixada com
  `getApiBaseUrl()` (ver `resolveReceitaUrl`).
3. [ ] Em **Enviar proposta**, digitar um valor (ex.: `9000` →
  vira `R$ 90,00`).
4. [ ] Tocar **Enviar proposta**:
  - Spinner durante o envio.
  - Haptic de sucesso + alerta "Proposta enviada" + redireciona
  para `/(cook)/solicitacoes`.
5. [ ] Voltar ao mesmo detalhe → agora aparece o bloco
  **Sua proposta** em vez do formulário, com o valor e status
   "Aguardando resposta do cliente".

**Verificação de DB (opcional):**

```sql
SELECT id, cozinheiro_id, solicitacao_id, valor, status_
FROM proposta
ORDER BY id DESC LIMIT 1;
```

Deve trazer `status_ = 0`, `cozinheiro_id` do logado e
`solicitacao_id` da passo 1.

---

## 4. Backend — regras de endurecimento

Sem sair do app, testar via `curl`/`httpie` ou repetir no app:

- **Proposta duplicada (409):** mandar o mesmo `POST /api/propostas`
com `{ solicitacao_id, valor }` pelo mesmo cozinheiro. Esperado:
HTTP 409 + corpo `{ error, proposta_id }`.
  - No app, a UI intercepta o 409 via
  `criarPropostaApi.duplicadaPropostaId`, recarrega a
  solicitação e mostra "Sua proposta".
- **Valor inválido (400):** `valor: 0` ou `"abc"`.
- **Sem `solicitacao_id` (400).**
- **Solicitação inexistente (404):** id absurdo (ex.: 99999).
- **Auth negada (401):**
  - Sem login → `GET /api/solicitacoes/abertas` 401.
  - Login como cliente → `GET /api/solicitacoes/abertas` 401.
- **Cliente acessando `GET /api/solicitacoes/<id>` alheia →
403.**

---

## 5. Cliente aceita a proposta

1. [ ] Logout do cozinheiro; login como o cliente do passo 1.
2. [ ] Na home, a `Solicitacao` agora exibe a `proposta_pendente`
  (card com valor, nome do cozinheiro, tipo de entrega).
3. [ ] Tocar **Aceitar** (ou fluxo equivalente na UI) → confirma
  aceitação.
4. [ ] Verificações esperadas:
  - A `Solicitacao` some da home (`situacao = 'convertida'`).
  - Surge um `Pedido` em "Pedidos ativos" com
  `status = 'confirmado'`.
5. [ ] Logout; login novamente como cozinheiro.
6. [ ] `/(cook)/dashboard`:
  - Card "Solicitações" diminuiu em 1 (a que foi aceita sumiu
   da listagem — filtro exclui solicitações com proposta
   aceita).
  - Seção "Novos pedidos" agora lista o novo `Pedido`
  `#N · confirmado`.
7. [ ] Tocar **Aceitar pedido** / **Iniciar preparo** fluxo normal
  de `PedidoCookCard` (não é escopo desta feature, mas regressão
   básica).

**Verificação de DB (opcional):**

```sql
SELECT id, situacao FROM solicitacoes ORDER BY id DESC LIMIT 1;
-- Esperado: convertida

SELECT id, status_ FROM proposta ORDER BY id DESC LIMIT 1;
-- Esperado: status_ = 1

SELECT id, cozinheiro_id, cliente_id, status
FROM pedidos ORDER BY id DESC LIMIT 1;
-- Esperado: status = 'confirmado'
```

---

## 6. Caso de recusa (opcional)

1. [ ] Repetir passos 1–3 com nova solicitação/proposta.
2. [ ] Cliente toca **Recusar** em vez de aceitar.
3. [ ] Verificar:
  - `Solicitacao.situacao = 'recusada_cliente'`.
  - `demo_convite_recusado = 1`.
  - Cozinheiro: a solicitação some de
  `/api/solicitacoes/abertas` (filtro de situação).
4. [ ] Tentar enviar nova proposta do cozinheiro para a mesma
  `solicitacao_id` → backend deve responder **400** com
   `{ error, situacao: 'recusada_cliente' }`.

---

## 7. Regressão geral

- Caminhos do cliente não afetados (home, enviar-receita,
perfil, receitas-enviadas) continuam carregando sem erro.
- Painel do cozinheiro continua exibindo corretamente Novos /
Em preparo / Semana.
- `npx tsc --noEmit` no `nutrisyinc` → sem erros.
- `python -c "import app"` a partir de `nutrilho/src` → sem
erros.

---

## 8. Pontos a reportar depois do E2E

Se algum dos itens abaixo aparecer, abrir issue/follow-up:

- Concorrência (duas propostas aceitas em paralelo — não deve
acontecer por conta da defesa-em-profundidade `status_ == 1`,
mas vale confirmar com dois cozinheiros em sequência rápida).
- Performance da listagem com muitas solicitações (>200) — hoje
paginamos por `offset`, sem cursor.
- UX: casos em que o `receita_link` é imagem muito grande e o
viewer nativo travar.
- PII: confirmar que em nenhum endpoint do cozinheiro aparece
email/telefone/endereço/CEP do cliente.

---

## 9. Decisões a registrar (Seção 8 do plano)

Usar este E2E como insumo para fechar:

- **A vs B** em `POST /api/propostas` — manter opção A (múltiplas
propostas pendentes em paralelo) ou migrar para B (primeira
proposta fecha a descoberta)?
- Nível final de PII exposta ao cozinheiro antes do pedido.
- Se o botão **Dispensar** precisa persistir (tabela nova) ou
permanece só visual.
- Limite anti-spam de propostas por cozinheiro/dia.

---

## 10. Observações da execução (agente Cursor — 2026-04-19)

**Concluído nesta sessão**

- **§7 — `npx tsc --noEmit`** em `nutrisyinc/`: executado com sucesso (exit 0).
- **Revisão estática** do app Expo contra os itens §1–§3, §5 e §7 (rotas, APIs, componentes): ver bullets abaixo.

**Não executado (depende de ambiente humano)**

- **§0**: MySQL + `nutrilho` + `python src/app.py` — o repositório `**nutrilho` não está presente** neste workspace (`e:\Faculdade\nutrisync`); não foi possível rodar migrações nem smoke `curl`.
- **§1–§6**: fluxos completos no dispositivo/emulador (login cliente/cozinheiro, upload, proposta, aceite/recusa, verificações de DB) — **não rodados** aqui.
- **§7 — `python -c "import app"`** em `nutrilho/src` — omitido (pasta ausente).

**Alinhamento código ↔ roteiro (amostra)**

- Cliente: `home` usa CTA **Enviar minha receita** → `router.push('/enviar-receita')` (`app/(user)/enviar-receita.tsx` com `expo-document-picker`, dias/refeições, campos de observação/restrções).
- Cozinheiro: `dashboard` — card **Solicitações** com `solicitacoesTotal`, seção **Oportunidades** com `SolicitacaoCard` `compact`, link **Ver todas (N)** → `/(cook)/solicitacoes`; lista com busca, chips (incl. Sem lactose / Hipertrofia), pull-to-refresh.
- Detalhe `/(cook)/solicitacao/[id]`: `resolveReceitaUrl` + `Linking.openURL`; proposta com máscara BRL, `criarPropostaApi`, tratamento de **409** via `duplicadaPropostaId` + `load()`.
- Cliente pós-proposta: `home` modal com **Aceitar** / **Recusar** (`abrirModalProposta` / fluxo `aceitar`).

**Recomendações para fechar o E2E de verdade**

1. Clonar/abrir `[nutrilho](https://github.com/selenamenezes/nutrilho)` ao lado de `nutrisyinc`, subir API em `:8000`, apontar `EXPO_PUBLIC_API_URL`, e percorrer §1–§6 no app.
2. Rodar os `curl`/SQL opcionais do documento para validar endurecimento (§4) e estados de DB.

---

## 11. Sessão seguinte (agente Cursor — 2026-04-19, parte 2)

Ambiente dessa execução: backend `nutrilho` rodando em `localhost:8000`
e exposto via `https://10de-168-196-85-252.ngrok-free.app`; `nutrilho/`
presente em `E:\Faculdade\nutrisync\nutrilho` (lado a lado com
`nutrisyinc`), então consegui rodar mais coisa sem precisar de sessão
logada.

**Concluído**

- **§7 — `python -c "import app"`** em `E:\Faculdade\nutrisync\nutrilho\src`: exit 0.
- **§7 — `npx tsc --noEmit`** em `nutrisyinc/`: exit 0 (mantido após o fix abaixo).
- **§4 — auth negada (401)** confirmado via ngrok sem sessão:
  - `GET /api/solicitacoes/abertas` → **401** `{"error":"Não autorizado"}`.
  - `GET /api/solicitacoes/99999` → **401** (aqui bate antes da checagem de existência, expected).
  - `POST /api/propostas` `{}` → **401**.
  - `POST /api/login` com credenciais inválidas → **401** `{"error":"Email ou senha incorretos"}`.
- **Marketplace — smoke tests em `GET /api/cozinheiros`**:
  - sem filtro → **200** com 3 cozinheiros de dev (ids 1/2/3).
  - `?especialidade=Low%20carb` → **200** com 2 itens (ids 2 e 3, ambos com `especialidade: "Low carb"`).
  - `GET /api/cozinheiros/2` → **200** com `marmitas: []`.
  - `GET /api/especialidades` → **200** com 2 entries.

**Bug encontrado e corrigido — Marketplace ↔ backend real**

Comparando as respostas acima com `lib/api.ts` veio à tona um
desalinhamento sério no Marketplace:

- Backend devolve `**avaliacao`, `sobre`, `localizacao` (=CEP), `rua`,
`foto`, `telefone`, `tipo_entrega`**.
- App esperava `**nota`, `sobre_voce`, `bairro`, `cidade`,
`preco_medio`**.
- Filtro server-side é `**?especialidade=<nome>**`, não
`?especialidade_id=<n>`. Não existe `q`.

Resultado prático antes do fix: estrela, bio e localização apareciam
sempre como `—` e o clique em qualquer chip não filtrava nada
(backend ignorava `especialidade_id`).

Fix aplicado nesta sessão (sem precisar rebuild do backend):

- `lib/api.ts`:
  - `CozinheiroListJson` reescrito para carregar os campos reais
  como primários e manter os antigos como opcionais/legados.
  - `fetchCozinheirosApi({ especialidade? })` envia
  `?especialidade=<nome>`. `q` foi removido (não existe server-side).
  - Novo `CozinheiroDetalhesJson` + `fetchCozinheiroDetalhesApi(id)`
  para `/api/cozinheiros/<id>` (inclui `marmitas`).
- `app/(user)/marketplace.tsx`:
  - `formatLocation` usa **rua → bairro/cidade → CEP** (com
  formatação).
  - `ratingValue`/`ratingLabel`/`aboutText` leem
  `avaliacao`/`nota` e `sobre`/`sobre_voce`.
  - Busca textual virou **client-side** sobre nome/especialidade/
  endereço/CEP (haystack) — backend não tem `q`.
  - Chip filtra server-side por `especialidade` (nome). Lógica de
  `filterId`/`filterFallback` dupla foi colapsada em um único
  `filterName`.
  - Stats do modal: "por marmita" (inexistente no contrato real) foi
  substituído por **Entrega** (`delivery`/`retirada`/`ambos`) e
  **Telefone**; nota continua aparecendo.

Verificação pós-fix: `npx tsc --noEmit` exit 0, `ReadLints` limpo.

**Parte 3 da sessão — cozinheiro logado via ngrok**

Usuário forneceu credenciais; login como cozinheiro
`john@butjohn.com` (id=3, "John Doe Doe") funcionou após descobrir
que `/api/login` exige `tipo: "cozinheiro"` explícito (default é
`cliente`).

Resultados com sessão cozinheiro ativa (cookies `curl -b`):


| § / Caso                                         | Esperado                               | Resposta real                                                                                                          |                             |
| ------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| §2 `GET /api/solicitacoes/abertas`               | 200 + shape                            | 200, `total=2`, shape `{solicitacoes, total, limit=50, offset=0}`                                                      | ✅                           |
| §2 PII reduzida                                  | primeiro nome + inicial                | `"Lambs"`, `"John D."` — sem email/telefone/CEP/endereço                                                               | ✅                           |
| §3 `POST /api/propostas` happy path              | 200 + `proposta`                       | 200, proposta id=11, `valor=9000.0`, `status=0`, `solicitacao_id=16`                                                   | ✅                           |
| §3 situação pós-proposta (opção A)               | `aguardando_cozinheiro`                | continua `aguardando_cozinheiro`, `total_propostas=1`, `ja_tem_proposta_minha=true`, `minha_proposta={id:11,status:0}` | ✅                           |
| §3 filtro `somente_sem_proposta_minha` default   | esconde id=16                          | `total=1`, só id=15                                                                                                    | ✅                           |
| §4 `POST /api/propostas` `{}`                    | 400                                    | 400 `"solicitacao_id é obrigatório"`                                                                                   | ✅                           |
| §4 `POST /api/propostas` sem `solicitacao_id`    | 400                                    | 400 `"solicitacao_id é obrigatório"`                                                                                   | ✅                           |
| §4 `POST /api/propostas` `valor=0`               | 400                                    | 400 `"valor deve ser maior que zero"`                                                                                  | ✅                           |
| §4 `POST /api/propostas` `valor="abc"`           | 400                                    | 400 `"valor inválido"`                                                                                                 | ✅                           |
| §4 `POST /api/propostas` `solicitacao_id=999999` | 404                                    | 404 `"Solicitação não encontrada"`                                                                                     | ✅                           |
| §4 `POST /api/propostas` duplicada               | 409 + `proposta_id`                    | 409 `{error, proposta_id:11}`                                                                                          | ✅                           |
| §4 `GET /api/solicitacoes/99999` (cook)          | 404                                    | 404 `"Solicitação não encontrada"`                                                                                     | ✅                           |
| §4 `GET /api/solicitacoes/abertas` sem sessão    | 401                                    | 401 `"Não autorizado"`                                                                                                 | ✅                           |
| §4 `POST /api/login` com `tipo` ausente          | 401 (cai no ramo `cliente` e não acha) | 401 `"Email ou senha incorretos"`                                                                                      | ✅ (consequência do default) |
| `GET /api/verificar-login` autenticado           | 200 com `logado:true`                  | 200 `{logado:true, usuario_id:3, usuario_tipo:'cozinheiro'}`                                                           | ✅                           |


**Efeito colateral no DB** — proposta `id=11` por `valor=9000.0` ficou
pendurada em `solicitacao_id=16` (cliente `Lambs`, id=4). Valor foi
escolhido só pra teste, **não reflete** o que o app envia na prática
(o app usa máscara BRL e mandaria `valor=90` pra "R$ 90,00"). Deixar
pendurada é útil pra §5 (cliente aceita/rejeita). Se atrapalhar, o
operador pode limpar via SQL (`UPDATE proposta SET status_=-1 WHERE id=11;` ou `DELETE FROM proposta WHERE id=11;`).

**Parte 4 da sessão — cliente logado (OpusClient, id=5)**

Credencial correta: `opus@opus.com` / `@Opus11`. Login 200 com
`usuario_tipo: "cliente"`. Com isso foi possível fechar todo o §4/§5/§6
via HTTP (loop inteiro sem aparelho).


| § / Caso                                                                | Esperado                                                                    | Resposta real                                                                                                                                                                                                 |     |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| §4 cliente → `GET /api/solicitacoes/abertas`                            | 401                                                                         | 401 `"Não autorizado"`                                                                                                                                                                                        | ✅   |
| §4 cliente → `GET /api/solicitacoes/16` (alheia, cliente=Lambs id=4)    | 403                                                                         | 403 `"Não autorizado"`                                                                                                                                                                                        | ✅   |
| §1 cliente `POST /api/solicitacoes` (body JSON, sem arquivo)            | 200 + novo id                                                               | 200, `solicitacao_id=17` (sol 17) e 200, `solicitacao_id=18` (sol 18), ambas em `aguardando_cozinheiro`                                                                                                       | ✅   |
| §3 cook `POST /api/propostas` em sol 17 (`valor:120`)                   | 200                                                                         | 200, proposta id=12                                                                                                                                                                                           | ✅   |
| §3 cook `POST /api/propostas` em sol 18 (`valor:80`)                    | 200                                                                         | 200, proposta id=13                                                                                                                                                                                           | ✅   |
| §5 cliente `POST /api/propostas/12/responder-cliente` `{aceitar:true}`  | 200                                                                         | 200 `{aceitar:true, success:true}`                                                                                                                                                                            | ✅   |
| §5 efeito colateral: `Pedido` criado                                    | pedido `confirmado` + `qtd = dias*refeicoes` + `val_total = proposta.valor` | `GET /api/pedidos/cozinheiro/3` → pedido **id=8**, `status="confirmado"`, `qtd_marmitas=21` (7×3), `valor_total=120`, `proposta.status=1`, `cliente_nome="OpusClient"` (nome completo liberado pós-conversão) | ✅   |
| §5 cook sol 17 some de `/api/solicitacoes/abertas`                      | some                                                                        | `total=1`, aparece só sol 15 (sol 16 segue escondida pelo filtro de proposta-minha-pendente, sol 17 sumiu por `situacao='convertida'`)                                                                        | ✅   |
| §6 cliente `POST /api/propostas/13/responder-cliente` `{aceitar:false}` | 200                                                                         | 200 `{aceitar:false, success:true}`                                                                                                                                                                           | ✅   |
| §6 cook tenta **nova** proposta em sol 18 recusada                      | 400 + `situacao: 'recusada_cliente'`                                        | 400 `{error:"Esta solicitação não está mais disponível.", situacao:"recusada_cliente"}`                                                                                                                       | ✅   |
| cliente tenta responder proposta 13 de novo (estado inválido)           | 400 "Proposta já respondida"                                                | 400 `{error:"Proposta já respondida"}`                                                                                                                                                                        | ✅   |


**Cobertura final do §4 (endurecimento) — tudo verde via HTTP**

Todos os cases do §4 têm resposta confirmada contra o ngrok, sem
necessidade de aparelho:

- 401 sem sessão (qualquer endpoint de cozinheiro).
- 401 cliente em endpoint de cozinheiro.
- 403 cliente em solicitação alheia.
- 400 body vazio / sem `solicitacao_id` / `valor=0` / `valor="abc"`.
- 404 solicitação inexistente (tanto em `POST /api/propostas`
quanto em `GET /api/solicitacoes/<id>`).
- 409 proposta duplicada (body `{ error, proposta_id }`).
- 400 nova proposta em solicitação recusada (com `situacao` no body).
- 400 responder proposta já respondida.

**Estado do DB após a sessão**

- `solicitacao.id=16` (cliente Lambs, id=4) — ainda `aguardando_cozinheiro`,
com `proposta.id=11` pendurada (valor=9000) do cook John. Não foi
aceita nem recusada (Opus não é o dono). Fica como **seed** para
um futuro E2E pelo app com o cliente Lambs, ou para limpar via SQL:
`UPDATE proposta SET status_=-1 WHERE id=11; UPDATE solicitacoes SET situacao='recusada_cliente' WHERE id=16;`.
- `solicitacao.id=17` → `situacao='convertida'`, `proposta.id=12`
`status_=1`, `pedido.id=8` `status='confirmado'`.
- `solicitacao.id=18` → `situacao='recusada_cliente'`,
`proposta.id=13` `status_=2`, `demo_convite_recusado=1`.

**Ainda pendente (só aparelho/UI)**

- §1 via app real com upload de PDF/JPG/PNG (fluxo multipart não
testado por HTTP aqui — o backend aceita tanto JSON quanto
`multipart/form-data`, e os dois testes acima foram JSON puro).
- Visual do marketplace no simulador/dispositivo com o fix do
contrato real aplicado — confirmar os 3 cozinheiros com
`avaliacao=0`, `sobre` populado, CEP formatado, e o filtro
"Low carb" escondendo o "Demonstração".
- Visual/haptics/pull-to-refresh do painel do cozinheiro e da tela
`/(cook)/solicitacoes` com dados reais.
- Regressão do detalhe `/(cook)/solicitacao/16` (proposta já
enviada — bloco "Sua proposta" em vez do formulário) e
`/(cook)/solicitacao/18` (situação recusada — UI deve indicar que
não é mais possível propor).

