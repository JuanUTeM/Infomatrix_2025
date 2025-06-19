const columnas = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const filas = ['01', '02', '03', '04', '05', '06', '07']; // 01 es el suelo

async function calcularCodigoDisponible(fecha_salida, zona) {
  try {
    const res = await fetch("http://localhost:3000/api/contenedores");
    const contenedores = await res.json();
    const ocupados = contenedores.filter(c => c.zona === zona);

    for (let f of filas) {
      for (let c of columnas) {
        const codigo = `${c}${f}`;
        const ocupado = ocupados.find(o => o.codigo === codigo);

        if (!ocupado) return codigo;

        const salidaExistente = new Date(ocupado.fecha_salida);
        const salidaNueva = new Date(fecha_salida);
        if (salidaNueva <= salidaExistente) continue;
      }
    }

    return null;
  } catch (e) {
    console.error("Error al calcular código:", e);
    return null;
  }
}
