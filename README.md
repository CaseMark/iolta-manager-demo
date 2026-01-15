# IOLTA Manager

**AI-Powered Trust Account Management for Law Firms**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)](https://nextjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8)](https://tailwindcss.com)

## Overview

IOLTA Manager is a modern trust account management application built for law firms. It provides comprehensive tracking of client funds, matter balances, transactions, and holds—with AI-powered document extraction to automate data entry from settlement statements, ledgers, and other legal documents.

**No sign-up required.** Start using the app immediately - all data is stored locally in your browser.

## Features

### Trust Account Management
- **Clients**: Track client information and contact details
- **Matters**: Manage legal matters with automatic balance calculations
- **Transactions**: Record deposits and disbursements with full audit trail
- **Holds**: Place and release holds on matter funds (liens, escrow, etc.)

### AI Document Extraction
- **Matter Extraction**: Extract client info, settlement breakdowns, transactions, and holds from legal documents
- **Transaction Extraction**: Parse bank statements and ledgers to auto-populate transactions
- **Supported Formats**: PDF, DOCX, and TXT files
- **OCR Processing**: Automatic text extraction from scanned documents via Case.dev API

### Compliance & Reporting
- **Monthly Trust Summary**: Overview of all trust account activity
- **Three-Way Reconciliation**: Compare bank statements, ledgers, and client balances
- **Client Ledger**: Detailed transaction history per client
- **Export Formats**: PDF and DOCX report generation
- **Audit Log**: Complete history of all actions for compliance

### Dashboard
- Real-time trust balance overview
- Active matters count
- Recent transactions
- Pending holds summary

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com) + [Shadcn UI](https://ui.shadcn.com)
- **Fonts**: Instrument Serif (headings), Inter (body), JetBrains Mono (code)
- **Icons**: [Phosphor Icons](https://phosphoricons.com)
- **Storage**: IndexedDB via [Dexie.js](https://dexie.org)
- **AI/OCR**: [Case.dev SDK](https://case.dev)
- **Package Manager**: [Bun](https://bun.sh)

## Database Configuration

IOLTA Manager uses **IndexedDB** via [Dexie.js](https://dexie.org) for client-side data storage. This provides:

- **Zero server setup**: Data is stored directly in the browser
- **Offline capability**: Full functionality without internet connection
- **Privacy**: Sensitive client data never leaves the user's device
- **Multi-table support**: Clients, Matters, Transactions, Holds, Audit Logs, Reports, Settings

### Data Schema

```
iolta-manager-db
├── clients         (id, name, email, phone, address, createdBy, organizationId)
├── matters         (id, clientId, name, matterNumber, type, status, createdBy)
├── transactions    (id, matterId, type, amount, description, payee, createdBy)
├── holds           (id, matterId, amount, holdType, status, createdBy)
├── auditLogs       (id, entityType, entityId, action, details, userId, timestamp)
├── reportHistory   (id, reportType, reportName, generatedBy, status)
└── trustAccountSettings (id, accountName, bankName, accountNumber, createdBy)
```

All queries are scoped by an anonymous `userId` for data isolation.

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/CaseMark/iolta-manager-demo.git
cd iolta-manager-demo
bun install
```

### 2. Configure Environment (Optional)

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Demo Usage Limits (optional - defaults shown)
NEXT_PUBLIC_DEMO_SESSION_HOURS=24
NEXT_PUBLIC_DEMO_SESSION_PRICE_LIMIT=5

# Case.dev SDK (required for AI document extraction)
CASE_API_KEY=sk_case_...

# Vercel Blob Storage (required for PDF/DOCX OCR in production)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Get your Case.dev API key from the [Case.dev Console](https://console.case.dev).

### 3. Run Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Case.dev API Pricing

IOLTA Manager uses the Case.dev API for AI-powered document extraction and OCR processing.

### API Endpoints Used

| Endpoint | Purpose | Pricing |
|----------|---------|---------|
| `/ocr/v1/process` | Convert PDF/DOCX to text | Per page processed |
| `/llm/v1/extract` | AI structured data extraction | Per 1K tokens |

### Processing Limits

| Operation | Character Limit |
|-----------|-----------------|
| Matter Extraction | 30,000 characters |
| Transaction Extraction | 15,000 characters |

### Usage Limits

The demo application includes session-based usage limits:

- **Session Duration**: 24 hours (configurable)
- **Cost Limit**: $5 USD per session (configurable)
- **Request Timeout**: 90 seconds for OCR processing

Once limits are reached, create an account at [console.case.dev](https://console.case.dev) for unlimited access with your own API key.

## Project Structure

```
iolta-manager-demo/
├── app/
│   ├── (protected)/          # App routes
│   │   ├── dashboard/        # Main dashboard
│   │   ├── clients/          # Client management
│   │   ├── matters/          # Matter management
│   │   ├── transactions/     # Transaction records
│   │   ├── holds/            # Hold management
│   │   ├── reports/          # Report generation
│   │   ├── audit/            # Audit log viewer
│   │   └── settings/         # Account settings
│   └── api/
│       ├── extract-matter/   # Matter extraction API
│       └── extract-transaction/  # Transaction extraction API
├── components/
│   ├── layout/               # Sidebar, page headers
│   ├── demo/                 # Usage limit UI components
│   ├── ui/                   # Shadcn UI components
│   ├── document-extractor.tsx    # Matter extraction UI
│   ├── transaction-extractor.tsx # Transaction extraction UI
│   └── report-preview.tsx    # Report preview/export
├── lib/
│   ├── contexts/             # React contexts (user, usage)
│   ├── case-dev/             # Case.dev SDK client
│   ├── export/               # PDF/DOCX generation
│   ├── storage/              # IndexedDB operations
│   └── usage/                # Demo usage tracking
├── types/                    # TypeScript definitions
└── skills/                   # AI agent documentation
```

## For AI Agents

This repository includes instructional documentation for AI coding assistants:

1. **Context**: Read `AGENTS.md` for project architecture
2. **Skills**: Check `skills/` directory for implementation patterns
   - `skills/case-dev/`: OCR and extraction workflows
   - `skills/database/`: Storage patterns
   - `skills/demo-limits/`: Usage limit implementation
   - `skills/export/`: Report generation

## License

This project is licensed under the [Apache 2.0 License](LICENSE).
