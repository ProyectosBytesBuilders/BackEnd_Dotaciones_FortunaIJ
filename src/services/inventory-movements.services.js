import ProductModel from '../models/product.model.js';
import InventoryMovementModel from '../models/inventory-movement.model.js';
import { MOVEMENT_TYPES } from '../constants/inventory.constants.js';

// RU-F7 / RE-F3: Registrar entrada de inventario e incrementar stock de forma atómica
const dbRegisterEntry = async ({
    productId,
    quantity,
    unitCost,
    supplierId,
    referenceDocument,
    reason,
    performedBy
}) => {
    const updateFields = {
        lastEntryAt: new Date(),
        updatedBy: performedBy
    };

    if ( supplierId ) updateFields.supplier = supplierId;
    if ( typeof unitCost === 'number' ) updateFields.unitPrice = unitCost;

    const updatedProduct = await ProductModel.findOneAndUpdate(
        { _id: productId, status: true },
        {
            $inc: { stock: quantity },
            $set: updateFields
        },
        { returnDocument: 'after', runValidators: true }
    ).populate( 'supplier', 'name nit phone email' );

    if ( ! updatedProduct ) {
        return null;
    }

    const newStock = updatedProduct.stock;
    const previousStock = newStock - quantity;

    const movement = await InventoryMovementModel.create({
        product: updatedProduct._id,
        type: MOVEMENT_TYPES.ENTRADA,
        quantity,
        previousStock,
        newStock,
        unitCost: typeof unitCost === 'number' ? unitCost : updatedProduct.unitPrice,
        supplier: supplierId || updatedProduct.supplier?._id || null,
        referenceDocument: referenceDocument || '',
        reason,
        performedBy
    });

    const populatedMovement = await InventoryMovementModel.findById( movement._id )
        .populate( 'product', 'code name category material color size unit' )
        .populate( 'supplier', 'name' )
        .populate( 'performedBy', 'name email role' );

    return {
        product: updatedProduct,
        movement: populatedMovement
    };
};

// RU-F8 / RU-F14 / RE-F4: Registrar salida o consumo en producción validando stock suficiente
const dbRegisterExit = async ({
    productId,
    quantity,
    type = MOVEMENT_TYPES.SALIDA,
    colorUsed = null,
    productionOrder = null,
    referenceDocument = '',
    reason,
    performedBy
}) => {
    const existingProduct = await ProductModel.findOne({ _id: productId, status: true });

    if ( ! existingProduct ) {
        return { error: 'PRODUCT_NOT_FOUND' };
    }

    if ( existingProduct.stock < quantity ) {
        return {
            error: 'INSUFFICIENT_STOCK',
            availableStock: existingProduct.stock,
            productName: existingProduct.name
        };
    }

    // Actualización atómica condicional: evita condiciones de carrera si dos usuarios operan a la vez
    const updatedProduct = await ProductModel.findOneAndUpdate(
        {
            _id: productId,
            status: true,
            stock: { $gte: quantity }
        },
        {
            $inc: { stock: -quantity },
            $set: { updatedBy: performedBy }
        },
        { returnDocument: 'after', runValidators: true }
    ).populate( 'supplier', 'name nit phone email' );

    if ( ! updatedProduct ) {
        return {
            error: 'INSUFFICIENT_STOCK',
            availableStock: existingProduct.stock,
            productName: existingProduct.name
        };
    }

    const newStock = updatedProduct.stock;
    const previousStock = newStock + quantity;

    const movement = await InventoryMovementModel.create({
        product: updatedProduct._id,
        type,
        quantity,
        previousStock,
        newStock,
        unitCost: updatedProduct.unitPrice,
        colorUsed,
        productionOrder,
        referenceDocument,
        reason,
        performedBy
    });

    const populatedMovement = await InventoryMovementModel.findById( movement._id )
        .populate( 'product', 'code name category material color size unit' )
        .populate( 'performedBy', 'name email role' );

    return {
        product: updatedProduct,
        movement: populatedMovement
    };
};

// RE-F12 / RE-F13: Ajuste de inventario físico con trazabilidad de diferencias
const dbRegisterAdjustment = async ({
    productId,
    newStock,
    referenceDocument = '',
    reason,
    performedBy
}) => {
    const existingProduct = await ProductModel.findOne({ _id: productId, status: true });

    if ( ! existingProduct ) {
        return { error: 'PRODUCT_NOT_FOUND' };
    }

    const previousStock = existingProduct.stock;

    if ( previousStock === newStock ) {
        return { error: 'NO_STOCK_CHANGE', currentStock: previousStock };
    }

    const difference = Math.abs( newStock - previousStock );

    const updatedProduct = await ProductModel.findOneAndUpdate(
        { _id: productId, status: true },
        {
            $set: {
                stock: newStock,
                updatedBy: performedBy
            }
        },
        { returnDocument: 'after', runValidators: true }
    ).populate( 'supplier', 'name nit phone email' );

    const movement = await InventoryMovementModel.create({
        product: updatedProduct._id,
        type: MOVEMENT_TYPES.AJUSTE,
        quantity: difference,
        previousStock,
        newStock,
        unitCost: updatedProduct.unitPrice,
        referenceDocument,
        reason,
        performedBy
    });

    const populatedMovement = await InventoryMovementModel.findById( movement._id )
        .populate( 'product', 'code name category material color size unit' )
        .populate( 'performedBy', 'name email role' );

    return {
        product: updatedProduct,
        movement: populatedMovement
    };
};

// RU-F12 / RE-F11: Consultar historial de movimientos con filtros y paginación
const dbGetMovements = async ({
    productId,
    type,
    performedBy,
    startDate,
    endDate,
    page = 1,
    limit = 15
} = {}) => {
    const filter = {};

    if ( productId ) filter.product = productId;
    if ( type ) filter.type = String( type ).trim().toUpperCase();
    if ( performedBy ) filter.performedBy = performedBy;

    if ( startDate || endDate ) {
        filter.createdAt = {};
        if ( startDate ) filter.createdAt.$gte = new Date( startDate );
        if ( endDate ) {
            const end = new Date( endDate );
            end.setHours( 23, 59, 59, 999 );
            filter.createdAt.$lte = end;
        }
    }

    const safePage = Math.max( 1, Number( page ) || 1 );
    const safeLimit = Math.min( 100, Math.max( 1, Number( limit ) || 15 ) );
    const skip = ( safePage - 1 ) * safeLimit;

    const [ movements, total ] = await Promise.all([
        InventoryMovementModel.find( filter )
            .populate( 'product', 'code name category material color size unit' )
            .populate( 'supplier', 'name' )
            .populate( 'performedBy', 'name email role' )
            .sort({ createdAt: -1 })
            .skip( skip )
            .limit( safeLimit ),
        InventoryMovementModel.countDocuments( filter )
    ]);

    return {
        movements,
        pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil( total / safeLimit ) || 1
        }
    };
};

// RE-F1 / RE-F15: Indicadores ejecutivos del inventario para toma de decisiones
const dbGetInventorySummary = async () => {
    const [ kpisResult, byCategory, topProductionMaterials, recentMovements ] = await Promise.all([
        ProductModel.aggregate([
            { $match: { status: true } },
            {
                $group: {
                    _id: null,
                    totalReferences: { $sum: 1 },
                    totalUnits: { $sum: '$stock' },
                    totalInventoryValue: {
                        $sum: { $multiply: [ '$stock', '$unitPrice' ] }
                    },
                    lowStockCount: {
                        $sum: {
                            $cond: [ { $lte: [ '$stock', '$minStock' ] }, 1, 0 ]
                        }
                    },
                    outOfStockCount: {
                        $sum: {
                            $cond: [ { $eq: [ '$stock', 0 ] }, 1, 0 ]
                        }
                    }
                }
            }
        ]),
        ProductModel.aggregate([
            { $match: { status: true } },
            {
                $group: {
                    _id: '$category',
                    references: { $sum: 1 },
                    totalUnits: { $sum: '$stock' },
                    totalValue: { $sum: { $multiply: [ '$stock', '$unitPrice' ] } }
                }
            },
            { $sort: { totalUnits: -1 } }
        ]),
        InventoryMovementModel.aggregate([
            { $match: { type: MOVEMENT_TYPES.PRODUCCION } },
            {
                $group: {
                    _id: '$product',
                    totalConsumed: { $sum: '$quantity' },
                    timesUsed: { $sum: 1 }
                }
            },
            { $sort: { totalConsumed: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    code: '$productInfo.code',
                    name: '$productInfo.name',
                    color: '$productInfo.color',
                    unit: '$productInfo.unit',
                    totalConsumed: 1,
                    timesUsed: 1
                }
            }
        ]),
        InventoryMovementModel.find()
            .populate( 'product', 'code name color size unit' )
            .populate( 'performedBy', 'name role' )
            .sort({ createdAt: -1 })
            .limit( 8 )
    ]);

    const kpis = kpisResult[ 0 ] || {
        totalReferences: 0,
        totalUnits: 0,
        totalInventoryValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0
    };

    delete kpis._id;

    return {
        kpis,
        byCategory,
        topProductionMaterials,
        recentMovements
    };
};

// RU-F15: Verificar disponibilidad de materiales y cantidades para un pedido
const dbCheckStockAvailability = async ( items = [] ) => {
    const productIds = items.map( item => item.productId );
    const products = await ProductModel.find({
        _id: { $in: productIds },
        status: true
    });

    const productMap = new Map( products.map( p => [ String( p._id ), p ] ) );

    const evaluation = items.map( ( item ) => {
        const product = productMap.get( String( item.productId ) );

        if ( ! product ) {
            return {
                productId: item.productId,
                found: false,
                requestedQuantity: item.quantity,
                availableStock: 0,
                hasEnoughStock: false,
                deficit: item.quantity
            };
        }

        const hasEnoughStock = product.stock >= item.quantity;

        return {
            productId: product._id,
            found: true,
            code: product.code,
            name: product.name,
            material: product.material,
            color: product.color,
            size: product.size,
            unit: product.unit,
            requestedQuantity: item.quantity,
            availableStock: product.stock,
            hasEnoughStock,
            deficit: hasEnoughStock ? 0 : item.quantity - product.stock
        };
    });

    const canFulfillOrder = evaluation.every( entry => entry.hasEnoughStock );

    return {
        canFulfillOrder,
        items: evaluation
    };
};

export {
    dbRegisterEntry,
    dbRegisterExit,
    dbRegisterAdjustment,
    dbGetMovements,
    dbGetInventorySummary,
    dbCheckStockAvailability
};