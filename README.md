# Studio Moriá – Estética Avançada

Sistema web para gestão de estúdio de estética: site institucional, agendamentos, caixa, clientes, marketing, estoque e configurações. Versão administrativa e área do cliente integradas.

---

## Tecnologias

- **React 19** + **TypeScript**
- **Vite** – build e dev server
- **Firebase** – Firestore (dados) e Auth (anônimo para regras)
- **Tailwind CSS** – estilos (classes utilitárias no JSX)
- **Vite PWA** – suporte a instalação e atualização automática
- **Recharts** – gráficos (quando aplicável)

---

## Pré-requisitos

- **Node.js** 18+ (recomendado LTS)
- Conta **Firebase** (Firestore + Authentication anônimo habilitado)
- (Opcional) **Vercel** para deploy; login por Gmail na conta desejada (ex.: Serginhoz12)

---

## Instalação e execução

1. **Clonar e instalar dependências**
   ```bash
   cd StudioMoria
   npm install
   ```

2. **Firebase**  
   O projeto já usa um projeto Firebase (`studiomoria-ee74b`). Para usar o seu:
   - Crie um projeto em [Firebase Console](https://console.firebase.google.com).
   - Ative **Authentication** → método **Anônimo**.
   - Crie um **Firestore** e ajuste as regras para exigir `request.auth != null` (e leitura/escrita conforme suas coleções).
   - Substitua o objeto `firebaseConfig` em `firebase.ts` pelas credenciais do seu projeto.

3. **Variáveis de ambiente (opcional)**  
   Se usar Gemini (ex.: funcionalidades com IA), crie `.env.local` com:
   ```env
   GEMINI_API_KEY=sua_chave
   ```

4. **Rodar em desenvolvimento**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000`.

5. **Build para produção**
   ```bash
   npm run build
   ```
   Saída em `dist/`.

6. **Preview do build**
   ```bash
   npm run preview
   ```

---

## Deploy (Vercel)

1. Faça push do repositório para o GitHub (ou conecte outro Git).
2. Acesse [vercel.com](https://vercel.com) e entre com o Gmail desejado (ex.: Serginhoz12).
3. **Import Project** → selecione o repositório do Studio Moriá.
4. Framework: **Vite**; comando de build: `npm run build`; pasta de output: `dist`.
5. (Opcional) Configure `GEMINI_API_KEY` em **Settings → Environment Variables**.
6. Deploy. O site ficará em um domínio `*.vercel.app`; você pode configurar um domínio próprio depois.

---

## Estrutura do projeto

```
StudioMoria/
├── App.tsx                 # Estado global, rotas de view, listeners Firestore, auth
├── firebase.ts              # Config e export de db + auth
├── types.ts                 # Interfaces (Customer, Booking, Transaction, etc.)
├── constants.ts             # Serviços iniciais, configurações padrão, versão
├── index.tsx / index.html   # Entrada da aplicação
├── vite.config.ts           # Vite + PWA
├── components/
│   ├── Navbar.tsx
│   ├── CustomerHome.tsx     # Página inicial do site
│   ├── CustomerLoginView.tsx
│   ├── CustomerRegister.tsx
│   ├── CustomerProfile.tsx
│   ├── CustomerDashboard.tsx
│   ├── AdminLogin.tsx       # Senha numérica (acesso restrito)
│   ├── AdminDashboard.tsx
│   ├── AdminCalendar.tsx    # Agenda
│   ├── AdminFinance.tsx     # CAIXA: lançamentos, análise de rentabilidade, período
│   ├── AdminConfirmations.tsx # Pedidos do site + lista de espera; aprovar com preço
│   ├── AdminClients.tsx
│   ├── AdminSettingsView.tsx
│   ├── AdminMarketing.tsx
│   ├── AdminInventory.tsx
│   └── ...
└── README.md
```

---

## Funcionalidades principais

- **Site (cliente)**  
  Início, serviços, promoções, agendamento, cadastro e login por WhatsApp/CPF e senha, área da cliente (agenda, histórico, perfil).

- **Admin (senha em `AdminLogin.tsx`)**  
  Dashboard, **Pedidos** (aprovar/recusar com definição de preço), **Agenda**, **Caixa**, **Clientes**, **Marketing**, **Estoque**, **Config** (horários, equipe, serviços, dados do estúdio).

- **Caixa**  
  Lançamentos de receitas e despesas, categorias (incl. custos fixos: água, luz, internet, pró-labore, MEI, aluguel). **Análise de rentabilidade** usa todos os lançamentos de custos fixos do **período selecionado** (confirmados e pendentes). Filtro por **período** (data início e fim) para totais, análise e tabela.

- **Autenticação Firebase**  
  Login anônimo é feito ao carregar a app; os listeners do Firestore só são ativados depois que o auth está pronto, evitando erros de permissão no primeiro carregamento.

---

## Scripts

| Comando        | Descrição              |
|----------------|------------------------|
| `npm run dev`  | Servidor de desenvolvimento |
| `npm run build`| Build de produção      |
| `npm run preview` | Servir o build local |
| `npm run lint` | Verificação TypeScript (`tsc --noEmit`) |

---

## Versão

Consulte `constants.ts` para `APP_VERSION` e data de atualização.
