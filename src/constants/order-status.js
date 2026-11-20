// Estados del pedido. Importa siempre esta constante en vez de escribir los textos a mano.
export const ORDER_STATUS = Object.freeze({
    PENDIENTE: 'PENDIENTE',             // El cliente hizo el pedido, falta que la empresa lo revise
    CONFIRMADO: 'CONFIRMADO',           // La empresa aceptó el pedido
    EN_PREPARACION: 'EN_PREPARACION',   // Se está alistando y empacando
    ENVIADO: 'ENVIADO',                 // Salió con la transportadora (lleva guía)
    ENTREGADO: 'ENTREGADO',             // El cliente lo recibió (estado final)
    CANCELADO: 'CANCELADO'              // Se canceló (estado final, devuelve el stock)
});

export const ORDER_STATUS_LIST = Object.values( ORDER_STATUS );

// Máquina de estados: desde cada estado, a cuáles se puede pasar.
// Todo lo que no esté aquí se rechaza (no se puede saltar ni devolver estados).
export const ORDER_TRANSITIONS = Object.freeze({
    [ ORDER_STATUS.PENDIENTE ]:      [ ORDER_STATUS.CONFIRMADO, ORDER_STATUS.CANCELADO ],
    [ ORDER_STATUS.CONFIRMADO ]:     [ ORDER_STATUS.EN_PREPARACION, ORDER_STATUS.CANCELADO ],
    [ ORDER_STATUS.EN_PREPARACION ]: [ ORDER_STATUS.ENVIADO, ORDER_STATUS.CANCELADO ],
    [ ORDER_STATUS.ENVIADO ]:        [ ORDER_STATUS.ENTREGADO ],     // Ya salió: no se cancela
    [ ORDER_STATUS.ENTREGADO ]:      [],
    [ ORDER_STATUS.CANCELADO ]:      []
});
