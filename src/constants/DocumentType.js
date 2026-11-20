// Tipos de documento en el sistema, para los usuarios  CC, CE, NIT, TI, PAS
export const DocumentType = Object.freeze ({
CEDULA_CIUDADANIA: 'CC',
CEDULA_EXTRANJERIA: 'CE',
NUMERO_IDENTIFIACION_TRIBUTARIA: 'NIT',
PASAPORTE: 'PAS'


});

export const Document_Type = Object.values(DocumentType);