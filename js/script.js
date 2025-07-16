const tituloPagina = document.title.trim().toLowerCase();

let zona = (() => {
  if (tituloPagina.includes("zona normal")) return "contenedores";
  if (tituloPagina.includes("zona peligrosa")) return "peligroso";
  if (tituloPagina.includes("zona refrigeracion")) return "refrigeracion";
  if (tituloPagina.includes("zona vacio")) return "vacio";
  return "contenedores";
})();

const modalAgregar = document.getElementById("modal-agregar");
const modalInfo = document.getElementById("modal-info");
const abrirModalBtn = document.getElementById("abrir-formulario");
const layoutGrid = document.getElementById("layoutGrid");
const btnPaginaAnterior = document.getElementById("prev-page");
const btnPaginaSiguiente = document.getElementById("next-page");

const columnasBase = ["A", "B", "C", "D", "E", "F", "G"];
let paginaActual = 0;
let contenedores = [];
let paginas = [];
let contenedorEnEdicion = null;

abrirModalBtn.addEventListener("click", () => {
  contenedorEnEdicion = null;
  document.getElementById("modal-titulo").innerText = "Agregar Contenedor";
  document.getElementById("formulario-agregar").reset();
  document.getElementById("fecha-llegada").value = new Date().toISOString().split("T")[0];
  modalAgregar.style.display = "flex";
});

window.addEventListener("click", e => {
  if (e.target === modalAgregar) modalAgregar.style.display = "none";
  if (e.target === modalInfo) modalInfo.style.display = "none";
});

document.getElementById("guardar-contenedor").addEventListener("click", async function () {
  const datos = {
    numero: document.getElementById("numero-contenedor").value,
    tamano: document.getElementById("tamano-contenedor").value,
    peso: document.getElementById("peso").value,
    descripcion: document.getElementById("descripcion-mercancia").value,
    zona: zona.charAt(0).toUpperCase() + zona.slice(1),
    fecha_llegada: document.getElementById("fecha-llegada").value,
    fecha_salida: document.getElementById("fecha-salida").value,
    tipo: zona.charAt(0).toUpperCase() + zona.slice(1),
    grupo: parseInt(document.getElementById("grupo")?.value) || 1,
    tabla: zona
  };

  const url = contenedorEnEdicion
    ? `http://localhost:3000/api/contenedores/${contenedorEnEdicion.id}`
    : "http://localhost:3000/api/contenedores";

  const method = contenedorEnEdicion ? "PUT" : "POST";

  const respuesta = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos)
  });

  const resultado = await respuesta.json();
  if (resultado.message) {
    modalAgregar.style.display = "none";
    modalInfo.style.display = "none";
    await cargarContenedores();
    alert(resultado.message);
  } else {
    alert("Error: " + resultado.error);
  }
});

async function cargarContenedores() {
  const res = await fetch(`http://localhost:3000/api/contenedores?tabla=${zona}`);
  const todos = await res.json();
  contenedores = todos;
  organizarPaginas();
  renderizarPagina();
}

function organizarPaginas() {
  paginas = [
    columnasBase,
    columnasBase.map(l => l + "2"),
    columnasBase.map(l => l + "3"),
    columnasBase.map(l => l + "4")
  ];
}

function renderizarPagina() {
  layoutGrid.innerHTML = "";

  const columnas = paginas[paginaActual] || columnasBase;

  const header = document.createElement("div");
  header.classList.add("layout-row");
  const emptyHeader = document.createElement("div");
  emptyHeader.classList.add("layout-row-label");
  header.appendChild(emptyHeader);

  for (let col of columnas) {
    const colLabel = document.createElement("div");
    colLabel.classList.add("layout-cell");
    colLabel.textContent = col;
    header.appendChild(colLabel);
  }

  layoutGrid.appendChild(header);

  for (let fila = 7; fila >= 1; fila--) {
    const row = document.createElement("div");
    row.classList.add("layout-row");

    const label = document.createElement("div");
    label.classList.add("layout-row-label");
    label.textContent = `${String(fila).padStart(2, "0")}-`;
    row.appendChild(label);

    for (let col of columnas) {
      const cell = document.createElement("div");
      cell.classList.add("layout-cell");
      const codigo = col + String(fila).padStart(2, "0");
      const conts = contenedores.filter(c => c.codigo === codigo);

      if (conts.length === 1 && conts[0].tamano === "40") {
        const cont = conts[0];
        cell.innerHTML = `<div>${cont.numero}</div>`;
        cell.style.backgroundColor = getColorPorFecha(cont.fecha_salida);
        cell.addEventListener("click", () => mostrarModalInfo(cont));
      }

      if (conts.length === 1 && conts[0].tamano === "20") {
        const cont = conts[0];
        cell.innerHTML = `
          <div style="height: 50%; display: flex; align-items: center; justify-content: center; border-top: 1px solid #ccc; padding-top: 5px;">
            ${cont.numero}
          </div>
        `;
        cell.style.backgroundColor = getColorPorFecha(cont.fecha_salida);
        cell.addEventListener("click", () => mostrarModalInfo(cont));
      }

      if (conts.length === 2 && conts.every(c => c.tamano === "20")) {
        const divs = conts.map((c, i) => `
          <div style="height: 50%; display: flex; align-items: center; justify-content: center; border-top: ${i === 1 ? '1px solid #ccc' : 'none'}; padding-top: ${i === 1 ? '5px' : '0'}; padding-bottom: ${i === 0 ? '5px' : '0'};">
            ${c.numero}
          </div>
        `);
        cell.innerHTML = divs.join("");
        cell.style.backgroundColor = getColorPorFecha(conts[0].fecha_salida);
        cell.addEventListener("click", () => mostrarModalInfo(conts[0]));
      }

      row.appendChild(cell);
    }

    layoutGrid.appendChild(row);
  }
}

function getColorPorFecha(fechaSalida) {
  const salida = new Date(fechaSalida);
  const hoy = new Date();
  const manana = new Date();
  manana.setDate(hoy.getDate() + 1);

  if (salida.toDateString() === hoy.toDateString()) return "#cce5ff";
  if (salida.toDateString() === manana.toDateString()) return "#ffe5b4";

  // Zona personalizada para color
  if (zona === "peligroso") return "#f8d7da";
  if (zona === "refrigeracion") return "#d1f7ff";
  if (zona === "vacio") return "#f0f0f0";
  return "#d4edda";
}

function mostrarModalInfo(c) {
  modalInfo.innerHTML = `
    <div class="modal-contenido">
      <span class="modal-cerrar" onclick="modalInfo.style.display='none'">&times;</span>
      <h2>Información del Contenedor</h2>
      <p><strong>Código:</strong> ${c.codigo}</p>
      <p><strong>Número:</strong> ${c.numero}</p>
      <p><strong>Tamaño:</strong> ${c.tamano}</p>
      <p><strong>Peso:</strong> ${c.peso}</p>
      <p><strong>Descripción:</strong> ${c.descripcion}</p>
      <p><strong>Llegada:</strong> ${new Date(c.fecha_llegada).toLocaleDateString()}</p>
      <p><strong>Salida:</strong> ${new Date(c.fecha_salida).toLocaleDateString()}</p>
      <div style="display:flex; justify-content:center; gap: 10px; margin-top: 20px;">
        <button onclick="editarContenedor(${c.id})" style="padding:8px 12px; background-color:#ba9d45; color:white; border:none; border-radius:5px;">✏️ Editar</button>
        <button onclick="eliminarContenedor(${c.id})" style="padding:8px 12px; background-color:#a94442; color:white; border:none; border-radius:5px;">🗑️ Eliminar</button>
      </div>
    </div>
  `;
  modalInfo.style.display = "flex";
}

function editarContenedor(id) {
  const c = contenedores.find(cont => cont.id === id);
  if (!c) return;

  contenedorEnEdicion = c;

  document.getElementById("modal-titulo").innerText = "Editar Contenedor";
  document.getElementById("numero-contenedor").value = c.numero;
  document.getElementById("tamano-contenedor").value = c.tamano;
  document.getElementById("peso").value = c.peso;
  document.getElementById("descripcion-mercancia").value = c.descripcion;
  document.getElementById("fecha-llegada").value = c.fecha_llegada.split("T")[0];
  document.getElementById("fecha-salida").value = c.fecha_salida.split("T")[0];
  if (document.getElementById("grupo")) {
    document.getElementById("grupo").value = c.grupo || 1;
  }

  modalAgregar.style.display = "flex";
}

async function eliminarContenedor(id) {
  if (!confirm("¿Seguro que deseas eliminar este contenedor?")) return;
  const res = await fetch(`http://localhost:3000/api/contenedores/${id}?tabla=${zona}`, {
    method: "DELETE"
  });
  const data = await res.json();
  if (data.message) {
    modalInfo.style.display = "none";
    await cargarContenedores();
  }
}

btnPaginaAnterior?.addEventListener("click", () => {
  if (paginaActual > 0) {
    paginaActual--;
    renderizarPagina();
  }
});

btnPaginaSiguiente?.addEventListener("click", () => {
  if (paginaActual < paginas.length - 1) {
    paginaActual++;
    renderizarPagina();
  }
});

window.addEventListener("DOMContentLoaded", cargarContenedores);
