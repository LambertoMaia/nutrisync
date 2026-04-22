# Roteiro E2E — Proposta na home do cliente + recusa (cozinheiro)

> Checklist manual alinhado a **`PLAN_USUARIO.md`**. O backend
> **`nutrilho/`** já recebeu as mudanças (ver
> **`NUTRILHO_BACKEND_PLAN_USUARIO.md`**) — confirmadas por smoke HTTP
> em 2026-04-19. Falta apenas a regressão visual no app com
> `EXPO_PUBLIC_API_URL` apontando para a API.

## 0. Pré-requisitos

- Backend `nutrilho/` rodando (auto-aplica migração
  `Proposta.data_resposta` no startup).
- Contas **cliente** e **cozinheiro** válidas; cozinheiro com
  `tipo_entrega` preenchido.
- Status do backend já verificado em 2026-04-19 via `curl` contra
  ngrok — ver §6 abaixo.

---

## 1. Happy path (aceite)

1. [ ] Cliente: criar **Solicitacao** (ex.: enviar receita).
2. [ ] Cozinheiro: enviar **proposta** para essa solicitação.
3. [ ] Cliente — **home**, *Pedidos em andamento*:
   - [ ] Card com pill **"Proposta recebida"** (verde).
   - [ ] Subtítulo **Proposta de &lt;nome&gt; — R$ …** (sem link "Ver detalhes").
   - [ ] Toque em qualquer área do card (exceto ✕) abre o modal com **haptic** mais forte.
4. [ ] Modal:
   - [ ] Bloco do cozinheiro com avatar (ou 👨‍🍳), nome, nota, especialidade/prato, bio (até 3 linhas), linha tipo entrega + localização (se `GET /api/cozinheiros/<id>` OK).
   - [ ] Valor e opções de entrega abaixo; **Aceitar** cria **Pedido** e fecha o modal.
5. [ ] Após aceite: solicitação some da lista ou atualiza; pedido **confirmado** aparece na home.

---

## 2. Recusa + inbox cozinheiro

1. [ ] Repetir até o cozinheiro enviar proposta; no modal cliente tocar **Recusar**.
2. [ ] Cliente: card mostra *"Você recusou a proposta. Esta solicitação foi encerrada."*
3. [ ] HTTP: `GET /api/cozinheiro/propostas?status=recusada` (sessão cozinheiro) → lista contém a proposta.
4. [ ] Cozinheiro — **dashboard**:
   - [ ] Faixa âmbar **"N proposta(s) recusada(s) pelo cliente"** com **Ver**.
   - [ ] Sheet lista cliente, valor, data; toque marca como lida e navega para **`/(cook)/solicitacao/[id]`** (detalhe com "Recusada pelo cliente").
   - [ ] **Marcar todas como lidas** zera o banner até nova recusa.
5. [ ] `AsyncStorage` chave `cook:propostas:recusadas:seen` persiste IDs vistos (apenas neste dispositivo).

---

## 3. Regressão HTTP (nutrilho)

- [x] `GET /api/cozinheiro/propostas` sem cookie → **401** ✅ (19/04).
- [x] Mesma rota com sessão **cliente** → **401** ✅.
- [x] `limit=999` → resposta com `limit: 100` ✅.
- [x] `?status=xpto` → **400** ✅.
- [x] `?desde=hoje` → **400** ✅; `?desde=2030-01-01` → `total: 0` ✅.
- [x] `?status=recusada` lista recusa fresca (proposta 16) ✅.
- [x] `data_resposta_cliente` populado após recusa (timestamp correto) ✅.
- [x] `GET /api/cliente/home-pedidos` inclui `cozinheiro_id` dentro de `proposta_pendente` ✅ (`cozinheiro_id: 3`).

---

## 4. Degradação

- [ ] Backend antigo **sem** `cozinheiro_id`: modal e aceitar/recusar continuam funcionando; bloco enriquecido pode ficar só com dados da home. (Cenário teórico — em produção o backend já está atualizado.)

---

## 5. TypeScript

- [x] `npx tsc --noEmit` em `nutrisyinc` → 0 erros ✅ (19/04/2026).

---

## 6. Smoke HTTP executado em 2026-04-19

Setup: tunnel ngrok `https://10de-168-196-85-252.ngrok-free.app`,
cookies cook (`john@butjohn.com`, id 3) e cliente (`opus@opus.com`,
id 5). Bateria via `curl.exe -c/-b`, payloads gravados em arquivo
(evita escape do PowerShell).

Sequência feita:

1. `POST /api/solicitacoes` (cliente) → `solicitacao_id=21`.
2. `POST /api/propostas {solicitacao_id:21, valor:25}` (cook) → `id=16`.
3. `POST /api/propostas/16/responder-cliente {aceitar:false}` → 200.
4. `GET /api/cozinheiro/propostas?status=recusada` → lista `id=16`
   com `data_resposta_cliente: "19/04/2026 17:48"`.
5. Nova solicitação 22 + proposta para confirmar
   `proposta_pendente.cozinheiro_id` no `home-pedidos`.

Tudo passou. O único item que sobrou é a **regressão visual no
emulador/dispositivo** (§1, §2 itens com "card/modal/sheet/banner") —
precisa de app rodando.
