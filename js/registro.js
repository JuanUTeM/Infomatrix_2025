document.getElementById("formulario-registro").addEventListener("submit", function (e) {
    e.preventDefault();

    const nombres = document.getElementById("nombres-registro").value;
    const apellidos = document.getElementById("apellidos-registro").value;
    const usuario = document.getElementById("usuario-registro").value;
    const contraseña = document.getElementById("contraseña-registro").value;

    fetch("http://localhost:3000/api/registro", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombres, apellidos, usuario, contraseña }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                alert(data.error);
            } else {
                alert("Usuario registrado correctamente");
                window.location.href = "../html/login.html";
            }
        })
        .catch((error) => {
            console.error("Error al registrar el usuario:", error);
            alert("Hubo un error al registrar el usuario");
        });
});