
import React, { useState } from 'react';
import { ProductInterest, ProductOrder, InventoryItem } from '../types';

interface AdminStoreManagementProps {
  interests: ProductInterest[];
  orders: ProductOrder[];
  inventory: InventoryItem[];
  onUpdateInterest: (id: string, data: Partial<ProductInterest>) => void;
  onUpdateOrder: (id: string, data: Partial<ProductOrder>) => void;
  onDeleteInterest: (id: string) => void;
  onDeleteOrder: (id: string) => void;
}

const AdminStoreManagement: React.FC<AdminStoreManagementProps> = ({ 
  interests, 
  orders, 
  inventory, 
  onUpdateInterest, 
  onUpdateOrder, 
  onDeleteInterest, 
  onDeleteOrder 
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'interests'>('orders');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-tea-900">Gestão da Loja</h2>
          <p className="text-sm text-gray-500">Acompanhe pedidos e interesses dos clientes</p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400 hover:text-tea-700'}`}
          >
            Pedidos ({orders.length})
          </button>
          <button 
            onClick={() => setActiveTab('interests')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'interests' ? 'bg-white text-tea-900 shadow-sm' : 'text-gray-400 hover:text-tea-700'}`}
          >
            Interesses ({interests.length})
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produto</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pagamento / Entrega</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Nenhum pedido realizado ainda.</td>
                  </tr>
                ) : (
                  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-tea-900">{order.customerName}</div>
                        <div className="text-[10px] text-gray-400">{order.customerWhatsapp}</div>
                        <div className="text-[9px] text-gray-300 mt-1">{new Date(order.createdAt).toLocaleString('pt-BR')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-tea-800">{order.productName}</div>
                        <div className="text-[10px] text-gray-400">Qtd: {order.quantity}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-bold uppercase text-tea-700">
                          {order.paymentMethod === 'pix' ? 'Pix' : 
                           order.paymentMethod === 'cash' ? 'Dinheiro' : 
                           order.paymentMethod === 'debit' ? 'Débito' : 
                           order.paymentMethod === 'credit' ? 'Crédito' : 
                           order.paymentMethod === 'store_installments' ? 'A Prazo' :
                           order.paymentMethod}
                          {order.installmentsCount && order.installmentsCount > 1 && ` (${order.installmentsCount}x)`}
                        </div>
                        <div className="text-[10px] text-gray-500">{order.deliveryOption === 'pickup' ? 'Retirada no Local' : 'Entrega na Região'}</div>
                        {order.deliveryAddress && (
                          <div className="text-[9px] text-gray-400 italic max-w-[150px] truncate" title={order.deliveryAddress}>
                            {order.deliveryAddress}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-tea-900">R$ {order.totalPrice.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <select 
                          value={order.status}
                          onChange={(e) => onUpdateOrder(order.id, { status: e.target.value as any })}
                          className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border-none outline-none cursor-pointer ${
                            order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                            order.status === 'paid' ? 'bg-blue-100 text-blue-600' :
                            order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                            'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <option value="pending">Pendente</option>
                          <option value="paid">Pago</option>
                          <option value="delivered">Entregue</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => { if(confirm('Excluir este pedido?')) onDeleteOrder(order.id); }}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produto Solicitado</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {interests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">Nenhum interesse registrado ainda.</td>
                  </tr>
                ) : (
                  interests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(interest => (
                    <tr key={interest.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-tea-900">{interest.customerName}</div>
                        <div className="text-[10px] text-gray-400">{interest.customerWhatsapp}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-tea-800">{interest.productName}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(interest.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <select 
                          value={interest.status}
                          onChange={(e) => onUpdateInterest(interest.id, { status: e.target.value as any })}
                          className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border-none outline-none cursor-pointer ${
                            interest.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                            interest.status === 'contacted' ? 'bg-blue-100 text-blue-600' :
                            'bg-green-100 text-green-600'
                          }`}
                        >
                          <option value="pending">Pendente</option>
                          <option value="contacted">Contatado</option>
                          <option value="resolved">Resolvido</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <a 
                            href={`https://wa.me/55${interest.customerWhatsapp.replace(/\D/g, '')}?text=Olá ${interest.customerName}! Vimos seu interesse no produto ${interest.productName} no Studio Moriá.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500 hover:scale-110 transition-transform"
                            title="Chamar no WhatsApp"
                          >
                            💬
                          </a>
                          <button 
                            onClick={() => { if(confirm('Excluir este registro de interesse?')) onDeleteInterest(interest.id); }}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStoreManagement;
