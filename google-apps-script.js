/**
 * R&M Quality Service - Google Apps Script
 *
 * Hay que pegar este código en Extensiones > Apps Script dentro de tu Google Sheet.
 * El script crea automáticamente una pestaña mensual, por ejemplo: JULIO 2026.
 */

const HEADERS = [
  "N° DE ORDEN",
  "FECHA DE REGISTRO",
  "HORA DE REGISTRO",
  "FECHA DE ENVIO",
  "CLIENTE",
  "TELEFONO / WHATSAPP",
  "DIRECCION DE ENTREGA",
  "HORARIO",
  "ESPECIFICACIONES O COMENTARIOS",
  "ESTADO"
];

const STATUS_OPTIONS = [
  "Recibido",
  "Confirmado",
  "Recolectado",
  "En ruta",
  "Entregado",
  "No entregado",
  "Cancelado"
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
    const now = new Date();
    const timezone = spreadsheet.getSpreadsheetTimeZone() || "America/El_Salvador";
    const deliveryDate = parseDeliveryDate(data.deliveryDate);
    const sheet = getMonthlySheet(spreadsheet, deliveryDate, timezone);
    const orderNumber = createSequentialOrderNumber(spreadsheet);

    sheet.appendRow([
      orderNumber,
      Utilities.formatDate(now, timezone, "dd/MM/yyyy"),
      Utilities.formatDate(now, timezone, "hh:mm:ss a"),
      Utilities.formatDate(deliveryDate, timezone, "dd/MM/yyyy"),
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
  const required = ["client", "phone", "address", "deliveryDate", "schedule"];
  const missing = required.filter(function (field) {
    return !data[field] || String(data[field]).trim() === "";
  });

  if (missing.length) {
    throw new Error("Faltan campos obligatorios: " + missing.join(", "));
  }

  parseDeliveryDate(data.deliveryDate);
}

function parseDeliveryDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw new Error("La fecha de envío no tiene un formato válido.");
  }

  const parts = String(value).split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error("La fecha de envío no es válida.");
  }

  return date;
}

function ensureHeaders(sheet) {
  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const headersMatch = HEADERS.every(function (header, index) {
    return currentHeaders[index] === header;
  });

  if (!headersMatch) {
    const sheetHasData = sheet.getLastRow() > 1;
    const headerRowIsEmpty = currentHeaders.every(function (value) {
      return value === "";
    });

    // Para hojas nuevas normales, el script puede crear encabezados.
    // Para Google Tables con columnas tipadas, evitamos sobrescribir encabezados
    // porque puede causar: "This operation is not allowed on cells in typed columns".
    if (!sheetHasData && headerRowIsEmpty) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setFontWeight("bold")
        .setBackground("#3B2CE2")
        .setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
      return;
    }

    throw new Error(
      "Los encabezados de la hoja no coinciden con el orden esperado. Revisá que la fila 1 tenga: " +
      HEADERS.join(" | ")
    );
  }
}

function getMonthlySheet(spreadsheet, date, timezone) {
  const sheetName = getMonthlySheetName(date, timezone);
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  ensureHeaders(sheet);
  sheet.autoResizeColumns(1, HEADERS.length);

  return sheet;
}

function getMonthlySheetName(date, timezone) {
  const monthNumber = Number(Utilities.formatDate(date, timezone, "M"));
  const year = Utilities.formatDate(date, timezone, "yyyy");
  const months = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE"
  ];

  return months[monthNumber - 1] + " " + year;
}

function createSequentialOrderNumber(spreadsheet) {
  const sheets = spreadsheet.getSheets();
  let highestNumber = 0;

  sheets.forEach(function (sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;

    const orderValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();

    orderValues.forEach(function (value) {
      const match = String(value).match(/^RM-(\d+)$/);
      if (match) {
        highestNumber = Math.max(highestNumber, Number(match[1]));
      }
    });
  });

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
  const timezone = spreadsheet.getSpreadsheetTimeZone() || "America/El_Salvador";
  getMonthlySheet(spreadsheet, new Date(), timezone);
}
