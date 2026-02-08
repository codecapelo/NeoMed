import React from 'react';
import { 
  TextField, 
  InputAdornment, 
  TextFieldProps 
} from '@mui/material';
import { Search } from '@mui/icons-material';

/**
 * TextField melhorado com tamanho adequado para cada tipo de informação
 * Este componente estende o TextField padrão do Material-UI com estilos
 * para garantir que as caixas de texto tenham o tamanho adequado.
 */
export const EnhancedTextField: React.FC<TextFieldProps & { search?: boolean }> = (props) => {
  const {
    placeholder = 'Buscar...',
    variant = 'outlined',
    size = 'medium',
    InputProps,
    sx,
    search,
    ...otherProps
  } = props;

  // Define o tamanho padrão para o TextField
  const defaultStyles = {
    minWidth: '120px',
    maxWidth: '100%',
  };

  // Mescla os estilos padrão com os estilos passados como prop
  const mergedSx = { ...defaultStyles, ...sx };

  // Cria o InputProps com o ícone de busca apenas se a prop search estiver presente
  const mergedInputProps = search
    ? {
        ...InputProps,
        startAdornment: (
          <InputAdornment position="start">
            <Search color="action" />
          </InputAdornment>
        ),
      }
    : InputProps;

  return (
    <TextField
      placeholder={placeholder}
      variant={variant}
      size={size}
      InputProps={mergedInputProps}
      sx={mergedSx}
      {...otherProps}
    />
  );
};

export default EnhancedTextField; 