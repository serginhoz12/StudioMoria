
import React, { useState } from 'react';
import { InventoryItem } from '../types';

interface AdminInventoryProps {
  inventory: InventoryItem[];
  onUpdate: (id: string, data: Partial<InventoryItem>) => void;
  onDelete: (id: string) => void;
  onAdd: (data: Omit<InventoryItem, 'id'>) => void;
}

const AdminInventory: React.FC<AdminInventoryProps> = ({ inventory, onUpdate, onDelete, onAdd }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
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
    usageStartDate: '',
    paymentMethod: 'pix' as any,
    installmentsCount: 1
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
                  <div className="flex justify-center gap-3">
                    <button 
                      onClick={() => handleEdit(item)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-tea-700 text-white rounded-xl hover:bg-tea-800 transition-all shadow-lg active:scale-95 ring-2 ring-tea-100"
                      title="Editar este produto"
                    >
                      <span className="text-base">✏️</span>
                      <span className="text-xs font-bold uppercase tracking-wide">Editar</span>
                    </button>
                    <button 
                      onClick={() => { if(confirm('Deseja realmente excluir este item do estoque?')) onDelete(item.id); }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg active:scale-95 ring-2 ring-red-100"
                      title="Excluir este produto"
                    >
                      <span className="text-base">🗑️</span>
                      <span className="text-xs font-bold uppercase tracking-wide">Excluir</span>
                    </button>
                  </div>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminInventory;
