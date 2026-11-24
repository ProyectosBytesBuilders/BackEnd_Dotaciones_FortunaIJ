// Constantes del módulo de Administración de Inventario - Dotaciones Fortuna IJ

export const PRODUCT_CATEGORIES = Object.freeze({
    TELAS: 'TELAS',
    HILOS: 'HILOS',
    INSUMOS: 'INSUMOS',
    CAMISAS: 'CAMISAS',
    JEANS: 'JEANS',
    BOTAS: 'BOTAS',
    OVEROLES: 'OVEROLES',
    CHAQUETAS: 'CHAQUETAS',
    BORDADOS: 'BORDADOS',
    OTROS: 'OTROS'
});

export const PRODUCT_CATEGORIES_LIST = Object.values( PRODUCT_CATEGORIES );

export const UNIT_TYPES = Object.freeze({
    UNIDAD: 'UNIDAD',
    METRO: 'METRO',
    ROLLO: 'ROLLO',
    PAR: 'PAR',
    CAJA: 'CAJA',
    KILOGRAMO: 'KILOGRAMO',
    PAQUETE: 'PAQUETE'
});

export const UNIT_TYPES_LIST = Object.values( UNIT_TYPES );

export const MOVEMENT_TYPES = Object.freeze({
    ENTRADA: 'ENTRADA',
    SALIDA: 'SALIDA',
    PRODUCCION: 'PRODUCCION',
    AJUSTE: 'AJUSTE'
});

export const MOVEMENT_TYPES_LIST = Object.values( MOVEMENT_TYPES );

export const STOCK_ALERT_LEVELS = Object.freeze({
    AGOTADO: 'AGOTADO',
    STOCK_BAJO: 'STOCK_BAJO',
    NORMAL: 'NORMAL'
});