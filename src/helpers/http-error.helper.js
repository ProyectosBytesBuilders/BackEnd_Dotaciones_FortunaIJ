// Error controlado: los servicios lo lanzan (throw) y el controlador lo convierte en respuesta HTTP.
//   throw new HttpError( 404, 'Pedido no encontrado' );
class HttpError extends Error {
    constructor( status, msg ) {
        super( msg );
        this.status = status;
    }
}

export default HttpError;
