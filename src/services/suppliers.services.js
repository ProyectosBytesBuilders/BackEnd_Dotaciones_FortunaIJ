import SupplierModel from '../models/supplier.model.js';
import { escapeRegex } from '../helpers/inventory-validators.helper.js';

const dbCreateSupplier = async ( supplierData ) => {
    const created = await SupplierModel.create( supplierData );
    return await SupplierModel.findById( created._id )
        .populate( 'createdBy', 'name email role' );
};

const dbGetSuppliers = async ({ search, material, status = 'true', page = 1, limit = 10 } = {}) => {
    const filter = {};

    if ( status === 'true' ) filter.status = true;
    else if ( status === 'false' ) filter.status = false;

    if ( search ) {
        const safeRegex = new RegExp( escapeRegex( search.trim() ), 'i' );
        filter.$or = [
            { name: safeRegex },
            { nit: safeRegex },
            { contactName: safeRegex },
            { suppliedMaterials: safeRegex }
        ];
    }

    if ( material ) {
        filter.suppliedMaterials = new RegExp( escapeRegex( material.trim() ), 'i' );
    }

    const safePage = Math.max( 1, Number( page ) || 1 );
    const safeLimit = Math.min( 100, Math.max( 1, Number( limit ) || 10 ) );
    const skip = ( safePage - 1 ) * safeLimit;

    const [ suppliers, total ] = await Promise.all([
        SupplierModel.find( filter )
            .populate( 'createdBy', 'name email role' )
            .populate( 'updatedBy', 'name email role' )
            .sort({ name: 1 })
            .skip( skip )
            .limit( safeLimit ),
        SupplierModel.countDocuments( filter )
    ]);

    return {
        suppliers,
        pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil( total / safeLimit ) || 1
        }
    };
};

const dbGetSupplierById = async ( id, { includeInactive = false } = {} ) => {
    const filter = includeInactive ? { _id: id } : { _id: id, status: true };

    return await SupplierModel.findOne( filter )
        .populate( 'createdBy', 'name email role' )
        .populate( 'updatedBy', 'name email role' );
};

const dbUpdateSupplier = async ( id, updateData ) => {
    return await SupplierModel.findOneAndUpdate(
        { _id: id },
        { $set: updateData },
        { returnDocument: 'after', runValidators: true }
    )
        .populate( 'createdBy', 'name email role' )
        .populate( 'updatedBy', 'name email role' );
};

const dbDeactivateSupplier = async ( id, updatedBy ) => {
    return await SupplierModel.findOneAndUpdate(
        { _id: id, status: true },
        { $set: { status: false, updatedBy } },
        { returnDocument: 'after' }
    );
};

const dbRestoreSupplier = async ( id, updatedBy ) => {
    return await SupplierModel.findOneAndUpdate(
        { _id: id, status: false },
        { $set: { status: true, updatedBy } },
        { returnDocument: 'after' }
    );
};

export {
    dbCreateSupplier,
    dbGetSuppliers,
    dbGetSupplierById,
    dbUpdateSupplier,
    dbDeactivateSupplier,
    dbRestoreSupplier
};