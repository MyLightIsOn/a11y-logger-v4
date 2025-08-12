# Accessibility Bug Logger

An AI-powered accessibility issue tracking platform with a Supabase-backed database, Next.js (React) web app, and Chrome extension integration. The system is designed to streamline accessibility testing, automate compliance documentation, and support real-time collaboration between auditors, developers, and compliance teams.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Database Schema](#database-schema)
5. [Installation](#installation)
6. [Development](#development)
7. [Contributing](#contributing)

---

## Overview

The Accessibility Bug Logger enables users to log, classify, and track accessibility issues in digital products. It integrates automated AI enrichment for issues, generates VPATs, and provides dashboards to monitor compliance.

**Core Concepts:**

* **Projects** → **Assessments** → **Issues**
* AI-assisted logging with WCAG classification and recommended fixes
* VPAT automation and compliance tracking
* Multi-role support for auditors, developers, and compliance officers

---

## Tech Stack

**Frontend:**

* Next.js (React) with Tailwind CSS
* Server-Side Rendering (SSR) & Incremental Static Regeneration (ISR)

**Backend & AI:**

* Supabase (PostgreSQL)
* Next.js API routes for server-side calls
* OpenAI SDK for AI enrichment
* Cloudinary for image storage and management
* JWT Authentication

**Browser Extension:**

* Vue 3 + Vite
* Chrome Manifest V3

---

## Features

* **AI-Powered Issue Logging**: Auto-generates titles, summaries, code fix suggestions, and WCAG mappings.
* **Real-Time Dashboards**: Severity breakdowns and trend analysis.
* **VPAT Automation**: Create and update compliance documentation directly from logged issues.
* **Integrations**: GitHub, Jira, Trello, Slack notifications.

---

## Database Schema

The core entities include:

* **users**: Authentication and profile data.
* **projects**: Top-level grouping for assessments.
* **assessments**: Collections of related issues under a project.
* **issues**: Accessibility issues with AI-enriched details.

---

## Installation

1. **Clone the Repository**

```bash
git clone https://github.com/your-org/a11y-bug-logger.git
cd a11y-bug-logger
```

2. **Install Dependencies**

```bash
npm install
```

3. **Set Up Environment Variables**
   Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
OPENAI_API_KEY=your_openai_key
```

4. **Run the Development Server**

```bash
npm run dev
```
