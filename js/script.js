document.addEventListener("DOMContentLoaded", async function () {
  const modalAgregar = document.getElementById("modal-agregar");
  const modalInfo = document.getElementById("modal-info");
  const abrirModalBtn = document.getElementById("abrir-formulario");
  const layoutGrid = document.getElementById("layoutGrid");
  const letras = "ABCDEFG".split("");
  const columnas = letras.slice(0, 7);
  let contenedorActual = null;

  function generarLayout() {
    layoutGrid.innerHTML = "";
    layoutGrid.style.gridTemplateColumns = `repeat(${columnas.length + 1}, 1fr)`;
    layoutGrid.appendChild(document.createElement("div"));
    columnas.forEach((letra, i) => {
      const header = document.createElement("div");
      header.className = "layout-col-label";
      header.textContent = letra;
      header.style.gridColumn = i + 2;
      layoutGrid.appendChild(header);
    });
    for (let fila = 7; fila >= 1; fila--) {
      const filaLabel = document.createElement("div");
      filaLabel.className = "layout-row-label";
      filaLabel.textContent = `${String(fila).padStart(2, "0")}-`;
      layoutGrid.appendChild(filaLabel);
      for (let i = 0; i < columnas.length; i++) {
        const cell = document.createElement("div");
        cell.className = "layout-cell";
        layoutGrid.appendChild(cell);
      }
    }
  }

  abrirModalBtn.addEventListener("click", () => {
    contenedorActual = null;
    document.getElementById("formulario-agregar").reset();
    modalAgregar.style.display = "flex";
  });

  window.addEventListener("click", e => {
    if (e.target === modalAgregar) modalAgregar.style.display = "none";
    if (e.target === modalInfo) modalInfo.style.display = "none";
  });

  document.getElementById("close-agregar").onclick = () => modalAgregar.style.display = "none";
  document.getElementById("close-info").onclick = () => modalInfo.style.display = "none";

  await cargarYRenderizar();

  document.getElementById("guardar-contenedor").addEventListener("click", async () => {
    const numero = document.getElementById("numero-contenedor").value.trim();
    const tamano = document.getElementById("tamano-contenedor").value.trim();
    const peso = document.getElementById("peso").value.trim();
    const descripcion = document.getElementById("descripcion-mercancia").value.trim();
    const llegada = document.getElementById("fecha-llegada").value;
    const salida = document.getElementById("fecha-salida").value;
    const zona = obtenerZonaDesdeHTML();
    const tipo = zona;

    if (!numero || !tamano || !peso || !descripcion || !llegada || !salida) {
      return alert("Todos los campos son obligatorios.");
    }

    const diasEstadia = Math.ceil((new Date(salida) - new Date(llegada)) / (1000 * 60 * 60 * 24));
    const columnaLetra = obtenerColumnaPorDias(diasEstadia);

    if (!columnaLetra) {
      return alert(`⛔ No se puede asignar contenedor con estancia de ${diasEstadia} días. Solo se permite de 1 a 27 días.`);
    }

    const codigo = await buscarCodigoVertical(columnaLetra);
    if (!codigo) {
      return alert(`❌ No hay espacio disponible en la columna ${columnaLetra} (estancia de ${diasEstadia} días).`);
    }

    const res = await fetch("http://localhost:3000/api/contenedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero, tipo, tamano, peso, descripcion,
        fecha_llegada: llegada,
        fecha_salida: salida,
        zona
      })
    });

    const json = await res.json();
    if (res.ok) {
      pintarCelda(json.id, json.codigo, json.tipo, json.numero);
      alert(`✅ Contenedor agregado en ${json.codigo}`);
      modalAgregar.style.display = "none";
    } else {
      alert(json.error || "Error al guardar.");
    }
  });

  function obtenerColumnaPorDias(dias) {
    if (dias >= 1 && dias <= 3) return 'A';
    if (dias >= 4 && dias <= 7) return 'B';
    if (dias >= 8 && dias <= 11) return 'C';
    if (dias >= 12 && dias <= 15) return 'D';
    if (dias >= 16 && dias <= 19) return 'E';
    if (dias >= 20 && dias <= 23) return 'F';
    if (dias >= 24 && dias <= 27) return 'G';
    return null;
  }

  async function buscarCodigoVertical(columnaLetra) {
    const res = await fetch("http://localhost:3000/api/contenedores");
    const contenedores = await res.json();
    const ocupados = new Set(contenedores.map(c => c.codigo));

    for (let fila = 1; fila <= 7; fila++) {
      const codigo = columnaLetra + String(fila).padStart(2, "0");
      if (!ocupados.has(codigo)) {
        return codigo;
      }
    }
    return null;
  }

  function obtenerZonaDesdeHTML() {
    const url = location.pathname.toLowerCase();
    if (url.includes("normal")) return "Normal";
    if (url.includes("peligroso")) return "Peligroso";
    if (url.includes("refrigeracion")) return "Refrigerado";
    if (url.includes("vacio")) return "Vacío";
    return "Desconocido";
  }

  function pintarCelda(id, codigo, tipo, numero) {
    const col = codigo[0];
    const fil = codigo.slice(1);
    const colIndex = columnas.indexOf(col);
    const filIndex = 7 - parseInt(fil, 10);
    const idx = filIndex * columnas.length + colIndex;

    const celda = document.querySelectorAll(".layout-cell")[idx];
    if (!celda) return;

    const colores = {
      normal: "#d4edda",
      peligroso: "#f8d7da",
      refrigerado: "#d1ecf1",
      vacío: "#e2e3e5"
    };

    celda.style.backgroundColor = colores[tipo.toLowerCase()] || colores.normal;
    celda.textContent = numero;
    celda.onclick = () => mostrarInfo(id);
  }

  async function cargarYRenderizar() {
    generarLayout();
    const res = await fetch("http://localhost:3000/api/contenedores");
    const data = await res.json();
    data.forEach(c => {
      pintarCelda(c.id, c.codigo, c.tipo, c.numero);
    });
  }

  async function mostrarInfo(id) {
    const res = await fetch("http://localhost:3000/api/contenedores");
    const data = await res.json();
    const c = data.find(x => x.id === id);
    if (!c) return;
    contenedorActual = c;
    document.getElementById("info-contenedor").innerHTML = `
      <p><strong>Código:</strong> ${c.codigo}</p>
      <p><strong>Número:</strong> ${c.numero}</p>
      <p><strong>Tipo:</strong> ${c.tipo}</p>
      <p><strong>Tamaño:</strong> ${c.tamano}</p>
      <p><strong>Peso:</strong> ${c.peso}</p>
      <p><strong>Descripción:</strong> ${c.descripcion}</p>
      <p><strong>Llegada:</strong> ${new Date(c.fecha_llegada).toLocaleDateString()}</p>
      <p><strong>Salida:</strong> ${new Date(c.fecha_salida).toLocaleDateString()}</p>
    `;
    modalInfo.style.display = "flex";
  }

  document.getElementById("editar-btn").onclick = () => {
    if (!contenedorActual) return;
    modalInfo.style.display = "none";
    modalAgregar.style.display = "flex";
    Object.keys(contenedorActual).forEach(key => {
      if (["numero", "tamano", "peso", "descripcion", "fecha_llegada", "fecha_salida"].includes(key)) {
        document.getElementById({
          numero: "numero-contenedor",
          tamano: "tamano-contenedor",
          peso: "peso",
          descripcion: "descripcion-mercancia",
          fecha_llegada: "fecha-llegada",
          fecha_salida: "fecha-salida"
        }[key]).value = contenedorActual[key];
      }
    });
  };

  document.getElementById("eliminar-btn").onclick = async () => {
    if (!contenedorActual) return;
    if (!confirm("Eliminar contenedor?")) return;
    const res = await fetch(`http://localhost:3000/api/contenedores/${contenedorActual.id}`, { method: "DELETE" });
    if (res.ok) {
      alert("Contenedor eliminado");
      await cargarYRenderizar();
      modalInfo.style.display = "none";
    } else {
      alert("Error al eliminar");
    }
  };
});
