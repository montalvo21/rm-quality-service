/**
 * R&M Quality Service - Google Apps Script
 *
 * Hay que pegar este código en Extensiones > Apps Script dentro de tu Google Sheet.
 * Cambiá SHEET_NAME si tu pestaña tiene otro nombre.
 */

const SHEET_NAME = "JULIO 01";
const HEADERS = [
  "N° DE ORDEN",
  "CLIENTE",
  "TELEFONO / WHATSAPP",
  "DIRECCION DE ENTREGA",
  "HORARIO",
  "ESPECIFICACIONES O COMENTARIOS",
  "FECHA DE REGISTRO",
  "HORA DE REGISTRO",
  "ESTADO"
];

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    // Evita duplicar correlativos cuando llegan dos solicitudes al mismo tiempo.
    lock.waitLock(10000);

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No se recibieron datos.");
    }

    const data = JSON.parse(e.postData.contents);
    validateRequiredData(data);

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
    }

    ensureHeaders(sheet);

    const now = new Date();
    const timezone = spreadsheet.getSpreadsheetTimeZone() || "America/El_Salvador";
    const orderNumber = createSequentialOrderNumber(sheet);

    sheet.appendRow([
      orderNumber,
      Utilities.formatDate(now, timezone, "dd/MM/yyyy"),
      Utilities.formatDate(now, timezone, "hh:mm:ss a"),
      sanitize(data.client),
      sanitize(data.phone),
      sanitize(data.address),
      sanitize(data.schedule),
      sanitize(data.specifications),
      "Recibido"
    ]);

    return jsonResponse({
      success: true,
      orderNumber: orderNumber,
      message: "Solicitud registrada correctamente."
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.message || "Error al registrar la solicitud."
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (releaseError) {
      // Si el lock no llegó a tomarse, no se requiere acción adicional.
    }
  }
}

function doGet() {
  return jsonResponse({
    success: true,
    service: "R&M Quality Service",
    message: "Web App activo y listo para recibir solicitudes."
  });
}

function validateRequiredData(data) {
  const required = ["client", "phone", "address", "schedule"];
  const missing = required.filter(function (field) {
    return !data[field] || String(data[field]).trim() === "";
  });

  if (missing.length) {
    throw new Error("Faltan campos obligatorios: " + missing.join(", "));
  }
}

function ensureHeaders(sheet) {
  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const headersMatch = HEADERS.every(function (header, index) {
    return currentHeaders[index] === header;
  });

  if (!headersMatch) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#3B2CE2")
      .setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
  }
}

function createSequentialOrderNumber(sheet) {
  const lastRow = sheet.getLastRow();
  let highestNumber = 0;

  if (lastRow > 1) {
    const orderValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();

    orderValues.forEach(function (value) {
      const match = String(value).match(/^RM-(\d+)$/);
      if (match) {
        highestNumber = Math.max(highestNumber, Number(match[1]));
      }
    });
  }

  const nextNumber = highestNumber + 1;
  return "RM-" + String(nextNumber).padStart(4, "0");
}

function sanitize(value) {
  const text = value == null ? "" : String(value).trim();

  // Evita que entradas del formulario se interpreten como fórmulas en Sheets.
  if (/^[=+\-@]/.test(text)) {
    return "'" + text;
  }
  return text;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Ejecutá esta función una vez desde el editor para preparar la hoja.
 * También sirve para comprobar y autorizar el acceso del script.
 */
function setupSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  ensureHeaders(sheet);
  sheet.autoResizeColumns(1, HEADERS.length);
}
