const output = document.getElementById("output");
const clienteForm = document.getElementById("cliente-form");
const productoForm = document.getElementById("producto-form");
const pedidoForm = document.getElementById("pedido-form");
const pedidoItems = document.getElementById("pedido-items");
const pedidoCliente = document.getElementById("pedido-cliente");
const ticketCliente = document.getElementById("ticket-cliente");
const clientesList = document.getElementById("clientes-list");
const productosList = document.getElementById("productos-list");
const pedidosList = document.getElementById("pedidos-list");

let dashboard = {
  clientes: [],
  productos: [],
  pedidos: []
};

function setOutput(data, title = "Resultado") {
  output.textContent = `${title}\n\n${JSON.stringify(data, null, 2)}`;
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Error en la solicitud.");
  }

  return data;
}

function populateClientSelects() {
  const options = dashboard.clientes.map(
    (cliente) => `<option value="${cliente._id}">${cliente.nombre} - ${cliente.ciudad}</option>`
  ).join("");

  pedidoCliente.innerHTML = options || '<option value="">Sin clientes</option>';
  ticketCliente.innerHTML = options || '<option value="">Sin clientes</option>';
}

function productOptions() {
  return dashboard.productos.map(
    (producto) =>
      `<option value="${producto._id}">${producto.nombre} | S/ ${producto.precio} | stock: ${producto.stock}</option>`
  ).join("");
}

function addPedidoItem() {
  const wrapper = document.createElement("div");
  wrapper.className = "item-row";
  wrapper.innerHTML = `
    <select name="productoId" required>${productOptions()}</select>
    <input name="cantidad" type="number" min="1" value="1" required />
    <button type="button" class="remove-btn">Quitar</button>
  `;

  wrapper.querySelector(".remove-btn").addEventListener("click", () => {
    wrapper.remove();
  });

  pedidoItems.appendChild(wrapper);
}

function renderList(container, items, mapper, emptyText) {
  if (!items.length) {
    container.innerHTML = `<div class="meta">${emptyText}</div>`;
    return;
  }

  container.innerHTML = items.map(mapper).join("");
}

function renderDashboard() {
  populateClientSelects();

  renderList(
    clientesList,
    dashboard.clientes,
    (cliente) => `
      <div class="result-card">
        <strong>${cliente.nombre}</strong>
        <div class="meta">${cliente.correo}</div>
        <div class="meta">${cliente.ciudad} | ${cliente.edad} anos</div>
      </div>
    `,
    "No hay clientes registrados."
  );

  renderList(
    productosList,
    dashboard.productos,
    (producto) => `
      <div class="result-card">
        <strong>${producto.nombre}</strong>
        <div class="meta">Precio: S/ ${producto.precio}</div>
        <div class="meta">Stock: ${producto.stock}</div>
      </div>
    `,
    "No hay productos registrados."
  );

  renderList(
    pedidosList,
    dashboard.pedidos,
    (pedido) => `
      <div class="result-card">
        <strong>${pedido.cliente.nombre}</strong>
        <div class="meta">${new Date(pedido.fecha).toLocaleString()}</div>
        <div class="meta">Total: S/ ${pedido.total}</div>
        <div class="meta">${pedido.productos.map((item) => `${item.nombre || item.productoId}: x${item.cantidad}`).join(", ")}</div>
      </div>
    `,
    "No hay pedidos registrados."
  );
}

async function loadDashboard() {
  dashboard = await apiFetch("/api/dashboard");
  renderDashboard();
}

clienteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(clienteForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const result = await apiFetch("/api/clientes", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    clienteForm.reset();
    await loadDashboard();
    setOutput(result, "Cliente creado");
  } catch (error) {
    setOutput({ error: error.message }, "Error");
  }
});

productoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(productoForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const result = await apiFetch("/api/productos", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    productoForm.reset();
    await loadDashboard();
    setOutput(result, "Producto creado");
  } catch (error) {
    setOutput({ error: error.message }, "Error");
  }
});

pedidoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const items = Array.from(pedidoItems.querySelectorAll(".item-row")).map((row) => ({
    productoId: row.querySelector('[name="productoId"]').value,
    cantidad: Number(row.querySelector('[name="cantidad"]').value)
  }));

  try {
    const result = await apiFetch("/api/pedidos", {
      method: "POST",
      body: JSON.stringify({
        idCliente: pedidoCliente.value,
        productos: items
      })
    });

    pedidoItems.innerHTML = "";
    addPedidoItem();
    await loadDashboard();
    setOutput(result, "Pedido registrado");
  } catch (error) {
    setOutput({ error: error.message }, "Error");
  }
});

document.getElementById("seed-btn").addEventListener("click", async () => {
  try {
    const result = await apiFetch("/api/seed", { method: "POST" });
    pedidoItems.innerHTML = "";
    await loadDashboard();
    addPedidoItem();
    setOutput(result, "Seed completado");
  } catch (error) {
    setOutput({ error: error.message }, "Error");
  }
});

document.getElementById("refresh-btn").addEventListener("click", async () => {
  try {
    await loadDashboard();
    setOutput(dashboard, "Panel actualizado");
  } catch (error) {
    setOutput({ error: error.message }, "Error");
  }
});

document.getElementById("add-item-btn").addEventListener("click", addPedidoItem);

document.getElementById("clientes-frecuentes-btn").addEventListener("click", async () => {
  try {
    const result = await apiFetch("/api/clientes-frecuentes");
    setOutput(result, "Clientes frecuentes");
  } catch (error) {
    setOutput({ error: error.message }, "Error");
  }
});

document.getElementById("stock-critico-btn").addEventListener("click", async () => {
  try {
    const result = await apiFetch("/api/productos/stock-critico");
    setOutput(result, "Stock critico");
  } catch (error) {
    setOutput({ error: error.message }, "Error");
  }
});

document.getElementById("ciudad-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const ciudad = document.getElementById("ciudad-input").value.trim();

  try {
    const result = await apiFetch(`/api/pedidos/ciudad/${encodeURIComponent(ciudad)}`);
    setOutput(result, `Pedidos en ${ciudad}`);
  } catch (error) {
    setOutput({ error: error.message }, "Error");
  }
});

document.getElementById("ticket-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const result = await apiFetch(`/api/clientes/${ticketCliente.value}/ticket-promedio`);
    setOutput(result, "Ticket promedio");
  } catch (error) {
    setOutput({ error: error.message }, "Error");
  }
});

document.getElementById("actualizar-ciudad-btn").addEventListener("click", async () => {
  try {
    const result = await apiFetch("/api/clientes/ciudad", { method: "PATCH" });
    await loadDashboard();
    setOutput(result, "Actualizacion de ciudad");
  } catch (error) {
    setOutput({ error: error.message }, "Error");
  }
});

loadDashboard()
  .then(() => {
    addPedidoItem();
    setOutput({ message: "Aplicacion lista para usar." }, "Estado");
  })
  .catch((error) => {
    setOutput({ error: error.message }, "Error inicial");
    addPedidoItem();
  });
