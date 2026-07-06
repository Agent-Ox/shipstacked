# Capability Vocabulary — Seed Material (Stage B1)

Read-only extract pulled 2026-07-06 from live prod (service-role) + code. Verbatim, complete, untruncated. This is the input for designing the one canonical capability vocabulary that capture + search + SEO hang on.

Source HEAD: `1a50c5c`.

---

## 1. THE 6 BUILDER ENUMS — verbatim (`src/app/dashboard/edit/EditProfileForm.tsx:10-22`)

```js
const AVAILABILITY_OPTIONS = ['freelance', 'full-time', 'contract', 'part-time', 'open']
const PROFESSIONS = ['Developer', 'Designer', 'Product Manager', 'Consultant', 'Marketer', 'Operator', 'Founder', 'Other']
const SENIORITY_OPTIONS = ['Junior', 'Mid-level', 'Senior', 'Principal', 'Founder / Independent']
const WORK_TYPE_OPTIONS = ['Freelance', 'Full-time', 'Contract', 'Open to all']
const DAY_RATE_OPTIONS = ['Under $200/day', '$200-500/day', '$500-1000/day', '$1000+/day', 'Prefer not to say']
const TIMEZONES = ['UTC-8 (PST)', 'UTC-7 (MST)', 'UTC-6 (CST)', 'UTC-5 (EST)', 'UTC+0 (GMT)', 'UTC+1 (CET)', 'UTC+2 (EET)', 'UTC+3 (Moscow)', 'UTC+5:30 (IST)', 'UTC+8 (SGT/HKT)', 'UTC+9 (JST)', 'UTC+10 (AEST)', 'UTC+12 (NZST)']
const SPOKEN_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Hindi', 'Italian', 'Dutch', 'Russian', 'Korean']
const LLMS = ['ChatGPT / GPT-4', 'Gemini', 'Mistral', 'Llama', 'Grok', 'Perplexity', 'Cohere', 'Other']
const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'Ruby', 'Go', 'Rust', 'Java', 'C#', 'PHP', 'SQL', 'Swift', 'Kotlin']
const FRAMEWORKS = ['Next.js', 'React', 'Vue', 'LangChain', 'LlamaIndex', 'n8n', 'Make', 'Zapier', 'Supabase', 'Firebase', 'FastAPI', 'Node.js', 'Vercel', 'AWS', 'Docker']
const AI_TOOLS = ['Cursor', 'Replit', 'Bolt', 'Lovable', 'v0', 'Windsurf', 'Midjourney', 'ElevenLabs', 'Pinecone', 'Weaviate', 'Claude Code']
const DOMAINS = ['Legal', 'Healthcare', 'Finance', 'Marketing', 'Education', 'E-commerce', 'Real estate', 'HR', 'Customer support', 'Research', 'Media', 'Gaming']
const CLAUDE_USE_CASES = ['Automation and workflows', 'Content creation', 'Coding and development', 'Data analysis', 'Customer support', 'Research', 'Document processing', 'API integration', 'Agent systems', 'Education and training']
```

`skills.category` keys that map to the six capability enums: `claude_use_case`, `llm`, `language`, `framework`, `ai_tool`, `domain`.

---

## 2. LIVE `skills` TABLE — full distinct values per category (1000 rows)

Enum leakage flagged with ⚠️ (values NOT in the fixed enum for that category — they entered via `/api/v1/profile` freetext or enrichment; `skills.name`/`skills.category` are unconstrained `text`).

### `ai_tool` — 16 distinct
```
27  Claude Code
19  Cursor
17  Lovable
13  ElevenLabs
12  Replit
12  Bolt
12  v0
12  Windsurf
12  Midjourney
10  Weaviate
 9  Pinecone
 2  n8n            ⚠️ (also a framework enum value)
 1  Zapier         ⚠️ (also a framework enum value)
 1  OpenAI Codex   ⚠️
 1  GitHub Copilot ⚠️
 1  Claude         ⚠️ (likely alias of "Claude Code")
```

### `claude_use_case` — 11 distinct
```
29  Automation and workflows
26  Agent systems
24  API integration
22  Coding and development
16  Content creation
15  Document processing
13  Customer support
12  Data analysis
10  Research
 8  Education and training
 1  MVPs and prototypes   ⚠️
```

### `domain` — 18 distinct
```
19  E-commerce
18  Finance
17  Research
16  Healthcare
16  Marketing
16  Customer support
15  Legal
15  Education
15  Media
10  Real estate
10  HR
 9  Gaming
 1  AI-powered tools      ⚠️
 1  Workflow automation   ⚠️ (collides w/ use_case "Automation and workflows")
 1  Distributed systems   ⚠️
 1  Kubernetes            ⚠️
 1  Judicial platforms    ⚠️
 1  API Growth            ⚠️
```

### `framework` — 16 distinct
```
26  Next.js
24  Supabase
23  React
21  Vercel
19  Node.js
17  FastAPI
16  Firebase
15  LangChain
14  Docker
13  n8n
12  Make
12  AWS
11  Zapier
10  Vue
 8  LlamaIndex
 1  Spring Boot   ⚠️
```

### `language` — 12 distinct (exact enum, no leakage)
```
21  Python
20  JavaScript
18  TypeScript
16  SQL
 9  Java
 8  C#
 8  PHP
 8  Swift
 7  Ruby
 7  Go
 6  Rust
 6  Kotlin
```

### `llm` — 8 distinct (exact enum, no leakage)
```
22  ChatGPT / GPT-4
18  Gemini
15  Grok
14  Other
13  Perplexity
 8  Mistral
 8  Llama
 7  Cohere
```

**Canonicalization notes:**
- `n8n` and `Zapier` appear in BOTH `ai_tool` and `framework` — same tool, two categories → canonical vocab must pick one home + a cross-category alias.
- `Claude` (ai_tool) is likely an alias of `Claude Code`.
- `Workflow automation` (domain) is a cross-category near-dupe of `Automation and workflows` (use_case).
- `domain` leakage (`Kubernetes`, `Distributed systems`, `Spring Boot`-adjacent, `Judicial platforms`, `AI-powered tools`, `API Growth`) shows freetext entering the domain axis — alias/absorb needed.
- `category` and `name` are `text NOT NULL` with NO CHECK constraint — the enum is a UI convention only, not DB-enforced.

---

## 3. `capabilities_vocab` — full 15 tags (harvested receipt folksonomy, by receipt_count)

```
7  agent-orchestration
6  tool-use
4  rag-pipeline
4  verification-marker   ⚠️ internal test marker
4  step7-marker          ⚠️ internal test marker
4  agent-loop
3  vector-search
3  evaluation
2  prompt-engineering
2  mcp-server
2  dashboard
2  crm
1  streaming
1  landing-page
1  api
```
All rows `promoted = false`.

---

## 4. `team_profiles.services` + `agent_profiles.capabilities` — distinct raw (freetext arrays)

### team_profiles.services (all current rows are test data)
```
4  AI agent development
3  Workflow automation
2  LLM integration
2  RAG systems
1  LLM integrations          ⚠️ fragment of "LLM integration"
1  RAG & retrieval systems   ⚠️ fragment of "RAG systems"
1  Custom internal tooling
```

### agent_profiles.capabilities (test data)
```
1  proof-of-work-attribution
1  atlas-classification
```

Fragmentation to normalize: `LLM integration` ↔ `LLM integrations`; `RAG systems` ↔ `RAG & retrieval systems`.

---

## 5. ATLAS v0.4 — all 40 roles (role_id · cluster · name)

Clusters: A=AI Integration (7), B=Operations (4), C=Compliance (9), D=Design (5), E=Enablement (4), F=Operators (5), G=Practitioners (6).

```
A1  [A]  AI Integration Operator
A2  [A]  Forward Deployed Engineer (FDE — AI flavor)
A3  [A]  AI Deployment Triage Specialist
A4  [A]  Agent Workflow Implementer
A5  [A]  Agent System Integrator
A6  [A]  Deployment Strategist
A7  [A]  Partner / Channel Solutions Architect
B1  [B]  AI Operations Engineer
B2  [B]  Agent Reliability Engineer
B3  [B]  AI Cost & Capacity Operator
B4  [B]  AI Inference & Model Serving Reliability Engineer
C1  [C]  AI Audit & Conformity Lead
C2  [C]  AI Risk & Policy Analyst
C3  [C]  Model & Vendor Governance Manager
C4  [C]  AI Agent Steward
C5  [C]  AI Incident Responder
C6  [C]  AI Red Team Lead
C7  [C]  Data Provenance & Training-Data Compliance Officer
C8  [C]  AI Procurement & Vendor Risk Assessor
C9  [C]  Vulnerable User Protection Lead
D1  [D]  AI Workflow Designer
D2  [D]  Agent System Architect
D3  [D]  Prompt and Context Engineer
D4  [D]  Human-AI Handoff Designer
D5  [D]  AI Evaluations Engineer
E1  [E]  AI Implementation Lead
E2  [E]  AI Enablement Trainer
E3  [E]  AI Translator
E4  [E]  Fractional Head of AI
F1  [F]  The Solo Agent Operator
F2  [F]  The Boutique Agent Operator
F3  [F]  The Vertical Agent Operator
F4  [F]  The Function Agent Operator
F5  [F]  The Integration Agent Operator
G1  [G]  AI-Native Legal Practitioner
G2  [G]  AI-Native Medical Practitioner
G3  [G]  AI-Native Accounting / Finance Practitioner
G4  [G]  AI-Native Architecture / Design Practitioner
G5  [G]  AI-Native Financial Advisor / Wealth Practitioner
G6  [G]  AI-Native Education Practitioner
```

Two parallel version constants, both `'v0.4'`, must bump in lockstep: `ATLAS_VERSION_DEFAULT` (`src/lib/atlas/roles.ts:13`) and `ROLE_TAXONOMY_VERSION` (`src/services/atlas-classifier/roles.ts:36`).

---

## 6. `skills` TABLE SHAPE (verbatim, PostgREST OpenAPI)

```
id         :: uuid  | NOT NULL | default = gen_random_uuid()
profile_id :: uuid  | nullable | (FK -> profiles.id)
category   :: text  | NOT NULL | (no CHECK constraint — accepts any string)
name       :: text  | NOT NULL | (no CHECK constraint — accepts any string; enum is UI-only)
```

- **No `entity_id`** — skills are keyed to `profile_id` ONLY (builder-only). Teams use `team_profiles.services[]`; agents use `agent_profiles.capabilities[]` — neither uses this table.
- B1 mapping back to existing data: `skills.(category, name)` per builder → canonical vocab slug (+ absorb the 13 leaked values via an alias map).

---

## Structural facts for the design

1. `skills.(category, name)` are unconstrained text — the vocabulary is a UI/alias convention, not DB-enforced. A canonical table + alias map is the only way to normalize (and must back-fill the leaked values in §2).
2. Three storage shapes to unify: builder → `skills` rows (profile-keyed, 6 categories); team → `team_profiles.services[]` (freetext array); agent → `agent_profiles.capabilities[]` (freetext array). No shared vocabulary or table today.
3. Atlas roles (40, §5) are a separate, disconnected axis stored on receipts/entities. The crosswalk between the capability vocabulary and Atlas roles (Stage B2) does not exist yet — the classifier infers Atlas roles purely from shipped proof (title/description/stack/capabilities/artifact URL), never from the user's declared skills.
