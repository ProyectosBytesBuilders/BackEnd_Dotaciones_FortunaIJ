import handleMongooseError from '../helpers/handle-mongoose-error.helper.js';
import { ROLES } from '../constants/roles.js';
import {
    PRODUCT_CATEGORIES_LIST,
    UNIT_TYPES,
    UNIT_TYPES_LIST,
    MOVEMENT_TYPES
} from '../constants/inventory.constants.js';
import {
    dbCreateProduct,
    dbGetProducts,
    dbGetProductById,
    dbGetProductByCode,
    dbUpdateProduct,
    dbUpdateProductMinStock,
    dbDeactivateProduct,
    dbRestoreProduct
} from '../services/products.services.js';
import { dbGetSupplierById } from '../services/suppliers.services.js';
import InventoryMovementModel from '../models/inventory-movement.model.js';
import {
    isValidObjectId,
    isNonEmptyString,
    isNonNegativeNumber
} from '../helpers/inventory-validators.helper.js';

// Formatea la vista del producto según el rol (los clientes no ven costos internos ni auditoría)
const formatProductForRole = ( product, role ) => {
    const plain = product.toObject ? product.toObject() : { ...product };

    if ( role === ROLES.CLIENTE ) {
        delete plain.unitPrice;
        delete plain.minStock;
        delete plain.location;
        delete plain.supplier;
        delete plain.createdBy;
        delete plain.updatedBy;
    }

    return plain;
};

// POST /api/products -> Registrar nuevo material o dotación (RU-F4 / RE-F2)
const createProduct = async ( req, res ) => {
    try {
        const {
            code,
            name,
            description,
            category,
            material,
            color,
            size,
            unit,
            stock = 0,
            minStock = 5,
            unitPrice = 0,
            location,
            supplier
        } = req.body ?? {};

        if (
            ! isNonEmptyString( code ) ||
            ! isNonEmptyString( name ) ||
            ! isNonEmptyString( category ) ||
            ! isNonEmptyString( material ) ||
            ! isNonEmptyString( color )
        ) {
            return res.status( 400 ).json({
                msg: 'Los campos code, name, category, material y color son obligatorios y deben ser texto'
            });
        }

        const normalizedCategory = category.trim().toUpperCase();
        if ( ! PRODUCT_CATEGORIES_LIST.includes( normalizedCategory ) ) {
            return res.status( 400 ).json({
                msg: `Categoría inválida. Valores permitidos: ${ PRODUCT_CATEGORIES_LIST.join( ', ' ) }`
            });
        }

        const normalizedUnit = unit ? String( unit ).trim().toUpperCase() : UNIT_TYPES.UNIDAD;
        if ( ! UNIT_TYPES_LIST.includes( normalizedUnit ) ) {
            return res.status( 400 ).json({
                msg: `Unidad inválida. Valores permitidos: ${ UNIT_TYPES_LIST.join( ', ' ) }`
            });
        }

        if ( ! isNonNegativeNumber( stock ) || ! isNonNegativeNumber( minStock ) || ! isNonNegativeNumber( unitPrice ) ) {
            return res.status( 400 ).json({
                msg: 'Los campos stock, minStock y unitPrice deben ser valores numéricos mayores o iguales a 0'
            });
        }

        const normalizedCode = code.trim().toUpperCase();
        const duplicated = await dbGetProductByCode( normalizedCode );
        if ( duplicated ) {
            return res.status( 400 ).json({
                code: `Ya existe un material registrado con el código '${ normalizedCode }'`
            });
        }

        let validSupplierId = null;
        if ( supplier !== undefined && supplier !== null && supplier !== '' ) {
            if ( ! isValidObjectId( supplier ) ) {
                return res.status( 400 ).json({ msg: 'El identificador del proveedor no es válido' });
            }

            const supplierFound = await dbGetSupplierById( supplier );
            if ( ! supplierFound ) {
                return res.status( 404 ).json({ msg: 'El proveedor especificado no existe o está inactivo' });
            }

            validSupplierId = supplierFound._id;
        }

        const now = new Date();
        const newProduct = await dbCreateProduct({
            code: normalizedCode,
            name: name.trim(),
            description: typeof description === 'string' ? description.trim() : '',
            category: normalizedCategory,
            material: material.trim(),
            color: color.trim(),
            size: isNonEmptyString( size ) ? size.trim().toUpperCase() : 'N/A',
            unit: normalizedUnit,
            stock,
            minStock,
            unitPrice,
            location: isNonEmptyString( location ) ? location.trim() : 'Bodega Principal',
            supplier: validSupplierId,
            lastEntryAt: stock > 0 ? now : null,
            createdBy: req.userFound._id
        });

        // Si el material nace con stock inicial > 0, se registra su entrada inicial en el Kardex
        if ( stock > 0 ) {
            await InventoryMovementModel.create({
                product: newProduct._id,
                type: MOVEMENT_TYPES.ENTRADA,
                quantity: stock,
                previousStock: 0,
                newStock: stock,
                unitCost: unitPrice,
                supplier: validSupplierId,
                referenceDocument: 'INVENTARIO-INICIAL',
                reason: 'Registro inicial de existencias al crear el material',
                performedBy: req.userFound._id
            });
        }

        return res.status( 201 ).json({
            msg: 'Material registrado en el inventario con éxito',
            data: newProduct
        });
    }
    catch ( error ) {
        const validationErrors = handleMongooseError( error );
        if ( validationErrors ) {
            return res.status( 400 ).json( validationErrors );
        }

        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo registrar el material en el inventario' });
    }
};

// GET /api/products -> Consultar y buscar inventario (RU-F3 / RU-F10 / RE-F5 / RF5)
const getProducts = async ( req, res ) => {
    try {
        const userRole = req.userFound.role;
        const {
            search,
            category,
            color,
            size,
            supplier,
            lowStock,
            status,
            page,
            limit,
            sortBy,
            sortOrder
        } = req.query;

        if ( supplier && ! isValidObjectId( String( supplier ) ) ) {
            return res.status( 400 ).json({ msg: 'El filtro de proveedor no tiene un formato válido' });
        }

        const isClient = userRole === ROLES.CLIENTE;

        const result = await dbGetProducts({
            search: typeof search === 'string' ? search : undefined,
            category: typeof category === 'string' ? category : undefined,
            color: typeof color === 'string' ? color : undefined,
            size: typeof size === 'string' ? size : undefined,
            supplier: typeof supplier === 'string' ? supplier : undefined,
            lowStock: isClient ? undefined : ( typeof lowStock === 'string' ? lowStock : undefined ),
            inStockOnly: isClient ? 'true' : undefined,
            status: isClient ? 'true' : ( typeof status === 'string' ? status : 'true' ),
            page,
            limit,
            sortBy: typeof sortBy === 'string' ? sortBy : undefined,
            sortOrder: typeof sortOrder === 'string' ? sortOrder : undefined
        });

        const formattedProducts = result.products.map( item => formatProductForRole( item, userRole ) );

        return res.json({
            msg: 'Inventario consultado con éxito',
            data: formattedProducts,
            pagination: result.pagination
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo consultar el inventario' });
    }
};

// GET /api/products/:id -> Consultar detalle de un material o dotación
const getProductById = async ( req, res ) => {
    try {
        const { id } = req.params;

        if ( ! isValidObjectId( id ) ) {
            return res.status( 400 ).json({ msg: 'El identificador del material no es válido' });
        }

        const isManager = [ ROLES.GERENTE_GENERAL, ROLES.ADMIN_INVENTARIO ].includes( req.userFound.role );
        const product = await dbGetProductById( id, { includeInactive: isManager } );

        if ( ! product ) {
            return res.status( 404 ).json({ msg: 'Material o dotación no encontrado' });
        }

        return res.json({
            msg: 'Material obtenido con éxito',
            data: formatProductForRole( product, req.userFound.role )
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo obtener el material' });
    }
};

// PUT /api/products/:id -> Actualizar metadatos del material (RU-F5)
// Nota: El stock NO se edita aquí directamente; debe hacerse por movimientos de entrada/salida/ajuste
const updateProduct = async ( req, res ) => {
    try {
        const { id } = req.params;

        if ( ! isValidObjectId( id ) ) {
            return res.status( 400 ).json({ msg: 'El identificador del material no es válido' });
        }

        if ( req.body && req.body.stock !== undefined ) {
            return res.status( 400 ).json({
                msg: 'No se permite modificar el stock directamente. Utilice los endpoints de entrada, salida o ajuste en /api/inventory/movements'
            });
        }

        const existing = await dbGetProductById( id, { includeInactive: true } );
        if ( ! existing ) {
            return res.status( 404 ).json({ msg: 'Material o dotación no encontrado' });
        }

        const {
            code,
            name,
            description,
            category,
            material,
            color,
            size,
            unit,
            minStock,
            unitPrice,
            location,
            supplier
        } = req.body ?? {};

        const updateData = {
            updatedBy: req.userFound._id
        };

        if ( code !== undefined ) {
            if ( ! isNonEmptyString( code ) ) {
                return res.status( 400 ).json({ msg: 'El código debe ser texto válido' });
            }
            const normalizedCode = code.trim().toUpperCase();
            if ( normalizedCode !== existing.code ) {
                const duplicated = await dbGetProductByCode( normalizedCode );
                if ( duplicated ) {
                    return res.status( 400 ).json({
                        code: `Ya existe un material registrado con el código '${ normalizedCode }'`
                    });
                }
            }
            updateData.code = normalizedCode;
        }

        if ( name !== undefined ) {
            if ( ! isNonEmptyString( name ) ) {
                return res.status( 400 ).json({ msg: 'El nombre debe ser texto válido' });
            }
            updateData.name = name.trim();
        }

        if ( description !== undefined ) {
            if ( typeof description !== 'string' ) {
                return res.status( 400 ).json({ msg: 'La descripción debe ser texto' });
            }
            updateData.description = description.trim();
        }

        if ( category !== undefined ) {
            if ( ! isNonEmptyString( category ) ) {
                return res.status( 400 ).json({ msg: 'La categoría debe ser texto' });
            }
            const normalizedCategory = category.trim().toUpperCase();
            if ( ! PRODUCT_CATEGORIES_LIST.includes( normalizedCategory ) ) {
                return res.status( 400 ).json({
                    msg: `Categoría inválida. Valores permitidos: ${ PRODUCT_CATEGORIES_LIST.join( ', ' ) }`
                });
            }
            updateData.category = normalizedCategory;
        }

        if ( material !== undefined ) {
            if ( ! isNonEmptyString( material ) ) {
                return res.status( 400 ).json({ msg: 'El material debe ser texto válido' });
            }
            updateData.material = material.trim();
        }

        if ( color !== undefined ) {
            if ( ! isNonEmptyString( color ) ) {
                return res.status( 400 ).json({ msg: 'El color debe ser texto válido' });
            }
            updateData.color = color.trim();
        }

        if ( size !== undefined ) {
            if ( typeof size !== 'string' ) {
                return res.status( 400 ).json({ msg: 'La talla debe ser texto' });
            }
            updateData.size = size.trim() ? size.trim().toUpperCase() : 'N/A';
        }

        if ( unit !== undefined ) {
            if ( ! isNonEmptyString( unit ) ) {
                return res.status( 400 ).json({ msg: 'La unidad debe ser texto' });
            }
            const normalizedUnit = unit.trim().toUpperCase();
            if ( ! UNIT_TYPES_LIST.includes( normalizedUnit ) ) {
                return res.status( 400 ).json({
                    msg: `Unidad inválida. Valores permitidos: ${ UNIT_TYPES_LIST.join( ', ' ) }`
                });
            }
            updateData.unit = normalizedUnit;
        }

        if ( minStock !== undefined ) {
            if ( ! isNonNegativeNumber( minStock ) ) {
                return res.status( 400 ).json({ msg: 'El stock mínimo debe ser un número mayor o igual a 0' });
            }
            updateData.minStock = minStock;
        }

        if ( unitPrice !== undefined ) {
            if ( ! isNonNegativeNumber( unitPrice ) ) {
                return res.status( 400 ).json({ msg: 'El precio unitario debe ser un número mayor o igual a 0' });
            }
            updateData.unitPrice = unitPrice;
        }

        if ( location !== undefined ) {
            if ( typeof location !== 'string' ) {
                return res.status( 400 ).json({ msg: 'La ubicación debe ser texto' });
            }
            updateData.location = location.trim();
        }

        if ( supplier !== undefined ) {
            if ( supplier === null || supplier === '' ) {
                updateData.supplier = null;
            }
            else {
                if ( ! isValidObjectId( supplier ) ) {
                    return res.status( 400 ).json({ msg: 'El identificador del proveedor no es válido' });
                }
                const supplierFound = await dbGetSupplierById( supplier );
                if ( ! supplierFound ) {
                    return res.status( 404 ).json({ msg: 'El proveedor especificado no existe o está inactivo' });
                }
                updateData.supplier = supplierFound._id;
            }
        }

        const updatedProduct = await dbUpdateProduct( id, updateData );

        return res.json({
            msg: 'Material actualizado con éxito',
            data: updatedProduct
        });
    }
    catch ( error ) {
        const validationErrors = handleMongooseError( error );
        if ( validationErrors ) {
            return res.status( 400 ).json( validationErrors );
        }

        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo actualizar el material' });
    }
};

// PATCH /api/products/:id/min-stock -> Configurar nivel mínimo de inventario (RE-F7)
const updateProductMinStock = async ( req, res ) => {
    try {
        const { id } = req.params;
        const { minStock } = req.body ?? {};

        if ( ! isValidObjectId( id ) ) {
            return res.status( 400 ).json({ msg: 'El identificador del material no es válido' });
        }

        if ( ! isNonNegativeNumber( minStock ) ) {
            return res.status( 400 ).json({
                msg: 'El campo minStock es obligatorio y debe ser un número mayor o igual a 0'
            });
        }

        const updated = await dbUpdateProductMinStock( id, minStock, req.userFound._id );

        if ( ! updated ) {
            return res.status( 404 ).json({ msg: 'Material no encontrado o inactivo' });
        }

        return res.json({
            msg: 'Nivel mínimo de inventario actualizado con éxito',
            data: updated
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo actualizar el nivel mínimo de inventario' });
    }
};

// DELETE /api/products/:id -> Eliminar/desactivar material del sistema (RU-F6)
const deleteProduct = async ( req, res ) => {
    try {
        const { id } = req.params;

        if ( ! isValidObjectId( id ) ) {
            return res.status( 400 ).json({ msg: 'El identificador del material no es válido' });
        }

        const deactivated = await dbDeactivateProduct( id, req.userFound._id );

        if ( ! deactivated ) {
            return res.status( 404 ).json({ msg: 'Material no encontrado o ya fue eliminado' });
        }

        return res.json({
            msg: 'Material desactivado del inventario con éxito',
            data: deactivated
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo eliminar el material' });
    }
};

// PATCH /api/products/:id/restore -> Reactivar material desactivado
const restoreProduct = async ( req, res ) => {
    try {
        const { id } = req.params;

        if ( ! isValidObjectId( id ) ) {
            return res.status( 400 ).json({ msg: 'El identificador del material no es válido' });
        }

        const restored = await dbRestoreProduct( id, req.userFound._id );

        if ( ! restored ) {
            return res.status( 404 ).json({ msg: 'Material no encontrado o ya está activo' });
        }

        return res.json({
            msg: 'Material reactivado con éxito',
            data: restored
        });
    }
    catch ( error ) {
        console.error( error );
        return res.status( 500 ).json({ msg: 'No se pudo reactivar el material' });
    }
};

export {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    updateProductMinStock,
    deleteProduct,
    restoreProduct
};