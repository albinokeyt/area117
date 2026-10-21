export interface AppRelease { version: string; date: string; title: string; changes: string[] }
// Add a new entry for every user-facing release. Newest first; keep previous entries.
export const APP_RELEASES: AppRelease[] = [
  { version: 'v1.6.6', date: '21/10/2026', title: 'Rutas enlazadas y PDF por cuadro de Compras', changes: [
    'Nuevo botón Rutas y etiquetas en Compras y casilla Ruta junto a cada estación con etiqueta. Activarla colorea en verde sus filas en GOA, Gasolina y AdBlue, también en la vista de todos los productos.',
    'Compras y PDFs y Clientes comparten las mismas etiquetas y su estado activo. Desactivar una ruta conserva sus etiquetas asignadas: al volver a activarla aparecen las mismas en todas las tarifas PDF. Se mantienen el distintivo naranja y el resaltado amarillo de los PDF de clientes.',
    'Cada cuadro de Compras (propias, colaboradoras fijas y restantes) tiene Descargar PDF. Descarga solo ese cuadro con el filtro de producto seleccionado, los valores actuales, fechas, márgenes, rutas verdes y celdas modificadas en amarillo. Incluye todas las filas, cabeceras repetidas y páginas numeradas.',
    'Las asignaciones y la activación se guardan en PostgreSQL y se conservan al cambiar de ventana, recargar y cerrar el día. El amarillo de precios modificados sigue siendo independiente de la ruta activa.'
  ] },
  { version: 'v1.6.5', date: '20/10/2026', title: 'Margen de Compras respecto a la venta anterior', changes: [
    'En todos los cuadros de Compras, Margen = P. Venta Sugerido − P. Venta Ant. de la misma fila. Se aplica a Gasóleo A, Gasolina 95 y AdBlue, en estaciones propias y colaboradoras.',
    'El margen se recalcula al editar cualquiera de los dos precios de venta y también en Ver Todos los Productos. Los precios iguales muestran 0,000 €, las subidas un margen positivo y las bajadas uno negativo.',
    'El Resumen Diario Excel y el Excel de Cierre de Día usan el mismo cálculo. Al copiar la venta sugerida a la anterior en el cierre, el margen queda a cero. Puedes consultar la fórmula pasando el ratón sobre el título Margen.'
  ] },
  { version: 'v1.6.4', date: '16/10/2026', title: 'Conecta la boquilla para entrar', changes: [
    'La pieza que se arrastra ahora es una boquilla de repostaje, con tubo metálico, empuñadura, gatillo y manguera; sustituye al icono de gasolinera.',
    'Se elimina Acceder directamente y el acceso desde el logo. El formulario se abre únicamente al llevar la boquilla hasta la toma del coche. Pulsarla sin moverla no conecta.',
    'Funciona con ratón y pantalla táctil. Con teclado, las flechas mueven la boquilla, Enter la conecta cuando está junto a la toma y Escape la devuelve al surtidor. Se mantiene la transición del coche tras iniciar sesión.'
  ] },
  { version: 'v1.6.3', date: '16/10/2026', title: 'Arranca tu estación de trabajo', changes: [
    'Al iniciar sesión correctamente, el coche avanza hacia la pantalla y da paso al sistema en una transición de unos 3,5 segundos. Las credenciales incorrectas mantienen el formulario y su mensaje de error.',
    'Los datos se cargan durante la animación. Si la conexión tarda más, el aviso continúa hasta que estén listos; si falla, aparece Reintentar conexión. Las novedades se muestran después de la transición.',
    'La transición se acorta cuando está activado el movimiento reducido. Una sesión ya abierta entra directamente al sistema al recargar.'
  ] },
  { version: 'v1.6.2', date: '16/10/2026', title: 'Un coche más reconocible en el acceso', changes: [
    'Redibujamos el coche del login con carrocería curva, capó, puertas, cristales, retrovisor, faros y llantas. Las ruedas siguen la misma perspectiva.',
    'La manguera se conecta a la tapa de combustible del lateral trasero. Se conservan el arrastre, el acceso al pulsar el surtidor, el teclado y Acceder directamente.'
  ] },
  { version: 'v1.6.1', date: '16/10/2026', title: 'Navegación flotante AREA117', changes: [
    'Las pestañas se convierten en un notch de cristal azul que flota en la parte superior. Muestra la sección actual, la hora, un saludo y los avisos de novedades.',
    'Pasa el ratón para desplegarlo o púlsalo para dejarlo abierto. Elige cualquiera de las ocho secciones; pulsa fuera o Escape para cerrar. También funciona con teclado y en móvil.',
    'El notch indica Guardando cambios, Guardado en PostgreSQL o Guardado pendiente según el resultado real de la sincronización. Las herramientas BD y Subir Todo al Servidor están dentro del menú.',
    'Apertura y cierre fluidos, opciones que aparecen en secuencia y transiciones al cambiar de sección. Se respeta el movimiento reducido y se conservan los datos, permisos, fórmulas y exportaciones.'
  ] },
  { version: 'v1.6.0', date: '16/10/2026', title: 'AREA117 Crystal: nueva experiencia visual', changes: [
    'Nuevo diseño de cristal en todo el sistema: azul, rojo y blanco del logo AREA117, cabecera renovada, navegación más clara, tablas luminosas y ventanas translúcidas.',
    'Acceso interactivo con una gasolinera y un coche: arrastra o pulsa el surtidor para abrir el formulario, o utiliza Acceder directamente. El indicador acompaña la escritura del usuario y la contraseña.',
    'La contraseña puede mostrarse u ocultarse. El acceso funciona con teclado y pantalla táctil; las animaciones respetan la preferencia de movimiento reducido.',
    'Se conservan la autenticación, los permisos, PostgreSQL, las fórmulas, el guardado y las exportaciones. Las casillas modificadas siguen en amarillo y los formatos PDF mantienen su presentación original.'
  ] },
  { version: 'v1.5.7', date: '15/10/2026', title: 'Validación de todas las tarifas PDF', changes: [
    'Nuevo botón Validar tarifas PDF en PDFs y Clientes. Revisa todas las tarifas y estaciones, incluidas las desactivadas, comparando por separado los precios sin IVA y con IVA con el cálculo actual de Sábana.',
    'El informe distingue coincidencias, diferencias y datos por revisar. Muestra tarifa, estación, origen, fórmula personalizada y ambos precios. Respeta las excepciones comerciales guardadas, incluido Precio Referencia de Compras.',
    'Se detectan orígenes ausentes, datos de otra fecha y fórmulas que no se pueden evaluar o cuyo resultado está desactualizado. Los filtros permiten revisar una tarifa, estación o solo las incidencias.',
    'Si los datos cambian después de validar, el informe avisa de que debe repetirse la comprobación con Volver a validar. La validación no modifica precios ni reglas y se aplica a los PDF generados con los datos actuales.'
  ] },
  { version: 'v1.5.6', date: '15/10/2026', title: 'Tarifas enlazadas, exportación EFI y novedades', changes: [
    'PDF y Clientes conserva las excepciones guardadas por estación y tarifa: DORADO, ROR, ECO y TAX MOVING 24 vuelven a seguir sus orígenes configurados, incluido Precio Referencia. Se mantienen los enlaces de AMAEXO, E100, HIQI, NORPETROL, TARJETERA, TORTUGA, VRIO y variantes Pista de Silla.',
    'EFI Export guarda la fórmula y vuelve a consultar su origen cada vez que cambian Compras, Sábana o Postes. TALAEXPRESS puede seguir Precio Referencia con IVA sin quedarse con el precio del día anterior.',
    'Al reabrir Modificar se conserva el origen, diferencial, producto, código y tipo de pago. Señalar una celda también guarda un enlace vivo. Los valores manuales elegidos expresamente se conservan hasta volver a editarlos.',
    'Las fechas de todas las filas siguen las columnas INICIAL y FINAL de EFI Export. Estas fechas se guardan en PostgreSQL. Excel y CSV usan los mismos precios que la vista previa.',
    'Los orígenes ausentes y las referencias circulares se muestran para corregirlos y bloquean la descarga. El contador de estaciones PDF excluye estaciones eliminadas.',
    'Nuevo Historial de versiones. Las novedades aparecen al entrar en una versión nueva; cada usuario tiene su propia confirmación de lectura guardada en PostgreSQL.'
  ] },
  { version: 'v1.5.5', date: '15/10/2026', title: 'Precios PDF desde Sábana y HVO desde Postes', changes: [
    'La vista previa y los nuevos PDF leen las celdas finales sin IVA y con IVA de Sábana, incluidas sus fórmulas independientes.',
    'HVO Alfajarín y Valdemoro siguen los cuatro resultados calculados de Postes.',
    'Se bloquea la impresión si falta un origen válido y se permite enlazar tarifas personalizadas. Las excepciones comerciales se revisan y corrigen en v1.5.6.'
  ] },
  { version: 'v1.5.4', date: '15/10/2026', title: 'Edición de precios más rápida', changes: [
    'Las fórmulas resuelven referencias sin repetir búsquedas y conversiones costosas.',
    'Solo se dibujan las tablas de la ventana activa; los gestores conservan sus datos al navegar.'
  ] },
  { version: 'v1.5.3', date: '15/10/2026', title: 'Guardado independiente del espacio del navegador', changes: [
    'Compras y los demás módulos trabajan en memoria y guardan en PostgreSQL. La cuota de localStorage ya no impide guardar precios.',
    'Los datos se cargan desde PostgreSQL antes de abrir los editores.'
  ] },
  { version: 'v1.5.2', date: '15/10/2026', title: 'Sincronización sin revertir ediciones', changes: [
    'Una respuesta de guardado anterior ya no puede borrar una edición más reciente.',
    'El orden de las propiedades en PostgreSQL deja de provocar ciclos de sincronización y versiones innecesarias.'
  ] },
  { version: 'v1.5.1', date: '15/10/2026', title: 'Persistencia y cierre de día', changes: [
    'Precios y modificaciones se guardan en PostgreSQL y se propagan entre ventanas.',
    'Cierre de día copia los precios actuales a anteriores y limpia las marcas de modificación conservando los demás valores. Postes también limpia sus marcas.',
    'Sesiones y usuarios protegidos en el servidor; acceso administrador opcional mediante ADMIN_USERNAME y ADMIN_PASSWORD.'
  ] }
];
export const latestRelease = APP_RELEASES[0];
