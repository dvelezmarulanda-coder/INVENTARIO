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
  Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function App() {
  const fileInputRef = useRef(null);

  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('inventario');
  
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
  const [productToSell, setProductToSell] = useState(null);

  // Filtro de historial
  const [salesFilter, setSalesFilter] = useState('Todas'); // Todas, Directa, Indirecta

  // Búsqueda en Punto de Venta
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para Reporte
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState(null);

  // --- EFECTOS (Guardar en LocalStorage) ---
  useEffect(() => {
    localStorage.setItem('business_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('business_sales', JSON.stringify(sales));
  }, [sales]);

  // --- FUNCIONES ---
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
            entryDate
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
      supplier: formData.get('supplier'),
      entryDate: formData.get('entryDate'),
    };

    setProducts([...products, newProduct]);
    setIsAddModalOpen(false);
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
      total: quantity * productToSell.salePrice,
      saleType: saleType,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      isoDate: new Date().toISOString(), // Para facilitar filtros por mes
    };
    setSales([newSale, ...sales]);

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
        // Usamos isoDate si existe, o lo ignoramos (ventas nuevas siempre tendrán isoDate)
        if (s.isoDate && !s.isoDate.startsWith(monthYear)) {
          return false;
        } else if (!s.isoDate) {
           return true; // Fallback para no perder ventas antiguas en el reporte
        }
      }
      return true;
    });

    setReportData({
      month: monthYear,
      type: type,
      sales: filteredForReport,
      totalRevenue: filteredForReport.reduce((acc, s) => acc + s.total, 0),
      totalUnits: filteredForReport.reduce((acc, s) => acc + s.quantity, 0)
    });

    setIsReportModalOpen(false);

    // Dar un momento para renderizar la vista de impresión y luego lanzar la ventana de imprimir/PDF
    setTimeout(() => {
      window.print();
      setReportData(null); // Limpiar después de imprimir
    }, 500);
  };

  // --- RENDERIZADO DE VISTAS ---
  const filteredSales = salesFilter === 'Todas' 
    ? sales 
    : sales.filter(s => s.saleType === salesFilter);

  // Estadísticas rápidas
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.currentUnits * p.purchasePrice), 0);
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.total, 0);

  return (
    <>
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 print:hidden">
      
      {/* SIDEBAR (Barra Lateral) */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <TrendingUp className="w-8 h-8 text-blue-400" />
          <h1 className="text-xl font-bold tracking-wider">MiNegocio</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('resumen')}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeTab === 'resumen' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <Box className="w-5 h-5" />
            <span>Resumen</span>
          </button>
          <button 
            onClick={() => setActiveTab('vender')}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeTab === 'vender' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <Store className="w-5 h-5" />
            <span>Punto de Venta</span>
          </button>
          <button 
            onClick={() => setActiveTab('inventario')}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeTab === 'inventario' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <Package className="w-5 h-5" />
            <span>Inventario</span>
          </button>
          <button 
            onClick={() => setActiveTab('historial')}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeTab === 'historial' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
          >
            <History className="w-5 h-5" />
            <span>Historial de Ventas</span>
          </button>
        </nav>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Cabecera */}
        <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-semibold text-gray-700 capitalize">
            {activeTab === 'resumen' ? 'Panel General' : activeTab === 'inventario' ? 'Gestión de Inventario' : activeTab === 'vender' ? 'Punto de Venta' : 'Historial de Movimientos'}
          </h2>
          <div className="flex space-x-4">
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow transition"
                >
                  <Upload className="w-5 h-5" />
                  <span>Subir Excel</span>
                </button>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nuevo Producto</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Área de scroll del contenido */}
        <main className="flex-1 overflow-y-auto p-6">
          
          {/* VISTA: RESUMEN */}
          {activeTab === 'resumen' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
                    <Package className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Productos</p>
                    <p className="text-2xl font-bold text-gray-800">{products.length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Ingresos por Ventas</p>
                    <p className="text-2xl font-bold text-gray-800">${totalSalesRevenue.toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                  <div className="p-4 bg-purple-50 text-purple-600 rounded-full">
                    <Box className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Valor en Inventario</p>
                    <p className="text-2xl font-bold text-gray-800">${totalInventoryValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
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
                  placeholder="Buscar producto por referencia..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none text-gray-700 placeholder-gray-400 bg-transparent text-lg"
                />
              </div>

              {/* Lista de productos filtrados en formato lista alfabética */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                        .filter(p => p.reference.toLowerCase().includes(searchQuery.toLowerCase()))
                        .sort((a, b) => a.reference.localeCompare(b.reference))
                        .map(product => (
                          <tr key={product.id} className="hover:bg-gray-50 transition">
                            <td className="p-4">
                              <div className="font-bold text-gray-800">{product.reference}</div>
                            </td>
                            <td className="p-4 text-gray-600 text-sm">{product.supplier}</td>
                            <td className="p-4 text-right">
                              <span className="text-lg font-bold text-emerald-600">${product.salePrice.toLocaleString()}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.currentUnits > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
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
                      {products.filter(p => p.reference.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-gray-500 bg-white">
                            <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-lg">No se encontraron productos con esa referencia.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VISTA: INVENTARIO */}
          {activeTab === 'inventario' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm uppercase tracking-wider">
                      <th className="p-4 font-semibold">Referencia</th>
                      <th className="p-4 font-semibold">Proveedor</th>
                      <th className="p-4 font-semibold">Fecha Ingreso</th>
                      <th className="p-4 font-semibold text-right">P. Compra</th>
                      <th className="p-4 font-semibold text-right">P. Venta</th>
                      <th className="p-4 font-semibold text-center">En Inventario</th>
                      <th className="p-4 font-semibold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-gray-400">
                          No hay productos registrados. Haz clic en "Nuevo Producto" para empezar.
                        </td>
                      </tr>
                    ) : (
                      products.map(product => (
                        <tr key={product.id} className="hover:bg-gray-50 transition">
                          <td className="p-4 font-medium text-gray-800">{product.reference}</td>
                          <td className="p-4 text-gray-600">{product.supplier}</td>
                          <td className="p-4 text-gray-600">{product.entryDate}</td>
                          <td className="p-4 text-right text-gray-600">${product.purchasePrice.toLocaleString()}</td>
                          <td className="p-4 text-right text-emerald-600 font-medium">${product.salePrice.toLocaleString()}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${product.currentUnits > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                              {product.currentUnits} / {product.initialUnits}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => openSellModal(product)}
                              disabled={product.currentUnits <= 0}
                              className={`flex items-center justify-center space-x-1 px-3 py-1.5 rounded shadow-sm mx-auto transition ${
                                product.currentUnits > 0 
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <ShoppingCart className="w-4 h-4" />
                              <span>Vender</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA: HISTORIAL */}
          {activeTab === 'historial' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-4 justify-between items-center">
                <h3 className="font-semibold text-gray-700 flex items-center">
                  <Filter className="w-4 h-4 mr-2" />
                  Clasificar Ventas
                </h3>
                <div className="flex items-center space-x-2">
                  {['Todas', 'Directa', 'Indirecta'].map(type => (
                    <button
                      key={type}
                      onClick={() => setSalesFilter(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        salesFilter === type 
                        ? 'bg-blue-600 text-white shadow' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                  <div className="w-px h-8 bg-gray-300 mx-2"></div>
                  <button 
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Generar PDF</span>
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-gray-500 text-sm uppercase tracking-wider">
                      <th className="p-4 font-semibold">Fecha y Hora</th>
                      <th className="p-4 font-semibold">Referencia</th>
                      <th className="p-4 font-semibold text-center">Tipo de Venta</th>
                      <th className="p-4 font-semibold text-center">Cant.</th>
                      <th className="p-4 font-semibold text-right">P. Unitario</th>
                      <th className="p-4 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-400">
                          No hay ventas registradas en esta categoría.
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map(sale => (
                        <tr key={sale.id} className="hover:bg-gray-50 transition">
                          <td className="p-4 text-gray-600">{sale.date}</td>
                          <td className="p-4 font-medium text-gray-800">{sale.reference}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              sale.saleType === 'Directa' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {sale.saleType}
                            </span>
                          </td>
                          <td className="p-4 text-center font-medium text-gray-700">{sale.quantity}</td>
                          <td className="p-4 text-right text-gray-600">${sale.unitPrice.toLocaleString()}</td>
                          <td className="p-4 text-right font-bold text-emerald-600">${sale.total.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL: AÑADIR PRODUCTO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Registrar Nuevo Producto al Inventario</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-red-500 transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Referencia del Producto *</label>
                  <input required name="reference" type="text" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="Ej: Zapatos Nike Mod 1" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Proveedor *</label>
                  <input required name="supplier" type="text" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="Ej: Distribuidora Central" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Precio de Compra ($) *</label>
                  <input required name="purchasePrice" type="number" step="0.01" min="0" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Precio de Venta ($) *</label>
                  <input required name="salePrice" type="number" step="0.01" min="0" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Unidades Compradas *</label>
                  <input required name="units" type="number" min="1" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="Cantidad que entra al inventario" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Fecha de Ingreso *</label>
                  <input required name="entryDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition font-medium flex items-center">
                  <Plus className="w-5 h-5 mr-1" />
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VENDER PRODUCTO (Aquí está la pregunta clave) */}
      {isSellModalOpen && productToSell && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-md overflow-hidden transform transition-all">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <h3 className="text-xl font-bold text-blue-900 flex items-center">
                <ShoppingCart className="w-6 h-6 mr-2" />
                Nueva Venta
              </h3>
              <button onClick={() => setIsSellModalOpen(false)} className="text-blue-400 hover:text-blue-700 transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSellProduct} className="p-6 space-y-6">
              
              {/* Info del producto */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">Producto a vender:</p>
                <p className="font-bold text-lg text-gray-800">{productToSell.reference}</p>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-600">Disp: <strong className="text-blue-600">{productToSell.currentUnits} unds</strong></span>
                  <span className="text-gray-600">Precio: <strong className="text-emerald-600">${productToSell.salePrice.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Cantidad a vender */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">¿Cuántas unidades vas a vender?</label>
                <input 
                  required 
                  name="quantity" 
                  type="number" 
                  min="1" 
                  max={productToSell.currentUnits}
                  defaultValue="1"
                  className="w-full border-2 border-gray-300 p-3 rounded-lg focus:ring-0 focus:border-blue-500 text-lg outline-none transition" 
                />
              </div>

              {/* LA PREGUNTA IMPORTANTE: Directa o Indirecta */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <label className="text-base font-bold text-gray-800 block">Tipo de Venta (Requerido):</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm hover:border-gray-300 hover:bg-gray-50 focus:outline-none border-gray-200">
                    <input type="radio" name="saleType" value="Directa" required className="sr-only peer" />
                    <div className="peer-checked:border-blue-500 peer-checked:ring-1 peer-checked:ring-blue-500 absolute inset-0 rounded-lg border-2 border-transparent pointer-events-none"></div>
                    <div className="flex flex-col text-center w-full">
                      <span className="font-bold text-gray-900">Directa</span>
                      <span className="text-xs text-gray-500 mt-1">Venta al cliente final</span>
                    </div>
                  </label>

                  <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm hover:border-gray-300 hover:bg-gray-50 focus:outline-none border-gray-200">
                    <input type="radio" name="saleType" value="Indirecta" required className="sr-only peer" />
                    <div className="peer-checked:border-orange-500 peer-checked:ring-1 peer-checked:ring-orange-500 absolute inset-0 rounded-lg border-2 border-transparent pointer-events-none"></div>
                    <div className="flex flex-col text-center w-full">
                      <span className="font-bold text-gray-900">Indirecta</span>
                      <span className="text-xs text-gray-500 mt-1">A través de terceros</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsSellModalOpen(false)} className="w-full px-5 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
                  Cancelar
                </button>
                <button type="submit" className="w-full px-5 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-md transition font-bold text-lg flex justify-center items-center">
                  Confirmar Venta
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
                <button type="submit" className="w-full px-5 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-md transition font-bold flex justify-center items-center">
                  <Download className="w-5 h-5 mr-2" />
                  Preparar PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>

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

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Total Ingresos</p>
            <p className="text-3xl font-black text-emerald-600">${reportData.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Unidades Vendidas</p>
            <p className="text-3xl font-black text-blue-600">{reportData.totalUnits}</p>
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
                  <td className="py-3 px-2 text-right text-gray-600">${sale.unitPrice.toLocaleString()}</td>
                  <td className="py-3 px-2 text-right font-bold text-gray-900">${sale.total.toLocaleString()}</td>
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