const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// Datos simulados para que el frontend no dependa de MongoDB
const clientes = [
  { _id: "1", nombre: "Ana Torres", correo: "ana@correo.com", ciudad: "Arequipa", edad: 28 },
  { _id: "2", nombre: "Luis Gomez", correo: "luis@correo.com", ciudad: "Lima", edad: 34 },
  { _id: "3", nombre: "Carla Ruiz", correo: "carla@correo.com", ciudad: "Cusco", edad: 25 }
];

const productos = [
  { _id: "1", nombre: "Laptop", precio: 3200, stock: 8 },
  { _id: "2", nombre: "Mouse", precio: 75, stock: 20 },
  { _id: "3", nombre: "Teclado", precio: 140, stock: 4 },
  { _id: "4", nombre: "Monitor", precio: 900, stock: 3 }
];

const pedidos = [
  {
    _id: "1",
    fecha: new Date(),
    cliente: clientes[0],
    productos: [
      { nombre: "Laptop", cantidad: 1, precioUnitario: 3200, subtotal: 3200 }
    ],
    total: 3200
  }
];

// Rutas API simuladas
app.get("/api/dashboard", (req, res) => {
  res.json({
    clientes,
    productos,
    pedidos
  });
});

app.post("/api/seed", (req, res) => {
  res.json({
    message: "Datos de prueba cargados correctamente en modo demo.",
    data: {
      clientes: clientes.length,
      productos: productos.length,
      pedidos: pedidos.length
    }
  });
});

app.post("/api/clientes", (req, res) => {
  const nuevoCliente = {
    _id: String(clientes.length + 1),
    ...req.body
  };

  clientes.push(nuevoCliente);

  res.status(201).json({
    message: "Cliente registrado correctamente en modo demo.",
    data: nuevoCliente
  });
});

app.post("/api/productos", (req, res) => {
  const nuevoProducto = {
    _id: String(productos.length + 1),
    nombre: req.body.nombre,
    precio: Number(req.body.precio),
    stock: Number(req.body.stock)
  };

  productos.push(nuevoProducto);

  res.status(201).json({
    message: "Producto registrado correctamente en modo demo.",
    data: nuevoProducto
  });
});

app.get("/api/clientes-frecuentes", (req, res) => {
  res.json([
    {
      ...clientes[0],
      totalPedidos: 2
    }
  ]);
});

app.get("/api/productos/stock-critico", (req, res) => {
  res.json(productos.filter((producto) => producto.stock < 5));
});

app.get("/api/pedidos/ciudad/:ciudad", (req, res) => {
  const ciudad = req.params.ciudad.toLowerCase();

  const resultado = pedidos.filter((pedido) =>
    pedido.cliente.ciudad.toLowerCase() === ciudad
  );

  res.json(resultado);
});

app.get("/api/clientes/:idCliente/ticket-promedio", (req, res) => {
  res.json({
    clienteId: req.params.idCliente,
    nombre: "Ana Torres",
    ticketPromedio: 3200,
    totalPedidos: 1,
    gastoAcumulado: 3200
  });
});

app.post("/api/pedidos", (req, res) => {
  res.status(201).json({
    message: "Pedido registrado correctamente en modo demo.",
    data: req.body
  });
});

app.patch("/api/clientes/ciudad", (req, res) => {
  res.json({
    message: "Actualización masiva ejecutada en modo demo.",
    data: {
      modificados: 1
    }
  });
});

// Ruta principal del frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Frontend disponible en el puerto ${PORT}`);
});