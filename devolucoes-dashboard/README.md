# DevML — Dashboard de Gestão de Devoluções

Dashboard fullstack para monitoramento e gestão de devoluções via Google Sheets API, com BI em tempo real.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Estilização | Tailwind CSS |
| Gráficos | Recharts |
| Estado/Cache | TanStack Query v5 |
| Formulários | React Hook Form + Zod |
| API | Google Sheets API v4 |
| Auth | Service Account (googleapis) |
| Toasts | Sonner |

---

## Pré-requisitos

- Node.js 18+
- Conta Google com acesso ao Google Sheets
- Planilha `DEV_ML.xlsx` importada no Google Sheets

---

## Setup Google Sheets API

### 1. Criar um Projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione um existente
3. Em **APIs & Services > Library**, ative a **Google Sheets API**

### 2. Criar Service Account

1. Vá em **IAM & Admin > Service Accounts**
2. Clique em **Create Service Account**
3. Dê um nome (ex: `devml-sheets-sa`)
4. Em **Keys**, clique em **Add Key > Create new key > JSON**
5. Salve o arquivo `.json` gerado

### 3. Compartilhar a Planilha

1. Abra sua planilha no Google Sheets
2. Clique em **Compartilhar**
3. Adicione o email do Service Account (formato: `nome@projeto.iam.gserviceaccount.com`)
4. Dê permissão de **Editor**

### 4. Estrutura Esperada da Planilha

A **primeira linha deve ser o cabeçalho**. Colunas na ordem:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| data de chegada da DV | nome completo do cliente | número da nota fiscal | código da peça e quantidade | data de devolução feita | número da nf de devolução | Motivo da devoluçao ou mediaçao |

---

## Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
```

### Preencher `.env.local`

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=seu-sa@projeto.iam.gserviceaccount.com

# Cole a chave privada do JSON do Service Account
# Substitua quebras de linha por \n
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE\n-----END PRIVATE KEY-----\n"

# ID da planilha (da URL do Google Sheets)
GOOGLE_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms

# Nome exato da aba
GOOGLE_SHEET_NAME=Sheet1
```

> **Dica:** Para extrair a `private_key` do JSON do Service Account:
> ```bash
> cat service-account.json | python3 -c "import sys,json; print(json.load(sys.stdin)['private_key'])"
> ```

```bash
# 3. Rodar em desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## Arquitetura

```
src/
├── app/
│   ├── api/
│   │   ├── devolucoes/
│   │   │   ├── route.ts          # GET (lista+filtros) e POST (criar)
│   │   │   └── update/route.ts   # PATCH (atualizar por NF)
│   │   └── sheets/
│   │       └── dashboard/route.ts # GET (KPIs + gráficos)
│   ├── layout.tsx
│   ├── page.tsx                  # Página principal
│   ├── providers.tsx             # React Query Provider
│   └── globals.css
├── components/
│   ├── dashboard/
│   │   ├── KpiCards.tsx          # Cards de métricas
│   │   ├── MotivoChart.tsx       # Gráfico de barras/pizza
│   │   ├── TimelineChart.tsx     # Gráfico de área temporal
│   │   └── DevolucoesTable.tsx   # Tabela com filtros e paginação
│   ├── forms/
│   │   ├── CreateDevolucaoForm.tsx # Formulário de criação
│   │   └── UpdateDevolucaoForm.tsx # Formulário de atualização
│   └── ui/
│       ├── Navbar.tsx
│       └── TabNav.tsx
├── hooks/
│   └── useDevolucoes.ts          # Todos os React Query hooks
├── lib/
│   ├── sheets.ts                 # Client Google Sheets API
│   ├── analytics.ts              # Cálculos de BI
│   ├── validations.ts            # Schemas Zod
│   └── utils.ts
└── types/
    └── index.ts                  # Tipos TypeScript do domínio
```

### Separation of Concerns

| Camada | Responsabilidade |
|---|---|
| `lib/sheets.ts` | Autenticação e CRUD na planilha |
| `lib/analytics.ts` | Lógica de negócio e métricas |
| `lib/validations.ts` | Validação de entrada |
| `app/api/**` | Roteamento HTTP e tratamento de erros |
| `hooks/useDevolucoes.ts` | Cache, invalidação e estados de loading |
| `components/**` | Apresentação e interação do usuário |

---

## API Endpoints

### `GET /api/sheets/dashboard`
Retorna KPIs, gráfico de motivos e timeline. `cache: 'no-store'` garante dados frescos.

### `GET /api/devolucoes`
Lista com paginação e filtros server-side.

Query params: `search`, `nomeCliente`, `numeroNF`, `motivo`, `dataInicio`, `dataFim`, `page`, `pageSize`

### `POST /api/devolucoes`
Cria nova devolução. Body validado com Zod.

### `PATCH /api/devolucoes/update`
Localiza linha por `numeroNF` e atualiza `dataDevolucao`, `numeroNFDevolucao` e `motivo`.

---

## Produção

```bash
npm run build
npm start
```

Para deploy no **Vercel**, adicione as variáveis de ambiente no painel do projeto.

> ⚠️ No Vercel, a `GOOGLE_PRIVATE_KEY` deve ter as quebras de linha como `\n` literais (não reais), pois o Vercel preserva o formato.
