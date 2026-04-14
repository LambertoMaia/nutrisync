# Plano de implementação: Nutrilho (Expo / React Native)

Plano vivo para migrar o protótipo web (`web-prototype/`) para o app **Nutrilho** e evoluir até integrações reais com backend. Os HTML do protótipo ficam só em `web-prototype/`.

## Restrições do projeto

1. **Dados via API:** Em produção, carregar e persistir dados com **HTTP** (enviar/receber). Trocar mocks por clientes reais conforme os endpoints existirem. Não commitar segredos, chaves de API nem PII real em fixtures.
2. **Navegação de protótipo:** Controles flutuantes / menu demo do HTML **não** entram no app; se precisar de menu dev, usar `__DEV__` e remover antes do release.
3. **Sem vazamento de debug:** Evitar `console.log` em fluxos de produção, credenciais placeholder e copy de teste visível ao usuário em builds de release.

---

## Resumo do que já está implementado (UI e cliente)

| Área | Detalhes |
|------|----------|
| **Tema e layout** | `constants/theme.ts`, `TopNav`, `BottomNav`, `ScreenScaffold`, `NavBackButton`, botões/cards/texto alinhados ao protótipo |
| **Rotas** | Splash → tabs; `(auth)` login/cadastro; `(user)` receita, marketplace, cardápios, pedido; `(cook)` dashboard; ver Phase 2 |
| **Auth (mock)** | `AuthProvider` / `useAuth()` — sessão em memória; `signIn` / `signOut`; redirecionos por papel |
| **Login** | Validação em `lib/validation.ts`; máscara de telefone; toggle de senha; **Retornar** na top bar; logo alinhado no `TopNav` |
| **Cadastro** | Cliente: objetivos multi-select; CEP com máscara + **ViaCEP** + modal de endereço (campos + número obrigatório). Cozinheiro: CEP/ViaCEP idem; especialidades; **formas de entrega** (Motoboy/Uber/Retirada) com ícones; bio; **sem** campo de preço por marmita. **Retornar** na top bar; link **Já tenho uma conta** abaixo do subtítulo |
| **Integração externa atual** | ViaCEP (`lib/viacep.ts`) para endereço; máscaras em `lib/cep-mask.ts`, `lib/phone-mask.ts` |
| **Enviar receita** | `expo-document-picker`: JPG/PNG/PDF até 10 MB; um arquivo por vez; remover para trocar; demo sem upload real; CTA **Publicar minha receita** → marketplace |
| **Dados mock** | `data/mocks/cooks.ts`, `pedidos.ts`; `lib/api.ts` com `fetchCooks` / `fetchPedidos` (delay + mock) |

---

## Fase 1: Fundação e theming — [x]

- [x] Tema a partir do CSS do protótipo → `constants/theme.ts`
- [x] Layouts compartilhados em `@/components/layout/`
- [x] UI base: `Button`, cards, texto temático, `LabeledInput`, `SelectField`

## Fase 2: Navegação (Expo Router) — [x]

Rotas principais (todas com headers nativos desligados onde aplicável):

- `app/index.tsx` — splash → `/(tabs)`
- `(tabs)/index.tsx` — landing; CTA cadastro / fluxos do app
- `(tabs)/explore`, `orders`, `profile` — placeholders / atalhos
- `(auth)/login`, `(auth)/register`
- `(user)/order-recipe`, `cardapios`, `marketplace`, `confirm-order`, `order-status`
- `(cook)/dashboard`

## Fase 3: Estado e lógica local — [x]

- [x] Contexto de autenticação mock (`contexts/auth-context.tsx`)
- [x] `constants/routes.ts` + navegação com `router.push` / `replace`
- [x] Camada de dados **mock** em `lib/api.ts` (substituir por HTTP na Fase 6)

## Fase 4: Telas (migração) — em grande parte [x]

- [x] Splash, landing, login, cadastro (fluxos cliente/cozinheiro descritos acima)
- [x] Cardápios, enviar receita (arquivo + formulário), marketplace **com lista mock**
- [ ] **Marketplace:** busca/filtros avançados alinhados ao HTML (lista mock já existe)
- [ ] **Fluxo de pedido:** `confirm-order`, `order-status` — completar UX e dados
- [ ] **Painel cozinheiro:** enriquecer `dashboard` além do placeholder

## Fase 5: Polimento — [ ]

- [ ] Consistência visual iOS/Android em telas ainda simples
- [x] Logo SVG no app (`LogoMark`, `assets/images/logo.svg`); splash com marcação Nutrilho
- [x] Lint: `npx expo lint` no fluxo de desenvolvimento
- [ ] Testes manuais em dispositivos reais antes de release

---

## Fase 6: Integração com API (enviar e receber dados)

Objetivo: substituir mocks e `signIn` em memória por **contratos HTTP reais**, com tipagem, erros tratados e auth.

### 6.1 Configuração e infraestrutura

- [ ] **URL base:** variável de ambiente (ex.: `EXPO_PUBLIC_API_URL`) lida via `expo-constants` ou `process.env` no Expo; documentar no README (sem commitar `.env` com segredos).
- [ ] **Cliente HTTP:** módulo único (ex. `lib/http.ts` ou `lib/api/client.ts`) que:
  - define `baseURL`, `Content-Type: application/json`;
  - anexa **Authorization: Bearer &lt;token&gt;** quando existir sessão;
  - trata erros HTTP (4xx/5xx) e corpo de erro padronizado do backend;
  - opcional: timeout e retry só onde fizer sentido.
- [ ] **Armazenamento de token:** `expo-secure-store` (ou equivalente) para refresh/access token; nunca só em `AsyncStorage` para segredo em produção.
- [ ] **Auth context:** evoluir `AuthProvider` para:
  - `login` / `register` / `logout` chamando API;
  - persistir sessão (token + user) e hidratar no boot;
  - expor `isLoading` / erro de auth onde necessário.

### 6.2 Contratos e tipos

- [ ] Alinhar `types/models.ts` (e novos DTOs) com o **OpenAPI/Swagger** ou documentação do backend.
- [ ] Registrar por domínio (pasta sugerida `lib/api/` ou `services/`):
  - `auth.ts` — login, registro, refresh, recuperação de senha
  - `users.ts` — perfil cliente/cozinheiro
  - `recipes.ts` — envio de receita (metadata + **multipart** para arquivo)
  - `cooks.ts` — listagem/filtro de cozinheiros
  - `orders.ts` — criar pedido, listar, status

### 6.3 Mapeamento funcional (telas → endpoints)

| Tela / fluxo | Comportamento hoje | Integração desejada |
|--------------|--------------------|----------------------|
| **Login / Cadastro** | `signIn` mock | `POST /auth/login`, `POST /auth/register` (payloads com e-mail, senha, papel, campos de endereço/CEP, preferências) |
| **Perfil** | Placeholder | `GET/PATCH /users/me` |
| **Enviar receita** | Arquivo só local (demo) | `POST` multipart: arquivo + campos do formulário (dias, porções, observações) |
| **Marketplace / pedidos** | `fetchCooks` / `fetchPedidos` mock | `GET /cooks`, `GET /orders`, etc. conforme API |
| **ViaCEP** | Já é API pública | Manter cliente atual; opcionalmente backend proxy se necessário (CORS/privacidade) |

### 6.4 Upload de arquivos

- [ ] Endpoint de upload (presigned S3, ou multipart direto no servidor) definido com backend.
- [ ] Trocar o fluxo “demo” em `order-recipe.tsx` por upload real + barra de progresso + tratamento de falha.
- [ ] Manter validação client-side (tipo/tamanho) + validação no servidor.

### 6.5 Qualidade e segurança

- [ ] Não logar tokens nem PII em produção.
- [ ] Tratar offline / rede indisponível com mensagens claras.
- [ ] Opcional: testes de contrato (Pact) ou testes E2E críticos após API estável.

---

## Diretrizes de implementação

- **Tradução do protótipo:** usar o `.html` correspondente em `web-prototype/` e `scripts.js` só como referência de fluxo; o app é fonte da verdade para RN.
- **Estilo:** mapear classes CSS para tokens em `constants/theme.ts`.
- **Componentes:** funcionais + hooks; TypeScript estrito em modelos compartilhados com a API.
- **Commits:** pequenos e focados; ao integrar API, um PR por domínio (auth, pedidos, receitas) facilita revisão.

---

## Legenda de fases

| Fase | Foco |
|------|------|
| 1–3 | Base concluída |
| 4 | Telas e fluxos — maior parte OK; marketplace/pedido/dashboard a aprofundar |
| 5 | Polimento e QA |
| 6 | **API real** — substituição sistemática dos mocks |
