/**
 * Script para importar códigos CID-10 a partir de um texto extraído de um PDF
 * 
 * Como usar:
 * 1. Extraia o texto do PDF do CID-10
 * 2. Cole o texto em um arquivo "cid10_extract.txt"
 * 3. Execute este script com Node.js: node importCID10.js
 * 4. O script irá processar o texto e gerar um arquivo JSON com os códigos
 */

const fs = require('fs');
const path = require('path');

// Função para processar o texto extraído do PDF
function processCID10Text(text) {
    const lines = text.split('\n');
    const codes = [];
    let currentCategory = '';
    
    // Expressão regular para reconhecer uma linha de código CID-10
    // Formato típico: "A01.0 Febre tifoide"
    const codePattern = /^([A-Z]\d{2}(?:\.\d+)?)\s+(.+)$/;
    
    // Expressão regular para reconhecer uma linha de categoria
    // Formato típico: "Doenças infecciosas intestinais (A00-A09)"
    const categoryPattern = /^(.+)\s+\(([A-Z]\d{2}-[A-Z]\d{2})\)$/;
    
    for (const line of lines) {
        const cleanLine = line.trim();
        
        if (!cleanLine) continue;
        
        // Verificar se é uma linha de categoria
        const categoryMatch = cleanLine.match(categoryPattern);
        if (categoryMatch) {
            currentCategory = categoryMatch[1].trim();
            continue;
        }
        
        // Verificar se é uma linha de código
        const codeMatch = cleanLine.match(codePattern);
        if (codeMatch) {
            codes.push({
                code: codeMatch[1].trim(),
                title: codeMatch[2].trim(),
                category: currentCategory
            });
        }
    }
    
    return codes;
}

// Caminho para o arquivo de texto extraído do PDF
const extractPath = path.join(__dirname, 'cid10_extract.txt');

// Verificar se o arquivo existe
if (!fs.existsSync(extractPath)) {
    console.error('Arquivo cid10_extract.txt não encontrado!');
    console.log('Por favor, crie este arquivo com o texto extraído do PDF do CID-10.');
    process.exit(1);
}

// Ler e processar o arquivo
try {
    const text = fs.readFileSync(extractPath, 'utf8');
    const codes = processCID10Text(text);
    
    if (codes.length === 0) {
        console.error('Nenhum código CID-10 foi extraído do texto!');
        process.exit(1);
    }
    
    // Caminho para o arquivo de saída
    const outputPath = path.join(__dirname, 'cid10_imported.json');
    
    // Salvar os códigos em um arquivo JSON
    fs.writeFileSync(outputPath, JSON.stringify(codes, null, 2), 'utf8');
    
    console.log(`${codes.length} códigos CID-10 foram extraídos e salvos em ${outputPath}.`);
} catch (error) {
    console.error('Erro ao processar o arquivo:', error);
    process.exit(1);
} 