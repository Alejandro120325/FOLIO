// server/utils/telefono.js

function validarTelefonoEcuador(telefono) {
    if (!telefono) return false;

    // Quitamos espacios o guiones que el usuario haya puesto por costumbre
    const cleanPhone = telefono.replace(/[\s-]/g, '');

    // Regex: ^09 (empieza con 09) + \d{8} (seguido de 8 números) + $ (fin del texto)
    const regexCelular = /^09\d{8}$/;

    // Si quieres aceptar teléfonos fijos (02, 03, 04, 05, 06, 07 + 7 dígitos) descomenta esto:
    // const regexFijo = /^0[2-7]\d{7}$/;
    // return regexCelular.test(cleanPhone) || regexFijo.test(cleanPhone);

    return regexCelular.test(cleanPhone);
}

module.exports = { validarTelefonoEcuador };