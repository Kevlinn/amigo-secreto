import { firebaseConfig } from "./firebase-config.js";

/* ============ DATOS BASE ============ */
const PARTICIPANTS = [
  { name: "Silvana",   area: "Diseño" },
  { name: "Frances",   area: "Diseño" },
  { name: "Linda",     area: "Diseño" },
  { name: "Mayra",     area: "Producción" },
  { name: "Jasmin",    area: "Diseño" },
  { name: "Stefany",   area: "Avíos" },
  { name: "Diego",     area: "Avíos" },
  { name: "Kevin",     area: "TI" },
  { name: "Javier",    area: "Corte" },
  { name: "Jhon",      area: "Corte" },
  { name: "Angel",     area: "Corte" },
  { name: "Sebastián", area: "Corte" }
].sort((a, b) => a.name.localeCompare(b.name, "es"));

// id estable sin tildes (ej. "Sebastián" -> "sebastian")
const idOf = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const AVATARS = ["🎅","🤶","🧑‍🎄","🧝","🧝‍♀️","🦌","⛄","❄️","🎄","🎁","⭐","🔔",
                 "🍪","🥛","🍬","🍭","🧦","🕯️","🐧","🐻‍❄️","🦉","🍫","🧸","👼"];

const N_OPTIONS = 3;
const $ = (s) => document.querySelector(s);

/* ============ ALMACENAMIENTO ============ */
const demoMode = !firebaseConfig?.apiKey || firebaseConfig.apiKey.startsWith("PEGA");

async function createStore() {
  if (demoMode) {
    const KEY = "amigo-secreto-demo";
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
    let cb = () => {};
    return {
      async save(id, data) { const all = read(); all[id] = data; localStorage.setItem(KEY, JSON.stringify(all)); cb(all); },
      subscribe(fn) { cb = fn; fn(read()); }
    };
  }
  const V = "10.14.1";
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const { getFirestore, doc, setDoc, collection, onSnapshot } =
    await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const db = getFirestore(initializeApp(firebaseConfig));
  return {
    save: (id, data) => setDoc(doc(db, "participantes", id), data),
    subscribe(fn) {
      onSnapshot(collection(db, "participantes"), (snap) => {
        const all = {};
        snap.forEach((d) => (all[d.id] = d.data()));
        fn(all);
      }, (err) => { console.error(err); toast("No se pudo leer la base de datos. Revisa las reglas de Firebase.", true); });
    }
  };
}

/* ============ ESTADO ============ */
let store, all = {};
let current = null;              // id seleccionado
let avatar = "🎅";
let images = Array(N_OPTIONS).fill("");

/* ============ UTILIDADES ============ */
function toast(msg, isErr = false) {
  const t = $("#toast");
  t.textContent = msg; t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.className = "toast"), 2800);
}
function cleanLink(v) {
  v = (v || "").trim(); if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.href : ""; } catch { return ""; }
}
function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => (k in n ? (n[k] = v) : n.setAttribute(k, v)));
  kids.forEach((k) => n.append(k));
  return n;
}
// Reduce la imagen para que quepa en la base de datos gratuita (≈100-150 KB)
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const MAX = 800, k = Math.min(1, MAX / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      let q = 0.75, out = c.toDataURL("image/jpeg", q);
      while (out.length > 150000 && q > 0.35) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
      URL.revokeObjectURL(url); resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src = url;
  });
}

/* ============ PESTAÑAS ============ */
function showTab(which) {
  const isForm = which === "form";
  $("#view-form").hidden = !isForm; $("#view-list").hidden = isForm;
  $("#tab-form").classList.toggle("active", isForm); $("#tab-list").classList.toggle("active", !isForm);
  $("#tab-form").setAttribute("aria-selected", isForm); $("#tab-list").setAttribute("aria-selected", !isForm);
  window.scrollTo({ top: 0 });
}
$("#tab-form").onclick = () => showTab("form");
$("#tab-list").onclick = () => showTab("list");

/* ============ FORMULARIO ============ */
function buildForm() {
  const sel = $("#who");
  PARTICIPANTS.forEach((p) => sel.append(el("option", { value: idOf(p.name), textContent: `${p.name} (${p.area})` })));

  const grid = $("#avatarGrid");
  AVATARS.forEach((a) => {
    const b = el("button", { type: "button", textContent: a, ariaLabel: "Avatar " + a });
    b.onclick = () => { setAvatar(a); $("#avatarPanel").hidden = true; };
    grid.append(b);
  });
  $("#avatarBtn").onclick = () => { if (current) $("#avatarPanel").hidden = !$("#avatarPanel").hidden; else toast("Primero elige tu nombre"); };

  const box = $("#options");
  for (let i = 0; i < N_OPTIONS; i++) {
    const file = el("input", { type: "file", accept: "image/*" });
    file.dataset.i = i;
    file.onchange = async () => {
      const f = file.files[0]; if (!f) return;
      try { images[i] = await compressImage(f); refreshPreview(i); }
      catch { toast("No se pudo leer esa imagen", true); }
      file.value = "";
    };
    box.append(el("div", { className: "opt" },
      el("h3", { textContent: `Opción ${i + 1}` }),
      el("div", { className: "row" }, el("small", { textContent: "¿Qué regalo es?" }),
        el("input", { type: "text", id: `n${i}`, maxLength: 120, placeholder: "Ej: Audífonos inalámbricos" })),
      el("div", { className: "row" }, el("small", { textContent: "Enlace de la tienda" }),
        el("input", { type: "url", id: `l${i}`, inputMode: "url", placeholder: "https://…" })),
      el("div", { className: "row" }, el("small", { textContent: "Imagen o captura de pantalla" }),
        el("div", { className: "img-line" },
          el("label", { className: "file-btn" }, "📷 Subir imagen", file),
          el("img", { className: "preview", id: `p${i}`, alt: "", hidden: true }),
          el("button", { type: "button", className: "ghost", id: `x${i}`, textContent: "Quitar imagen", hidden: true, onclick: () => { images[i] = ""; refreshPreview(i); } })
        ))
    ));
  }
  sel.onchange = () => loadPerson(sel.value);
  $("#saveBtn").onclick = save;
}
function refreshPreview(i) {
  const p = $(`#p${i}`), x = $(`#x${i}`);
  p.hidden = x.hidden = !images[i]; if (images[i]) p.src = images[i];
}
function setAvatar(a) { avatar = a; $("#avatarBtn").textContent = a;
  [...$("#avatarGrid").children].forEach((b) => b.classList.toggle("sel", b.textContent === a)); }

function loadPerson(id) {
  current = id || null;
  $("#formBody").hidden = !current; $("#avatarPanel").hidden = true;
  if (!current) return;
  localStorage.setItem("amigo-secreto-yo", current);
  const d = all[current] || {};
  const idx = PARTICIPANTS.findIndex((p) => idOf(p.name) === current);
  setAvatar(d.avatar || AVATARS[idx % AVATARS.length]);
  $("#gustos").value = d.gustos || "";
  for (let i = 0; i < N_OPTIONS; i++) {
    const o = d.opciones?.[i] || {};
    $(`#n${i}`).value = o.nombre || ""; $(`#l${i}`).value = o.link || "";
    images[i] = o.imagen || ""; refreshPreview(i);
  }
}

async function save() {
  if (!current) return toast("Elige tu nombre primero", true);
  const p = PARTICIPANTS.find((x) => idOf(x.name) === current);
  const opciones = Array.from({ length: N_OPTIONS }, (_, i) => ({
    nombre: $(`#n${i}`).value.trim(), link: cleanLink($(`#l${i}`).value), imagen: images[i] || ""
  }));
  const data = { name: p.name, area: p.area, avatar, gustos: $("#gustos").value.trim(), opciones, updatedAt: Date.now() };
  const btn = $("#saveBtn"); btn.disabled = true; btn.textContent = "Guardando…";
  try { await store.save(current, data); toast("¡Guardado! 🎁"); }
  catch (e) { console.error(e); toast("No se pudo guardar. Intenta de nuevo.", true); }
  btn.disabled = false; btn.textContent = "Guardar mis regalos";
}

/* ============ LISTA ============ */
function renderList() {
  const body = $("#listBody"); body.replaceChildren();
  let done = 0;
  PARTICIPANTS.forEach((p) => {
    const d = all[idOf(p.name)];
    const filled = d && (d.gustos || d.opciones?.some((o) => o.nombre || o.link || o.imagen));
    if (filled) done++;
    const tr = el("tr");
    tr.append(el("td", {}, el("div", { className: "person" },
      el("div", { className: "av", textContent: d?.avatar || "🎁" }),
      el("div", {}, el("b", { textContent: p.name }), el("span", { textContent: p.area })))));

    const g = el("td", { "data-label": "Regalitos que me gustan" });
    g.append(d?.gustos ? el("div", { className: "gustos", textContent: d.gustos }) : el("span", { className: "empty", textContent: "Aún sin completar" }));
    tr.append(g);

    for (let i = 0; i < N_OPTIONS; i++) {
      const o = d?.opciones?.[i] || {};
      const td = el("td", { "data-label": `Opción ${i + 1}` });
      if (!o.nombre && !o.link && !o.imagen) td.append(el("span", { className: "empty", textContent: "—" }));
      else {
        if (o.nombre) td.append(el("span", { className: "gift-name", textContent: o.nombre }));
        if (o.link) td.append(el("a", { className: "link", href: o.link, target: "_blank", rel: "noopener noreferrer", textContent: "LINK" }), el("br"));
        if (o.imagen) {
          const im = el("img", { className: "thumb", src: o.imagen, alt: o.nombre || "Imagen del regalo", loading: "lazy", tabIndex: 0 });
          im.onclick = () => openModal(o.imagen);
          im.onkeydown = (e) => { if (e.key === "Enter") openModal(o.imagen); };
          td.append(im);
        }
      }
      tr.append(td);
    }
    body.append(tr);
  });
  $("#progress").textContent = `${done} de ${PARTICIPANTS.length} ya completaron sus regalos`;
}

/* ============ MODAL ============ */
const modal = $("#modal");
function openModal(src) { $("#modalImg").src = src; modal.hidden = false; $("#closeModal").focus(); }
function closeModal() { modal.hidden = true; $("#modalImg").src = ""; }
$("#closeModal").onclick = closeModal;
modal.onclick = (e) => { if (e.target === modal) closeModal(); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

/* ============ NIEVE ============ */
(function snow() {
  const box = $(".snow"), n = window.innerWidth < 600 ? 14 : 26;
  for (let i = 0; i < n; i++) {
    const s = el("i", { textContent: "❄" });
    s.style.left = Math.random() * 100 + "%";
    s.style.fontSize = 10 + Math.random() * 14 + "px";
    s.style.animationDuration = 9 + Math.random() * 12 + "s";
    s.style.animationDelay = -Math.random() * 20 + "s";
    box.append(s);
  }
})();

/* ============ ARRANQUE ============ */
buildForm();
$("#demoBanner").hidden = !demoMode;
store = await createStore();
const me = localStorage.getItem("amigo-secreto-yo");
let first = true;
store.subscribe((data) => {
  all = data; renderList();
  if (first) {
    first = false;
    if (me && PARTICIPANTS.some((p) => idOf(p.name) === me)) { $("#who").value = me; loadPerson(me); }
  }
});
