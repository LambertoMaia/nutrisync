# Backend (nutrilho) — complemento ao `PLAN_USUARIO.md`

> **Status (2026-04-19):** ✅ **todas as mudanças aplicadas** no
> repositório `nutrilho/` que mora **ao lado** desta pasta
> (`E:\Faculdade\nutrisync\nutrilho\`) — o backend não é um repo
> externo, é um subworkspace da mesma pasta mãe.
>
> Este arquivo serve agora como **registro do contrato** e referência
> rápida. Se o Flask for re-deployado do zero, a migração de coluna
> roda sozinha no startup (ver §2).

## 1. `proposta_pendente.cozinheiro_id` ✅

`nutrilho/src/app.py`, função `_serialize_solicitacao_cliente`
(~linha 1830). O dict `proposta_pendente` passou a incluir
`cozinheiro_id: pend.cozinheiro_id` antes de `cozinheiro_nome`.

Smoke (19/04/2026 via ngrok):

```
GET /api/cliente/home-pedidos (cookie cliente)
…
"proposta_pendente": {
  "cozinheiro_id": 3,
  "cozinheiro_nome": "John Doe Doe",
  …
}
```

## 2. Coluna `Proposta.data_resposta` ✅

- `nutrilho/src/views/models.py`: `Proposta` ganhou
  `data_resposta = Column(DateTime, nullable=True)` logo depois de
  `data_aceita`.
- `nutrilho/src/app.py`: nova função `_migrate_proposta_extra_columns()`
  aplica `ALTER TABLE proposta ADD COLUMN data_resposta DATETIME NULL`
  no startup (idempotente, ignora `duplicate/1060`). Segue o mesmo
  padrão de `_migrate_solicitacoes_extra_columns`.
- `POST /api/propostas/<id>/responder-cliente`: agora grava
  `prop.data_resposta = datetime.now()` nos **dois** caminhos (aceite e
  recusa), preservando `prop.data_aceita` apenas no aceite.

## 3. `GET /api/cozinheiro/propostas` ✅

Registrado em `app.py` (antes de `/api/propostas/cozinheiro/<int:id>`
para evitar conflito de roteamento).

- **Auth:** sessão cozinheiro obrigatória — senão `401 {error}`.
- **Query:** `status` ∈ `pendente|aceita|recusada|todas` ou `0|1|2`
  (default `todas`). Valor inválido → `400` com mensagem. `limit`
  default 50, clamp em 100. `offset` default 0. `desde` ISO date ou
  datetime — se inválido, `400`.
- **Regras:** filtra `Proposta.cozinheiro_id == session['usuario_id']`.
  Ordena `data_criacao DESC`.
- **Resposta 200:**
  ```json
  {
    "propostas": [ { "id": 16, "solicitacao_id": 21,
      "cliente_nome": "OpusClient", "valor": 25.0, "status": 2,
      "status_texto": "Recusada",
      "data_criacao": "19/04/2026 17:47",
      "data_criacao_iso": "2026-04-19T17:47:55",
      "data_resposta_cliente": "19/04/2026 17:48" } ],
    "total": 1, "limit": 50, "offset": 0
  }
  ```
- **PII:** `cliente_nome` passa por `_primeiro_nome` (mesmo helper de
  `/api/solicitacoes/abertas`).
- **`data_resposta_cliente`:** formatado BR a partir de
  `Proposta.data_resposta`; para propostas antigas sem a coluna
  preenchida (`status_=1` legacy), usa `data_aceita` como fallback.
  Retorna `null` se `status_=0` (pendente).

## 4. Regressão ✅

- `POST /api/propostas/<id>/responder-cliente` preserva contrato
  `{success, aceitar}` — verificado.
- Regras de negócio inalteradas: aceite ainda cria `Pedido(confirmado)`
  com `qtd_marmitas = dias*refeicoes`, recusa ainda seta
  `situacao='recusada_cliente'` e `demo_convite_recusado=1`.

## 5. Smoke verificado (19/04/2026)

Tunnel ngrok ativo, cookies via `curl.exe -c/-b`. Resultados:

| Caso | Esperado | Observado |
|------|----------|-----------|
| `GET` sem sessão | 401 `Não autorizado` | ✅ |
| `GET` com cookie cliente | 401 `Não autorizado` | ✅ |
| `?status=xpto` | 400 mensagem específica | ✅ |
| `?status=recusada` após reject | lista proposta 16 | ✅ |
| `?limit=999` | `limit` saturado em 100 | ✅ `"limit": 100` |
| `?desde=2030-01-01` | `total: 0` | ✅ |
| `?desde=hoje` | 400 | ✅ |
| `data_resposta` após recusa fresca | timestamp correto | ✅ `17:48` |
| `proposta_pendente.cozinheiro_id` em home-pedidos | presente | ✅ `3` |
