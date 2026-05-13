// server/utils/tarjeta.js

function validarTarjetaLuhn(numero) {
    if (!numero) return false;

    // 1. Quitamos espacios y guiones
    const numClean = String(numero).replace(/[\s-]/g, '');

    // 2. Verificamos que sean solo números y tengan una longitud lógica (13 a 19 dígitos)
    if (!/^\d{13,19}$/.test(numClean)) return false;

    // 3. Algoritmo de Luhn (Módulo 10)
    let suma = 0;
    let alternar = false;

    // Recorremos los números de derecha a izquierda
    for (let i = numClean.length - 1; i >= 0; i--) {
        let n = parseInt(numClean.charAt(i), 10);

        if (alternar) {
            n *= 2;
            if (n > 9) n -= 9;
        }

        suma += n;
        alternar = !alternar;
    }

    // Es válida si el total es múltiplo de 10
    return (suma % 10 === 0);
}

module.exports = { validarTarjetaLuhn };