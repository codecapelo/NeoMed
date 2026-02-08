import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

/**
 * TextArea melhorado com tamanho adequado para informações maiores como descrições
 * Este componente estende o TextField do Material-UI, configurado como multiline,
 * com estilos aprimorados para melhor exibição e usabilidade.
 */
const EnhancedTextArea: React.FC<TextFieldProps> = (props) => {
  const { 
    minRows = 3, 
    maxRows = 6,
    ...otherProps 
  } = props as TextFieldProps & { minRows?: number; maxRows?: number };

  // Define o tamanho padrão para o TextArea
  const defaultStyles = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderRadius: '8px',
      },
    },
    '& .MuiInputBase-input': {
      fontSize: '1rem',
      lineHeight: '1.5',
    }
  };

  // Define o estilo padrão para o InputProps
  const defaultInputProps = {
    style: { 
      padding: '12px 14px',
    }
  };

  // Mescla os estilos padrão com os estilos personalizados do usuário
  const mergedSx = { ...defaultStyles, ...(props.sx || {}) };
  
  // Mescla os InputProps padrão com os InputProps personalizados do usuário
  const mergedInputProps = {
    ...defaultInputProps,
    ...(props.InputProps || {}),
    style: {
      ...defaultInputProps.style,
      ...(props.InputProps?.style || {})
    }
  };

  return (
    <TextField
      {...otherProps}
      multiline
      minRows={minRows}
      maxRows={maxRows}
      fullWidth
      sx={mergedSx}
      InputProps={mergedInputProps}
    />
  );
};

export default EnhancedTextArea; 