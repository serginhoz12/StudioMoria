
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

const AdminVeo: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [statusMessage, setStatusMessage] = useState('');

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

    // Checking for API key selection window.aistudio helper
    if (!(window as any).aistudio?.hasSelectedApiKey()) {
        await (window as any).aistudio?.openSelectKey();
        // After opening the dialog, we assume the user might have selected it and continue.
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setStatusMessage("Enviando imagem e iniciando processamento...");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const base64Data = image.split(',')[1];
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Animate this beauty salon work to look professional and cinematic, subtle movements.',
        image: {
          imageBytes: base64Data,
          mimeType: 'image/jpeg',
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio
        }
      });

      setStatusMessage("Gerando vídeo... Isso pode levar alguns minutos. Estamos criando algo incrível!");

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setStatusMessage("Pronto! Seu vídeo está pronto.");
      } else {
        throw new Error("Não foi possível obter o link do vídeo.");
      }
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found")) {
          alert("Erro de chave de API. Por favor, selecione novamente.");
          await (window as any).aistudio?.openSelectKey();
      }
      setStatusMessage("Ocorreu um erro ao gerar o vídeo. Verifique sua chave API.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-serif text-tea-900 mb-4">Moriá Cine Lab</h2>
        <p className="text-gray-500 italic">Transforme fotos de seus procedimentos em vídeos mágicos para o Instagram usando a IA Veo da Google.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-tea-100">
          <h3 className="text-lg font-bold mb-6">1. Configurações do Vídeo</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Upload da Foto (Antes/Depois)</label>
              <div className="border-2 border-dashed border-tea-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-tea-50/50 cursor-pointer hover:bg-tea-50 transition" onClick={() => document.getElementById('fileInput')?.click()}>
                {image ? (
                  <img src={image} className="w-full h-48 object-cover rounded-xl" alt="Preview" />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-tea-500 font-bold">+ Selecionar Foto</p>
                    <p className="text-[10px] text-gray-400">JPG ou PNG até 5MB</p>
                  </div>
                )}
                <input id="fileInput" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Formato (Aspect Ratio)</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex-1 py-3 rounded-xl font-bold border ${aspectRatio === '9:16' ? 'bg-tea-600 text-white border-tea-600' : 'bg-white text-gray-500 border-gray-200'}`}
                >
                  9:16 (Reels/Stories)
                </button>
                <button 
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex-1 py-3 rounded-xl font-bold border ${aspectRatio === '16:9' ? 'bg-tea-600 text-white border-tea-600' : 'bg-white text-gray-500 border-gray-200'}`}
                >
                  16:9 (Landscape)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sugestão de Animação (Opcional)</label>
              <textarea 
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-tea-200 h-24"
                placeholder="Ex: Luzes suaves passando, cabelos balançando levemente, brilho no rosto..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <button 
              onClick={generateVideo}
              disabled={isGenerating || !image}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition ${isGenerating ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-tea-600 text-white hover:bg-tea-700 shadow-tea-200'}`}
            >
              {isGenerating ? 'Processando...' : '🎬 Gerar Vídeo IA'}
            </button>
          </div>
        </div>

        <div className="bg-gray-900 rounded-3xl min-h-[500px] flex flex-col items-center justify-center p-8 text-center text-white border-4 border-gray-800 relative overflow-hidden">
          {isGenerating ? (
            <div className="space-y-6 z-10 animate-pulse">
              <div className="w-20 h-20 border-4 border-tea-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-tea-200 font-serif text-xl italic">{statusMessage}</p>
              <div className="max-w-xs mx-auto text-xs text-gray-400 leading-relaxed">
                Nossa inteligência artificial está analisando as texturas e profundidade da sua imagem para criar um movimento cinematográfico elegante.
              </div>
            </div>
          ) : videoUrl ? (
            <div className="w-full h-full space-y-4">
              <video src={videoUrl} controls autoPlay loop className="w-full h-auto rounded-xl shadow-2xl mx-auto max-h-[600px]" />
              <div className="flex gap-2 justify-center">
                 <a href={videoUrl} download="moria-cine.mp4" className="bg-tea-500 px-6 py-2 rounded-full font-bold text-sm">Download MP4</a>
                 <button onClick={() => setVideoUrl(null)} className="bg-white/10 px-6 py-2 rounded-full font-bold text-sm">Novo Vídeo</button>
              </div>
            </div>
          ) : (
            <div className="z-10 space-y-4">
              <div className="text-6xl mb-4 opacity-50">📽️</div>
              <p className="text-gray-400 font-medium">O resultado aparecerá aqui.</p>
              <p className="text-xs text-gray-500 max-w-[200px]">Os vídeos gerados duram cerca de 5-6 segundos e são perfeitos para Reels.</p>
            </div>
          )}
          
          {/* Decorative background for the theater view */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl border border-tea-100 flex items-center gap-6">
          <div className="text-3xl">💡</div>
          <div>
            <h4 className="font-bold text-tea-900">Dica Moriá</h4>
            <p className="text-sm text-gray-500">Para melhores resultados, use fotos bem iluminadas. A IA funciona melhor quando há contrastes claros entre o sujeito e o fundo.</p>
          </div>
      </div>
    </div>
  );
};

export default AdminVeo;
