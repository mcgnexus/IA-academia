/**
 * 1) Pega aquí tu URL de inserción de Google Forms (la del iframe).
 *    Cómo conseguirla:
 *    - Abre tu formulario
 *    - Enviar -> icono "<>" -> Copiar
 *    - Dentro del código, copia el valor del atributo src del iframe
 */
const GOOGLE_FORM_EMBED_URL = ""; // <-- PÉGALO AQUÍ (ej: https://docs.google.com/forms/d/e/.../viewform?embedded=true)

/**
 * 2) (Opcional) Si quieres un enlace directo al formulario para móviles
 *    (por si el iframe no carga bien en algún dispositivo).
 */
const GOOGLE_FORM_DIRECT_URL = ""; // <-- PÉGALO AQUÍ (ej: https://docs.google.com/forms/d/e/.../viewform)

// Datos de pago y APIs
const BIZUM_NUMBER = "614242716";
const BIZUM_AMOUNT = "6€";
const BIZUM_CONCEPT = "IA 14FEB + Nombre";
const CHAT_API_URL = "/api/chat";
const WHATSAPP_API_URL = "/api/whatsapp";

function setFormEmbed() {
  const wrap = document.getElementById("formWrap");
  if (!wrap) return;

  if (!GOOGLE_FORM_EMBED_URL) {
    // Placeholder ya está en el HTML
    return;
  }

  wrap.innerHTML = `
    <iframe
      title="Formulario de reserva"
      loading="lazy"
      src="${GOOGLE_FORM_EMBED_URL}">
    </iframe>
  `;

  if (GOOGLE_FORM_DIRECT_URL) {
    const link = document.createElement("p");
    link.className = "micro";
    link.innerHTML = `Si prefieres, abre el formulario en una pestaña: <a href="${GOOGLE_FORM_DIRECT_URL}" target="_blank" rel="noopener">Abrir formulario</a>`;
    wrap.parentElement.appendChild(link);
  }
}

function setupMobileMenu() {
  const btn = document.querySelector(".hamburger");
  const menu = document.getElementById("mobileMenu");
  if (!btn || !menu) return;

  btn.addEventListener("click", () => {
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!isOpen));
    menu.hidden = isOpen;
  });

  // Cierra el menú al navegar
  menu.addEventListener("click", (e) => {
    const target = e.target;
    if (target && target.matches("a")) {
      btn.setAttribute("aria-expanded", "false");
      menu.hidden = true;
    }
  });
}

function setupRoiCalculator() {
  const minsNow = document.getElementById("minsNow");
  const minsAfter = document.getElementById("minsAfter");
  const hoursSaved = document.getElementById("hoursSaved");
  const calcBtn = document.getElementById("calcBtn");

  if (!minsNow || !minsAfter || !hoursSaved || !calcBtn) return;

  const calc = () => {
    const now = clamp(Number(minsNow.value || 0), 0, 600);
    const after = clamp(Number(minsAfter.value || 0), 0, 600);
    const savedPerDay = Math.max(0, now - after);
    const savedHoursMonth = (savedPerDay * 30) / 60;
    hoursSaved.textContent = savedHoursMonth.toFixed(savedHoursMonth >= 10 ? 0 : 1);
  };

  calcBtn.addEventListener("click", calc);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* ---------- Bizum ---------- */
function setupBizumBox() {
  const nameInput = document.getElementById("bizumName");
  const phoneInput = document.getElementById("bizumPhone");
  const payBtn = document.getElementById("bizumPayBtn");
  const copyBtn = document.getElementById("bizumCopyBtn");
  const sendBtn = document.getElementById("bizumSendBtn");
  const statusEl = document.getElementById("bizumStatus");
  const qrImg = document.getElementById("bizumQrImg");

  if (!payBtn || !copyBtn || !sendBtn) return;

  if (qrImg) {
    const concept = encodeURIComponent(BIZUM_CONCEPT);
    qrImg.src = `https://quickchart.io/qr?text=Bizum%20${BIZUM_NUMBER}%20%7C%20${encodeURIComponent(BIZUM_AMOUNT)}%20%7C%20${concept}`;
  }

  payBtn.addEventListener("click", () => {
    const concept = buildConcept(nameInput?.value);
    const msg = `Pago Bizum IA Sin Líos: ${BIZUM_AMOUNT}\nNúmero: ${BIZUM_NUMBER}\nConcepto: ${concept}`;
    // Abrimos WhatsApp al número de atención con los datos
    window.open(`https://wa.me/34${BIZUM_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    setStatus(statusEl, "Si Bizum no se abre, usa tu app y copia los datos.");
  });

  copyBtn.addEventListener("click", async () => {
    const concept = buildConcept(nameInput?.value);
    const text = `Pago Bizum IA Sin Líos\nImporte: ${BIZUM_AMOUNT}\nNúmero Bizum: ${BIZUM_NUMBER}\nConcepto: ${concept}\nConfirma enviando el justificante a WhatsApp 614 242 716.`;
    const ok = await copyToClipboard(text);
    setStatus(statusEl, ok ? "Datos copiados. Ábrelos en tu app Bizum." : "No pude copiar. Copia manualmente los datos.");
  });

  sendBtn.addEventListener("click", async () => {
    if (!phoneInput || !phoneInput.value) {
      setStatus(statusEl, "Escribe tu WhatsApp para mandarte las instrucciones.");
      phoneInput?.focus();
      return;
    }
    const to = sanitizePhone(phoneInput.value);
    if (!to) {
      setStatus(statusEl, "Añade prefijo (ej. 34...) y solo números.");
      return;
    }
    const concept = buildConcept(nameInput?.value);
    const body = [
      "👋 Hola, aquí van los datos para tu plaza IA Sin Líos:",
      `• Importe: ${BIZUM_AMOUNT}`,
      `• Bizum: ${BIZUM_NUMBER}`,
      `• Concepto: ${concept}`,
      "Tras pagar, responde a este WhatsApp con el justificante para confirmar la plaza. ¡Gracias!"
    ].join("\n");

    setStatus(statusEl, "Enviando por WhatsApp...");
    try {
      await sendWhatsAppMessage(to, body);
      setStatus(statusEl, "Listo. Revisa tu WhatsApp (puede tardar unos segundos).");
    } catch (err) {
      setStatus(statusEl, "No pude enviarlo. Intenta de nuevo o escribe al 614 242 716.");
      console.error(err);
    }
  });
}

/* ---------- Chat IA ---------- */
function setupChatWidget() {
  const fab = document.getElementById("chatFab");
  const widget = document.getElementById("chatWidget");
  const closeBtn = document.getElementById("chatClose");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const messagesEl = document.getElementById("chatMessages");
  const statusEl = document.getElementById("chatStatus");
  const nameInput = document.getElementById("chatName");
  const phoneInput = document.getElementById("chatPhone");

  if (!fab || !widget || !form || !input || !messagesEl) return;

  let history = [];
  let busy = false;

  const toggle = (open) => {
    const isHidden = widget.style.display === "none" || widget.hasAttribute("hidden");
    const willOpen = open ?? isHidden;

    if (willOpen) {
      widget.style.display = "flex";
      widget.removeAttribute("hidden");
    } else {
      widget.style.display = "none";
      widget.setAttribute("hidden", "");
    }

    fab.setAttribute("aria-expanded", String(willOpen));
    if (willOpen && input) input.focus();
  };

  const handleFabClick = (e) => {
    e.stopPropagation();
    toggle();
  };

  const handleCloseClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(false);
  };

  const handleOutsideClick = (e) => {
    const isVisible = widget.style.display === "flex" || (!widget.hasAttribute("hidden") && widget.style.display !== "none");
    if (isVisible && !widget.contains(e.target) && !fab.contains(e.target)) {
      toggle(false);
    }
  };

  fab.addEventListener("click", handleFabClick);
  closeBtn?.addEventListener("click", handleCloseClick);
  document.addEventListener("mousedown", handleOutsideClick, { passive: true });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true;
    appendMessage(messagesEl, text, "user");
    input.value = "";
    setStatus(statusEl, "Pensando...");

    history.push({ role: "user", content: text });

    try {
      const reply = await callChatApi(history);
      history.push({ role: "assistant", content: reply });
      appendMessage(messagesEl, reply, "bot");
      setStatus(statusEl, phoneInput?.value ? "Enviando a tu WhatsApp..." : "");

      if (phoneInput?.value) {
        const to = sanitizePhone(phoneInput.value);
        if (to) {
          const nameLine = nameInput?.value ? `Hola ${nameInput.value},` : "Hola,";
          const body = `${nameLine} aquí tienes la respuesta de la IA:\n\n${reply}\n\nSi necesitas algo más, responde a este WhatsApp.`;
          await sendWhatsAppMessage(to, body);
          setStatus(statusEl, "Respuesta enviada a tu WhatsApp ✅");
        } else {
          setStatus(statusEl, "El WhatsApp no parece válido. Usa prefijo país.");
        }
      } else {
        setStatus(statusEl, "");
      }
    } catch (err) {
      console.error(err);
      setStatus(statusEl, "No pude responder ahora. Intenta de nuevo en unos segundos.");
      appendMessage(messagesEl, "Tuvimos un problema técnico. ¿Puedes intentarlo otra vez?", "bot");
    } finally {
      busy = false;
    }
  });
}

/* ---------- Helpers ---------- */
async function callChatApi(history) {
  const res = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: history
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data?.reply?.trim() || "Sin respuesta, prueba de nuevo.";
}

async function sendWhatsAppMessage(to, body) {
  const res = await fetch(WHATSAPP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ to, body })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WHAPI error: ${res.status} ${text}`);
  }
  return res.json();
}

function appendMessage(container, text, type) {
  const div = document.createElement("div");
  div.className = `msg msg--${type === "user" ? "user" : "bot"}`;

  div.textContent = text;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
}

function sanitizePhone(raw) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "";
  if (digits.length === 9) return "34" + digits; // asume España sin prefijo
  return digits;
}

function buildConcept(name) {
  if (name && name.trim().length > 1) return `IA 14FEB + ${name.trim()}`;
  return "IA 14FEB + Nombre";
}

function setStatus(el, text) {
  if (!el) return;
  el.textContent = text || "";
}

// Init
setFormEmbed();
setupMobileMenu();
setupRoiCalculator();
setupBizumBox();
setupChatWidget();
