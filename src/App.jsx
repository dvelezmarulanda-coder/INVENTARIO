import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  ShoppingCart, 
  History, 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  Box,
  X,
  Store,
  FileText,
  Download,
  Upload,
  Menu,
  Eye,
  EyeOff,
  AlertTriangle,
  Bell,
  Calculator,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- HELPERS FINANCIEROS Y DE FECHAS ---
const monthNamesSpanish = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getSaleDate(sale) {
  if (sale.isoDate) return new Date(sale.isoDate);
  // Fallback para fechas en formato antiguo "DD/MM/YYYY HH:MM:SS"
  const parts = sale.date.split(' ');
  if (parts.length > 0) {
    const dateParts = parts[0].split('/');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const year = parseInt(dateParts[2], 10);
      return new Date(year, month, day);
    }
  }
  return new Date();
}

const formatMonthYear = (monthStr) => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  return `${monthNamesSpanish[parseInt(month, 10) - 1]} ${year}`;
};

const formatYear = (monthStr) => {
  if (!monthStr) return '';
  return monthStr.split('-')[0];
};

const formatCOP = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export default function App() {
  const fileInputRef = useRef(null);
  const backupFileInputRef = useRef(null);

  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('inventario');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados Financieros
  const [showFinancials, setShowFinancials] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [chartView, setChartView] = useState('mensual'); // 'mensual' | 'anual'

  // Estados del Formulario (Modal Nuevo Producto)
  const [modalPurchasePrice, setModalPurchasePrice] = useState('');
  const [modalSalePrice, setModalSalePrice] = useState('');
  const [modalProfitPercent, setModalProfitPercent] = useState('');
  
  // Cargar datos de localStorage o usar arrays vacíos por defecto
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('business_products');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [sales, setSales] = useState(() => {
    const saved = localStorage.getItem('business_sales');
    return saved ? JSON.parse(saved) : [];
  });

  // Estados para Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [productToSell, setProductToSell] = useState(null);

  // Filtro de historial
  const [salesFilter, setSalesFilter] = useState('Todas'); // Todas, Directa, Indirecta

  // Búsqueda en Punto de Venta
  const [searchQuery, setSearchQuery] = useState('');

  // Búsqueda en Inventario
  const [inventarioSearchQuery, setInventarioSearchQuery] = useState('');

  // Estados para Surtir Producto
  const [isSurtirModalOpen, setIsSurtirModalOpen] = useState(false);
  const [productToSurtir, setProductToSurtir] = useState(null);
  const [surtirQuantity, setSurtirQuantity] = useState('');
  const [surtirPurchasePrice, setSurtirPurchasePrice] = useState('');
  const [surtirSalePrice, setSurtirSalePrice] = useState('');
  const [surtirProfitPercent, setSurtirProfitPercent] = useState('');
  const [surtirEntryDate, setSurtirEntryDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Estados para Reporte
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  // --- EFECTOS (Guardar en LocalStorage) ---
  useEffect(() => {
    localStorage.setItem('business_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('business_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    if (reportData || receiptData) {
      const timer = setTimeout(() => {
        window.print();
        if (reportData) setReportData(null);
        if (receiptData) setReceiptData(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [reportData, receiptData]);

  // --- FUNCIONES ---
  const exportBackup = () => {
    try {
      const dataStr = JSON.stringify({ products, sales }, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `respaldo_negocio_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error("Error al exportar copia de seguridad:", err);
      alert("No se pudo exportar la copia de seguridad.");
    }
  };

  const importBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data && Array.isArray(data.products) && Array.isArray(data.sales)) {
          if (window.confirm('¿Estás seguro de que deseas importar esta copia de seguridad? Esto reemplazará todos los productos y ventas actuales.')) {
            setProducts(data.products);
            setSales(data.sales);
            alert('Copia de seguridad importada con éxito.');
          }
        } else {
          alert('El archivo no tiene el formato de copia de seguridad correcto.');
        }
      } catch (error) {
        console.error("Error al importar el archivo JSON:", error);
        alert("Ocurrió un error al leer el archivo de copia de seguridad. Asegúrate de que sea un archivo JSON válido.");
      }
    };
    reader.readAsText(file);
    if (backupFileInputRef.current) {
      backupFileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const newProducts = data.map(row => {
          // Buscamos las columnas de forma flexible (ignora mayúsculas/minúsculas y espacios al inicio/fin)
          const findVal = (possibleKeys) => {
            for (let key of Object.keys(row)) {
              if (possibleKeys.includes(key.trim().toLowerCase())) {
                return row[key];
              }
            }
            return '';
          };
          
          const reference = findVal(['referencia', 'producto', 'nombre']) || `PROD-${Date.now().toString().slice(-4)}`;
          const supplier = findVal(['proveedor', 'marca']) || 'Desconocido';
          const purchasePrice = parseFloat(findVal(['precio compra', 'costo', 'preciocompra', 'precio de compra'])) || 0;
          const salePrice = parseFloat(findVal(['precio venta', 'precio', 'precioventa', 'precio de venta'])) || 0;
          const units = parseInt(findVal(['unidades', 'cantidad', 'stock'])) || 0;
          let entryDate = findVal(['fecha ingreso', 'fecha', 'ingreso']);
          const docNumber = String(findVal(['documento', 'factura', 'doc', 'doc #', 'factura #', '# de doc', 'nro doc', 'num doc']) || '').trim();
          
          // Si no hay fecha o la fecha no es un string válido, usar la actual
          if (!entryDate || typeof entryDate !== 'string') {
            entryDate = new Date().toISOString().split('T')[0];
          }

          return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            reference,
            purchasePrice,
            salePrice,
            initialUnits: units,
            currentUnits: units,
            supplier,
            entryDate,
            docNumber
          };
        });

        setProducts(prev => [...prev, ...newProducts]);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        alert(`Se cargaron ${newProducts.length} productos correctamente.`);
      } catch (error) {
        console.error("Error al procesar el archivo Excel:", error);
        alert("Ocurrió un error al leer el archivo Excel. Asegúrate de que el formato sea correcto.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Formateador inteligente: muestra enteros si es exacto (30), o con decimales si los necesita (33.33)
  const formatSmartNumber = (num) => {
    if (Number.isInteger(num)) return num.toString();
    const rounded = Math.round(num * 100) / 100;
    if (Number.isInteger(rounded)) return rounded.toString();
    return rounded.toString();
  };

  const handlePurchasePriceChange = (val) => {
    setModalPurchasePrice(val);
    const purchase = parseFloat(val);
    if (!isNaN(purchase) && purchase > 0) {
      if (modalProfitPercent !== '' && !isNaN(parseFloat(modalProfitPercent))) {
        const profit = parseFloat(modalProfitPercent);
        const sale = purchase * (1 + profit / 100);
        setModalSalePrice(formatSmartNumber(sale));
      } else if (modalSalePrice !== '' && !isNaN(parseFloat(modalSalePrice))) {
        const sale = parseFloat(modalSalePrice);
        const profit = Math.round(((sale - purchase) / purchase) * 100);
        setModalProfitPercent(profit.toString());
      }
    } else {
      setModalSalePrice('');
      setModalProfitPercent('');
    }
  };

  const handleSalePriceChange = (val) => {
    setModalSalePrice(val);
    const sale = parseFloat(val);
    const purchase = parseFloat(modalPurchasePrice);
    if (!isNaN(sale) && !isNaN(purchase) && purchase > 0) {
      const profit = Math.round(((sale - purchase) / purchase) * 100);
      setModalProfitPercent(profit.toString());
    }
  };

  const handleProfitPercentChange = (val) => {
    setModalProfitPercent(val);
    const profit = parseFloat(val);
    const purchase = parseFloat(modalPurchasePrice);
    if (!isNaN(profit) && !isNaN(purchase) && purchase > 0) {
      const sale = purchase * (1 + profit / 100);
      setModalSalePrice(formatSmartNumber(sale));
    }
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newProduct = {
      id: Date.now().toString(),
      reference: formData.get('reference'),
      purchasePrice: parseFloat(formData.get('purchasePrice')),
      salePrice: parseFloat(formData.get('salePrice')),
      initialUnits: parseInt(formData.get('units')),
      currentUnits: parseInt(formData.get('units')), // Al inicio, inventario = compradas
      minStock: parseInt(formData.get('minStock')) || 0, // Stock mínimo para alertas
      laborCost: parseFloat(formData.get('laborCost')) || 0, // Mano de obra sugerida
      supplier: formData.get('supplier'),
      entryDate: formData.get('entryDate'),
      docNumber: String(formData.get('docNumber') || '').trim(), // Guardar # de doc
    };

    setProducts([...products, newProduct]);
    setIsAddModalOpen(false);
    setModalPurchasePrice('');
    setModalSalePrice('');
    setModalProfitPercent('');
  };

  const handleSurtirPurchasePriceChange = (val) => {
    setSurtirPurchasePrice(val);
    const purchase = parseFloat(val);
    if (!isNaN(purchase) && purchase > 0) {
      if (surtirProfitPercent !== '' && !isNaN(parseFloat(surtirProfitPercent))) {
        const profit = parseFloat(surtirProfitPercent);
        const sale = purchase * (1 + profit / 100);
        setSurtirSalePrice(formatSmartNumber(sale));
      } else if (surtirSalePrice !== '' && !isNaN(parseFloat(surtirSalePrice))) {
        const sale = parseFloat(surtirSalePrice);
        const profit = Math.round(((sale - purchase) / purchase) * 100);
        setSurtirProfitPercent(profit.toString());
      }
    } else {
      setSurtirSalePrice('');
      setSurtirProfitPercent('');
    }
  };

  const handleSurtirSalePriceChange = (val) => {
    setSurtirSalePrice(val);
    const sale = parseFloat(val);
    const purchase = parseFloat(surtirPurchasePrice);
    if (!isNaN(sale) && !isNaN(purchase) && purchase > 0) {
      const profit = Math.round(((sale - purchase) / purchase) * 100);
      setSurtirProfitPercent(profit.toString());
    }
  };

  const handleSurtirProfitPercentChange = (val) => {
    setSurtirProfitPercent(val);
    const profit = parseFloat(val);
    const purchase = parseFloat(surtirPurchasePrice);
    if (!isNaN(profit) && !isNaN(purchase) && purchase > 0) {
      const sale = purchase * (1 + profit / 100);
      setSurtirSalePrice(formatSmartNumber(sale));
    }
  };

  const openSurtirModal = (product) => {
    setProductToSurtir(product);
    setSurtirQuantity('10');
    setSurtirPurchasePrice(product.purchasePrice.toString());
    setSurtirSalePrice(product.salePrice.toString());
    
    if (product.purchasePrice > 0) {
      const profit = Math.round(((product.salePrice - product.purchasePrice) / product.purchasePrice) * 100);
      setSurtirProfitPercent(profit.toString());
    } else {
      setSurtirProfitPercent('30');
    }
    
    setSurtirEntryDate(new Date().toISOString().split('T')[0]);
    setIsSurtirModalOpen(true);
  };

  const handleSurtirProduct = (e) => {
    e.preventDefault();
    const qty = parseInt(surtirQuantity, 10);
    const purchase = parseFloat(surtirPurchasePrice);
    const sale = parseFloat(surtirSalePrice);

    if (isNaN(qty) || qty <= 0) {
      alert('Error: Ingresa una cantidad válida para surtir.');
      return;
    }

    if (isNaN(purchase) || purchase < 0 || isNaN(sale) || sale < 0) {
      alert('Error: Los precios de compra y venta deben ser números válidos.');
      return;
    }

    const updatedProducts = products.map(p => {
      if (p.id === productToSurtir.id) {
        return {
          ...p,
          currentUnits: p.currentUnits + qty,
          initialUnits: p.initialUnits + qty,
          purchasePrice: purchase,
          salePrice: sale,
          entryDate: surtirEntryDate
        };
      }
      return p;
    });

    setProducts(updatedProducts);
    setIsSurtirModalOpen(false);
    setProductToSurtir(null);
  };

  const handleSellProduct = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const quantity = parseInt(formData.get('quantity'));
    const saleType = formData.get('saleType'); // "Directa" o "Indirecta"

    if (quantity > productToSell.currentUnits) {
      alert('Error: No puedes vender más unidades de las que hay en inventario.');
      return;
    }

    // 1. Actualizar Inventario
    const updatedProducts = products.map(p => {
      if (p.id === productToSell.id) {
        return { ...p, currentUnits: p.currentUnits - quantity };
      }
      return p;
    });
    setProducts(updatedProducts);

    // 2. Registrar Venta
    const newSale = {
      id: Date.now().toString(),
      productId: productToSell.id,
      reference: productToSell.reference,
      quantity: quantity,
      unitPrice: productToSell.salePrice,
      unitCost: productToSell.purchasePrice, // Guardar el costo de compra histórico
      total: quantity * productToSell.salePrice,
      saleType: saleType,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      isoDate: new Date().toISOString(), // Para facilitar filtros por mes
    };
    setSales([newSale, ...sales]);

    if (saleType === 'Indirecta') {
      setReceiptData({ ...newSale, laborCost: productToSell.laborCost || 0 });
    }

    // Cerrar modal
    setIsSellModalOpen(false);
    setProductToSell(null);
  };

  const openSellModal = (product) => {
    setProductToSell(product);
    setIsSellModalOpen(true);
  };

  const handleGenerateReport = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const monthYear = formData.get('month'); // YYYY-MM
    const type = formData.get('reportType');

    const filteredForReport = sales.filter(s => {
      // Filtro por tipo
      if (type !== 'Todas' && s.saleType !== type) return false;
      // Filtro por mes (si se seleccionó uno)
      if (monthYear) {
        const dObj = getSaleDate(s);
        const saleMonth = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}`;
        if (saleMonth !== monthYear) return false;
      }
      return true;
    });

    const totalCostForReport = filteredForReport.reduce((acc, s) => {
      if (s.unitCost !== undefined) {
        return acc + (s.quantity * s.unitCost);
      }
      const product = products.find(p => p.id === s.productId);
      const itemCost = product ? product.purchasePrice : 0;
      return acc + (s.quantity * itemCost);
    }, 0);

    const totalRevenueForReport = filteredForReport.reduce((acc, s) => acc + s.total, 0);

    setReportData({
      month: monthYear,
      type: type,
      sales: filteredForReport,
      totalRevenue: totalRevenueForReport,
      totalUnits: filteredForReport.reduce((acc, s) => acc + s.quantity, 0),
      totalCost: totalCostForReport,
      totalProfit: totalRevenueForReport - totalCostForReport
    });

    setIsReportModalOpen(false);
  };

  // --- RENDERIZADO DE VISTAS ---
  const filteredSales = salesFilter === 'Todas' 
    ? sales 
    : sales.filter(s => s.saleType === salesFilter);

  // Estadísticas rápidas globales
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.currentUnits * p.purchasePrice), 0);
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.total, 0);

  // --- FILTROS Y CÁLCULOS TEMPORALES ---
  const getPreviousMonth = (monthStr) => {
    const [year, month] = monthStr.split('-').map(Number);
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthNum = month === 1 ? 12 : month - 1;
    return `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;
  };

  const prevMonth = getPreviousMonth(selectedMonth);
  const selectedYear = selectedMonth.slice(0, 4);
  const previousYear = (Number(selectedYear) - 1).toString();

  // Helper local para extraer mes y año sin descalce de zona horaria (UTC)
  const getSaleLocalMonthYear = (sale) => {
    const d = getSaleDate(sale);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Filtrado de ventas por períodos
  const salesM1 = sales.filter(s => getSaleLocalMonthYear(s) === selectedMonth);
  const salesM0 = sales.filter(s => getSaleLocalMonthYear(s) === prevMonth);
  const salesY1 = sales.filter(s => getSaleDate(s).getFullYear().toString() === selectedYear);
  const salesY0 = sales.filter(s => getSaleDate(s).getFullYear().toString() === previousYear);

  // Función para computar estadísticas de un período
  const computePeriodStats = (periodSales) => {
    const revenue = periodSales.reduce((acc, s) => acc + s.total, 0);
    const cost = periodSales.reduce((acc, s) => {
      if (s.unitCost !== undefined) {
        return acc + (s.quantity * s.unitCost);
      }
      const product = products.find(p => p.id === s.productId);
      const itemCost = product ? product.purchasePrice : 0;
      return acc + (s.quantity * itemCost);
    }, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const unitsSold = periodSales.reduce((acc, s) => acc + s.quantity, 0);

    return { revenue, cost, profit, margin, unitsSold };
  };

  const statsM1 = computePeriodStats(salesM1);
  const statsM0 = computePeriodStats(salesM0);
  const statsY1 = computePeriodStats(salesY1);
  const statsY0 = computePeriodStats(salesY0);

  // Porcentaje de cambio
  const getPercentageChange = (current, previous) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  };

  // Helper para renderizar los badges de variación
  const renderVariationBadge = (current, previous) => {
    const diff = current - previous;
    const pct = getPercentageChange(current, previous);

    if (diff > 0) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
          <span>▲</span>
          <span>+{pct.toFixed(1)}%</span>
        </span>
      );
    } else if (diff < 0) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 shrink-0">
          <span>▼</span>
          <span>{pct.toFixed(1)}%</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-50 text-gray-500 border border-gray-100 shrink-0">
          <span>•</span>
          <span>0.0%</span>
        </span>
      );
    }
  };

  return (
    <>
    <div className="flex h-screen bg-slate-100 font-sans text-gray-800 print:hidden relative">
      
      {/* OVERLAY PARA MOBILE (Cierra el sidebar al dar click fuera) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR (Barra Lateral) */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shadow-xl transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:flex
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-bold tracking-wider">MiNegocio</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'resumen', icon: Box, label: 'Resumen' },
            { id: 'vender', icon: Store, label: 'Punto de Venta' },
            { id: 'inventario', icon: Package, label: 'Inventario' },
            { id: 'historial', icon: History, label: 'Historial' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* Footer del Sidebar con Copia de Seguridad */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2">Copia de Seguridad</p>
          <button 
            onClick={exportBackup}
            className="w-full flex items-center space-x-2 p-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Exportar Copia (.json)</span>
          </button>
          <button 
            onClick={() => backupFileInputRef.current && backupFileInputRef.current.click()}
            className="w-full flex items-center space-x-2 p-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Importar Copia (.json)</span>
          </button>
          <input 
            type="file" 
            accept=".json" 
            ref={backupFileInputRef} 
            onChange={importBackup} 
            className="hidden" 
          />
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Cabecera */}
        <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100 md:hidden transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-700 capitalize truncate">
              {activeTab === 'resumen' ? 'Panel General' : activeTab === 'inventario' ? 'Inventario' : activeTab === 'vender' ? 'Ventas' : 'Historial'}
            </h2>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            {activeTab === 'vender' && (
              <button 
                onClick={() => setIsCierreModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 md:px-4 md:py-2 rounded-lg flex items-center space-x-2 shadow transition"
                title="Cierre de Caja"
              >
                <Calculator className="w-5 h-5" />
                <span className="hidden md:inline">Cierre de Caja</span>
              </button>
            )}
            {activeTab === 'inventario' && (
              <>
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="bg-sky-600 hover:bg-sky-700 text-white p-2 md:px-4 md:py-2 rounded-lg flex items-center space-x-2 shadow transition"
                  title="Subir Excel"
                >
                  <Upload className="w-5 h-5" />
                  <span className="hidden md:inline">Subir Excel</span>
                </button>
                <button 
                  onClick={() => {
                    setModalPurchasePrice('');
                    setModalSalePrice('');
                    setModalProfitPercent('');
                    setIsAddModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 md:px-4 md:py-2 rounded-lg flex items-center space-x-2 shadow transition"
                  title="Nuevo Producto"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden md:inline">Nuevo</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Área de scroll del contenido */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-100/90">
          
          {/* VISTA: RESUMEN */}
          {activeTab === 'resumen' && (
            <div className="flex flex-col min-h-full space-y-4">
              
              {/* Barra de Control de Filtros y Visibilidad */}
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-600 font-semibold text-sm">Analizar Período:</span>
                  <input 
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedMonth(e.target.value);
                      }
                    }}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-medium bg-gray-50 hover:bg-gray-100/50 cursor-pointer"
                  />
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-auto">
                  <span className="text-gray-600 font-semibold text-sm">Ver Costos y Ganancias</span>
                  <button
                    onClick={() => setShowFinancials(!showFinancials)}
                    className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
                      showFinancials ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    title={showFinancials ? 'Ocultar Datos Sensibles' : 'Ver Detalles de Costos y Ganancias'}
                  >
                    <span
                      className={`pointer-events-none flex items-center justify-center h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                        showFinancials ? 'translate-x-5.5 text-blue-600' : 'translate-x-0 text-gray-400'
                      }`}
                    >
                      {showFinancials ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                </div>
              </div>

              {/* Grid de Tarjetas de Métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                
                {/* Tarjeta: Ingresos Ventas (Filtrado o Global) */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-3 hover:shadow-md transition duration-300">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-full shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-medium truncate metrics-card-title">
                      {showFinancials ? `Ingresos (${formatMonthYear(selectedMonth)})` : 'Ingresos Totales'}
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-gray-800 metrics-card-value">
                      {showFinancials ? formatCOP(statsM1.revenue) : formatCOP(totalSalesRevenue)}
                    </p>
                  </div>
                </div>

                {/* Tarjeta: Valor Inventario */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-3 hover:shadow-md transition duration-300">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-full shrink-0">
                    <Box className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-medium truncate metrics-card-title">Valor Inventario (Actual)</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-800 metrics-card-value">{formatCOP(totalInventoryValue)}</p>
                  </div>
                </div>

                {/* TARJETAS FINANCIERAS ADICIONALES (Se revelan si showFinancials es true) */}
                {showFinancials && (
                  <>
                    {/* Costo de Ventas */}
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-3 hover:shadow-md transition duration-300 animate-fadeIn">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-full shrink-0">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-medium truncate metrics-card-title">Costo de Ventas ({formatMonthYear(selectedMonth)})</p>
                        <p className="text-lg sm:text-xl font-bold text-gray-800 metrics-card-value">{formatCOP(statsM1.cost)}</p>
                      </div>
                    </div>

                    {/* Ganancia Neta */}
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-3 hover:shadow-md transition duration-300 animate-fadeIn">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-full shrink-0">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-medium truncate metrics-card-title">Ganancia Neta ({formatMonthYear(selectedMonth)})</p>
                        <p className="text-lg sm:text-xl font-bold text-gray-800 metrics-card-value">{formatCOP(statsM1.profit)}</p>
                      </div>
                    </div>

                    {/* Margen de Ganancia Promedio */}
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-3 hover:shadow-md transition duration-300 animate-fadeIn">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-full shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 font-medium truncate metrics-card-title">Margen Promedio Realizado</p>
                        <p className="text-lg sm:text-xl font-bold text-gray-800 metrics-card-value">{Math.round(statsM1.margin)}%</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Bloques de Rendimiento y Alertas de Stock Mínimo (Lado a lado) */}
              {(() => {
                const isMonthly = chartView === 'mensual';
                const statsCurrent = isMonthly ? statsM1 : statsY1;
                const statsPrevious = isMonthly ? statsM0 : statsY0;
                const currentLabel = isMonthly ? formatMonthYear(selectedMonth) : `Año ${selectedYear}`;
                const previousLabel = isMonthly ? formatMonthYear(prevMonth) : `Año ${previousYear}`;
                const accentColor = isMonthly ? 'bg-blue-600' : 'bg-sky-600';
                const fadeColor = isMonthly ? 'bg-blue-200' : 'bg-sky-200';
                const profitAccent = isMonthly ? 'bg-blue-800' : 'bg-slate-700';
                const profitFade = isMonthly ? 'bg-blue-300' : 'bg-slate-300';
                const unitsAccent = isMonthly ? 'bg-indigo-600' : 'bg-sky-500';
                const unitsFade = isMonthly ? 'bg-indigo-200' : 'bg-sky-200';

                // Datos para cada grupo de barras
                const groups = [
                  { label: 'Ingresos', current: statsCurrent.revenue, previous: statsPrevious.revenue, isCurrency: true, colorA: accentColor, colorB: fadeColor },
                  ...(showFinancials
                    ? [{ label: 'Ganancia', current: statsCurrent.profit, previous: statsPrevious.profit, isCurrency: true, colorA: profitAccent, colorB: profitFade }]
                    : []),
                  { label: 'Unidades', current: statsCurrent.unitsSold, previous: statsPrevious.unitsSold, isCurrency: false, colorA: unitsAccent, colorB: unitsFade },
                ];

                const allValues = groups.flatMap(g => [g.current, g.previous]);
                const maxVal = Math.max(...allValues, 1);

                const lowStockProducts = products.filter(p => {
                  const minVal = p.minStock !== undefined ? p.minStock : 0;
                  return p.currentUnits <= minVal;
                });

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch flex-1 min-h-0 mt-2">
                    
                    {/* Gráfica de Rendimiento */}
                    <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition duration-300">
                      <div>
                        {/* Header con toggle */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg">
                              Rendimiento {isMonthly ? 'Mensual' : 'Anual'}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium">
                              {currentLabel} vs. {previousLabel}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setChartView(isMonthly ? 'anual' : 'mensual')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 cursor-pointer"
                            >
                              {isMonthly ? 'Ver Anual' : 'Ver Mensual'}
                            </button>
                            <div className={`p-2 rounded-lg ${isMonthly ? 'bg-blue-50 text-blue-600' : 'bg-blue-50 text-blue-600'}`}>
                              {isMonthly ? <TrendingUp className="w-5 h-5" /> : <Box className="w-5 h-5" />}
                            </div>
                          </div>
                        </div>

                        {/* Gráfica de Barras Verticales — Plano Cartesiano */}
                        {(() => {
                          const maxBarHeight = 82; // 82% Espacio superior libre para etiquetas de valor
                          
                          // Cálculo dinámico de escala en pasos de 500.000 COP
                          const baseStep = 500000;
                          let step = baseStep;
                          const maxScaleCalculated = Math.max(Math.ceil(maxVal / baseStep) * baseStep, baseStep);
                          const calculatedGridLines = maxScaleCalculated / baseStep;

                          if (calculatedGridLines > 8) {
                            // Si supera 8 líneas, incrementamos el paso a un múltiplo de 500.000 COP
                            step = Math.ceil((maxVal / 8) / baseStep) * baseStep;
                          }
                          
                          const maxScale = Math.max(Math.ceil(maxVal / step) * step, step);
                          const gridLines = maxScale / step;
                          const steps = Array.from({ length: gridLines + 1 }, (_, i) => i);

                          return (
                            <div className="flex flex-1 min-h-[230px] mt-2">
                              {/* Eje Y — escala */}
                              <div className="flex flex-col justify-between items-end pr-3 shrink-0 h-full">
                                {[...steps].reverse().map((i) => {
                                  const val = step * i;
                                  return (
                                    <span key={i} className="text-[10px] font-bold text-gray-500 leading-none">{formatCOP(val)}</span>
                                  );
                                })}
                              </div>

                              {/* Área del gráfico */}
                              <div className="flex-1 relative h-full">
                                {/* Líneas horizontales de la cuadrícula */}
                                {steps.slice(0, -1).map((i) => (
                                  <div
                                    key={i}
                                    className="absolute left-0 right-0 border-t border-dashed border-gray-100"
                                    style={{ top: `${(i / gridLines) * 100}%` }}
                                  />
                                ))}
                                {/* Eje X — línea base sólida */}
                                <div className="absolute bottom-0 left-0 right-0 border-t-2 border-gray-300" />
                                {/* Eje Y — línea lateral sólida */}
                                <div className="absolute top-0 bottom-0 left-0 border-l-2 border-gray-300" />

                                {/* Barras */}
                                <div className="flex items-end justify-evenly h-full px-1 relative z-10">
                                  {groups.map((group) => {
                                    const currentH = maxScale > 0 ? (group.current / maxScale) * maxBarHeight : 0;
                                    const previousH = maxScale > 0 ? (group.previous / maxScale) * maxBarHeight : 0;
                                    const displayCurrent = group.isCurrency ? formatCOP(group.current) : group.current.toLocaleString('es-CO');
                                    const displayPrevious = group.isCurrency ? formatCOP(group.previous) : group.previous.toLocaleString('es-CO');

                                    return (
                                      <div key={group.label} className="flex flex-col items-center h-full justify-end">
                                        {/* Badge variación */}
                                        <div className="mb-1">{renderVariationBadge(group.current, group.previous)}</div>
                                        {/* Par de barras */}
                                        <div className="flex items-end space-x-1 h-full">
                                          {/* Barra anterior */}
                                          <div className="flex flex-col items-center h-full justify-end">
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 mb-0.5 max-w-[85px] truncate text-center">{displayPrevious}</span>
                                            <div
                                              className={`w-7 sm:w-9 rounded-t transition-all duration-700 ease-out ${group.colorB}`}
                                              style={{ height: `${Math.max(previousH, 4)}%` }}
                                            />
                                          </div>
                                          {/* Barra actual */}
                                          <div className="flex flex-col items-center h-full justify-end">
                                            <span className="text-[10px] sm:text-xs font-black text-slate-900 mb-0.5 max-w-[85px] truncate text-center">{displayCurrent}</span>
                                            <div
                                              className={`w-7 sm:w-9 rounded-t transition-all duration-700 ease-out ${group.colorA}`}
                                              style={{ height: `${Math.max(currentH, 4)}%` }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Labels del eje X */}
                        <div className="flex mt-2 shrink-0">
                          <div className="w-[80px] shrink-0" />
                          <div className="flex-1 flex justify-evenly">
                            {groups.map((group) => (
                              <span key={group.label} className="text-sm font-extrabold text-gray-700">{group.label}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Leyenda */}
                      <div className="flex items-center justify-center space-x-4 pt-4 mt-3 border-t border-gray-50">
                        <div className="flex items-center space-x-1.5">
                          <div className={`w-3 h-3 rounded-full ${accentColor}`}></div>
                          <span className="text-xs font-bold text-gray-600">{currentLabel}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <div className={`w-3 h-3 rounded-full ${fadeColor}`}></div>
                          <span className="text-xs font-bold text-gray-400">{previousLabel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bloque de Alertas de Stock */}
                    <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition duration-300 overflow-hidden">
                      <div className="flex-1 flex flex-col h-full min-h-0">
                        <div className="flex items-center space-x-3 mb-3 border-b border-gray-100 pb-2 shrink-0">
                          <div className={`p-2 rounded-lg ${lowStockProducts.length > 0 ? 'bg-blue-50 text-blue-600 animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
                            {lowStockProducts.length > 0 ? <AlertTriangle className="w-5 h-5 animate-bounce" /> : <Bell className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg">Alertas de Inventario</h3>
                            <p className="text-xs text-gray-500 font-medium">Control de stock mínimo</p>
                          </div>
                        </div>

                        {lowStockProducts.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center py-10">
                            <div className="flex flex-col items-center space-y-2 p-6 bg-blue-50/50 text-blue-800 rounded-xl border border-blue-100/50 text-center max-w-xs mx-auto animate-fadeIn">
                              <span className="text-4xl">✓</span>
                              <p className="text-sm font-extrabold">¡Inventario Seguro!</p>
                              <p className="text-[11px] text-blue-600 font-medium">Todos los productos cumplen con el stock mínimo configurado.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-3.5">
                            {lowStockProducts.map(p => {
                              const isAgotado = p.currentUnits === 0;
                              return (
                                <div key={p.id} className="p-4 bg-slate-50 border border-slate-100 rounded-lg flex flex-col justify-between space-y-3.5 hover:border-gray-200 transition shadow-sm">
                                  <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1 pr-2">
                                      <p className="font-extrabold text-base text-gray-900 tracking-wide truncate" title={p.reference}>{p.reference}</p>
                                      <p className="text-xs text-gray-500 font-bold mt-0.5 truncate">Proveedor: {p.supplier}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 uppercase tracking-wider ${
                                      isAgotado 
                                      ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                                    }`}>
                                      {isAgotado ? 'Agotado' : 'Bajo Stock'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm pt-2.5 border-t border-slate-200/60">
                                    <span className="text-gray-600 font-extrabold">Stock Disponible:</span>
                                    <div className="flex items-center space-x-3">
                                      <span className={`font-black text-sm ${isAgotado ? 'text-slate-500' : 'text-blue-600'} mr-1`}>
                                        {p.currentUnits} <span className="text-gray-500 font-medium">/ {p.minStock || 0} unds</span>
                                      </span>
                                      <button
                                        onClick={() => openSurtirModal(p)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-md transition active:scale-95 flex items-center space-x-1.5"
                                        title="Surtir este producto inmediatamente"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Surtir</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })()}

            </div>
          )}

          {/* VISTA: PUNTO DE VENTA (Lista alfabética) */}
          {activeTab === 'vender' && (
            <div className="space-y-6">
              {/* Buscador */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none text-gray-700 placeholder-gray-400 bg-transparent text-lg"
                />
              </div>

              {/* Vista Desktop: Tabla */}
              <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm uppercase tracking-wider">
                        <th className="p-4 font-semibold">Producto / Referencia</th>
                        <th className="p-4 font-semibold">Proveedor</th>
                        <th className="p-4 font-semibold text-right">Precio</th>
                        <th className="p-4 font-semibold text-center">Stock</th>
                        <th className="p-4 font-semibold text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products
                        .filter(p => 
                          p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.docNumber && p.docNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                        )
                        .sort((a, b) => a.reference.localeCompare(b.reference))
                        .map(product => (
                          <tr key={product.id} className="hover:bg-gray-50 transition">
                            <td className="p-4">
                              <div className="font-bold text-gray-800">{product.reference}</div>
                              {product.docNumber && <div className="text-[11px] text-gray-400 font-normal">Doc: {product.docNumber}</div>}
                            </td>
                            <td className="p-4 text-gray-600 text-sm">{product.supplier}</td>
                            <td className="p-4 text-right">
                              <span className="text-lg font-bold text-blue-600">{formatCOP(product.salePrice)}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.currentUnits > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                {product.currentUnits} unds
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => openSellModal(product)}
                                disabled={product.currentUnits <= 0}
                                className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg shadow-sm mx-auto transition font-medium ${
                                  product.currentUnits > 0 
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <ShoppingCart className="w-4 h-4" />
                                <span>Vender</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vista Mobile: Cards */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {products
                  .filter(p => 
                    p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (p.docNumber && p.docNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .sort((a, b) => a.reference.localeCompare(b.reference))
                  .map(product => (
                    <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-800 text-lg flex flex-wrap items-center gap-1.5">
                            <span>{product.reference}</span>
                            {product.docNumber && (
                              <span className="inline-block text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                Doc: {product.docNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 text-sm">{product.supplier}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.currentUnits > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {product.currentUnits} unds
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                        <span className="text-xl font-black text-blue-600">{formatCOP(product.salePrice)}</span>
                        <button 
                          onClick={() => openSellModal(product)}
                          disabled={product.currentUnits <= 0}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-sm transition font-bold ${
                            product.currentUnits > 0 
                            ? 'bg-blue-600 text-white active:scale-95' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>Vender</span>
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>

              {products.filter(p => 
                p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.docNumber && p.docNumber.toLowerCase().includes(searchQuery.toLowerCase()))
              ).length === 0 && (
                <div className="py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                  <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-lg">No se encontraron productos.</p>
                </div>
              )}
            </div>
          )}

          {/* VISTA: INVENTARIO */}
          {activeTab === 'inventario' && (() => {
            const filteredProducts = products.filter(p => 
              p.reference.toLowerCase().includes(inventarioSearchQuery.toLowerCase()) || 
              p.supplier.toLowerCase().includes(inventarioSearchQuery.toLowerCase()) ||
              (p.docNumber && p.docNumber.toLowerCase().includes(inventarioSearchQuery.toLowerCase()))
            );

            return (
              <div className="space-y-4">
                {/* Buscador de Inventario */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Buscar por referencia, proveedor o documento..."
                    value={inventarioSearchQuery}
                    onChange={(e) => setInventarioSearchQuery(e.target.value)}
                    className="flex-1 outline-none text-gray-700 placeholder-gray-400 bg-transparent text-lg"
                  />
                  {inventarioSearchQuery && (
                    <button onClick={() => setInventarioSearchQuery('')} className="text-gray-400 hover:text-red-500 transition">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Vista Desktop: Tabla */}
                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm uppercase tracking-wider">
                          <th className="p-4 font-semibold">Referencia</th>
                          <th className="p-4 font-semibold">Proveedor</th>
                          <th className="p-4 font-semibold">Fecha Ingreso</th>
                          <th className="p-4 font-semibold text-right">P. Compra</th>
                          <th className="p-4 font-semibold text-right">P. Venta</th>
                          <th className="p-4 font-semibold text-center">Stock</th>
                          <th className="p-4 font-semibold text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {products.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="p-8 text-center text-gray-400">
                              No hay productos registrados.
                            </td>
                          </tr>
                        ) : filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="p-8 text-center text-gray-400">
                              No se encontraron productos coincidentes para "{inventarioSearchQuery}".
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map(product => (
                            <tr key={product.id} className="hover:bg-gray-50 transition">
                              <td className="p-4 font-medium text-gray-800">
                                <div>{product.reference}</div>
                                {product.docNumber && <div className="text-[11px] text-gray-400 font-normal">Doc: {product.docNumber}</div>}
                              </td>
                              <td className="p-4 text-gray-600">{product.supplier}</td>
                              <td className="p-4 text-gray-600">{product.entryDate}</td>
                              <td className="p-4 text-right text-gray-600">{formatCOP(product.purchasePrice)}</td>
                              <td className="p-4 text-right text-blue-600 font-bold">{formatCOP(product.salePrice)}</td>
                              <td className="p-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${product.currentUnits > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {product.currentUnits} / {product.initialUnits}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button 
                                  onClick={() => openSurtirModal(product)}
                                  className="flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg shadow-sm mx-auto bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition active:scale-95"
                                  title="Surtir / reabastecer unidades de este producto"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Surtir</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Vista Mobile: Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {products.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                      No hay productos registrados.
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                      No se encontraron productos coincidentes para "{inventarioSearchQuery}".
                    </div>
                  ) : (
                    filteredProducts.map(product => (
                      <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-gray-800 flex flex-wrap items-center gap-1.5">
                              <span>{product.reference}</span>
                              {product.docNumber && (
                                <span className="inline-block text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  Doc: {product.docNumber}
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500 text-xs">{product.supplier} • {product.entryDate}</div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.currentUnits > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            {product.currentUnits} / {product.initialUnits} unds
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                          <div className="grid grid-cols-2 gap-4 flex-1 mr-4">
                            <div>
                              <span className="text-gray-400 block text-xs">Costo:</span>
                              <span className="font-medium text-xs text-gray-700">{formatCOP(product.purchasePrice)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-xs">Venta:</span>
                              <span className="font-bold text-blue-600 text-xs">{formatCOP(product.salePrice)}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => openSurtirModal(product)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold active:scale-95 transition shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Surtir</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {/* VISTA: HISTORIAL */}
          {activeTab === 'historial' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
                  {['Todas', 'Directa', 'Indirecta'].map(type => (
                    <button
                      key={type}
                      onClick={() => setSalesFilter(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                        salesFilter === type 
                        ? 'bg-blue-600 text-white shadow' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setIsReportModalOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-blue-800 hover:bg-blue-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Reporte PDF</span>
                </button>
              </div>

              {/* Vista Desktop: Tabla */}
              <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm uppercase tracking-wider">
                        <th className="p-4 font-semibold">Fecha y Hora</th>
                        <th className="p-4 font-semibold">Referencia</th>
                        <th className="p-4 font-semibold text-center">Tipo</th>
                        <th className="p-4 font-semibold text-center">Cant.</th>
                        <th className="p-4 font-semibold text-right">P. Unitario</th>
                        <th className="p-4 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSales.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-gray-400">
                            No hay ventas registradas.
                          </td>
                        </tr>
                      ) : (
                        filteredSales.map(sale => (
                          <tr key={sale.id} className="hover:bg-gray-50 transition">
                            <td className="p-4 text-gray-600 text-sm">{sale.date}</td>
                            <td className="p-4 font-medium text-gray-800">{sale.reference}</td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                sale.saleType === 'Directa' ? 'bg-blue-100 text-blue-700' : 'bg-sky-100 text-sky-800'
                              }`}>
                                {sale.saleType}
                              </span>
                            </td>
                            <td className="p-4 text-center font-medium text-gray-700">{sale.quantity}</td>
                            <td className="p-4 text-right text-gray-600">{formatCOP(sale.unitPrice)}</td>
                            <td className="p-4 text-right font-bold text-blue-600">{formatCOP(sale.total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vista Mobile: Cards */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredSales.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                    No hay ventas registradas.
                  </div>
                ) : (
                  filteredSales.map(sale => (
                    <div key={sale.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-800">{sale.reference}</div>
                          <div className="text-gray-500 text-xs">{sale.date}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          sale.saleType === 'Directa' ? 'bg-blue-100 text-blue-700' : 'bg-sky-100 text-sky-800'
                        }`}>
                          {sale.saleType}
                        </span>
                      </div>
                      <div className="flex justify-between items-end pt-2 border-t border-gray-50">
                        <div className="text-sm text-gray-600">
                          {sale.quantity} x {formatCOP(sale.unitPrice)}
                        </div>
                        <div className="text-xl font-black text-blue-600">
                          {formatCOP(sale.total)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL: AÑADIR PRODUCTO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-2xl h-full sm:h-auto overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Nuevo Producto</h3>
              <button onClick={() => {
                setModalPurchasePrice('');
                setModalSalePrice('');
                setModalProfitPercent('');
                setIsAddModalOpen(false);
              }} className="text-gray-400 hover:text-red-500 transition p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Referencia *</label>
                  <input required name="reference" type="text" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Ej: Zapatos Nike" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Proveedor *</label>
                  <input 
                    required 
                    name="supplier" 
                    type="text" 
                    list="suppliers-list"
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition font-medium" 
                    placeholder="Ej: Distribuidora" 
                  />
                  <datalist id="suppliers-list">
                    {Array.from(new Set(products.map(p => p.supplier).filter(Boolean)))
                      .sort((a, b) => a.localeCompare(b))
                      .map(sup => (
                        <option key={sup} value={sup} />
                      ))
                    }
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Precio Compra ($) *</label>
                  <input 
                    required 
                    name="purchasePrice" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={modalPurchasePrice}
                    onChange={(e) => handlePurchasePriceChange(e.target.value)}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Porcentaje Ganancia *</label>
                  <div className="relative flex items-center">
                    <input 
                      required 
                      name="profitPercent" 
                      type="number" 
                      step="0.01" 
                      value={modalProfitPercent}
                      onChange={(e) => handleProfitPercentChange(e.target.value)}
                      className="w-full border border-gray-300 p-2.5 pr-8 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition font-medium" 
                      placeholder="Ej: 30" 
                    />
                    <span className="absolute right-3 text-gray-500 font-bold select-none text-base">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Precio Venta ($) *</label>
                  <input 
                    required 
                    name="salePrice" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={modalSalePrice}
                    onChange={(e) => handleSalePriceChange(e.target.value)}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Stock Inicial *</label>
                  <input required name="units" type="number" min="1" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Cantidad" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Stock Mínimo Alerta *</label>
                  <input required name="minStock" type="number" min="0" defaultValue="5" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Cant. mínima" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Mano de Obra ($) (Opcional)</label>
                  <input name="laborCost" type="number" step="0.01" min="0" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Ej: 15000" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700"># de Doc. (Factura / Proveedor)</label>
                  <input name="docNumber" type="text" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Ej: FAC-12345" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Fecha *</label>
                  <input required name="entryDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
                </div>
              </div>
              <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => {
                  setModalPurchasePrice('');
                  setModalSalePrice('');
                  setModalProfitPercent('');
                  setIsAddModalOpen(false);
                }} className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
                  Cancelar
                </button>
                <button type="submit" className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition font-bold flex items-center justify-center">
                  <Plus className="w-5 h-5 mr-1" />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VENDER PRODUCTO */}
      {isSellModalOpen && productToSell && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <h3 className="text-lg sm:text-xl font-bold text-blue-900 flex items-center">
                <ShoppingCart className="w-6 h-6 mr-2" />
                Nueva Venta
              </h3>
              <button onClick={() => setIsSellModalOpen(false)} className="text-blue-400 hover:text-blue-700 transition p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSellProduct} className="p-4 sm:p-6 space-y-6">
              {/* Info del producto */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">Producto:</p>
                <p className="font-bold text-lg text-gray-800 truncate">{productToSell.reference}</p>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-600">Stock: <strong className="text-blue-600">{productToSell.currentUnits}</strong></span>
                  <span className="text-gray-600">Precio: <strong className="text-blue-600">{formatCOP(productToSell.salePrice)}</strong></span>
                </div>
                {productToSell.laborCost > 0 && (
                  <div className="mt-2 text-sm border-t border-gray-200 pt-2">
                    <span className="text-gray-600 flex items-center">
                      <span className="font-bold text-orange-600 mr-2">Mano de Obra Sugerida:</span>
                      {formatCOP(productToSell.laborCost)}
                    </span>
                  </div>
                )}
              </div>

              {/* Cantidad a vender */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Cantidad</label>
                <input 
                  required 
                  name="quantity" 
                  type="number" 
                  min="1" 
                  max={productToSell.currentUnits}
                  defaultValue="1"
                  className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 text-lg outline-none transition" 
                />
              </div>

              {/* Tipo de Venta */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <label className="text-sm font-bold text-gray-800 block">Tipo de Venta:</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm hover:bg-gray-50 border-gray-200">
                    <input type="radio" name="saleType" value="Directa" required className="sr-only peer" />
                    <div className="peer-checked:border-blue-500 peer-checked:ring-1 peer-checked:ring-blue-500 absolute inset-0 rounded-lg border-2 border-transparent pointer-events-none"></div>
                    <div className="flex flex-col text-center w-full">
                      <span className="font-bold text-gray-900">Directa</span>
                    </div>
                  </label>

                  <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm hover:bg-gray-50 border-gray-200">
                    <input type="radio" name="saleType" value="Indirecta" required className="sr-only peer" />
                    <div className="peer-checked:border-sky-500 peer-checked:ring-1 peer-checked:ring-sky-500 absolute inset-0 rounded-lg border-2 border-transparent pointer-events-none"></div>
                    <div className="flex flex-col text-center w-full">
                      <span className="font-bold text-gray-900">Indirecta</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 pt-4">
                <button type="submit" className="w-full px-5 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition font-bold text-lg flex justify-center items-center">
                  Confirmar Venta
                </button>
                <button type="button" onClick={() => setIsSellModalOpen(false)} className="w-full px-5 py-3 text-gray-500 rounded-lg hover:bg-gray-50 transition font-medium">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SURTIR PRODUCTO */}
      {isSurtirModalOpen && productToSurtir && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-2xl h-full sm:h-auto overflow-y-auto transform scale-100 transition-all duration-300">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/50 sticky top-0 z-10">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 flex items-center">
                <Box className="w-6 h-6 mr-2.5 text-blue-600" />
                Surtir Inventario: {productToSurtir.reference}
              </h3>
              <button onClick={() => {
                setIsSurtirModalOpen(false);
                setProductToSurtir(null);
              }} className="text-gray-400 hover:text-red-500 transition p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSurtirProduct} className="p-4 sm:p-6">
              {/* Product Info Summary */}
              <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-2 gap-4 text-sm font-medium">
                <div>
                  <span className="text-gray-400 block text-xs mb-0.5">Proveedor:</span>
                  <span className="text-slate-800 font-extrabold">{productToSurtir.supplier}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs mb-0.5">Stock Actual:</span>
                  <span className="text-blue-600 font-extrabold">{productToSurtir.currentUnits} unidades</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Cantidad a Surtir *</label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    value={surtirQuantity}
                    onChange={(e) => setSurtirQuantity(e.target.value)}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition font-medium" 
                    placeholder="Cantidad" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Precio Compra ($) *</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={surtirPurchasePrice}
                    onChange={(e) => handleSurtirPurchasePriceChange(e.target.value)}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition font-medium" 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Porcentaje Ganancia *</label>
                  <div className="relative flex items-center">
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      value={surtirProfitPercent}
                      onChange={(e) => handleSurtirProfitPercentChange(e.target.value)}
                      className="w-full border border-gray-300 p-2.5 pr-8 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition font-medium" 
                      placeholder="Ej: 30" 
                    />
                    <span className="absolute right-3 text-gray-500 font-bold select-none text-base">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Precio Venta ($) *</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={surtirSalePrice}
                    onChange={(e) => handleSurtirSalePriceChange(e.target.value)}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition font-medium" 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">Fecha de Surtido *</label>
                  <input 
                    required 
                    type="date" 
                    value={surtirEntryDate} 
                    onChange={(e) => setSurtirEntryDate(e.target.value)}
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition font-medium" 
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => {
                  setIsSurtirModalOpen(false);
                  setProductToSurtir(null);
                }} className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
                  Cancelar
                </button>
                <button type="submit" className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition font-bold flex items-center justify-center">
                  <Plus className="w-5 h-5 mr-1" />
                  Surtir Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GENERAR REPORTE */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800 flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                Generar Reporte
              </h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-gray-400 hover:text-red-500 transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleGenerateReport} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Mes del reporte (Opcional)</label>
                <input 
                  name="month" 
                  type="month" 
                  className="w-full border-2 border-gray-300 p-3 rounded-lg focus:ring-0 focus:border-blue-500 outline-none transition" 
                />
                <p className="text-xs text-gray-500">Si dejas esto vacío, se incluirán todos los meses.</p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-bold text-gray-700">Tipo de ventas a incluir</label>
                <select name="reportType" className="w-full border-2 border-gray-300 p-3 rounded-lg focus:ring-0 focus:border-blue-500 outline-none transition bg-white">
                  <option value="Todas">Todas (Directas e Indirectas)</option>
                  <option value="Directa">Solo Ventas Directas</option>
                  <option value="Indirecta">Solo Ventas Indirectas</option>
                </select>
              </div>

              <div className="mt-8 flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsReportModalOpen(false)} className="w-full px-5 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
                  Cancelar
                </button>
                <button type="submit" className="w-full px-5 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 shadow-md transition font-bold flex justify-center items-center">
                  <Download className="w-5 h-5 mr-2" />
                  Preparar PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CIERRE DE CAJA */}
      {isCierreModalOpen && (() => {
        const todayDateStr = new Date().toLocaleDateString();
        // Filtrar ventas de hoy
        const todaysSales = sales.filter(s => s.date.startsWith(todayDateStr));
        
        const totalRevenue = todaysSales.reduce((acc, s) => acc + s.total, 0);
        const totalCost = todaysSales.reduce((acc, s) => {
          if (s.unitCost !== undefined) return acc + (s.quantity * s.unitCost);
          const product = products.find(p => p.id === s.productId);
          const itemCost = product ? product.purchasePrice : 0;
          return acc + (s.quantity * itemCost);
        }, 0);
        const totalProfit = totalRevenue - totalCost;
        const totalUnits = todaysSales.reduce((acc, s) => acc + s.quantity, 0);

        const productsSold = {};
        todaysSales.forEach(s => {
          if (productsSold[s.reference]) {
            productsSold[s.reference] += s.quantity;
          } else {
            productsSold[s.reference] = s.quantity;
          }
        });
        const productsSoldArray = Object.entries(productsSold).sort((a, b) => b[1] - a[1]);

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn scale-100 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-emerald-600 text-white shrink-0">
                <div className="flex items-center space-x-3">
                  <Calculator className="w-6 h-6 text-emerald-100" />
                  <h3 className="text-xl font-extrabold tracking-tight">Cierre de Caja del Día</h3>
                </div>
                <button onClick={() => setIsCierreModalOpen(false)} className="text-emerald-100 hover:text-white transition p-2 hover:bg-emerald-700 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Fecha de Cierre</p>
                  <p className="text-2xl font-black text-gray-900 bg-gray-50 inline-block px-4 py-2 rounded-lg border border-gray-100">{todayDateStr}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                    <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">Total Ventas</p>
                    <p className="text-2xl font-black text-emerald-700">{formatCOP(totalRevenue)}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                    <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Ganancia Neta</p>
                    <p className="text-2xl font-black text-blue-700">{formatCOP(totalProfit)}</p>
                  </div>
                  <div className="col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-100 text-center flex justify-center space-x-8">
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Unidades Vendidas</p>
                      <p className="text-xl font-black text-gray-800">{totalUnits}</p>
                    </div>
                    <div className="border-l border-gray-200 pl-8">
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Transacciones</p>
                      <p className="text-xl font-black text-gray-800">{todaysSales.length}</p>
                    </div>
                  </div>
                </div>

                {productsSoldArray.length > 0 && (
                  <div className="mb-2 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2">Productos Vendidos</p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {productsSoldArray.map(([ref, qty]) => (
                        <div key={ref} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50 last:border-0">
                          <span className="text-gray-700 font-medium truncate pr-3" title={ref}>{ref}</span>
                          <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded shrink-0">{qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0">
                <div className="flex items-center space-x-3">
                  <button type="button" onClick={() => setIsCierreModalOpen(false)} className="flex-1 px-5 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition font-bold text-center">
                    Cerrar
                  </button>
                  <button type="button" onClick={() => {
                    setReportData({
                      month: `(Cierre del Día) ${todayDateStr}`,
                      type: 'Todas',
                      sales: todaysSales,
                      totalRevenue,
                      totalUnits,
                      totalCost,
                      totalProfit
                    });
                    setIsCierreModalOpen(false);
                    setTimeout(() => window.print(), 300);
                  }} className="flex-1 px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md transition font-bold flex justify-center items-center">
                    <Printer className="w-5 h-5 mr-2" />
                    Imprimir Resumen
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>

    {/* RECIBO POS (Para ventas Indirectas) */}
    {receiptData && (
      <div className="hidden print:block font-mono text-black mx-auto" style={{ width: '300px', padding: '10px 0', fontSize: '12px', lineHeight: '1.4' }}>
        <div className="text-center mb-4 border-b border-black pb-2 border-dashed">
          <h2 className="text-2xl font-black uppercase mb-1">MiNegocio</h2>
          <p className="text-xs">Comprobante de Venta</p>
          <p className="text-xs">{receiptData.date}</p>
        </div>
        
        <div className="mb-4">
          <p className="font-bold border-b border-black border-dashed mb-1">CANT. DESCRIPCIÓN</p>
          <div className="flex justify-between items-start my-2">
            <span className="w-8 text-left">{receiptData.quantity}</span>
            <span className="flex-1 px-1 font-bold">{receiptData.reference}</span>
            <span className="text-right">{formatCOP(receiptData.unitPrice)}</span>
          </div>
        </div>

        <div className="border-t border-black border-dashed pt-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatCOP(receiptData.total)}</span>
          </div>
          {receiptData.laborCost > 0 && (
            <div className="flex justify-between text-sm">
              <span>Mano de Obra:</span>
              <span>{formatCOP(receiptData.laborCost)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-base mt-2 border-t border-black pt-1">
            <span>TOTAL:</span>
            <span>{formatCOP(receiptData.total + (receiptData.laborCost > 0 ? receiptData.laborCost : 0))}</span>
          </div>
        </div>

        <div className="text-center mt-6 text-[10px] border-t border-black border-dashed pt-2">
          <p>¡Gracias por su compra!</p>
          <p className="uppercase mt-1">Venta {receiptData.saleType}</p>
        </div>
      </div>
    )}

    {/* PLANTILLA DE IMPRESIÓN (Solo visible al generar el reporte PDF) */}
    {reportData && (
      <div className="hidden print:block bg-white text-black p-8 font-sans w-full max-w-4xl mx-auto">
        <div className="border-b-2 border-gray-800 pb-6 mb-8 text-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Reporte de Ventas</h1>
          <p className="text-lg text-gray-600 mt-2 font-medium">
            {reportData.month ? `Mes: ${reportData.month}` : 'Historial Completo'} | Filtro: {reportData.type}
          </p>
          <p className="text-sm text-gray-400 mt-1">Generado el: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Total Ingresos</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900">{formatCOP(reportData.totalRevenue)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Total Costos</p>
            <p className="text-xl sm:text-2xl font-black text-orange-600">{formatCOP(reportData.totalCost)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Ganancia Neta</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600">{formatCOP(reportData.totalProfit)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Unidades Vendidas</p>
            <p className="text-xl sm:text-2xl font-black text-blue-600">{reportData.totalUnits}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse mb-8">
          <thead>
            <tr className="border-b-2 border-gray-800 text-gray-800">
              <th className="py-3 px-2 font-bold uppercase text-sm">Fecha</th>
              <th className="py-3 px-2 font-bold uppercase text-sm">Referencia</th>
              <th className="py-3 px-2 font-bold uppercase text-sm text-center">Tipo</th>
              <th className="py-3 px-2 font-bold uppercase text-sm text-center">Cant</th>
              <th className="py-3 px-2 font-bold uppercase text-sm text-right">Precio Un.</th>
              <th className="py-3 px-2 font-bold uppercase text-sm text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reportData.sales.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-6 text-center text-gray-500 italic">No hay ventas en este periodo.</td>
              </tr>
            ) : (
              reportData.sales.map((sale, i) => (
                <tr key={i}>
                  <td className="py-3 px-2 text-sm text-gray-600">{sale.date}</td>
                  <td className="py-3 px-2 font-medium text-gray-900">{sale.reference}</td>
                  <td className="py-3 px-2 text-center text-sm">{sale.saleType}</td>
                  <td className="py-3 px-2 text-center font-medium">{sale.quantity}</td>
                  <td className="py-3 px-2 text-right text-gray-600">{formatCOP(sale.unitPrice)}</td>
                  <td className="py-3 px-2 text-right font-bold text-gray-900">{formatCOP(sale.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-12 text-center text-sm text-gray-400 border-t border-gray-200 pt-4">
          <p>MiNegocio - Documento Generado Automáticamente</p>
        </div>
      </div>
    )}
    </>
  );
}