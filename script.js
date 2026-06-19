"use strict";

// Reemplaza este valor con la URL obtenida al publicar Google Apps Script como Web App.
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyC0EolC5gw90KfVj4MXxhZMp3ZlYCcgol7BIx9I_il4ERBk9YS1YZN1BVCYbaiznR-TA/exec";
const COMPANY_WHATSAPP = "50364353296";

const form = document.querySelector("#shipping-form");
const orderInput = document.querySelector("#order-number");
const formStatus = document.querySelector("#form-status");
const submitButton = form.querySelector(".submit-button");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const header = document.querySelector(".site-header");
const modal = document.querySelector("#success-modal");

const requiredFields = {
  client: {
    element: document.querySelector("#client"),
    message: "Ingresá el nombre y apellido del cliente."
  },
  phone: {
    element: document.querySelector("#phone"),
    message: "Ingresá un número de teléfono válido.",
    validate: (value) => /^[\d\s()+-]{8,18}$/.test(value)
  },
  address: {
    element: document.querySelector("#address"),
    message: "Ingresá la dirección completa de entrega.",
    validate: (value) => value.length >= 8
  },
  schedule: {
    element: document.querySelector("#schedule"),
    message: "Seleccioná un horario de entrega."
  }
};

function refreshOrderNumber() {
  orderInput.value = "Se asignará al registrar";
}

function setFieldError(fieldName, message = "") {
  const config = requiredFields[fieldName];
  const fieldContainer = config.element.closest(".field");
  const errorElement = document.querySelector(`#${fieldName}-error`);
  const hasError = Boolean(message);

  fieldContainer.classList.toggle("invalid", hasError);
  config.element.setAttribute("aria-invalid", String(hasError));
  errorElement.textContent = message;
}

function validateField(fieldName) {
  const config = requiredFields[fieldName];
  const value = config.element.value.trim();
  const isValid = Boolean(value) && (!config.validate || config.validate(value));
  setFieldError(fieldName, isValid ? "" : config.message);
  return isValid;
}

function validateForm() {
  return Object.keys(requiredFields).map(validateField).every(Boolean);
}

function setFormStatus(message = "", type = "") {
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`.trim();
}

function setLoading(isLoading) {
  submitButton.classList.toggle("loading", isLoading);
  submitButton.disabled = isLoading;
  submitButton.setAttribute("aria-busy", String(isLoading));
}

function collectFormData() {
  const data = new FormData(form);
  return {
    // El correlativo real RM-0001, RM-0002, etc. se genera en Google Apps Script
    // para evitar números duplicados si dos clientes envían al mismo tiempo.
    orderNumber: "",
    client: data.get("client").trim(),
    phone: data.get("phone").trim(),
    address: data.get("address").trim(),
    schedule: data.get("schedule"),
    specifications: data.get("specifications").trim(),
    status: "Recibido"
  };
}

function createWhatsAppUrl(data) {
  const message = [
    "Hola R&M Quality Service, deseo confirmar esta solicitud de envío:",
    "",
    `*Orden:* ${data.orderNumber}`,
    `*Cliente:* ${data.client}`,
    `*Teléfono:* ${data.phone}`,
    `*Dirección:* ${data.address}`,
    `*Horario:* ${data.schedule}`,
    `*Especificaciones:* ${data.specifications || "Sin especificaciones"}`
  ].join("\n");

  return `https://wa.me/${COMPANY_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function openSuccessModal(data) {
  document.querySelector("#confirmed-order").textContent = data.orderNumber;
  document.querySelector("#confirmation-whatsapp").href = createWhatsAppUrl(data);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.querySelector(".modal-close").focus();
}

function closeSuccessModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  document.querySelector("#client").focus();
}

async function submitRequest(data) {
  if (GOOGLE_SCRIPT_URL.includes("PEGAR_AQUI")) {
    throw new Error("La integración aún no está configurada. Pegá la URL del Web App en script.js.");
  }

  // text/plain evita una solicitud CORS preflight y Apps Script procesa el JSON normalmente.
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(data),
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error("No fue posible registrar la solicitud. Intentá nuevamente.");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || "Google Sheets no confirmó el registro.");
  }

  return result;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormStatus();

  if (!validateForm()) {
    setFormStatus("Revisá los campos marcados antes de enviar.", "error");
    form.querySelector(".invalid input, .invalid textarea, .invalid select")?.focus();
    return;
  }

  const requestData = collectFormData();
  setLoading(true);

  try {
    const result = await submitRequest(requestData);
    requestData.orderNumber = result.orderNumber || "RM-0000";
    setFormStatus("Tu solicitud fue registrada correctamente.", "success");
    openSuccessModal(requestData);
    form.reset();
    refreshOrderNumber();
  } catch (error) {
    setFormStatus(error.message || "Ocurrió un error inesperado. Intentá nuevamente.", "error");
  } finally {
    setLoading(false);
  }
});

Object.entries(requiredFields).forEach(([name, config]) => {
  config.element.addEventListener("blur", () => validateField(name));
  config.element.addEventListener("input", () => {
    if (config.element.closest(".field").classList.contains("invalid")) validateField(name);
  });
  config.element.addEventListener("change", () => {
    if (config.element.closest(".field").classList.contains("invalid")) validateField(name);
  });
});

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.classList.toggle("active", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  document.body.classList.toggle("menu-open", isOpen);
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  });
});

document.querySelectorAll("[data-close-modal]").forEach((element) => {
  element.addEventListener("click", closeSuccessModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("open")) closeSuccessModal();
});

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 18);
}, { passive: true });

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
refreshOrderNumber();
