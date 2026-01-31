// src/components/ui/DateSelector.jsx
import React from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';

const DateSelector = ({ transactionDate, setTransactionDate, dateError }) => {
    return (
        <div className={`mb-6 p-4 rounded-2xl border shadow-sm flex items-center gap-4 max-w-sm transition-colors ${dateError ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
            <div className={`p-2 rounded-xl ${dateError ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200' : 'bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'}`}><Calendar size={20} /></div>
            <div className="flex-1">
                <label className={`block text-xs font-bold uppercase mb-1 ${dateError ? 'text-red-500' : 'text-slate-400'}`}>Fecha Registro {dateError && '(Futura - Inválida)'}</label>
                <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className={`w-full font-semibold outline-none bg-transparent dark:text-white ${dateError ? 'text-red-700 dark:text-red-400' : 'text-slate-700'}`}/>
            </div>
            {dateError && <div className="text-red-500 animate-pulse"><AlertTriangle size={20}/></div>}
        </div>
    );
};
export default DateSelector;
