
import React, { useState } from 'react';
import { InventoryItem, Customer, ProductSale, Service } from '../types';

interface AdminInventoryProps {
  inventory: InventoryItem[];
  customers: Customer[];
  services: Service[];
  onUpdate: (id: string, data: Partial<InventoryItem>) => void;
  onDelete: (id: string) => void;
  onAdd: (data: Omit<InventoryItem, 'id'>) => void;
  onSellProduct: (sale: Omit<ProductSale, 'id'>) => void;
}

const AdminInventory: React.FC<AdminInventoryProps> = ({ inventory, customers, services, onUpdate, onDelete, onAdd, onSellProduct }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sellingItem, setSellingItem] = useState<InventoryItem | null>(null);
  const [saleForm, setSaleForm] = useState({
    customerId: '',
    quantity: 1,
    price: 0
  });
  
  const initialItem: Omit<InventoryItem, 'id'> = {
    name: '',
    category: '',
    quantity: 0,
    minQuantity: 0,
    unit: 'un',
    lastRestockedAt: new Date().toISOString(),
    netWeight: 0,
    grossWeight: 0,
    weightUnit: 'g',
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    usageStartDate: '',
    paymentMethod: 'pix' as any,
    installmentsCount: 1,
    imageUrl: '',
    description: '',
    customerPrice: 0,
    visitorPrice: 0,
    showOnSite: false,
    exclusiveForCustomers: false,
    associatedServiceIds: []
  };

  const [formItem, setFormItem] = useState<Omit<InventoryItem, 'id'>>(initialItem);
  const [isSaving, setIsSaving] = useState(false);

  const categories = Array.from(new Set(inventory.map(item => item.category)));

  const handleEdit = (item: InventoryItem) => {
    const { id, ...rest } = item;
    setEditingId(id);
    setFormItem(rest);
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!formItem.name || !formItem.category) {
      alert("Por favor, preencha o nome e a categoria do produto.");
      return;
    }
    
    setIsSaving(true);
    try {
      if (editingId) {
        await onUpdate(editingId, formItem);
      } else {
        await onAdd(formItem);
      }
      setIsAdding(false);
      setEditingId(null);
      setFormItem(initialItem);
    } catch (err) {
      console.error("Erro ao salvar item no componente:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormItem(initialItem);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-tea-900">Estoque</h2>
          <p className="text-sm text-gray-500">Gerencie os produtos e materiais do salão</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-tea-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-tea-900 transition-colors shadow-md"
          >
            + Novo Item
          </button>
        )}
      </div>

      {/* Dica de Uso */}
      {!isAdding && inventory.length > 0 && (
        <div className="bg-tea-50 border border-tea-100 p-4 rounded-2xl flex items-center gap-3">
          <span className="text-xl">💡</span>
          <p className="text-xs text-tea-900 font-medium">
            Para alterar as informações de um produto, basta clicar no botão <span className="font-bold text-tea-700">"EDITAR"</span> localizado no final da linha de cada item na tabela abaixo.
          </p>
        </div>
      )}

      {/* Low Stock Alert */}
      {inventory.some(item => item.quantity <= item.minQuantity) && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-xl">
          <div className="flex items-center">
            <span className="text-orange-400 mr-3">⚠️</span>
            <p className="text-sm text-orange-800 font-medium">
              Atenção: {inventory.filter(item => item.quantity <= item.minQuantity).length} itens com estoque baixo!
            </p>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-tea-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-tea-900 mb-4">
            {editingId ? 'Editar Item' : 'Adicionar Novo Item'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Produto</label>
              <input 
                type="text" 
                value={formItem.name}
                onChange={e => setFormItem({...formItem, name: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
                placeholder="Ex: Cera de Mel"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoria</label>
              <input 
                type="text" 
                value={formItem.category}
                onChange={e => setFormItem({...formItem, category: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
                placeholder="Ex: Depilação"
                list="categories"
              />
              <datalist id="categories">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Quantidade Atual</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={formItem.quantity || ''}
                  onChange={e => setFormItem({...formItem, quantity: e.target.value === '' ? 0 : Number(e.target.value)})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
                />
                <select 
                  value={formItem.unit}
                  onChange={e => setFormItem({...formItem, unit: e.target.value})}
                  className="px-2 py-2 rounded-xl border border-gray-200 outline-none"
                >
                  <option value="un">un</option>
                  <option value="ml">ml</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="l">l</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Estoque Mínimo</label>
              <input 
                type="number" 
                value={formItem.minQuantity || ''}
                onChange={e => setFormItem({...formItem, minQuantity: e.target.value === '' ? 0 : Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Peso Líquido</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={formItem.netWeight || ''}
                  onChange={e => setFormItem({...formItem, netWeight: e.target.value === '' ? 0 : Number(e.target.value)})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
                />
                <select 
                  value={formItem.weightUnit}
                  onChange={e => setFormItem({...formItem, weightUnit: e.target.value})}
                  className="px-2 py-2 rounded-xl border border-gray-200 outline-none"
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Peso Bruto</label>
              <input 
                type="number" 
                value={formItem.grossWeight || ''}
                onChange={e => setFormItem({...formItem, grossWeight: e.target.value === '' ? 0 : Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Valor da Compra (R$)</label>
              <input 
                type="number" 
                value={formItem.purchasePrice || ''}
                onChange={e => setFormItem({...formItem, purchasePrice: e.target.value === '' ? 0 : Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data da Compra</label>
              <input 
                type="date" 
                value={formItem.purchaseDate}
                onChange={e => setFormItem({...formItem, purchaseDate: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data de Vencimento</label>
              <input 
                type="date" 
                value={formItem.expiryDate || ''}
                onChange={e => setFormItem({...formItem, expiryDate: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Início de Uso</label>
              <input 
                type="date" 
                value={formItem.usageStartDate}
                onChange={e => setFormItem({...formItem, usageStartDate: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Forma de Pagamento</label>
              <select 
                value={formItem.paymentMethod}
                onChange={e => setFormItem({...formItem, paymentMethod: e.target.value as any, installmentsCount: 1})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
              >
                <option value="pix">PIX</option>
                <option value="debit">Cartão de Débito</option>
                <option value="credit">Cartão de Crédito</option>
                <option value="store_installments">Parcelado pela Loja</option>
              </select>
            </div>
            {['credit', 'store_installments'].includes(formItem.paymentMethod || '') && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Parcelas</label>
                <input 
                  type="number" 
                  min="1"
                  value={formItem.installmentsCount || ''}
                  onChange={e => setFormItem({...formItem, installmentsCount: e.target.value === '' ? 1 : Number(e.target.value)})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
                />
              </div>
            )}
            <div className="md:col-span-2 border-t border-tea-50 pt-4 mt-2">
              <h4 className="text-sm font-bold text-tea-800 mb-4 flex items-center gap-2">
                <span>🛒</span> Configurações da Loja Online
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">URL da Foto do Produto</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formItem.imageUrl || ''}
                      onChange={e => setFormItem({...formItem, imageUrl: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
                      placeholder="https://exemplo.com/foto.jpg"
                    />
                    {formItem.imageUrl && (
                      <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                        <img src={formItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição do Produto</label>
                  <textarea 
                    value={formItem.description || ''}
                    onChange={e => setFormItem({...formItem, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none h-10"
                    placeholder="Detalhes para o cliente..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço para Cliente (R$)</label>
                  <input 
                    type="number" 
                    value={formItem.customerPrice || ''}
                    onChange={e => setFormItem({...formItem, customerPrice: Number(e.target.value)})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço para Visitante (R$)</label>
                  <input 
                    type="number" 
                    value={formItem.visitorPrice || ''}
                    onChange={e => setFormItem({...formItem, visitorPrice: Number(e.target.value)})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formItem.showOnSite || false}
                      onChange={e => setFormItem({...formItem, showOnSite: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-tea-600 focus:ring-tea-500"
                    />
                    <span className="text-xs font-bold text-gray-600 group-hover:text-tea-700 transition-colors">Exibir produto no site</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formItem.exclusiveForCustomers || false}
                      onChange={e => setFormItem({...formItem, exclusiveForCustomers: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-tea-600 focus:ring-tea-500"
                    />
                    <span className="text-xs font-bold text-gray-600 group-hover:text-tea-700 transition-colors">Produto exclusivo para clientes</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Associar a Procedimentos</label>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                    {services.map(service => (
                      <label key={service.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input 
                          type="checkbox"
                          checked={formItem.associatedServiceIds?.includes(service.id) || false}
                          onChange={e => {
                            const ids = formItem.associatedServiceIds || [];
                            if (e.target.checked) {
                              setFormItem({...formItem, associatedServiceIds: [...ids, service.id]});
                            } else {
                              setFormItem({...formItem, associatedServiceIds: ids.filter(id => id !== service.id)});
                            }
                          }}
                          className="w-3 h-3 rounded border-gray-300 text-tea-600 focus:ring-tea-500"
                        />
                        <span className="text-[10px] text-gray-600">{service.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button 
              onClick={handleCancel}
              className="px-4 py-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-tea-800 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Salvar Item'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produto</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detalhes Peso</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Compra / Uso</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Quantidade</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-tea-900 uppercase tracking-widest text-center bg-tea-50/50">Ações de Gestão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">📦</span>
                    <p className="text-gray-500 font-medium">Nenhum produto cadastrado no estoque.</p>
                    <button 
                      onClick={() => setIsAdding(true)}
                      className="text-tea-700 font-bold hover:underline"
                    >
                      Clique aqui para adicionar seu primeiro item
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              inventory.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-tea-900">{item.name}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-tight">{item.category}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-gray-600">Líq: {item.netWeight || 0}{item.weightUnit || 'g'}</div>
                  <div className="text-xs text-gray-400">Bruto: {item.grossWeight || 0}{item.weightUnit || 'g'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-tea-800 font-medium">R$ {item.purchasePrice?.toFixed(2) || '0,00'}</div>
                  <div className="text-[9px] text-gray-400 uppercase">Compra: {item.purchaseDate ? new Date(item.purchaseDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</div>
                  {item.expiryDate && (
                    <div className={`text-[9px] font-bold uppercase ${new Date(item.expiryDate).getTime() < new Date().getTime() + (30 * 24 * 60 * 60 * 1000) ? 'text-red-500' : 'text-orange-600'}`}>
                      Venc: {new Date(item.expiryDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  )}
                  <div className="text-[9px] text-tea-600 uppercase">Uso: {item.usageStartDate ? new Date(item.usageStartDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => onUpdate(item.id, { quantity: Math.max(0, item.quantity - 1) })}
                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      -
                    </button>
                    <span className={`font-mono font-bold w-12 ${item.quantity <= item.minQuantity ? 'text-red-500' : 'text-tea-900'}`}>
                      {item.quantity} {item.unit}
                    </span>
                    <button 
                      onClick={() => onUpdate(item.id, { quantity: item.quantity + 1, lastRestockedAt: new Date().toISOString() })}
                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-green-50 hover:text-green-500 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  {item.quantity <= 0 ? (
                    <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-[8px] font-bold uppercase tracking-widest">Esgotado</span>
                  ) : item.quantity <= item.minQuantity ? (
                    <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-[8px] font-bold uppercase tracking-widest">Baixo</span>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-[8px] font-bold uppercase tracking-widest">OK</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center bg-tea-50/30 border-l border-tea-50">
                  <div className="flex flex-col gap-2 items-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-tea-700 text-white rounded-lg hover:bg-tea-800 transition-all shadow-sm active:scale-95"
                        title="Editar este produto"
                      >
                        <span className="text-xs">✏️</span>
                        <span className="text-[10px] font-bold uppercase">Editar</span>
                      </button>
                      <button 
                        onClick={() => { if(confirm('Deseja realmente excluir este item do estoque?')) onDelete(item.id); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm active:scale-95"
                        title="Excluir este produto"
                      >
                        <span className="text-xs">🗑️</span>
                        <span className="text-[10px] font-bold uppercase">Excluir</span>
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setSellingItem(item);
                        setSaleForm({ customerId: '', quantity: 1, price: 0 });
                      }}
                      className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm active:scale-95"
                      title="Vender para cliente"
                    >
                      <span className="text-xs">💰</span>
                      <span className="text-[10px] font-bold uppercase">Vender p/ Cliente</span>
                    </button>
                  </div>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
      {/* Modal de Venda */}
      {sellingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-tea-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-serif font-bold text-tea-900 mb-6 italic">Vender Produto</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-tea-50 rounded-2xl border border-tea-100 mb-4">
                <p className="text-[10px] text-tea-600 font-bold uppercase tracking-widest mb-1">Produto Selecionado</p>
                <p className="font-bold text-tea-900">{sellingItem.name}</p>
                <p className="text-xs text-gray-500">Estoque disponível: {sellingItem.quantity} {sellingItem.unit}</p>
                {sellingItem.expiryDate && (
                  <p className="text-[10px] text-orange-600 font-bold mt-1">Vencimento: {new Date(sellingItem.expiryDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Selecionar Cliente</label>
                <select 
                  value={saleForm.customerId}
                  onChange={e => setSaleForm({...saleForm, customerId: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-tea-500 outline-none bg-gray-50 text-sm"
                >
                  <option value="">Selecione uma cliente...</option>
                  {customers.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Quantidade</label>
                  <input 
                    type="number" 
                    min="1"
                    max={sellingItem.quantity}
                    value={saleForm.quantity}
                    onChange={e => setSaleForm({...saleForm, quantity: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-tea-500 outline-none bg-gray-50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Preço de Venda (R$)</label>
                  <input 
                    type="number" 
                    value={saleForm.price}
                    onChange={e => setSaleForm({...saleForm, price: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-tea-500 outline-none bg-gray-50 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setSellingItem(null)}
                className="flex-1 px-6 py-3 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:bg-gray-50 rounded-2xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (!saleForm.customerId) {
                    alert("Por favor, selecione uma cliente.");
                    return;
                  }
                  if (saleForm.quantity > sellingItem.quantity) {
                    alert("Quantidade superior ao estoque disponível.");
                    return;
                  }
                  
                  const customer = customers.find(c => c.id === saleForm.customerId);
                  
                  onSellProduct({
                    productId: sellingItem.id,
                    productName: sellingItem.name,
                    customerId: saleForm.customerId,
                    customerName: customer?.name || 'Cliente',
                    quantity: saleForm.quantity,
                    price: saleForm.price,
                    saleDate: new Date().toISOString().split('T')[0],
                    expiryDate: sellingItem.expiryDate
                  });
                  
                  setSellingItem(null);
                }}
                className="flex-1 bg-tea-900 text-white px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-black transition-all"
              >
                Confirmar Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventory;
