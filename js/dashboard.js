document.addEventListener("DOMContentLoaded", function () {
    const tablaContenedores = document.getElementById("tabla-contenedores").getElementsByTagName("tbody")[0];
    let contenedores = [];
    let paginaActual = 1;
    const contenedoresPorPagina = 10;

    // Función para cargar los contenedores desde el backend
    function cargarContenedores() {
        return fetch("http://localhost:3000/api/espacios")
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    console.error("Error al cargar los contenedores:", data.error);
                } else {
                    contenedores = data;
                    mostrarPagina(contenedores, paginaActual);
                    crearGraficas(contenedores);
                }
            })
            .catch((error) => {
                console.error("Error al cargar los contenedores:", error);
            });
    }

    // Función para mostrar una página específica de contenedores
    function mostrarPagina(contenedores, pagina) {
        const inicio = (pagina - 1) * contenedoresPorPagina;
        const fin = inicio + contenedoresPorPagina;
        const contenedoresPagina = contenedores.slice(inicio, fin);

        tablaContenedores.innerHTML = "";

        contenedoresPagina.forEach((contenedor) => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${contenedor.codigo}</td>
                <td>${contenedor.numero_contenedor}</td>
                <td>${contenedor.tipo_contenedor}</td>
                <td>${contenedor.tamano_contenedor}</td>
                <td>${contenedor.peso}</td>
                <td>${contenedor.descripcion_mercancia}</td>
            `;
            tablaContenedores.appendChild(fila);
        });

        document.getElementById("numero-pagina").textContent = `Página ${pagina}`;
    }

    // Función para crear gráficas con Highcharts
    function crearGraficas(contenedores) {
        const tipos = ["normal", "peligroso", "refrigerado", "vacío"];
        const conteoTipos = tipos.map(tipo => contenedores.filter(c => c.tipo_contenedor === tipo).length);
        const pesosPromedio = tipos.map(tipo => {
            const contenedoresTipo = contenedores.filter(c => c.tipo_contenedor === tipo);
            const totalPeso = contenedoresTipo.reduce((sum, c) => sum + parseFloat(c.peso), 0);
            return contenedoresTipo.length > 0 ? totalPeso / contenedoresTipo.length : 0;
        });

        // Gráfica de distribución por tipo
        Highcharts.chart("grafica-tipos", {
            chart: {
                type: "column"
            },
            title: {
                text: "Distribución de Contenedores por Tipo"
            },
            xAxis: {
                categories: tipos
            },
            yAxis: {
                title: {
                    text: "Cantidad de Contenedores"
                }
            },
            series: [{
                name: "Cantidad",
                data: conteoTipos,
                colorByPoint: true,
                colors: ["#2ecc71", "#e74c3c", "#3498db", "#95a5a6"]
            }]
        });

        // Gráfica de peso promedio por tipo
        Highcharts.chart("grafica-pesos", {
            chart: {
                type: "column"
            },
            title: {
                text: "Peso Promedio de Contenedores por Tipo"
            },
            xAxis: {
                categories: tipos
            },
            yAxis: {
                title: {
                    text: "Peso Promedio (kg)"
                }
            },
            series: [{
                name: "Peso Promedio",
                data: pesosPromedio,
                colorByPoint: true,
                colors: ["#2ecc71", "#e74c3c", "#3498db", "#95a5a6"]
            }]
        });
    }

    // Filtrado por tipo de contenedor
    document.getElementById("filtrar-tipo").addEventListener("change", function () {
        const tipoSeleccionado = this.value;
        const filas = document.querySelectorAll("#tabla-contenedores tbody tr");

        filas.forEach((fila) => {
            const tipoContenedor = fila.cells[2].textContent.toLowerCase();
            if (tipoSeleccionado === "todos" || tipoContenedor === tipoSeleccionado) {
                fila.style.display = "";
            } else {
                fila.style.display = "none";
            }
        });
    });

    // Búsqueda por código o número
    document.getElementById("buscar-contenedor").addEventListener("input", function () {
        const busqueda = this.value.trim().toLowerCase();
        const filas = document.querySelectorAll("#tabla-contenedores tbody tr");

        filas.forEach((fila) => {
            const codigo = fila.cells[0].textContent.toLowerCase();
            const numero = fila.cells[1].textContent.toLowerCase();
            if (codigo.includes(busqueda) || numero.includes(busqueda)) {
                fila.style.display = "";
            } else {
                fila.style.display = "none";
            }
        });
    });

    // Exportar a Excel
    document.getElementById("exportar-excel").addEventListener("click", function () {
        const tabla = document.getElementById("tabla-contenedores");
        const filas = tabla.querySelectorAll("tr");
        const datos = [];

        filas.forEach((fila) => {
            const celdas = fila.querySelectorAll("td, th");
            const filaDatos = Array.from(celdas).map((celda) => celda.textContent);
            datos.push(filaDatos);
        });

        const libro = XLSX.utils.book_new();
        const hoja = XLSX.utils.aoa_to_sheet(datos);
        XLSX.utils.book_append_sheet(libro, hoja, "Contenedores");
        XLSX.writeFile(libro, "contenedores.xlsx");
    });

    // Paginación
    document.getElementById("siguiente-pagina").addEventListener("click", function () {
        if (paginaActual < Math.ceil(contenedores.length / contenedoresPorPagina)) {
            paginaActual++;
            mostrarPagina(contenedores, paginaActual);
        }
    });

    document.getElementById("anterior-pagina").addEventListener("click", function () {
        if (paginaActual > 1) {
            paginaActual--;
            mostrarPagina(contenedores, paginaActual);
        }
    });

    // Cerrar sesión
    document.getElementById("cerrar-sesion").addEventListener("click", function () {
        window.location.href = "../html/login.html";
    });

    // Cargar los contenedores al iniciar la página
    cargarContenedores();
});