# Orion PM — AI-Powered PM Command Center

> Your AI co-pilot for project management. Daily briefs, sprint tracking, and automated reporting — built for modern PMs.

![Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![Stack](https://img.shields.io/badge/Stack-TypeScript-blue)
![AI](https://img.shields.io/badge/AI-Claude%20%2B%20n8n-D97757)

## What It Is

Orion PM is an AI-powered command center designed for Senior PMs and Scrum Masters managing multiple teams or complex delivery environments. It replaces fragmented morning routines — checking Jira, Slack, email, and dashboards separately — with a single AI-generated brief and action surface.

## The Problem

Senior PMs lose 60-90 minutes daily to information gathering before they can make a single prioritization decision. Orion eliminates that overhead.

## Core Features

| Feature | Description | Status |
|---|---|---|
| **Daily AI Brief** | Morning summary of overdue work, sprint health, blockers, follow-ups and priorities on the dashboard, with an optional AI-written summary ([spec](docs/specs/daily-brief.md)) | ✅ Built |
| **Sprint Tracker** | Real-time velocity, burndown, and risk flags across multiple teams | 🟡 In Dev |
| **Automated Reporting** | Stakeholder-ready reports generated from live project data | 🔲 Planned |
| **Retrospective Assistant** | AI-facilitated retro prompts and action item capture | 🔲 Planned |
| **Risk Radar** | Early warning system for scope creep, dependency blocks, and team capacity | 🔲 Planned |

## Tech Stack

- **Frontend:** TypeScript / React
- **AI Layer:** Claude API (Anthropic)
- **Automation:** n8n workflows
- **Built with:** Lovable

## Design Philosophy

Built by a PM, for PMs. Every feature comes from a real pain point experienced across 9+ years managing cross-functional teams in Healthcare, Fintech, and SaaS.

Agile-native: designed to complement Scrum, Nexus, and Kanban workflows — not replace them.

## Roadmap

- [ ] Public beta launch
- [ ] Jira / Linear integration
- [ ] Slack digest connector
- [ ] Multi-team Nexus dashboard
- [ ] Mobile-first view

## Author

**Herber Giovanni Perez** — Senior Technical PM based in Guatemala City 🇬🇹
[LinkedIn](https://linkedin.com/in/herber-perez) · [GitHub](https://github.com/HperezSM)
