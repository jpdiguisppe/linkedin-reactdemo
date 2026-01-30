# LinkedIn Login Demo

A minimal full-stack demo implementing **Sign in with LinkedIn** using OAuth 2.0 / OpenID Connect.

## Tech Stack
- React (Vite)
- Node.js + Express
- OAuth 2.0 Authorization Code Flow
- LinkedIn OpenID Connect

## Project Structure
/backend – handles OAuth code exchange and profile retrieval
/frontend – React UI that initiates login and displays user info

## What it demonstrates
- Secure frontend ↔ backend separation
- OAuth redirect + authorization code exchange
- Environment-based secrets management
- Authenticated API calls and conditional UI rendering

## Why I built this
I built this project to understand how real-world authentication works beyond basic tutorials, and how modern frontend apps securely interact with backend services.
