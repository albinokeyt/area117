export interface AppRelease { version: string; date: string; title: string; changes: string[] }
// Add a new entry for every user-facing release. Newest first; keep previous entries.
export const APP_RELEASES: AppRelease[] = [
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
