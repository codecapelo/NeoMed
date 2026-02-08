import React from 'react';
import { 
  Box, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent 
} from '@mui/material';
import { EnhancedTextField } from '../common';

interface PatientFilterProps {
  searchTerm: string;
  bloodType: string;
  gender: string;
  setSearchTerm: (value: string) => void;
  setBloodType: (value: string) => void;
  setGender: (value: string) => void;
}

const PatientFilter: React.FC<PatientFilterProps> = ({
  searchTerm,
  bloodType,
  gender,
  setSearchTerm,
  setBloodType,
  setGender
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleBloodTypeChange = (e: SelectChangeEvent) => {
    setBloodType(e.target.value);
  };

  const handleGenderChange = (e: SelectChangeEvent) => {
    setGender(e.target.value);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <EnhancedTextField
            fullWidth
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={handleSearchChange}
            size="small"
            search
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="blood-type-label">Tipo Sanguíneo</InputLabel>
            <Select
              labelId="blood-type-label"
              id="blood-type"
              value={bloodType}
              label="Tipo Sanguíneo"
              onChange={handleBloodTypeChange}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="A+">A+</MenuItem>
              <MenuItem value="A-">A-</MenuItem>
              <MenuItem value="B+">B+</MenuItem>
              <MenuItem value="B-">B-</MenuItem>
              <MenuItem value="AB+">AB+</MenuItem>
              <MenuItem value="AB-">AB-</MenuItem>
              <MenuItem value="O+">O+</MenuItem>
              <MenuItem value="O-">O-</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="gender-label">Gênero</InputLabel>
            <Select
              labelId="gender-label"
              id="gender"
              value={gender}
              label="Gênero"
              onChange={handleGenderChange}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="male">Masculino</MenuItem>
              <MenuItem value="female">Feminino</MenuItem>
              <MenuItem value="other">Outro</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PatientFilter; 