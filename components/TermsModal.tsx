
import React from 'react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'terms' | 'privacy';
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, title, type }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        <div className="p-8 border-b border-tea-50 flex justify-between items-center bg-tea-50/30">
          <h3 className="text-2xl font-serif font-bold text-tea-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-tea-100 rounded-full transition-colors text-tea-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto custom-scroll text-gray-600 space-y-6 leading-relaxed">
          {type === 'terms' ? (
            <>
              <section>
                <h4 className="font-bold text-tea-800 mb-2 uppercase text-xs tracking-widest">1. Agendamentos</h4>
                <p>Os agendamentos realizados pelo Studio Moriá Estética via sistema online estão sujeitos à confirmação. Solicitamos pontualidade para garantir a qualidade de todos os atendimentos.</p>
              </section>
              <section>
                <h4 className="font-bold text-tea-800 mb-2 uppercase text-xs tracking-widest">2. Cancelamentos e Remarcações</h4>
                <p>O cancelamento ou remarcação deve ser feito com pelo menos 24 horas de antecedência. Cancelamentos tardios ou não comparecimento podem comprometer futuros agendamentos e estar sujeitos a taxas administrativas.</p>
              </section>
              <section>
                <h4 className="font-bold text-tea-800 mb-2 uppercase text-xs tracking-widest">3. Responsabilidades do Usuário</h4>
                <p>O cliente compromete-se a fornecer informações verídicas e atualizadas, sendo responsável pela segurança de seu acesso e dados informados.</p>
              </section>
              <section>
                <h4 className="font-bold text-tea-800 mb-2 uppercase text-xs tracking-widest">4. Propriedade Intelectual</h4>
                <p>Todo o conteúdo, fotos de procedimentos e logotipo exibidos neste sistema são de propriedade exclusiva do Studio Moriá Estética, sendo proibida a reprodução sem autorização prévia.</p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h4 className="font-bold text-tea-800 mb-2 uppercase text-xs tracking-widest">1. Coleta de Dados</h4>
                <p>Coletamos seu nome completo e número de WhatsApp exclusivamente para identificação em nossos agendamentos e facilitação de contato direto.</p>
              </section>
              <section>
                <h4 className="font-bold text-tea-800 mb-2 uppercase text-xs tracking-widest">2. Finalidade (LGPD)</h4>
                <p>Seus dados são utilizados para: (a) Gestão de horários; (b) Envio de lembretes de atendimento; (c) Comunicações de novidades e promoções, quando autorizado por você.</p>
              </section>
              <section>
                <h4 className="font-bold text-tea-800 mb-2 uppercase text-xs tracking-widest">3. Segurança e Armazenamento</h4>
                <p>O Studio Moriá Estética adota medidas técnicas de segurança para proteger seus dados contra acessos não autorizados e situações acidentais de destruição ou perda.</p>
              </section>
              <section>
                <h4 className="font-bold text-tea-800 mb-2 uppercase text-xs tracking-widest">4. Seus Direitos</h4>
                <p>Conforme a Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar a qualquer momento o acesso, correção ou exclusão definitiva de seus dados de nossa base de clientes.</p>
              </section>
              <section>
                <h4 className="font-bold text-tea-800 mb-2 uppercase text-xs tracking-widest">5. Notificações WhatsApp</h4>
                <p>Ao manter a opção de notificações habilitada, você autoriza o Studio a enviar mensagens automáticas. Esta preferência pode ser alterada a qualquer momento no seu perfil.</p>
              </section>
            </>
          )}
        </div>

        <div className="p-8 border-t border-tea-50 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-tea-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-tea-700 transition shadow-lg shadow-tea-100"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
