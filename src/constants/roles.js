// Roles del sistema. Importa siempre esta constante en vez de escribir los textos a mano.
export const ROLES = Object.freeze({
    GERENTE_GENERAL: 'GERENTE_GENERAL',     // Control de todo el sistema
    ADMIN_INVENTARIO: 'ADMIN_INVENTARIO',   // Control del inventario
    CLIENTE: 'CLIENTE'                      // Compra y radica PQRS
});

export const ROLES_LIST = Object.values( ROLES );
