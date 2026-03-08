
import React from 'react';
import { Customer, Booking, Transaction, WaitlistEntry } from '../types';

import CustomerHistoryContent from './CustomerHistoryContent';

interface CustomerHistoryModalProps {
  customer: Customer;
  bookings: Booking[];
  transactions: Transaction[];
  waitlist: WaitlistEntry[];
  onClose: () => void;
}

const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({ customer, bookings, transactions, waitlist, onClose }) => {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-3xl max-h-[90vh] overflow-y-auto custom-scroll relative animate-slide-up">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-tea-900 transition-colors"
        >
          ✕
        </button>
        
        <div className="space-y-8">
          <div className="flex items-center gap-6 border-b border-gray-50 pb-8">
            <div className="w-20 h-20 bg-tea-900 text-white rounded-[2rem] flex items-center justify-center text-3xl font-serif font-bold shadow-xl">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-3xl font-serif text-tea-950 font-bold italic">{customer.name}</h3>
              <div className="flex gap-3 mt-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">CPF: {customer.cpf}</span>
                <span className="text-[9px] font-bold text-tea-600 uppercase tracking-widest bg-tea-50 px-3 py-1 rounded-full border border-tea-100">WhatsApp: {customer.whatsapp}</span>
              </div>
            </div>
          </div>

          <CustomerHistoryContent 
            customer={customer}
            bookings={bookings}
            transactions={transactions}
            waitlist={waitlist}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerHistoryModal;
