"use client";

import Image from "next/image";
import { useMemo, useState, useRef, useEffect } from "react";

const GOOGLE_FORM_EMBED_URL = "https://docs.google.com/forms/d/e/1FAIpQLSf-donb7o4oAWk40ecIzNdnLqPioea2EXLQ8H13GitEe5fXeQ/viewform?embedded=true";
const GOOGLE_FORM_DIRECT_URL = "https://docs.google.com/forms/d/e/1FAIpQLSf-donb7o4oAWk40ecIzNdnLqPioea2EXLQ8H13GitEe5fXeQ/viewform";

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
  "Información clave del evento: Nombre: IA Sin Líos. Cuándo: 14/02/2026 a las 12:00. Dónde: Academia MR.C (Almuñécar). Inversión: 5€. " +
  "Destaca que no es teoría, sino un salto tecnológico para su día a día. Puedes dar ejemplos de cómo la IA redacta menús, responde reseñas o planifica semanas en segundos. ¡Haz que sientan que el futuro ya está aquí!";

/* ---------- helpers ---------- */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

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

async function callMistral(history) {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_MISTRAL_API_KEY || ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small",
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
  const res = await fetch("https://gate.whapi.cloud/messages/text", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_WHAPI_TOKEN || ""}`,
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


export default function Home() {
  // 1. Refs
  const chatRef = useRef(null);
  const fabRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 2. States
  const [mobileOpen, setMobileOpen] = useState(false);
  const [minsNow, setMinsNow] = useState(30);
  const [minsAfter, setMinsAfter] = useState(10);
  const [bizumName, setBizumName] = useState("");
  const [bizumPhone, setBizumPhone] = useState("");
  const [bizumStatus, setBizumStatus] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
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

  // 3. Memos
  const targetHours = useMemo(() => {
    const saved = Math.max(0, clamp(minsNow, 0, 600) - clamp(minsAfter, 0, 600));
    return (saved * 26) / 60;
  }, [minsNow, minsAfter]);

  const [animatedHours, setAnimatedHours] = useState(targetHours);

  const hoursSaved = animatedHours.toFixed(animatedHours >= 10 ? 0 : 1);
  const isHighSaving = targetHours >= 20;

  const bizumConcept = useMemo(() => buildConcept(bizumName), [bizumName]);
  const bizumQr = useMemo(() => {
    const concept = buildConcept(bizumName);
    return `https://quickchart.io/qr?text=Bizum%20${BIZUM_NUMBER}%20%7C%205%E2%82%AC%20%7C%20${encodeURIComponent(concept)}`;
  }, [bizumName]);

  // 4. Effects
  useEffect(() => {
    const startValue = animatedHours;
    const endValue = targetHours;
    const duration = 400;
    const startTime = performance.now();

    let animationFrame;
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = (t) => 1 - Math.pow(1 - t, 3);
      const current = startValue + (endValue - startValue) * easeOut(progress);
      setAnimatedHours(current);
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [targetHours]);

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
                    <strong>5€, plazas limitadas</strong>
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

            <div className="roi">
              <div className="roi__left">
                <h3>Calculadora de Retorno de Tiempo</h3>
                <p>
                  Descubre cuánto tiempo real puedes recuperar al mes automatizando tareas repetitivas con IA (mensajes, redes sociales, planificación).
                </p>
                <div className="roi__badge" style={{ marginTop: '16px' }}>
                  <div className="pill">
                    <span className="pill__dot"></span>
                    Ganas <strong>{Math.floor(Number(hoursSaved) / 8)} días</strong> laborales extra al mes
                  </div>
                </div>
              </div>

              <div className="roi__right">
                <div className="roiCard" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="roiCard__header" style={{ marginBottom: '24px', textAlign: 'center' }}>
                    <div className="micro" style={{ textTransform: 'uppercase', letterSpacing: '1px', opacity: '0.7' }}>Ahorro Mensual Estimado</div>
                    <div className="roiCard__result" style={{
                      fontSize: '3rem',
                      fontWeight: '700',
                      color: isHighSaving ? '#4ade80' : '#327F4C',
                      textShadow: isHighSaving ? '0 0 25px rgba(74, 222, 128, 0.5)' : 'none',
                      transform: isHighSaving ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                      {hoursSaved} <span style={{ fontSize: '1rem', opacity: '0.8' }}>horas</span>
                    </div>
                  </div>

                  <div className="roiCard__chart" style={{ marginBottom: '32px', padding: '0 10px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span className="micro" style={{ opacity: 0.6, textTransform: 'uppercase' }}>Situación actual</span>
                        <span className="mono micro" style={{ opacity: 0.8 }}>{minsNow} min/día</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{
                          width: `${(minsNow / 180) * 100}%`,
                          height: '100%',
                          background: 'rgba(255,255,255,0.2)',
                          borderRadius: '4px',
                          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}></div>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span className="micro" style={{ color: '#327F4C', fontWeight: '700', textTransform: 'uppercase' }}>Con IA Sin Líos</span>
                        <span className="mono micro" style={{ color: '#327F4C', fontWeight: '700' }}>{minsAfter} min/día</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{
                          width: `${(minsAfter / 180) * 100}%`,
                          height: '100%',
                          background: '#327F4C',
                          borderRadius: '4px',
                          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="roiCard__form">
                    <div className="roiField" style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label htmlFor="minsNow" className="micro">Tiempo actual diario</label>
                        <span className="mono" style={{ color: '#327F4C' }}>{minsNow} min</span>
                      </div>
                      <input
                        id="minsNow"
                        type="range"
                        min="5"
                        max="180"
                        step="5"
                        value={minsNow}
                        onChange={(e) => setMinsNow(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#327F4C' }}
                      />
                    </div>
                    <div className="roiField">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label htmlFor="minsAfter" className="micro">Tiempo con IA</label>
                        <span className="mono" style={{ color: '#327F4C' }}>{minsAfter} min</span>
                      </div>
                      <input
                        id="minsAfter"
                        type="range"
                        min="0"
                        max="60"
                        step="5"
                        value={minsAfter}
                        onChange={(e) => setMinsAfter(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#327F4C' }}
                      />
                    </div>
                  </div>
                  <p className="micro" style={{ marginTop: '20px', textAlign: 'center', opacity: '0.5' }}>Basado en 26 días laborables al mes.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PARA QUIÉN */}
        <section className="section section--dark" id="paraquien">
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

        {/* PONENTE */}
        <section className="section section--dark" id="ponente">
          <div className="container">
            <div className="panel panel--highlight">
              <h2>¿Quién imparte la charla?</h2>
              <p className="lead" style={{ marginBottom: '24px' }}>
                Soy <strong>Manuel Carrasco</strong>. Además de la formación, desarrollo dos proyectos aplicados para el día a día y para pequeños negocios:
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
            <h2>Agenda (60 min + tiempo extra)</h2>
            <p className="section__lead">Formato directo: entender, verlo funcionar y aplicarlo a tu caso.</p>

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
            <h2>Lugar</h2>

            <div className="place">
              <div className="place__info">
                <h3>Academia MR.C</h3>
                <p className="leadSmall">Calle Tetuán, 20 · Almuñécar</p>

                <div className="place__badges">
                  <span className="badge">📱 Solo móvil</span>
                  <span className="badge">🕦 12:00</span>
                  <span className="badge">⏱ 60 min + Q&amp;A</span>
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
        <section className="section section--dark" id="reserva">
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


