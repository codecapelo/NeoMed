# Estrutura de Dados NeoMed (Atual)

Este documento descreve a estrutura ativa usada pela API em produção (`netlify/functions/api.js`).

## Banco ativo (produção)

A API usa PostgreSQL e cria/atualiza o schema automaticamente no startup da função.

### Tabelas principais

- `neomed_users`
  - usuários da plataforma
  - campos principais: `id`, `email` (único), `password_hash`, `name`, `role`, `created_at`, `last_seen_at`

- `neomed_user_data`
  - dados clínicos por usuário em JSONB
  - chave composta: `(user_id, data_type)`
  - `data_type`: `patients`, `prescriptions`, `appointments`, `medicalRecords`

- `neomed_mevo_documents`
  - histórico/status de documentos emitidos para integração Mevo
  - campos principais: `prescription_id`, `patient_id`, `document_type`, `status`, `provider_*`, `raw_response`, `error_message`

## Modelo de autenticação

- Login/registro retornam token JWT.
- O token autentica todas as rotas de dados.
- Primeiro usuário registrado recebe papel `admin`; os seguintes, `doctor`.

## API de dados

- `GET /api/all`: retorna payload consolidado (`patients`, `prescriptions`, `appointments`, `medicalRecords`)
- `POST /api/saveAll`: persiste payload consolidado
- Endpoints por tipo também existem (`/api/patients`, `/api/prescriptions`, etc.)

## Ambiente local

No desenvolvimento local, `server.js` fornece uma API compatível com as rotas acima usando arquivos JSON em `../data`.

## Documento legado

O arquivo `neomed_database.sql` permanece apenas como referência histórica de uma modelagem antiga (MySQL), e não representa o schema atual em produção.
