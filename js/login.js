document.getElementById("formulario-login").addEventListener("submit", function (e) {
    e.preventDefault();

    const usuario = document.getElementById("usuario-login").value;
    const contraseña = document.getElementById("contraseña-login").value;

    fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ usuario, contraseña }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                alert(data.error);
            } else {
                alert("Login exitoso");
                window.location.href = "../html/dashboard.html";
            }
        })
        .catch((error) => {
            console.error("Error al iniciar sesión:", error);
            alert("Hubo un error al iniciar sesión");
        });
});