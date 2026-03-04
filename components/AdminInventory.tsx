
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
  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    category: '',
    quantity: 0,
    minQuantity: 0,
    unit: 'un',
    lastRestockedAt: new Date().toISOString()
  });

  const categories = Array.from(new Set(inventory.map(item => item.category)));

  const handleAdd = () => {
    if (!newItem.name || !newItem.category) return;
    onAdd(newItem);
    setIsAdding(false);
    setNewItem({
      name: '',
      category: '',
      quantity: 0,
      minQuantity: 0,
      unit: 'un',
      lastRestockedAt: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-tea-900">Estoque</h2>
          <p className="text-sm text-gray-500">Gerencie os produtos e materiais do salão</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-tea-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-tea-900 transition-colors shadow-md"
        >
          + Novo Item
        </button>
      </div>

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
          <h3 className="text-lg font-bold text-tea-900 mb-4">Adicionar Novo Item</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Produto</label>
              <input 
                type="text" 
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
                placeholder="Ex: Cera de Mel"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoria</label>
              <input 
                type="text" 
                value={newItem.category}
                onChange={e => setNewItem({...newItem, category: e.target.value})}
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
                  value={newItem.quantity}
                  onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
                />
                <select 
                  value={newItem.unit}
                  onChange={e => setNewItem({...newItem, unit: e.target.value})}
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
                value={newItem.minQuantity}
                onChange={e => setNewItem({...newItem, minQuantity: Number(e.target.value)})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-tea-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button 
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest"
            >
              Cancelar
            </button>
            <button 
              onClick={handleAdd}
              className="bg-tea-800 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg"
            >
              Salvar Item
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produto</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoria</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Quantidade</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {inventory.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-tea-900">{item.name}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-tight">Última reposição: {new Date(item.lastRestockedAt).toLocaleDateString('pt-BR')}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-tea-50 text-tea-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    {item.category}
                  </span>
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
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => { if(confirm('Excluir este item?')) onDelete(item.id); }}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminInventory;
