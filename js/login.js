document.getElementById('login-form').addEventListener('submit', async function (event) {
  event.preventDefault();

  const usuario = document.getElementById('usuario').value;
  const contraseña = document.getElementById('contraseña').value;

  if (!usuario || !contraseña) {
    alert('Por favor completa todos los campos');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ usuario, contraseña })
    });

    const data = await response.json();

    if (response.ok) {
      alert('Inicio de sesión exitoso');
      // Guardar sesión (opcional)
      localStorage.setItem('usuario', usuario);
      // Redirigir
      window.location.href = 'mapeo_patio.html';
    } else {
      alert(data.error || 'Usuario o contraseña incorrectos');
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    alert('No se pudo conectar con el servidor');
  }
});
