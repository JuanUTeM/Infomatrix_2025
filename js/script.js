document.addEventListener("DOMContentLoaded", async () => {
  const modalAgregar = document.getElementById("modal-agregar");
  const modalInfo = document.getElementById("modal-info");
  const abrirModalBtn = document.getElementById("abrir-formulario");
  const layoutGrid = document.getElementById("layoutGrid");
  const columnas = ["A","B","C","D","E","F","G"];
  let contenedorActual = null;

  function generarLayout() {
    layoutGrid.innerHTML = "";
    layoutGrid.style.gridTemplateColumns = `repeat(${columnas.length+1}, 1fr)`;
    layoutGrid.appendChild(document.createElement("div")); // esquina

    columnas.forEach((letra, i) => {
      const header = document.createElement("div");
      header.className = "layout-col-label";
      header.textContent = letra;
      header.style.gridColumn = i + 2;
      layoutGrid.appendChild(header);
    });

    for (let fila = 7; fila >= 1; fila--) {
      const rowLabel = document.createElement("div");
      rowLabel.className = "layout-row-label";
      rowLabel.textContent = `${String(fila).padStart(2, "0")}-`;
      layoutGrid.appendChild(rowLabel);

      for (let col of columnas) {
        const cell = document.createElement("div");
        cell.className = "layout-cell";
        cell.setAttribute("data-codigo", `${col}${String(fila).padStart(2,"0")}`);
        layoutGrid.appendChild(cell);
      }
    }
  }

  abrirModalBtn.addEventListener("click", () => {
    contenedorActual = null;
    document.getElementById("formulario-agregar").reset();
    modalAgregar.style.display = "flex";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modalAgregar) modalAgregar.style.display = "none";
    if (e.target === modalInfo) modalInfo.style.display = "none";
  });

  document.getElementById("close-agregar").addEventListener("click", () => modalAgregar.style.display = "none");
  document.getElementById("close-info").addEventListener("click", () => modalInfo.style.display = "none");

  document.getElementById("guardar-contenedor").addEventListener("click", async () => {
    const numero = document.getElementById("numero-contenedor").value.trim();
    const tamano = document.getElementById("tamano-contenedor").value.trim();
    const peso = document.getElementById("peso").value.trim();
    const descripcion = document.getElementById("descripcion-mercancia").value.trim();
    const llegada = document.getElementById("fecha-llegada").value;
    const salida = document.getElementById("fecha-salida").value;
    const zona = obtenerZonaDesdeHTML();

    if (!numero || !tamano || !peso || !descripcion || !llegada || !salida) {
      return alert("Todos los campos son obligatorios.");
    }

    if (contenedorActual) {
      await fetch(`http://localhost:3000/api/contenedores/${contenedorActual.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero, tamano, peso, descripcion, fecha_llegada: llegada, fecha_salida: salida })
      });
      location.reload();
      return;
    }

    const codigo = await calcularCodigoDisponible(salida, zona);
    if (!codigo) return alert("No hay espacio disponible.");

    const res = await fetch("http://localhost:3000/api/contenedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo, numero, tipo: zona, tamano, peso, descripcion, fecha_llegada: llegada, fecha_salida: salida, zona, posicion: "pendiente" })
    });
    if (res.ok) {
      pintarCelda(codigo, zona, numero);
      modalAgregar.style.display = "none";
      document.getElementById("formulario-agregar").reset();
    } else {
      const err = await res.json();
      alert(err.error || "Error al guardar");
    }
  });

  function obtenerZonaDesdeHTML() {
    const url = location.pathname.toLowerCase();
    return url.includes("normal") ? "Normal" :
           url.includes("peligroso") ? "Peligroso" :
           url.includes("refrigeracion") ? "Refrigerado" :
           url.includes("vacio") ? "Vacío" : "Desconocido";
  }

  function pintarCelda(codigo, tipo, numero) {
    const celda = document.querySelector(`.layout-cell[data-codigo="${codigo}"]`);
    if (!celda) {
      console.error("Celda no encontrada para:", codigo);
      return;
    }

    const colores = {
      normal: "#d4edda",
      peligroso: "#f8d7da",
      refrigerado: "#d1ecf1",
      vacío: "#e2e3e5"
    };
    celda.style.backgroundColor = colores[tipo.toLowerCase()] || colores.normal;
    celda.textContent = numero;
    celda.onclick = () => mostrarInfo(codigo);
  }

  async function calcularCodigoDisponible(salida, zona) {
    const res = await fetch("http://localhost:3000/api/contenedores");
    const data = await res.json();
    for (let f = 7; f >= 1; f--) {
      for (let c of columnas) {
        let cod = c + String(f).padStart(2, "0");
        if (!data.find(x => x.codigo === cod && x.zona.toLowerCase() === zona.toLowerCase())) {
          return cod;
        }
      }
    }
    return null;
  }

  async function cargarContenedores() {
    generarLayout();
    const res = await fetch("http://localhost:3000/api/contenedores");
    const data = await res.json();
    data.forEach(c => {
      if (c.zona.toLowerCase() === obtenerZonaDesdeHTML().toLowerCase()) {
        pintarCelda(c.codigo, c.tipo, c.numero);
      }
    });
  }

  async function mostrarInfo(codigo) {
    const res = await fetch("http://localhost:3000/api/contenedores");
    const data = await res.json();
    const c = data.find(x => x.codigo === codigo);
    if (!c) return alert("Contenedor no encontrado");

    contenedorActual = c;
    document.getElementById("info-contenedor").innerHTML = `
      <p><strong>Código:</strong> ${c.codigo}</p>
      <p><strong>Número:</strong> ${c.numero}</p>
      <p><strong>Z/T:</strong> ${c.tipo}</p>
      <p><strong>Tamaño:</strong> ${c.tamano}</p>
      <p><strong>Peso:</strong> ${c.peso}</p>
      <p><strong>Desc:</strong> ${c.descripcion}</p>
      <p><strong>Llegada:</strong> ${new Date(c.fecha_llegada).toLocaleDateString()}</p>
      <p><strong>Salida:</strong> ${new Date(c.fecha_salida).toLocaleDateString()}</p>
    `;
    modalInfo.style.display = "flex";
  }

  document.getElementById("editar-btn").addEventListener("click", () => {
    if (!contenedorActual) return;
    modalInfo.style.display = "none";
    modalAgregar.style.display = "flex";
    document.getElementById("numero-contenedor").value = contenedorActual.numero;
    document.getElementById("tamano-contenedor").value = contenedorActual.tamano;
    document.getElementById("peso").value = contenedorActual.peso;
    document.getElementById("descripcion-mercancia").value = contenedorActual.descripcion;
    document.getElementById("fecha-llegada").value = contenedorActual.fecha_llegada;
    document.getElementById("fecha-salida").value = contenedorActual.fecha_salida;
  });

  document.getElementById("eliminar-btn").addEventListener("click", async () => {
    if (!contenedorActual) return;
    if (!confirm("¿Eliminar este contenedor?")) return;
    await fetch(`http://localhost:3000/api/contenedores/${contenedorActual.id}`, { method: "DELETE" });
    location.reload();
  });

  await cargarContenedores();
});
