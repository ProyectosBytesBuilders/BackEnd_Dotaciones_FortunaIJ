import handleMongooseError from '../helpers/handle-mongoose-error.helper.js';
import { MOVEMENT_TYPES } from '../constants/inventory.constants.js';
import { dbGetProductById, dbGetLowStockProducts } from '../services/products.services.js';
import { dbGetSupplierById } from '../services/suppliers.services.js';
import {
    dbRegisterEntry,
    dbRegisterExit,
    dbRegisterAdjustment,
    dbGetMovements,
    dbGetInventorySummary,
    dbCheckStockAvailability
} from '../services/inventory-movements.services.js';
import {
    isValidObjectId,
    isNonEmptyString,
    isPositiveNumber,
    isNonNegativeNumber
} from '../helpers/inventory-validators.helper.js';

// POST /api/inventory/movements/entry -> Registrar entrada de material (RU-F7 / RE-F3)
const registerInventoryEntry = async ( req, res ) => {
    try {
        const {
            productId,
            quantity,
            unitCost,
            supplierId,
            referenceDocument,
            reason
        } = req.body ?? {};

        if ( ! isValidObjectId( productId ) ) {
            return res.status( 400 ).json({ msg: 'El campo productId es obligatorio y debe ser un ID válido' });
        }

        if ( ! isPositiveNumber( quantity ) ) {
            return res.status( 400 ).json({ msg: 'La cantidad (quantity) debe ser un número mayor a 0' });
        }

        if ( ! isNonEmptyString( reason ) ) {
            return res.status( 400 ).json({ msg: 'El motivo de la entrada (reason) es obligatorio' });
        }

        if ( unitCost !== undefined && ! isNonNegativeNumber( unitCost ) ) {
            return res.status( 400 ).json({ msg: 'El costo unitario (unitCost) debe ser mayor o igual a 0' });
        }

        let validSupplierId = null;
        if ( supplierId !== undefined && supplierId !== null && supplierId !== '' ) {
            if ( ! isValidObjectId( supplierId ) ) {
                return res.status( 400 ).json({ msg: 'El identificador del proveedor no es válido' });
            }
            const supplierFound = await dbGetSupplierById( supplierId );
            if ( ! supplierFound ) {
                return res.status( 404 ).json({ msg: 'El proveedor indicado no existe o está inactivo' });
            }
            validSupplierId = supplierFound._id;
        }

        const result = await dbRegisterEntry({
            productId,
            quantity,
            unitCost,
            supplierId: validSupplierId,
            referenceDocument: typeof referenceDocument === 'string' ? referenceDocument.trim() : '',
            reason: reason.trim(),
            performedBy: req.userFound._id
        });

        if ( ! result ) {
            return res.status( 404 ).json({ msg: 'Material no encontrado o se encuentra inactivo' });
        }

        return res.status( 201 ).json({
            msg: 'Entrada de inventario registrada con éxito',
            data: result
        });
    }
    catch ( error ) {
        const validationErrors = handleMongooseError( error );
        if ( validationErrors ) {
            return res.status( 400 ).json( validationErrors );
        }

        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo registrar la entrada de inventario' });
    }
};

// POST /api/inventory/movements/exit -> Registrar salida de material (RU-F8 / RE-F4)
const registerInventoryExit = async ( req, res ) => {
    try {
        const {
            productId,
            quantity,
            referenceDocument,
            reason
        } = req.body ?? {};

        if ( ! isValidObjectId( productId ) ) {
            return res.status( 400 ).json({ msg: 'El campo productId es obligatorio y debe ser un ID válido' });
        }

        if ( ! isPositiveNumber( quantity ) ) {
            return res.status( 400 ).json({ msg: 'La cantidad (quantity) debe ser un número mayor a 0' });
        }

        if ( ! isNonEmptyString( reason ) ) {
            return res.status( 400 ).json({ msg: 'El motivo de la salida (reason) es obligatorio' });
        }

        const result = await dbRegisterExit({
            productId,
            quantity,
            type: MOVEMENT_TYPES.SALIDA,
            referenceDocument: typeof referenceDocument === 'string' ? referenceDocument.trim() : '',
            reason: reason.trim(),
            performedBy: req.userFound._id
        });

        if ( result.error === 'PRODUCT_NOT_FOUND' ) {
            return res.status( 404 ).json({ msg: 'Material no encontrado o se encuentra inactivo' });
        }

        if ( result.error === 'INSUFFICIENT_STOCK' ) {
            return res.status( 400 ).json({
                msg: `Stock insuficiente para '${ result.productName }'. Disponible: ${ result.availableStock }, solicitado: ${ quantity }`,
                availableStock: result.availableStock
            });
        }

        return res.status( 201 ).json({
            msg: 'Salida de inventario registrada con éxito',
            data: result
        });
    }
    catch ( error ) {
        const validationErrors = handleMongooseError( error );
        if ( validationErrors ) {
            return res.status( 400 ).json( validationErrors );
        }

        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo registrar la salida de inventario' });
    }
};

// POST /api/inventory/movements/production -> Registrar uso de materiales en producción (RU-F14)
const registerProductionUsage = async ( req, res ) => {
    try {
        const {
            productId,
            quantity,
            colorUsed,
            productionOrder,
            referenceDocument,
            reason
        } = req.body ?? {};

        if ( ! isValidObjectId( productId ) ) {
            return res.status( 400 ).json({ msg: 'El campo productId es obligatorio y debe ser un ID válido' });
        }

        if ( ! isPositiveNumber( quantity ) ) {
            return res.status( 400 ).json({ msg: 'La cantidad (quantity) debe ser un número mayor a 0' });
        }

        // RU-F14 exige registrar material, cantidad y color utilizado en producción
        if ( ! isNonEmptyString( colorUsed ) ) {
            return res.status( 400 ).json({
                msg: 'El color del material utilizado en producción (colorUsed) es obligatorio'
            });
        }

        const finalReason = isNonEmptyString( reason )
            ? reason.trim()
            : `Consumo en producción de dotaciones${ isNonEmptyString( productionOrder ) ? ` - Orden ${ productionOrder.trim().toUpperCase() }` : '' }`;

        const result = await dbRegisterExit({
            productId,
            quantity,
            type: MOVEMENT_TYPES.PRODUCCION,
            colorUsed: colorUsed.trim(),
            productionOrder: isNonEmptyString( productionOrder ) ? productionOrder.trim().toUpperCase() : null,
            referenceDocument: typeof referenceDocument === 'string' ? referenceDocument.trim() : '',
            reason: finalReason,
            performedBy: req.userFound._id
        });

        if ( result.error === 'PRODUCT_NOT_FOUND' ) {
            return res.status( 404 ).json({ msg: 'Material no encontrado o se encuentra inactivo' });
        }

        if ( result.error === 'INSUFFICIENT_STOCK' ) {
            return res.status( 400 ).json({
                msg: `Stock insuficiente para producción de '${ result.productName }'. Disponible: ${ result.availableStock }, solicitado: ${ quantity }`,
                availableStock: result.availableStock
            });
        }

        return res.status( 201 ).json({
            msg: 'Uso de material en producción registrado con éxito',
            data: result
        });
    }
    catch ( error ) {
        const validationErrors = handleMongooseError( error );
        if ( validationErrors ) {
            return res.status( 400 ).json( validationErrors );
        }

        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo registrar el uso de material en producción' });
    }
};

// POST /api/inventory/movements/adjustment -> Conciliación / ajuste de stock físico (RE-F12 / RE-F13)
const registerInventoryAdjustment = async ( req, res ) => {
    try {
        const {
            productId,
            newStock,
            referenceDocument,
            reason
        } = req.body ?? {};

        if ( ! isValidObjectId( productId ) ) {
            return res.status( 400 ).json({ msg: 'El campo productId es obligatorio y debe ser un ID válido' });
        }

        if ( ! isNonNegativeNumber( newStock ) ) {
            return res.status( 400 ).json({ msg: 'El nuevo stock físico (newStock) debe ser mayor o igual a 0' });
        }

        if ( ! isNonEmptyString( reason ) ) {
            return res.status( 400 ).json({
                msg: 'Debe especificar una justificación detallada (reason) para el ajuste de inventario'
            });
        }

        const result = await dbRegisterAdjustment({
            productId,
            newStock,
            referenceDocument: typeof referenceDocument === 'string' ? referenceDocument.trim() : '',
            reason: reason.trim(),
            performedBy: req.userFound._id
        });

        if ( result.error === 'PRODUCT_NOT_FOUND' ) {
            return res.status( 404 ).json({ msg: 'Material no encontrado o se encuentra inactivo' });
        }

        if ( result.error === 'NO_STOCK_CHANGE' ) {
            return res.status( 400 ).json({
                msg: `El stock físico ingresado (${ newStock }) es igual al stock actual en sistema`
            });
        }

        return res.status( 201 ).json({
            msg: 'Ajuste de inventario registrado con éxito',
            data: result
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo registrar el ajuste de inventario' });
    }
};

// GET /api/inventory/movements -> Consultar historial general de movimientos (RU-F12 / RE-F11)
const getInventoryMovements = async ( req, res ) => {
    try {
        const { productId, type, performedBy, startDate, endDate, page, limit } = req.query;

        if ( productId && ! isValidObjectId( String( productId ) ) ) {
            return res.status( 400 ).json({ msg: 'El filtro productId no es válido' });
        }

        if ( performedBy && ! isValidObjectId( String( performedBy ) ) ) {
            return res.status( 400 ).json({ msg: 'El filtro performedBy no es válido' });
        }

        const result = await dbGetMovements({
            productId: typeof productId === 'string' ? productId : undefined,
            type: typeof type === 'string' ? type : undefined,
            performedBy: typeof performedBy === 'string' ? performedBy : undefined,
            startDate: typeof startDate === 'string' ? startDate : undefined,
            endDate: typeof endDate === 'string' ? endDate : undefined,
            page,
            limit
        });

        return res.json({
            msg: 'Historial de movimientos obtenido con éxito',
            data: result.movements,
            pagination: result.pagination
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo consultar el historial de movimientos' });
    }
};

// GET /api/inventory/movements/product/:productId -> Kardex de un material específico
const getProductMovements = async ( req, res ) => {
    try {
        const { productId } = req.params;
        const { type, startDate, endDate, page, limit } = req.query;

        if ( ! isValidObjectId( productId ) ) {
            return res.status( 400 ).json({ msg: 'El identificador del material no es válido' });
        }

        const product = await dbGetProductById( productId, { includeInactive: true } );
        if ( ! product ) {
            return res.status( 404 ).json({ msg: 'Material no encontrado' });
        }

        const result = await dbGetMovements({
            productId,
            type: typeof type === 'string' ? type : undefined,
            startDate: typeof startDate === 'string' ? startDate : undefined,
            endDate: typeof endDate === 'string' ? endDate : undefined,
            page,
            limit
        });

        return res.json({
            msg: 'Historial del material obtenido con éxito',
            product: {
                _id: product._id,
                code: product.code,
                name: product.name,
                currentStock: product.stock,
                minStock: product.minStock,
                unit: product.unit
            },
            data: result.movements,
            pagination: result.pagination
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo obtener el historial del material' });
    }
};

// GET /api/inventory/alerts/low-stock -> Alertas de inventario bajo o agotado (RU-F11 / RE-F8)
const getLowStockAlerts = async ( req, res ) => {
    try {
        const alerts = await dbGetLowStockProducts();

        const formattedAlerts = alerts.map( ( product ) => ({
            _id: product._id,
            code: product.code,
            name: product.name,
            category: product.category,
            material: product.material,
            color: product.color,
            size: product.size,
            unit: product.unit,
            currentStock: product.stock,
            minStock: product.minStock,
            shortage: Math.max( 0, product.minStock - product.stock ),
            alertLevel: product.stock === 0 ? 'AGOTADO' : 'STOCK_BAJO',
            supplier: product.supplier,
            lastEntryAt: product.lastEntryAt
        }));

        return res.json({
            msg: 'Alertas de inventario bajo consultadas con éxito',
            totalAlerts: formattedAlerts.length,
            data: formattedAlerts
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudieron obtener las alertas de inventario bajo' });
    }
};

// GET /api/inventory/summary -> Resumen ejecutivo del inventario (RE-F1 / RE-F15)
const getInventorySummary = async ( req, res ) => {
    try {
        const summary = await dbGetInventorySummary();

        return res.json({
            msg: 'Resumen ejecutivo de inventario obtenido con éxito',
            data: summary
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo generar el resumen del inventario' });
    }
};

// POST /api/inventory/check-availability -> Verificar materiales requeridos para pedidos (RU-F15)
const checkOrderStockAvailability = async ( req, res ) => {
    try {
        const { items } = req.body ?? {};

        if ( ! Array.isArray( items ) || items.length === 0 ) {
            return res.status( 400 ).json({
                msg: 'Debe enviar un arreglo items con al menos un elemento { productId, quantity }'
            });
        }

        for ( const item of items ) {
            if ( ! item || ! isValidObjectId( item.productId ) || ! isPositiveNumber( item.quantity ) ) {
                return res.status( 400 ).json({
                    msg: 'Cada ítem debe contener un productId válido y una quantity numérica mayor a 0'
                });
            }
        }

        const result = await dbCheckStockAvailability( items );

        return res.json({
            msg: result.canFulfillOrder
                ? 'Hay existencias suficientes para cubrir el pedido'
                : 'Uno o más materiales no cuentan con stock suficiente',
            data: result
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo verificar la disponibilidad de stock' });
    }
};

export {
    registerInventoryEntry,
    registerInventoryExit,
    registerProductionUsage,
    registerInventoryAdjustment,
    getInventoryMovements,
    getProductMovements,
    getLowStockAlerts,
    getInventorySummary,
    checkOrderStockAvailability
};
