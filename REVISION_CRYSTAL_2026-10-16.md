# AREA117 Crystal — v1.6.0

## Cambios visuales

Identidad basada en el logo existente de AREA117 (azul, rojo y blanco), con el tratamiento de superficies translúcidas, bordes iluminados y sombras suaves usado como referencia en GEB. Se utiliza Inter alojada en el propio proyecto, con su licencia SIL incluida; no hay descargas de fuentes al iniciar sesión.

- Cabecera con el logo real, nueva navegación con nombres visibles en móvil y sección activa identificada. Se conservan las mismas acciones y permisos.
- Superficies de cristal, controles claros, números tabulares, colores de estado y tablas en Compras, Postes, Sábana, PDF y Clientes, EFI Export, Usuarios e Instrucciones. Las tablas de Compras tienen desplazamiento horizontal cuando hace falta para no partir precios o unidades.
- Amarillo de las celdas modificadas conservado. Texto de compra/venta y márgenes con contraste sobre las superficies claras.
- Acceso con escena SVG de una gasolinera y un coche, animación de llegada y manguera interactiva. Se puede arrastrar el surtidor al coche, pulsarlo o elegir Acceder directamente. El gesto no autentica ni envía credenciales.
- Formulario con los mismos campos y API de autenticación. El indicador de combustible acompaña la escritura; no representa una valoración de seguridad de la contraseña. Se añade mostrar/ocultar contraseña, foco de teclado y estado de inicio en curso.
- Adaptación a móvil y a pantallas de portátil. Las animaciones decorativas respetan movimiento reducido; el acceso directo no exige arrastrar ni utilizar ratón.
- Novedades e historial actualizados para esta versión.

## Alcance conservado

No se cambian cálculos, referencias, valores, fórmulas, reglas comerciales, autenticación del servidor, permisos, PostgreSQL, sincronización, guardado o cierres. La escena y el indicador solo usan estado temporal de presentación. No añaden JSON de negocio en el servidor ni persistencia local del negocio.

La capa de color de la aplicación se limita a pantalla y excluye el subárbol printable-document. Se conservan la tipografía de sistema, los colores, el fondo blanco y los formatos impresos del documento PDF. El código de exportación de PNG, Excel y CSV permanece intacto.

## Verificación

- 38 pruebas unitarias de cálculos, precios vivos, PostgreSQL/sincronización, autorización y validación PDF.
- TypeScript y compilación de producción.
- 17 pruebas existentes de navegador sobre PostgreSQL aislado: guardado, fechas, conflictos, cierres, EFI/Excel/CSV, 2.600 celdas PDF, HVO, cuota del navegador y novedades por usuario.
- 3 comprobaciones nuevas: arrastre y acceso sin envío previo de credenciales, indicador reactivo, mostrar/ocultar contraseña, errores del login con la misma API, recuperación con teclado tras fallar el arrastre, movimiento reducido, ausencia de desbordamiento en móvil, acceso a los ocho módulos y conservación del papel PDF.
- Edición con 190 fórmulas y CPU limitada a cuatro veces más lenta dentro del límite de 500 ms por cambio (máximo observado: 451 ms).
- Revisión visual de capturas de todos los módulos, acceso y móvil.

## Mensaje para Yanfri

Ya tienes la nueva imagen AREA117 Crystal: todo el sistema tiene ahora un diseño de cristal con los colores del logo, una navegación renovada y tablas más claras. El login incluye una gasolinera interactiva: puedes conectar el surtidor al coche o entrar directamente; al escribir, el indicador de combustible se va llenando. También funciona con teclado y móvil. Se mantienen los precios, las fórmulas, el guardado, los cierres y las exportaciones. Las casillas modificadas siguen marcándose en amarillo.
