# HANDOVER STEP 8 — SESSION TRANSFER

**Purpose**: Transfer everything covered in this session to a fresh chat. Pure context. No next-step recommendations. No "what to ship first." Just what was done, what was researched, what was discussed, and what was built — including the unresolved tension at the end.

**Read before this**: HANDOVER_STEP6_ROLLOUT.md, HANDOVER_STEP7_VERIFIED_CORRECTIONS.md, ATLAS_V0.3_FULL.md, SHIPSTACKED_HANDOVER.md, HANDOVER_ADDENDUM_STEP4.md, HANDOVER_STEP5_INFLECTION.md.

---

## 1. WHAT WAS DONE IN THIS SESSION

This session covered three distinct multi-hour threads that built on each other and ended in an unresolved positioning question. They are in approximate chronological order.

### 1.1 Distribution audit (the categorical map)

Earlier sessions had surfaced ~30 distribution mechanisms but missed entire categorical surface areas. This session forced a re-examination of the whole AI space and identified the misses.

The 8 categorical surfaces eventually settled on:

1. **Protocols & standards** — MCP, A2A, Agent Skills, x402, ACP, UCP, NLWeb, Schema.org
2. **Discovery marketplaces** — ChatGPT Apps, Claude Plugins, AgentExchange, AgentCore, Workspace Agents
3. **Payment / commerce networks** — Stripe ACS, Visa, Mastercard, Coinbase Agentic.Market, AgentCore Payments
4. **Cloud / infrastructure** — AWS Marketplace, Cloudflare Agents, Google Gemini Enterprise
5. **Model gateways & hosting** — OpenRouter, Vercel AI Gateway, Hugging Face (upgraded mid-session from afterthought to major surface)
6. **Vibe coding & builder tools** — Lovable, Replit, Bolt, v0, Cursor, Windsurf (identified as the biggest categorical miss)
7. **Government / sovereign AI** — OpenAI for Europe, EU AI Office, AI Verify
8. **Content & search** — NLWeb, llms.txt, Schema.org, Google for Jobs

The biggest categorical revelation: **vibe coding platforms** ($300M+ combined ARR shipped in the last 12 months by Lovable, Cursor, Replit, v0, Bolt) were being treated as competitors-adjacent. They're not. They're the rails — every developer building on them is a potential ShipStacked user at the moment they need to find or be found for help. None of those platforms had a "list on / integrate with [marketplace]" template from any major launch in the space.

### 1.2 VC funding map (the capital alignment work)

Pivot mid-session from distribution to capital. Thomas wanted VCs with explicit public theses about AI labor disruption — not generalist AI investors, not generalist workforce funds. The shortlist that emerged:

**Tier 1 — "Services as Software" / Labor Layer thesis (direct fit)**:
- Sequoia (Julien Bek, London — "Services: The New Software")
- General Catalyst ($1.5B Creation Strategy, $16T services TAM thesis)
- Thrive Capital ($1B+ AI-services rollup vehicle with OpenAI ownership stake)
- Foundation Capital ("services as software" thesis)
- Emergence Capital (AI-Native Services Playbook author)
- Khosla Ventures ($15B AUM, "80% of jobs by 2030" thesis, new $3B fund)

**Tier 2 — Workforce specialists**:
- Achieve Partners ($450M Workforce II, April 2026, explicitly for AI labor disruption)
- JFF Ventures (workforce + future of work, $50M Fund II)
- Reach Capital (future of work + workforce)
- Owl Ventures (largest EdTech VC, $2.2B AUM)
- New Markets Venture Partners
- GSV Ventures (ASU+GSV Summit access)

**Tier 3 — European geographic fit (Thomas is EU-based)**:
- Air Street Capital (London, AI-only, $232M Fund III)
- Index Ventures, Balderton, Atomico, Accel London
- Educapital (Paris, largest European EdTech + Future of Work VC)
- Brighteye Ventures (London EdTech, Multiverse investor)
- Earlybird VC (Berlin, €360M Fund VIII, AI mandate)

**Tier 4 — "Agent Employee" thesis crowd (broader, indirect)**:
- Battery Ventures (Jason Mendel: "2026 will be the year of agents")
- Sapphire Ventures (Cathy Gao: "managed labor" thesis)
- Greylock (Reid Hoffman thesis on agent amplification)
- Menlo Ventures (Venky Ganesan: "show me the money" year for AI replacing labor)
- a16z Speedrun (AI procurement agents, one-founder-many-agents thesis)
- Conviction VC ("Year of the Agent Harness")
- Bain Capital Ventures (legacy industries AI overhaul)
- Insight Partners

**Tier 5 — Open-application channels**:
- Y Combinator S26 RFS (explicitly named "AI-native service companies," "AI-Native Agencies," "Software for Agents")
- Sequoia Arc, a16z Speedrun, Khosla direct apply

Decision Thomas reached during this thread: capital track stays parallel to build track. Goal isn't to raise now — goal is to be readable to capital when the build proves the thesis. Apply to open channels (YC, Sequoia Arc, a16z Speedrun, JFF, Reach, Educapital, Brighteye, Air Street, Khosla, Achieve Partners) once 5+ S-tier beacons are shipped. Don't outreach to Tier 1/4 cold — let inbound happen via shipped proof.

### 1.3 The Noah Kagan thread (the brief that almost shipped)

Noah Kagan reached out via text with his personal number, pushing a June 15 2026 launch for something agent-economy-adjacent. Thomas wanted advisory positioning. The session produced four iterations of a strategic brief titled "The Agentic Economy Distribution Stack":

**v1 — early draft**: included personal autobiography (Mallorca, legal practice, follower count, "what I got wrong" lessons). Made the brief about Thomas instead of the playbook. Rejected.

**v2 — fact-checked by Thomas**: Thomas independently fact-checked the v1 brief before sending and surfaced multiple stale/wrong claims. The fact-check found:
- AgentCard path was wrong (`/.well-known/agent.json` is outdated; correct path is `/.well-known/agent-card.json`)
- UCP was incorrectly attributed to Stripe (UCP is Google + Shopify; Stripe stack is ACP + MPP + x402 + Link Agent Wallet)
- Vibe coding ARR figures were Dec 2025-era (Lovable was at $400M ARR by April 2026, not $200M; Cursor was in talks for $50-60B valuation, not $29.3B; Replit was $265M ARR at $9B post-Series D)
- A2A was already donated to Linux Foundation in June 2025 (not still Google-owned)
- MCP was donated to Linux Foundation in December 2025 (not still Anthropic-owned)
- AWS AgentCore went GA at end of April 2026 (not late 2025)
- ChatGPT App Directory launched Dec 17 2025 (not Dec 18)
- Salesforce AgentExchange numbers were old (current: 10K Salesforce apps + 1K Agentforce agents + 2.6K Slack apps)
- llms.txt utility was contested in production (no major AI provider consumes it; SEO-citation studies show no measurable improvement)

**v3 — re-verified rebuild**: Claude re-verified every claim against primary sources via web search. Two additions made:
- **AP2 (Google Agent Payments Protocol)** — 60+ partners, donated to FIDO Alliance May 2026, was completely missing from earlier versions. Sits parallel to Stripe ACS as a payment protocol
- **x402 Bazaar discovery extension** — Coinbase's "search engine for agents," 10,000+ endpoints, integrated natively in AWS AgentCore Gateway and Cloudflare Agents SDK
- Demoted llms.txt out of beacon track to "low-cost ship, contested utility"
- All vibe coding numbers updated to current
- Vibe coding priority reordered: Lovable → Cursor → v0 → Replit → Bolt (Cursor jumped due to $2B+ ARR confirmed)

**Brief sequencing decision Thomas reached**: "Drink my own kool-aid first." Don't send the brief to Noah until ShipStacked has shipped foundation items 1-7 and Thomas has real shipped-it experience. Brief becomes "I built this, here's the playbook" not "I researched this, here's the playbook." Massive credibility difference. Target send: ~next week with 5+ S-tier beacons live.

### 1.4 The build-direction question (Item 1 → Schema.org → V1/V2 disconnect)

After the brief was verified, Thomas asked what gets shipped first. Claude answered "Schema.org JSON-LD markup" and produced a detailed implementation guide (ITEM_1_SCHEMA_ORG_IMPLEMENTATION.md, ~2,200 words, copy-paste-ready Next.js code for all 5 page types: homepage with Organization + WebSite schemas, /jobs with JobPosting, /talent with Person + ItemList, /claim with Person reuse + WebPage, /atlas with Article + DefinedTermSet).

Thomas then surfaced a deeper issue: he hadn't shipped anything from the agent-readable stack. Only the Atlas page and intake forms (/hire, /claim). And the V1 marketplace (builders + employers + Stripe $199/mo subscriptions) was still fully live and operational. Adding agent-readable infrastructure on top of a V1/V2 hybrid that had never been reconciled would propagate confusion at machine-readable scale.

This triggered the real strategic question: **is ShipStacked a marketplace?**

### 1.5 The positioning unraveling

The session entered its most exploratory and ultimately most unresolved phase. The following positioning framings were proposed by Claude and worked through with Thomas:

**"Marketplace for AI builders"** — rejected by Thomas. Pigeonholes into a category with fierce incumbents (Upwork, Toptal, Fiverr, Mercor, Pallet). Loses on supply liquidity. Compresses TAM into low billions. Doesn't reflect what the Atlas describes.

**"The registry of the agentic economy's labor layer"** — proposed by Claude. Worked at the operating-model level (registry economics > marketplace economics, canonical-reference-source moat, Schema.org / GitHub / NPM / MusicBrainz analogies). Rejected by Thomas because no vibe coder, employer, or domain expert identifies with being in a "registry." Wrong word for users even if right for architecture.

**"Where AI builders get hired"** — proposed by Claude. Dual-sided language. Sharper than "marketplace." Still rejected by Thomas because it pigeonholes into one population (AI builders) when the Atlas describes 4+ distinct populations.

**"The discovery and classification layer for the labor market of the agentic economy"** — proposed by Claude, also the language Thomas himself uses in the Atlas's "About the author" section. Architecturally accurate. Investor-tier sentence. Rejected by Thomas as a user-facing headline because it doesn't appeal to any of the four populations directly.

**"The work didn't have a name yesterday. Here's what you do."** — proposed by Claude after working through what each of the four populations actually wants. Argued that all four populations (vibe coders, employers, domain experts, upskilling engineers) want the same thing in different shapes: to be **named**. Atlas is the naming system. ShipStacked is where the naming becomes actionable (claim → profile; symptom → hire). This was the closest the session got to a usable headline.

**Where the session broke**: Thomas pushed back hard on the assumption that anyone on the homepage has absorbed the Atlas before landing. Atlas is a 30-minute dense read introducing new taxonomy and renaming people's titles. Even Thomas isn't fully confident in it. The positioning Claude proposed assumed the Atlas as front-door context. That assumption doesn't survive contact with a cold visitor.

Thomas's final critique landed: Claude was writing 4,000-word responses to recommend writing a homepage that says "you'll be named." The Atlas itself has the same problem at higher stakes. Borderline AI-slop territory.

### 1.6 Production state at end of session (unchanged from start)

- ShipStacked V1 still fully live: builders, employers, Stripe $199/mo employer subscriptions, Build Feed, Velocity Score, /jobs, /talent, /leaderboard, /feed
- Atlas v0.3 page live at /atlas (11,335 words, dense, the V2 surface)
- Intake forms live: /hire (employer-side symptom capture), /claim (practitioner-side role claim)
- 60 signups, 20 verified killer builders, 810 X followers
- Pre-revenue (no employer subscriptions converted yet per session signals)
- DNS load-bearing: Resend DKIM + SES records on send.shipstacked.com — DO NOT DELETE
- Vercel env: INTAKE_NOTIFY_EMAIL=ox@agentagous.com — load-bearing
- Zero of the S-tier agent-readable beacons shipped (Schema.org, AgentCard, MCP server, NLWeb, Agent Skill, etc.)
- The V1/V2 disconnect is unresolved at the product surface level

---

## 2. THE RESEARCH SUBSTRATE

Web searches conducted during this session, summarized with the strongest signals. All verified May 2026 unless noted.

### 2.1 Agent-readable infrastructure standards

**Schema.org JSON-LD**: W3C standard, decades-old, parsed by every AI search engine in production today (Perplexity, ChatGPT browse, Claude search, Google AI Overview). ZipRecruiter case study: 450% CTR increase + 3x conversion rate from Google + 35% monthly increase in non-branded organic traffic after JobPosting markup. Required: every listing page should have JSON-LD blocks for the appropriate type (JobPosting, Person, Organization, Article, DefinedTermSet, SoftwareApplication, Product, Offer, Service). Validate with Google's Rich Results Test.

**A2A (Agent-to-Agent Protocol)**: Open standard originally developed by Google, **contributed to Linux Foundation in June 2025**. As of April 2026 anniversary, 150+ organizations supporting (Google, Microsoft, AWS, Salesforce, SAP, ServiceNow, Workday, IBM). Apache 2.0. Integrated natively in Azure AI Foundry, Amazon Bedrock AgentCore, Google Cloud. **AgentCard convention is `/.well-known/agent-card.json`** (NOT `/.well-known/agent.json` which is outdated). Required fields per current spec at a2a-protocol.org: `name`, `description`, `url`, `version`, `capabilities` (with sub-fields for streaming, push notifications, extensions), `supportedInterfaces`, `defaultInputModes`, `defaultOutputModes`, `skills`. Signing per A2A v1.2 uses JSON Web Signature (JWS), supporting Ed25519, ECDSA-P256, RSA among others.

**MCP (Model Context Protocol)**: Anthropic's open standard, **donated to Linux Foundation in December 2025**. Anthropic co-founded Agentic AI Foundation (AAIF) with OpenAI and Block in same announcement. SDK at @modelcontextprotocol/sdk. Tens of millions of monthly downloads (Anthropic's late-2025 figure was 97M+ monthly). **Official Anthropic-maintained MCP registry** at github.com/modelcontextprotocol/registry, preview launched September 2025, API v0.1 freeze October 2025. Submit via `mcp-publisher` CLI with namespace ownership via GitHub OAuth or DNS/HTTP challenge. mcp.so indexes ~20,000+ servers (with duplication); Smithery's distinct-server index ~6,000. Three community awesome lists: wong2/awesome-mcp-servers, punkpeye/awesome-mcp-servers, appcypher/awesome-mcp-servers.

**NLWeb**: Microsoft's open standard announced at Build 2025. Auto-generates an MCP-compatible interface from existing structured content. Initial adopters (publicly documented): TripAdvisor, O'Reilly Media, Shopify, Eventbrite, Hearst, Snowflake, Chicago Public Media, Allrecipes, Common Sense Media. Deploy as sidecar service per microsoft/NLWeb GitHub repo.

**Agent Skills**: Anthropic open-sourced December 18, 2025. SKILL.md format (markdown with YAML frontmatter and procedural instructions). Spec at agentskills.io/specification. Adopted by Cursor, OpenCode, Amp, Letta, goose, GitHub, VS Code, OpenAI Codex within weeks. One submission propagates across all major AI coding tools.

**llms.txt**: As of Q1 2026, **no major AI provider has publicly committed to consuming llms.txt in production systems**. GPTBot fetches occasionally. Stripe and Anthropic publish llms.txt files. Multiple SEO-citation studies show no measurable improvement. Adoption is real but utility is contested. Google's John Mueller publicly described it as "the next keywords meta tag" (skeptical framing). Worth shipping for low-cost forward compatibility; **not classified as a primary beacon**.

### 2.2 Payment protocols (4 distinct standards)

**ACP (Agentic Commerce Protocol)**: Co-authored Stripe + OpenAI, September 2025. Powers ChatGPT Instant Checkout and Microsoft Copilot Checkout. Open source under Apache 2.0 at github.com/agentic-commerce-protocol/agentic-commerce-protocol.

**Stripe Agentic Commerce Suite (ACS)**: December 2025 launch. Merchant integration layer that exposes products to AI agents via hosted ACP endpoint. Sessions 2026 (April 29) shipped Link Agent Wallet + Issuing for Agents. 250M+ Link consumers globally. Stripe joined Google's UCP Tech Council April 24 2026 — interoperates with UCP via Visa Intelligent Commerce Connect. **Stripe powers 78% of Forbes AI 50 companies**.

**MPP (Machine Payments Protocol)**: Co-authored Stripe + Tempo, March 18 2026. HTTP-addressable agent billing using Shared Payment Tokens.

**UCP (Universal Commerce Protocol)**: **Google + Shopify's protocol — NOT Stripe's**. Competing-but-interoperable with ACP. Tech Council includes Stripe (joined April 2026), Visa, Mastercard. **Checkout.com data**: merchants supporting both ACP and UCP see ~40% more agentic traffic than those backing only one (single-source claim — directionally credible).

**AP2 (Agent Payments Protocol)**: **Google's open payment protocol**, announced September 2025 with 60+ initial partners (Mastercard, American Express, PayPal, Adyen, Worldpay, UnionPay, Salesforce, ServiceNow, Intuit, Coinbase). **Donated to FIDO Alliance May 2026** for platform-agnostic stewardship. Released as v0.2 on GitHub at google-agentic-commerce/AP2 under Apache 2.0. Uses Verifiable Credentials ("mandates"): Intent Mandate, Cart Mandate, Payment Mandate. Extends A2A and MCP, interoperates with UCP and x402. Production deployments: PayPal Conversational Commerce Agent (Oct 2025), Mastercard Agent Pay pilot, A2A x402 extension for stablecoin payments.

**x402**: HTTP 402 Payment Required, revived by Coinbase. **Moved to Linux Foundation governance April 2, 2026** at MCP Dev Summit North America. Initial governing body: Cloudflare + Stripe. Founding members: Adyen, AWS, American Express, Ampersend.ai, Ant International, Base, Circle, Cloudflare, Coinbase, Fiserv Merchant Solutions, Google, KakaoPay, Mastercard, Merit Systems, Microsoft, Polygon Labs, PPRO, Shopify, Sierra, Solana Foundation, Stripe, Thirdweb, Visa. **May 13 2026: Base added batched settlement enabling payments of <$0.0001 per call** (high-frequency AI workload pricing floor effectively zero).

**x402 Bazaar**: Coinbase's discovery layer for x402 endpoints. Coinbase calls it "a search engine for agents." Currently indexes 10,000+ x402 endpoints. Bazaar MCP server exposes `search_resources` (semantic search) and `proxy_tool_call`. Integrated natively in AWS AgentCore Gateway and Cloudflare Agents SDK.

### 2.3 Major agent marketplaces and registries

**AWS Marketplace AgentCore**: **AgentCore went GA end of April 2026**. **AgentCore Payments preview May 7 2026** in 4 regions: US East (N. Virginia), US West (Oregon), Europe (Frankfurt), Asia Pacific (Sydney). Currently supports x402; ACP, MPP, AP2 on public roadmap. Built with Coinbase + Stripe (Privy wallet, Coinbase CDP wallet). Coinbase x402 Bazaar MCP server available through AgentCore Gateway. Settlement on Base in ~200ms. Early adopters: Warner Bros. Discovery, Cox Automotive, Thomson Reuters, PGA TOUR, Heurist AI. **Container requirements**: ARM64, must expose `/mcp` as POST endpoint per protocol contract.

**Claude Plugin Marketplace**: Anthropic-maintained at claude.com/plugins. Plugins bundle MCPs, skills, and tools. Default-loaded in Claude Cowork (enterprise desktop agent). Discoverable via `/plugin marketplace add` in Claude Code. Submit via in-app form. Optional listing in anthropics/claude-plugins-official GitHub repo. "Anthropic Verified" badge available for additional quality + safety review.

**ChatGPT App Directory**: Launched **December 17 2025** for ChatGPT Business, Enterprise, Edu users; later opened to Free, Go, Plus, Pro outside EEA/Switzerland/UK. Built on Apps SDK running on MCP. ChatGPT has hundreds of millions of weekly users. Pilot partners: Booking.com, Canva, Coursera, Figma, Expedia, Spotify, Zillow, DoorDash, AllTrails, MyFitnessPal, Apple Music, Khan Academy. Submission via OpenAI Developer Platform dashboard. Each Platform org can have one app in review at a time.

**OpenAI Workspace Agents**: Launched **April 22 2026** as successor to custom GPTs. Powered by Codex, runs in cloud, persists across tasks. ChatGPT Business/Enterprise/Edu/Teachers plans. **Free until May 6 2026; credit-based pricing after**. Early enterprise testers: Rippling, SoftBank Corp., Better Mortgage, BBVA, Hibob. Connects to Slack, Google Drive, Microsoft apps, Salesforce, Notion, Atlassian Rovo.

**Salesforce AgentExchange**: Now unified marketplace combining AppExchange + Slack Marketplace + Agentforce ecosystem (April 2026 consolidation). **10,000+ Salesforce apps + 1,000+ Agentforce pre-built agents/sub-agents/tools/MCP servers + 2,600+ Slack apps**. $50M Salesforce Builders Initiative funding ecosystem. Native MCP + A2A support via Agentforce 3. Semantic search via Data 360; conversational search coming fall 2026. **MeshMesh case study** (single secondary source, SalesforceDevops.net): reported $2M marketplace revenue in 9 months with 80% in-product discovery.

**monday.com Agentalent.ai**: Launched March 2026. Marketplace for **AI agents** (not humans) — different problem. Built with AWS + Anthropic. Early collaborators: Wix, Mesh Payments. *Important distinction: this is competition for AI agents being hired, not for humans being hired.*

**Circle Agent Marketplace**: Launched May 11 2026. Crypto-native agent commerce (USDC, Agent Wallets, Nanopayments via Circle Gateway down to $0.000001 transfers). Pairs with x402 and AP2. USDC commands ~63% of stablecoin transaction volume per Circle Q1 2026 earnings.

**Gemini Enterprise Agent Marketplace**: Google Cloud. Supports signed AgentCards per A2A JWS spec. Integrated A2A and AP2.

**Microsoft Marketplace**: Copilot Studio integration. Microsoft 365 distribution.

**Hugging Face**: Millions of users, models, datasets. HF Datasets become training data (potentially baked into open-source models). HF Spaces is discovery surface for AI-native apps. Free hosting.

### 2.4 Vibe coding platforms (the biggest distribution miss)

Numbers verified May 2026, moving fast so cite-at-time-of-use:

**Lovable**: **$400M ARR by April 2026, $6.6B valuation** (February 2026 Series B led by Benchmark + CapitalG + Menlo Ventures, $330M raised total). Crossed $100M ARR in 8 months — possibly fastest software company ramp on record. Customers include Klarna, Uber, Zendesk. Adopted by majority of Fortune 500.

**Cursor (Anysphere)**: **$2B+ ARR by February 2026**, $29.3B post-Series D (November 2025), **in talks for $50-60B valuation as of April 2026**. ~4.7M paid subscribers (broader market context).

**Replit**: **$265M ARR end of 2025, $9B valuation after $400M Series D March 2026** (Notable Capital led). Target $1B ARR by year-end 2026. Customer logos: Atlassian, PayPal, Adobe, UKG.

**v0 (Vercel)**: Vercel closed Series F at $9.3B valuation September 2025; v0 generated ~$42M ARR within ~14 months of launch.

**Bolt (StackBlitz)**: $40M+ ARR in ~5 months from launch, $700M valuation March 2025 (may have grown).

**Windsurf**: Acquired by Cognition; combined entity raising at $10.2B.

**Long tail growing fast**: Magic Patterns, Mocha, Emergent.

Every one has a template / community gallery. **As of May 2026, none has a clean canonical "integrate with [your product]" or "list on [your product]" template from any major launch in the agentic economy space.** First-mover advantage available on every single platform.

### 2.5 The competitive landscape for ShipStacked

**Mercor** ($10B valuation, $350M Series C October 2025 led by Felicis, ~$500M ARR run rate, 30,000+ contractors paying $1.5M+/day): Started as AI recruiting platform, pivoted to **RLHF/training-data** for frontier labs (OpenAI, Google DeepMind, Meta). Domain experts (doctors, lawyers, scientists) at $85+/hr average. 30% recruiting fee on direct placements. Their core market is reinforcement-learning-economy training, not implementation/deployment labor. The Atlas explicitly notes ShipStacked does NOT currently compete with Mercor.

**AI-powered recruiting platforms (LinkedIn-on-rails category)**: Phenom Applied AI, Eightfold, Juicebox (PeopleGPT — 800M+ profiles across 30+ sources), Moonhub, hireEZ, SeekOut, Paradox, Dex (AI talent agent, raised $5.3M seed from Notion Capital April 2026, focused on AI software developers + ML engineers). **All using LinkedIn-style data sources to find people in existing categories.** None of them maps the new role taxonomy. None surfaces the populations the Atlas describes.

**Vibe-coder-adjacent specialists**: Pallet (YC), Toptal AI Experts vertical, Upwork's AI Services categories, Fiverr AI specializations.

**Noah Kagan's launch** (positioned via tweet during this session): *"I'm launching a marketplace for Vibe-Coded apps + AI Skills 👉 think AppSumo for people building with Claude/Codex in a weekend."* This is a marketplace for **the apps themselves** (lifetime deals on weekend-built software), plus "AI Skills" as secondary category. **Different layer from ShipStacked**: AppSumo monetizes the product a vibe coder ships; ShipStacked (in V1 framing) monetizes the labor that ships products. Noah's launch creates downstream demand for ShipStacked-style labor when shipped apps need maintenance/extension. Validates that the vibe-coder population is real and being targeted at scale by serious operators — does NOT validate that ShipStacked should narrow to that population.

**Critical observation**: No competitor is mapping the implementation/deployment/operator/compliance/vertical-specialist labor surface that the Atlas describes. This is genuinely first-mover territory.

### 2.6 Institutional capital map (the labor-disruption thesis)

Publicly committed capital to the agentic-economy labor thesis as of May 2026 ≈ **$20B+**:

- **OpenAI Deployment Company**: $10B JV (May 11 2026), 19 partners (TPG, Brookfield, Advent, Bain Capital, Dragoneer, SoftBank, BBVA, Bain & Company). Acquired Tomoro (150-person UK consultancy) for FDE supply. Purpose: "helping companies integrate these systems."
- **Anthropic + Goldman + Blackstone + Hellman & Friedman**: $1.5B JV (May 4 2026, $300M each). Purpose: "embed engineers inside mid-sized companies to redesign workflows around agents, targeting a key talent bottleneck in AI." Other backers: Apollo, General Atlantic, GIC, Leonard Green, Sequoia.
- **Khosla Ventures**: $3B new fund. Vinod Khosla public thesis: "Starting in about 2030, 80% of all jobs will be capable of being done by an AI." "$15 trillion of U.S. GDP is labor, and that $15 trillion will mostly go away."
- **Kleiner Perkins**: $3.5B AI-only fund (2025).
- **General Catalyst**: $1.5B Creation Strategy. Marc Bhargava: "$16 trillion services TAM. Three pillars: intelligence, infrastructure, workforce enablement." Deployed across Eudia (legal), Titan MSP (IT, $74M raised + RFA acquisition), Crescendo (call centers), Long Lake (property management, $100M EBITDA in <2 years).
- **Achieve Partners Workforce II**: $450M April 2026, specifically AI labor disruption. Already invested in FutureFit AI.
- **Air Street Capital Fund III**: $232M March 2026, AI-only, London-based.
- **JFF Ventures**: $50M Fund II, future-of-work specialist.

**Key VC quotes for narrative use**:
- Sequoia (Julien Bek, London): "Services: The New Software" (viral April 2026)
- Khosla (Vinod): "80% of jobs by 2030"
- General Catalyst (Bhargava): "$16T services TAM, three pillars: intelligence, infrastructure, workforce enablement"
- Battery Ventures (Jason Mendel): "2026 will be the year of agents... delivering on the human-labor displacement value proposition"
- Sapphire Ventures (Cathy Gao): "Winning companies will look less like SaaS and more like 'managed labor.' Agents get 'job titles, budgets, limits.'"
- Menlo Ventures (Venky Ganesan): 2026 is "show me the money" year for AI replacing labor costs
- Conviction VC (Sarah Guo): "Year of the Agent Harness"

### 2.7 Labor market data substantiating the Atlas

- **ManpowerGroup 2026 survey** (39,000 employers, 41 countries): AI Model & Application Development is now the **single hardest-to-fill skill in the world**, first time in survey's history.
- **Bain estimate**: half of 1.3 million US AI jobs may go unfilled by 2027.
- **Forrester**: 75% of organizations attempting to build AI agents in-house will fail.
- **RAND**: 80% of AI projects fail to deliver business value.
- **MIT**: 95% of GenAI pilots never reach production.
- **WRITER survey**: 67% of executives report data breaches from unapproved AI tools.
- **Gartner**: 1,445% surge in enterprise inquiries about multi-agent orchestration in 2025.
- **Forrester**: 25% of 2026 enterprise AI spend being deferred to 2027 due to ROI pressure.
- **Pertama Partners 2026**: 42% of companies abandoned AI initiatives in 2025; failed projects cost $4.2M-$8.4M depending on failure mode.
- **Pluralsight**: 65% of organizations have abandoned AI projects.
- **Coursera salary data**: Prompt Engineer demand grew 135.8% in recent quarters; projected CAGR 32.8% through 2030.
- **Indeed**: 800-1000% growth in Forward Deployed Engineer postings between January and September 2025.
- **Levels.fyi (FDE compensation)**: Average TC $238K, range $205-486K, Staff clearing $630K+. UK FDE: £138K average, range £108-186K, top £253K+. Defense and Healthcare command highest premiums.
- **New York surpassed San Francisco** as FDE hub (35% vs 11% of postings).
- **Healthcare AI**: 640,000 positions in 2026, fastest CAGR (36.8%), reaching $110B+ by 2030.
- **Manufacturing AI**: 620,000 positions in 2026.
- **Financial Services AI**: 470,000 positions, top compensation ($300K+ specialist roles).
- **Specialist domain experts command 30-50% higher salaries** than generalists.
- **Over 75% of AI job listings specifically seek domain experts.**
- **NVIDIA internal**: 100 AI agents per human (7.5M agents serving 75K humans).
- **Jensen Huang at GTC 2026**: "In the future, the IT department of every company is going to be the HR department of AI agents."
- **Anthropic's Amodei**: 70-80% probability of first one-person billion-dollar company in 2026.
- **Cursor at $2B ARR with 60 employees** = operator pattern at scaleup scale. Midjourney $500M revenue with ~107 employees = same shape.
- **Solo operator examples at $1M+ ARR**: Pieter Levels ($3M+ ARR), Danny Postma ($300K/month), Sarah Chen ($420K in 8 months), Maor Shlomo (Base44 sold to Wix for $80M in 6 months).

### 2.8 Government / sovereign AI surfaces

- **EU AI Act**: enforcement August 2, 2026. Fines up to 7% of global revenue under highest tier.
- **EU AI Office voluntary register** for GPAI systems.
- **OECD AI Policy Observatory** catalog.
- **Singapore AI Verify** government framework.
- **NIST AI Risk Management Framework** registries.
- **UK AI Security Institute** (AISI) — uses Anthropic's open-source Petri tool to evaluate models.
- **US AI Safety Institute** equivalent.
- **NYC Local Law 144** — bias audits for automated employment decision tools.
- **Colorado AI Act** — similar state-level framework.

---

## 3. THE ATLAS (V2 SURFACE) AS IT STANDS

The Atlas v0.3 is live at shipstacked.com/atlas. Published May 13 2026. 11,335 words. ~30 minute read. By Thomas Oxlee.

**Full structure summary** (the entire content of the Atlas is also durably stored at /mnt/user-data/outputs/ATLAS_V0.3_FULL.md and at src/content/atlas-v03.md in the codebase):

### Foreword

Frames the thesis: CVs are a 15th-century artifact; job titles a 20th-century industrial artifact. Both assume the role someone is hired into has been done before. That assumption broke in the last 12-18 months. The most valuable people in the agentic economy are doing work that didn't have a name two years ago. Companies cannot describe what they need — they describe symptoms. References the OpenAI Deployment Company / Anthropic-Goldman JVs as evidence the labor scarcity is real and structural.

### Six Parts

**Part I — The Workforce**. 28 specialist roles across 5 clusters describing employed labor inside companies adopting AI. Each role has automation trajectory notation (🔴 Resistant, 🟡 Partial, 🟢 Collapsible).

**Part II — The Operators**. 5 operator types describing a new economic unit: solo or small-team practitioners running portfolios of agents and renting output to customers. Not employees. Not freelancers. Not consultants. Not agencies. Not SaaS founders.

**Part III — The Compliance Layer**. Reorganized into 3 sub-clusters mirroring how frontier labs organize this work: C-Research (Frontier Red Team flavor), C-Operations (Safeguards flavor), C-External (Trust & Safety flavor).

**Part IV — Alignment & Interpretability Research**. Distinct population connected to Anthropic Fellows / MATS / Redwood / ARC pipelines. Different career path, supply pool, demand pool from Part III compliance work.

**Part V — Model Training & RLHF**. Three tiers (Mass-Market, Domain-Expert, Quality Auditors). Mercor-dominated $1B+ market. Listed for completeness; ShipStacked doesn't currently compete here.

**Part VI — Industry Vertical AI Specialists**. Healthcare, Legal, Financial Services, Defense/Government, Manufacturing. Domain practitioners who learned AI rather than AI practitioners who learned a domain.

### Part I detail (the 28 roles)

**Cluster A — Implementation & Deployment** (7 roles):
- A1. AI Integration Operator 🟡
- A2. Forward Deployed Engineer (FDE — AI flavor) 🔴
- A3. AI Deployment Triage Specialist 🔴
- A4. Agent Workflow Implementer 🟡
- A5. Agent System Integrator 🔴
- A6. Deployment Strategist 🔴 (NEW in v0.3)
- A7. Partner / Channel Solutions Architect 🔴 (NEW in v0.3)

**Cluster B — Reliability & Operations** (4 roles):
- B1. AI Operations Engineer 🟢
- B2. Agent Reliability Engineer 🟢
- B3. AI Cost & Capacity Operator 🟢
- B4. AI Inference & Model Serving Reliability Engineer 🟡 (NEW in v0.3)

**Cluster C — Governance, Risk & Compliance (Summary)** (4 roles, expanded in Part III):
- C1. AI Audit & Conformity Lead 🟡
- C2. AI Risk & Policy Analyst 🔴
- C3. Model & Vendor Governance Manager 🟢
- C4. AI Agent Steward 🔴

**Cluster D — Design & Architecture** (5 roles):
- D1. AI Workflow Designer 🟡
- D2. Agent System Architect 🔴
- D3. Prompt and Context Engineer 🟢 (renamed in v0.3)
- D4. Human-AI Handoff Designer 🔴
- D5. AI Evaluations Engineer 🟡 (NEW in v0.3)

**Cluster E — Translation & Enablement** (4 roles):
- E1. AI Implementation Lead 🔴
- E2. AI Enablement Trainer 🟢
- E3. AI Translator 🔴
- E4. Fractional Head of AI 🔴

Total Part I: 24 distinct roles in active workforce. Each has structured fields: What they do / What good looks like / Demand signals / Supply signals / Common failure when wrong person is hired / Automation trajectory / Specialization (where load-bearing) / Compensation reality (where data exists) / Adjacent roles.

### Part II detail (5 operator types)

- F1. The Solo Agent Operator (Pieter Levels-shape)
- F2. The Boutique Agent Operator (2-5 humans, specialized fleets)
- F3. The Vertical Agent Operator (specialized in one industry)
- F4. The Function Agent Operator (specialized in one cross-industry function)
- F5. The Integration Agent Operator (the plumber pattern)

Plus a "Founding Engineer at AI-native company" polymath archetype note (Cursor / Anysphere / Midjourney shape).

Plus "How operators relate to companies — the engagement model": customers don't hire operators, they engage them. Operator retains fleet; customer rents output. Recurring pricing, not project-based. Trust at founder/operator level.

### Part III detail (compliance sub-clusters)

**C-Research (Frontier Red Team flavor)**: C2 (overlap), C6 AI Red Team Lead with sub-specialties (Autonomy, Cyber, Emerging Risks).

**C-Operations (Safeguards flavor)**: C5 AI Incident Responder, C8 AI Procurement & Vendor Risk Assessor, Anthropic Safeguards Red Team.

**C-External (Trust & Safety flavor)**: C7 Data Provenance & Training-Data Compliance Officer, C9 Vulnerable User Protection Lead, Policy Vulnerability Testing (PVT) Coordinator.

### Part IV detail (research roles)

- Alignment Researcher
- Interpretability Researcher
- Model Behavior Researcher
- Safety Evaluation Researcher

Talent development pipeline: Anthropic Fellows Program (4-month, $15K/month stipend, May and July 2026 cohorts), MATS, Redwood Research Residency, ARC.

### Part V detail (RLHF tiers)

- Mass-Market RLHF Contractors ($25/hr typical)
- Domain-Expert RLHF Specialists ($85+/hr at Mercor, the $1B revenue core)
- AI Quality Auditors / Red Team Contractors ($120K+ FTE or $150K+ equivalent)

### Part VI detail (verticals)

- Healthcare AI Engineer / Specialist
- Legal AI Engineer / Legal Technologist
- Financial Services AI Engineer
- Defense / Government AI Engineer
- Manufacturing AI Engineer

### v0.4 planned additions (folded into Atlas as published)

1. **Domain practitioner with integrated AI** — explicit category (lawyers, doctors, accountants, architects, financial advisors who have deeply integrated AI into primary professional work). Pool: ~1.5-3M globally. Distinct from Part VI vertical AI engineers — these are domain-first, AI-as-multiplier.
2. ISCO-08 / SOC 2018 / O*NET crosswalk per role.
3. EU AI Act Annex III + ISO 42001 explicit mapping for Part III roles.
4. Expanded Levels.fyi-anchored compensation data.
5. **Acquisition-as-talent-supply pattern** as named mechanism (Tomoro precedent).
6. **Three-layer venture structure** as named pattern (frontier lab + direct-employed FDEs + Big-3 consulting + Capgemini partner channel).
7. Named companies per vertical expanded.
8. Expanded Part IV alignment research with specific program structures.
9. **OpenAI Frontier / superapp framing implications** for the Atlas.
10. **"Hiding in plain sight" phenomenon** named — practitioners doing genuine A1/A2/A4/A6 work classified by employer/LinkedIn as something generic. The /claim form is the structural mechanism for self-classification into the routable supply pool.

### Atlas's own "About the author" framing

> "Thomas Oxlee is the founder of shipstacked.com, **the discovery and classification layer for the labor market of the agentic economy**. He is currently embedded as the AI integration operator at a regulated EU business under AI Act exposure, where most of the field signal that informs this Atlas comes from. shipstacked.com matches AI-native specialists, agent operators, vertical specialists, and compliance practitioners to companies that need them — without CVs, without LinkedIn taxonomies, and without the assumptions of a labor regime that broke eighteen months ago."

This sentence is what Thomas himself wrote at the bottom of the Atlas. It's also the architectural sentence the homepage doesn't match.

---

## 4. WHAT THE V1 HOMEPAGE CURRENTLY SAYS

Crawled directly from shipstacked.com during this session. Verbatim key elements:

**Meta title**: "ShipStacked — The proof-of-work platform for AI-native builders"

**Meta description**: "The hiring platform for AI-native builders. Find verified developers, prompt engineers, and AI automation specialists who prove their skills with real projects."

**Hero**: "The proof-of-work platform for AI-native builders" → "You shipped something incredible last week. Nobody important saw it." → "ShipStacked is where AI-native builders post their work, prove what they can do, and get found by the people worth working with. No CVs. No guessing. Just proof."

**Primary CTA**: "Show what you've built — it's free" → /join

**Below the fold sections**:
1. "For the agentic builder" — let your agent handle it via API key
2. "The hiring world just broke" — vibe coders shipping with Bolt, Lovable, Cursor, Claude Code; CVs don't capture what you shipped at midnight
3. Build Feed — "What's being shipped right now"
4. How it works — Create / Prove / Get found
5. The community — builders already here
6. "For founders and hiring teams" — **$199/month employer subscription** to browse verified builders; no commissions, no middlemen
7. "Built by a builder, for builders" — solo founder origin story, built with Claude Code
8. Footer with all routes

**Stack disclosed publicly**: Claude Code · Supabase · Vercel · Stripe · Resend.

**The hybrid problem made explicit**: the homepage tells the V1 vibe-coder story exclusively. The Atlas (V2) sits in the nav as "Atlas" but the homepage never references it as the primary thing. Intake forms /hire and /claim exist but visitor doesn't know if they funnel into the existing V1 marketplace mechanics or are a separate concierge/matching mechanic.

---

## 5. THE BUILD / CODE MATERIAL PRODUCED

### 5.1 Schema.org JSON-LD implementation (ITEM_1_SCHEMA_ORG_IMPLEMENTATION.md)

Copy-paste-ready templates for all 5 page types. Stored at /mnt/user-data/outputs/ITEM_1_SCHEMA_ORG_IMPLEMENTATION.md, ~2,200 words, 616 lines.

**One-time setup**: `src/components/JsonLd.tsx`

```tsx
import Script from 'next/script';

interface JsonLdProps {
  data: Record<string, any>;
  id: string;
}

export default function JsonLd({ data, id }: JsonLdProps) {
  return (
    <Script
      id={`jsonld-${id}`}
      type="application/ld+json"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

**Page 1 — Homepage**: Organization + WebSite schemas. `src/lib/jsonld/organization.ts` defines both. Organization has `@id`, `name`, `url`, `logo`, `description`, `foundingDate`, `sameAs` (X, GitHub, LinkedIn), `knowsAbout` (AI builders, vibe coding, AI agents, agentic economy, prompt engineering, AI labor market). WebSite includes `potentialAction` SearchAction pointing to `/talent?q={search_term_string}`.

**Page 2 — Jobs**: `JobPosting` for individual jobs, `ItemList` wrapping for `/jobs`. `buildJobPostingJsonLd(job)` function. Required fields per Google: `title`, `description`, `datePosted`, `validThrough`, `employmentType`, `hiringOrganization`, `url`, `directApply: false`. Remote handling: `jobLocationType: "TELECOMMUTE"` + `applicantLocationRequirements`. Optional `baseSalary` MonetaryAmount with currency, value, minValue/maxValue, unitText. Atlas roles surfaced via `occupationalCategory` (comma-joined) and `skills` array.

**Page 3 — Talent**: `Person` for individual builders, `ItemList` wrapping. `buildBuilderJsonLd(builder)` function. Person includes `@id`, `name`, `jobTitle`, `description`, `url`, `worksFor` (references Organization `@id`), optional `image`, `sameAs`, `address` PostalAddress, `hasOccupation` Occupation array (mapped from Atlas roles), `knowsAbout` array (skills). Critical detail: `seeks: Demand` with `"name": "Open to AI builder roles"` when `availableForHire: true` — canonical Schema.org way to mark "open to work."

**Page 4 — Claim**: Reuses Person schema from Page 3. `/claim` landing gets WebPage schema with `isPartOf` referencing Website `@id`.

**Page 5 — Atlas**: `Article` + `DefinedTermSet`. `buildAtlasJsonLd(roles, publishDate, modifiedDate)` returns both. Article has `headline`, `alternativeHeadline`, `description`, `url`, `datePublished`, `dateModified`, `author` (refs Organization), `publisher`, `mainEntityOfPage`, `image`, `keywords`. DefinedTermSet has `hasDefinedTerm` array of DefinedTerm entries with `@id`, `name`, `description`, `inDefinedTermSet`, optional `broaderUrl` for parent relationships and `sameAs` for related roles.

**Suggested commit order**: 5 commits, each independently deployable.
- Commit 1: JsonLd component + homepage (Organization + WebSite) — 30 min
- Commit 2: JobPosting on /jobs listing + individual — 1.5-2 hrs
- Commit 3: Person on /talent listing + individual — 1.5-2 hrs
- Commit 4: Person reuse on /claim + WebPage on /claim landing — 30 min
- Commit 5: Article + DefinedTermSet on /atlas — 1 hr

Total: ~5-6 hours of focused work.

**Validation**: Google Rich Results Test (search.google.com/test/rich-results). Verifiable in Search Console "Enhancements" once indexed.

### 5.2 AgentCard implementation (planned, not yet specified)

Path: `/.well-known/agent-card.json` (NOT `/.well-known/agent.json` — outdated path).

File location in Next.js project: `/public/.well-known/agent-card.json`.

Per current A2A spec at a2a-protocol.org, required fields:
- `name`
- `description`
- `url`
- `version`
- `capabilities` (object with `streaming`, `pushNotifications`, `extensions` sub-fields)
- `supportedInterfaces`
- `defaultInputModes`
- `defaultOutputModes`
- `skills` (array — must map 1:1 to MCP server methods)

Validate against JSON Schema published at a2a-protocol.org (versions v0.2.5, v0.3.0, "latest").

For signed AgentCard: A2A v1.2 uses JSON Web Signature (JWS). Ed25519 or ECDSA-P256 are JWS-compatible algorithms. Private key in Vercel env as `SHIPSTACKED_A2A_SIGNING_KEY` (treat as load-bearing). Public key published at `/.well-known/agent-public-key.pem` or via DID method.

### 5.3 MCP server implementation (planned, not yet specified in code)

Host as separate subdomain: `mcp.shipstacked.com`.

SDK: `@modelcontextprotocol/sdk` (official TypeScript).

Methods to implement (must align with capabilities declared in AgentCard):
- `search_builders(query, filters)` → returns builders matching criteria
- `classify_role(description)` → returns Atlas role ID from free-text description
- `submit_build(build_data)` → submits to Build Feed (auth required)
- `claim_profile(builder_handle)` → initiates claim flow
- `query_atlas(role_id)` → returns role details + related roles
- `list_open_roles()` → returns currently open jobs

Auth model: read methods public, write methods require API key / OAuth.

Submission flow:
1. Build the publisher: `make publisher` then `./bin/mcp-publisher`
2. Namespace: either `io.github.shipstacked/mcp-server` (GitHub OAuth route) or `shipstacked.com/mcp` (DNS challenge — preferred for branding)
3. PR to all three awesome-mcp-servers community repos
4. Register on mcp.so

Source code repo: `shipstacked/mcp-server` (MIT or Apache 2.0, AGENTS.md included).

### 5.4 The complete build order from STEP 7 (verified, ordered)

**S-tier (foundation, ship before anything else)**:
1. Schema.org JSON-LD markup on all 5 page types (~5-6 hrs total)
2. `/.well-known/agent-card.json` AgentCard (~1 hr) — CORRECTED PATH
3. AGENTS.md in every public ShipStacked GitHub repo (~half day total)
4. Atlas open-source on GitHub as `@shipstacked/atlas-roles` (~1 day) — MIT license, JSON Schema, versioned releases
5. MCP server with `mcp-publisher` submission (~2-3 days) — CORRECTED SUBMISSION FLOW
6. NLWeb deployment (~2-3 days)
7. Cross-platform Agent Skill at agentskills.io (~1 day)

**A-tier**:
8. Vibe coding platform templates — REORDERED: Lovable → Cursor → v0 → Replit → Bolt (1-2 days each, 5-10 days total)
9. Claude Plugin Marketplace listing
10. ChatGPT App Directory submission
11. Hugging Face Space + Dataset + smolagent
12. OpenRouter + AI gateway integration registries
13. Stripe Agentic Commerce Suite — CORRECTED to ACP + MPP + x402 + Link Agent Wallet (not UCP)
13a. **NEW: Google AP2** — parallel payment protocol to Stripe ACS
14. x402 endpoint + **Bazaar discovery extension** — BAZAAR ADDED
15. Salesforce AgentExchange — UPDATED NUMBERS
16. AWS Marketplace AgentCore Runtime container — CORRECTED REQUIREMENTS: ARM64, `/mcp` POST endpoint, agent-card.json path
17. Cloudflare Agents SDK example
18. OpenAI Workspace Agents directory

**B-tier**:
19. Signed AgentCard (A2A JWS, not Ed25519-specific) — SIGNING SPEC CLARIFIED
20. GitHub Copilot Extension
21. Microsoft Marketplace Copilot agent
22. Circle Agent Marketplace
23. Directory submissions batch (expanded list, ClaudePluginHub + SkillsMP added)
24. NVIDIA Inception submission
25. Gemini Enterprise Agent Marketplace (with JWS signing)
26. EU AI Act voluntary register + OECD + AI Verify
27. Apple App Store agent listing (deferred to WWDC 2026, June 8-12)
28. Vibe coding platform expansion (rounds 2 + 3)
29. JV positioning (OpenAI Deployment Company + Anthropic-Goldman content/PR play)
30. VC apply batch (YC, Sequoia Arc, a16z Speedrun, Khosla, JFF, Reach, Educapital, Brighteye, Air Street, Achieve Partners)

**Demoted out of beacon track**:
- llms.txt — keep deployed at `/llms.txt` (already shipped), but not classified as primary beacon. Don't lead with it in narrative.

### 5.5 The Noah brief (v3, ready but held)

Stored at /mnt/user-data/outputs/NOAH_BRIEF.md (latest version, sometimes referenced as NOAH_BRIEF_v3.md). ~2,950 words. Title: "The Agentic Economy Distribution Stack."

Structure:
1. The core thesis (60 seconds) — agent layer can't see what isn't machine-readable
2. The stack — 18 items ranked by leverage (after STEP 7 update, expanded to 20 with AP2 and x402 Bazaar)
3. The compounding effect — why this order works
4. TL;DR — the 9 highest-leverage items

Sequencing decision: do not send until ShipStacked has shipped at least 5 S-tier beacons. "Drink own kool-aid first." When sent, framing becomes: "I've been shipping this over the past two weeks; here's the playbook with shipped-it experience."

---

## 6. THE POSITIONING DEBATE — UNRESOLVED

This is the live unresolved problem.

### What was rejected during the debate

- **"Marketplace for AI builders"** — too narrow, pigeonholes into Upwork/Toptal/Mercor comparison set
- **"The registry of the agentic economy's labor layer"** — architecturally accurate but no user identifies with being in a "registry"
- **"The hiring layer of the agentic economy"** — accurate but transactional
- **"Where AI builders get hired"** — dual-sided but still pigeonholes into one population (AI builders), invisible to lawyers/doctors/scientists who use AI
- **"The discovery and classification layer for the labor market of the agentic economy"** — this is what the Atlas itself says ShipStacked is, but it's an analyst/investor sentence, not a user-facing one
- **"The work didn't have a name yesterday. Here's what you do."** — closest to working, but assumes Atlas-as-context which a cold visitor doesn't have

### The four populations that need to land on the homepage

Each has different language and emotional pull:

1. **Vibe coder / agent operator / prompt engineer** — wants recognition, name for what they do, inbound opportunities, peer status. Bounces at "marketplace," "registry," "discovery layer." Lands on naming/identity language.

2. **Employer / founder / hiring manager** — wants certainty the person on the other end can ship the thing, language for what they need (they describe symptoms not roles), speed. Bounces at "discovery layer." Lands on "tell us what's broken, we'll find the person."

3. **Domain expert aggressively using AI** (lawyer, doctor, scientist, banker) — wants status, language for hybrid identity, monetization without leaving primary career, peer recognition from other domain experts. Bounces at "AI builder" (they're a lawyer first). Lands on "[your profession] who's gone deep into AI — there's a name for what you do now."

4. **Traditional engineer upskilling into AI** — wants a path, proof they're not behind, credible roles to apply for. Bounces at "AI-native required." Lands on "the 28 roles being hired in the agentic economy. Find yours."

### The Atlas problem

Thomas pushed back hard on Claude's positioning attempts because they assumed the Atlas as front-door context. The Atlas is:
- 11,335 words
- ~30 minute read
- Extremely dense
- Introduces new taxonomy
- Renames people's existing titles
- Disrupts how the labor market thinks of itself
- Thomas himself is "not as confident in the atlas" as Claude was acting

A cold visitor lands on the homepage with zero Atlas absorption. The positioning has to work without requiring Atlas context — Atlas earns its place as the depth-behind-the-surface for visitors who care to go deep, not as the front door.

### Thomas's final critique that ended the session

> "You just wrote me a book with your answer.. the atlas is similar.. we are border line ai slop at this point"

Real and accurate. Claude was generating 4,000-word responses to recommend writing short homepage copy. Atlas at 11,335 words has same problem at higher stakes. The strategic discipline going forward needs to be: **shorter, sharper, less architectural framing, more direct user-facing language**.

### What's unresolved heading into the new chat

- The user-facing homepage headline that works for all four populations without requiring Atlas absorption
- Whether the Atlas should stay as front-door content or become a footer-link depth surface
- Whether V1 ($199/mo employer subs + Build Feed + Velocity Score) should stay as the primary visible product with V2 as broader frame, or whether V2 absorbs V1
- How to reconcile intake forms (/hire, /claim) with V1 marketplace mechanics
- Whether ShipStacked is *anything* in canonical "X is Y" form at the user-facing level

The session ended with Thomas requesting this transfer doc rather than continuing the positioning work, with explicit instruction to a fresh chat to pick it up cleanly.

---

## 7. PRODUCTION INFRASTRUCTURE — UNCHANGED CARRYOVERS

From all prior handovers, still accurate:

- **Deployment**: Vercel
- **Domain**: shipstacked.com
- **Stack**: Next.js, Claude Code, Supabase, Vercel, Stripe, Resend (publicly disclosed on V1 homepage)
- **DNS load-bearing**: Resend DKIM + SES records on `send.shipstacked.com` — **DO NOT DELETE**
- **Vercel env**: `INTAKE_NOTIFY_EMAIL=ox@agentagous.com` — **load-bearing**
- **Founder email**: hello@shipstacked.com
- **Live routes**: /, /atlas, /hire, /hire/thanks, /hire-confirm, /claim, /claim/thanks, /llms.txt, /feed, /jobs, /leaderboard, /talent, /api-docs, /join, /login

### Tech debt parked (NOT for next session unless explicit)

1. ATLAS_ROLE_LABELS duplicated in `/api/intakes/claim/route.ts` AND `ClaimForm.tsx` — extract to `src/lib/atlas-roles.ts`
2. Heading hierarchy in `ClaimForm` — h2s should be h3s
3. Duplicate `STRIPE_SECRET_KEY` in `.env.local`
4. Hardcoded `CRON_SECRET` in `/api/hire-confirm/nudge/route.ts`
5. `/api/inquiry/route.ts` lacks HTML escaping
6. Next.js 16 middleware deprecation warning — rename `middleware.ts` to `proxy.ts`
7. `hello@shipstacked.com` bidirectional setup (Google Workspace $7/mo OR Cloudflare Email Routing free; NEVER delete SES records on `send.shipstacked.com`)
8. `npm audit` 3 vulnerabilities — low practical risk
9. `ClaimForm.tsx` styling longhand cleanup discrepancy

---

## 8. BEHAVIORAL NOTES FOR THE NEXT CLAUDE

Thomas's working style (consistent across all sessions):

- Sharp, fast, peer-level
- Pushes back when something is wrong; his gut is reliable — dig harder rather than defending the existing answer
- Direct quotes that capture his preferences:
  - "Build once and attract. Beacon type stuff."
  - "DIG don't hold back."
  - "Lets keep it real, human and short, none of this embedded nonsense."
  - "Look at the entire ai space."
  - "Don't put dates on what gets done on which date."
  - "You just wrote me a book... we are border line ai slop at this point" (this session)

What this means in practice for next Claude:
- **Don't pad responses with autobiography, filler, or excessive architectural framing**
- **Don't write 4,000-word answers when 200 will do**
- **Don't introduce three "questions that will decide your future" — work the problem and come back with substance**
- **Don't push for breaks Thomas doesn't want**
- **Don't declare work committed without verifying git state**
- **Don't delete DNS records or env vars without confirming load-bearing status**
- **Spanish legal practice context is anonymized always — never name it**
- **Treat Thomas as a peer**
- **When positioning gets stuck, generate concrete short alternatives (e.g., 5 candidate headlines, one line each) rather than another framework essay**

### Files Thomas has locally in Downloads (durable failsafes)

1. SHIPSTACKED_HANDOVER.md (39KB)
2. ATLAS_V0.3_FULL.md (80KB, also at src/content/atlas-v03.md)
3. HANDOVER_ADDENDUM_STEP4.md (14KB)
4. HANDOVER_STEP5_INFLECTION.md (28KB)
5. HANDOVER_STEP6_ROLLOUT.md (57KB — strategic blueprint, 30 build items)
6. HANDOVER_STEP7_VERIFIED_CORRECTIONS.md (27KB — fact-checked deltas + AP2 + Bazaar additions)
7. ITEM_1_SCHEMA_ORG_IMPLEMENTATION.md (20KB — copy-paste-ready Next.js code)
8. NOAH_BRIEF.md (latest version, ~20KB, held for send after shipping)
9. HANDOVER_STEP8_SESSION_TRANSFER.md (this document)

---

*End of session transfer. The unresolved positioning question is the live problem for the next chat. Everything else above is settled context.*
