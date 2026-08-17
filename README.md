# ⛽ EFI DATA OIL — Sistema de Gestión de Compras y Precios de Combustibles

Plataforma integral web para la gestión diaria de compras, formulación de precios de venta, postes públicos, matriz de tarifas comerciales y exportación directa al sistema **EFI DATA OIL**.

---

## 🔑 Credenciales de Acceso por Defecto

| Rol | Correo Electrónico | Contraseña |
| :--- | :--- | :--- |
| **Administrador Principal** | `admin@efidataoil.com` | `admin123` |
| **Compañero 1 (Compras)** | `compras@efidataoil.com` | `admin123` |
| **Compañeros 2 y 3 (EFI)** | `efi@efidataoil.com` | `admin123` |

---

## 📋 Módulos del Sistema

1. **📊 Vista Ejecutiva (Dashboard):**
   - KPIs de precio de compra diario, evolución histórica de los últimos 8 días, márgenes medios globales y ranking de estaciones más rentables.
2. **📝 Gestión de Compras (Compañero 1):**
   - Edición de precios de compra en Estaciones Propias (`N2:U21`) y Colaboradoras (`N23:U58`).
   - Botón 1-Click para trasladar precios de la Columna P a la Columna O (referencia del día anterior).
   - Desglose de costos (Porte, CLH, Pase, Financiación) y cálculo automático del costo total y precio de venta resultante (Columna K).
3. **🛡️ Validación & Exportación EFI (Compañeros 2 y 3):**
   - Formulación automática de proveedores (`NIEVES ÷ 1.21`, `PETROMIRALLES ÷ 1.21`, `VALCARCE`).
   - Carga de precios de las 13 Estaciones Colaboradoras Fijas en Columna J (`Z.FRANCA`, `BENAVENTE`, `IRUN ZAISA III`, etc.).
   - Generación y descarga directa del archivo CSV `IMPORTACION` listo para alimentar EFI DATA OIL.
   - Generador automático de mensajes para grupos de WhatsApp.
4. **⛽ Postes Públicos & Combustibles Especiales:**
   - Postes de estaciones propias (`B2:F30`) para Gasóleo A y Gasolina 95.
   - Cálculo automático de **GOA Premium** (`GOA + 0.04 €/L`).
   - Combustibles especiales: **HVO** (`B37:F40`), **Gasóleo B** (`B43:F47`) y **AdBlue** (`H62:K73`).
5. **📑 Sábana de Precios & Emisión de PDFs:**
   - Visualización de la matriz de tarifas comerciales (T12, T18, T24, T36, T40, ECO, DORADO, etc.).
   - Filtros de impuestos: Solo Con IVA, Solo Sin IVA o Vista Dual.
   - Emisión / impresión limpia de reportes en PDF por estación para enviar a clientes.
6. **👥 Gestión de Usuarios:**
   - Crear, consultar y eliminar usuarios con roles asignados.
7. **📖 Instrucciones Interactivas Integradas:**
   - Sección interactiva en la propia app con manual operativo, fórmulas y guía de despliegue.

---

## 🚀 Despliegue en Easypanel (Paso a Paso)

### Paso 1: Subir el proyecto a GitHub
```bash
git init
git add .
git commit -m "Deploy EFI DATA OIL"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### Paso 2: Crear el servicio en Easypanel
1. Entra a tu Easypanel y crea un proyecto llamado **`efi-data-oil`**.
2. Haz clic en **`+ Service`** &rarr; selecciona **`App`**.
3. Nómbralo: **`keytber-app`**.

### Paso 3: Configurar el origen (Source)
- **Source**: GitHub
- **Repository**: Selecciona tu repositorio
- **Branch**: `main`
- **Build Type**: `Dockerfile`
- **Dockerfile Path**: `Dockerfile`

### Paso 4: Variables de Entorno (Environment)
Copia y pega las siguientes variables:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=file:./dev.db
NEXT_TELEMETRY_DISABLED=1
SECRET_KEY=efi-data-oil-secure-token-2026
```

### Paso 5: Dominios y Puertos
- **Port**: `3000`
- **Domains**: Configura tu dominio o subdominio (Easypanel añadirá HTTPS automáticamente).

### Paso 6: Desplegar
Haz clic en **`Deploy`** y en pocos segundos la aplicación estará en línea y operativa.

---

## 💻 Ejecución Local

```bash
# Instalar dependencias
npm install

# Construir e iniciar
npm run build
npm run start
```
Acceso en el navegador: [http://localhost:3000](http://localhost:3000)
