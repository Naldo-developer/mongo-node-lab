const express = require("express");
const { ObjectId } = require("mongodb");
const { connectDB } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

function toObjectId(id, fieldName = "id") {
  if (!ObjectId.isValid(id)) {
    const error = new Error(`El campo ${fieldName} no tiene un ObjectId valido.`);
    error.status = 400;
    throw error;
  }

  return new ObjectId(id);
}

async function getCollections() {
  const db = await connectDB();

  return {
    db,
    clientes: db.collection("clientes"),
    productos: db.collection("productos"),
    pedidos: db.collection("pedidos")
  };
}

async function seedDatabase() {
  const { clientes, productos, pedidos } = await getCollections();

  await Promise.all([
    clientes.deleteMany({}),
    productos.deleteMany({}),
    pedidos.deleteMany({})
  ]);

  const clientesBase = [
    { nombre: "Ana Torres", correo: "ana@correo.com", ciudad: "Arequipa", edad: 28 },
    { nombre: "Luis Gomez", correo: "luis@correo.com", ciudad: "Lima", edad: 34 },
    { nombre: "Carla Ruiz", correo: "carla@correo.com", ciudad: "Cusco", edad: 25 },
    { nombre: "Mario Perez", correo: "mario@correo.com", ciudad: "Arequipa", edad: 41 },
    { nombre: "Sofia Diaz", correo: "sofia@correo.com", ciudad: "Trujillo", edad: 31 }
  ];

  const productosBase = [
    { nombre: "Laptop", precio: 3200, stock: 8 },
    { nombre: "Mouse", precio: 75, stock: 20 },
    { nombre: "Teclado", precio: 140, stock: 4 },
    { nombre: "Monitor", precio: 900, stock: 3 },
    { nombre: "Audifonos", precio: 180, stock: 12 }
  ];

  const clientesInsertados = await clientes.insertMany(clientesBase);
  const productosInsertados = await productos.insertMany(productosBase);

  const clienteIds = Object.values(clientesInsertados.insertedIds);
  const productoIds = Object.values(productosInsertados.insertedIds);
  const mapaPrecios = {};

  productosBase.forEach((producto, index) => {
    mapaPrecios[productoIds[index].toString()] = producto.precio;
  });

  const pedidosBase = [
    {
      fecha: new Date("2026-04-20T10:00:00"),
      idCliente: clienteIds[0],
      productos: [
        {
          productoId: productoIds[0],
          nombre: productosBase[0].nombre,
          cantidad: 1,
          precioUnitario: mapaPrecios[productoIds[0].toString()],
          subtotal: mapaPrecios[productoIds[0].toString()]
        },
        {
          productoId: productoIds[1],
          nombre: productosBase[1].nombre,
          cantidad: 2,
          precioUnitario: mapaPrecios[productoIds[1].toString()],
          subtotal: mapaPrecios[productoIds[1].toString()] * 2
        }
      ]
    },
    {
      fecha: new Date("2026-04-21T15:30:00"),
      idCliente: clienteIds[0],
      productos: [
        {
          productoId: productoIds[2],
          nombre: productosBase[2].nombre,
          cantidad: 1,
          precioUnitario: mapaPrecios[productoIds[2].toString()],
          subtotal: mapaPrecios[productoIds[2].toString()]
        },
        {
          productoId: productoIds[4],
          nombre: productosBase[4].nombre,
          cantidad: 1,
          precioUnitario: mapaPrecios[productoIds[4].toString()],
          subtotal: mapaPrecios[productoIds[4].toString()]
        }
      ]
    },
    {
      fecha: new Date("2026-04-22T09:15:00"),
      idCliente: clienteIds[1],
      productos: [
        {
          productoId: productoIds[3],
          nombre: productosBase[3].nombre,
          cantidad: 1,
          precioUnitario: mapaPrecios[productoIds[3].toString()],
          subtotal: mapaPrecios[productoIds[3].toString()]
        },
        {
          productoId: productoIds[1],
          nombre: productosBase[1].nombre,
          cantidad: 1,
          precioUnitario: mapaPrecios[productoIds[1].toString()],
          subtotal: mapaPrecios[productoIds[1].toString()]
        }
      ]
    }
  ].map((pedido) => ({
    ...pedido,
    total: pedido.productos.reduce((sum, item) => sum + item.subtotal, 0)
  }));

  await pedidos.insertMany(pedidosBase);

  return {
    clientes: clientesBase.length,
    productos: productosBase.length,
    pedidos: pedidosBase.length
  };
}

async function getDashboardData() {
  const { clientes, productos, pedidos } = await getCollections();

  const [listaClientes, listaProductos, listaPedidos] = await Promise.all([
    clientes.find().sort({ nombre: 1 }).toArray(),
    productos.find().sort({ nombre: 1 }).toArray(),
    pedidos.aggregate([
      {
        $lookup: {
          from: "clientes",
          localField: "idCliente",
          foreignField: "_id",
          as: "cliente"
        }
      },
      { $unwind: "$cliente" },
      { $sort: { fecha: -1 } }
    ]).toArray()
  ]);

  return {
    clientes: listaClientes,
    productos: listaProductos,
    pedidos: listaPedidos
  };
}

async function createCliente(data) {
  const { clientes } = await getCollections();

  const nuevoCliente = {
    nombre: data.nombre,
    correo: data.correo,
    ciudad: data.ciudad,
    edad: Number(data.edad)
  };

  if (!nuevoCliente.nombre || !nuevoCliente.correo || !nuevoCliente.ciudad || Number.isNaN(nuevoCliente.edad)) {
    const error = new Error("Datos de cliente incompletos o invalidos.");
    error.status = 400;
    throw error;
  }

  const resultado = await clientes.insertOne(nuevoCliente);
  return { ...nuevoCliente, _id: resultado.insertedId };
}

async function createProducto(data) {
  const { productos } = await getCollections();

  const nuevoProducto = {
    nombre: data.nombre,
    precio: Number(data.precio),
    stock: Number(data.stock)
  };

  if (!nuevoProducto.nombre || Number.isNaN(nuevoProducto.precio) || Number.isNaN(nuevoProducto.stock)) {
    const error = new Error("Datos de producto incompletos o invalidos.");
    error.status = 400;
    throw error;
  }

  const resultado = await productos.insertOne(nuevoProducto);
  return { ...nuevoProducto, _id: resultado.insertedId };
}

async function getClientesFrecuentes() {
  const { pedidos } = await getCollections();

  return pedidos.aggregate([
    {
      $group: {
        _id: "$idCliente",
        totalPedidos: { $sum: 1 }
      }
    },
    {
      $match: {
        totalPedidos: { $gte: 2 }
      }
    },
    {
      $lookup: {
        from: "clientes",
        localField: "_id",
        foreignField: "_id",
        as: "cliente"
      }
    },
    { $unwind: "$cliente" },
    {
      $project: {
        _id: "$cliente._id",
        nombre: "$cliente.nombre",
        correo: "$cliente.correo",
        ciudad: "$cliente.ciudad",
        edad: "$cliente.edad",
        totalPedidos: 1
      }
    },
    { $sort: { totalPedidos: -1, nombre: 1 } }
  ]).toArray();
}

async function getStockCritico() {
  const { productos } = await getCollections();

  return productos.find(
    { stock: { $lt: 5 } },
    { projection: { nombre: 1, stock: 1 } }
  ).sort({ stock: 1, nombre: 1 }).toArray();
}

async function getPedidosPorCiudad(ciudad) {
  const { pedidos } = await getCollections();

  return pedidos.aggregate([
    {
      $lookup: {
        from: "clientes",
        localField: "idCliente",
        foreignField: "_id",
        as: "cliente"
      }
    },
    { $unwind: "$cliente" },
    {
      $match: {
        "cliente.ciudad": {
          $regex: `^${ciudad}$`,
          $options: "i"
        }
      }
    },
    {
      $project: {
        fecha: 1,
        total: 1,
        productos: 1,
        cliente: {
          _id: "$cliente._id",
          nombre: "$cliente.nombre",
          correo: "$cliente.correo",
          ciudad: "$cliente.ciudad"
        }
      }
    },
    { $sort: { fecha: -1 } }
  ]).toArray();
}

async function getTicketPromedio(idCliente) {
  const { pedidos } = await getCollections();
  const clienteId = toObjectId(idCliente, "idCliente");

  const [resumen] = await pedidos.aggregate([
    {
      $match: {
        idCliente: clienteId
      }
    },
    {
      $group: {
        _id: "$idCliente",
        ticketPromedio: { $avg: "$total" },
        totalPedidos: { $sum: 1 },
        gastoAcumulado: { $sum: "$total" }
      }
    },
    {
      $lookup: {
        from: "clientes",
        localField: "_id",
        foreignField: "_id",
        as: "cliente"
      }
    },
    { $unwind: "$cliente" },
    {
      $project: {
        _id: 0,
        clienteId: "$cliente._id",
        nombre: "$cliente.nombre",
        ticketPromedio: { $round: ["$ticketPromedio", 2] },
        totalPedidos: 1,
        gastoAcumulado: 1
      }
    }
  ]).toArray();

  return resumen || null;
}

async function registrarPedido(data) {
  const { clientes, productos, pedidos } = await getCollections();
  const idCliente = toObjectId(data.idCliente, "idCliente");
  const items = Array.isArray(data.productos) ? data.productos : [];

  if (!items.length) {
    const error = new Error("El pedido debe incluir al menos un producto.");
    error.status = 400;
    throw error;
  }

  const cliente = await clientes.findOne({ _id: idCliente });

  if (!cliente) {
    const error = new Error("Cliente no encontrado.");
    error.status = 404;
    throw error;
  }

  const productIds = items.map((item, index) => {
    if (!item.productoId || !item.cantidad || Number(item.cantidad) <= 0) {
      const error = new Error(`Producto o cantidad invalida en la fila ${index + 1}.`);
      error.status = 400;
      throw error;
    }

    return toObjectId(item.productoId, `productos[${index}].productoId`);
  });

  const productosDisponibles = await productos.find({
    _id: { $in: productIds }
  }).toArray();

  const productosMap = new Map(
    productosDisponibles.map((producto) => [producto._id.toString(), producto])
  );

  const pedidoNormalizado = items.map((item) => {
    const producto = productosMap.get(item.productoId.toString());
    const cantidad = Number(item.cantidad);

    if (!producto) {
      const error = new Error("Uno de los productos no existe.");
      error.status = 404;
      throw error;
    }

    if (producto.stock < cantidad) {
      const error = new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}.`);
      error.status = 400;
      throw error;
    }

    return {
      productoId: producto._id,
      nombre: producto.nombre,
      cantidad,
      precioUnitario: producto.precio,
      subtotal: producto.precio * cantidad
    };
  });

  const descuentosAplicados = [];

  try {
    for (const item of pedidoNormalizado) {
      const resultado = await productos.updateOne(
        {
          _id: item.productoId,
          stock: { $gte: item.cantidad }
        },
        {
          $inc: { stock: -item.cantidad }
        }
      );

      if (resultado.modifiedCount !== 1) {
        const error = new Error(`No se pudo descontar stock para ${item.nombre}.`);
        error.status = 409;
        throw error;
      }

      descuentosAplicados.push(item);
    }

    const nuevoPedido = {
      fecha: new Date(),
      idCliente,
      productos: pedidoNormalizado,
      total: pedidoNormalizado.reduce((sum, item) => sum + item.subtotal, 0)
    };

    const resultado = await pedidos.insertOne(nuevoPedido);

    return {
      _id: resultado.insertedId,
      ...nuevoPedido
    };
  } catch (error) {
    for (const item of descuentosAplicados) {
      await productos.updateOne(
        { _id: item.productoId },
        { $inc: { stock: item.cantidad } }
      );
    }

    throw error;
  }
}

async function actualizarCiudadArequipaALima() {
  const { clientes } = await getCollections();

  const resultado = await clientes.updateMany(
    { ciudad: "Arequipa" },
    { $set: { ciudad: "Lima" } }
  );

  return {
    modificados: resultado.modifiedCount
  };
}

app.get("/api/dashboard", async (req, res, next) => {
  try {
    res.json(await getDashboardData());
  } catch (error) {
    next(error);
  }
});

app.post("/api/seed", async (req, res, next) => {
  try {
    res.json({
      message: "Datos de prueba insertados correctamente.",
      data: await seedDatabase()
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/clientes", async (req, res, next) => {
  try {
    res.status(201).json({
      message: "Cliente registrado correctamente.",
      data: await createCliente(req.body)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/productos", async (req, res, next) => {
  try {
    res.status(201).json({
      message: "Producto registrado correctamente.",
      data: await createProducto(req.body)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/clientes-frecuentes", async (req, res, next) => {
  try {
    res.json(await getClientesFrecuentes());
  } catch (error) {
    next(error);
  }
});

app.get("/api/productos/stock-critico", async (req, res, next) => {
  try {
    res.json(await getStockCritico());
  } catch (error) {
    next(error);
  }
});

app.get("/api/pedidos/ciudad/:ciudad", async (req, res, next) => {
  try {
    res.json(await getPedidosPorCiudad(req.params.ciudad));
  } catch (error) {
    next(error);
  }
});

app.get("/api/clientes/:idCliente/ticket-promedio", async (req, res, next) => {
  try {
    const ticket = await getTicketPromedio(req.params.idCliente);

    if (!ticket) {
      return res.status(404).json({
        message: "El cliente no tiene pedidos registrados."
      });
    }

    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

app.post("/api/pedidos", async (req, res, next) => {
  try {
    res.status(201).json({
      message: "Pedido registrado correctamente.",
      data: await registrarPedido(req.body)
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/clientes/ciudad", async (req, res, next) => {
  try {
    res.json({
      message: "Actualizacion masiva ejecutada.",
      data: await actualizarCiudadArequipaALima()
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(error.status || 500).json({
    message: error.message || "Ocurrio un error inesperado."
  });
});

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Servidor iniciado correctamente en el puerto ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("No se pudo iniciar la aplicacion:", error);
  process.exit(1);
});