// Contraseña segura: 8 a 50 caracteres, sin espacios, con minúscula, mayúscula, número y símbolo.
// Se valida ANTES de encriptar, porque el hash ya no cumpliría esta regla.
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])[^\s]{8,50}$/;

export const PASSWORD_MESSAGE =
    'La contraseña debe tener entre 8 y 50 caracteres, sin espacios, e incluir una mayúscula, una minúscula, un número y un símbolo';
