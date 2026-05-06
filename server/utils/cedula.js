'use strict';

// ══ VALIDADOR DE CÉDULA ECUATORIANA ════════════════════════════════
// Reglas:
//   1. 10 dígitos numéricos.
//   2. Provincia (dígitos 1-2): 01-24, o 30 (ecuatorianos en el exterior).
//   3. Tercer dígito < 6 (persona natural; 6,7,8,9 son sociedades).
//   4. Algoritmo módulo 10 con coeficientes [2,1,2,1,2,1,2,1,2]:
//      - Multiplica cada uno de los primeros 9 dígitos por su coeficiente.
//      - Si el producto > 9, réstale 9.
//      - Suma todos los productos.
//      - Dígito esperado: (10 - sum%10) %10  ↔ debe coincidir con el 10°.

function validateCedulaEC(cedula) {
    if (typeof cedula !== 'string') return { ok: false, reason: 'Cédula debe ser texto' };
    if (!/^\d{10}$/.test(cedula))   return { ok: false, reason: 'Debe tener exactamente 10 dígitos' };

    const province = parseInt(cedula.substring(0, 2), 10);
    const provinceValid = (province >= 1 && province <= 24) || province === 30;
    if (!provinceValid) return { ok: false, reason: `Código de provincia inválido (${cedula.substring(0,2)})` };

    const third = parseInt(cedula[2], 10);
    if (third > 5) return { ok: false, reason: 'Tercer dígito inválido para persona natural' };

    const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        let prod = parseInt(cedula[i], 10) * coef[i];
        if (prod > 9) prod -= 9;
        sum += prod;
    }
    const expected = (10 - (sum % 10)) % 10;
    const last     = parseInt(cedula[9], 10);
    if (expected !== last) return { ok: false, reason: 'Dígito verificador incorrecto' };

    return { ok: true };
}

module.exports = { validateCedulaEC };
