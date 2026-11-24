import ProductModel from '../models/product.model.js';
import { escapeRegex } from '../helpers/inventory-validators.helper.js';

const dbCreateProduct = async ( productData ) => {
    const created = await ProductModel.create( productData );
    return await ProductModel.findById( created._id )
        .populate( 'supplier', 'name nit phone email suppliedMaterials' )
        .populate( 'createdBy', 'name email role' );
};

const dbGetProducts = async ({
    search,
    category,
    color,
    size,
    supplier,
    lowStock,
    inStockOnly,
    status = 'true',
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
} = {}) => {
    const filter = {};

    if ( status === 'true' ) filter.status = true;
    else if ( status === 'false' ) filter.status = false;

    // RU-F10: Búsqueda por nombre, código, material o descripción
    if ( search ) {
        const safeRegex = new RegExp( escapeRegex( search.trim() ), 'i' );
        filter.$or = [
            { code: safeRegex },
            { name: safeRegex },
            { material: safeRegex },
            { description: safeRegex }
        ];
    }

    if ( category ) {
        filter.category = String( category ).trim().toUpperCase();
    }

    if ( color ) {
        filter.color = new RegExp( `^${ escapeRegex( color.trim() ) }$`, 'i' );
    }

    if ( size ) {
        filter.size = String( size ).trim().toUpperCase();
    }

    if ( supplier ) {
        filter.supplier = supplier;
    }

    if ( lowStock === 'true' ) {
        filter.$expr = { $lte: [ '$stock', '$minStock' ] };
    }

    if ( inStockOnly === 'true' ) {
        filter.stock = { $gt: 0 };
    }

    const allowedSortFields = [ 'createdAt', 'updatedAt', 'name', 'code', 'stock', 'unitPrice', 'lastEntryAt' ];
    const safeSortBy = allowedSortFields.includes( sortBy ) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'asc' ? 1 : -1;

    const safePage = Math.max( 1, Number( page ) || 1 );
    const safeLimit = Math.min( 100, Math.max( 1, Number( limit ) || 10 ) );
    const skip = ( safePage - 1 ) * safeLimit;

    const [ products, total ] = await Promise.all([
        ProductModel.find( filter )
            .populate( 'supplier', 'name nit phone email suppliedMaterials' )
            .populate( 'createdBy', 'name email role' )
            .populate( 'updatedBy', 'name email role' )
            .sort({ [ safeSortBy ]: safeSortOrder })
            .skip( skip )
            .limit( safeLimit ),
        ProductModel.countDocuments( filter )
    ]);

    return {
        products,
        pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil( total / safeLimit ) || 1
        }
    };
};

const dbGetProductById = async ( id, { includeInactive = false } = {} ) => {
    const filter = includeInactive ? { _id: id } : { _id: id, status: true };

    return await ProductModel.findOne( filter )
        .populate( 'supplier', 'name nit phone email suppliedMaterials' )
        .populate( 'createdBy', 'name email role' )
        .populate( 'updatedBy', 'name email role' );
};

const dbGetProductByCode = async ( code ) => {
    return await ProductModel.findOne({ code: String( code ).trim().toUpperCase() });
};

const dbUpdateProduct = async ( id, updateData ) => {
    return await ProductModel.findOneAndUpdate(
        { _id: id },
        { $set: updateData },
        { returnDocument: 'after', runValidators: true }
    )
        .populate( 'supplier', 'name nit phone email suppliedMaterials' )
        .populate( 'createdBy', 'name email role' )
        .populate( 'updatedBy', 'name email role' );
};

const dbUpdateProductMinStock = async ( id, minStock, updatedBy ) => {
    return await ProductModel.findOneAndUpdate(
        { _id: id, status: true },
        { $set: { minStock, updatedBy } },
        { returnDocument: 'after', runValidators: true }
    )
        .populate( 'supplier', 'name nit phone email suppliedMaterials' );
};

const dbDeactivateProduct = async ( id, updatedBy ) => {
    return await ProductModel.findOneAndUpdate(
        { _id: id, status: true },
        { $set: { status: false, updatedBy } },
        { returnDocument: 'after' }
    );
};

const dbRestoreProduct = async ( id, updatedBy ) => {
    return await ProductModel.findOneAndUpdate(
        { _id: id, status: false },
        { $set: { status: true, updatedBy } },
        { returnDocument: 'after' }
    );
};

// RU-F11 / RE-F8: Obtiene todos los materiales activos en nivel crítico o agotados
const dbGetLowStockProducts = async () => {
    return await ProductModel.find({
        status: true,
        $expr: { $lte: [ '$stock', '$minStock' ] }
    })
        .populate( 'supplier', 'name phone email' )
        .sort({ stock: 1, name: 1 });
};

export {
    dbCreateProduct,
    dbGetProducts,
    dbGetProductById,
    dbGetProductByCode,
    dbUpdateProduct,
    dbUpdateProductMinStock,
    dbDeactivateProduct,
    dbRestoreProduct,
    dbGetLowStockProducts
};