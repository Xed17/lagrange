/**
 * Módulo de Validación de Datos de Entrada
 * Implementa las reglas del requisito funcional RF-02 del plan de estudio:
 * - Campos no vacíos y numéricos válidos.
 * - Restricción de unicidad estricta en las abscisas (xi != xj).
 * - Restricción física del dominio: Memoria >= 0 y Latencia >= 0.
 * - x_eval numérico válido.
 * - Cantidad mínima de 2 nodos para interpolar.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LagrangeValidation = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Valida el arreglo de nodos y el valor a evaluar.
   * @param {Array<{x: any, y: any, id?: any}>} puntos - Lista de puntos ingresados
   * @param {any} xEvalRaw - Valor de x a evaluar
   * @returns {{
   *   esValido: boolean,
   *   puntos: Array<{x: number, y: number}>,
   *   xEval: number,
   *   errores: string[],
   *   campoErrores: Array<{index: number, campo: 'x'|'y', mensaje: string}>
   * }}
   */
  function validarEntrada(puntos, xEvalRaw) {
    const errores = [];
    const campoErrores = [];
    const puntosValidados = [];

    // 1. Verificación de cantidad de nodos
    if (!Array.isArray(puntos) || puntos.length < 2) {
      errores.push('Se requieren al menos 2 nodos experimentales para construir un polinomio interpolador.');
      return {
        esValido: false,
        puntos: [],
        xEval: NaN,
        errores,
        campoErrores
      };
    }

    // 2. Validación de cada nodo (xi, yi)
    const mapaX = new Map();

    puntos.forEach((p, idx) => {
      const nodoLabel = `Nodo ${idx} (x_${idx}, y_${idx})`;
      const xStr = String(p.x !== undefined && p.x !== null ? p.x : '').trim();
      const yStr = String(p.y !== undefined && p.y !== null ? p.y : '').trim();

      // Campos vacíos
      if (xStr === '') {
        errores.push(`${nodoLabel}: El valor de memoria x_${idx} está vacío.`);
        campoErrores.push({ index: idx, campo: 'x', mensaje: 'Campo requerido' });
      }
      if (yStr === '') {
        errores.push(`${nodoLabel}: El valor de latencia y_${idx} está vacío.`);
        campoErrores.push({ index: idx, campo: 'y', mensaje: 'Campo requerido' });
      }

      if (xStr === '' || yStr === '') return;

      const numX = Number(xStr);
      const numY = Number(yStr);

      if (isNaN(numX) || !isFinite(numX)) {
        errores.push(`${nodoLabel}: El valor de memoria '${xStr}' no es un número real válido.`);
        campoErrores.push({ index: idx, campo: 'x', mensaje: 'No numérico' });
      } else if (numX < 0) {
        errores.push(`${nodoLabel}: La memoria asignada x_${idx} no puede ser negativa (${numX} < 0).`);
        campoErrores.push({ index: idx, campo: 'x', mensaje: 'Debe ser >= 0' });
      }

      if (isNaN(numY) || !isFinite(numY)) {
        errores.push(`${nodoLabel}: El valor de latencia '${yStr}' no es un número real válido.`);
        campoErrores.push({ index: idx, campo: 'y', mensaje: 'No numérico' });
      } else if (numY < 0) {
        errores.push(`${nodoLabel}: La latencia de respuesta y_${idx} no puede ser negativa (${numY} < 0 ms).`);
        campoErrores.push({ index: idx, campo: 'y', mensaje: 'Debe ser >= 0' });
      }

      if (!isNaN(numX) && isFinite(numX) && numX >= 0 &&
          !isNaN(numY) && isFinite(numY) && numY >= 0) {
        // Verificar duplicados de xi con tolerancia numérica
        const claveX = numX.toFixed(10);
        if (mapaX.has(claveX)) {
          const anteriorIdx = mapaX.get(claveX);
          errores.push(
            `Conflicto de unicidad en nodos: x_${idx} = ${numX} es idéntico a x_${anteriorIdx} = ${numX}. ` +
            `Los valores de x_i deben ser mutuamente distintos (x_i ≠ x_j para i ≠ j) para evitar división por cero en el denominador (x_k - x_i = 0).`
          );
          campoErrores.push({ index: idx, campo: 'x', mensaje: `Duplica a x_${anteriorIdx}` });
          campoErrores.push({ index: anteriorIdx, campo: 'x', mensaje: `Duplicado en x_${idx}` });
        } else {
          mapaX.set(claveX, idx);
        }

        puntosValidados.push({ x: numX, y: numY, index: idx });
      }
    });

    // 3. Validación de x_eval
    const xEvalStr = String(xEvalRaw !== undefined && xEvalRaw !== null ? xEvalRaw : '').trim();
    let numXEval = NaN;

    if (xEvalStr === '') {
      errores.push('El punto de evaluación x_eval está vacío. Ingrese un valor para estimar la latencia.');
    } else {
      numXEval = Number(xEvalStr);
      if (isNaN(numXEval) || !isFinite(numXEval)) {
        errores.push(`El punto de evaluación x_eval = '${xEvalStr}' no es un número real válido.`);
      } else if (numXEval < 0) {
        errores.push(`El punto de evaluación x_eval = ${numXEval} no puede ser un valor negativo de memoria.`);
      }
    }

    const esValido = errores.length === 0 && puntosValidados.length === puntos.length && !isNaN(numXEval);

    return {
      esValido,
      puntos: puntosValidados,
      xEval: numXEval,
      errores,
      campoErrores
    };
  }

  return {
    validarEntrada
  };
});
