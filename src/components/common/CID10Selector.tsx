import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider
} from '@mui/material';
import { Search as SearchIcon, Info as InfoIcon } from '@mui/icons-material';
import { CID10Code, searchCID10, getCID10ByCode } from '../../data/cid10';

interface CID10SelectorProps {
  value?: string;
  onSelect: (code: string, title: string) => void;
  label?: string;
}

const CID10Selector: React.FC<CID10SelectorProps> = ({
  value,
  onSelect,
  label = 'CID-10'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState<CID10Code[]>([]);
  const [selectedCode, setSelectedCode] = useState<CID10Code | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  // Carregar código selecionado
  useEffect(() => {
    if (value) {
      const code = getCID10ByCode(value);
      if (code) {
        setSelectedCode(code);
      }
    } else {
      setSelectedCode(null);
    }
  }, [value]);

  // Atualizar opções com base na busca
  useEffect(() => {
    setOptions(searchCID10(searchTerm));
  }, [searchTerm]);

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setOptions(searchCID10(''));
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSelectCode = (code: CID10Code) => {
    setSelectedCode(code);
    onSelect(code.code, code.title);
    setDialogOpen(false);
  };

  const handleOpenInfoDialog = () => {
    setInfoDialogOpen(true);
  };

  const handleCloseInfoDialog = () => {
    setInfoDialogOpen(false);
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          label={label}
          value={selectedCode ? `${selectedCode.code} - ${selectedCode.title}` : ''}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <>
                {selectedCode && (
                  <IconButton size="small" onClick={handleOpenInfoDialog}>
                    <InfoIcon />
                  </IconButton>
                )}
                <IconButton size="small" onClick={handleOpenDialog}>
                  <SearchIcon />
                </IconButton>
              </>
            )
          }}
        />
      </Box>

      {/* Diálogo de pesquisa e seleção de CID-10 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Pesquisar CID-10</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Pesquisar por código ou descrição"
            fullWidth
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
          />

          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {options.map((option, index) => (
              <React.Fragment key={option.code}>
                <ListItemButton onClick={() => handleSelectCode(option)}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip label={option.code} size="small" color="primary" sx={{ mr: 1 }} />
                        <Typography variant="body1">{option.title}</Typography>
                      </Box>
                    }
                    secondary={option.category}
                  />
                </ListItemButton>
                {index < options.length - 1 && <Divider />}
              </React.Fragment>
            ))}
            {options.length === 0 && (
              <ListItem>
                <ListItemText primary="Nenhum resultado encontrado" />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de informações sobre o código selecionado */}
      <Dialog open={infoDialogOpen} onClose={handleCloseInfoDialog}>
        <DialogTitle>Detalhes do CID-10</DialogTitle>
        <DialogContent>
          {selectedCode && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedCode.code} - {selectedCode.title}
              </Typography>
              
              {selectedCode.category && (
                <Typography variant="body1" sx={{ mt: 2 }}>
                  <strong>Categoria:</strong> {selectedCode.category}
                </Typography>
              )}
              
              {selectedCode.description && (
                <Typography variant="body1" sx={{ mt: 2 }}>
                  <strong>Descrição:</strong> {selectedCode.description}
                </Typography>
              )}
              
              <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="body2" color="text.secondary">
                  A Classificação Internacional de Doenças (CID) é o padrão internacional de classificação 
                  diagnóstica para fins epidemiológicos, de gestão de saúde e uso clínico.
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInfoDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CID10Selector; 