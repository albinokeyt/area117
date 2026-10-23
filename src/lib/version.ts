import { latestRelease } from './releases';
/**
 * Identificador Oficial de Versión de la Aplicación EFI DATA OIL
 * Permite verificar inequívocamente en la cabecera qué compilación está ejecutando el navegador.
 */
export const APP_VERSION = latestRelease.version;
export const APP_BUILD_DATE = '23/10/2026';
export const APP_RELEASE_NAME = latestRelease.title;
export const APP_RELEASE_NOTES = latestRelease.changes.join(' ');
