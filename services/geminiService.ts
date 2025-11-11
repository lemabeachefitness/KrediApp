
import { GoogleGenAI } from "@google/genai";

// Assume process.env.API_KEY is configured in the environment
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. Intelligent Analysis will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getFinancialAnalysis = async (
  capital: number,
  receivables: number,
  overdueLoans: number,
  activeLoans: number
): Promise<string> => {
  if (!API_KEY) {
    return Promise.resolve("A funcionalidade de Análise Inteligente está desabilitada. Configure a chave da API do Gemini para ativá-la.");
  }
  
  const prompt = `
    Você é um consultor financeiro especialista em pequenos negócios de empréstimos. Analise os seguintes dados e forneça 3 sugestões práticas e acionáveis para melhorar a saúde financeira do negócio.
    Seja conciso e direto. Formate a resposta em markdown com um título principal e uma lista numerada para as sugestões.

    Dados Atuais:
    - Capital disponível em conta: R$ ${capital.toFixed(2)}
    - Total a receber (empréstimos pendentes): R$ ${receivables.toFixed(2)}
    - Número de empréstimos em aberto: ${activeLoans}
    - Número de empréstimos atrasados: ${overdueLoans}

    Forneça sugestões sobre gestão de risco, oportunidades de crescimento e otimização de capital.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Ocorreu um erro ao buscar a análise inteligente. Tente novamente mais tarde.";
  }
};
