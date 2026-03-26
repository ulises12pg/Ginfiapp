// src/components/ui/PdfDropZone.jsx
import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, X, Loader2, FileSearch } from 'lucide-react';

/**
 * PdfDropZone – Zona visual de arrastrar/soltar o seleccionar un PDF.
 *
 * Props:
 *   onFile(file) – callback cuando el usuario selecciona/suelta un archivo.
 *   isReading    – boolean que indica si el PDF está siendo procesado.
 *   result       – { type, message, status } | null  ('success' | 'warning' | 'error')
 *   onReset()    – callback para limpiar el resultado y volver al estado inicial.
 *   label        – texto corto que aparece en el botón principal (ej. "Adjuntar Ticket PDF")
 *   hint         – texto de ayuda debajo del label (ej. "Ticket de venta o corte de caja")
 */
export default function PdfDropZone({ onFile, isReading, result, onReset, label = 'Adjuntar PDF', hint = 'Arrastra aquí o haz clic para seleccionar' }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef(null);

    const statusConfig = {
        success: {
            border: 'border-emerald-400',
            bg: 'bg-emerald-50',
            icon: <CheckCircle2 className="text-emerald-500" size={22} />,
            badge: 'bg-emerald-100 text-emerald-700',
        },
        warning: {
            border: 'border-amber-400',
            bg: 'bg-amber-50',
            icon: <AlertTriangle className="text-amber-500" size={22} />,
            badge: 'bg-amber-100 text-amber-700',
        },
        error: {
            border: 'border-rose-400',
            bg: 'bg-rose-50',
            icon: <AlertTriangle className="text-rose-500" size={22} />,
            badge: 'bg-rose-100 text-rose-700',
        },
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            onFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => setIsDragOver(false);

    const handleInputChange = (e) => {
        const file = e.target.files[0];
        if (file) onFile(file);
        // Reset input so the same file can be re-selected after reset
        e.target.value = '';
    };

    // ── Estado: leyendo PDF ──
    if (isReading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50 text-center min-h-[110px]">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <p className="text-sm font-bold text-indigo-600">Leyendo PDF…</p>
                <p className="text-xs text-indigo-400">Analizando documento, un momento</p>
            </div>
        );
    }

    // ── Estado: resultado disponible ──
    if (result) {
        const cfg = statusConfig[result.status] || statusConfig.success;
        return (
            <div className={`flex items-start gap-4 p-4 rounded-2xl border-2 ${cfg.border} ${cfg.bg} transition-all`}>
                <div className="shrink-0 mt-0.5">{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                            {result.type}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 mt-1">{result.message}</p>
                </div>
                <button
                    onClick={onReset}
                    className="shrink-0 p-1.5 rounded-full hover:bg-black/10 transition-colors"
                    title="Subir otro archivo"
                >
                    <X size={16} className="text-slate-500" />
                </button>
            </div>
        );
    }

    // ── Estado: idle / drag-over ──
    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`
                flex flex-col items-center justify-center gap-2 p-6 rounded-2xl
                border-2 border-dashed cursor-pointer text-center min-h-[110px]
                transition-all duration-200 select-none
                ${isDragOver
                    ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                    : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50'
                }
            `}
        >
            <div className={`p-3 rounded-full transition-colors ${isDragOver ? 'bg-indigo-100' : 'bg-white shadow-sm'}`}>
                {isDragOver
                    ? <FileSearch size={24} className="text-indigo-500" />
                    : <Upload size={24} className="text-slate-400" />
                }
            </div>
            <div>
                <p className="text-sm font-bold text-slate-700">{isDragOver ? 'Suelta aquí el PDF' : label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <FileText size={13} />
                <span>Solo archivos .pdf</span>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleInputChange}
            />
        </div>
    );
}
