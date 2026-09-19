const STORAGE_KEY = "academic_spa_data";

let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [
  { id: 1, nombre: "Ciclo 1", cursos: [ { id: 101, nombre: "Curso de ejemplo", creditos: 3, evaluaciones: [{ nombre: "Parcial", peso: 50, nota: 14 }, { nombre: "Final", peso: 50, nota: 16 }] } ] }
];

let activeCicloId = null;
let activeCursoId = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  actualizarMetricasGlobales();
}

function getNotaCurso(evaluaciones) {
  if (!evaluaciones || evaluaciones.length === 0) return "0.00";
  const nota = evaluaciones.reduce((acc, ev) => acc + (Number(ev.nota) * (Number(ev.peso) / 100)), 0);
  return nota.toFixed(2);
}

function getPonderadoCiclo(cursos) {
  let suma = 0, creds = 0;
  cursos.forEach(c => {
    suma += parseFloat(getNotaCurso(c.evaluaciones)) * (Number(c.creditos) || 0);
    creds += (Number(c.creditos) || 0);
  });
  return creds > 0 ? (suma / creds).toFixed(2) : "0.00";
}

function actualizarMetricasGlobales() {
  let totalPond = 0, totalCred = 0;
  state.forEach(ciclo => {
    ciclo.cursos.forEach(c => {
      totalPond += parseFloat(getNotaCurso(c.evaluaciones)) * (Number(c.creditos) || 0);
      totalCred += (Number(c.creditos) || 0);
    });
  });
  document.getElementById("stat-total-creditos").textContent = totalCred;
  document.getElementById("stat-ponderado-acumulado").textContent = totalCred > 0 ? (totalPond / totalCred).toFixed(2) : "0.00";
}

function navigateTo(viewName) {
  document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
  const bc = document.getElementById("breadcrumbs");

  if (viewName === "ciclos") {
    activeCicloId = activeCursoId = null;
    document.getElementById("view-ciclos").classList.add("active");
    bc.textContent = "Inicio > Ciclos";
    renderCiclosView();
  } else if (viewName === "cursos") {
    activeCursoId = null;
    document.getElementById("view-cursos").classList.add("active");
    const ciclo = state.find(c => c.id === activeCicloId);
    bc.textContent = `Inicio > ${ciclo ? ciclo.nombre : 'Ciclo'} > Cursos`;
    renderCursosView();
  } else if (viewName === "ponderados") {
    document.getElementById("view-ponderados").classList.add("active");
    const ciclo = state.find(c => c.id === activeCicloId);
    const curso = ciclo?.cursos.find(cu => cu.id === activeCursoId);
    bc.textContent = `Inicio > ${ciclo?.nombre} > ${curso?.nombre} > Ponderado`;
    renderPonderadosView();
  }
  actualizarMetricasGlobales();
}

function renderCiclosView() {
  const container = document.getElementById("grid-ciclos");
  container.innerHTML = "";
  state.forEach(ciclo => {
    const card = document.createElement("div");
    card.className = "card-ciclo";
    card.innerHTML = `
      <input type="text" class="input-ciclo-card" value="${ciclo.nombre}">
      <span class="ciclo-stat">Promedio: ${getPonderadoCiclo(ciclo.cursos)}</span>
      <button class="btn btn-danger btn-eliminar" data-action="delete-ciclo" data-id="${ciclo.id}">×</button>
    `;
    const inputNombre = card.querySelector(".input-ciclo-card");
    inputNombre.addEventListener("click", e => e.stopPropagation());
    inputNombre.addEventListener("change", e => { ciclo.nombre = e.target.value.trim() || "Sin nombre"; saveState(); });
    
    card.addEventListener("click", e => {
      if (e.target.dataset.action === "delete-ciclo") {
        e.stopPropagation();
        state = state.filter(c => c.id !== ciclo.id);
        saveState(); renderCiclosView(); return;
      }
      activeCicloId = ciclo.id; navigateTo("cursos");
    });
    container.appendChild(card);
  });
}

function renderCursosView() {
  const ciclo = state.find(c => c.id === activeCicloId);
  if (!ciclo) return navigateTo("ciclos");
  document.getElementById("input-ciclo-nombre-header").value = ciclo.nombre;
  document.getElementById("stat-ciclo-ponderado").textContent = getPonderadoCiclo(ciclo.cursos);

  const container = document.getElementById("lista-cursos");
  container.innerHTML = "";
  if (ciclo.cursos.length === 0) return container.innerHTML = "<p class='text-muted'>No tienes cursos en este ciclo.</p>";

  ciclo.cursos.forEach(curso => {
    const item = document.createElement("div");
    item.className = "item-curso-barra";
    item.innerHTML = `
      <span class="curso-title">${curso.nombre}</span>
      <div class="curso-meta">
        <span class="text-muted">${curso.creditos} créditos</span>
        <span style="color: var(--accent); font-weight: bold;">Nota: ${getNotaCurso(curso.evaluaciones)}</span>
        <button class="btn btn-danger" data-action="delete-curso" data-id="${curso.id}">×</button>
      </div>
    `;
    item.addEventListener("click", e => {
      if (e.target.dataset.action === "delete-curso") {
        e.stopPropagation();
        ciclo.cursos = ciclo.cursos.filter(c => c.id !== curso.id);
        saveState(); renderCursosView(); return;
      }
      activeCursoId = curso.id; navigateTo("ponderados");
    });
    container.appendChild(item);
  });
}

function renderPonderadosView() {
  const ciclo = state.find(c => c.id === activeCicloId);
  const curso = ciclo?.cursos.find(cu => cu.id === activeCursoId);
  if (!ciclo || !curso) return navigateTo("cursos");

  document.getElementById("curso-activo-titulo").textContent = curso.nombre.toUpperCase();
  document.getElementById("input-curso-nombre").value = curso.nombre;
  document.getElementById("input-curso-creditos").value = curso.creditos;

  const tbody = document.getElementById("tbody-evaluaciones");
  tbody.innerHTML = "";
  let sumaPesos = 0;

  curso.evaluaciones.forEach((ev, idx) => {
    sumaPesos += Number(ev.peso) || 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="input-ev-nombre" data-idx="${idx}" value="${ev.nombre}"></td>
      <td><input type="number" min="0" max="100" class="input-ev-peso" data-idx="${idx}" value="${ev.peso}"></td>
      <td><input type="number" min="0" max="20" step="0.1" class="input-ev-nota" data-idx="${idx}" value="${ev.nota}"></td>
      <td><button class="btn btn-danger" data-action="delete-ev" data-idx="${idx}">×</button></td>
    `;
    tbody.appendChild(tr);
  });

  const alertaPeso = document.getElementById("peso-total-alerta");
  alertaPeso.textContent = `Peso total: ${sumaPesos}%`;
  alertaPeso.classList.toggle("error", sumaPesos !== 100);
  document.getElementById("stat-curso-nota").textContent = getNotaCurso(curso.evaluaciones);
}

document.addEventListener("DOMContentLoaded", () => {
  // --- LÓGICA DEL MODO OSCURO / CLARO ---
  const btnTheme = document.getElementById("btn-theme");
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }
  btnTheme.addEventListener("click", () => {
    if (document.documentElement.getAttribute("data-theme") === "dark") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    }
  });

  // --- LÓGICA DEL MODAL DE DONACIÓN ---
  const modalDonate = document.getElementById("modal-donate");
  const btnOpenDonate = document.getElementById("btn-open-donate");
  const btnCloseDonate = document.getElementById("btn-close-donate");
  const btnCloseDonateBottom = document.getElementById("btn-close-donate-bottom");

  btnOpenDonate.addEventListener("click", () => modalDonate.classList.add("show"));
  btnCloseDonate.addEventListener("click", () => modalDonate.classList.remove("show"));
  btnCloseDonateBottom.addEventListener("click", () => modalDonate.classList.remove("show"));
  
  // Cerrar modal al hacer clic afuera
  modalDonate.addEventListener("click", (e) => {
    if (e.target === modalDonate) modalDonate.classList.remove("show");
  });

  // --- RESTO DE LOS LISTENERS ---
  document.getElementById("btn-volver-ciclos").addEventListener("click", () => navigateTo("ciclos"));
  document.getElementById("btn-volver-cursos").addEventListener("click", () => navigateTo("cursos"));

  document.getElementById("btn-nuevo-ciclo").addEventListener("click", () => {
    state.push({ id: Date.now(), nombre: `Ciclo ${state.length + 1}`, cursos: [] });
    saveState(); renderCiclosView();
  });

  document.getElementById("btn-nuevo-curso").addEventListener("click", () => {
    const ciclo = state.find(c => c.id === activeCicloId);
    if (!ciclo) return;
    ciclo.cursos.push({ id: Date.now(), nombre: `Curso ${ciclo.cursos.length + 1}`, creditos: 3, evaluaciones: [{ nombre: "Parcial", peso: 50, nota: 0 }, { nombre: "Final", peso: 50, nota: 0 }] });
    saveState(); renderCursosView();
  });

  document.getElementById("btn-nueva-ev").addEventListener("click", () => {
    const curso = state.find(c => c.id === activeCicloId)?.cursos.find(cu => cu.id === activeCursoId);
    if (curso) { curso.evaluaciones.push({ nombre: "Ev.", peso: 0, nota: 0 }); saveState(); renderPonderadosView(); }
  });

  document.getElementById("input-ciclo-nombre-header").addEventListener("change", e => {
    const ciclo = state.find(c => c.id === activeCicloId);
    if (ciclo) { ciclo.nombre = e.target.value.trim() || "Sin nombre"; saveState(); document.getElementById("breadcrumbs").textContent = `Inicio > ${ciclo.nombre} > Cursos`; }
  });

  document.getElementById("input-curso-nombre").addEventListener("change", e => {
    const curso = state.find(c => c.id === activeCicloId)?.cursos.find(cu => cu.id === activeCursoId);
    if (curso) { curso.nombre = e.target.value; saveState(); }
  });

  document.getElementById("input-curso-creditos").addEventListener("change", e => {
    const curso = state.find(c => c.id === activeCicloId)?.cursos.find(cu => cu.id === activeCursoId);
    if (curso) { curso.creditos = Number(e.target.value); saveState(); }
  });

  const tbody = document.getElementById("tbody-evaluaciones");
  tbody.addEventListener("click", e => {
    if (e.target.dataset.action === "delete-ev") {
      const curso = state.find(c => c.id === activeCicloId)?.cursos.find(cu => cu.id === activeCursoId);
      if (curso) { curso.evaluaciones.splice(Number(e.target.dataset.idx), 1); saveState(); renderPonderadosView(); }
    }
  });

  tbody.addEventListener("input", e => {
    const curso = state.find(c => c.id === activeCicloId)?.cursos.find(cu => cu.id === activeCursoId);
    const idx = Number(e.target.dataset.idx);
    if (!curso || !curso.evaluaciones[idx]) return;

    if (e.target.classList.contains("input-ev-nombre")) curso.evaluaciones[idx].nombre = e.target.value;
    else if (e.target.classList.contains("input-ev-peso")) curso.evaluaciones[idx].peso = Number(e.target.value);
    else if (e.target.classList.contains("input-ev-nota")) curso.evaluaciones[idx].nota = Number(e.target.value);

    saveState();
    document.getElementById("stat-curso-nota").textContent = getNotaCurso(curso.evaluaciones);
    const totalPesos = curso.evaluaciones.reduce((acc, ev) => acc + (Number(ev.peso) || 0), 0);
    const alerta = document.getElementById("peso-total-alerta");
    alerta.textContent = `Peso total: ${totalPesos}%`;
    alerta.classList.toggle("error", totalPesos !== 100);
  });

  navigateTo("ciclos");
});

// Registro del Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => console.log("SW Falló: ", err));
  });
}