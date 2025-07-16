const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "root",
  database: "infomatrix"
};

function obtenerColumnaPorDias(dias) {
  if (dias <= 3) return 'A';
  if (dias <= 7) return 'B';
  if (dias <= 11) return 'C';
  if (dias <= 15) return 'D';
  if (dias <= 19) return 'E';
  if (dias <= 23) return 'F';
  if (dias <= 27) return 'G';
  if (dias <= 31) return 'H';
  return null;
}

async function encontrarCodigoDisponible(tabla, diasEstadia, tamano, grupoSeleccionado) {
  const baseCol = obtenerColumnaPorDias(diasEstadia);
  if (!baseCol) return null;

  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute(`SELECT codigo, tamano FROM \`${tabla}\``);
  await conn.end();

  const ocupacion = {};
  for (const row of rows) {
    if (!ocupacion[row.codigo]) ocupacion[row.codigo] = [];
    ocupacion[row.codigo].push(row.tamano);
  }

  const colName = grupoSeleccionado === 1 ? baseCol : `${baseCol}${grupoSeleccionado}`;
  const filasMax = 7;

  for (let f = 1; f <= filasMax; f++) {
    const cod = colName + String(f).padStart(2, "0");
    const ocupantes = ocupacion[cod] || [];

    if (tamano === "40" && ocupantes.length === 0) return cod;

    if (tamano === "20") {
      if (ocupantes.length === 0) return cod;
      if (ocupantes.length === 1 && ocupantes[0] === "20") return cod;
    }
  }

  return null;
}

async function reordenarZona(tabla) {
  const conn = await mysql.createConnection(dbConfig);
  const letrasBase = "ABCDEFGH";

  for (const base of letrasBase) {
    for (let grupo = 1; grupo <= 50; grupo++) {
      const colName = grupo === 1 ? base : `${base}${grupo}`;
      const [contenedores] = await conn.execute(
        `SELECT id, tamano, fecha_salida FROM \`${tabla}\` WHERE codigo LIKE ? ORDER BY fecha_salida ASC`,
        [`${colName}%`]
      );

      if (!contenedores.length) break;

      const de40 = contenedores.filter(c => c.tamano === "40").reverse();
      const de20 = contenedores.filter(c => c.tamano === "20").reverse();

      let fila = 1;
      for (const c40 of de40) {
        const nuevoCodigo = colName + String(fila).padStart(2, "0");
        await conn.execute(`UPDATE \`${tabla}\` SET codigo = ? WHERE id = ?`, [nuevoCodigo, c40.id]);
        fila++;
      }

      for (let i = 0; i < de20.length; i += 2) {
        const nuevoCodigo = colName + String(fila).padStart(2, "0");
        await conn.execute(`UPDATE \`${tabla}\` SET codigo = ? WHERE id = ?`, [nuevoCodigo, de20[i].id]);
        if (i + 1 < de20.length) {
          await conn.execute(`UPDATE \`${tabla}\` SET codigo = ? WHERE id = ?`, [nuevoCodigo, de20[i + 1].id]);
        }
        fila++;
      }
    }
  }

  await conn.end();
}

app.post("/api/contenedores", async (req, res) => {
  let { numero, tipo, tamano, peso, descripcion, fecha_llegada, fecha_salida, zona, grupo, tabla } = req.body;

  grupo = parseInt(grupo) || 1;
  tabla = tabla || "contenedores";

  if (!numero || !tipo || !tamano || !peso || !descripcion || !fecha_llegada || !fecha_salida || !zona)
    return res.status(400).json({ error: "Todos los campos son obligatorios" });

  const diasEstadia = Math.ceil((new Date(fecha_salida) - new Date(fecha_llegada)) / (1000 * 60 * 60 * 24));
  if (diasEstadia < 1 || diasEstadia > 31)
    return res.status(400).json({ error: "La estancia debe ser de 1 a 31 días máximo." });

  const conn = await mysql.createConnection(dbConfig);
  const [dup] = await conn.execute(`SELECT * FROM \`${tabla}\` WHERE numero = ?`, [numero]);
  if (dup.length) {
    await conn.end();
    return res.status(400).json({ error: "Número de contenedor ya existe" });
  }

  const codigo = await encontrarCodigoDisponible(tabla, diasEstadia, tamano, grupo);
  if (!codigo) {
    await conn.end();
    return res.status(400).json({ error: "No hay espacio disponible en la columna correspondiente" });
  }

  await conn.execute(
    `INSERT INTO \`${tabla}\` (codigo, numero, tipo, tamano, peso, descripcion, fecha_llegada, fecha_salida, zona, posicion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    [codigo, numero, tipo, tamano, peso, descripcion, fecha_llegada, fecha_salida, zona]
  );

  await conn.end();
  res.status(201).json({ message: "Contenedor agregado correctamente", codigo });
});

app.get("/api/contenedores", async (req, res) => {
  const tabla = req.query.tabla || "contenedores";
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute(`SELECT * FROM \`${tabla}\``);
  await conn.end();
  res.json(rows);
});

app.put("/api/contenedores/:id", async (req, res) => {
  const { id } = req.params;
  const { numero, tipo, tamano, peso, descripcion, fecha_llegada, fecha_salida, zona, tabla } = req.body;
  const tablaFinal = tabla || "contenedores";

  if (!numero || !tipo || !tamano || !peso || !descripcion || !fecha_llegada || !fecha_salida || !zona)
    return res.status(400).json({ error: "Todos los campos son obligatorios" });

  const conn = await mysql.createConnection(dbConfig);

  const [existe] = await conn.execute(`SELECT * FROM \`${tablaFinal}\` WHERE id = ?`, [id]);
  if (!existe.length) {
    await conn.end();
    return res.status(404).json({ error: "Contenedor no encontrado" });
  }

  await conn.execute(
    `UPDATE \`${tablaFinal}\` SET numero = ?, tipo = ?, tamano = ?, peso = ?, descripcion = ?, fecha_llegada = ?, fecha_salida = ?, zona = ? WHERE id = ?`,
    [numero, tipo, tamano, peso, descripcion, fecha_llegada, fecha_salida, zona, id]
  );

  await conn.end();
  res.json({ message: "Contenedor actualizado correctamente" });
});

app.delete("/api/contenedores/:id", async (req, res) => {
  const { id } = req.params;
  const tabla = req.query.tabla || "contenedores";

  const conn = await mysql.createConnection(dbConfig);
  const [row] = await conn.execute(`SELECT zona FROM \`${tabla}\` WHERE id = ?`, [id]);
  if (!row.length) {
    await conn.end();
    return res.status(404).json({ error: "Contenedor no encontrado" });
  }

  const zona = row[0].zona;
  await conn.execute(`DELETE FROM \`${tabla}\` WHERE id = ?`, [id]);
  await conn.end();

  await reordenarZona(tabla);
  res.json({ message: "Contenedor eliminado y columna reordenada" });
});

app.post("/api/contenedores/reordenar", async (req, res) => {
  const { zona, tabla } = req.body;
  if (!zona || !tabla) return res.status(400).json({ error: "Zona y tabla requeridas" });

  await reordenarZona(tabla);
  res.json({ message: "Zona reordenada correctamente" });
});

// ✅ Ruta de inicio de sesión
app.post("/api/login", async (req, res) => {
  const { usuario, contraseña } = req.body;

  if (!usuario || !contraseña) {
    return res.status(400).json({ error: "Faltan campos" });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute("SELECT * FROM usuarios WHERE usuario = ?", [usuario]);
    await conn.end();

    if (rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = rows[0];
    const passwordValida = await bcrypt.compare(contraseña, user.contraseña);

    if (!passwordValida) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    res.json({ message: "Inicio de sesión exitoso", usuario: user.usuario });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

app.post("/api/recuperar", async (req, res) => {
  const { usuario, nombres, apellidos, nuevaContraseña } = req.body;

  try {
    console.log("Datos recibidos para recuperación:", { usuario, nombres, apellidos });

    const conn = await mysql.createConnection(dbConfig);

    // Buscar usuario ignorando mayúsculas y espacios
    const [rows] = await conn.execute(
      `SELECT * FROM usuarios 
       WHERE LOWER(usuario) = LOWER(?) 
       AND LOWER(nombres) = LOWER(?) 
       AND LOWER(apellidos) = LOWER(?)`,
      [usuario.trim(), nombres.trim(), apellidos.trim()]
    );

    if (rows.length === 0) {
      await conn.end();
      return res.status(404).json({ error: "Datos incorrectos o no coinciden." });
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaContraseña, 10);

    // Actualizar contraseña
    await conn.execute(
      "UPDATE usuarios SET contraseña = ? WHERE LOWER(usuario) = LOWER(?)",
      [hashedPassword, usuario.trim()]
    );

    await conn.end();
    return res.json({ success: true });
  } catch (error) {
    console.error("Error en recuperación:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ✅ Ruta de registro de usuario
app.post("/api/registro", async (req, res) => {
  const { nombres, apellidos, usuario, contraseña } = req.body;

  if (!nombres || !apellidos || !usuario || !contraseña) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);

    // Verifica si el usuario ya existe
    const [rows] = await conn.execute("SELECT * FROM usuarios WHERE usuario = ?", [usuario]);
    if (rows.length > 0) {
      await conn.end();
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(contraseña, 10);

    await conn.execute(
      "INSERT INTO usuarios (nombres, apellidos, usuario, contraseña) VALUES (?, ?, ?, ?)",
      [nombres, apellidos, usuario, hashedPassword]
    );

    await conn.end();
    return res.json({ success: true });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    return res.status(500).json({ error: "Error al registrar el usuario" });
  }
});
