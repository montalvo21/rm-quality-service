# R&M Quality Service

Landing page responsive para presentar los servicios de R&M Quality Service y recibir solicitudes de envío en Google Sheets.

## Estructura del proyecto

```txt
rm-quality-service/
├── assets/
│   ├── logo-rm.png
│   └── fonts/
│       ├── AcherusGrotesque-Regular.woff2
│       └── AcherusGrotesque-Bold.woff2
├── index.html
├── styles.css
├── script.js
├── google-apps-script.js
└── README.md
```

## Archivos

- `index.html`: estructura y contenido de la web.
- `styles.css`: diseño responsive, fuente Acherus Grotesque, animaciones y estados visuales.
- `script.js`: navegación, validaciones, envío a Google Sheets y WhatsApp.
- `google-apps-script.js`: código para recibir solicitudes, generar número de orden correlativo y guardar datos en Google Sheets.
- `assets/logo-rm.png`: logo usado en header y footer.
- `assets/fonts/`: carpeta para colocar los archivos de Acherus Grotesque.

## Importante sobre Acherus Grotesque

El CSS ya está preparado para usar Acherus Grotesque con `@font-face`.

Para que se vea correctamente en cualquier computadora o hosting, colocá los archivos de la fuente dentro de:

```txt
assets/fonts/
```

Con estos nombres recomendados:

```txt
AcherusGrotesque-Regular.woff2
AcherusGrotesque-Bold.woff2
```

Si solo tenés `.ttf` o `.woff`, también están contemplados en el CSS con estos nombres:

```txt
AcherusGrotesque-Regular.ttf
AcherusGrotesque-Bold.ttf
AcherusGrotesque-Regular.woff
AcherusGrotesque-Bold.woff
```

Por licencia, los archivos reales de la fuente deben ser proporcionados por el cliente o por quien tenga derecho de uso. Si no se colocan, el navegador usará Poppins/Montserrat como respaldo.

## Probar la web localmente

Por seguridad del navegador, conviene abrirla con un servidor local:

```bash
python3 -m http.server 8000
```

Luego visitá:

```txt
http://localhost:8000
```

Antes de configurar Google Sheets, el formulario mostrará un aviso indicando que falta pegar la URL del Web App. Esto confirma que las validaciones y el flujo del formulario funcionan sin registrar datos por accidente.

## Configurar Google Sheets

1. Creá una hoja nueva en Google Sheets.
2. Cambiá el nombre de una pestaña a `Solicitudes`.
3. Verificá en **Archivo > Configuración** que la zona horaria sea `GMT-06:00` o El Salvador.
4. Abrí **Extensiones > Apps Script**.
5. Borrá el contenido inicial del editor.
6. Copiá y pegá todo el contenido de `google-apps-script.js`.
7. Guardá el proyecto con un nombre como `R&M Solicitudes Web`.
8. En el selector de funciones, elegí `setupSheet` y presioná **Ejecutar**.
9. Aceptá los permisos solicitados por Google. Esta función crea y formatea los encabezados.

La hoja quedará con estas columnas:

| Orden | Fecha de registro | Hora de registro | Cliente | Teléfono / WhatsApp | Dirección | Horario | Especificaciones | Estado |
|---|---|---|---|---|---|---|---|---|

El estado inicial siempre se guarda como `Recibido`.

## Número de orden

El número de orden se genera desde Google Apps Script, no desde el navegador. Esto evita duplicados cuando dos clientes envían solicitudes al mismo tiempo.

Formato actual:

```txt
RM-0001
RM-0002
RM-0003
```

En la web, antes de enviar el formulario, el campo mostrará:

```txt
Se asignará al registrar
```

Cuando Google Sheets confirma el registro, la web recibe el número real y lo muestra en el modal de éxito y en el mensaje de WhatsApp.

## Publicar Apps Script como Web App

1. En Apps Script, hacé clic en **Implementar > Nueva implementación**.
2. En **Seleccionar tipo**, elegí **Aplicación web**.
3. En **Ejecutar como**, seleccioná **Yo**.
4. En **Quién tiene acceso**, seleccioná **Cualquier usuario**.
5. Presioná **Implementar** y autorizá si Google vuelve a solicitarlo.
6. Copiá la URL que termina en `/exec`.

Si después modificás `google-apps-script.js`, publicá una versión nueva desde **Implementar > Administrar implementaciones > Editar > Nueva versión**.

## Conectar la web con Google Sheets

Abrí `script.js` y reemplazá:

```js
const GOOGLE_SCRIPT_URL = "PEGAR_AQUI_URL_DE_GOOGLE_APPS_SCRIPT";
```

por la URL copiada:

```js
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/ID_DE_TU_IMPLEMENTACION/exec";
```

No agregués la URL de edición de Apps Script. Debe ser la URL pública que termina en `/exec`.

## Probar el formulario

1. Recargá la página.
2. Completá los campos obligatorios.
3. Presioná **Enviar solicitud**.
4. Confirmá que aparezca el mensaje de éxito.
5. Revisá que se agregue una fila nueva en la pestaña `Solicitudes`.
6. Confirmá que la columna `Orden` tenga el formato `RM-0001`, `RM-0002`, etc.
7. Probá el botón **Notificar por WhatsApp** del mensaje de confirmación.

## WhatsApp

El número configurado es `+503 6435 3296`. Para cambiarlo, editá esta constante en `script.js`:

```js
const COMPANY_WHATSAPP = "50364353296";
```

Usá solamente números, incluyendo el código de país.

## Publicar en hosting

Este proyecto es estático y puede publicarse en cualquier hosting:

### Netlify

1. Entrá a Netlify y elegí **Add new site > Deploy manually**.
2. Arrastrá la carpeta completa `rm-quality-service`.
3. Netlify publicará la web y mostrará la URL.

### GitHub Pages

1. Subí los archivos a un repositorio de GitHub.
2. Abrí **Settings > Pages**.
3. Elegí la rama principal y la carpeta raíz.
4. Guardá y esperá a que GitHub muestre la URL.

### Hosting tradicional

Subí `index.html`, `styles.css`, `script.js` y la carpeta `assets` a la carpeta pública del hosting, normalmente `public_html`.

`google-apps-script.js` y `README.md` son documentación/configuración y no necesitan publicarse.

## Seguridad y operación

- Google Apps Script valida nuevamente los campos obligatorios.
- Google Apps Script genera el número de orden correlativo.
- Los datos que comienzan con caracteres de fórmula se neutralizan antes de guardarse en Sheets.
- El estado recibido desde el navegador se ignora; Apps Script siempre guarda `Recibido`.
- La hoja operativa no debe compartirse públicamente. El Web App puede recibir solicitudes sin publicar la hoja.
- Para reducir spam en una siguiente fase, se recomienda agregar Cloudflare Turnstile o reCAPTCHA y limitar solicitudes repetidas.
