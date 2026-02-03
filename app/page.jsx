"use client";

import Image from "next/image";
import { useMemo, useState, useRef, useEffect } from "react";

const GOOGLE_FORM_EMBED_URL = "https://docs.google.com/forms/d/e/1FAIpQLSf-donb7o4oAWk40ecIzNdnLqPioea2EXLQ8H13GitEe5fXeQ/viewform?embedded=true";
const GOOGLE_FORM_DIRECT_URL = "https://docs.google.com/forms/d/e/1FAIpQLSf-donb7o4oAWk40ecIzNdnLqPioea2EXLQ8H13GitEe5fXeQ/viewform";

const BIZUM_NUMBER = "614242716";
const BIZUM_AMOUNT = "6€";
/* ---------- helpers ---------- */
function buildConcept(name) {
  if (name && name.trim().length > 1) return `IA 14FEB + ${name.trim()}`;
  return "IA 14FEB + Nombre";
}

function sanitizePhone(raw) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "";
  if (digits.length === 9) return "34" + digits; // asume España sin prefijo
  return digits;
}

async function callChatApi(messages) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data?.reply?.trim() || "Sin respuesta, prueba de nuevo.";
}

async function sendWhatsAppMessage(to, body) {
  const res = await fetch("/api/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WHAPI error: ${res.status} ${text}`);
  }
  return res.json();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
}


export default function Home() {
  // 1. Refs
  const chatRef = useRef(null);
  const fabRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 2. States
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bizumName, setBizumName] = useState("");
  const [bizumPhone, setBizumPhone] = useState("");
  const [bizumStatus, setBizumStatus] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatStatus, setChatStatus] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "¡Hola! Soy Nexus-1. Estoy procesando datos para ayudarte a optimizar tu tiempo. ¿Quieres saber cómo la IA va a transformar tu negocio o tienes dudas sobre nuestro evento en Almuñécar?",
    },
  ]);

  // 3. Memos
  const bizumConcept = useMemo(() => buildConcept(bizumName), [bizumName]);
  const bizumQr = useMemo(() => {
    const concept = buildConcept(bizumName);
    return `https://quickchart.io/qr?text=Bizum%20${BIZUM_NUMBER}%20%7C%20${encodeURIComponent(BIZUM_AMOUNT)}%20%7C%20${encodeURIComponent(concept)}`;
  }, [bizumName]);

  // 4. Effects
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chatOpen) scrollToBottom();
  }, [messages, chatOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        chatOpen &&
        chatRef.current &&
        !chatRef.current.contains(event.target) &&
        fabRef.current &&
        !fabRef.current.contains(event.target)
      ) {
        setChatOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside, { passive: true });
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [chatOpen]);

  const toggleChat = (open) => {
    const next = typeof open === "boolean" ? open : !chatOpen;
    setChatOpen(next);
  };

  const handleFabClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleChat();
  };

  const handleCloseClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleChat(false);
  };

  const handleBizumOpen = () => {
    const msg = `Pago Bizum IA Sin Líos: ${BIZUM_AMOUNT}\nNúmero: ${BIZUM_NUMBER}\nConcepto: ${bizumConcept}`;
    window.open(`https://wa.me/34${BIZUM_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    setBizumStatus("Si Bizum no se abre, usa tu app y copia los datos.");
  };

  const handleBizumCopy = async () => {
    const text = [
      "Pago Bizum IA Sin Líos",
      `Importe: ${BIZUM_AMOUNT}`,
      `Número Bizum: ${BIZUM_NUMBER}`,
      `Concepto: ${bizumConcept}`,
      "Confirma enviando el justificante a WhatsApp 614 242 716.",
    ].join("\n");
    const ok = await copyToClipboard(text);
    setBizumStatus(ok ? "Datos copiados. Ábrelos en tu app Bizum." : "No pude copiar. Hazlo manualmente.");
  };

  const handleBizumSend = async () => {
    if (!bizumPhone) {
      setBizumStatus("Escribe tu WhatsApp para mandarte las instrucciones.");
      return;
    }
    const to = sanitizePhone(bizumPhone);
    if (!to) {
      setBizumStatus("Añade prefijo (ej. 34...) y solo números.");
      return;
    }
    const body = [
      "👋 Hola, aquí van los datos para tu plaza IA Sin Líos:",
      `• Importe: ${BIZUM_AMOUNT}`,
      `• Bizum: ${BIZUM_NUMBER}`,
      `• Concepto: ${bizumConcept}`,
      "Tras pagar, responde a este WhatsApp con el justificante para confirmar la plaza. ¡Gracias!",
    ].join("\n");

    setBizumStatus("Enviando por WhatsApp...");
    try {
      await sendWhatsAppMessage(to, body);
      setBizumStatus("Listo. Revisa tu WhatsApp (puede tardar unos segundos).");
    } catch (err) {
      console.error(err);
      setBizumStatus("No pude enviarlo. Intenta de nuevo o escribe al 614 242 716.");
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatBusy) return;
    const text = chatInput.trim();
    setChatInput("");
    setChatBusy(true);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setChatStatus("Pensando...");

    const history = [
      ...messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: text },
    ];

    try {
      const reply = await callChatApi(history);
      setMessages((prev) => [...prev, { role: "bot", text: reply }]);
      setChatStatus("");
    } catch (err) {
      console.error(err);
      setChatStatus("No pude responder ahora. Intenta de nuevo en unos segundos.");
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Tuvimos un problema técnico. ¿Puedes intentarlo otra vez?" },
      ]);
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <>
      <a className="skip" href="#reserva">
        Saltar al formulario
      </a>

      <header className="topbar" id="top">
        <div className="container topbar__inner">
          <div className="brand">
            <Image className="brand__logo" src="/assets/tecrural-official-logo.jpg" alt="TecRural" width={38} height={38} priority />
            <div className="brand__text">
              <div className="brand__name">TecRural</div>
              <div className="brand__sub">con FidesDigital</div>
            </div>
          </div>

          <nav className="nav">
            <a href="#beneficios">Qué te llevas</a>
            <a href="#agenda">Agenda</a>
            <a href="#lugar">Lugar</a>
            <a href="#reserva" className="btn btn--small">
              Reservar
            </a>
          </nav>

          <button
            className="hamburger"
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
            aria-controls="mobileMenu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        <div className="mobileMenu" id="mobileMenu" style={{ display: mobileOpen ? 'block' : 'none' }}>
          <div className="container mobileMenu__inner">
            <a href="#beneficios" className="mobileMenu__link" onClick={() => setMobileOpen(false)}>
              Qué te llevas
            </a>
            <a href="#agenda" className="mobileMenu__link" onClick={() => setMobileOpen(false)}>
              Agenda
            </a>
            <a href="#lugar" className="mobileMenu__link" onClick={() => setMobileOpen(false)}>
              Lugar
            </a>
            <a href="#reserva" className="btn btn--full" onClick={() => setMobileOpen(false)}>
              Reservar plaza
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="container hero__grid">
            <div className="hero__copy">
              <div className="pill">
                <span className="pill__dot" aria-hidden="true"></span>
                Charla práctica en Almuñécar · plazas limitadas
              </div>

              <h1>
                De, no tengo tiempo a, lo tengo hecho:
                <br />
                IA para la familia y el trabajo.
              </h1>

              <p className="lead">
                No te quedes atrás: aprende a integrar la IA en tu vida diaria para competir con ventaja. Sin tecnicismos.
              </p>

              <div className="hero__benefits">
                <div className="benefit">
                  <div className="benefit__icon">⚙️</div>
                  <div className="benefit__text">
                    La IA no te quitará tu puesto de trabajo, lo hará alguien que sepa usarla; aprende a ser esa persona imprescindible y blinda tu futuro hoy mismo.
                  </div>
                </div>
                <div className="benefit">
                  <div className="benefit__icon">🛡️</div>
                  <div className="benefit__text">
                    ¿Te falta tiempo libre? usando la IA conseguirás hasta un 40% más.
                  </div>
                </div>
                <div className="benefit">
                  <div className="benefit__icon">📱</div>
                  <div className="benefit__text">
                    No necesitas ser informático, solo necesitas saber utilizar tu móvil, que se convertirá en tu mejor ayudante para todo.
                  </div>
                </div>
              </div>

              <h2 className="hero__subtitle">Curso de Introducción a la Inteligencia Artificial</h2>

              <div className="meta">
                <div className="meta__item">
                  <span className="meta__icon">📍</span>
                  <span>
                    <strong>Academia MR.C</strong>
                  </span>
                </div>
                <div className="meta__item">
                  <span className="meta__icon">📅</span>
                  <span>
                    <strong>14 febrero 2026</strong>
                  </span>
                </div>
                <div className="meta__item">
                  <span className="meta__icon">🎟</span>
                  <span>
                    <strong>6€, plazas limitadas</strong>
                  </span>
                </div>
              </div>

              <div className="cta">
                <a className="btn" href="#reserva">
                  Reservar plaza (6€)
                </a>
                <a className="btn btn--ghost" href="#agenda">
                  Ver agenda
                </a>
              </div>

              <div className="trust">
                <div className="trust__item">✅ Confirmación por WhatsApp en &lt; 24h</div>
                <div className="trust__item">✅ Solo necesitas móvil</div>
                <div className="trust__item">✅ Cero complicaciones</div>
              </div>
            </div>

            <aside className="hero__image-container">
              <Image
                src="/assets/hero-image.png"
                alt="Profesionales usando IA"
                className="hero__image-diagonal"
                width={420}
                height={420}
                priority
              />
              <div className="hero__ai-badge">
                <span className="ai-badge__icon">🤖</span>
                <span className="ai-badge__text">AI</span>
              </div>
            </aside>
          </div>
        </section>

        {/* BENEFICIOS */}
        <section className="section section--dark" id="beneficios">
          <div className="container">
            <h2>Qué te llevas (sin humo)</h2>
            <p className="section__lead">
              Saldrás con atajos listos para tu caso: negocio, trabajo por encargo o casa. Tú mandas.
            </p>

            <div className="grid3">
              <div className="feature">
                <div className="feature__icon">💬</div>
                <h3>Mensajes en 1 minuto</h3>
                <p>Respuestas para WhatsApp, email y reservas, con tono cercano y profesional.</p>
              </div>
              <div className="feature">
                <div className="feature__icon">⭐</div>
                <h3>Reseñas sin estrés</h3>
                <p>Contesta reseñas buenas y malas de forma elegante, rápida y sin líos.</p>
              </div>
              <div className="feature">
                <div className="feature__icon">📣</div>
                <h3>Carteles y posts</h3>
                <p>Textos listos para redes: menú del día, promociones, horarios y eventos.</p>
              </div>
              <div className="feature">
                <div className="feature__icon">🗂️</div>
                <h3>Organización diaria</h3>
                <p>Planifica tareas, compras, menús y semanas de trabajo en minutos.</p>
              </div>
              <div className="feature">
                <div className="feature__icon">🧠</div>
                <h3>Que “hable como tú”</h3>
                <p>Aprendes a darle contexto para que escriba con tu estilo, sin sonar “robot”.</p>
              </div>
              <div className="feature">
                <div className="feature__icon">🛡️</div>
                <h3>Uso seguro</h3>
                <p>Qué sí conviene poner y qué no, para ir con tranquilidad.</p>
              </div>
            </div>


          </div>
        </section>

        {/* PARA QUIÉN */}
        <section className="section section--dark" id="paraquien">
          <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Para quién es</h2>

            <div className="grid2">
              <div className="panel">
                <h3>Es para ti si…</h3>
                <ul className="list">
                  <li>Tienes bar/restaurante, alojamiento, tienda o servicio turístico.</li>
                  <li>Eres autónomo y haces de administrativo, comercial y experto a la vez.</li>
                  <li>En casa quieres organizarte y ahorrar tiempo sin complicarte.</li>
                </ul>
              </div>
              <div className="panel panel--outline">
                <h3>No es para ti si…</h3>
                <ul className="list">
                  <li>Buscas temas técnicos avanzados o programación.</li>
                  <li>Quieres teoría sin aplicación práctica.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* PONENTE */}
        <section className="section section--dark" id="ponente">
          <div className="container">
            <div className="panel panel--highlight">
              <h2>¿Quién imparte la charla?</h2>
              <p className="lead" style={{ marginBottom: '24px' }}>
                Soy <strong>Manuel Carrasco García</strong>. Además de la formación, desarrollo dos proyectos aplicados para el día a día y para pequeños negocios:
              </p>

              <div className="grid2">
                <div className="feature">
                  <div className="feature__icon" style={{ background: 'transparent', overflow: 'hidden', padding: '0' }}>
                    <Image src="/assets/tecrural-official-logo.jpg" alt="Logo TecRural" width={48} height={48} style={{ objectFit: 'cover' }} />
                  </div>
                  <h3>TecRural</h3>
                  <p>Soluciones prácticas para agricultura y ganaderia (organización, avisos, control y ahorro de tiempo en tareas repetitivas).</p>
                </div>
                <div className="feature">
                  <div className="feature__icon" style={{ background: 'transparent', overflow: 'hidden', padding: '0' }}>
                    <Image src="/assets/fidesdigital-logo.png" alt="Logo FidesDigital" width={48} height={48} style={{ objectFit: 'contain' }} />
                  </div>
                  <h3>FidesDigital</h3>
                  <p>Implementa aplicaciones web para el uso religioso y eclesiastico (textos, carteles, organización y atención al cliente).</p>
                </div>
              </div>

              <div className="divider" style={{ opacity: '0.2', margin: '30px 0' }}></div>

              <p className="lead" style={{ fontWeight: '700', color: '#fff' }}>
                Esta charla no es teoría: está pensada para que salgas con ideas y plantillas listas para usar en tu trabajo o en casa.
              </p>
              <p className="muted" style={{ fontSize: '15px' }}>
                (En Almuñécar lo que importa es que funcione y te ahorre tiempo).
              </p>
            </div>
          </div>
        </section>

        {/* AGENDA */}
        <section className="section section--dark" id="agenda">
          <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Agenda (60 min + tiempo extra)</h2>
            <p className="section__lead" style={{ textAlign: 'center', margin: '0 auto 30px' }}>Formato directo: entender, verlo funcionar y aplicarlo a tu caso.</p>

            <ol className="timeline">
              <li className="timeline__item">
                <div className="timeline__time">10 min</div>
                <div className="timeline__content">
                  <h3>Entender sin miedo</h3>
                  <p>Mitos vs realidad y los atajos básicos que te ahorrarán tiempo desde el primer día.</p>
                </div>
              </li>
              <li className="timeline__item">
                <div className="timeline__time">35 min</div>
                <div className="timeline__content">
                  <h3>Casos reales (Almuñécar)</h3>
                  <p>Veremos cómo responder mensajes y reseñas, y crear carteles o posts en segundos.</p>
                </div>
              </li>
              <li className="timeline__item">
                <div className="timeline__time">15 min</div>
                <div className="timeline__content">
                  <h3>Mini‑taller: tu caso</h3>
                  <p>Eliges un problema real y vemos cómo lo resolvería la IA con un ejemplo práctico.</p>
                </div>
              </li>
              <li className="timeline__item">
                <div className="timeline__time">🔥</div>
                <div className="timeline__content">
                  <h3>Q&amp;A + Propuesta</h3>
                  <p>Tiempo extra para resolver tus dudas específicas y cómo seguir avanzando sin líos.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* LUGAR */}
        <section className="section section--dark" id="lugar">
          <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Lugar</h2>

            <div className="place">
              <div className="place__info">
                <h3>Academia MR.C</h3>
                <p className="leadSmall">Calle Tetuán, 20 · Almuñécar</p>

                <div className="place__badges">
                  <span className="badge">📱 Solo móvil</span>
                  <span className="badge">🕦 12:00</span>
                  <span className="badge">⏱ 60 min + Q&amp;A</span>
                  <span className="badge">💫 6€</span>
                </div>

                <p className="note">Recomendación: llega 10 minutos antes para entrar y sentarte con calma.</p>

                <a className="btn" href="#reserva">
                  Reservar plaza
                </a>
              </div>

              <div className="place__map">
                <iframe
                  title="Mapa: Academia MR.C"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src="https://www.google.com/maps?q=Calle%20Tetuan%2020%20Almu%C3%B1%C3%A9car&output=embed"
                ></iframe>
              </div>
            </div>
          </div>
        </section>

        {/* RESERVA */}
        <section className="section section--dark" id="reserva">
          <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Reserva tu plaza</h2>
            <p className="section__lead" style={{ textAlign: 'center', margin: '0 auto 30px' }}>Completa el formulario (30 segundos). Te confirmamos por WhatsApp en menos de 24h.</p>

            <div className="reserveGrid">
              <div className="reserveCard">
                <h3>Pago y confirmación</h3>

                <div className="pay pay--boxed">
                  <div className="pay__row">
                    <div className="pay__label">Entrada</div>
                    <div className="pay__value">6€</div>
                  </div>
                  <div className="pay__row">
                    <div className="pay__label">Bizum</div>
                    <div className="pay__value">614 242 716</div>
                  </div>
                  <div className="pay__row">
                    <div className="pay__label">Concepto</div>
                    <div className="pay__value">{bizumConcept}</div>
                  </div>

                  <p className="note">
                    La plaza se confirma por orden de pago. Si eliges “pago en mano” en el formulario, te confirmaremos según
                    disponibilidad.
                  </p>
                </div>

                <div className="bizumBox" id="bizumBox">
                  <div className="bizumBox__head">
                    <div>
                      <h4>Pago manual por Bizum</h4>
                      <p className="micro">Sigue estos pasos y luego envía el justificante por WhatsApp para confirmar la plaza.</p>
                    </div>
                    <div className="bizumBadge" aria-hidden="true">
                      Bizum
                    </div>
                  </div>

                  <div className="manualSteps" aria-label="Guía de pago manual">
                    <p className="manualStep">1. Abre Bizum en tu banco y elige “Enviar dinero”.</p>
                    <p className="manualStep">2. Envía <strong>{BIZUM_AMOUNT}</strong> al número <strong>614 242 716</strong>.</p>
                    <p className="manualStep">3. Escribe el concepto: <strong>{bizumConcept}</strong>.</p>
                    <p className="manualStep">4. Envíanos el justificante por WhatsApp para confirmar tu plaza.</p>
                  </div>

                  <div className="bizumFields">
                    <label className="field">
                      <span>Tu nombre</span>
                      <input
                        type="text"
                        id="bizumName"
                        placeholder="Ej. Ana López"
                        autoComplete="name"
                        value={bizumName}
                        onChange={(e) => setBizumName(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>WhatsApp (con prefijo)</span>
                      <input
                        type="tel"
                        id="bizumPhone"
                        placeholder="34XXXXXXXXX"
                        autoComplete="tel"
                        value={bizumPhone}
                        onChange={(e) => setBizumPhone(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="bizumData">
                    <div>
                      <div className="micro">Importe</div>
                      <div className="bizumValue" id="bizumAmount">
                        {BIZUM_AMOUNT}
                      </div>
                    </div>
                    <div>
                      <div className="micro">Número Bizum</div>
                      <div className="bizumValue" id="bizumNumber">
                        614 242 716
                      </div>
                    </div>
                    <div>
                      <div className="micro">Concepto</div>
                      <div className="bizumValue" id="bizumConcept">
                        {bizumConcept}
                      </div>
                    </div>
                  </div>

                  <div className="bizumActions">
                    <button className="btn btn--small" id="bizumPayBtn" type="button" onClick={handleBizumOpen}>
                      Abrir WhatsApp con datos
                    </button>
                    <button className="btn btn--ghost btn--small" id="bizumCopyBtn" type="button" onClick={handleBizumCopy}>
                      Copiar datos de pago
                    </button>
                  </div>

                  <button className="btn btn--full btn--small" id="bizumSendBtn" type="button" onClick={handleBizumSend}>
                    Enviarme recordatorio por WhatsApp
                  </button>
                  <div className="micro">Este mensaje es solo un recordatorio: el pago se hace en tu app bancaria.</div>

                  <div className="micro" id="bizumStatus">
                    {bizumStatus}
                  </div>
                </div>

                <div className="contactBox">
                  <div>
                    <strong>Contacto</strong>
                  </div>
                  <div>
                    WhatsApp:{" "}
                    <a href="https://wa.me/34614242716" target="_blank" rel="noopener">
                      614 242 716
                    </a>
                  </div>
                  <div>
                    Email: <a href="mailto:mcgnexus@gmail.com">mcgnexus@gmail.com</a>
                  </div>
                </div>

                <div className="mini">Al final compartiré una propuesta opcional para quien quiera seguir avanzando. Sin compromiso.</div>
              </div>

              <div className="formCard">
                <h3>Formulario</h3>

                <div className="formWrap" id="formWrap">
                  {GOOGLE_FORM_EMBED_URL ? (
                    <iframe title="Formulario de reserva" loading="lazy" src={GOOGLE_FORM_EMBED_URL}></iframe>
                  ) : (
                    <div className="formPlaceholder">
                      <p>
                        <strong>Formulario pendiente de enlazar</strong>
                      </p>
                      <p>
                        Pega tu enlace de inserción en la constante <span className="mono">GOOGLE_FORM_EMBED_URL</span> al inicio del
                        archivo.
                      </p>
                    </div>
                  )}
                </div>

                {GOOGLE_FORM_DIRECT_URL && (
                  <p className="micro">
                    Si prefieres, abre el formulario en una pestaña:{" "}
                    <a href={GOOGLE_FORM_DIRECT_URL} target="_blank" rel="noopener">
                      Abrir formulario
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="chatFab" id="chatFab" ref={fabRef} aria-expanded={chatOpen} onClick={handleFabClick} style={{ bottom: '32px', right: '32px' }}>
        Chat IA
      </div>

      <section
        className="chatWidget"
        id="chatWidget"
        ref={chatRef}
        style={{ display: chatOpen ? "flex" : "none" }}
        hidden={!chatOpen}
        aria-live="polite"
      >
        <div className="chatHeader">
          <div>
            <div className="chatTitle">Asistente IA (Nexus-1)</div>
            <div className="chatSub">En línea · Responde al instante</div>
          </div>
          <button className="chatClose" id="chatClose" aria-label="Cerrar chat" onClick={handleCloseClick}>
            ×
          </button>
        </div>

        <div className="chatMessages" id="chatMessages">
          {messages.map((m, idx) => (
            <div key={idx} className={`msg msg--${m.role === "user" ? "user" : "bot"}`}>
              <span className="msgText">{m.text}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="chatForm" id="chatForm" onSubmit={handleChatSubmit}>
          <input
            type="text"
            id="chatInput"
            placeholder="Escribe tu duda..."
            autoComplete="off"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button className="btn btn--small" type="submit" disabled={chatBusy}>
            {chatBusy ? "..." : "Enviar"}
          </button>
        </form>

        <div className="chatStatus">
          {chatStatus}
        </div>
      </section>

      <footer className="footer">
        <div className="container footer__inner">
          <div className="footer__left">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Image className="footer__logo" src="/assets/tecrural-official-logo.jpg" alt="TecRural" width={34} height={34} />
              <Image className="footer__logo" src="/assets/fidesdigital-logo.png" alt="FidesDigital" width={34} height={34} style={{ borderRadius: '6px' }} />
            </div>
            <div>
              <div className="footer__title">TecRural</div>
              <div className="footer__sub">con FidesDigital</div>
            </div>
          </div>

          <div className="footer__right">
            <div>📍 Academia MR.C · Calle Tetuán, 20 · Almuñécar</div>
            <div>
              📧 <a href="mailto:mcgnexus@gmail.com">mcgnexus@gmail.com</a> · 💬{" "}
              <a href="https://wa.me/34614242716" target="_blank" rel="noopener">
                WhatsApp 614 242 716
              </a>
            </div>
            <div className="micro">© 2026 · Todos los derechos reservados</div>
          </div>
        </div>
      </footer>
    </>
  );
}
