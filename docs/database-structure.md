# Estrutura do Banco de Dados NeoMed

Este documento descreve a estrutura do banco de dados do aplicativo NeoMed, um sistema especializado para gestão médica com foco em medicamentos e cálculos de dose pediátrica.

## Visão Geral

O banco de dados NeoMed foi projetado para gerenciar:

- Pacientes e seus dados clínicos
- Medicamentos e prescrições
- Consultas médicas
- Documentação clínica
- Cálculos de dose pediátrica
- Controle de acesso

A estrutura completa do banco de dados está implementada no arquivo `neomed_database.sql`.

## Entidades Principais

### Pacientes (`patients`)

Armazena informações sobre os pacientes atendidos pelo sistema:
- Dados pessoais (nome, data de nascimento, gênero)
- Informações de contato
- Histórico médico básico

### Medicamentos (`medications`)

Catálogo completo de medicamentos disponíveis:
- Informações farmacêuticas
- Dosagens e formas de administração
- Contraindicações e efeitos colaterais

### Prescrições (`prescriptions` e `prescription_items`)

Sistema de emissão e gestão de receitas médicas:
- Ligação entre médico, paciente e medicamentos
- Instruções detalhadas de dosagem e administração
- Validade e status da prescrição

### Registros Médicos (`medical_records`)

Histórico completo de atendimentos:
- Consultas e procedimentos
- Diagnósticos com código ICD
- Tratamentos recomendados

### Consultas (`appointments`)

Agendamento e gerenciamento de consultas médicas:
- Data e horário
- Médico responsável
- Status e acompanhamento

### Cálculos de Dose Pediátrica (`pediatric_dose_calculations`)

Sistema especializado para cálculo seguro de dosagens pediátricas:
- Fórmulas e operações de cálculo por medicamento
- Doses máximas permitidas
- Agrupamento por tipo de medicamento

## Fórmulas de Cálculo de Dose Pediátrica

Os cálculos de dose pediátrica seguem uma lógica específica baseada no peso da criança:

1. A tabela `pediatric_dose_calculations` armazena os medicamentos e suas operações de cálculo
2. O campo `operation` contém o operador matemático (geralmente multiplicação - `*`)
3. O valor após o operador é o fator de multiplicação pelo peso da criança
4. O campo `maximum_dose` estabelece um limite superior para a dose calculada
5. O resultado é expresso na unidade definida no campo `unit` (gotas, ml, mg, etc.)

Exemplo de cálculo:
- Para "Dipirona Gotas 500mg/ml" com operação "*1" e dose máxima "40"
- Uma criança de 15kg receberá: 15 × 1 = 15 gotas por dose
- Se o peso for 45kg, a dose seria limitada a 40 gotas (dose máxima)

## Segurança e Auditoria

O sistema implementa várias camadas de segurança:

- Autenticação de usuários (`users`)
- Controle de acesso baseado em funções (`user_roles` e `user_permissions`)
- Registro de auditoria para todas as operações (`audit_logs`)

## Relacionamentos

A integridade referencial é mantida através de chaves estrangeiras:

- Pacientes → Alergias, Registros Médicos, Prescrições, Consultas
- Usuários → Prescrições, Registros Médicos, Consultas, Logs
- Medicamentos → Itens de Prescrição

## Considerações para Implementação

Ao implementar a interface com este banco de dados, observe:

1. Use UUIDs (VARCHAR(36)) como identificadores primários
2. Implemente validação de dados do lado do cliente e do servidor
3. Mantenha registros de auditoria para todas as operações sensíveis
4. Calcule doses pediátricas com precisão usando as fórmulas definidas
5. Garanta a segurança dos dados do paciente em todos os momentos 