document.addEventListener("DOMContentLoaded", function () {
    const modalAgregar = document.getElementById("modal-agregar");
    const modalInfo = document.getElementById("modal-info");
    const modalEditar = document.getElementById("modal-editar");
    const abrirModalBtn = document.getElementById("abrir-formulario");
    const cerrarModalBtns = document.querySelectorAll(".cerrar-modal");
    const formularioAgregar = document.getElementById("formulario-agregar");
    const formularioEditar = document.getElementById("formulario-editar");
    const infoContenedor = document.getElementById("info-contenedor");
    let bloqueSeleccionado = null;

    // Cargar contenedores al iniciar la página
    cargarContenedores();

    // Abrir modal de agregar
    abrirModalBtn.addEventListener("click", function () {
        modalAgregar.style.display = "flex";
    });

    // Cerrar modales
    cerrarModalBtns.forEach((btn) => {
        btn.addEventListener("click", function () {
            modalAgregar.style.display = "none";
            modalInfo.style.display = "none";
            modalEditar.style.display = "none";
        });
    });

    // Cerrar modales al hacer clic fuera del contenido
    window.addEventListener("click", function (e) {
        if (e.target === modalAgregar || e.target === modalInfo || e.target === modalEditar) {
            modalAgregar.style.display = "none";
            modalInfo.style.display = "none";
            modalEditar.style.display = "none";
        }
    });

    // Agregar nuevo contenedor
    formularioAgregar.addEventListener("submit", function (e) {
        e.preventDefault();

        const codigo = document.getElementById("codigo").value.trim();
        const numeroContenedor = document.getElementById("numero-contenedor").value.trim();
        const tipoContenedor = document.getElementById("tipo-contenedor").value;
        const tamanoContenedor = document.getElementById("tamano-contenedor").value.trim();
        const peso = document.getElementById("peso").value.trim();
        const descripcionMercancia = document.getElementById("descripcion-mercancia").value.trim();

        if (!codigo || !numeroContenedor || !tipoContenedor || !tamanoContenedor || !peso || !descripcionMercancia) {
            alert("Por favor, completa todos los campos.");
            return;
        }

        // Enviar datos al backend
        fetch("http://localhost:3000/api/espacios", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                codigo,
                numero_contenedor: numeroContenedor,
                tipo_contenedor: tipoContenedor,
                tamano_contenedor: tamanoContenedor,
                peso,
                descripcion_mercancia: descripcionMercancia,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    alert(data.error);
                } else {
                    // Recargar los contenedores después de agregar uno nuevo
                    cargarContenedores();
                    // Limpiar el formulario y cerrar el modal
                    formularioAgregar.reset();
                    modalAgregar.style.display = "none";
                }
            })
            .catch((error) => {
                console.error("Error al enviar los datos:", error);
                alert("Hubo un error al agregar el espacio.");
            });
    });

    // Función para cargar los contenedores desde la base de datos
    function cargarContenedores() {
        fetch("http://localhost:3000/api/espacios")
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    console.error("Error al cargar los contenedores:", data.error);
                } else {
                    // Limpiar las secciones antes de cargar los contenedores
                    document.querySelectorAll(".bloques").forEach((seccion) => {
                        seccion.innerHTML = "";
                    });

                    // Mostrar los contenedores en sus secciones correspondientes
                    data.forEach((contenedor) => {
                        const seccion = document.getElementById(contenedor.tipo_contenedor);
                        if (seccion) {
                            const nuevoBloque = document.createElement("div");
                            nuevoBloque.classList.add("bloque");
                            nuevoBloque.dataset.codigo = contenedor.codigo;
                            nuevoBloque.dataset.numero = contenedor.numero_contenedor;
                            nuevoBloque.dataset.tipo = contenedor.tipo_contenedor;
                            nuevoBloque.dataset.tamano = contenedor.tamano_contenedor;
                            nuevoBloque.dataset.peso = contenedor.peso;
                            nuevoBloque.dataset.descripcion = contenedor.descripcion_mercancia;
                            nuevoBloque.textContent = contenedor.codigo;

                            // Aplicar color según el tipo
                            switch (contenedor.tipo_contenedor) {
                                case "normal":
                                    nuevoBloque.style.backgroundColor = "#2ecc71";
                                    break;
                                case "peligroso":
                                    nuevoBloque.style.backgroundColor = "#e74c3c";
                                    break;
                                case "refrigerado":
                                    nuevoBloque.style.backgroundColor = "#3498db";
                                    break;
                                case "vacío":
                                    nuevoBloque.style.backgroundColor = "#95a5a6";
                                    break;
                            }

                            // Agregar evento de clic para mostrar la información del contenedor
                            nuevoBloque.addEventListener("click", function () {
                                mostrarInformacionContenedor(contenedor);
                                bloqueSeleccionado = nuevoBloque;
                            });

                            seccion.appendChild(nuevoBloque);
                        }
                    });
                }
            })
            .catch((error) => {
                console.error("Error al cargar los contenedores:", error);
            });
    }

    // Función para mostrar la información del contenedor
    function mostrarInformacionContenedor(contenedor) {
        // Mostrar la información en el modal
        infoContenedor.innerHTML = `
            <p><strong>Código:</strong> ${contenedor.codigo}</p>
            <p><strong>Número de Contenedor:</strong> ${contenedor.numero_contenedor}</p>
            <p><strong>Tipo de Contenedor:</strong> ${contenedor.tipo_contenedor}</p>
            <p><strong>Tamaño del Contenedor:</strong> ${contenedor.tamano_contenedor}</p>
            <p><strong>Peso:</strong> ${contenedor.peso} kg</p>
            <p><strong>Descripción de la Mercancía:</strong> ${contenedor.descripcion_mercancia}</p>
        `;

        // Mostrar el modal de información
        modalInfo.style.display = "flex";
    }

    // Función para liberar un espacio (eliminar contenedor)
    document.getElementById("liberar-espacio").addEventListener("click", function () {
        const codigo = bloqueSeleccionado.dataset.codigo;

        fetch(`http://localhost:3000/api/espacios/${codigo}`, {
            method: "DELETE",
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    alert(data.error);
                } else {
                    alert("Espacio liberado correctamente");
                    cargarContenedores(); // Recargar los contenedores
                    modalInfo.style.display = "none"; // Cerrar el modal
                }
            })
            .catch((error) => {
                console.error("Error al liberar el espacio:", error);
                alert("Hubo un error al liberar el espacio");
            });
    });

    // Función para editar un contenedor
    document.getElementById("editar-contenedor").addEventListener("click", function () {
        const contenedor = {
            codigo: bloqueSeleccionado.dataset.codigo,
            numero_contenedor: bloqueSeleccionado.dataset.numero,
            tipo_contenedor: bloqueSeleccionado.dataset.tipo,
            tamano_contenedor: bloqueSeleccionado.dataset.tamano,
            peso: bloqueSeleccionado.dataset.peso,
            descripcion_mercancia: bloqueSeleccionado.dataset.descripcion,
        };

        // Llenar el formulario de edición con los datos actuales
        document.getElementById("codigo-editar").value = contenedor.codigo;
        document.getElementById("numero-contenedor-editar").value = contenedor.numero_contenedor;
        document.getElementById("tipo-contenedor-editar").value = contenedor.tipo_contenedor;
        document.getElementById("tamano-contenedor-editar").value = contenedor.tamano_contenedor;
        document.getElementById("peso-editar").value = contenedor.peso;
        document.getElementById("descripcion-mercancia-editar").value = contenedor.descripcion_mercancia;

        // Mostrar el modal de edición
        modalEditar.style.display = "flex";
    });

    // Enviar datos editados al backend
    formularioEditar.addEventListener("submit", function (e) {
        e.preventDefault();

        const codigo = document.getElementById("codigo-editar").value;
        const numeroContenedor = document.getElementById("numero-contenedor-editar").value;
        const tipoContenedor = document.getElementById("tipo-contenedor-editar").value;
        const tamanoContenedor = document.getElementById("tamano-contenedor-editar").value;
        const peso = document.getElementById("peso-editar").value;
        const descripcionMercancia = document.getElementById("descripcion-mercancia-editar").value;

        fetch(`http://localhost:3000/api/espacios/${codigo}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                numero_contenedor: numeroContenedor,
                tipo_contenedor: tipoContenedor,
                tamano_contenedor: tamanoContenedor,
                peso: peso,
                descripcion_mercancia: descripcionMercancia,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    alert(data.error);
                } else {
                    alert("Contenedor actualizado correctamente");
                    cargarContenedores(); // Recargar los contenedores
                    modalEditar.style.display = "none"; // Cerrar el modal
                }
            })
            .catch((error) => {
                console.error("Error al editar el contenedor:", error);
                alert("Hubo un error al editar el contenedor");
            });
    });

    // Filtrar por tipo de contenedor
    document.getElementById("filtrar").addEventListener("change", function () {
        const tipoSeleccionado = this.value; // Obtener el valor seleccionado

        // Ocultar todos los bloques
        document.querySelectorAll(".bloque").forEach((bloque) => {
            bloque.style.display = "none";
        });

        // Mostrar solo los bloques del tipo seleccionado
        if (tipoSeleccionado === "todos") {
            document.querySelectorAll(".bloque").forEach((bloque) => {
                bloque.style.display = "block";
            });
        } else {
            document.querySelectorAll(`.bloque[data-tipo="${tipoSeleccionado}"]`).forEach((bloque) => {
                bloque.style.display = "block";
            });
        }
    });

    // Buscar por código
    document.getElementById("buscar").addEventListener("input", function () {
        const codigoBusqueda = this.value.trim().toUpperCase(); // Obtener el código ingresado

        // Ocultar todos los bloques
        document.querySelectorAll(".bloque").forEach((bloque) => {
            bloque.style.display = "none";
        });

        // Mostrar solo los bloques que coincidan con el código
        if (codigoBusqueda === "") {
            document.querySelectorAll(".bloque").forEach((bloque) => {
                bloque.style.display = "block";
            });
        } else {
            document.querySelectorAll(".bloque").forEach((bloque) => {
                if (bloque.dataset.codigo.toUpperCase().includes(codigoBusqueda)) {
                    bloque.style.display = "block";
                }
            });
        }
    });

    // Botón para ir al login
    document.getElementById("ir-login").addEventListener("click", function () {
        window.location.href = "../html/login.html";
    });
});