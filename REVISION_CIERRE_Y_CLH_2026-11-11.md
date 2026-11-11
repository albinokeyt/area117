# Cierre de día y lugares de compra · v1.6.9

- En cada cuadro de Compras, pulsar **CLH (Lugar Compra)**, editar las estaciones deseadas y pulsar **Guardar lugares de compra**. Se usa el catálogo de estaciones en PostgreSQL: el cambio se conserva al cambiar de producto o fecha, recargar y cerrar el día.
- **Cierre de Día** crea un único XLSX con índice y hojas para Compras (incluidas tarifas especiales, Bronco, AdBlue y rutas), Postes (GOA, gasolina, HVO, gasóleo B, AdBlue, gases y Bronco), Sábana de Precios (estándar, especiales y personalizadas), PDFs y Clientes (tarifas, validez, nombres, HVO, estaciones, etiquetas y precios) y EFI Export (proveedores, colaboradoras fijas y todas las filas de importación con sus fechas y precios).
- El Excel registra los valores inmediatamente anteriores al cierre. Después, el programa copia los precios actuales a las columnas anteriores y limpia las marcas de modificación. El archivo se descarga cuando PostgreSQL confirma el cierre. Si falla la confirmación y se reintenta en la misma sesión, se conserva el archivo preparado.
- Los encabezados de Tarifas Especiales en Compras pasan a **Precio Referencia** y **Precio Especial Sugerido**, en ese orden. Cada celda conserva su valor y cálculo.
- **Tarifa Especial 75** deja de aparecer como cuadro de Sábana y se excluye del Excel de esa ventana. Las referencias de PDF y EFI que aún la usan siguen funcionando. **Tarifas Especiales Personalizadas** ocupa todo el ancho disponible.

El XLSM de referencia se inspeccionó sin ejecutar macros. El archivo de cierre registra los datos del sistema al pulsar el botón, con independencia del filtro de producto, búsqueda de clientes o página de EFI.

Validado con 51 pruebas unitarias, comprobación de tipos, compilación y pruebas de navegador en PostgreSQL aislado. Se abrió y revisó el XLSX descargado en la prueba (26 hojas y 1.294 filas de EFI), incluido el CLH guardado, los precios y márgenes antes del cierre, el IVA independiente de las fórmulas y las fechas propias de cada exportación.
