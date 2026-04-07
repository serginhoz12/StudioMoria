
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Booking, Transaction, Customer, InventoryItem } from '../types';

interface BusinessInsightsProps {
  bookings: Booking[];
  transactions: Transaction[];
  customers: Customer[];
  inventory: InventoryItem[];
}

const BusinessInsights: React.FC<BusinessInsightsProps> = ({ bookings, transactions, customers, inventory }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const generateInsight = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        
        // Prepare a summary of data to send to the model
        const today = new Date().toISOString().split('T')[0];
        const bookingsToday = bookings.filter(b => b.dateTime.startsWith(today)).length;
        const bookingsPending = bookings.filter(b => b.status === 'pending').length;
        const lowStockItems = inventory.filter(i => i.quantity <= i.minQuantity).length;
        const totalCustomers = customers.length;
        
        // Recent revenue (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentRevenue = transactions
          .filter(t => t.type === 'receivable' && t.status === 'paid' && new Date(t.date) >= sevenDaysAgo)
          .reduce((acc, t) => acc + t.amount, 0);

        const prompt = `
          Você é um assistente de inteligência de negócios para o painel administrativo de um salão de estética (Studio Moriá).
          
          Dados atuais do negócio:
          - Agendamentos para hoje: ${bookingsToday}
          - Agendamentos aguardando confirmação: ${bookingsPending}
          - Itens com estoque baixo: ${lowStockItems}
          - Total de clientes na base: ${totalCustomers}
          - Faturamento dos últimos 7 dias: R$ ${recentRevenue.toFixed(2)}
          
          Objetivo:
          Gerar insights curtos e úteis para ajudar a gestora a entender a saúde do negócio, aumentar a frequência das clientes e atrair novas clientes.

          Regras importantes:
          - Use no máximo 2 frases.
          - Linguagem amigável, leve e motivadora.
          - Não faça análises complexas ou previsões.
          - Não use cálculos avançados.
          - Não pesquise informações externas.
          - Use apenas os dados fornecidos.
          - Evite repetir números já mostrados no dashboard.

          Prioridades de análise:
          1. Movimento da agenda
          2. Frequência e retorno de clientes
          3. Entrada de novas clientes
          4. Faturamento geral
          5. Estoque ou possíveis riscos operacionais
          6. Oportunidades de marketing simples

          Formato da resposta:
          Gerar apenas 1 insight curto com uma sugestão prática para melhorar o negócio.
        `;

        const result = await (ai as any).models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ parts: [{ text: prompt }] }],
        });

        setInsight(result.text || 'Continue o excelente trabalho cuidando das suas clientes!');
      } catch (error) {
        console.error("Erro ao gerar insight:", error);
        setInsight('Aproveite o dia para fortalecer o relacionamento com suas clientes fiéis.');
      } finally {
        setLoading(false);
      }
    };

    generateInsight();
  }, [bookings, transactions, customers, inventory]);

  return (
    <div className="bg-gradient-to-br from-tea-800 to-tea-900 p-6 rounded-[2.5rem] shadow-xl border border-tea-700/50 relative overflow-hidden group">
      {/* Decorative elements */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-500"></div>
      <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-tea-400/5 rounded-full blur-3xl group-hover:bg-tea-400/10 transition-all duration-500"></div>
      
      <div className="relative flex items-start gap-4">
        <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10">
          <span className="text-2xl">✨</span>
        </div>
        <div className="flex-1">
          <h3 className="text-[10px] font-bold text-tea-200 uppercase tracking-[0.2em] mb-2">Moriá AI • Insight do Dia</h3>
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4"></div>
              <div className="h-4 bg-white/10 rounded w-1/2"></div>
            </div>
          ) : (
            <p className="text-white font-medium leading-relaxed text-sm md:text-base">
              {insight}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessInsights;
