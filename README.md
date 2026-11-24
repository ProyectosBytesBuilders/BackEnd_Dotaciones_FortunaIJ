# BackEnd - Dotaciones FortunaIJ
## Módulo de Administración de Inventario

Endpoints protegidos mediante autenticación JWT (`Authorization: Bearer <token>`). Las operaciones de creación, edición, desactivación, movimientos y gestión de proveedores están restringidas exclusivamente a los roles `GERENTE_GENERAL` y `ADMIN_INVENTARIO`.

### CRUD de Materiales y Dotaciones (`/api/products`)

| Operación | Método | Endpoint | Descripción | Roles Permitidos |
| :--- | :--- | :--- | :--- | :--- |
| **Create** | `POST` | `/api/products` | Registrar nuevo material o dotación | `GERENTE_GENERAL`, `ADMIN_INVENTARIO` |
| **Read** | `GET` | `/api/products` | Consultar y buscar inventario con filtros y paginación | `GERENTE_GENERAL`, `ADMIN_INVENTARIO`, `CLIENTE` |
| **Read** | `GET` | `/api/products/:id` | Consultar detalle de un material específico | `GERENTE_GENERAL`, `ADMIN_INVENTARIO`, `CLIENTE` |
| **Update** | `PUT` | `/api/products/:id` | Actualizar metadatos del material (sin alterar stock directo) | `GERENTE_GENERAL`, `ADMIN_INVENTARIO` |
| **Update** | `PATCH` | `/api/products/:id/min-stock` | Configurar nivel mínimo de inventario para alertas | `GERENTE_GENERAL`, `ADMIN_INVENTARIO` |
| **Delete** | `DELETE` | `/api/products/:id` | Desactivar material del inventario (borrado lógico) | `GERENTE_GENERAL`, `ADMIN_INVENTARIO` |
| **Restore** | `PATCH` | `/api/products/:id/restore` | Reactivar material previamente desactivado | `GERENTE_GENERAL`, `ADMIN_INVENTARIO` |

### CRUD de Proveedores (`/api/suppliers`)

| Operación | Método | Endpoint | Descripción | Roles Permitidos |
| :--- | :--- | :--- | :--- | :--- |
| **Create** | `POST` | `/api/suppliers` | Registrar proveedor y lista de materiales que provee | `GERENTE_GENERAL`, `ADMIN_INVENTARIO` |
| **Read** | `GET` | `/api/suppliers` | Listar y buscar proveedores registrados | `GERENTE_GENERAL`, `ADMIN_INVENTARIO` |
| **Read** | `GET` | `/api/suppliers/:id` | Consultar detalle de un proveedor | `GERENTE_GENERAL`, `ADMIN_INVENTARIO` |
| **Update** | `PUT` | `/api/suppliers/:id` | Actualizar datos de contacto y materiales suministrados | `GERENTE_GENERAL`, `ADMIN_INVENTARIO` |
| **Delete** | `DELETE` | `/api/suppliers/:id` | Desactivar proveedor (borrado lógico) | `GERENTE_GENERAL`, `ADMIN_INVENTARIO` |
| **Restore** | `PATCH` | `/api/suppliers/:id/restore` | Reactivar proveedor desactivado | `GERENTE_GENERAL`, `ADMIN_INVENTARIO` |