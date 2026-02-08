# NeoMed - Sistema de Gestão Médica

Sistema completo para gerenciamento de prescrições, prontuários médicos, receitas e acompanhamento de pacientes com integração CID-11 e sugestões de condutas terapêuticas baseadas em diretrizes americanas e brasileiras.

## Funcionalidades

### Cadastro e Gerenciamento de Pacientes
- Registro detalhado de dados pessoais e histórico clínico
- Integração com CID-11 para classificação da condição clínica
- Sugestões automáticas de condutas terapêuticas

### Registro e Atualização de Prontuários
- Armazenamento seguro de históricos médicos
- Visualização e edição de registros com histórico

### Emissão e Gerenciamento de Receitas Médicas
- Aba dedicada para seleção de medicamentos
- Definição de dosagem, posologia e instruções
- Montagem de prescrição completa

### Acompanhamento de Pacientes
- Agendamento de consultas e lembretes
- Monitoramento de tratamentos com notificações

### Atualização Dinâmica de Conteúdo
- Importação de arquivos para atualização do banco de dados
- Manutenção contínua de medicações e diretrizes

## Tecnologias Utilizadas

- **Frontend**: React.js, TypeScript, Material UI
- **Gerenciamento de Estado**: React Hooks, Context API
- **Roteamento**: React Router
- **Validação**: Formik, Yup
- **Requisições HTTP**: Axios, React Query

## Começando

### Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

### Instalação

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/neomed.git
cd neomed
```

2. Instale as dependências
```bash
npm install
```

3. Execute o projeto em modo de desenvolvimento
```bash
npm start
```

A aplicação estará disponível em `http://localhost:3000`.

## Estrutura do Projeto

```
neomed/
├── public/
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── patients/
│   │   ├── prescriptions/
│   │   └── medical-records/
│   ├── pages/
│   ├── context/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── package.json
└── README.md
```

## Contribuindo

1. Faça um fork do projeto
2. Crie sua branch de feature (`git checkout -b feature/nome-da-feature`)
3. Commit suas alterações (`git commit -m 'Adiciona feature xyz'`)
4. Push para a branch (`git push origin feature/nome-da-feature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.

## Contato

Equipe NeoMed - contato@neomed.med.br
