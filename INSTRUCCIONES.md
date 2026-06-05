# Manual de Uso Local y Copias de Seguridad - MiNegocio

Este documento contiene las instrucciones sencillas para configurar y usar la aplicación **MiNegocio** de forma local en cualquier computador, además de cómo gestionar las copias de seguridad de los datos.

---

## 1. Preparación Inicial (Solo la primera vez)

Para que la aplicación funcione en el computador del cliente, se deben seguir estos pasos sencillos:

1. **Instalar Node.js:**
   * Descarga e instala **Node.js** (versión recomendada LTS) desde la página oficial: [https://nodejs.org/](https://nodejs.org/)
   * La instalación es estándar (siguiente, siguiente, finalizar).

2. **Descargar y preparar la carpeta del proyecto:**
   * Envía al cliente la carpeta de este proyecto comprimida en un archivo `.zip`.
   * El cliente debe descomprimirla en el lugar de su preferencia (ej. en el Escritorio o la carpeta Documentos).

3. **Instalar los componentes necesarios:**
   * Abre la carpeta del proyecto.
   * Haz clic derecho en una zona vacía de la carpeta y selecciona **"Abrir en Terminal"** (o busca la línea de comandos/PowerShell en esa carpeta).
   * Escribe el siguiente comando y presiona Enter:
     ```bash
     npm install
     ```
   * Espera a que termine la instalación (creará una carpeta llamada `node_modules`). ¡Listo! Ya no tendrás que hacer este paso de nuevo.

---

## 2. Cómo Iniciar la Aplicación (Uso Diario)

Para facilitarle el uso al cliente, hemos creado un acceso directo inteligente llamado **`iniciar.bat`** en la carpeta principal.

1. **Ejecutar la App:**
   * El cliente solo debe hacer **doble clic en el archivo `iniciar.bat`**.
2. **¿Qué sucederá?**
   * Se abrirá automáticamente el navegador de internet mostrando la aplicación en la dirección: **`http://localhost:5173/`**
   * Se abrirá una ventana negra de consola. **Es importante mantener esta ventana abierta** mientras se use la aplicación. Al terminar de trabajar, simplemente se puede cerrar la ventana de consola para apagar el programa.

---

## 3. Control y Respaldo de los Datos (¡MUY IMPORTANTE!)

### ¿Dónde se guardan los datos?
Toda la información registrada (productos creados, stock, historial de ventas, etc.) se guarda localmente en el almacenamiento interno de su navegador web (`localStorage`). No se requiere internet para leer o escribir estos datos.

### ¿Cuál es el riesgo?
Dado que los datos están vinculados al navegador del computador del cliente:
* Si limpia el historial del navegador (específicamente la caché o cookies de origen).
* Si decide cambiar de navegador (ej. pasar de Chrome a Edge).
* Si su computador se daña o decide formatearlo.
**Podría perder la información.**

### ¿Cómo evitar la pérdida de datos? (Copia de Seguridad)
Hemos añadido una sección llamada **"Copia de Seguridad"** en la barra lateral (sidebar) de la aplicación para evitar esto:

1. **Exportar Copia (Recomendado hacer al final de cada jornada):**
   * Haz clic en **"Exportar Copia (.json)"**.
   * Se descargará un archivo en tu computador con un nombre como `respaldo_negocio_AAAA-MM-DD.json`.
   * Guarda este archivo en un lugar seguro (por ejemplo, en una carpeta en la nube como OneDrive/Google Drive, o en una memoria USB).

2. **Importar Copia (Para restaurar la información):**
   * Si cambias de computador o abres la app por primera vez en otro navegador y ves la base de datos vacía:
   * Haz clic en **"Importar Copia (.json)"** en la barra lateral.
   * Selecciona el último archivo `.json` de respaldo que hayas descargado.
   * Confirma la importación. Todos tus productos, inventarios y ventas se restaurarán al instante.
