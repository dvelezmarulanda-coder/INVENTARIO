const XLSX = require('xlsx');

const data = [
  {
    Referencia: 'Camiseta Básica Blanca',
    Proveedor: 'Textiles del Norte',
    'Precio Compra': 5000,
    'Precio Venta': 15000,
    Unidades: 50,
    'Fecha Ingreso': '2026-04-19'
  },
  {
    Referencia: 'Pantalón Jean Azul',
    Proveedor: 'Confecciones Moda',
    'Precio Compra': 25000,
    'Precio Venta': 60000,
    Unidades: 30,
    'Fecha Ingreso': '2026-04-19'
  },
  {
    Referencia: 'Zapatos Deportivos',
    Proveedor: 'Calzado Express',
    'Precio Compra': 40000,
    'Precio Venta': 90000,
    Unidades: 20,
    'Fecha Ingreso': '2026-04-19'
  }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Inventario");
XLSX.writeFile(wb, "ejemplo_inventario.xlsx");

console.log("Archivo ejemplo_inventario.xlsx generado exitosamente.");
