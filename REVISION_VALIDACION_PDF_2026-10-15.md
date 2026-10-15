# Validación de tarifas PDF — v1.5.7

## Uso

En **PDFs & Clientes**, pulsar **Validar tarifas PDF**. El informe cruza todas las tarifas del catálogo actual y todas las estaciones, incluidas las desactivadas. Compara por separado los precios sin IVA y con IVA, a los tres decimales que usa el documento.

Muestra tarifa, estación, estado de activación, origen, fórmula personalizada y las cuatro celdas (PDF/origen, sin/con IVA). Permite filtrar por tarifa, resultado o estación/origen, y pagina el detalle de 50 en 50 filas.

- **Coincide**: ambos precios y el enlace coinciden con el modelo actual del origen.
- **Diferencia**: el PDF y el origen actual usan distintos valores o enlaces.
- **Revisar**: falta un origen o precio válido, las fechas no coinciden o una fórmula no se puede evaluar correctamente.

Las excepciones guardadas por estación y tarifa se respetan. Por ejemplo, TAX MOVING 24 puede seguir Precio Referencia de Compras, sin sustituirlo por una columna numérica de Sábana. Las fórmulas con IVA independientes también se respetan.

## Implementación y límites

Sábana registra un lector en memoria que captura sus cálculos actuales bajo demanda. La captura vacía las cachés de cálculo del render, consulta los mismos métodos que dibujan las tablas y comprueba las fórmulas con las variables actuales. La comparación se hace contra la publicación que utiliza el PDF; no contra una segunda lectura de esa misma publicación. Un precio distinto en esa publicación se detecta aunque el origen actual siga intacto. También se señalan las referencias entre corchetes ausentes que el evaluador antiguo podía interpretar como cero y los resultados de fórmula desactualizados.

El informe se invalida cuando cambia el estado de negocio o la fecha de trabajo y ofrece **Volver a validar**. Consultar y repetir la validación no guarda ni modifica precios, fórmulas o configuraciones. El informe es temporal; los datos y reglas siguen guardados en PostgreSQL. No se añaden archivos JSON de negocio ni localStorage.

Es una comprobación de correspondencia con las reglas configuradas, no una certificación de la intención comercial de una fórmula. No analiza PDF antiguos descargados ni cambia sus precios. Los banners HVO mantienen su enlace existente a Postes; este informe revisa las tarifas por estación contra Sábana y sus excepciones de Compras.

## Verificación

- 38 pruebas unitarias: diferencias reales en ambas columnas, enlaces equivocados incluso con el mismo precio, orígenes/estaciones ausentes, fechas antiguas, cero, redondeo, excepciones, fórmulas inválidas y registro del lector actual.
- TypeScript y compilación de producción.
- 17 pruebas de navegador sobre PostgreSQL aislado: validación de 26 tarifas/52 estaciones, 2.600 celdas PDF comparadas con sus orígenes, detección de fórmula inválida, inclusión de estaciones desactivadas, informe sin escrituras en PostgreSQL, invalidación tras un cambio remoto, nueva validación y navegación por teclado.
- Regresiones de guardado, cierre de día, cuota del navegador, EFI/Excel/CSV, sesión administrativa, conflictos y novedades por usuario.

## Mensaje para Yanfri

Ya tienes el botón «Validar tarifas PDF» en PDF y Clientes. Revisa todas las tarifas y todas las estaciones, comparando los precios sin IVA y con IVA con sus fórmulas y orígenes actuales. Te muestra cuáles coinciden, dónde hay diferencias y qué datos necesitan revisión. Puedes filtrar por tarifa, estación o solo incidencias. Se respetan las excepciones que habéis configurado. Si después cambian los datos, te avisa para pulsar «Volver a validar». Esta comprobación no cambia precios ni fórmulas.
