import axios from 'axios';

/**
 * Gera conteúdo via IA usando o proxy do servidor para manter a API Key segura.
 */
export async function generateAIContent(prompt: string, model: string = "gemini-1.5-flash"): Promise<string> {
  try {
    // Tenta usar o proxy do servidor
    const response = await axios.post('/api/gemini', {
      prompt,
      model
    });
    
    return response.data.text || '';
  } catch (error) {
    console.error("Erro ao chamar proxy Gemini:", error);
    throw error;
  }
}
