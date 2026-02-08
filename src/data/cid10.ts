// Definição da interface para os códigos CID-10
export interface CID10Code {
    code: string;
    title: string;
    description?: string;
    category?: string;
}

// Lista de códigos CID-10 (amostra)
export const CID10_CODES: CID10Code[] = [
    // Capítulo I - Algumas doenças infecciosas e parasitárias (A00-B99)
    { code: 'A00', title: 'Cólera', category: 'Doenças infecciosas intestinais' },
    { code: 'A01', title: 'Febres tifóide e paratifóide', category: 'Doenças infecciosas intestinais' },
    { code: 'A02', title: 'Outras infecções por Salmonella', category: 'Doenças infecciosas intestinais' },
    { code: 'A03', title: 'Shiguelose', category: 'Doenças infecciosas intestinais' },
    { code: 'A04', title: 'Outras infecções intestinais bacterianas', category: 'Doenças infecciosas intestinais' },
    { code: 'A05', title: 'Outras intoxicações alimentares bacterianas', category: 'Doenças infecciosas intestinais' },
    
    // Capítulo IX - Doenças do aparelho circulatório (I00-I99)
    { code: 'I10', title: 'Hipertensão essencial (primária)', category: 'Doenças hipertensivas' },
    { code: 'I11', title: 'Doença cardíaca hipertensiva', category: 'Doenças hipertensivas' },
    { code: 'I12', title: 'Doença renal hipertensiva', category: 'Doenças hipertensivas' },
    { code: 'I13', title: 'Doença cardíaca e renal hipertensiva', category: 'Doenças hipertensivas' },
    { code: 'I15', title: 'Hipertensão secundária', category: 'Doenças hipertensivas' },
    { code: 'I20', title: 'Angina pectoris', category: 'Doenças isquêmicas do coração' },
    { code: 'I21', title: 'Infarto agudo do miocárdio', category: 'Doenças isquêmicas do coração' },
    { code: 'I22', title: 'Infarto do miocárdio recorrente', category: 'Doenças isquêmicas do coração' },
    
    // Capítulo IV - Doenças endócrinas, nutricionais e metabólicas (E00-E90)
    { code: 'E10', title: 'Diabetes mellitus insulino-dependente', category: 'Diabetes mellitus' },
    { code: 'E11', title: 'Diabetes mellitus não-insulino-dependente', category: 'Diabetes mellitus' },
    { code: 'E12', title: 'Diabetes mellitus relacionado à desnutrição', category: 'Diabetes mellitus' },
    { code: 'E13', title: 'Outros tipos especificados de diabetes mellitus', category: 'Diabetes mellitus' },
    { code: 'E14', title: 'Diabetes mellitus não especificado', category: 'Diabetes mellitus' },
    
    // Capítulo V - Transtornos mentais e comportamentais (F00-F99)
    { code: 'F00', title: 'Demência na doença de Alzheimer', category: 'Transtornos mentais orgânicos' },
    { code: 'F01', title: 'Demência vascular', category: 'Transtornos mentais orgânicos' },
    { code: 'F02', title: 'Demência em outras doenças classificadas em outra parte', category: 'Transtornos mentais orgânicos' },
    { code: 'F03', title: 'Demência não especificada', category: 'Transtornos mentais orgânicos' },
    { code: 'F32', title: 'Episódios depressivos', category: 'Transtornos do humor [afetivos]' },
    { code: 'F41', title: 'Outros transtornos ansiosos', category: 'Transtornos neuróticos' },
    
    // Capítulo X - Doenças do aparelho respiratório (J00-J99)
    { code: 'J00', title: 'Nasofaringite aguda [resfriado comum]', category: 'Infecções agudas das vias aéreas superiores' },
    { code: 'J01', title: 'Sinusite aguda', category: 'Infecções agudas das vias aéreas superiores' },
    { code: 'J02', title: 'Faringite aguda', category: 'Infecções agudas das vias aéreas superiores' },
    { code: 'J03', title: 'Amigdalite aguda', category: 'Infecções agudas das vias aéreas superiores' },
    { code: 'J04', title: 'Laringite e traqueíte agudas', category: 'Infecções agudas das vias aéreas superiores' },
    { code: 'J45', title: 'Asma', category: 'Doenças crônicas das vias aéreas inferiores' },
    
    // Capítulo XIII - Doenças do sistema osteomuscular e do tecido conjuntivo (M00-M99)
    { code: 'M05', title: 'Artrite reumatóide soro-positiva', category: 'Artropatias' },
    { code: 'M10', title: 'Gota', category: 'Artropatias' },
    { code: 'M16', title: 'Coxartrose [artrose do quadril]', category: 'Artropatias' },
    { code: 'M17', title: 'Gonartrose [artrose do joelho]', category: 'Artropatias' },
    { code: 'M51', title: 'Outros transtornos de discos intervertebrais', category: 'Dorsopatias' },
    { code: 'M54', title: 'Dorsalgia', category: 'Dorsopatias' },
];

// Função para buscar códigos CID-10 por texto
export const searchCID10 = (query: string): CID10Code[] => {
    if (!query || query.trim() === '') {
        return CID10_CODES;
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    
    return CID10_CODES.filter(code => 
        code.code.toLowerCase().includes(normalizedQuery) ||
        code.title.toLowerCase().includes(normalizedQuery) ||
        (code.category && code.category.toLowerCase().includes(normalizedQuery))
    );
};

// Função para obter um código CID-10 específico
export const getCID10ByCode = (code: string): CID10Code | undefined => {
    return CID10_CODES.find(item => item.code === code);
}; 