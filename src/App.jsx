// src/App.jsx
import React, { useState, useEffect } from 'react';
import { 
    Plus, FileText, TrendingUp, Calendar, Trash2, Save, User, 
    Calculator, Download, X, Loader2, CheckCircle2, 
    ShoppingCart, Receipt, ArrowDownCircle, ArrowUpCircle, 
    Lock, LogOut, KeyRound, Settings, ShieldCheck, Store, CreditCard, MessageSquare, Edit3, Eye,
    Users, FileSpreadsheet, FileSearch, Copy, Upload
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Importaciones locales
import { SAT_CATALOG, EXPENSE_CATEGORIES, USOS_CFDI, FISCAL_REGIMES, SALES_CHANNELS, PAYMENT_METHODS } from './constants/catalogs';
import { getLocalDateString, generateId, roundPrice, normalizeText, isValidRFC, formatMoney, formatDate } from './utils/helpers';
import { StorageService } from './services/storage';
import AlertModal from './components/ui/AlertModal';
import DateSelector from './components/ui/DateSelector';
import TaxReminder from './components/dashboard/TaxReminder';

// Configuración del Worker de PDF
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

        function App() {
                const [isAuthenticated, setIsAuthenticated] = useState(false);
                const [loginPass, setLoginPass] = useState('');
                const [loginError, setLoginError] = useState('');
                const [view, setView] = useState('form');
                const [sales, setSales] = useState([]);
                const [expenses, setExpenses] = useState([]);
                const [suppliers, setSuppliers] = useState([]);
                const [loading, setLoading] = useState(true);
                const [isReadingPdf, setIsReadingPdf] = useState(false);
                
                const [deleteConfirmId, setDeleteConfirmId] = useState(null);
                const [editingId, setEditingId] = useState(null); 
                const [detailsItem, setDetailsItem] = useState(null); 
                const [expenseTab, setExpenseTab] = useState('new'); 
                const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
                const [passMessage, setPassMessage] = useState({ text: '', type: '' });
                const [alertData, setAlertData] = useState(null);
    
                const [transactionDate, setTransactionDate] = useState(getLocalDateString());
                const [dateError, setDateError] = useState(false); 
                const [currentItems, setCurrentItems] = useState([]);
                const [newItem, setNewItem] = useState({ description: '', quantity: 1, unitPrice: 0, satKey: '01010101', unitKey: 'ACT', type: 'servicio', taxRate: 0.16 });
                const [isInvoice, setIsInvoice] = useState(false);
                const [clientName, setClientName] = useState('Público en General');
                const [rfc, setRfc] = useState('');
                const [cp, setCp] = useState('');
                const [usoCfdi, setUsoCfdi] = useState('G03');
                const [clientRegime, setClientRegime] = useState('616');
                const [salesChannel, setSalesChannel] = useState('Tienda Física');
                const [paymentMethod, setPaymentMethod] = useState('Efectivo');
                const [saleComments, setSaleComments] = useState('');
                const [folioInput, setFolioInput] = useState(''); 
                const [reportMonth, setReportMonth] = useState(getLocalDateString().slice(0, 7));
                const [userConfig, setUserConfig] = useState({ postalCode: '' });
                const [sortOrder, setSortOrder] = useState('date');
    
                const [expenseData, setExpenseData] = useState({ providerName: '', rfcProvider: '', concept: '', subtotal: 0, iva: 0, total: 0, category: 'mercancia', uuid: '' });
                const [supplierForm, setSupplierForm] = useState({ id: null, name: '', rfc: '' });
                
                useEffect(() => {
                    const session = sessionStorage.getItem('gif4_session');
                    if (session === 'active') setIsAuthenticated(true);
                    const legacySales = localStorage.getItem('ciber_sales');
                    if(legacySales) { localStorage.setItem('gif4_sales', legacySales); localStorage.removeItem('ciber_sales'); }
                    const legacyExpenses = localStorage.getItem('ciber_expenses');
                    if(legacyExpenses) { localStorage.setItem('gif4_expenses', legacyExpenses); localStorage.removeItem('ciber_expenses'); }
                    
                    setSales(StorageService.getData('gif4_sales'));
                    setExpenses(StorageService.getData('gif4_expenses'));
                    setSuppliers(StorageService.getSuppliers());
                    const storedConfig = localStorage.getItem('gif4_config');
                    if (storedConfig) setUserConfig(JSON.parse(storedConfig));
                    setLoading(false);
                }, []);
    
                useEffect(() => {
                    const today = getLocalDateString();
                    if (transactionDate > today) setDateError(true); else setDateError(false);
                }, [transactionDate]);
    
                useEffect(() => {
                    if (currentItems.length > 0) {
                        const recalculatedItems = currentItems.map(item => calculateItemValues(item.unitPrice, item.quantity, isInvoice, item.taxRate, item));
                        const oldTotal = currentItems.reduce((acc, i) => acc + i.total, 0);
                        const newTotal = recalculatedItems.reduce((acc, i) => acc + i.total, 0);
                        if (Math.abs(oldTotal - newTotal) > 0.01) setCurrentItems(recalculatedItems);
                    }
                }, [isInvoice]);
    
                const isMoralClient = rfc.length === 12;
                
                const showAlert = (title, message, type = 'success') => {
                    setAlertData({ title, message, type });
                    setTimeout(() => setAlertData(null), 4000);
                };
    
                const handleLogin = (e) => {
                    e.preventDefault();
                    const storedPass = localStorage.getItem('gif4_password') || 'admin';
                    if (loginPass === storedPass) { sessionStorage.setItem('gif4_session', 'active'); setIsAuthenticated(true); setLoginError(''); } 
                    else { setLoginError('Contraseña incorrecta'); setLoginPass(''); }
                };
                const handleLogout = () => { sessionStorage.removeItem('gif4_session'); setIsAuthenticated(false); setLoginPass(''); setView('form'); };
                
                // --- LOGICA DE LECTURA DE PDF (Inteligente por Contexto) ---
                const handlePdfUpload = async (e, context) => {
                    const file = e.target.files[0];
                    if (!file || file.type !== 'application/pdf') {
                        showAlert("Error", "Sube un archivo PDF válido.", "error");
                        return;
                    }
    
                    setIsReadingPdf(true);
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                        let fullText = '';
    
                        const page = await pdf.getPage(1);
                        const textContent = await page.getTextContent();
                        const items = textContent.items.map(item => item.str);
                        fullText = items.join(' ');
    
                        console.log(`Texto extraído (${context}):`, fullText);
    
                        if (context === 'expenses') {
                            // --- Lógica para GASTOS (Facturas SAT) ---
                            const uuidMatch = fullText.match(/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/);
                            const totalMatches = [...fullText.matchAll(/(?:Total|TOTAL|Neto)[:\s]*\$?\s*([\d,]+\.\d{2})/gi)];
                            let totalVal = 0;
                            if (totalMatches.length > 0) {
                                const lastMatch = totalMatches[totalMatches.length - 1][1];
                                totalVal = parseFloat(lastMatch.replace(/,/g, ''));
                            }
                            
                            // Intentar leer Subtotal explícito (Ayuda a evitar errores de IVA invertido)
                            const subMatches = [...fullText.matchAll(/(?:Subtotal|Sub Total)[:\s]*\$?\s*([\d,]+\.\d{2})/gi)];
                            let subVal = 0;
                            if (subMatches.length > 0) {
                                 const lastSub = subMatches[subMatches.length - 1][1];
                                 subVal = parseFloat(lastSub.replace(/,/g, ''));
                            }
    
                            // Intentar leer IVA
                            const ivaMatches = [...fullText.matchAll(/(?:IVA|Traslado|Impuesto)[:\s]*(?:0?\.?160?0?%?)?[:\s]*\$?\s*([\d,]+\.\d{2})(?!\s*%)/gi)];
                            let ivaVal = 0;
                            if (ivaMatches.length > 0) {
                                 const lastIva = ivaMatches[ivaMatches.length - 1][1];
                                 ivaVal = parseFloat(lastIva.replace(/,/g, ''));
                            }
                            
                            // Lógica de reconciliación de montos
                            if (totalVal > 0) {
                                // Si tenemos Subtotal válido, calculamos IVA por diferencia (más seguro)
                                if (subVal > 0 && subVal < totalVal) {
                                    ivaVal = roundPrice(totalVal - subVal);
                                }
                                // Si no, usamos el IVA detectado o calculamos el 16%
                                else if (ivaVal === 0 || (ivaVal === 16 && totalVal > 100)) {
                                    ivaVal = roundPrice(totalVal - (totalVal / 1.16));
                                }
                                
                                // Calcular Subtotal final
                                let finalSub = roundPrice(totalVal - ivaVal);
    
                                // CORRECCIÓN: Si IVA > Subtotal, es probable que se hayan leído invertidos
                                if (ivaVal > finalSub) {
                                    const temp = ivaVal;
                                    ivaVal = finalSub;
                                    finalSub = temp;
                                }
                                
                                setExpenseData(prev => ({
                                    ...prev,
                                    uuid: uuidMatch ? uuidMatch[0].toUpperCase() : prev.uuid,
                                    total: totalVal,
                                    iva: ivaVal,
                                    subtotal: finalSub,
                                    concept: "Compra según factura adjunta"
                                }));
                                showAlert("Factura Leída", `Datos: Total $${totalVal}, IVA $${ivaVal}`);
                            } else if (uuidMatch) {
                                setExpenseData(prev => ({ ...prev, uuid: uuidMatch[0].toUpperCase() }));
                                showAlert("Factura Leída", "Solo se detectó el UUID.");
                            }
    
                        } else if (context === 'sales') {
                            // --- Lógica para VENTAS (Tickets CronoSys) ---
                            // 1. Buscar Folio (Soporte para alfanuméricos ej. UF-200126-542)
                            const folioMatch = fullText.match(/(?:Folio|Ticket|Nota|Venta)[:\s]*#?([A-Z0-9\-\.]+)/i);
                            const folioFound = folioMatch ? folioMatch[1] : '';
    
                            // 2. Buscar Total
                            const totalMatches = [...fullText.matchAll(/(?:Total|Pagar|Importe|Neto)[:\s]*\$?\s*([\d,]+\.\d{2})/gi)];
                            let totalVal = 0;
                            if (totalMatches.length > 0) {
                                totalVal = parseFloat(totalMatches[totalMatches.length - 1][1].replace(/,/g, ''));
                            }
    
                            // 3. Detectar Concepto (Mayor Monto)
                            const conceptMatches = [...fullText.matchAll(/([a-zA-Z0-9ñÑ\s\.\-\/%]+)(?:\$|)\s*([\d,]+\.\d{2})/g)];
                            let bestConcept = "Venta General";
                            let maxConceptAmount = -1;
                            const ignoreWords = ['TOTAL', 'SUBTOTAL', 'IVA', 'I.V.A.', 'CAMBIO', 'EFECTIVO', 'PAGAR', 'IMPORTE', 'RECIBIDO', 'SU PAGO', 'VISA', 'MASTERCARD', 'AMEX', 'DEBITO', 'CREDITO'];
    
                            conceptMatches.forEach(match => {
                                let text = match[1].trim();
                                const val = parseFloat(match[2].replace(/,/g, ''));
                                const upper = text.toUpperCase();
                                if (ignoreWords.some(w => upper.includes(w))) return;
                                if (val > maxConceptAmount && (totalVal === 0 || val <= totalVal)) {
                                    maxConceptAmount = val;
                                    text = text.replace(/\s+/g, ' ').trim();
                                    if (text.length > 40) text = text.split(' ').slice(-5).join(' ');
                                    bestConcept = text;
                                }
                            });
    
                            // 4. Rellenar campos
                            if(folioFound && /^\d+$/.test(folioFound)) setFolioInput(folioFound);
                            if(folioFound) setSaleComments(`Ref. Ticket: ${folioFound}`);
                            const finalDesc = folioFound ? `Folio: ${folioFound}` : bestConcept;
                            
                            setNewItem({
                                description: finalDesc,
                                quantity: 1,
                                unitPrice: totalVal > 0 ? totalVal : (maxConceptAmount > 0 ? maxConceptAmount : 0),
                                satKey: '01010101', // Público general por defecto para tickets
                                unitKey: 'ACT',
                                type: 'servicio',
                                taxRate: 0.16
                            });
    
                            showAlert("Ticket Leído", `Concepto: ${bestConcept}, Folio: ${folioFound || 'N/A'}`);
                        }
    
                    } catch (error) {
                        console.error(error);
                        showAlert("Error Lectura", "No se pudo leer el PDF.", "error");
                    } finally {
                        setIsReadingPdf(false);
                    }
                };
    
                const handleChangePassword = (e) => {
                    e.preventDefault();
                    const storedPass = localStorage.getItem('gif4_password') || 'admin';
                    if (passData.current !== storedPass) { setPassMessage({ text: 'Contraseña actual incorrecta.', type: 'error' }); return; }
                    if (passData.new !== passData.confirm) { setPassMessage({ text: 'Las contraseñas no coinciden.', type: 'error' }); return; }
                    localStorage.setItem('gif4_password', passData.new);
                    setPassMessage({ text: 'Contraseña actualizada.', type: 'success' });
                    setPassData({ current: '', new: '', confirm: '' });
                    setTimeout(() => setPassMessage({ text: '', type: '' }), 3000);
                };
    
                const calculateItemValues = (inputPrice, qty, invoiceMode, taxRate = 0.16, existingItem = null) => {
                    let subtotalLine = 0, ivaLine = 0, totalLine = 0;
                    inputPrice = parseFloat(inputPrice) || 0;
                    qty = parseInt(qty) || 1;
                    const taxFactor = 1 + taxRate;
                    if (invoiceMode) { subtotalLine = roundPrice(inputPrice * qty); ivaLine = roundPrice(subtotalLine * taxRate); totalLine = roundPrice(subtotalLine + ivaLine); } 
                    else { totalLine = roundPrice(inputPrice * qty); subtotalLine = roundPrice(totalLine / taxFactor); ivaLine = roundPrice(totalLine - subtotalLine); }
                    return { 
                        id: existingItem?.id || generateId(), 
                        description: existingItem?.description || '', 
                        satKey: existingItem?.satKey || '01010101', 
                        unitKey: existingItem?.unitKey || 'E48',
                        type: existingItem?.type || 'servicio', 
                        taxRate: taxRate, quantity: qty, unitPrice: inputPrice, subtotal: subtotalLine, iva: ivaLine, total: totalLine 
                    };
                };
    
                const addItem = () => {
                    if (!newItem.description || !newItem.unitPrice) return;
                    const item = calculateItemValues(parseFloat(newItem.unitPrice), parseInt(newItem.quantity) || 1, isInvoice, newItem.taxRate, newItem);
                    setCurrentItems([...currentItems, item]);
                    setNewItem({ description: '', quantity: 1, unitPrice: 0, satKey: '01010101', unitKey: 'ACT', type: 'servicio', taxRate: 0.16 }); 
                };
    
                const handleSaveConfig = (e) => {
                    e.preventDefault();
                    localStorage.setItem('gif4_config', JSON.stringify(userConfig));
                    showAlert('Configuración Guardada', 'Tus datos fiscales se han actualizado.');
                };
    
                const handleSaveSale = (e) => {
                    e.preventDefault();
                    if (currentItems.length === 0 || dateError) return;
                    if (isInvoice && rfc.length < 12) { alert("Revise el RFC."); return; }
                    const subtotalGlobal = roundPrice(currentItems.reduce((acc, item) => acc + item.subtotal, 0));
                    const ivaGlobal = roundPrice(currentItems.reduce((acc, item) => acc + item.iva, 0));
                    let retIsr = (isInvoice && isMoralClient) ? roundPrice(subtotalGlobal * 0.0125) : 0;
                    const totalGlobal = roundPrice(subtotalGlobal + ivaGlobal - retIsr);
                    let finalFolio;
                    if (folioInput) { finalFolio = parseInt(folioInput); } 
                    else if (editingId) { finalFolio = sales.find(s=>s.id===editingId).folio; } 
                    else { finalFolio = (sales.length > 0 ? Math.max(...sales.map(s => s.folio || 0)) : 0) + 1; }
    
                    const saleObj = {
                        id: editingId || generateId(), date: transactionDate, folio: finalFolio,
                        type: isInvoice ? 'factura' : 'publico_general', items: currentItems,
                        subtotal: subtotalGlobal, iva: ivaGlobal, retentionIsr: retIsr, total: totalGlobal,
                        clientName: clientName || 'Público en General', rfc: isInvoice ? rfc.toUpperCase() : 'XAXX010101000', clientRegime: isInvoice ? clientRegime : '616',
                        isMoral: isInvoice && isMoralClient, cp: isInvoice ? cp : '', usoCfdi: isInvoice ? usoCfdi : 'S01',
                        salesChannel, paymentMethod, saleComments
                    };
                    let updatedSales;
                    if (editingId) { updatedSales = sales.map(s => s.id === editingId ? saleObj : s); StorageService.saveData('gif4_sales', updatedSales); showAlert('Venta Actualizada', 'Los datos se han guardado.'); } 
                    else { updatedSales = [...sales, saleObj]; StorageService.saveData('gif4_sales', updatedSales); showAlert('Venta Registrada', 'Venta guardada exitosamente.'); }
                    setSales(updatedSales); resetSaleForm(); setView('list');
                };
    
                const resetSaleForm = () => {
                    setCurrentItems([]); setIsInvoice(false); setClientName('Público en General'); setRfc(''); setCp('');
                    setSaleComments(''); setSalesChannel('Tienda Física'); setPaymentMethod('Efectivo'); setClientRegime('616');
                    setEditingId(null); setTransactionDate(getLocalDateString()); setFolioInput(''); 
                    setNewItem({ description: '', quantity: 1, unitPrice: 0, satKey: '01010101', unitKey: 'ACT', type: 'servicio', taxRate: 0.16 });
                };
    
                const handleSaveExpense = (e) => {
                    e.preventDefault();
                    if (!expenseData.total || dateError) return;
                    if (expenseData.providerName) {
                        const existingSupplier = suppliers.find(s => s.name === expenseData.providerName.toUpperCase());
                        if (!existingSupplier) {
                            const newSupplier = { id: generateId(), name: expenseData.providerName.toUpperCase(), rfc: expenseData.rfcProvider.toUpperCase() };
                            const updatedSuppliers = StorageService.saveSupplier(newSupplier);
                            setSuppliers(updatedSuppliers);
                        }
                    }
                    const totalExp = roundPrice(parseFloat(expenseData.total));
                    const subtotalExp = roundPrice(expenseData.subtotal || (totalExp / 1.16));
                    const ivaExp = roundPrice(expenseData.iva || (totalExp - subtotalExp));
                    const expenseObj = {
                        id: editingId || generateId(), date: transactionDate, providerName: expenseData.providerName.toUpperCase(),
                        rfcProvider: expenseData.rfcProvider.toUpperCase(), concept: expenseData.concept, category: expenseData.category,
                        subtotal: subtotalExp, iva: ivaExp, total: totalExp, uuid: expenseData.uuid || ''
                    };
                    let updatedExpenses;
                    if (editingId) { updatedExpenses = expenses.map(ex => ex.id === editingId ? expenseObj : ex); StorageService.saveData('gif4_expenses', updatedExpenses); showAlert('Gasto Actualizado', 'Modificaciones guardadas.'); } 
                    else { updatedExpenses = [...expenses, expenseObj]; StorageService.saveData('gif4_expenses', updatedExpenses); showAlert('Gasto Registrado', 'Gasto guardado exitosamente.'); }
                    setExpenses(updatedExpenses); resetExpenseForm(); setView('list');
                };
    
                const resetExpenseForm = () => {
                    setExpenseData({ providerName: '', rfcProvider: '', concept: '', subtotal: 0, iva: 0, total: 0, category: 'mercancia', uuid: '' });
                    setEditingId(null); setTransactionDate(getLocalDateString());
                };
    
                const handleSaveSupplier = (e) => {
                    e.preventDefault();
                    if (!supplierForm.name) return;
                    const newSup = { id: supplierForm.id || generateId(), name: supplierForm.name.toUpperCase(), rfc: supplierForm.rfc.toUpperCase() };
                    const updated = StorageService.saveSupplier(newSup); setSuppliers(updated);
                    setSupplierForm({ id: null, name: '', rfc: '' }); showAlert('Proveedor Guardado', 'El catálogo ha sido actualizado.');
                };
    
                const handleEditSupplier = (sup) => { setSupplierForm({ id: sup.id, name: sup.name, rfc: sup.rfc }); };
                const handleDeleteSupplier = (id) => { 
                    if(confirm('¿Eliminar proveedor?')){ 
                        const updated = StorageService.deleteSupplier(id); 
                        setSuppliers([...updated]); 
                        showAlert('Proveedor Eliminado', 'El registro ha sido borrado.', 'error');
                    } 
                };
                const handleSelectProvider = (name) => {
                    const sup = suppliers.find(s => s.name === name);
                    if (sup) { setExpenseData(prev => ({ ...prev, providerName: sup.name, rfcProvider: sup.rfc })); } 
                    else { setExpenseData(prev => ({ ...prev, providerName: name })); }
                };
    
                const handleEdit = (item, type) => {
                    setEditingId(item.id); setTransactionDate(item.date);
                    if (type === 'venta') {
                        setCurrentItems(item.items || []); setIsInvoice(item.type === 'factura'); setClientName(item.clientName);
                        setRfc(item.rfc === 'XAXX010101000' && !item.isInvoice ? '' : item.rfc); setCp(item.cp || ''); setUsoCfdi(item.usoCfdi || 'G03'); setClientRegime(item.clientRegime || '616');
                        setSalesChannel(item.salesChannel || 'Tienda Física'); setPaymentMethod(item.paymentMethod || 'Efectivo'); setSaleComments(item.saleComments || '');
                        setFolioInput(item.folio.toString().padStart(3, '0')); 
                        setView('form');
                    } else {
                        setExpenseData({ providerName: item.providerName, rfcProvider: item.rfcProvider, concept: item.concept, category: item.category, subtotal: item.subtotal, iva: item.iva, total: item.total, uuid: item.uuid });
                        setView('expenses'); setExpenseTab('new');
                    }
                };
    
                const handleRequestDelete = (id) => { if (deleteConfirmId === id) { setDeleteConfirmId(null); } else { setDeleteConfirmId(id); setTimeout(() => setDeleteConfirmId(null), 3000); } };
                const handleConfirmDelete = (id, type) => { if (type === 'venta') { const newSales = StorageService.deleteSale(id); setSales(newSales); } else { const newExpenses = StorageService.deleteExpense(id); setExpenses(newExpenses); } setDeleteConfirmId(null); showAlert('Registro Eliminado', 'Se ha borrado el movimiento.', 'error'); };
    
                const handleExportData = () => {
                    const data = { sales: StorageService.getData('gif4_sales'), expenses: StorageService.getData('gif4_expenses'), suppliers: StorageService.getSuppliers(), meta: { version: "4.0", timestamp: new Date().toISOString(), app: "GIF4.0" } };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `Respaldo_GINFI5.5_${getLocalDateString()}.json`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                };
                const handleImportData = (event) => {
                    const file = event.target.files[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const data = JSON.parse(e.target.result);
                            if (data.sales) { StorageService.saveData('gif4_sales', data.sales); setSales(data.sales); }
                            if (data.expenses) { StorageService.saveData('gif4_expenses', data.expenses); setExpenses(data.expenses); }
                            if (data.suppliers) { StorageService.saveData('gif4_suppliers', data.suppliers); setSuppliers(data.suppliers); }
                            showAlert('Importación Exitosa', `Se cargaron: ${data.sales?.length || 0} ventas, ${data.expenses?.length || 0} gastos, ${data.suppliers?.length || 0} proveedores.`);
                        } catch (error) { showAlert('Error Importación', 'Archivo inválido o corrupto.', 'error'); }
                    };
                    reader.readAsText(file);
                };
    
                const handleExportCSV = () => {
                    const allSales = StorageService.getData('gif4_sales');
                    const allExpenses = StorageService.getData('gif4_expenses');
                    const csvRows = [];
                    csvRows.push(['Tipo', 'Fecha', 'Folio/UUID', 'Cliente/Proveedor', 'RFC', 'Concepto', 'Subtotal', 'IVA', 'Total', 'Comentarios/Categoría']);
                    allSales.forEach(s => {
                        const itemsDesc = s.items ? s.items.map(i => `${i.quantity}x ${i.description}`).join('; ') : '';
                        csvRows.push(['VENTA', s.date, s.folio, `"${normalizeText(s.clientName)}"`, s.rfc, `"${normalizeText(itemsDesc)}"`, s.subtotal, s.iva, s.total, `"${normalizeText(s.saleComments || '')}"`]);
                    });
                    allExpenses.forEach(e => {
                        csvRows.push(['GASTO', e.date, e.uuid || 'N/A', `"${normalizeText(e.providerName)}"`, e.rfcProvider, `"${normalizeText(e.concept)}"`, e.subtotal, e.iva, e.total, normalizeText(e.category)]);
                    });
                    const csvString = csvRows.join('\n');
                    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `Datos_GINFI5.5_${getLocalDateString()}.csv`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                };
    
                const handleImportCSV = (event) => {
                    const file = event.target.files[0]; if (!file) return;
                    if (!confirm('¡ATENCIÓN! La importación desde CSV agregará datos nuevos a los existentes. Asegúrate de que el formato sea correcto. ¿Continuar?')) { event.target.value = ''; return; }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const content = e.target.result; const lines = content.split(/\r?\n/);
                            if (lines.length < 2) throw new Error("Archivo vacío");
                            let sCount = 0; let eCount = 0; let errCount = 0;
                            const newSales = [...sales]; const newExpenses = [...expenses];
                            
                            // Parser robusto para CSV que respeta comillas y comas internas
                            const parseCSVLine = (str) => {
                                const res = []; let cur = ''; let inQ = false;
                                for (let i = 0; i < str.length; i++) {
                                    const c = str[i];
                                    if (inQ && c === '"' && str[i+1] === '"') { cur += '"'; i++; } // Comillas escapadas
                                    else if (c === '"') { inQ = !inQ; } // Toggle comillas
                                    else if (c === ',' && !inQ) { res.push(cur); cur = ''; } // Separador
                                    else { cur += c; }
                                }
                                res.push(cur);
                                return res.map(x => x.trim());
                            };
    
                            for (let i = 1; i < lines.length; i++) {
                                const line = lines[i].trim(); if (!line) continue;
                                try {
                                    const cols = parseCSVLine(line);
                                    if (cols.length < 9) { errCount++; continue; }
                                    const type = cols[0].toUpperCase(); const date = cols[1];
                                    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) { errCount++; continue; } // Validar fecha YYYY-MM-DD
    
                                    if (type === 'VENTA') {
                                        newSales.push({
                                            id: generateId(), date: date, folio: parseInt(cols[2]) || 0, type: 'publico_general', clientName: cols[3] || 'Cliente CSV', rfc: cols[4] || 'XAXX010101000', 
                                            items: [{ description: cols[5] || 'Venta Importada', quantity: 1, unitPrice: parseFloat(cols[8]) || 0, total: parseFloat(cols[8]) || 0 }], 
                                            subtotal: parseFloat(cols[6]) || 0, iva: parseFloat(cols[7]) || 0, total: parseFloat(cols[8]) || 0, saleComments: cols[9] || '',
                                            salesChannel: 'Tienda Física', paymentMethod: 'Efectivo' 
                                        }); sCount++;
                                    } else if (type === 'GASTO') {
                                        newExpenses.push({
                                            id: generateId(), date: date, uuid: (cols[2] && cols[2] !== 'N/A') ? cols[2] : '', providerName: cols[3] || 'Proveedor CSV', rfcProvider: cols[4] || 'XAXX010101000', 
                                            concept: cols[5] || 'Gasto Importado', subtotal: parseFloat(cols[6]) || 0, iva: parseFloat(cols[7]) || 0, total: parseFloat(cols[8]) || 0, category: cols[9] || 'otros'
                                        }); eCount++;
                                    } else { errCount++; }
                                } catch (err) { errCount++; }
                            }
                            StorageService.saveData('gif4_sales', newSales); StorageService.saveData('gif4_expenses', newExpenses);
                            setSales(newSales); setExpenses(newExpenses);
                            showAlert('Importación Finalizada', `Procesados: ${sCount} ventas, ${eCount} gastos. ${errCount > 0 ? `(${errCount} omitidos por error)` : ''}`, errCount > 0 ? 'warning' : 'success');
                        } catch (error) { showAlert('Error CSV', 'No se pudo leer el archivo.', 'error'); }
                    };
                    reader.readAsText(file);
                };
    
                const handleExportExcel = () => {
                    const currentMonthStr = reportMonth;
                    const mSales = sales.filter(s => s.date.startsWith(currentMonthStr));
                    const mExpenses = expenses.filter(e => e.date.startsWith(currentMonthStr));
                    
                    // Helpers para etiquetas
                    const getCatLabel = (id) => { const c = EXPENSE_CATEGORIES.find(x => x.id === id); return c ? c.label : id; };
                    const getUsoLabel = (code) => { const u = USOS_CFDI.find(x => x.code === code); return u ? u.label : code; };
                    const getRegimeLabel = (code) => { const r = FISCAL_REGIMES.find(x => x.code === code); return r ? r.label : code; };
    
                    let excelContent = `
                        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                        <head><meta charset="UTF-8"></head>
                        <body>
                            <h2>REPORTE MENSUAL DE OPERACIONES - GINFI5.5</h2>
                            <h3>Periodo: ${currentMonthStr}</h3>
                            <br>
                            <h3>INGRESOS</h3>
                            <table border="1">
                                <thead>
                                    <tr style="background-color: #d1fae5;">
                                        <th>Fecha</th><th>Folio</th><th>Tipo</th><th>Cliente</th><th>RFC</th>
                                        <th>Régimen Fiscal</th><th>CP</th><th>Uso CFDI</th>
                                        <th>Concepto</th><th>Canal Venta</th><th>Método Pago</th><th>Comentarios</th>
                                        <th>Base</th><th>IVA</th><th>Ret. ISR</th><th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${mSales.map(s => `<tr>
                                        <td>${formatDate(s.date)}</td>
                                        <td>${s.folio}</td>
                                        <td>${s.type === 'factura' ? 'Factura' : 'Público General'}</td>
                                        <td>${normalizeText(s.clientName)}</td>
                                        <td>${s.rfc}</td>
                                        <td>${normalizeText(getRegimeLabel(s.clientRegime || '616'))}</td>
                                        <td>${s.cp || ''}</td>
                                        <td>${normalizeText(getUsoLabel(s.usoCfdi || 'S01'))}</td>
                                        <td>${normalizeText(s.items.map(i=>i.description).join('; '))}</td>
                                        <td>${s.salesChannel || 'N/A'}</td>
                                        <td>${s.paymentMethod || 'N/A'}</td>
                                        <td>${normalizeText(s.saleComments || '')}</td>
                                        <td>${s.subtotal}</td>
                                        <td>${s.iva}</td>
                                        <td>${s.retentionIsr || 0}</td>
                                        <td>${s.total}</td>
                                    </tr>`).join('')}
                                    <tr style="font-weight:bold;">
                                        <td colspan="12" align="right">TOTALES</td>
                                        <td>${roundPrice(mSales.reduce((a,b)=>a+b.subtotal,0))}</td>
                                        <td>${roundPrice(mSales.reduce((a,b)=>a+b.iva,0))}</td>
                                        <td>${roundPrice(mSales.reduce((a, b) => a + (b.retentionIsr || 0), 0))}</td>
                                        <td>${roundPrice(mSales.reduce((a,b)=>a+b.total,0))}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <br>
                            <h3>GASTOS</h3>
                            <table border="1">
                                <thead>
                                    <tr style="background-color: #ffe4e6;">
                                        <th>Fecha</th><th>UUID</th><th>Proveedor</th><th>RFC</th>
                                        <th>Uso CFDI</th><th>Concepto</th><th>Categoría</th>
                                        <th>Base</th><th>IVA</th><th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${mExpenses.map(e => `<tr>
                                        <td>${formatDate(e.date)}</td><td>${e.uuid || 'N/A'}</td><td>${normalizeText(e.providerName)}</td><td>${e.rfcProvider}</td>
                                        <td>${normalizeText(getUsoLabel(e.usoCfdi || 'G03'))}</td>
                                        <td>${normalizeText(e.concept)}</td><td>${normalizeText(getCatLabel(e.category))}</td>
                                        <td>${e.subtotal}</td><td>${e.iva}</td><td>${e.total}</td>
                                    </tr>`).join('')}
                                    <tr style="font-weight:bold;">
                                        <td colspan="7" align="right">TOTALES</td>
                                        <td>${roundPrice(mExpenses.reduce((a,b)=>a+b.subtotal,0))}</td>
                                        <td>${roundPrice(mExpenses.reduce((a,b)=>a+b.iva,0))}</td>
                                        <td>${roundPrice(mExpenses.reduce((a,b)=>a+b.total,0))}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <br>
                            <h3>AUDITORÍA DETALLADA (MOVIMIENTOS DEL MES)</h3>
                            <table border="1">
                                <thead>
                                    <tr style="background-color: #e0f2fe;"><th>Fecha</th><th>Tipo</th><th>Ref</th><th>Nombre</th><th>Concepto</th><th>Monto Total</th></tr>
                                </thead>
                                <tbody>
                                    ${[...mSales.map(s => ({...s, kind: 'venta'})), ...mExpenses.map(e => ({...e, kind: 'gasto'}))].sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime())
                                        .map(m => `<tr>
                                            <td>${formatDate(m.date)}</td>
                                            <td>${m.kind === 'venta' ? 'INGRESO' : 'EGRESO'}</td>
                                            <td>${m.kind === 'venta' ? m.folio : (m.uuid || 'N/A')}</td>
                                            <td>${normalizeText(m.kind === 'venta' ? m.clientName : m.providerName)}</td>
                                            <td>${normalizeText(m.kind === 'venta' ? (m.items.map(i=>i.description).join('; ')) : m.concept)}</td>
                                            <td>${m.total}</td>
                                        </tr>`).join('')}
                                </tbody>
                            </table>
                        </body>
                        </html>
                    `;
                    
                    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Reporte_Fiscal_${currentMonthStr}.xls`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
    
                const handleDownloadGlobalGuide = () => {
                    const doc = new jsPDF();
                    const currentMonthStr = reportMonth;
                    
                    const globalSales = sales.filter(s => s.date.startsWith(currentMonthStr) && s.type === 'publico_general');
                    
                    if (globalSales.length === 0) { showAlert("Atención", "No hay ventas de Público General para reportar.", "warning"); return; }
    
                    const totalSub = globalSales.reduce((a,b)=>a+b.subtotal,0);
                    const totalIva = globalSales.reduce((a,b)=>a+b.iva,0);
                    const totalNeto = globalSales.reduce((a,b)=>a+b.total,0);
    
                    // Header
                    doc.setFillColor(15, 23, 42); 
                    doc.rect(0, 0, 210, 20, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(12);
                    doc.setFont("helvetica", "bold");
                    doc.text("GUÍA DE LLENADO - FACTURA GLOBAL (SAT)", 14, 13);
                    
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    doc.text(`Mes de Reporte: ${currentMonthStr}`, 14, 30);
                    doc.text(`Fecha de Impresión: ${new Date().toLocaleDateString()}`, 140, 30);
    
                    // Section 1: Receptor
                    doc.setFont("helvetica", "bold");
                    doc.text("1. DATOS DEL RECEPTOR (Obligatorios)", 14, 40);
                    doc.setDrawColor(200);
                    doc.line(14, 42, 196, 42);
                    
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(9);
                    const startY = 48;
                    doc.text("RFC:", 14, startY); doc.setFont("courier", "bold"); doc.text("XAXX010101000", 40, startY); doc.setFont("helvetica", "normal");
                    doc.text("Nombre:", 14, startY+6); doc.setFont("courier", "bold"); doc.text("PUBLICO EN GENERAL", 40, startY+6); doc.setFont("helvetica", "normal");
                    doc.text("Régimen:", 14, startY+12); doc.setFont("courier", "bold"); doc.text("616 - Sin obligaciones fiscales", 40, startY+12); doc.setFont("helvetica", "normal");
                    doc.text("Uso CFDI:", 14, startY+18); doc.setFont("courier", "bold"); doc.text("S01 - Sin efectos fiscales", 40, startY+18); doc.setFont("helvetica", "normal");
                    doc.text("CP:", 120, startY); doc.setFont("courier", "bold"); doc.text(userConfig.postalCode || "[Tu Código Postal]", 140, startY); doc.setFont("helvetica", "normal");
    
                    // Section 2: Info Global
                    doc.setFont("helvetica", "bold");
                    doc.text("2. INFORMACIÓN GLOBAL", 14, startY+30);
                    doc.line(14, startY+32, 196, startY+32);
                    doc.setFont("helvetica", "normal");
                    doc.text(`Periodicidad: 04 - Mensual`, 14, startY+40);
                    doc.text(`Meses: ${currentMonthStr.split('-')[1]}`, 70, startY+40);
                    doc.text(`Año: ${currentMonthStr.split('-')[0]}`, 120, startY+40);
    
                    // Section 3: Table
                    doc.setFont("helvetica", "bold");
                    doc.text("3. CONCEPTOS (Resumen Global)", 14, startY+55);
                    
                    // Simplificado: Una sola línea con el total acumulado
                    const tableBody = [[
                        'Venta Global del Mes', '01010101', 'ACT', '1', formatMoney(totalSub), formatMoney(totalIva), formatMoney(totalNeto)
                    ]];
                    
                    doc.autoTable({ startY: startY+60, head: [['Descripción', 'Clave Prod', 'Unidad', 'Cant', 'Valor Unitario (Subtotal)', 'IVA', 'Total']], body: tableBody, theme: 'striped', headStyles: { fillColor: [71, 85, 105] }, styles: { fontSize: 10, cellPadding: 4 }, columnStyles: { 4: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } } });
    
                    const finalY = doc.lastAutoTable.finalY + 10;
                    doc.setDrawColor(22, 163, 74); doc.setLineWidth(0.5);
                    doc.setFillColor(240, 253, 244); doc.rect(120, finalY, 76, 30, 'FD'); 
                    
                    doc.setFontSize(11); doc.setTextColor(22, 163, 74); doc.setFont("helvetica", "bold");
                    doc.text("SUBTOTAL (Dato SAT):", 125, finalY+8); doc.text(formatMoney(totalSub), 190, finalY+8, {align:'right'});
                    doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont("helvetica", "normal");
                    doc.text("Total IVA:", 125, finalY+16); doc.text(formatMoney(totalIva), 190, finalY+16, {align:'right'});
                    doc.setFont("helvetica", "bold"); doc.text("GRAN TOTAL:", 125, finalY+24); doc.text(formatMoney(totalNeto), 190, finalY+24, {align:'right'});
    
                    doc.save(`Guia_Factura_Global_${currentMonthStr}.pdf`);
                };
    
    return (
        <div className="min-h-screen text-slate-800 pb-24 bg-slate-100 font-sans">
            <AlertModal alertData={alertData} />

            {!isAuthenticated ? (
                <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center">
                        <div className="mb-6 flex justify-center"><div className="p-4 bg-indigo-600 rounded-2xl shadow-lg"><ShieldCheck size={48} className="text-white" /></div></div>
                        <h1 className="text-2xl font-black text-slate-800 mb-2">GINFI 5.5</h1>
                        <p className="text-slate-500 mb-6">Acceso al Sistema</p>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="Contraseña de acceso" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center text-lg font-bold" />
                            {loginError && <p className="text-red-500 text-sm font-bold animate-pulse">{loginError}</p>}
                            <button type="submit" className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 transition-all transform active:scale-95">Iniciar Sesión</button>
                        </form>
                    </div>
                </div>
            ) : (
                <>
                    {/* Navbar */}
                    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 mb-6">
                        <div className="max-w-6xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-600 p-2 rounded-xl text-white"><Store size={20} /></div>
                                <h1 className="font-black text-lg hidden sm:block tracking-tight text-slate-800">GINFI<span className="text-indigo-600">5.5</span></h1>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                <button onClick={() => setView('form')} className={`p-2 rounded-xl transition-all ${view === 'form' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-500'}`}><Plus size={20} /></button>
                                <button onClick={() => setView('list')} className={`p-2 rounded-xl transition-all ${view === 'list' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-500'}`}><FileText size={20} /></button>
                                <button onClick={() => setView('expenses')} className={`p-2 rounded-xl transition-all ${view === 'expenses' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-500'}`}><TrendingUp size={20} /></button>
                                <button onClick={() => setView('suppliers')} className={`p-2 rounded-xl transition-all ${view === 'suppliers' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-500'}`}><Users size={20} /></button>
                                <button onClick={() => setView('config')} className={`p-2 rounded-xl transition-all ${view === 'config' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-500'}`}><Settings size={20} /></button>
                                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"><LogOut size={20} /></button>
                            </div>
                        </div>
                    </nav>

                    <div className="max-w-5xl mx-auto px-4 sm:px-6">
                        <TaxReminder />

                        {/* VISTA: NUEVA VENTA */}
                        {view === 'form' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div><h2 className="text-2xl font-black text-slate-800">Nueva Venta</h2><p className="text-slate-500 text-sm">Registra una venta o factura</p></div>
                                        <div className="flex gap-2">
                                            <label className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"><Upload size={16} /> Leer Ticket<input type="file" accept=".pdf" className="hidden" onChange={(e) => handlePdfUpload(e, 'sales')} /></label>
                                            {isReadingPdf && <Loader2 className="animate-spin text-indigo-600" />}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <DateSelector transactionDate={transactionDate} setTransactionDate={setTransactionDate} dateError={dateError} />
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <div className={`p-2 rounded-xl ${isInvoice ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}><FileText size={20} /></div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tipo de Comprobante</label>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-sm font-bold ${!isInvoice ? 'text-slate-800' : 'text-slate-400'}`}>Nota Venta</span>
                                                    <button onClick={() => setIsInvoice(!isInvoice)} className={`w-12 h-6 rounded-full p-1 transition-colors ${isInvoice ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isInvoice ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                                                    <span className={`text-sm font-bold ${isInvoice ? 'text-indigo-600' : 'text-slate-400'}`}>Factura SAT</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><User size={20} className="text-indigo-500"/> Datos del Cliente</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <input type="text" placeholder="Nombre / Razón Social" value={clientName} onChange={e => setClientName(e.target.value)} className="neumorphic-input w-full p-3 rounded-xl font-medium" />
                                        {isInvoice && (<><input type="text" placeholder="RFC" value={rfc} onChange={e => setRfc(e.target.value.toUpperCase())} className={`neumorphic-input w-full p-3 rounded-xl font-medium ${!isValidRFC(rfc) && rfc.length > 0 ? 'border-red-300 text-red-600' : ''}`} maxLength={13} /><input type="text" placeholder="Código Postal" value={cp} onChange={e => setCp(e.target.value)} className="neumorphic-input w-full p-3 rounded-xl font-medium" maxLength={5} /><select value={clientRegime} onChange={e => setClientRegime(e.target.value)} className="neumorphic-input w-full p-3 rounded-xl font-medium">{FISCAL_REGIMES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}</select><select value={usoCfdi} onChange={e => setUsoCfdi(e.target.value)} className="neumorphic-input w-full p-3 rounded-xl font-medium">{USOS_CFDI.map(u => <option key={u.code} value={u.code}>{u.label}</option>)}</select></>)}
                                        <select value={salesChannel} onChange={e => setSalesChannel(e.target.value)} className="neumorphic-input w-full p-3 rounded-xl font-medium">{SALES_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="neumorphic-input w-full p-3 rounded-xl font-medium">{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select>
                                        <input type="text" placeholder="Folio Ticket (Opcional)" value={folioInput} onChange={e => setFolioInput(e.target.value)} className="neumorphic-input w-full p-3 rounded-xl font-medium" />
                                    </div>
                                    <textarea placeholder="Comentarios de la venta..." value={saleComments} onChange={e => setSaleComments(e.target.value)} className="neumorphic-input w-full p-3 rounded-xl font-medium mt-4 h-20 resize-none" />
                                </div>
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ShoppingCart size={20} className="text-indigo-500"/> Conceptos</h3>
                                    <div className="flex flex-col md:flex-row gap-3 mb-4 items-end">
                                        <div className="flex-1 w-full"><label className="text-xs font-bold text-slate-400 ml-1">Descripción</label><input type="text" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="neumorphic-input w-full p-3 rounded-xl font-medium" placeholder="Producto o Servicio" /></div>
                                        <div className="w-24"><label className="text-xs font-bold text-slate-400 ml-1">Cant.</label><input type="number" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="neumorphic-input w-full p-3 rounded-xl font-medium text-center" /></div>
                                        <div className="w-32"><label className="text-xs font-bold text-slate-400 ml-1">Precio Unit.</label><input type="number" value={newItem.unitPrice} onChange={e => setNewItem({...newItem, unitPrice: e.target.value})} className="neumorphic-input w-full p-3 rounded-xl font-medium text-right" /></div>
                                        <button onClick={addItem} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-colors"><Plus size={24} /></button>
                                    </div>
                                    {currentItems.length > 0 && (<div className="space-y-2 mb-6">{currentItems.map((item, idx) => (<div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm"><div className="flex-1"><p className="font-bold text-slate-700">{item.description}</p><p className="text-xs text-slate-500">{item.quantity} x {formatMoney(item.unitPrice)} {isInvoice && `(+IVA)`}</p></div><div className="flex items-center gap-4"><span className="font-bold text-slate-800">{formatMoney(item.total)}</span><button onClick={() => setCurrentItems(currentItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X size={18} /></button></div></div>))}</div>)}
                                    {currentItems.length > 0 && (<div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg"><div className="flex justify-between items-center mb-2 text-slate-400 text-sm"><span>Subtotal</span><span>{formatMoney(currentItems.reduce((a,b)=>a+b.subtotal,0))}</span></div><div className="flex justify-between items-center mb-4 text-slate-400 text-sm"><span>IVA (16%)</span><span>{formatMoney(currentItems.reduce((a,b)=>a+b.iva,0))}</span></div>{isInvoice && isMoralClient && <div className="flex justify-between items-center mb-4 text-orange-400 text-sm"><span>Ret. ISR</span><span>-{formatMoney(currentItems.reduce((a,b)=>a+b.subtotal,0)*0.0125)}</span></div>}<div className="flex justify-between items-center pt-4 border-t border-slate-700"><span className="text-xl font-bold">Total Neto</span><span className="text-3xl font-black text-emerald-400">{formatMoney(currentItems.reduce((a,b)=>a+b.total,0) - (isInvoice && isMoralClient ? currentItems.reduce((a,b)=>a+b.subtotal,0)*0.0125 : 0))}</span></div><button onClick={handleSaveSale} className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"><Save size={20} /> {editingId ? 'Actualizar Venta' : 'Registrar Venta'}</button></div>)}
                                </div>
                            </div>
                        )}

                        {/* VISTA: LISTA DE VENTAS */}
                        {view === 'list' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4"><h2 className="text-2xl font-black text-slate-800">Historial de Ventas</h2><div className="flex gap-2"><button onClick={handleExportExcel} className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-200"><FileSpreadsheet size={18}/> Excel Mes</button><button onClick={handleDownloadGlobalGuide} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-200"><Download size={18}/> Guía Global</button></div></div>
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs"><tr><th className="p-4">Fecha</th><th className="p-4">Folio</th><th className="p-4">Cliente</th><th className="p-4 text-right">Total</th><th className="p-4 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{sales.sort((a,b) => new Date(b.date) - new Date(a.date)).map(sale => (<tr key={sale.id} className="hover:bg-slate-50 transition-colors"><td className="p-4 font-medium text-slate-600">{formatDate(sale.date)}</td><td className="p-4"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${sale.type === 'factura' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{sale.folio}</span></td><td className="p-4 font-bold text-slate-800">{sale.clientName}</td><td className="p-4 text-right font-black text-emerald-600">{formatMoney(sale.total)}</td><td className="p-4 flex justify-center gap-2"><button onClick={() => handleEdit(sale, 'venta')} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit3 size={18}/></button><button onClick={() => handleRequestDelete(sale.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>{deleteConfirmId === sale.id && (<div className="absolute bg-white shadow-xl border p-2 rounded-xl flex items-center gap-2 z-10 animate-fade-in"><span className="text-xs font-bold text-red-600">¿Borrar?</span><button onClick={() => handleConfirmDelete(sale.id, 'venta')} className="bg-red-500 text-white px-2 py-1 rounded-md text-xs">Sí</button></div>)}</td></tr>))}{sales.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay ventas registradas.</td></tr>}</tbody></table></div></div>
                            </div>
                        )}

                        {/* VISTA: GASTOS */}
                        {view === 'expenses' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800">Control de Gastos</h2><div className="bg-slate-200 p-1 rounded-xl flex text-sm font-bold"><button onClick={() => setExpenseTab('new')} className={`px-4 py-2 rounded-lg transition-all ${expenseTab === 'new' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Nuevo</button><button onClick={() => setExpenseTab('list')} className={`px-4 py-2 rounded-lg transition-all ${expenseTab === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Historial</button></div></div>
                                {expenseTab === 'new' && (
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                        <div className="flex justify-end mb-4"><label className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"><Upload size={16} /> Leer Factura (XML/PDF)<input type="file" accept=".pdf" className="hidden" onChange={(e) => handlePdfUpload(e, 'expenses')} /></label></div>
                                        <DateSelector transactionDate={transactionDate} setTransactionDate={setTransactionDate} dateError={dateError} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><input type="text" placeholder="Proveedor" value={expenseData.providerName} onChange={e => setExpenseData({...expenseData, providerName: e.target.value})} className="neumorphic-input w-full p-3 rounded-xl font-medium" list="suppliers-list" /><datalist id="suppliers-list">{suppliers.map(s => <option key={s.id} value={s.name} />)}</datalist><input type="text" placeholder="RFC Proveedor" value={expenseData.rfcProvider} onChange={e => setExpenseData({...expenseData, rfcProvider: e.target.value.toUpperCase()})} className="neumorphic-input w-full p-3 rounded-xl font-medium" /></div>
                                        <input type="text" placeholder="Concepto del Gasto" value={expenseData.concept} onChange={e => setExpenseData({...expenseData, concept: e.target.value})} className="neumorphic-input w-full p-3 rounded-xl font-medium mb-4" />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"><select value={expenseData.category} onChange={e => setExpenseData({...expenseData, category: e.target.value})} className="neumorphic-input w-full p-3 rounded-xl font-medium">{EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select><input type="text" placeholder="UUID (Folio Fiscal)" value={expenseData.uuid} onChange={e => setExpenseData({...expenseData, uuid: e.target.value})} className="neumorphic-input w-full p-3 rounded-xl font-medium" /><div className="relative"><span className="absolute left-3 top-3 text-slate-400 font-bold">$</span><input type="number" placeholder="Total" value={expenseData.total || ''} onChange={e => setExpenseData({...expenseData, total: parseFloat(e.target.value)})} className="neumorphic-input w-full p-3 pl-8 rounded-xl font-bold text-slate-800" /></div></div>
                                        <button onClick={handleSaveExpense} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"><Save size={20} /> Guardar Gasto</button>
                                    </div>
                                )}
                                {expenseTab === 'list' && (
                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs"><tr><th className="p-4">Fecha</th><th className="p-4">Proveedor</th><th className="p-4">Concepto</th><th className="p-4 text-right">Monto</th><th className="p-4 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{expenses.sort((a,b) => new Date(b.date) - new Date(a.date)).map(exp => (<tr key={exp.id} className="hover:bg-slate-50"><td className="p-4 font-medium text-slate-600">{formatDate(exp.date)}</td><td className="p-4 font-bold text-slate-800">{exp.providerName}</td><td className="p-4 text-slate-600">{exp.concept}</td><td className="p-4 text-right font-black text-rose-600">-{formatMoney(exp.total)}</td><td className="p-4 flex justify-center gap-2"><button onClick={() => handleEdit(exp, 'gasto')} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit3 size={18}/></button><button onClick={() => handleRequestDelete(exp.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>{deleteConfirmId === exp.id && (<div className="absolute right-10 bg-white shadow-xl border p-2 rounded-xl flex items-center gap-2 z-10"><button onClick={() => handleConfirmDelete(exp.id, 'gasto')} className="bg-red-500 text-white px-2 py-1 rounded-md text-xs">Confirmar</button></div>)}</td></tr>))}</tbody></table></div>
                                )}
                            </div>
                        )}

                        {/* VISTA: PROVEEDORES */}
                        {view === 'suppliers' && (
                            <div className="animate-fade-in space-y-6">
                                <h2 className="text-2xl font-black text-slate-800">Directorio de Proveedores</h2>
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end"><div className="flex-1 w-full"><label className="text-xs font-bold text-slate-400 ml-1">Nombre / Razón Social</label><input type="text" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} className="neumorphic-input w-full p-3 rounded-xl font-medium" /></div><div className="flex-1 w-full"><label className="text-xs font-bold text-slate-400 ml-1">RFC</label><input type="text" value={supplierForm.rfc} onChange={e => setSupplierForm({...supplierForm, rfc: e.target.value.toUpperCase()})} className="neumorphic-input w-full p-3 rounded-xl font-medium" /></div><button onClick={handleSaveSupplier} className="bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"><Plus size={24}/></button></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{suppliers.map(sup => (<div key={sup.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group hover:shadow-md transition-all"><div><h4 className="font-bold text-slate-800">{sup.name}</h4><p className="text-xs text-slate-500 font-mono">{sup.rfc}</p></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditSupplier(sup)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit3 size={16}/></button><button onClick={() => handleDeleteSupplier(sup.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div></div>))}</div>
                            </div>
                        )}

                        {/* VISTA: CONFIGURACIÓN */}
                        {view === 'config' && (
                            <div className="animate-fade-in space-y-6 max-w-2xl mx-auto">
                                <h2 className="text-2xl font-black text-slate-800">Configuración</h2>
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Store size={20} className="text-indigo-500"/> Datos Fiscales Emisor</h3><form onSubmit={handleSaveConfig} className="space-y-4"><div><label className="text-xs font-bold text-slate-400 ml-1">Código Postal (Lugar de Expedición)</label><input type="text" value={userConfig.postalCode} onChange={e => setUserConfig({...userConfig, postalCode: e.target.value})} className="neumorphic-input w-full p-3 rounded-xl font-medium" maxLength={5} /></div><button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl">Guardar Cambios</button></form></div>
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Lock size={20} className="text-indigo-500"/> Seguridad</h3><form onSubmit={handleChangePassword} className="space-y-4"><input type="password" placeholder="Contraseña Actual" value={passData.current} onChange={e => setPassData({...passData, current: e.target.value})} className="neumorphic-input w-full p-3 rounded-xl" /><input type="password" placeholder="Nueva Contraseña" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} className="neumorphic-input w-full p-3 rounded-xl" /><input type="password" placeholder="Confirmar Nueva" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} className="neumorphic-input w-full p-3 rounded-xl" />{passMessage.text && <p className={`text-sm font-bold ${passMessage.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>{passMessage.text}</p>}<button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">Actualizar Contraseña</button></form></div>
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileSearch size={20} className="text-indigo-500"/> Gestión de Datos</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><button onClick={handleExportData} className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-left"><div className="font-bold text-slate-800 flex items-center gap-2"><Download size={18}/> Respaldar Todo</div><p className="text-xs text-slate-500 mt-1">Descarga un archivo JSON con toda tu información.</p></button><label className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-left cursor-pointer"><div className="font-bold text-slate-800 flex items-center gap-2"><Upload size={18}/> Restaurar Respaldo</div><p className="text-xs text-slate-500 mt-1">Carga un archivo JSON previamente guardado.</p><input type="file" accept=".json" className="hidden" onChange={handleImportData} /></label><button onClick={handleExportCSV} className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-left"><div className="font-bold text-emerald-800 flex items-center gap-2"><FileSpreadsheet size={18}/> Exportar CSV</div><p className="text-xs text-emerald-600 mt-1">Formato compatible con Excel.</p></button><label className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-left cursor-pointer"><div className="font-bold text-emerald-800 flex items-center gap-2"><FileSpreadsheet size={18}/> Importar CSV</div><p className="text-xs text-emerald-600 mt-1">Carga masiva de datos.</p><input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} /></label></div></div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default App;
