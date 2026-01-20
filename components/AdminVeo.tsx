
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

const AdminVeo: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const selected = await (window as any).aistudio?.hasSelectedApiKey();
    setHasKey(!!selected);
  };

  const handleSelectKey = async () => {
    await (window as any).aistudio?.openSelectKey();
    // Após abrir o seletor, assumimos sucesso para prosseguir conforme orientações
    setHasKey(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateVideo = async () => {
    if (!image) {
      alert("Por favor, selecione uma imagem primeiro.");
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setStatusMessage("Iniciando conexão com a IA Google Veo...");

    try {
      // Criar nova instância para garantir o uso da chave mais recente
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];
      
      setStatusMessage("Enviando mídia e processando animação...");

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Crie uma animação profissional de salão de estética, movimentos suaves e luz cinematográfica.',
        image: {
          imageBytes: base64Data,
          mimeType: mimeType || 'image/png',
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio
        }
      });

      setStatusMessage("Gerando vídeo... Este processo pode levar de 2 a 5 minutos. Aguarde, estamos criando algo incrível!");

      while (!operation.done) {
        // Aguarda 10 segundos entre as verificações de status
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (downloadLink) {
        setStatusMessage("Baixando arquivo final...");
        // É obrigatório anexar a chave na URL de download
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error("Falha ao baixar o vídeo gerado.");
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setStatusMessage("Vídeo pronto para uso!");
      } else {
        throw new Error("O modelo não retornou um link de download.");
      }
    } catch (error: any) {
      console.error("Erro na geração Veo:", error);
      
      if (error.message?.includes("Requested entity was not found") || error.status === 404) {
        alert("Sua chave API expirou ou não possui faturamento ativo. Por favor, selecione novamente.");
        setHasKey(false);
        await handleSelectKey();
      } else {
        setStatusMessage(`Erro: ${error.message || "Ocorreu uma falha na geração."}`);
        alert("Não foi possível gerar o vídeo. Verifique se sua conta Google Cloud possui faturamento ativo.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 text-center animate-fade-in">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-tea-100 space-y-8">
          <div className="w-24 h-24 bg-tea-50 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">🔑</div>
          <div className="space-y-4">
            <h2 className="text-3xl font-serif text-tea-900 font-bold italic">Configuração Necessária</h2>
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
              Para usar a IA de vídeos (Veo), você precisa conectar uma Chave API de um projeto Google Cloud com faturamento ativo.
            </p>
          </div>
          <div className="space-y-4 pt-4">
            <button 
              onClick={handleSelectKey}
              className="w-full py-5 bg-tea-900 text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl hover:bg-black transition-all"
            >
              Selecionar Chave API
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer"
              className="block text-[10px] text-tea-600 font-bold uppercase tracking-widest hover:underline"
            >
              Saiba mais sobre faturamento (Billing)
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h2 className="text-3xl font-serif text-tea-900 mb-4 font-bold italic">Moriá Cine Lab</h2>
        <p className="text-gray-500 italic text-sm">Crie vídeos de marketing cinematográficos para o Instagram a partir de fotos de seus procedimentos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-tea-50">
          <h3 className="text-sm font-bold text-tea-900 uppercase tracking-widest mb-6">1. Configurações da Mídia</h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Foto do Procedimento</label>
              <div 
                className="border-2 border-dashed border-tea-100 rounded-[2rem] p-4 flex flex-col items-center justify-center bg-tea-50/20 cursor-pointer hover:bg-tea-50 transition min-h-[200px]" 
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                {image ? (
                  <img src={image} className="w-full h-48 object-cover rounded-2xl shadow-md" alt="Preview" />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-tea-700 font-bold text-sm mb-1">+ Selecionar Foto</p>
                    <p className="text-[10px] text-gray-400">Clique para escolher do seu dispositivo</p>
                  </div>
                )}
                <input id="fileInput" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Formato de Saída</label>
              <div className="flex gap-3">
                <button 
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all uppercase text-[9px] tracking-widest ${aspectRatio === '9:16' ? 'bg-tea-900 text-white border-tea-900 shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}
                >
                  9:16 (Reels/Stories)
                </button>
                <button 
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all uppercase text-[9px] tracking-widest ${aspectRatio === '16:9' ? 'bg-tea-900 text-white border-tea-900 shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}
                >
                  16:9 (Horizontal)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Estilo da Animação (Opcional)</label>
              <textarea 
                className="w-full p-5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-tea-100 h-24 text-sm"
                placeholder="Ex: Cabelos balançando levemente, brilho suave na pele, zoom cinematográfico..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <button 
              onClick={generateVideo}
              disabled={isGenerating || !image}
              className={`w-full py-6 rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all ${isGenerating ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-tea-800 text-white hover:bg-black shadow-tea-900/10 active:scale-95'}`}
            >
              {isGenerating ? 'Gerando...' : '🎬 Criar Vídeo com IA'}
            </button>
          </div>
        </div>

        <div className="bg-tea-950 rounded-[3.5rem] min-h-[500px] flex flex-col items-center justify-center p-8 text-center text-white border-4 border-tea-900 relative overflow-hidden shadow-2xl">
          {isGenerating ? (
            <div className="space-y-8 z-10 animate-fade-in px-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-tea-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center text-xl">🎬</div>
              </div>
              <div className="space-y-3">
                <p className="text-tea-200 font-serif text-xl italic">{statusMessage}</p>
                <p className="text-[10px] text-gray-400 leading-relaxed uppercase tracking-widest max-w-[280px] mx-auto">
                  Por favor, não feche esta página. A IA está esculpindo cada frame do seu vídeo.
                </p>
              </div>
            </div>
          ) : videoUrl ? (
            <div className="w-full h-full space-y-6 z-10 animate-slide-up">
              <div className="relative group rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10">
                <video src={videoUrl} controls autoPlay loop className="w-full h-auto max-h-[600px]" />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
                 <a 
                   href={videoUrl} 
                   download={`moria-ai-${Date.now()}.mp4`} 
                   className="flex-1 bg-tea-600 text-white px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl hover:bg-tea-700 transition-all"
                 >
                   Baixar Vídeo MP4
                 </a>
                 <button 
                   onClick={() => setVideoUrl(null)} 
                   className="flex-1 bg-white/10 backdrop-blur-md px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10"
                 >
                   Criar Outro
                 </button>
              </div>
            </div>
          ) : (
            <div className="z-10 space-y-6 px-10">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner border border-white/10 mb-2">🎞️</div>
              <div className="space-y-2">
                <p className="text-tea-100 font-serif text-lg italic font-bold">Laboratório de Vídeo</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] leading-relaxed max-w-[240px] mx-auto">
                  Aguardando sua foto para transformar estática em movimento cinematográfico.
                </p>
              </div>
            </div>
          )}
          
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-tea-900/20 via-transparent to-transparent opacity-60"></div>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-[2.5rem] border border-tea-100 flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="w-16 h-16 bg-tea-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">💡</div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="font-bold text-tea-950 text-sm mb-1 uppercase tracking-widest">Dica de Qualidade</h4>
            <p className="text-xs text-gray-500 leading-relaxed font-light">
              Para um resultado profissional, utilize fotos com iluminação natural. A IA Veo entrega movimentos mais fluidos quando o fundo da imagem é nítido e bem iluminado.
            </p>
          </div>
          <button onClick={() => setHasKey(false)} className="text-[9px] text-gray-300 font-bold uppercase tracking-widest hover:text-red-400 transition-colors">Trocar Chave API</button>
      </div>
    </div>
  );
};

export default AdminVeo;
