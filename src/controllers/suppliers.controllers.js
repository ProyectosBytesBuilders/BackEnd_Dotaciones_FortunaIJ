import handleMongooseError from '../helpers/handle-mongoose-error.helper.js';
import {
    dbCreateSupplier,
    dbGetSuppliers,
    dbGetSupplierById,
    dbUpdateSupplier,
    dbDeactivateSupplier,
    dbRestoreSupplier
} from '../services/suppliers.services.js';
import { isValidObjectId, isNonEmptyString } from '../helpers/inventory-validators.helper.js';

// POST /api/suppliers -> Registrar proveedor (RU-F9 / RE-F6)
const createSupplier = async ( req, res ) => {
    try {
        const {
            name,
            nit,
            contactName,
            phone,
            email,
            address,
            suppliedMaterials,
            notes
        } = req.body ?? {};

        if ( ! isNonEmptyString( name ) || ! isNonEmptyString( phone ) ) {
            return res.status( 400 ).json({
                msg: 'Los campos name y phone son obligatorios y deben ser texto'
            });
        }

        if ( ! Array.isArray( suppliedMaterials ) || suppliedMaterials.length === 0 ) {
            return res.status( 400 ).json({
                msg: 'Debe indicar al menos un material en el arreglo suppliedMaterials'
            });
        }

        const cleanMaterials = suppliedMaterials
            .filter( item => isNonEmptyString( item ) )
            .map( item => item.trim() );

        if ( cleanMaterials.length === 0 ) {
            return res.status( 400 ).json({
                msg: 'Los materiales en suppliedMaterials deben ser textos válidos'
            });
        }

        const payload = {
            name: name.trim(),
            phone: phone.trim(),
            suppliedMaterials: cleanMaterials,
            createdBy: req.userFound._id
        };

        if ( isNonEmptyString( nit ) ) payload.nit = nit.trim().toUpperCase();
        if ( typeof contactName === 'string' ) payload.contactName = contactName.trim();
        if ( isNonEmptyString( email ) ) payload.email = email.trim().toLowerCase();
        if ( typeof address === 'string' ) payload.address = address.trim();
        if ( typeof notes === 'string' ) payload.notes = notes.trim();

        const newSupplier = await dbCreateSupplier( payload );

        return res.status( 201 ).json({
            msg: 'Proveedor registrado con éxito',
            data: newSupplier
        });
    }
    catch ( error ) {
        const validationErrors = handleMongooseError( error );
        if ( validationErrors ) {
            return res.status( 400 ).json( validationErrors );
        }

        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo registrar el proveedor' });
    }
};

// GET /api/suppliers -> Consultar proveedores (RU-F9 / RU-F13)
const getSuppliers = async ( req, res ) => {
    try {
        const { search, material, status, page, limit } = req.query;

        const result = await dbGetSuppliers({
            search: typeof search === 'string' ? search : undefined,
            material: typeof material === 'string' ? material : undefined,
            status: typeof status === 'string' ? status : 'true',
            page,
            limit
        });

        return res.json({
            msg: 'Proveedores obtenidos con éxito',
            data: result.suppliers,
            pagination: result.pagination
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudieron consultar los proveedores' });
    }
};

// GET /api/suppliers/:id -> Consultar un proveedor específico
const getSupplierById = async ( req, res ) => {
    try {
        const { id } = req.params;

        if ( ! isValidObjectId( id ) ) {
            return res.status( 400 ).json({ msg: 'El identificador del proveedor no es válido' });
        }

        const supplier = await dbGetSupplierById( id, { includeInactive: true } );

        if ( ! supplier ) {
            return res.status( 404 ).json({ msg: 'Proveedor no encontrado' });
        }

        return res.json({
            msg: 'Proveedor obtenido con éxito',
            data: supplier
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo obtener el proveedor' });
    }
};

// PUT /api/suppliers/:id -> Actualizar proveedor (RU-F9)
const updateSupplier = async ( req, res ) => {
    try {
        const { id } = req.params;

        if ( ! isValidObjectId( id ) ) {
            return res.status( 400 ).json({ msg: 'El identificador del proveedor no es válido' });
        }

        const existing = await dbGetSupplierById( id, { includeInactive: true } );
        if ( ! existing ) {
            return res.status( 404 ).json({ msg: 'Proveedor no encontrado' });
        }

        const {
            name,
            nit,
            contactName,
            phone,
            email,
            address,
            suppliedMaterials,
            notes
        } = req.body ?? {};

        const updateData = {
            updatedBy: req.userFound._id
        };

        if ( name !== undefined ) {
            if ( ! isNonEmptyString( name ) ) {
                return res.status( 400 ).json({ msg: 'El nombre del proveedor debe ser texto válido' });
            }
            updateData.name = name.trim();
        }

        if ( nit !== undefined ) {
            if ( typeof nit !== 'string' ) {
                return res.status( 400 ).json({ msg: 'El NIT debe ser texto' });
            }
            updateData.nit = nit.trim() ? nit.trim().toUpperCase() : undefined;
        }

        if ( contactName !== undefined ) {
            if ( typeof contactName !== 'string' ) {
                return res.status( 400 ).json({ msg: 'El nombre de contacto debe ser texto' });
            }
            updateData.contactName = contactName.trim();
        }

        if ( phone !== undefined ) {
            if ( ! isNonEmptyString( phone ) ) {
                return res.status( 400 ).json({ msg: 'El teléfono debe ser texto válido' });
            }
            updateData.phone = phone.trim();
        }

        if ( email !== undefined ) {
            if ( typeof email !== 'string' ) {
                return res.status( 400 ).json({ msg: 'El correo electrónico debe ser texto' });
            }
            updateData.email = email.trim().toLowerCase();
        }

        if ( address !== undefined ) {
            if ( typeof address !== 'string' ) {
                return res.status( 400 ).json({ msg: 'La dirección debe ser texto' });
            }
            updateData.address = address.trim();
        }

        if ( suppliedMaterials !== undefined ) {
            if ( ! Array.isArray( suppliedMaterials ) || suppliedMaterials.length === 0 ) {
                return res.status( 400 ).json({
                    msg: 'suppliedMaterials debe ser un arreglo con al menos un material'
                });
            }
            updateData.suppliedMaterials = suppliedMaterials
                .filter( item => isNonEmptyString( item ) )
                .map( item => item.trim() );
        }

        if ( notes !== undefined ) {
            if ( typeof notes !== 'string' ) {
                return res.status( 400 ).json({ msg: 'Las observaciones deben ser texto' });
            }
            updateData.notes = notes.trim();
        }

        const updated = await dbUpdateSupplier( id, updateData );

        return res.json({
            msg: 'Proveedor actualizado con éxito',
            data: updated
        });
    }
    catch ( error ) {
        const validationErrors = handleMongooseError( error );
        if ( validationErrors ) {
            return res.status( 400 ).json( validationErrors );
        }

        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo actualizar el proveedor' });
    }
};

// DELETE /api/suppliers/:id -> Desactivar proveedor (borrado lógico)
const deleteSupplier = async ( req, res ) => {
    try {
        const { id } = req.params;

        if ( ! isValidObjectId( id ) ) {
            return res.status( 400 ).json({ msg: 'El identificador del proveedor no es válido' });
        }

        const deactivated = await dbDeactivateSupplier( id, req.userFound._id );

        if ( ! deactivated ) {
            return res.status( 404 ).json({ msg: 'Proveedor no encontrado o ya se encuentra inactivo' });
        }

        return res.json({
            msg: 'Proveedor desactivado con éxito',
            data: deactivated
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo desactivar el proveedor' });
    }
};

// PATCH /api/suppliers/:id/restore -> Reactivar proveedor
const restoreSupplier = async ( req, res ) => {
    try {
        const { id } = req.params;

        if ( ! isValidObjectId( id ) ) {
            return res.status( 400 ).json({ msg: 'El identificador del proveedor no es válido' });
        }

        const restored = await dbRestoreSupplier( id, req.userFound._id );

        if ( ! restored ) {
            return res.status( 404 ).json({ msg: 'Proveedor no encontrado o ya está activo' });
        }

        return res.json({
            msg: 'Proveedor reactivado con éxito',
            data: restored
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo reactivar el proveedor' });
    }
};

export {
    createSupplier,
    getSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    restoreSupplier
};