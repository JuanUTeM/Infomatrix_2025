const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "INFOMATRIX",
});

connection.connect((err) => {
    if (err) {
        console.error("Error conectando a la base de datos:", err);
        return;
    }
    console.log("Conectado a la base de datos INFOMATRIX");
});

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Registro de usuario
app.post("/api/registro", async (req, res) => {
    const { nombres, apellidos, usuario, contraseña } = req.body;

    if (!nombres || !apellidos || !usuario || !contraseña) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    try {
        const queryVerificar = "SELECT * FROM usuarios WHERE usuario = ?";
        connection.query(queryVerificar, [usuario], async (err, results) => {
            if (err) return res.status(500).json({ error: "Error en el servidor" });

            if (results.length > 0) {
                return res.status(400).json({ error: "El nombre de usuario ya existe" });
            }

            const hashedPassword = await bcrypt.hash(contraseña, 10);
            const queryInsertar = `
                INSERT INTO usuarios (nombres, apellidos, usuario, contraseña)
                VALUES (?, ?, ?, ?)
            `;

            connection.query(
                queryInsertar,
                [nombres, apellidos, usuario, hashedPassword],
                (err) => {
                    if (err) return res.status(500).json({ error: "Error en el servidor" });
                    res.status(201).json({ message: "Usuario registrado correctamente" });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Login
app.post("/api/login", async (req, res) => {
    const { usuario, contraseña } = req.body;

    if (!usuario || !contraseña) {
        return res.status(400).json({ error: "Usuario y contraseña son obligatorios" });
    }

    try {
        const query = "SELECT * FROM usuarios WHERE usuario = ?";
        connection.query(query, [usuario], async (err, results) => {
            if (err) return res.status(500).json({ error: "Error en el servidor" });

            if (results.length === 0) {
                return res.status(400).json({ error: "Usuario no encontrado" });
            }

            const user = results[0];
            const passwordMatch = await bcrypt.compare(contraseña, user.contraseña);
            if (!passwordMatch) {
                return res.status(400).json({ error: "Contraseña incorrecta" });
            }

            res.status(200).json({ message: "Login exitoso" });
        });
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Obtener espacios
app.get("/api/espacios", (req, res) => {
    const query = "SELECT * FROM espacios";
    connection.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: "Error en el servidor" });
        res.status(200).json(results);
    });
});

// Agregar espacio
app.post("/api/espacios", (req, res) => {
    const { codigo, numero_contenedor, tipo_contenedor, tamano_contenedor, peso, descripcion_mercancia } = req.body;

    if (!codigo || !numero_contenedor || !tipo_contenedor || !tamano_contenedor || !peso || !descripcion_mercancia) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const queryVerificar = "SELECT * FROM espacios WHERE numero_contenedor = ?";
    connection.query(queryVerificar, [numero_contenedor], (err, results) => {
        if (err) return res.status(500).json({ error: "Error en el servidor" });

        if (results.length > 0) {
            return res.status(400).json({ error: "El número de contenedor ya existe" });
        }

        const queryInsertar = `
            INSERT INTO espacios (codigo, numero_contenedor, tipo_contenedor, tamano_contenedor, peso, descripcion_mercancia, estado)
            VALUES (?, ?, ?, ?, ?, ?, 'ocupado')
        `;

        connection.query(
            queryInsertar,
            [codigo, numero_contenedor, tipo_contenedor, tamano_contenedor, peso, descripcion_mercancia],
            (err, results) => {
                if (err) return res.status(500).json({ error: "Error en el servidor" });
                res.status(201).json({ message: "Espacio agregado correctamente", id: results.insertId });
            }
        );
    });
});

// Eliminar espacio
app.delete("/api/espacios/:codigo", (req, res) => {
    const codigo = req.params.codigo;
    const query = "DELETE FROM espacios WHERE codigo = ?";
    connection.query(query, [codigo], (err) => {
        if (err) return res.status(500).json({ error: "Error en el servidor" });
        res.status(200).json({ message: "Espacio eliminado correctamente" });
    });
});

// Editar espacio
app.put("/api/espacios/:codigo", (req, res) => {
    const codigo = req.params.codigo;
    const { numero_contenedor, tipo_contenedor, tamano_contenedor, peso, descripcion_mercancia } = req.body;

    const query = `
        UPDATE espacios 
        SET numero_contenedor = ?, tipo_contenedor = ?, tamano_contenedor = ?, peso = ?, descripcion_mercancia = ?
        WHERE codigo = ?
    `;

    connection.query(
        query,
        [numero_contenedor, tipo_contenedor, tamano_contenedor, peso, descripcion_mercancia, codigo],
        (err) => {
            if (err) return res.status(500).json({ error: "Error en el servidor" });
            res.status(200).json({ message: "Espacio actualizado correctamente" });
        }
    );
});

// Agregar contenedor
app.post("/api/contenedores", (req, res) => {
    const {
        codigo,
        numero,
        tipo,
        tamano,
        peso,
        descripcion,
        fecha_llegada,
        fecha_salida,
        zona
    } = req.body;

    if (!codigo || !numero || !tipo || !tamano || !peso || !descripcion || !fecha_llegada || !fecha_salida || !zona) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const queryVerificar = "SELECT * FROM contenedores WHERE numero = ?";
    connection.query(queryVerificar, [numero], (err, results) => {
        if (err) return res.status(500).json({ error: "Error en el servidor" });

        if (results.length > 0) {
            return res.status(400).json({ error: "El número de contenedor ya existe" });
        }

        const queryInsertar = `
            INSERT INTO contenedores 
            (codigo, numero, tipo, tamano, peso, descripcion, fecha_llegada, fecha_salida, zona, posicion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        connection.query(
            queryInsertar,
            [codigo, numero, tipo, tamano, peso, descripcion, fecha_llegada, fecha_salida, zona, 'pendiente'],
            (err, results) => {
                if (err) {
                    console.error("Error al insertar contenedor:", err);
                    return res.status(500).json({ error: "Error al guardar el contenedor" });
                }

                res.status(201).json({ message: "Contenedor agregado correctamente", id: results.insertId });
            }
        );
    });
});

// Obtener todos los contenedores
app.get("/api/contenedores", (req, res) => {
    const query = "SELECT * FROM contenedores";
    connection.query(query, (err, results) => {
        if (err) {
            console.error("Error al obtener contenedores:", err);
            return res.status(500).json({ error: "Error al obtener contenedores" });
        }
        res.status(200).json(results);
    });
});

// Eliminar contenedor por ID
app.delete("/api/contenedores/:id", (req, res) => {
    const id = req.params.id;
    const query = "DELETE FROM contenedores WHERE id = ?";
    connection.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: "Error al eliminar el contenedor" });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Contenedor no encontrado" });
        res.status(200).json({ message: "Contenedor eliminado correctamente" });
    });
});

// Editar contenedor por ID
app.put("/api/contenedores/:id", (req, res) => {
    const id = req.params.id;
    const {
        numero,
        tamano,
        peso,
        descripcion,
        fecha_llegada,
        fecha_salida
    } = req.body;

    const query = `
        UPDATE contenedores
        SET numero = ?, tamano = ?, peso = ?, descripcion = ?, fecha_llegada = ?, fecha_salida = ?
        WHERE id = ?
    `;

    connection.query(
        query,
        [numero, tamano, peso, descripcion, fecha_llegada, fecha_salida, id],
        (err, result) => {
            if (err) return res.status(500).json({ error: "Error al editar el contenedor" });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Contenedor no encontrado" });
            res.status(200).json({ message: "Contenedor actualizado correctamente" });
        }
    );
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
