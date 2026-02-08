import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Divider,
  IconButton,
  Chip,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Tooltip,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Print as PrintIcon,
  Medication as MedicationIcon,
  Send as SendIcon,
  CalculateOutlined as CalculateIcon,
  Info as InfoIcon,
  CloudUpload as CloudUploadIcon,
  FactCheck as FactCheckIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { Prescription, Medication, Patient, MevoDocumentStatus } from '../types';
import { EnhancedTextField, EnhancedTextArea } from '../components/common';
import '../styles/PrescriptionPrint.css';
import {
  emitMevoDocument,
  MevoDocumentType,
  createMevoSignatureSession,
  MevoSignatureProvider,
  MevoSignatureSession,
} from '../services/mevoService';
import { useData } from '../context/DataContext';

interface MedicationCatalogItem extends Medication {
  category: string;
}

type PrescriptionChannel = 'system' | 'mevo';

// Catálogo base para seleção rápida de medicamentos no formulário
const medicationCatalog: MedicationCatalogItem[] = [
  {
    id: '1',
    category: 'Cardiovascular',
    name: 'Losartana Potássica',
    dosage: '50mg',
    frequency: '1x ao dia',
    duration: '30 dias',
    instructions: 'Tomar pela manhã com água',
    sideEffects: ['Tontura', 'Dor de cabeça', 'Fadiga'],
    contraindications: ['Gravidez', 'Insuficiência renal grave']
  },
  {
    id: '2',
    category: 'Endocrinologia',
    name: 'Metformina',
    dosage: '500mg',
    frequency: '2x ao dia',
    duration: '30 dias',
    instructions: 'Tomar após as refeições',
    sideEffects: ['Desconforto abdominal', 'Diarreia', 'Náusea'],
    contraindications: ['Insuficiência renal', 'Acidose metabólica']
  },
  {
    id: '3',
    category: 'Cardiovascular',
    name: 'Atenolol',
    dosage: '25mg',
    frequency: '1x ao dia',
    duration: '30 dias',
    instructions: 'Tomar pela manhã',
    sideEffects: ['Fadiga', 'Mãos frias', 'Tontura'],
    contraindications: ['Asma', 'Bradicardia']
  },
  {
    id: '4',
    category: 'Cardiovascular',
    name: 'Amlodipino',
    dosage: '5mg',
    frequency: '1x ao dia',
    duration: '30 dias',
    instructions: 'Tomar no mesmo horário todos os dias',
    sideEffects: ['Edema de membros inferiores', 'Rubor', 'Cefaleia'],
    contraindications: ['Hipotensão grave']
  },
  {
    id: '5',
    category: 'Cardiovascular',
    name: 'Enalapril',
    dosage: '10mg',
    frequency: '2x ao dia',
    duration: '30 dias',
    instructions: 'Tomar conforme orientação, com controle pressórico',
    sideEffects: ['Tosse seca', 'Tontura'],
    contraindications: ['Gestação', 'Estenose bilateral de artéria renal']
  },
  {
    id: '6',
    category: 'Analgésicos e Anti-inflamatórios',
    name: 'Paracetamol',
    dosage: '750mg',
    frequency: 'A cada 8 horas se dor',
    duration: '5 dias',
    instructions: 'Não exceder dose diária máxima',
    sideEffects: ['Náusea', 'Reação cutânea rara'],
    contraindications: ['Doença hepática grave']
  },
  {
    id: '7',
    category: 'Analgésicos e Anti-inflamatórios',
    name: 'Ibuprofeno',
    dosage: '600mg',
    frequency: 'A cada 8 horas',
    duration: '5 dias',
    instructions: 'Tomar após alimentação',
    sideEffects: ['Dor epigástrica', 'Náusea'],
    contraindications: ['Úlcera ativa', 'Insuficiência renal grave']
  },
  {
    id: '8',
    category: 'Analgésicos e Anti-inflamatórios',
    name: 'Diclofenaco Potássico',
    dosage: '50mg',
    frequency: 'A cada 8 horas',
    duration: '5 dias',
    instructions: 'Tomar após refeições',
    sideEffects: ['Desconforto gástrico', 'Tontura'],
    contraindications: ['Doença ulcerosa ativa', 'Insuficiência cardíaca grave']
  },
  {
    id: '9',
    category: 'Antibióticos',
    name: 'Amoxicilina',
    dosage: '500mg',
    frequency: 'A cada 8 horas',
    duration: '7 dias',
    instructions: 'Completar o tratamento prescrito',
    sideEffects: ['Diarreia', 'Náusea', 'Rash cutâneo'],
    contraindications: ['Alergia a penicilinas']
  },
  {
    id: '10',
    category: 'Antibióticos',
    name: 'Azitromicina',
    dosage: '500mg',
    frequency: '1x ao dia',
    duration: '3 dias',
    instructions: 'Tomar no mesmo horário diariamente',
    sideEffects: ['Náusea', 'Dor abdominal'],
    contraindications: ['Hipersensibilidade a macrolídeos']
  },
  {
    id: '11',
    category: 'Antibióticos',
    name: 'Cefalexina',
    dosage: '500mg',
    frequency: 'A cada 6 horas',
    duration: '7 dias',
    instructions: 'Manter intervalo regular entre as doses',
    sideEffects: ['Diarreia', 'Náusea'],
    contraindications: ['Alergia a cefalosporinas']
  },
  {
    id: '12',
    category: 'Gastrointestinal',
    name: 'Omeprazol',
    dosage: '20mg',
    frequency: '1x ao dia',
    duration: '30 dias',
    instructions: 'Tomar em jejum, 30 minutos antes do café',
    sideEffects: ['Dor de cabeça', 'Distensão abdominal'],
    contraindications: ['Hipersensibilidade à substância']
  },
  {
    id: '13',
    category: 'Gastrointestinal',
    name: 'Ondansetrona',
    dosage: '4mg',
    frequency: 'A cada 8 horas se náusea',
    duration: '3 dias',
    instructions: 'Usar se necessário conforme prescrição',
    sideEffects: ['Constipação', 'Cefaleia'],
    contraindications: ['Uso concomitante com apomorfina']
  },
  {
    id: '14',
    category: 'Respiratório e Alergias',
    name: 'Loratadina',
    dosage: '10mg',
    frequency: '1x ao dia',
    duration: '10 dias',
    instructions: 'Tomar preferencialmente no mesmo horário',
    sideEffects: ['Sonolência leve', 'Boca seca'],
    contraindications: ['Hipersensibilidade à loratadina']
  },
  {
    id: '15',
    category: 'Respiratório e Alergias',
    name: 'Desloratadina',
    dosage: '5mg',
    frequency: '1x ao dia',
    duration: '10 dias',
    instructions: 'Tomar com ou sem alimentos',
    sideEffects: ['Fadiga', 'Boca seca'],
    contraindications: ['Hipersensibilidade ao fármaco']
  },
  {
    id: '16',
    category: 'Respiratório e Alergias',
    name: 'Salbutamol Spray',
    dosage: '100mcg/jato',
    frequency: '2 jatos se falta de ar',
    duration: 'Conforme necessidade',
    instructions: 'Aplicar com técnica inalatória correta',
    sideEffects: ['Tremor', 'Taquicardia transitória'],
    contraindications: ['Hipersensibilidade ao componente']
  },
  {
    id: '17',
    category: 'Endocrinologia',
    name: 'Gliclazida',
    dosage: '30mg',
    frequency: '1x ao dia',
    duration: '30 dias',
    instructions: 'Tomar junto ao café da manhã',
    sideEffects: ['Hipoglicemia', 'Tontura'],
    contraindications: ['Diabetes tipo 1', 'Cetoacidose diabética']
  },
  {
    id: '18',
    category: 'Endocrinologia',
    name: 'Levotiroxina',
    dosage: '50mcg',
    frequency: '1x ao dia',
    duration: '30 dias',
    instructions: 'Tomar em jejum, sem outros medicamentos concomitantes',
    sideEffects: ['Palpitação', 'Insônia se dose excessiva'],
    contraindications: ['Tireotoxicose não tratada']
  }
];

const mockMedications: Medication[] = medicationCatalog.map(({ category, ...medication }) => medication);

// Tipos para cálculo de dose pediátrica
interface MedicamentoPipo {
  _nome: string;
  _operacao: string; 
  _maximo: string;
  _descricao: string;
  _unidade: string;
  _tipo: "option" | "optgroup";
}

// Dados dos medicamentos para cálculo de dose pediátrica
const pipo: MedicamentoPipo[] = [
  {
    _nome: "Analgésicos e Antitérmicos",
    _operacao: "",
    _maximo: "",
    _descricao: "",
    _unidade: "",
    _tipo: "optgroup"
  },
  {
    _nome: "Dipirona Gotas 500mg/ml",
    _operacao: "*1",
    _maximo: "40",
    _descricao: "Tomar de 6/6 horas se febre ou dor",
    _unidade: "gts",
    _tipo: "option"
  },
  {
    _nome: "Dipirona Injetável",
    _operacao: "*0.033",
    _maximo: "2",
    _descricao: "Realizar IM ou EV",
    _unidade: "ml",
    _tipo: "option"
  },
  {
    _nome: "Dipirona Injetável (dose máxima)",
    _operacao: "*0.04",
    _maximo: "2",
    _descricao: "Realizar IM ou EV",
    _unidade: "ml",
    _tipo: "option"
  },
  {
    _nome: "Cetoprofeno Intramuscular",
    _operacao: "*0.002",
    _maximo: "2",
    _descricao: "Realizar IM",
    _unidade: "ml",
    _tipo: "option"
  },
  {
    _nome: "Cetoprofeno Endovenoso",
    _operacao: "*1",
    _maximo: "100",
    _descricao: "Realizar EV",
    _unidade: "mg",
    _tipo: "option"
  },
  {
    _nome: "Diclofenaco Intramuscular",
    _operacao: "*0.032",
    _maximo: "3",
    _descricao: "Realizar IM",
    _unidade: "ml",
    _tipo: "option"
  },
  {
    _nome: "Ibuprofeno Gotas 50mg/ml",
    _operacao: "*2",
    _maximo: "40",
    _descricao: "Tomar de 6/6 horas se febre ou dor",
    _unidade: "gts",
    _tipo: "option"
  },
  {
    _nome: "Ibuprofeno Gotas 100mg/ml",
    _operacao: "*1",
    _maximo: "40",
    _descricao: "Tomar de 6/6 horas se febre ou dor",
    _unidade: "gts",
    _tipo: "option"
  },
  {
    _nome: "Paracetamol Gotas 200mg/ml",
    _operacao: "*1",
    _maximo: "50",
    _descricao: "Tomar de 4/4 horas ou 6/6 horas se febre ou dor",
    _unidade: "gts",
    _tipo: "option"
  },
  {
    _nome: "Anti-ácidos",
    _operacao: "",
    _maximo: "",
    _descricao: "",
    _unidade: "",
    _tipo: "optgroup"
  },
  {
    _nome: "Ranitidina Xarope",
    _operacao: "*0.125",
    _maximo: "10",
    _descricao: "Tomar de 8/8 horas ou 12/12 horas",
    _unidade: "ml",
    _tipo: "option"
  },
  {
    _nome: "Ranitidina Injetável",
    _operacao: "*0.1",
    _maximo: "2",
    _descricao: "Realizar EV",
    _unidade: "ml",
    _tipo: "option"
  },
  {
    _nome: "Antialérgicos",
    _operacao: "",
    _maximo: "",
    _descricao: "",
    _unidade: "",
    _tipo: "optgroup"
  },
  {
    _nome: "Polaramine Líquido",
    _operacao: "*0.075",
    _maximo: "5",
    _descricao: "Tomar de 6/6 horas se coceira ou alergia de pele",
    _unidade: "ml",
    _tipo: "option"
  },
  {
    _nome: "Polaramine Injetável",
    _operacao: "*0.04",
    _maximo: "1",
    _descricao: "Realizar IM ou EV",
    _unidade: "ml",
    _tipo: "option"
  },
  {
    _nome: "Prometazina Injetável",
    _operacao: "*0.025",
    _maximo: "1",
    _descricao: "Realizar IM - NÃO EV",
    _unidade: "ml",
    _tipo: "option"
  },
  {
    _nome: "Antibióticos",
    _operacao: "",
    _maximo: "",
    _descricao: "",
    _unidade: "",
    _tipo: "optgroup"
  },
  {
    _nome: "Amoxicilina Suspensão 250mg/5ml",
    _operacao: "*0.3",
    _maximo: "15",
    _descricao: "Tomar de 8/8 horas por 7 dias",
    _unidade: "ml",
    _tipo: "option"
  },
  {
    _nome: "Amoxicilina Suspensão 400mg/5ml",
    _operacao: "*0.187",
    _maximo: "10",
    _descricao: "Tomar de 8/8 horas ou 12/12 horas por 7 dias",
    _unidade: "ml",
    _tipo: "option"
  }
];

// Componente de cálculo de dose pediátrica
const CalculoDosePediatrica: React.FC<{
  onAddMedication: (medication: Partial<Medication>) => void;
}> = ({ onAddMedication }) => {
  const [peso, setPeso] = useState<string>('');
  const [medicamentoSelecionado, setMedicamentoSelecionado] = useState<string>('');
  const [doseCalculada, setDoseCalculada] = useState<number | null>(null);
  const [medicamento, setMedicamento] = useState<MedicamentoPipo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [medicamentoPersonalizado, setMedicamentoPersonalizado] = useState<string>('');
  const [operacaoPersonalizada, setOperacaoPersonalizada] = useState<string>('*1');
  const [maximoPersonalizado, setMaximoPersonalizado] = useState<string>('');
  const [unidadePersonalizada, setUnidadePersonalizada] = useState<string>('mg');
  const [descricaoPersonalizada, setDescricaoPersonalizada] = useState<string>('');

  // Função para converter vírgula em ponto no valor do peso
  const tratarPeso = (valor: string): string => {
    return valor.replace(',', '.');
  };

  // Função para arredondar o resultado para duas casas decimais
  const arredondar = (valor: number): number => {
    return Math.round(valor * 100) / 100;
  };

  // Função para calcular a dose
  const calcularDose = () => {
    setErro(null);
    
    if (!peso) {
      setErro("Por favor, informe o peso do paciente.");
      return;
    }

    const pesoNumerico = parseFloat(tratarPeso(peso));
    
    if (isNaN(pesoNumerico) || pesoNumerico <= 0) {
      setErro("O peso deve ser um número positivo.");
      return;
    }
    
    // Verifica se é um medicamento personalizado
    if (medicamentoSelecionado === 'personalizado') {
      if (!medicamentoPersonalizado) {
        setErro("Por favor, informe o nome do medicamento personalizado.");
        return;
      }
      
      try {
        // Criar objeto de medicamento personalizado
        const medicamentoPersonalizadoObj: MedicamentoPipo = {
          _nome: medicamentoPersonalizado,
          _operacao: operacaoPersonalizada,
          _maximo: maximoPersonalizado,
          _descricao: descricaoPersonalizada || 'Conforme orientação médica',
          _unidade: unidadePersonalizada,
          _tipo: "option"
        };
        
        // Calcula a dose usando a operação personalizada
        const calculo = new Function('peso', `return peso ${operacaoPersonalizada}`);
        const dose = calculo(pesoNumerico);
        
        if (isNaN(dose)) {
          setErro("Erro ao calcular a dose. Verifique a operação informada.");
          return;
        }
        
        // Arredonda para duas casas decimais
        const doseArredondada = arredondar(dose);
        
        // Verifica se a dose calculada excede o máximo permitido
        const maximoNumerico = parseFloat(maximoPersonalizado);
        const doseAtualizada = !isNaN(maximoNumerico) && doseArredondada > maximoNumerico 
          ? maximoNumerico 
          : doseArredondada;
        
        setMedicamento(medicamentoPersonalizadoObj);
        setDoseCalculada(doseAtualizada);
      } catch (error) {
        console.error("Erro ao calcular dose:", error);
        setErro("Ocorreu um erro ao calcular a dose. Verifique os dados e tente novamente.");
      }
      return;
    }
    
    // Para medicamentos da lista padrão
    if (!medicamentoSelecionado) {
      setErro("Por favor, selecione um medicamento.");
      return;
    }

    const medicamentoEncontrado = pipo.find(med => med._nome === medicamentoSelecionado);
    
    if (!medicamentoEncontrado || medicamentoEncontrado._tipo !== "option") {
      setErro("Medicamento não encontrado ou categoria selecionada. Selecione um medicamento válido.");
      return;
    }

    setMedicamento(medicamentoEncontrado);
    
    try {
      // Calcula a dose com base na operação do medicamento
      const calculo = new Function('peso', `return peso ${medicamentoEncontrado._operacao}`);
      const dose = calculo(pesoNumerico);
      
      // Verifica se o resultado é um número válido
      if (isNaN(dose)) {
        setErro("Erro ao calcular a dose. Verifique os valores informados.");
        return;
      }
      
      // Arredonda para duas casas decimais
      const doseArredondada = arredondar(dose);
      
      // Verifica se a dose calculada excede o máximo permitido
      const maximoNumerico = parseFloat(medicamentoEncontrado._maximo);
      const doseAtualizada = !isNaN(maximoNumerico) && doseArredondada > maximoNumerico 
        ? maximoNumerico 
        : doseArredondada;
      
      setDoseCalculada(doseAtualizada);
    } catch (error) {
      console.error("Erro ao calcular dose:", error);
      setErro("Ocorreu um erro ao calcular a dose. Verifique os dados e tente novamente.");
    }
  };

  // Função para adicionar a medicação calculada à prescrição
  const adicionarMedicacao = () => {
    if (doseCalculada !== null && medicamento) {
      const novaMedicacao: Partial<Medication> = {
        name: medicamento._nome,
        dosage: `${doseCalculada} ${medicamento._unidade}`,
        frequency: medicamento._descricao.split(" ")[0], // Pega a primeira parte como frequência
        duration: "Conforme orientação médica",
        instructions: medicamento._descricao,
        id: `med-${Date.now()}`
      };
      
      onAddMedication(novaMedicacao);
      
      // Limpa o formulário
      setPeso('');
      setMedicamentoSelecionado('');
      setDoseCalculada(null);
      setMedicamento(null);
      setMedicamentoPersonalizado('');
      setOperacaoPersonalizada('*1');
      setMaximoPersonalizado('');
      setUnidadePersonalizada('mg');
      setDescricaoPersonalizada('');
    }
  };

  const listaCompletaMedicamentos = [
    ...pipo,
    {
      _nome: "Adicionar outro medicamento",
      _operacao: "",
      _maximo: "",
      _descricao: "",
      _unidade: "",
      _tipo: "optgroup" as const
    },
    {
      _nome: "Medicamento personalizado",
      _operacao: "*1",
      _maximo: "",
      _descricao: "",
      _unidade: "mg",
      _tipo: "option" as const
    }
  ];

  return (
      <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, mb: 2 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <CalculateIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6">Cálculo de Dose Pediátrica</Typography>
        <Tooltip title="Esta ferramenta calcula a dose pediátrica com base no peso do paciente e no medicamento selecionado.">
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        Use o cálculo pediátrico apenas com validação clínica. Para prescrição comum, utilize "Adicionar Medicamento".
      </Alert>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Peso (kg)"
            fullWidth
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            type="text"
            placeholder="Ex: 20"
            InputProps={{
              inputProps: { inputMode: 'decimal' }
            }}
            helperText="Digite o peso em kg (use ponto ou vírgula para decimais)"
          />
        </Grid>
        
        <Grid item xs={12} sm={8}>
          <FormControl fullWidth>
            <InputLabel id="medicamento-select-label">Medicamento</InputLabel>
            <Select
              labelId="medicamento-select-label"
              value={medicamentoSelecionado}
              label="Medicamento"
              onChange={(e) => {
                const valor = e.target.value;
                setMedicamentoSelecionado(valor);
                
                // Resetar campos personalizados se um medicamento da lista for selecionado
                if (valor !== 'personalizado') {
                  setMedicamentoPersonalizado('');
                  setOperacaoPersonalizada('*1');
                  setMaximoPersonalizado('');
                  setUnidadePersonalizada('mg');
                  setDescricaoPersonalizada('');
                }
              }}
            >
              {listaCompletaMedicamentos.map((med, index) => 
                med._tipo === "optgroup" ? (
                  <MenuItem 
                    key={index} 
                    value={med._nome} 
                    disabled
                    sx={{ 
                      fontWeight: 'bold', 
                      backgroundColor: '#f5f5f5',
                      color: 'primary.main'
                    }}
                  >
                    {med._nome}
                  </MenuItem>
                ) : (
                  <MenuItem 
                    key={index} 
                    value={med._nome === "Medicamento personalizado" ? "personalizado" : med._nome} 
                    sx={{ pl: med._nome === "Medicamento personalizado" ? 2 : 4 }}
                  >
                    {med._nome}
                  </MenuItem>
                )
              )}
            </Select>
            <FormHelperText>Selecione um medicamento para cálculo da dose ou "Medicamento personalizado"</FormHelperText>
          </FormControl>
        </Grid>
        
        {medicamentoSelecionado === 'personalizado' && (
          <>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Nome do Medicamento"
                fullWidth
                value={medicamentoPersonalizado}
                onChange={(e) => setMedicamentoPersonalizado(e.target.value)}
                required
                placeholder="Ex: Amoxicilina 250mg/5ml"
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                label="Operação de Cálculo"
                fullWidth
                value={operacaoPersonalizada}
                onChange={(e) => setOperacaoPersonalizada(e.target.value)}
                required
                helperText="Ex: *0.1 (peso x 0.1)"
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                label="Unidade"
                fullWidth
                value={unidadePersonalizada}
                onChange={(e) => setUnidadePersonalizada(e.target.value)}
                required
                placeholder="Ex: ml, mg, gts"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Dose Máxima"
                fullWidth
                value={maximoPersonalizado}
                onChange={(e) => setMaximoPersonalizado(e.target.value)}
                type="text"
                placeholder="Ex: 10"
                helperText="Deixe em branco se não houver limite"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Posologia/Descrição"
                fullWidth
                value={descricaoPersonalizada}
                onChange={(e) => setDescricaoPersonalizada(e.target.value)}
                placeholder="Ex: Tomar de 8/8 horas"
              />
            </Grid>
          </>
        )}
        
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end">
            <Button 
              variant="contained" 
              onClick={calcularDose}
              startIcon={<CalculateIcon />}
              sx={{ mr: 1 }}
            >
              Calcular Dose
            </Button>
          </Box>
        </Grid>
        
        {erro && (
          <Grid item xs={12}>
            <Alert severity="error">{erro}</Alert>
          </Grid>
        )}
        
        {doseCalculada !== null && medicamento && (
          <Grid item xs={12}>
            <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Resultado do Cálculo
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography>
                  <strong>Medicamento:</strong> {medicamento._nome}
                </Typography>
                <Typography>
                  <strong>Dose calculada:</strong> {doseCalculada} {medicamento._unidade}
                  {parseFloat(medicamento._maximo) > 0 && (
                    <span> (Dose máxima: {medicamento._maximo} {medicamento._unidade})</span>
                  )}
                </Typography>
                <Typography>
                  <strong>Posologia:</strong> {medicamento._descricao}
                </Typography>
                <Box display="flex" justifyContent="flex-end" mt={1}>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    onClick={adicionarMedicacao}
                    startIcon={<AddIcon />}
                  >
                    Adicionar à Prescrição
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

// Componente para visualização/impressão da prescrição
const PrescriptionView: React.FC<{ prescription: Prescription }> = ({ prescription }) => {
  const { patients } = useData();
  const getPatientDetails = (patientId: string) => patients.find((patient) => patient.id === patientId);

  const patient = getPatientDetails(prescription.patientId);
  
  // Formatação de data com segurança para valores indefinidos
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch (error) {
      return '';
    }
  };

  return (
    <Box className="prescription-print-view" sx={{ p: 4, maxWidth: '800px', mx: 'auto', bgcolor: 'white', borderRadius: 2, overflow: 'visible' }}>
      <div className="prescription-form-container">
        <div className="prescription-header">
          <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
            Prescrição Médica
          </Typography>
          {patient && (
            <Typography variant="h6" component="h2" sx={{ mt: 1 }}>
              Paciente: {patient.name}
            </Typography>
          )}
        </div>
        
        {/* Data da prescrição e validade */}
        <div className="prescription-date-section">
          <Typography variant="body2" component="span" sx={{ color: 'text.secondary', mr: 1 }}>
            Data da Prescrição:
          </Typography>
          <TextField
            variant="outlined"
            size="small"
            value={formatDate(prescription.date)}
            className="prescription-date-field"
            sx={{ 
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderRadius: '4px' }
              }
            }}
            InputProps={{
              readOnly: true,
            }}
          />
        </div>
        
        <div className="prescription-date-section">
          <Typography variant="body2" component="span" sx={{ color: 'text.secondary', mr: 1 }}>
            Válido até:
          </Typography>
          <TextField
            variant="outlined"
            size="small"
            value={formatDate(prescription.validUntil)}
            className="prescription-date-field"
            sx={{ 
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderRadius: '4px' }
              }
            }}
            InputProps={{
              readOnly: true,
            }}
          />
        </div>
        
        {/* Medicamentos */}
        <div className="prescription-medications">
          <Typography variant="h6" sx={{ mb: 2, borderBottom: '1px solid #e0e0e0', pb: 1 }}>
            Medicamentos
          </Typography>
          
          {prescription.medications && prescription.medications.length > 0 ? (
            <Box>
              {prescription.medications.map((med, index) => (
                <div key={index} className="prescription-medication-item">
                  <div className="prescription-medication-name">
                    {med.name} - {med.dosage}
                  </div>
                  
                  <div className="prescription-medication-details">
                    <Typography variant="body2">
                      <strong>Posologia:</strong> {med.frequency}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Duração:</strong> {med.duration}
                    </Typography>
                    
                    {med.instructions && (
                      <Typography variant="body2" sx={{ gridColumn: 'span 2' }}>
                        <strong>Instruções:</strong> {med.instructions}
                      </Typography>
                    )}
                  </div>
                </div>
              ))}
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              Nenhum medicamento adicionado.
            </Typography>
          )}
        </div>
        
        {/* Instruções e Observações */}
        <div className="prescription-instructions">
          <Card variant="outlined" sx={{ height: '100%', borderRadius: '8px' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                Instruções e Observações
              </Typography>
              <Typography variant="body2">
                {prescription.instructions || 'Nenhuma instrução adicional.'}
              </Typography>
            </CardContent>
          </Card>
        </div>
        
        <div className="prescription-patient-instructions">
          <Card variant="outlined" sx={{ height: '100%', borderRadius: '8px' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                Instruções ao Paciente
              </Typography>
              <Typography variant="body2">
                {prescription.instructions || 'Nenhuma instrução adicional.'}
              </Typography>
            </CardContent>
          </Card>
        </div>
        
        {/* Observações médicas - visível apenas para impressão médica */}
        <div className="prescription-notes print-hide">
          <Card variant="outlined" sx={{ borderRadius: '8px' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: 'text.secondary' }}>
                Observações Médicas (não visíveis ao paciente)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {prescription.doctorNotes || 'Nenhuma observação adicional.'}
              </Typography>
            </CardContent>
          </Card>
        </div>
        
        {/* Botões de ação - classe print-hide esconde para impressão */}
        <div className="prescription-actions print-hide">
          <Button 
            variant="outlined" 
            color="primary"
            sx={{ mr: 2 }}
          >
            CANCELAR
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            endIcon={<SendIcon />}
          >
            EMITIR PRESCRIÇÃO
          </Button>
        </div>
      </div>
    </Box>
  );
};

// Componente de botão para impressão direta sem diálogo
const PrintButton: React.FC<{ prescription: Prescription }> = ({ prescription }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  
  const handlePrint = () => {
    setIsPrinting(true);
    // Aguardar o DOM atualizar antes de imprimir
    setTimeout(() => {
      window.print();
      // Tempo suficiente para completar a impressão
      setTimeout(() => {
        setIsPrinting(false);
      }, 1000);
    }, 300);
  };
  
  return (
    <>
      <IconButton color="secondary" onClick={handlePrint}>
        <PrintIcon />
      </IconButton>
      
      {isPrinting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 9999,
          backgroundColor: 'white',
          overflow: 'auto',
          padding: '20px'
        }}>
          <PrescriptionView prescription={prescription} />
        </div>
      )}
    </>
  );
};

const Prescriptions: React.FC = () => {
  const {
    patients,
    prescriptions: contextPrescriptions,
    addPrescription,
    updatePrescription,
    deletePrescription,
  } = useData();
  const prescriptions = useMemo(() => contextPrescriptions as Prescription[], [contextPrescriptions]);
  const [open, setOpen] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState<Partial<Prescription>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [prescriptionChannel, setPrescriptionChannel] = useState<PrescriptionChannel>('system');
  const [signatureProvider, setSignatureProvider] = useState<MevoSignatureProvider>('bird_id');
  const [mevoSignatureSession, setMevoSignatureSession] = useState<MevoSignatureSession | null>(null);
  const [isAuthenticatingSignature, setIsAuthenticatingSignature] = useState(false);
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);
  const [currentMedication, setCurrentMedication] = useState<Partial<Medication & { customName?: string }>>({});
  const [editingMedicationIndex, setEditingMedicationIndex] = useState<number | null>(null);
  const [medicationSearchTerm, setMedicationSearchTerm] = useState('');
  const [mevoSubmittingType, setMevoSubmittingType] = useState<MevoDocumentType | null>(null);
  const [mevoFeedback, setMevoFeedback] = useState<{
    severity: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const mevoLoginUrl = useMemo(
    () => mevoSignatureSession?.loginUrl || process.env.REACT_APP_MEVO_LOGIN_URL || '',
    [mevoSignatureSession?.loginUrl]
  );
  const mevoBirdIdUrl = useMemo(
    () => process.env.REACT_APP_MEVO_BIRD_ID_URL || '',
    []
  );
  const mevoViddasUrl = useMemo(
    () => process.env.REACT_APP_MEVO_VIDDAS_URL || '',
    []
  );
  const mevoEmbedUrl = useMemo(() => {
    if (mevoSignatureSession?.embedUrl) {
      return mevoSignatureSession.embedUrl;
    }

    if (process.env.REACT_APP_MEVO_EMBED_URL) {
      return process.env.REACT_APP_MEVO_EMBED_URL;
    }

    return '';
  }, [mevoSignatureSession?.embedUrl]);
  const selectedPatientForMevo = useMemo(() => {
    if (!currentPrescription.patientId) {
      return null;
    }

    return patients.find((patient) => patient.id === currentPrescription.patientId) || null;
  }, [currentPrescription.patientId, patients]);
  const mevoPortalUrl = useMemo(() => {
    if (!mevoEmbedUrl) {
      return '';
    }

    try {
      const url = new URL(mevoEmbedUrl);
      const medsSummary = (currentPrescription.medications || [])
        .map((med) => `${med.name} ${med.dosage} - ${med.frequency}`)
        .join('; ');

      const prefillEntries: Array<[string, string | undefined]> = [
        ['source', 'neomed'],
        ['prefill_patient_id', selectedPatientForMevo?.id],
        ['prefill_patient_name', selectedPatientForMevo?.name],
        ['prefill_patient_birth_date', selectedPatientForMevo?.dateOfBirth || selectedPatientForMevo?.birthDate],
        ['prefill_patient_email', selectedPatientForMevo?.email],
        ['prefill_patient_phone', selectedPatientForMevo?.phone],
        ['prefill_patient_gender', selectedPatientForMevo?.gender],
        ['prefill_cid10_code', selectedPatientForMevo?.cid10Code],
        ['prefill_cid10_description', selectedPatientForMevo?.cid10Description],
        ['prefill_prescription_date', currentPrescription.date],
        ['prefill_prescription_valid_until', currentPrescription.validUntil],
        ['prefill_medications', medsSummary || undefined],
        ['prefill_instructions', currentPrescription.instructions],
        ['prefill_doctor_notes', currentPrescription.doctorNotes],
      ];

      prefillEntries.forEach(([key, value]) => {
        if (value && String(value).trim()) {
          url.searchParams.set(key, String(value));
        }
      });

      return url.toString();
    } catch {
      return mevoEmbedUrl;
    }
  }, [
    currentPrescription.date,
    currentPrescription.doctorNotes,
    currentPrescription.instructions,
    currentPrescription.medications,
    currentPrescription.validUntil,
    mevoEmbedUrl,
    selectedPatientForMevo,
  ]);

  const filteredMedicationCatalog = useMemo(() => {
    const term = medicationSearchTerm.trim().toLowerCase();
    if (!term) {
      return medicationCatalog;
    }

    return medicationCatalog.filter((item) => {
      const haystack = `${item.name} ${item.dosage} ${item.frequency} ${item.category}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [medicationSearchTerm]);

  const groupedMedicationCatalog = useMemo(() => {
    return filteredMedicationCatalog.reduce<Record<string, MedicationCatalogItem[]>>((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [filteredMedicationCatalog]);

  const selectedMedicationCategory = useMemo(() => {
    if (!currentMedication.name || currentMedication.name === 'outro') {
      return 'Personalizado';
    }

    const found = medicationCatalog.find((item) => item.name === currentMedication.name);
    return found?.category || 'Personalizado';
  }, [currentMedication.name]);
  const patientOptions = useMemo(() => {
    return [...patients].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  }, [patients]);

  const canPersistPrescription = Boolean(
    currentPrescription.patientId && (currentPrescription.medications?.length || 0) > 0
  );
  const canEmitViaMevo = canPersistPrescription && prescriptionChannel === 'mevo' && !!mevoSignatureSession?.authenticated;
  const saveButtonLabel = isEditing
    ? prescriptionChannel === 'mevo'
      ? 'Atualizar no Sistema'
      : 'Atualizar Prescrição'
    : prescriptionChannel === 'mevo'
    ? 'Salvar no Sistema'
    : 'Prescrever no Sistema';

  const handleClickOpen = () => {
    setCurrentPrescription({
      date: new Date().toISOString().split('T')[0],
      medications: []
    });
    setIsEditing(false);
    setPrescriptionChannel('system');
    setMevoSignatureSession(null);
    setSignatureProvider('bird_id');
    setMevoFeedback(null);
    setOpen(true);
  };

  const handleEdit = (prescription: Prescription) => {
    setCurrentPrescription({ ...prescription });
    setIsEditing(true);
    setPrescriptionChannel(
      prescription.prescriptionChannel === 'mevo' || (prescription.mevoDocuments && prescription.mevoDocuments.length > 0)
        ? 'mevo'
        : 'system'
    );
    setMevoSignatureSession(null);
    setSignatureProvider('bird_id');
    setMevoFeedback(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const persistCurrentPrescription = (): Prescription | null => {
    if (!canPersistPrescription) {
      alert('Por favor, selecione um paciente e adicione pelo menos um medicamento.');
      return null;
    }

    let persisted: Prescription;

    if (isEditing) {
      persisted = { ...(currentPrescription as Prescription), prescriptionChannel };
      updatePrescription(persisted.id, persisted);
    } else {
      persisted = {
        ...(currentPrescription as Prescription),
        id: `${Date.now()}`,
        prescriptionChannel,
        date: currentPrescription.date || new Date().toISOString().split('T')[0],
        validUntil:
          currentPrescription.validUntil ||
          new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      };
      addPrescription(persisted);
      setIsEditing(true);
    }

    setCurrentPrescription(persisted);
    return persisted;
  };

  const mergeMevoStatusInPrescription = (
    prescription: Prescription,
    statusUpdate: MevoDocumentStatus
  ): Prescription => {
    const currentStatuses = prescription.mevoDocuments || [];
    const hasStatus = currentStatuses.some((item) => item.documentType === statusUpdate.documentType);
    const nextStatuses = hasStatus
      ? currentStatuses.map((item) => (item.documentType === statusUpdate.documentType ? statusUpdate : item))
      : [...currentStatuses, statusUpdate];

    return {
      ...prescription,
      mevoDocuments: nextStatuses,
    };
  };

  const persistMevoStatus = (prescriptionId: string, statusUpdate: MevoDocumentStatus) => {
    const found = prescriptions.find((item) => item.id === prescriptionId);
    if (!found) {
      return;
    }

    const merged = mergeMevoStatusInPrescription(found, statusUpdate);
    updatePrescription(prescriptionId, merged);

    setCurrentPrescription((prev) => {
      if (!prev?.id || prev.id !== prescriptionId) {
        return prev;
      }
      return merged;
    });
  };

  const handleSave = () => {
    const persisted = persistCurrentPrescription();
    if (!persisted) {
      return;
    }

    setOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta prescrição?')) {
      deletePrescription(id);
    }
  };

  const handleOpenMedicationDialog = (index?: number) => {
    if (index !== undefined) {
      // Editar medicamento existente
      setCurrentMedication({ ...currentPrescription.medications![index] });
      setEditingMedicationIndex(index);
    } else {
      // Adicionar novo medicamento
      setCurrentMedication({});
      setEditingMedicationIndex(null);
    }
    setMedicationSearchTerm('');
    setMedicationDialogOpen(true);
  };

  const handleCloseMedicationDialog = () => {
    setMedicationDialogOpen(false);
    setMedicationSearchTerm('');
  };

  const handleSaveMedication = () => {
    // Validar campos obrigatórios
    if ((!currentMedication.name || currentMedication.name === 'outro' && !currentMedication.customName) || 
        !currentMedication.dosage || !currentMedication.frequency || !currentMedication.duration) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const medication: Medication = {
      ...(currentMedication as Medication),
      id: currentMedication.id || `med-${Date.now()}`,
      // Se for "outro", usa o nome personalizado, caso contrário usa o nome selecionado
      name: currentMedication.name === 'outro' ? currentMedication.customName! : currentMedication.name
    };

    const updatedMedications = [...(currentPrescription.medications || [])];

    if (editingMedicationIndex !== null) {
      // Atualizar medicamento existente
      updatedMedications[editingMedicationIndex] = medication;
    } else {
      // Adicionar novo medicamento
      updatedMedications.push(medication);
    }

    setCurrentPrescription({
      ...currentPrescription,
      medications: updatedMedications
    });

    setMedicationDialogOpen(false);
  };

  const handleRemoveMedication = (index: number) => {
    const updatedMedications = [...(currentPrescription.medications || [])];
    updatedMedications.splice(index, 1);
    setCurrentPrescription({
      ...currentPrescription,
      medications: updatedMedications
    });
  };

  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient ? patient.name : '-';
  };

  const getPatientDetails = (patientId: string) => {
    return patients.find((p) => p.id === patientId);
  };

  const getDocumentTypeLabel = (documentType: MevoDocumentType) => {
    return documentType === 'certificate' ? 'Atestado' : 'Receita';
  };

  const getSignatureProviderLabel = (provider: MevoSignatureProvider) => {
    return provider === 'bird_id' ? 'Bird ID' : 'Viddas';
  };

  const getProviderQuickLink = (provider: MevoSignatureProvider) => {
    return provider === 'bird_id' ? mevoBirdIdUrl : mevoViddasUrl;
  };

  const getMevoStatusLabel = (status: string) => {
    if (status === 'emitted') return 'Emitido';
    if (status === 'pending_configuration') return 'Configurar Mevo';
    if (status === 'failed') return 'Falha';
    if (status === 'processing') return 'Processando';
    return status;
  };

  const getMevoStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    if (status === 'emitted') return 'success';
    if (status === 'pending_configuration') return 'warning';
    if (status === 'failed') return 'error';
    if (status === 'processing') return 'info';
    return 'default';
  };

  // Função para adicionar medicação proveniente do cálculo de dose
  const handleAddCalculatedMedication = (calculatedMedication: Partial<Medication>) => {
    const updatedMedications = [...(currentPrescription.medications || [])];
    updatedMedications.push(calculatedMedication as Medication);
    
    setCurrentPrescription({
      ...currentPrescription,
      medications: updatedMedications
    });
  };

  const handleEmitWithMevo = async (documentType: MevoDocumentType) => {
    if (prescriptionChannel !== 'mevo') {
      setMevoFeedback({
        severity: 'info',
        message: 'Selecione a opção "Prescrever com Mevo" para emitir documentos na plataforma Mevo.',
      });
      return;
    }

    if (!mevoSignatureSession?.authenticated) {
      setMevoFeedback({
        severity: 'error',
        message: 'Autentique a assinatura digital (Bird ID ou Viddas) antes de emitir pela Mevo.',
      });
      return;
    }

    const persisted = persistCurrentPrescription();
    if (!persisted) {
      return;
    }

    setMevoFeedback(null);
    setMevoSubmittingType(documentType);

    const patient = getPatientDetails(persisted.patientId);
    const mappedPatient: Partial<Patient> | undefined = patient
      ? {
          id: patient.id,
          name: patient.name || '',
          dateOfBirth: patient.dateOfBirth || patient.birthDate || '',
          gender: (patient.gender as Patient['gender']) || 'other',
          email: patient.email || '',
          phone: patient.phone || '',
          address: patient.address || '',
          healthInsurance: patient.healthInsurance,
          bloodType: patient.bloodType,
          medicalHistory: patient.medicalHistory,
          allergies: patient.allergies,
          medications: patient.medications,
          cid10Code: patient.cid10Code,
          cid10Description: patient.cid10Description,
        }
      : undefined;

    try {
      const response = await emitMevoDocument({
        documentType,
        prescriptionId: persisted.id,
        patientId: persisted.patientId,
        prescription: persisted,
        patient: mappedPatient,
      });

      if (!response.document) {
        throw new Error('A integração Mevo não retornou dados do documento.');
      }

      const statusUpdate: MevoDocumentStatus = {
        documentType,
        status: response.document.status,
        providerName: response.document.providerName,
        providerDocumentId: response.document.providerDocumentId,
        providerToken: response.document.providerToken,
        errorMessage: response.document.errorMessage,
        updatedAt: response.document.updatedAt,
      };
      persistMevoStatus(persisted.id, statusUpdate);

      const modeLabel = response.mode === 'mock' ? 'modo configuração' : 'modo produção';
      setMevoFeedback({
        severity: statusUpdate.status === 'emitted' ? 'success' : 'info',
        message: `${getDocumentTypeLabel(documentType)} enviada para Mevo (${modeLabel}). Status: ${getMevoStatusLabel(
          statusUpdate.status
        )}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao emitir documento na Mevo.';
      setMevoFeedback({
        severity: 'error',
        message,
      });
    } finally {
      setMevoSubmittingType(null);
    }
  };

  const handleAuthenticateMevoSignature = async (provider: MevoSignatureProvider) => {
    setIsAuthenticatingSignature(true);
    setMevoFeedback(null);
    setSignatureProvider(provider);

    try {
      const session = await createMevoSignatureSession(provider);
      setMevoSignatureSession(session);
      const quickLink = getProviderQuickLink(provider);
      const authTarget = session.authUrl || quickLink;
      if (authTarget) {
        window.open(authTarget, '_blank', 'noopener,noreferrer');
      }

      setMevoFeedback({
        severity: session.authenticated ? 'success' : 'error',
        message: session.message,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao autenticar assinatura digital na integração Mevo.';
      setMevoFeedback({
        severity: 'error',
        message,
      });
    } finally {
      setIsAuthenticatingSignature(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Prescrições Médicas</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Nova Prescrição
        </Button>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="tabela de prescrições">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Paciente</TableCell>
                <TableCell>Medicamentos</TableCell>
                <TableCell>Válido até</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {prescriptions.map((prescription) => (
                <TableRow key={prescription.id}>
                  <TableCell>
                    {new Date(prescription.date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>{getPatientName(prescription.patientId)}</TableCell>
                  <TableCell>
                    {prescription.medications && prescription.medications.map((med, index) => (
                      <Chip 
                        key={index}
                        label={`${med.name} ${med.dosage}`}
                        color="primary" 
                        variant="outlined" 
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </TableCell>
                  <TableCell>
                    {prescription.validUntil ? new Date(prescription.validUntil).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" flexWrap="wrap">
                      <IconButton color="primary" onClick={() => handleEdit(prescription)}>
                        <EditIcon />
                      </IconButton>
                      <PrintButton prescription={prescription} />
                      <IconButton color="error" onClick={() => handleDelete(prescription.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                      {(prescription.mevoDocuments || []).map((doc) => (
                        <Chip
                          key={`${prescription.id}-${doc.documentType}`}
                          size="small"
                          color={getMevoStatusColor(doc.status)}
                          variant="outlined"
                          label={`${doc.documentType === 'certificate' ? 'Atestado' : 'Receita'} Mevo: ${getMevoStatusLabel(
                            doc.status
                          )}`}
                        />
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Formulário de Prescrição */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{isEditing ? 'Editar Prescrição' : 'Nova Prescrição'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid sx={{ gridColumn: 'span 12' }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Como deseja prescrever?
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={prescriptionChannel}
                  onChange={(_, value: PrescriptionChannel | null) => {
                    if (!value) {
                      return;
                    }
                    setPrescriptionChannel(value);
                    if (value === 'system') {
                      setMevoSignatureSession(null);
                    }
                  }}
                  sx={{
                    '& .MuiToggleButton-root': {
                      py: 1.25,
                      textTransform: 'none',
                      fontWeight: 600,
                    },
                  }}
                >
                  <ToggleButton value="system">Prescrição no próprio sistema</ToggleButton>
                  <ToggleButton value="mevo">Prescrição com Mevo</ToggleButton>
                </ToggleButtonGroup>
                <Box mt={2}>
                  {prescriptionChannel === 'system' ? (
                    <Alert severity="info">
                      A prescrição será registrada apenas no NeoMed e poderá ser impressa normalmente.
                    </Alert>
                  ) : (
                    <Alert severity="info">
                      Para emitir pela Mevo, faça login, autentique Bird ID ou Viddas e use o bloco "Passo 2:
                      Sistema Mevo".
                    </Alert>
                  )}
                </Box>
              </Paper>
            </Grid>

            {mevoFeedback && (
              <Grid sx={{ gridColumn: 'span 12' }}>
                <Alert severity={mevoFeedback.severity}>{mevoFeedback.message}</Alert>
              </Grid>
            )}

            {prescriptionChannel === 'mevo' && (
              <Grid sx={{ gridColumn: 'span 12' }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                    Fluxo Mevo
                  </Typography>

                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      p: 2,
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Passo 1: Assinatura digital
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
                      <Button
                        variant="outlined"
                        startIcon={<OpenInNewIcon />}
                        disabled={!mevoLoginUrl}
                        onClick={() => {
                          if (mevoLoginUrl) {
                            window.open(mevoLoginUrl, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      >
                        Entrar na Mevo
                      </Button>
                      <Button
                        onClick={() => handleAuthenticateMevoSignature('bird_id')}
                        variant="contained"
                        color="primary"
                        disabled={isAuthenticatingSignature}
                        startIcon={isAuthenticatingSignature ? <CircularProgress size={16} /> : undefined}
                      >
                        {isAuthenticatingSignature && signatureProvider === 'bird_id'
                          ? 'Autenticando Bird ID...'
                          : 'Autenticar Bird ID'}
                      </Button>
                      <Button
                        onClick={() => handleAuthenticateMevoSignature('viddas')}
                        variant="contained"
                        color="secondary"
                        disabled={isAuthenticatingSignature}
                        startIcon={isAuthenticatingSignature ? <CircularProgress size={16} /> : undefined}
                      >
                        {isAuthenticatingSignature && signatureProvider === 'viddas'
                          ? 'Autenticando Viddas...'
                          : 'Autenticar Viddas'}
                      </Button>
                    </Box>

                    {(!mevoLoginUrl || !mevoBirdIdUrl || !mevoViddasUrl) && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        Configure as URLs no frontend para habilitar acesso direto:
                        `REACT_APP_MEVO_LOGIN_URL`, `REACT_APP_MEVO_BIRD_ID_URL`, `REACT_APP_MEVO_VIDDAS_URL`.
                      </Alert>
                    )}

                    <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
                      <Chip
                        size="small"
                        color={mevoLoginUrl ? 'success' : 'default'}
                        label={`Login Mevo: ${mevoLoginUrl ? 'configurado' : 'não configurado'}`}
                      />
                      <Chip
                        size="small"
                        color={mevoBirdIdUrl ? 'success' : 'default'}
                        label={`Bird ID: ${mevoBirdIdUrl ? 'configurado' : 'não configurado'}`}
                      />
                      <Chip
                        size="small"
                        color={mevoViddasUrl ? 'success' : 'default'}
                        label={`Viddas: ${mevoViddasUrl ? 'configurado' : 'não configurado'}`}
                      />
                    </Box>

                    {mevoSignatureSession && (
                      <Alert severity={mevoSignatureSession.authenticated ? 'success' : 'warning'} sx={{ mt: 2 }}>
                        {mevoSignatureSession.message}
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          Sessão: {mevoSignatureSession.signatureId}
                        </Typography>
                        {!mevoSignatureSession.authenticated && (
                          <Typography variant="body2">
                            A autenticação real depende das URLs e credenciais configuradas no backend.
                          </Typography>
                        )}
                      </Alert>
                    )}

                    {mevoSignatureSession?.authUrl && (
                      <Button
                        component="a"
                        href={mevoSignatureSession.authUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mt: 1 }}
                        endIcon={<OpenInNewIcon />}
                      >
                        Abrir autenticação {getSignatureProviderLabel(mevoSignatureSession.provider)}
                      </Button>
                    )}
                  </Box>

                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      p: 2,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Passo 2: Sistema Mevo
                    </Typography>
                    {selectedPatientForMevo ? (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        Abrindo Mevo com prefill do cadastro do paciente e dados da prescrição atual.
                      </Alert>
                    ) : (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Selecione um paciente para enviar dados de cadastro automaticamente ao abrir o Mevo.
                      </Alert>
                    )}
                    {!mevoSignatureSession?.authenticated && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        Primeiro autentique a assinatura digital para liberar emissão na Mevo.
                      </Alert>
                    )}
                    {mevoPortalUrl ? (
                      <>
                        <Button
                          variant="outlined"
                          startIcon={<OpenInNewIcon />}
                          onClick={() => window.open(mevoPortalUrl, '_blank', 'noopener,noreferrer')}
                          sx={{ mb: 1.5 }}
                        >
                          Abrir Sistema Mevo em nova aba
                        </Button>
                        <Box
                          component="iframe"
                          src={mevoPortalUrl}
                          title="Sistema Mevo"
                          sx={{
                            width: '100%',
                            minHeight: 420,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            bgcolor: 'common.white',
                          }}
                        />
                      </>
                    ) : (
                      <Alert severity="info">
                        URL do portal Mevo não configurada. Defina `REACT_APP_MEVO_EMBED_URL` para exibir o portal.
                      </Alert>
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}

            {prescriptionChannel === 'mevo' && !!currentPrescription.mevoDocuments?.length && (
              <Grid sx={{ gridColumn: 'span 12' }}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Status Mevo desta prescrição
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {currentPrescription.mevoDocuments.map((doc) => (
                      <Chip
                        key={`draft-${doc.documentType}`}
                        size="small"
                        color={getMevoStatusColor(doc.status)}
                        variant="outlined"
                        label={`${doc.documentType === 'certificate' ? 'Atestado' : 'Receita'}: ${getMevoStatusLabel(
                          doc.status
                        )}`}
                      />
                    ))}
                  </Box>
                </Paper>
              </Grid>
            )}

            <Grid sx={{ gridColumn: 'span 12' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                  gap: 2,
                }}
              >
                <Autocomplete
                  options={patientOptions}
                  value={patientOptions.find((patient) => patient.id === currentPrescription.patientId) || null}
                  onChange={(_, patient) =>
                    setCurrentPrescription({
                      ...currentPrescription,
                      patientId: patient?.id || '',
                    })
                  }
                  getOptionLabel={(option) => option.name || 'Paciente sem nome'}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  noOptionsText={patients.length ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
                  openOnFocus
                  autoHighlight
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.phone || option.email || 'Sem telefone/email'}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Paciente"
                      placeholder="Buscar paciente por nome"
                      helperText="Clique e digite para filtrar pacientes"
                    />
                  )}
                />

                <EnhancedTextField
                  label="Data da Prescrição"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={currentPrescription.date || ''}
                  onChange={(e) => setCurrentPrescription({
                    ...currentPrescription,
                    date: e.target.value
                  })}
                />

                <EnhancedTextField
                  label="Válido até"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={currentPrescription.validUntil || ''}
                  onChange={(e) => setCurrentPrescription({
                    ...currentPrescription,
                    validUntil: e.target.value
                  })}
                />
              </Box>
            </Grid>
            
            {currentPrescription.patientId && (
              <Grid sx={{ gridColumn: 'span 12' }}>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Informações do Paciente
                    </Typography>
                    {(() => {
                      const patient = getPatientDetails(currentPrescription.patientId!);
                      return patient ? (
                        <>
                          <Typography variant="body2">
                            <strong>Nome:</strong> {patient.name}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Data de Nascimento:</strong>{' '}
                            {patient.dateOfBirth || patient.birthDate
                              ? new Date(patient.dateOfBirth || patient.birthDate).toLocaleDateString('pt-BR')
                              : '-'}
                          </Typography>
                          {patient.cid10Code && (
                            <Typography variant="body2">
                              <strong>CID-10:</strong> {patient.cid10Code} - {patient.cid10Description}
                            </Typography>
                          )}
                          {patient.allergies && patient.allergies.length > 0 && (
                            <Typography variant="body2">
                              <strong>Alergias:</strong> {patient.allergies.join(', ')}
                            </Typography>
                          )}
                        </>
                      ) : null;
                    })()}
                  </CardContent>
                </Card>
              </Grid>
            )}
            
            <Grid sx={{ gridColumn: 'span 12' }}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  Cálculo de Dose Pediátrica
                </Typography>
              </Divider>
            </Grid>
            
            <Grid sx={{ gridColumn: 'span 12' }}>
              <CalculoDosePediatrica onAddMedication={handleAddCalculatedMedication} />
            </Grid>
            
            <Grid sx={{ gridColumn: 'span 12' }}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  Medicamentos
                </Typography>
              </Divider>
            </Grid>
            
            <Grid sx={{ gridColumn: 'span 12' }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1">
                    Medicamentos Adicionados ({currentPrescription.medications?.length || 0})
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenMedicationDialog()}
                    size="small"
                  >
                    Adicionar Medicamento
                  </Button>
                </Box>

                {currentPrescription.medications && currentPrescription.medications.length > 0 ? (
                  currentPrescription.medications.map((medication, index) => (
                    <Accordion key={index} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" width="100%">
                          <MedicationIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography sx={{ flexGrow: 1 }}>
                            {medication.name} - {medication.dosage}
                          </Typography>
                          <Box>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMedicationDialog(index);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMedication(index);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                            <Typography variant="body2">
                              <strong>Posologia:</strong> {medication.frequency}
                            </Typography>
                          </Grid>
                          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                            <Typography variant="body2">
                              <strong>Duração:</strong> {medication.duration}
                            </Typography>
                          </Grid>
                          {medication.instructions && (
                            <Grid sx={{ gridColumn: 'span 12' }}>
                              <Typography variant="body2">
                                <strong>Instruções:</strong> {medication.instructions}
                              </Typography>
                            </Grid>
                          )}
                          {medication.sideEffects && medication.sideEffects.length > 0 && (
                            <Grid sx={{ gridColumn: 'span 12' }}>
                              <Typography variant="body2">
                                <strong>Efeitos Colaterais:</strong> {medication.sideEffects.join(', ')}
                              </Typography>
                            </Grid>
                          )}
                          {medication.contraindications && medication.contraindications.length > 0 && (
                            <Grid sx={{ gridColumn: 'span 12' }}>
                              <Typography variant="body2">
                                <strong>Contraindicações:</strong> {medication.contraindications.join(', ')}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Nenhum medicamento adicionado.
                  </Typography>
                )}
              </Paper>
            </Grid>
            
            <Grid sx={{ gridColumn: 'span 12' }}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  Instruções e Observações
                </Typography>
              </Divider>
            </Grid>
            
            <Grid sx={{ gridColumn: 'span 12' }}>
              <EnhancedTextArea
                label="Instruções ao Paciente"
                fullWidth
                minRows={3}
                value={currentPrescription.instructions || ''}
                onChange={(e) => setCurrentPrescription({
                  ...currentPrescription,
                  instructions: e.target.value
                })}
              />
            </Grid>
            
            <Grid sx={{ gridColumn: 'span 12' }}>
              <EnhancedTextArea
                label="Observações Médicas (não visíveis ao paciente)"
                fullWidth
                minRows={3}
                value={currentPrescription.doctorNotes || ''}
                onChange={(e) => setCurrentPrescription({
                  ...currentPrescription,
                  doctorNotes: e.target.value
                })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          {prescriptionChannel === 'mevo' && (
            <Button
              onClick={() => handleEmitWithMevo('prescription')}
              variant="outlined"
              color="primary"
              startIcon={mevoSubmittingType === 'prescription' ? <CircularProgress size={16} /> : <CloudUploadIcon />}
              disabled={!canEmitViaMevo || !!mevoSubmittingType}
            >
              Emitir Receita Mevo
            </Button>
          )}
          {prescriptionChannel === 'mevo' && (
            <Button
              onClick={() => handleEmitWithMevo('certificate')}
              variant="outlined"
              color="secondary"
              startIcon={mevoSubmittingType === 'certificate' ? <CircularProgress size={16} /> : <FactCheckIcon />}
              disabled={!canEmitViaMevo || !!mevoSubmittingType}
            >
              Emitir Atestado Mevo
            </Button>
          )}
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={!canPersistPrescription || !!mevoSubmittingType}
          >
            {saveButtonLabel}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Medicamento */}
      <Dialog
        open={medicationDialogOpen}
        onClose={handleCloseMedicationDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingMedicationIndex !== null ? 'Editar Medicamento' : 'Adicionar Medicamento'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid sx={{ gridColumn: 'span 12' }}>
              <EnhancedTextField
                label="Buscar medicamento"
                fullWidth
                value={medicationSearchTerm}
                onChange={(e) => setMedicationSearchTerm(e.target.value)}
                helperText={`Resultados: ${filteredMedicationCatalog.length}`}
                placeholder="Digite nome, categoria, dose ou frequência"
              />
            </Grid>

            <Grid sx={{ gridColumn: 'span 12' }}>
              <FormControl fullWidth>
                <InputLabel id="medication-select-label">Medicamento</InputLabel>
                <Select
                  labelId="medication-select-label"
                  value={currentMedication.name || ''}
                  label="Medicamento"
                  onChange={(e) => {
                    const selectedMed = mockMedications.find(med => med.name === e.target.value);
                    if (selectedMed) {
                      setCurrentMedication({
                        ...selectedMed,
                        id: currentMedication.id
                      });
                    } else {
                      setCurrentMedication({
                        ...currentMedication,
                        name: e.target.value as string
                      });
                    }
                  }}
                  inputProps={{
                    autoComplete: 'new-password',
                  }}
                >
                  {Object.entries(groupedMedicationCatalog).map(([category, meds]) => [
                    <MenuItem
                      key={`group-${category}`}
                      value={category}
                      disabled
                      sx={{
                        fontWeight: 'bold',
                        backgroundColor: '#f5f5f5',
                        color: 'primary.main',
                      }}
                    >
                      {category}
                    </MenuItem>,
                    ...meds.map((med) => (
                      <MenuItem key={med.id} value={med.name} sx={{ pl: 4 }}>
                        {med.name} ({med.dosage})
                      </MenuItem>
                    )),
                  ])}
                  <MenuItem value="outro">
                    <em>Outro medicamento...</em>
                  </MenuItem>
                </Select>
                <FormHelperText>Selecione um medicamento existente ou escolha "Outro medicamento"</FormHelperText>
              </FormControl>
            </Grid>

            <Grid sx={{ gridColumn: 'span 12' }}>
              <Chip size="small" label={`Categoria: ${selectedMedicationCategory}`} color="primary" variant="outlined" />
            </Grid>
            
            {currentMedication.name === 'outro' && (
              <Grid sx={{ gridColumn: 'span 12' }}>
                <EnhancedTextField
                  label="Nome do Medicamento"
                  fullWidth
                  required
                  value={currentMedication.customName || ''}
                  onChange={(e) => setCurrentMedication({
                    ...currentMedication,
                    customName: e.target.value,
                    name: e.target.value // Atualiza o nome também
                  })}
                  helperText="Digite o nome do medicamento"
                />
              </Grid>
            )}
            
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <EnhancedTextField
                label="Dosagem"
                fullWidth
                required
                value={currentMedication.dosage || ''}
                onChange={(e) => setCurrentMedication({
                  ...currentMedication,
                  dosage: e.target.value
                })}
                helperText="Ex: 50mg, 100ml, etc."
              />
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <EnhancedTextField
                label="Frequência"
                fullWidth
                required
                value={currentMedication.frequency || ''}
                onChange={(e) => setCurrentMedication({
                  ...currentMedication,
                  frequency: e.target.value
                })}
                helperText="Ex: 1x ao dia, a cada 8 horas, etc."
              />
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <EnhancedTextField
                label="Duração"
                fullWidth
                required
                value={currentMedication.duration || ''}
                onChange={(e) => setCurrentMedication({
                  ...currentMedication,
                  duration: e.target.value
                })}
                helperText="Ex: 7 dias, 30 dias, etc."
              />
            </Grid>
            <Grid sx={{ gridColumn: 'span 12' }}>
              <EnhancedTextArea
                label="Instruções de Uso"
                fullWidth
                minRows={2}
                value={currentMedication.instructions || ''}
                onChange={(e) => setCurrentMedication({
                  ...currentMedication,
                  instructions: e.target.value
                })}
                helperText="Ex: Tomar com água, após as refeições, etc."
              />
            </Grid>
            
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <EnhancedTextArea
                label="Efeitos Colaterais"
                fullWidth
                minRows={2}
                value={currentMedication.sideEffects ? currentMedication.sideEffects.join(', ') : ''}
                onChange={(e) => setCurrentMedication({
                  ...currentMedication,
                  sideEffects: e.target.value.split(',').map(item => item.trim()).filter(Boolean)
                })}
                helperText="Separar por vírgulas. Ex: Tontura, Náusea"
              />
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <EnhancedTextArea
                label="Contraindicações"
                fullWidth
                minRows={2}
                value={currentMedication.contraindications ? currentMedication.contraindications.join(', ') : ''}
                onChange={(e) => setCurrentMedication({
                  ...currentMedication,
                  contraindications: e.target.value.split(',').map(item => item.trim()).filter(Boolean)
                })}
                helperText="Separar por vírgulas. Ex: Gravidez, Asma"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMedicationDialog}>Cancelar</Button>
          <Button onClick={handleSaveMedication} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Prescriptions; 
