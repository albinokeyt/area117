# Margen de Compras · v1.6.5

La columna Margen restaba el coste total a la venta sugerida. Ahora resta **P. Venta Sugerido − P. Venta Ant.**, siempre dentro de la misma fila, en estaciones propias, colaboradoras fijas y colaboradoras restantes, para GOA, Gasolina 95 y AdBlue. La vista conjunta usa la misma regla.

El Resumen Diario Excel y la hoja CALCULO INICIAL del Excel de cierre usan también esta diferencia. Se conservan los precios, los costes, las fórmulas comerciales y el guardado en PostgreSQL. No se introduce una copia persistida del margen: se calcula con los valores actuales. El encabezado Margen muestra la fórmula al pasar el ratón.

El cierre sigue copiando la venta sugerida a la venta anterior, por lo que el margen queda a cero después del cierre. El cuadro Gasolina Bronco conserva su columna Beneficio y las Tarifas Especiales conservan sus orígenes: esos cuadros no tienen la columna Margen ni las dos columnas de venta solicitadas.

## Mensaje para Yanfri

Ya corregimos el margen en todos los cuadros de Compras: ahora es el precio de venta sugerido menos el precio de venta anterior de esa misma estación y producto. Si ambos precios son iguales, muestra 0,000 €; si sube, positivo, y si baja, negativo. Se actualiza al cambiar cualquiera de esos dos precios. El resumen Excel y el Excel del cierre muestran el mismo cálculo. Al cerrar el día, como la venta sugerida pasa a la anterior, el margen vuelve a cero. Al entrar te aparecerá la novedad y también queda en Historial de versiones.

## Verificación

Prueba de navegador con PostgreSQL aislado: ediciones reales en los tres grupos de estaciones y en GOA, Gasolina y AdBlue; signos positivo, negativo y cero; cambios en ambos precios de venta; comprobación de todas las filas en las cuatro vistas de productos; persistencia, navegación y recarga; lectura de ambos Excel; cierre sin alterar las ventas sugeridas.

Resultados: 38 pruebas unitarias correctas, comprobación de tipos y compilación correctas; 7 pruebas de navegador correctas (margen, flujo de precios, transacciones y conflictos, errores de guardado y lectura, autorización y novedades por usuario).
