// src/components/dashboard/TaxReminder.jsx
import React from 'react';
import { Bell, AlertCircle } from 'lucide-react';

const TaxReminder = () => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysLeft = Math.ceil((lastDay - today) / (1000 * 60 * 60 * 24));
    const isUrgent = daysLeft <= 5; 

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 no-print animate-fade-in">
            <div className="bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-2xl flex items-center gap-3 shadow-lg">
                <div className="bg-indigo-600 p-2 rounded-xl"><Bell size={18} /></div>
                <div><p className="text-xs text-slate-400 font-bold uppercase">Declaración Mensual</p><p className="text-xs font-medium">Límite día 17 del sig. mes</p></div>
            </div>
            <div className={`p-3 rounded-2xl flex items-center justify-between shadow-lg border ${isUrgent ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isUrgent ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}><AlertCircle size={18} /></div>
                    <div><p className="text-xs opacity-80 font-bold uppercase">Cierre Factura Global</p><p className="text-xs font-bold">{isUrgent ? `¡URGENTE! Cierra el ${lastDay.getDate()}` : `Límite: ${lastDay.toLocaleDateString()}`}</p></div>
                </div>
                {isUrgent && <span className="text-[10px] font-black bg-rose-200 dark:bg-rose-800 px-2 py-1 rounded-md uppercase">Pendiente</span>}
            </div>
        </div>
    );
};
export default TaxReminder;
