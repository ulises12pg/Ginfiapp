// src/constants/catalogs.js
export const SAT_CATALOG = [
    { key: '80101507', label: 'Servicio: Consultoría Informática', type: 'servicio', unit: 'E48' },
    { key: '43212100', label: 'Servicio: Servicio Técnico Impresoras', type: 'producto', unit: 'H87' },
    { key: '81112200', label: 'Servicio: Configuración Software', type: 'servicio', unit: 'E48' },
    { key: '43231500', label: 'Producto: Licencias (Office/Antivirus)', type: 'producto', unit: 'E48' },
    { key: '82101603', label: 'Servicio: Renta Computadoras', type: 'servicio', unit: 'E48' },
    { key: '82121500', label: 'Servicio: Impresiones', type: 'servicio', unit: 'H87' },
    { key: '43211503', label: 'Producto: Hardware (USB, Cables)', type: 'producto', unit: 'H87' },
    { key: '01010101', label: 'Genérico: Público General', type: 'servicio', unit: 'ACT' },
];

export const EXPENSE_CATEGORIES = [
    { id: 'mercancia', label: 'Compra de Mercancía' },
    { id: 'servicios', label: 'Servicios (Luz, Internet)' },
    { id: 'renta', label: 'Renta de Local' },
    { id: 'papeleria', label: 'Papelería y Consumibles' },
    { id: 'mantenimiento', label: 'Mantenimiento' },
    { id: 'otros', label: 'Otros Gastos' },
];

export const USOS_CFDI = [
    { code: 'G03', label: 'G03 - Gastos en general' },
    { code: 'G01', label: 'G01 - Adquisición de mercancías' },
    { code: 'I04', label: 'I04 - Equipo de cómputo y accesorios' },
    { code: 'D02', label: 'D02 - Gastos médicos' },
    { code: 'P01', label: 'P01 - Por definir' },
    { code: 'S01', label: 'S01 - Sin efectos fiscales' },
];

export const FISCAL_REGIMES = [
    { code: '616', label: '616 - Sin obligaciones fiscales' },
    { code: '626', label: '626 - RESICO' },
    { code: '601', label: '601 - General de Ley Personas Morales' },
    { code: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
    { code: '612', label: '612 - Personas Físicas Actividades Empresariales' },
    { code: '621', label: '621 - Incorporación Fiscal' },
];

export const SALES_CHANNELS = ['Tienda Física', 'Venta en línea', 'Redes Sociales', 'Marketplace', 'Teléfono/WhatsApp', 'Otro'];
export const PAYMENT_METHODS = ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'Cheque', 'Por Definir'];
