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
  database: "INFOMATRIX"
};

const columnas = "ABCDEFG".split("");
const filas = 7;

// NUEVO: función para asignar columna según los días de estancia
function obtenerColumnaPorDias(dias) {
  if (dias >= 1 && dias <= 3) return ['A'];
  if (dias >= 4 && dias <= 7) return ['B'];
  if (dias >= 8 && dias <= 11) return ['C'];
  if (dias >= 12 && dias <= 15) return ['D'];
  if (dias >= 16 && dias <= 19) return ['E'];
  if (dias >= 20 && dias <= 23) return ['F'];
  if (dias >= 24 && dias <= 27) return ['G'];
  return null;
}

async function encontrarCodigoDisponible(zona, diasEstadia) {
  const columnasPermitidas = obtenerColumnaPorDias(diasEstadia);
  if (!columnasPermitidas) return null;

  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute(
    `SELECT codigo FROM contenedores WHERE zona = ?`,
    [zona]
  );
  await conn.end();

  const ocupados = new Set(rows.map(r => r.codigo));

  for (let f = 1; f <= filas; f++) {
    for (const col of columnasPermitidas) {
      const cod = col + String(f).padStart(2, "0");
      if (!ocupados.has(cod)) {
        if (f === 1 || ocupados.has(col + String(f - 1).padStart(2, "0"))) {
          return cod;
        }
      }
    }
  }
  return null;
}

async function reordenarZona(zona) {
  const conn = await mysql.createConnection(dbConfig);

  for (const col of columnas) {
    const [contenedores] = await conn.execute(
      `SELECT id FROM contenedores 
       WHERE zona = ? AND codigo LIKE ? 
       ORDER BY CAST(SUBSTRING(codigo, 2) AS UNSIGNED) ASC`,
      [zona, `${col}%`]
    );

    for (let i = 0; i < contenedores.length; i++) {
      const id = contenedores[i].id;
      const nuevoCodigo = col + String(i + 1).padStart(2, "0");
      await conn.execute(`UPDATE contenedores SET codigo = ? WHERE id = ?`, [nuevoCodigo, id]);
    }
  }

  await conn.end();
}

// -------------------- ENDPOINTS --------------------

app.post("/api/registro", async (req, res) => {
  const { nombres, apellidos, usuario, contraseña } = req.body;
  if (!nombres || !apellidos || !usuario || !contraseña)
    return res.status(400).json({ error: "Todos los campos son obligatorios" });

  const conn = await mysql.createConnection(dbConfig);
  const [exists] = await conn.execute("SELECT * FROM usuarios WHERE usuario = ?", [usuario]);
  if (exists.length) {
    await conn.end();
    return res.status(400).json({ error: "El nombre de usuario ya existe" });
  }

  const hash = await bcrypt.hash(contraseña, 10);
  await conn.execute(
    "INSERT INTO usuarios (nombres, apellidos, usuario, contraseña) VALUES (?, ?, ?, ?)",
    [nombres, apellidos, usuario, hash]
  );
  await conn.end();
  res.status(201).json({ message: "Usuario registrado correctamente" });
});

app.post("/api/login", async (req, res) => {
  const { usuario, contraseña } = req.body;
  if (!usuario || !contraseña)
    return res.status(400).json({ error: "Usuario y contraseña son obligatorios" });

  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute("SELECT * FROM usuarios WHERE usuario = ?", [usuario]);
  if (!rows.length) {
    await conn.end();
    return res.status(400).json({ error: "Usuario no encontrado" });
  }

  const user = rows[0];
  const match = await bcrypt.compare(contraseña, user.contraseña);
  if (!match) {
    await conn.end();
    return res.status(400).json({ error: "Contraseña incorrecta" });
  }

  await conn.end();
  res.json({ message: "Login exitoso" });
});

app.get("/api/contenedores", async (req, res) => {
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute("SELECT * FROM contenedores");
  await conn.end();
  res.json(rows);
});

app.post("/api/contenedores", async (req, res) => {
  const { numero, tipo, tamano, peso, descripcion, fecha_llegada, fecha_salida, zona } = req.body;
  if (!numero || !tipo || !tamano || !peso || !descripcion || !fecha_llegada || !fecha_salida || !zona)
    return res.status(400).json({ error: "Todos los campos son obligatorios" });

  const diasEstadia = Math.ceil(
    (new Date(fecha_salida) - new Date(fecha_llegada)) / (1000 * 60 * 60 * 24)
  );

  if (diasEstadia < 1 || diasEstadia > 27) {
    return res.status(400).json({ error: "La estancia debe ser de 1 a 27 días máximo." });
  }

  const conn = await mysql.createConnection(dbConfig);
  const [dup] = await conn.execute("SELECT * FROM contenedores WHERE numero = ?", [numero]);
  if (dup.length) {
    await conn.end();
    return res.status(400).json({ error: "Número de contenedor ya existe" });
  }

  const codigo = await encontrarCodigoDisponible(zona, diasEstadia);
  if (!codigo) {
    await conn.end();
    return res.status(400).json({ error: "No hay espacio disponible en la columna correspondiente" });
  }

  await conn.execute(
    `INSERT INTO contenedores
       (codigo, numero, tipo, tamano, peso, descripcion,
        fecha_llegada, fecha_salida, zona, posicion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    [codigo, numero, tipo, tamano, peso, descripcion, fecha_llegada, fecha_salida, zona]
  );

  const [row] = await conn.execute("SELECT LAST_INSERT_ID() as id");
  await conn.end();

  res.status(201).json({
    message: "Contenedor agregado correctamente",
    id: row[0].id,
    codigo,
    numero,
    tipo
  });
});

app.put("/api/contenedores/:id", async (req, res) => {
  const { id } = req.params;
  const { numero, tamano, peso, descripcion, fecha_llegada, fecha_salida } = req.body;

  const diasEstadia = Math.ceil(
    (new Date(fecha_salida) - new Date(fecha_llegada)) / (1000 * 60 * 60 * 24)
  );

  if (diasEstadia < 1 || diasEstadia > 27) {
    return res.status(400).json({ error: "La estancia debe ser de 1 a 27 días máximo." });
  }

  const conn = await mysql.createConnection(dbConfig);
  const [row] = await conn.execute("SELECT zona FROM contenedores WHERE id = ?", [id]);
  if (!row.length) {
    await conn.end();
    return res.status(404).json({ error: "Contenedor no encontrado" });
  }

  const zona = row[0].zona;
  const nuevoCodigo = await encontrarCodigoDisponible(zona, diasEstadia);
  if (!nuevoCodigo) {
    await conn.end();
    return res.status(400).json({ error: "No hay espacio disponible en la columna correspondiente" });
  }

  await conn.execute(
    `UPDATE contenedores
     SET numero=?, tamano=?, peso=?, descripcion=?,
         fecha_llegada=?, fecha_salida=?, codigo=?
     WHERE id=?`,
    [numero, tamano, peso, descripcion, fecha_llegada, fecha_salida, nuevoCodigo, id]
  );
  await conn.end();

  res.json({ message: "Contenedor actualizado correctamente", codigo: nuevoCodigo });
});

app.delete("/api/contenedores/:id", async (req, res) => {
  const { id } = req.params;

  const conn = await mysql.createConnection(dbConfig);
  const [row] = await conn.execute("SELECT zona FROM contenedores WHERE id = ?", [id]);
  if (!row.length) {
    await conn.end();
    return res.status(404).json({ error: "Contenedor no encontrado" });
  }

  const zona = row[0].zona;

  await conn.execute("DELETE FROM contenedores WHERE id = ?", [id]);
  await conn.end();

  await reordenarZona(zona);
  res.json({ message: "Contenedor eliminado y columna reordenada" });
});

app.post("/api/contenedores/reordenar", async (req, res) => {
  const { zona } = req.body;
  if (!zona) return res.status(400).json({ error: "Zona requerida" });

  await reordenarZona(zona);
  res.json({ message: `Zona ${zona} reordenada correctamente` });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
