// src/components/ui/AlertModal.jsx
import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const AlertModal = ({ alertData }) => {
    if (!alertData) return null;
    return (
        <div className="fixed top-24 right-4 z-[100] animate-fade-in pointer-events-none">
             <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border pointer-events-auto ${alertData.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-slate-200 text-slate-800'}`}>
                {alertData.type === 'error' ? <AlertTriangle className="text-red-500"/> : <CheckCircle className="text-emerald-500"/>}
                <div>
                    <h4 className="font-bold text-sm">{alertData.title}</h4>
                    <p className="text-xs opacity-90">{alertData.message}</p>
                </div>
            </div>
        </div>
    );
};
export default AlertModal;
