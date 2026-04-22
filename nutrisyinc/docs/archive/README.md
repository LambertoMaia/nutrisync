# Arquivo (docs/archive)

Planos e relatórios de testes **já concluídos** ou **obsoletos** ficam
aqui para servir de referência histórica. Não edite estes arquivos; se
precisar retomar algum trabalho, crie um plano novo na raiz (ou abra um
item em `changelog.md`).

## Arquivos arquivados em 2026-04-19

- **`GEMINI.md`** — mandatos de um assistente externo (Gemini CLI);
  substituídos pelas regras em `.cursor/rules/nutrisyinc.mdc` e pelo
  `GUIDELINES.md` vivo.
- **`IMPLEMENTATION_PLAN.md`** — roteiro original para marketplace,
  histórico e perfil do cozinheiro; todas as 8 etapas foram marcadas
  como concluídas.
- **`E2E_COZINHEIRO_SOLICITACOES.md`** — plano e resultado do E2E do
  fluxo cozinheiro↔solicitação (HTTP via ngrok + visual). Passos HTTP
  e visuais concluídos; restou apenas o upload `multipart/form-data`
  real, que hoje está coberto pela UI.
- **`E2E_PROPOSTA_CLIENTE.md`** — plano e resultado do E2E do fluxo
  cliente↔proposta + inbox de recusas do cozinheiro (HTTP via ngrok +
  visual). Concluídos em 2026-04-19.
- **`NUTRILHO_BACKEND_PLAN_USUARIO.md`** — registro histórico dos
  ajustes aplicados no backend (`nutrilho/`) para expor `cozinheiro_id`,
  criar `Proposta.data_resposta` e o endpoint
  `GET /api/cozinheiro/propostas`. Mantido apenas como referência dos
  contratos.

## O que segue vivo na raiz

- **`PLAN_COZINHEIRO_SOLICITACOES.md`** — plano do lado **cozinheiro**.
- **`PLAN_USUARIO.md`** — plano do lado **cliente**.
- **`changelog.md`** — log contínuo de mudanças.
- **`GUIDELINES.md`** — guia de padrões/arquitetura vivo.
- **`README.md`** — entrada do projeto.
