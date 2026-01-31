// src/utils/helpers.js
export const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const roundPrice = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

export const normalizeText = (text) => {
    if (typeof text !== 'string') return text;
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/,/g, " ");
};

export const isValidRFC = (rfc) => {
    if (!rfc) return true;
    const regex = /^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A-Z\d])$/;
    return regex.test(rfc.toUpperCase());
};

export const formatMoney = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

export const formatDate = (dateString) => {
    if (!dateString) return '';
    const parts = dateString.split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; 
};
