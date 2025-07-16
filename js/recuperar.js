document.getElementById("formulario-recuperar").addEventListener("submit", async function (e) {
  e.preventDefault();

  const usuario = document.getElementById("usuario").value.trim();
  const nombres = document.getElementById("nombres").value.trim();
  const apellidos = document.getElementById("apellidos").value.trim();
  const nuevaContraseña = document.getElementById("nueva-contraseña").value;

  try {
    const response = await fetch("http://localhost:3000/api/recuperar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ usuario, nombres, apellidos, nuevaContraseña })
    });

    const data = await response.json();
    if (data.success) {
      alert("Contraseña actualizada exitosamente.");
      window.location.href = "login.html";
    } else {
      alert(data.error || "Datos incorrectos, intenta de nuevo.");
    }
  } catch (err) {
    console.error("Error en recuperación:", err);
    alert("No se pudo conectar con el servidor.");
  }
});
