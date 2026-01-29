"use client";

import Image from "next/image";
import { useMemo, useState, useRef, useEffect } from "react";

const GOOGLE_FORM_EMBED_URL = "";
const GOOGLE_FORM_DIRECT_URL = "";

const BIZUM_NUMBER = "614242716";
const BIZUM_AMOUNT = "5€";
const BIZUM_CONCEPT = "IA 14FEB + Nombre";
const WHAPI_URL = "https://gate.whapi.cloud/messages/text";
const WHAPI_TOKEN = process.env.NEXT_PUBLIC_WHAPI_TOKEN || "";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-small";
const MISTRAL_API_KEY = process.env.NEXT_PUBLIC_MISTRAL_API_KEY || "";

const systemPrompt =
  "Eres 'Nexus-1', el avanzado asistente de IA de TecRural. Tu misión es demostrar el poder de la inteligencia artificial de forma fascinante pero accesible. Hablas con un tono profesional, innovador y entusiasta. Usa terminología tecnológica moderna (como 'automatización', 'productividad exponencial', 'prompts optimizados') pero asegúrate de que un autónomo o una familia lo entienda. " +
  "Información clave del evento: Nombre: IA Sin Líos. Cuándo: 14/02/2026 a las 11:30. Dónde: Academia MR.C (Almuñécar). Inversión: 5€. " +
  "Destaca que no es teoría, sino un salto tecnológico para su día a día. Puedes dar ejemplos de cómo la IA redacta menús, responde reseñas o planifica semanas en segundos. ¡Haz que sientan que el futuro ya está aquí!";

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [minsNow, setMinsNow] = useState(30);
  const [minsAfter, setMinsAfter] = useState(10);
  const hoursSaved = useMemo(() => {
    const saved = Math.max(0, clamp(minsNow, 0, 600) - clamp(minsAfter, 0, 600));
    return ((saved * 30) / 60).toFixed(((saved * 30) / 60) >= 10 ? 0 : 1);
  }, [minsNow, minsAfter]);

  const [bizumName, setBizumName] = useState("");
  const [bizumPhone, setBizumPhone] = useState("");
  const [bizumStatus, setBizumStatus] = useState("");

  const bizumConcept = useMemo(() => buildConcept(bizumName), [bizumName]);
  const bizumQr = useMemo(() => {
    return `https://quickchart.io/qr?text=Bizum%20${BIZUM_NUMBER}%20%7C%205%E2%82%AC%20%7C%20${encodeURIComponent(bizumConcept)}`;
  }, [bizumConcept]);

  const [chatOpen, setChatOpen] = useState(false);
  const chatRef = useRef(null);
  const fabRef = useRef(null);

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
  const [chatInput, setChatInput] = useState("");
  const [chatName, setChatName] = useState("");
  const [chatPhone, setChatPhone] = useState("");
  const [chatStatus, setChatStatus] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "¡Hola! Soy Nexus-1. Estoy procesando datos para ayudarte a optimizar tu tiempo. ¿Quieres saber cómo la IA va a transformar tu negocio o tienes dudas sobre nuestro evento en Almuñécar?",
    },
  ]);

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
    if (!WHAPI_TOKEN) {
      setBizumStatus("Falta la clave de Whapi. Añádela en .env.local");
      return;
    }
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
    if (!MISTRAL_API_KEY) {
      setChatStatus("Falta la API Key de Mistral. Añádela en .env.local");
      return;
    }
    if (!WHAPI_TOKEN && chatPhone) {
      setChatStatus("Falta la clave de Whapi. Añádela en .env.local o quita el envío a WhatsApp.");
      return;
    }
    if (!chatInput.trim() || chatBusy) return;
    const text = chatInput.trim();
    setChatInput("");
    setChatBusy(true);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setChatStatus("Pensando...");

    const history = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: text },
    ];

    try {
      const reply = await callMistral(history);
      setMessages((prev) => [...prev, { role: "bot", text: reply }]);

      if (chatPhone) {
        setChatStatus("Enviando a tu WhatsApp...");
        const to = sanitizePhone(chatPhone);
        if (to) {
          const nameLine = chatName ? `Hola ${chatName},` : "Hola,";
          const body = `${nameLine} aquí tienes la respuesta de la IA:\n\n${reply}\n\nSi necesitas algo más, responde a este WhatsApp.`;
          await sendWhatsAppMessage(to, body);
          setChatStatus("Respuesta enviada a tu WhatsApp ✅");
        } else {
          setChatStatus("El WhatsApp no parece válido. Usa prefijo país.");
        }
      } else {
        setChatStatus("");
      }
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
            <Image className="brand__logo" src="/assets/tecrural-logo.png" alt="TecRural" width={38} height={38} priority />
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

        <div className="mobileMenu" id="mobileMenu" hidden={!mobileOpen}>
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
                IA Sin Líos
                <br />
                Ahorra tiempo desde hoy
              </h1>

              <p className="lead">
                Para <strong>autónomos</strong>, <strong>pequeños negocios</strong> y <strong>familias</strong>. Sales con
                atajos listos para usar en <strong>mensajes</strong>, <strong>reseñas</strong>,<strong> carteles</strong> y{" "}
                <strong>organización diaria</strong>.
              </p>

              <div className="meta">
                <div className="meta__item">
                  <span className="meta__icon">📅</span>
                  <span>
                    <strong>Sábado 14/02/2026</strong>
                  </span>
                </div>
                <div className="meta__item">
                  <span className="meta__icon">🕦</span>
                  <span>
                    <strong>11:30</strong>
                  </span>
                </div>
                <div className="meta__item">
                  <span className="meta__icon">⏱</span>
                  <span>
                    <strong>90 min</strong>
                  </span>
                </div>
                <div className="meta__item">
                  <span className="meta__icon">👥</span>
                  <span>
                    <strong>30 plazas</strong>
                  </span>
                </div>
                <div className="meta__item">
                  <span className="meta__icon">🎟</span>
                  <span>
                    <strong>5€</strong>
                  </span>
                </div>
              </div>

              <div className="cta">
                <a className="btn" href="#reserva">
                  Reservar plaza (5€)
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

            <aside className="hero__card">
              <div className="card">
                <h2 className="card__title">En 90 minutos, te llevas:</h2>
                <ul className="list">
                  <li>Plantillas para responder WhatsApp y reseñas sin sonar “robot”.</li>
                  <li>Un método para que “escriba a tu estilo”.</li>
                  <li>Un post/cartel listo (y repetible) en 10 minutos.</li>
                  <li>Un plan simple de 7 días para notar resultados.</li>
                </ul>

                <div className="divider"></div>

                <div className="pay">
                  <div className="pay__row">
                    <div className="pay__label">Entrada</div>
                    <div className="pay__value">5€</div>
                  </div>
                  <div className="pay__row">
                    <div className="pay__label">Bizum</div>
                    <div className="pay__value">614 242 716</div>
                  </div>
                  <div className="pay__row">
                    <div className="pay__label">Concepto</div>
                    <div className="pay__value">IA 14FEB + Nombre</div>
                  </div>
                  <p className="note">
                    La plaza se confirma por orden de pago. Si prefieres pagar allí, indícalo en el formulario (sujeto a
                    disponibilidad).
                  </p>
                </div>

                <a className="btn btn--full" href="#reserva">
                  Reservar ahora
                </a>

                <div className="micro">
                  ¿Dudas? WhatsApp{" "}
                  <a href="https://wa.me/34614242716" target="_blank" rel="noopener">
                    614 242 716
                  </a>{" "}
                  · Email <a href="mailto:mcgnexus@gmail.com">mcgnexus@gmail.com</a>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* BENEFICIOS */}
        <section className="section" id="beneficios">
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

            <div className="roi">
              <div className="roi__left">
                <h3>El cálculo (tiempo real recuperado)</h3>
                <p>
                  Si hoy te vas a <strong>30 min/día</strong> en mensajes, textos y “qué publico hoy”, y lo bajas a{" "}
                  <strong>10 min/día</strong>, recuperas <strong>~10 horas al mes</strong>.
                </p>
                <p className="note">Eso es tiempo para facturar más… o para vivir mejor.</p>
              </div>

              <div className="roi__right">
                <div className="roiBox">
                  <div className="roiBox__label">Tu tiempo al mes</div>
                  <div className="roiBox__value">
                    <span id="hoursSaved">{hoursSaved}</span> horas
                  </div>
                  <div className="roiBox__controls" aria-label="Ajusta tu situación">
                    <label>
                      Minutos al día ahora:
                      <input
                        id="minsNow"
                        type="number"
                        min="5"
                        max="180"
                        value={minsNow}
                        onChange={(e) => setMinsNow(Number(e.target.value || 0))}
                      />
                    </label>
                    <label>
                      Minutos al día con atajos:
                      <input
                        id="minsAfter"
                        type="number"
                        min="5"
                        max="180"
                        value={minsAfter}
                        onChange={(e) => setMinsAfter(Number(e.target.value || 0))}
                      />
                    </label>
                    <button className="btn btn--small" type="button">
                      Calcular
                    </button>
                  </div>
                  <p className="micro">Cálculo con 30 días/mes (aprox.).</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PARA QUIÉN */}
        <section className="section section--soft" id="paraquien">
          <div className="container">
            <h2>Para quién es</h2>

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

        {/* AGENDA */}
        <section className="section" id="agenda">
          <div className="container">
            <h2>Agenda (90 min)</h2>
            <p className="section__lead">Formato directo: entender, verlo funcionar y aplicarlo a tu caso.</p>

            <ol className="timeline">
              <li className="timeline__item">
                <div className="timeline__time">15 min</div>
                <div className="timeline__content">
                  <h3>Entender sin miedo</h3>
                  <p>Mitos vs realidad y qué tareas te quita de encima desde esta semana.</p>
                </div>
              </li>
              <li className="timeline__item">
                <div className="timeline__time">45 min</div>
                <div className="timeline__content">
                  <h3>Casos reales (Almuñécar)</h3>
                  <p>Mensajes, reservas, reseñas, carteles, posts y organización diaria.</p>
                </div>
              </li>
              <li className="timeline__item">
                <div className="timeline__time">20 min</div>
                <div className="timeline__content">
                  <h3>Mini‑taller: tu caso</h3>
                  <p>Eliges un problema y lo resolvemos en directo con una plantilla reutilizable.</p>
                </div>
              </li>
              <li className="timeline__item">
                <div className="timeline__time">10 min</div>
                <div className="timeline__content">
                  <h3>Plan simple de 7 días</h3>
                  <p>Qué hacer la primera semana para notar resultados sin agobio.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* LUGAR */}
        <section className="section section--soft" id="lugar">
          <div className="container">
            <h2>Lugar</h2>

            <div className="place">
              <div className="place__info">
                <h3>Academia MR.C</h3>
                <p className="leadSmall">Calle Tetuán, 20 · Almuñécar</p>

                <div className="place__badges">
                  <span className="badge">📱 Solo móvil</span>
                  <span className="badge">🕦 11:30</span>
                  <span className="badge">⏱ 90 min</span>
                  <span className="badge">💫 5€</span>
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
        <section className="section" id="reserva">
          <div className="container">
            <h2>Reserva tu plaza</h2>
            <p className="section__lead">Completa el formulario (30 segundos). Te confirmamos por WhatsApp en menos de 24h.</p>

            <div className="reserveGrid">
              <div className="reserveCard">
                <h3>Pago y confirmación</h3>

                <div className="pay pay--boxed">
                  <div className="pay__row">
                    <div className="pay__label">Entrada</div>
                    <div className="pay__value">5€</div>
                  </div>
                <div className="pay__row">
                  <div className="pay__label">Bizum</div>
                  <div className="pay__value">614 242 716</div>
                </div>
                <div className="pay__row">
                  <div className="pay__label">Concepto</div>
                  <div className="pay__value">IA 14FEB + Nombre</div>
                </div>

                  <p className="note">
                    La plaza se confirma por orden de pago. Si eliges “pago en mano” en el formulario, te confirmaremos según
                    disponibilidad.
                  </p>
                </div>

                <div className="bizumBox" id="bizumBox">
                  <div className="bizumBox__head">
                    <div>
                      <h4>Pagar ahora con Bizum</h4>
                      <p className="micro">Recibes las instrucciones al instante y confirmamos por WhatsApp.</p>
                    </div>
                    <div className="bizumBadge" aria-hidden="true">
                      Bizum
                    </div>
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
                        IA 14FEB + tu nombre
                      </div>
                    </div>
                  </div>

                  <div className="bizumActions">
                    <button className="btn btn--small" id="bizumPayBtn" type="button" onClick={handleBizumOpen}>
                      Abrir Bizum
                    </button>
                    <button className="btn btn--ghost btn--small" id="bizumCopyBtn" type="button" onClick={handleBizumCopy}>
                      Copiar datos
                    </button>
                  </div>

                  <button className="btn btn--full btn--small" id="bizumSendBtn" type="button" onClick={handleBizumSend}>
                    Enviarme instrucciones por WhatsApp
                  </button>

                  <div className="bizumQr">
                    <Image id="bizumQrImg" src={bizumQr} alt="QR con datos de Bizum" width={120} height={120} unoptimized />
                    <p className="micro">Escanéalo si estás en otro dispositivo.</p>
                  </div>

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
                <p className="note">
                  Inserta aquí tu formulario de Google. Solo tienes que pegar el enlace de inserción en <strong>app/page.jsx</strong>{" "}
                  (constante <span className="mono">GOOGLE_FORM_EMBED_URL</span>).
                </p>

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

      <div className="chatFab" id="chatFab" ref={fabRef} aria-expanded={chatOpen} onClick={handleFabClick}>
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
            <div className="chatSub">Dudas rápidas. Si dejas tu WhatsApp, te mando la respuesta allí.</div>
          </div>
          <button className="chatClose" id="chatClose" aria-label="Cerrar chat" onClick={handleCloseClick}>
            ×
          </button>
        </div>

        <div className="chatMeta">
          <label className="field">
            <span>Tu nombre (opcional)</span>
            <input
              type="text"
              id="chatName"
              placeholder="Ej. Carlos"
              autoComplete="name"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>WhatsApp (para enviarte las respuestas)</span>
            <input
              type="tel"
              id="chatPhone"
              placeholder="34XXXXXXXXX"
              autoComplete="tel"
              value={chatPhone}
              onChange={(e) => setChatPhone(e.target.value)}
            />
          </label>
        </div>

        <div className="chatMessages" id="chatMessages">
          {messages.map((m, idx) => (
            <div key={idx} className={`msg msg--${m.role === "user" ? "user" : "bot"}`}>
              {m.role === "bot" ? (
                <span dangerouslySetInnerHTML={{
                  __html: m.text
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`(.*?)`/g, '<code>$1</code>')
                    .replace(/\n/g, '<br>')
                    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
                }} />
              ) : (
                m.text
              )}
            </div>
          ))}
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

        <div className="micro" id="chatStatus">
          {chatStatus}
        </div>
      </section>

      <footer className="footer">
        <div className="container footer__inner">
          <div className="footer__left">
            <Image className="footer__logo" src="/assets/tecrural-logo.png" alt="TecRural" width={34} height={34} />
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

/* ---------- helpers ---------- */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function callMistral(history) {
  const res = await fetch(MISTRAL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages: history,
      temperature: 0.4,
      max_tokens: 450,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mistral error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || "Sin respuesta, prueba de nuevo.";
}

async function sendWhatsAppMessage(to, body) {
  const res = await fetch(WHAPI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHAPI_TOKEN}`,
      "Content-Type": "application/json",
    },
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
  return BIZUM_CONCEPT;
}
