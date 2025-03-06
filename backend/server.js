const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");

// Crear la conexión a la base de datos
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

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ruta para registrar un nuevo usuario
app.post("/api/registro", async (req, res) => {
    const { nombres, apellidos, usuario, contraseña } = req.body;

    if (!nombres || !apellidos || !usuario || !contraseña) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    try {
        // Verificar si el usuario ya existe
        const queryVerificar = "SELECT * FROM usuarios WHERE usuario = ?";
        connection.query(queryVerificar, [usuario], async (err, results) => {
            if (err) {
                console.error("Error al verificar el usuario:", err);
                return res.status(500).json({ error: "Error en el servidor" });
            }

            if (results.length > 0) {
                return res.status(400).json({ error: "El nombre de usuario ya existe" });
            }

            // Hashear la contraseña
            const hashedPassword = await bcrypt.hash(contraseña, 10);

            // Insertar el nuevo usuario
            const queryInsertar = `
                INSERT INTO usuarios (nombres, apellidos, usuario, contraseña)
                VALUES (?, ?, ?, ?)
            `;

            connection.query(
                queryInsertar,
                [nombres, apellidos, usuario, hashedPassword],
                (err, results) => {
                    if (err) {
                        console.error("Error al insertar en la base de datos:", err);
                        return res.status(500).json({ error: "Error en el servidor" });
                    }
                    res.status(201).json({ message: "Usuario registrado correctamente" });
                }
            );
        });
    } catch (error) {
        console.error("Error al hashear la contraseña:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Ruta para iniciar sesión
app.post("/api/login", async (req, res) => {
    const { usuario, contraseña } = req.body;

    if (!usuario || !contraseña) {
        return res.status(400).json({ error: "Usuario y contraseña son obligatorios" });
    }

    try {
        // Buscar el usuario en la base de datos
        const query = "SELECT * FROM usuarios WHERE usuario = ?";
        connection.query(query, [usuario], async (err, results) => {
            if (err) {
                console.error("Error al buscar el usuario:", err);
                return res.status(500).json({ error: "Error en el servidor" });
            }

            if (results.length === 0) {
                return res.status(400).json({ error: "Usuario no encontrado" });
            }

            const user = results[0];

            // Verificar la contraseña
            const passwordMatch = await bcrypt.compare(contraseña, user.contraseña);
            if (!passwordMatch) {
                return res.status(400).json({ error: "Contraseña incorrecta" });
            }

            // Si todo está bien, enviar una respuesta exitosa
            res.status(200).json({ message: "Login exitoso" });
        });
    } catch (error) {
        console.error("Error al verificar la contraseña:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Ruta para obtener todos los espacios (contenedores)
app.get("/api/espacios", (req, res) => {
    const query = "SELECT * FROM espacios";

    connection.query(query, (err, results) => {
        if (err) {
            console.error("Error al obtener los espacios:", err);
            return res.status(500).json({ error: "Error en el servidor" });
        }
        res.status(200).json(results);
    });
});

// Ruta para agregar un nuevo espacio (contenedor)
app.post("/api/espacios", (req, res) => {
    const { codigo, numero_contenedor, tipo_contenedor, tamano_contenedor, peso, descripcion_mercancia } = req.body;

    if (!codigo || !numero_contenedor || !tipo_contenedor || !tamano_contenedor || !peso || !descripcion_mercancia) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    // Verificar si el número de contenedor ya existe
    const queryVerificar = "SELECT * FROM espacios WHERE numero_contenedor = ?";
    connection.query(queryVerificar, [numero_contenedor], (err, results) => {
        if (err) {
            console.error("Error al verificar el contenedor:", err);
            return res.status(500).json({ error: "Error en el servidor" });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: "El número de contenedor ya existe" });
        }

        // Insertar el nuevo contenedor con estado "ocupado"
        const queryInsertar = `
            INSERT INTO espacios (codigo, numero_contenedor, tipo_contenedor, tamano_contenedor, peso, descripcion_mercancia, estado)
            VALUES (?, ?, ?, ?, ?, ?, 'ocupado')
        `;

        connection.query(
            queryInsertar,
            [codigo, numero_contenedor, tipo_contenedor, tamano_contenedor, peso, descripcion_mercancia],
            (err, results) => {
                if (err) {
                    console.error("Error al insertar en la base de datos:", err);
                    return res.status(500).json({ error: "Error en el servidor" });
                }
                res.status(201).json({ message: "Espacio agregado y asignado correctamente", id: results.insertId });
            }
        );
    });
});

// Ruta para eliminar un espacio (contenedor)
app.delete("/api/espacios/:codigo", (req, res) => {
    const codigo = req.params.codigo;

    const query = "DELETE FROM espacios WHERE codigo = ?";
    connection.query(query, [codigo], (err, results) => {
        if (err) {
            console.error("Error al liberar el espacio:", err);
            return res.status(500).json({ error: "Error en el servidor" });
        }
        res.status(200).json({ message: "Espacio liberado correctamente" });
    });
});

// Ruta para editar un espacio (contenedor)
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
        (err, results) => {
            if (err) {
                console.error("Error al editar el contenedor:", err);
                return res.status(500).json({ error: "Error en el servidor" });
            }
            res.status(200).json({ message: "Contenedor actualizado correctamente" });
        }
    );
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});