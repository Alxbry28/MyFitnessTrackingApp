# Tools and Apps Used by IT Roles

**Date:** October 19, 2026  
**Status:** Reference / learning note  
**Related:** [01_sdlc_roles_and_scenarios.md](./01_sdlc_roles_and_scenarios.md), [03_build_process_and_notion_tracker.md](./03_build_process_and_notion_tracker.md)  
**Note:** New standalone file. Does not change existing plan or user-story files.

---

## 1. How to read this

Nobody uses every app below. A company picks a **stack** (e.g. Jira + Confluence + GitHub + Azure + Figma). A solo builder picks a **small set** (e.g. Notion + VS Code/Cursor + Git + Expo).

Names in **bold** are the ones you will see most often in job ads and offices.

**Solo (this fitness app)** = a realistic substitute when you are one person.

---

## 2. Shared tools almost everyone touches

These are not owned by one role. The whole team lives here.

| Job | Common apps | Solo substitute |
|---|---|---|
| Talk | **Teams**, **Slack**, Zoom, email | Messenger / whatever you already use |
| Track work | **Jira**, Azure Boards, Linear, Asana, Monday, **Notion**, Trello | **Notion** (see doc 03) |
| Write specs | **Confluence**, Notion, Google Docs, Word, SharePoint | Markdown in `1_docs/` |
| Meetings | Calendar, Miro, FigJam | Notes file + diagrams in Markdown |
| Identity | Microsoft **Entra ID** (Azure AD), Okta, Google Workspace | Your Microsoft / Google account |

---

## 3. Tools by role

### 3.1 Product and business

#### Product Owner / Product Manager

| They need to | Typical apps |
|---|---|
| Backlog, roadmap, releases | **Jira**, **Productboard**, Aha!, Linear, Azure Boards |
| Analytics (did people use it?) | **Google Analytics**, Mixpanel, Amplitude, Firebase Analytics, Metabase |
| Feedback | UserVoice, Canny, Intercom, App Store Connect / Play Console reviews |
| Specs | Confluence, Notion, Google Docs |
| Prototypes to click | Figma (view), Maze |

**Solo:** Notion Work database + this repo. Analytics can wait until you have users.

#### Business Analyst

| They need to | Typical apps |
|---|---|
| Stories, rules, acceptance criteria | **Jira**, Azure DevOps, Confluence |
| Process maps | **Visio**, **draw.io / diagrams.net**, Lucidchart, Miro, BPMN tools |
| Requirements workshops | Miro, FigJam, Excel |
| Traceability (story ↔ test) | Jira + Xray/Zephyr, or a spreadsheet |
| Data samples | Excel, Google Sheets |

**Solo:** `user_story/*.md` + workflow diagrams. Excel if you need sample food rows.

#### Project Manager / Delivery Manager

| They need to | Typical apps |
|---|---|
| Plan and dates | **MS Project**, Jira Advanced Roadmaps, Smartsheet, Excel |
| Status | PowerPoint, Confluence status pages, Teams |
| Risk / budget | Excel, Smartsheet |
| Vendors | Email, contracts in SharePoint |

**Solo:** `plan/08_october_sprint.md` plus Notion dates. You do not need MS Project.

#### Scrum Master

| They need to | Typical apps |
|---|---|
| Board and velocity | **Jira**, Azure Boards, Linear |
| Retro | Miro, FunRetro, TeamRetro, sticky notes |
| Timer / standup | Teams, Slack huddles |

**Solo:** skip. The Doing view in Notion is enough.

#### SME / stakeholder

| They need to | Typical apps |
|---|---|
| Review screens | Figma comment mode, staging URL, TestFlight / Play internal track |
| Sign UAT | Email, Excel checklist, Jira “Done” |
| Domain tools | Whatever their job already uses (Excel food logs, gym software) |

**Solo:** you are the SME — use the real app on your phone.

#### Legal / Privacy / GRC

| They need to | Typical apps |
|---|---|
| Policies and contracts | Word, SharePoint, DocuSign |
| Privacy / DPIA | OneTrust, TrustArc, spreadsheets |
| Vendor risk | ServiceNow GRC, Excel |
| Store legal answers | App Store Connect, Google Play Console |

**Solo:** a short privacy note in Settings when you publish. No OneTrust.

---

### 3.2 Design and research

#### UX Researcher

| They need to | Typical apps |
|---|---|
| Interviews | Zoom, Teams, Otter, Dovetail |
| Tests | **Maze**, UserTesting, Lookback, PlaybookUX |
| Notes | Dovetail, Notion, Miro |
| Surveys | Google Forms, Typeform, Qualtrics |

#### UI / UX Designer

| They need to | Typical apps |
|---|---|
| Wireframe + UI | **Figma** (dominant), Sketch (older Mac), Adobe XD (fading), Penpot |
| Design system | Figma libraries, Storybook (with frontend) |
| Whiteboard | FigJam, Miro |
| Handoff | Figma Inspect, Zeplin (legacy) |
| Icons / assets | Figma, Illustrator, SVG repos |

**Solo:** paper + Figma free, or go screen-by-screen in Expo. Do not block coding on a perfect Figma file.

#### Content designer

Google Docs, Figma, Notion, CMS preview, Grammarly.

#### Accessibility specialist

| They need to | Typical apps |
|---|---|
| Screen readers | **VoiceOver** (iOS/Mac), **TalkBack** (Android), NVDA / JAWS (Windows) |
| Contrast / WCAG | axe DevTools, Lighthouse, Colour Contrast Analyser, WAVE |
| Design check | Figma a11y plugins |

---

### 3.3 Engineering leadership

#### Architect / Tech Lead / Engineering Manager

| They need to | Typical apps |
|---|---|
| Diagrams | **draw.io**, Lucidchart, PlantUML, Mermaid, Structurizr (C4) |
| Decisions | Confluence ADRs, GitHub, Notion |
| Code review | **GitHub**, **GitLab**, **Azure Repos** / Azure DevOps, Bitbucket |
| IDE (tech lead still codes) | Same as developers |
| People (EM only) | Lattice, Workday, email — not engineering tools |

**Solo:** Mermaid in Markdown + Cursor/VS Code + git.

---

### 3.4 Developers

#### Frontend (web)

| Job | Typical apps |
|---|---|
| Editor | **VS Code**, **Cursor**, WebStorm |
| Runtime / browser | **Chrome DevTools**, Firefox, Edge |
| Frameworks (libraries, not “apps”) | React, Next.js, Vue, Angular |
| Inspect API | browser Network tab, **Postman**, Insomnia, Thunder Client |
| UI kit | Storybook, Figma |
| Hosting | Vercel, Netlify, Azure Static Web Apps, GitHub Pages |

#### Mobile

| Job | Typical apps |
|---|---|
| Editor | **VS Code**, **Cursor**, Android Studio, Xcode |
| Run on device | **Expo Go**, **Android Emulator**, **iOS Simulator**, USB debugging |
| Native IDEs | **Android Studio** (Gradle, Logcat), **Xcode** (iOS signing) |
| Stores | **Google Play Console**, **App Store Connect**, Fastlane, **EAS** (Expo) |
| Crash / devices | Firebase Crashlytics, Sentry |
| Design | Figma |

**This project:** Cursor or VS Code, Expo Go on your phone, later EAS + Play Console.

#### Backend / API (.NET and others)

| Job | Typical apps |
|---|---|
| Editor | **Visual Studio**, **VS Code**, **Cursor**, Rider |
| API | **Postman**, Insomnia, REST Client, Swagger / **OpenAPI** UI |
| Runtime | **Kestrel** / IIS (ASP.NET), Docker Desktop |
| Logs | Seq, Application Insights, Serilog files |
| Queue / jobs | Azure Service Bus, Hangfire, RabbitMQ (when needed) |

**This project (later):** Visual Studio or Cursor + ASP.NET Core + Swagger.

#### Full-stack

The union of frontend + backend tools. Same git remote.

#### Data engineer / ML

| Job | Typical apps |
|---|---|
| Transform | dbt, Spark, Azure Data Factory, Airflow |
| Warehouse | Snowflake, BigQuery, Databricks, Synapse |
| Notebooks | Jupyter, Databricks, VS Code |
| ML | Python, PyTorch, Azure ML, Vertex, OpenAI / Gemini APIs |

**Solo nutrition v1:** none. A later AI parse endpoint is just the .NET API + an LLM provider dashboard.

---

### 3.5 Data, cloud, infra, security

#### DBA

| Job | Typical apps |
|---|---|
| Query and design | **SQL Server Management Studio (SSMS)**, **Azure Data Studio**, **pgAdmin**, DBeaver, DataGrip, MySQL Workbench |
| Diagrams | SSMS diagrams, dbdiagram.io, draw.io |
| Backup / jobs | SSMS, pgBackRest, cloud backup blades |
| Monitor | SQL Profiler, Extended Events, pg_stat, Azure SQL metrics |

**This project:** SQLite on the phone. Inspect with **DB Browser for SQLite** or a debug screen. Later: pgAdmin or Azure Data Studio for Postgres.

#### IT Infra and Network

| Job | Typical apps |
|---|---|
| Devices | Cisco / UniFi / Fortinet consoles, **Windows Admin Center** |
| Monitor | **PRTG**, SolarWinds, Zabbix, Nagios, Grafana |
| Remote | **RDP**, SSH (PuTTY / Windows Terminal), TeamViewer, Intune |
| DNS / certs | Domain registrar, IIS, Let’s Encrypt / ACME |
| Tickets | **ServiceNow**, Jira Service Management, Freshservice |
| Docs | Visio network diagrams |

**Solo:** your home Wi-Fi and a phone. No ServiceNow.

#### Cloud Admin

| Job | Typical apps |
|---|---|
| Console | **Azure Portal**, AWS Console, GCP Console |
| Automation | **Bicep**, Terraform, ARM, CloudFormation, Pulumi |
| CLI | **Azure CLI**, AWS CLI, PowerShell, `gcloud` |
| Cost | Azure Cost Management, AWS Cost Explorer |
| Identity | Entra ID, IAM |
| Containers | AKS / EKS, **Docker Desktop**, Kubernetes Dashboard |

**This project:** none in October. Later: Azure Portal if the .NET API lives there, or Supabase dashboard.

#### DevOps / Platform / CI-CD

| Job | Typical apps |
|---|---|
| Git host | **GitHub**, **GitLab**, **Azure DevOps** |
| Pipelines | **GitHub Actions**, Azure Pipelines, GitLab CI, Jenkins |
| Artifacts | GitHub Packages, Azure Artifacts, Docker Hub, ACR |
| IaC | Terraform, Bicep, Ansible |
| Secrets | **GitHub Secrets**, Azure Key Vault, HashiCorp Vault |
| Mobile builds | **EAS Build**, Fastlane, App Center (legacy) |

**Solo:** `git` + GitHub (optional) + EAS when you want an APK.

#### SRE

| Job | Typical apps |
|---|---|
| Metrics | **Prometheus**, **Grafana**, Datadog, New Relic, Azure Monitor |
| Logs | **ELK/OpenSearch**, Loki, Application Insights, CloudWatch |
| Alerts / on-call | **PagerDuty**, Opsgenie, Grafana OnCall |
| Incidents | Statuspage, FireHydrant, Notion/Confluence postmortem |
| Errors | **Sentry**, Crashlytics |

#### Sysadmin

**Active Directory / Entra**, Group Policy, **Intune**, WSUS / Windows Update, **PowerShell**, Hyper-V / vSphere, backup software (Veeam).

#### Cybersecurity / AppSec

| Job | Typical apps |
|---|---|
| Tickets / findings | Jira, ServiceNow, GitHub Security |
| SAST / dependencies | **GitHub Dependabot**, Snyk, SonarQube, Azure DevOps scans |
| Secrets in git | git-secrets, GitHub secret scanning |
| API / app test | **OWASP ZAP**, Burp Suite (pro for pentesters) |
| Cloud posture | Microsoft Defender for Cloud, AWS Security Hub, Prisma |
| Identity | Entra ID Conditional Access, PIM |
| Docs | threat-model in draw.io / OWASP Threat Dragon |

**Solo:** do not ship API keys in the app; use HTTPS later; Dependabot if you use GitHub. You do not need Burp every day.

#### SOC analyst

**Microsoft Sentinel**, Splunk, QRadar, Defender, CrowdStrike, email security (Exchange / Proofpoint). Watch dashboards; not a build tool.

#### IAM specialist

Entra ID, Okta, CyberArk / PAM, Privileged Identity Management.

#### Pen tester (often vendor)

**Burp Suite**, Nmap, OWASP ZAP, Kali toolset, written report in Word/PDF. Only on **authorized** systems.

---

### 3.6 Quality

#### Manual QA

| Job | Typical apps |
|---|---|
| Cases | **TestRail**, Zephyr / Xray (Jira), Azure Test Plans, Excel, Notion |
| Bugs | **Jira**, GitHub Issues, Azure Boards |
| Devices | Real phones, **BrowserStack**, Sauce Labs, Firebase Test Lab |
| Explore | Chrome, the installed APK, Charles / Proxyman (see traffic) |
| Evidence | screenshots, Loom, snipping tool |

**Solo:** Notion Bugs + a checklist in Markdown + your own phone.

#### QA automation

**Playwright**, Cypress, Selenium (web); **Detox**, Maestro, Appium (mobile); **REST Assured** / http tests; run inside **GitHub Actions**. IDE: VS Code or the language’s IDE.

#### Performance tester

**JMeter**, k6, Locust, Azure Load Testing, Visual Studio Load (legacy). Grafana to read results.

#### UAT (business)

Staging app, Excel sign-off, email. Not an engineering IDE.

---

### 3.7 Release and support

#### Release manager

GitHub Releases, Azure DevOps Release, **App Store Connect**, **Play Console**, Confluence change calendar, ServiceNow change request.

#### Technical writer

Confluence, Notion, **GitBook**, Markdown in repo, MadCap Flare (enterprise), screenshots (Snagit).

#### Support / helpdesk

**ServiceNow**, **Jira Service Management**, Zendesk, Freshdesk, Intercom, Teams. For your app: email to yourself and a FAQ page.

#### Customer success (B2B)

Salesforce, HubSpot, Calendly — sales/CRM, not build tools.

---

## 4. One-page map (role → “home app”)

If you remember only one tool per role:

| Role | Home app |
|---|---|
| PO / PM | Jira or Productboard |
| BA | Jira + Visio / draw.io |
| Designer | **Figma** |
| Architect | draw.io + wiki |
| Tech lead / developers | **GitHub** + **VS Code / Visual Studio / Cursor** |
| Mobile | **Expo / Android Studio / Xcode** |
| DBA | **SSMS** or **pgAdmin** / DBeaver |
| Cloud | **Azure Portal** (or AWS) |
| DevOps | **GitHub Actions** / Azure Pipelines |
| Infra | ServiceNow + network console |
| Security | Defender / ZAP / GitHub Security |
| QA | TestRail or Jira + real devices |
| Support | ServiceNow or Zendesk |
| SRE | Grafana + PagerDuty |

---

## 5. What *you* should install for this fitness app

You are wearing PO, BA, designer, mobile, QA. Do not install the company catalog.

| Role you are playing | App to use now |
|---|---|
| Tracker | **Notion** (Work database) |
| Specs | this repo in **Cursor** |
| Code | **Cursor** or VS Code |
| Git | **Git** (+ GitHub when you want a remote) |
| Run the app | **Expo Go** on your phone; Node.js on the PC |
| See SQLite | DB Browser for SQLite, or a debug screen |
| Design (optional) | Figma free, or skip |
| Later API | **Visual Studio** or Cursor + **Postman** |
| Later cloud | Azure Portal or Supabase |
| Later store | Play Console (and App Store Connect if iOS) |

Company tools (Jira, ServiceNow, Sentinel, Burp on a schedule) appear when there is a team, production, and auditors — not when you are still logging taho on a local SQLite file.

---

## 6. Scenario: same feature, different apps

**Feature:** scan barcode → remaining calories.

| Role | Opens |
|---|---|
| PO | Jira ticket / your Notion card |
| BA | Confluence story / `user_story` markdown |
| Designer | Figma scanner frame |
| Mobile dev | Cursor + Expo Go + Chrome (for OFF JSON) |
| Backend (later) | Visual Studio + Postman + Swagger |
| DBA (later) | Azure Data Studio on Postgres |
| QA | TestRail case + physical grocery barcode |
| Security | Dependabot + “no key in the APK” |
| Support | Zendesk macro: “allow camera permission” |

Same process as docs 01–03. Only the **windows on the desktop** change.
