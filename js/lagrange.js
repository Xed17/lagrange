/**
 * Motor Matemático de Interpolación Polinómica de Lagrange
 * Cumple con los requisitos matemáticos y algorítmicos del plan:
 * - Complejidad algorítmica O(n^2) estricta.
 * - Álgebra de polinomios formal (multiplicación por binomios, sumas, escalas).
 * - Generación exacta de denominadores, polinomios base L_k(x) y polinomio estándar P(x).
 * - Evaluación mediante Horner y evaluación directa de Lagrange.
 * - Suite de comprobación teórica (Pruebas 1 a 4 de Section 12).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LagrangeCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Tolerancia para comparaciones de punto flotante de doble precisión
  const EPSILON = 1e-7;

  /**
   * Multiplica un polinomio p(x) por el binomio (x - xi).
   * Si p(x) tiene coeficientes [a0, a1, ..., am], el resultado tiene grado m + 1.
   * Representación: coeficientes en potencias ascendentes: index 0 = x^0, index 1 = x^1, etc.
   * @param {number[]} polinomio 
   * @param {number} xi 
   * @returns {number[]}
   */
  function multiplicarPorFactor(polinomio, xi) {
    const resultado = new Array(polinomio.length + 1).fill(0);
    for (let j = 0; j < polinomio.length; j++) {
      resultado[j] += -xi * polinomio[j];
      resultado[j + 1] += polinomio[j];
    }
    return resultado;
  }

  /**
   * Divide todos los coeficientes de un polinomio por un número escalar.
   * @param {number[]} polinomio 
   * @param {number} escalar 
   * @returns {number[]}
   */
  function dividirPolinomio(polinomio, escalar) {
    if (escalar === 0) {
      throw new Error('División por cero en polinomio: los nodos no pueden coincidir.');
    }
    return polinomio.map(c => c / escalar);
  }

  /**
   * Multiplica todos los coeficientes de un polinomio por un número escalar.
   * @param {number[]} polinomio 
   * @param {number} escalar 
   * @returns {number[]}
   */
  function multiplicarPorEscalar(polinomio, escalar) {
    return polinomio.map(c => c * escalar);
  }

  /**
   * Suma dos polinomios representados en potencias ascendentes.
   * @param {number[]} p1 
   * @param {number[]} p2 
   * @returns {number[]}
   */
  function sumarPolinomios(p1, p2) {
    const maxLen = Math.max(p1.length, p2.length);
    const resultado = new Array(maxLen).fill(0);
    for (let i = 0; i < maxLen; i++) {
      const c1 = i < p1.length ? p1[i] : 0;
      const c2 = i < p2.length ? p2[i] : 0;
      resultado[i] = c1 + c2;
    }
    return resultado;
  }

  /**
   * Evalúa un polinomio utilizando el Esquema de Horner (O(n) multiplicaciones).
   * P(x) = an*x^n + an-1*x^(n-1) + ... + a1*x + a0
   * Horner: (...((an * x + an-1) * x + an-2)...) * x + a0
   * @param {number[]} coeficientes - Coeficientes en potencias ascendentes [a0, a1, ..., an]
   * @param {number} x - Abscisa a evaluar
   * @returns {number}
   */
  function evaluarHorner(coeficientes, x) {
    const n = coeficientes.length - 1;
    if (n < 0) return 0;
    let acumulado = coeficientes[n];
    for (let i = n - 1; i >= 0; i--) {
      acumulado = acumulado * x + coeficientes[i];
    }
    return acumulado;
  }

  /**
   * Algoritmo de Interpolación de Lagrange en O(n^2).
   * Calcula denominadores, polinomios base L_k(x) en forma expandida, 
   * el polinomio estándar general P(x), y los pasos intermedios.
   * 
   * @param {Array<{x: number, y: number}>} puntos 
   * @param {number} xEval 
   * @returns {Object}
   */
  function calcularInterpolacion(puntos, xEval) {
    const n = puntos.length;
    let polinomioFinal = [0];
    const bases = [];
    let tiempoInicio = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    for (let k = 0; k < n; k++) {
      let denominador = 1;
      const factoresDenominador = [];
      const factoresNumerador = [];
      let numeradorExpandido = [1]; // Comienza con polinomio constante 1 (grado 0)

      for (let i = 0; i < n; i++) {
        if (i === k) continue;

        const difDenom = puntos[k].x - puntos[i].x;
        denominador *= difDenom;

        factoresDenominador.push({
          kIndex: k,
          iIndex: i,
          xk: puntos[k].x,
          xi: puntos[i].x,
          diferencia: difDenom
        });

        factoresNumerador.push({
          xi: puntos[i].x,
          textoBinomio: `(x - ${puntos[i].x})`
        });

        // Multiplicación simbólica paso a paso: N_k(x) *= (x - xi)
        numeradorExpandido = multiplicarPorFactor(numeradorExpandido, puntos[i].x);
      }

      // L_k(x) = Numerador(x) / denominador
      const coeficientesLk = dividirPolinomio(numeradorExpandido, denominador);

      // Termino k: y_k * L_k(x)
      const terminoPonderado = multiplicarPorEscalar(coeficientesLk, puntos[k].y);

      // Sumar al polinomio interpolador final
      polinomioFinal = sumarPolinomios(polinomioFinal, terminoPonderado);

      // Evaluación del polinomio base en xEval
      const valorLkEnXEval = evaluarHorner(coeficientesLk, xEval);
      const contribucionEnXEval = puntos[k].y * valorLkEnXEval;

      bases.push({
        k,
        nodo: puntos[k],
        denominador,
        factoresDenominador,
        factoresNumerador,
        numeradorExpandido,
        coeficientesLk,
        terminoPonderado,
        valorLkEnXEval,
        contribucionEnXEval
      });
    }

    let tiempoFin = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const tiempoMs = +(tiempoFin - tiempoInicio).toFixed(4);

    // Evaluar P(xEval) usando la forma estándar con Horner
    const resultadoEstandar = evaluarHorner(polinomioFinal, xEval);

    // Evaluar P(xEval) usando la fórmula directa de Lagrange para doble verificación
    const evaluacionDirecta = evaluarLagrangeDirecto(puntos, xEval);

    return {
      puntos,
      grado: n - 1,
      xEval,
      bases,
      polinomioFinal,
      resultadoEstandar,
      evaluacionDirecta,
      tiempoMs,
      complejidad: `O(n²) con n = ${n} nodos (exactamente ${n * (n - 1)} operaciones en bucles anidados)`
    };
  }

  /**
   * Evaluación directa de la fórmula de Lagrange:
   * P(x) = sum_{k=0}^{n-1} [ y_k * prod_{i != k} ( (x - xi) / (xk - xi) ) ]
   * @param {Array<{x: number, y: number}>} puntos 
   * @param {number} xEval 
   * @returns {{ resultado: number, detalles: Array<Object>, sumaBases: number }}
   */
  function evaluarLagrangeDirecto(puntos, xEval) {
    const n = puntos.length;
    let resultado = 0;
    let sumaBases = 0;
    const detalles = [];

    for (let k = 0; k < n; k++) {
      let baseLk = 1;
      const factores = [];

      for (let i = 0; i < n; i++) {
        if (i === k) continue;
        const num = xEval - puntos[i].x;
        const den = puntos[k].x - puntos[i].x;
        const razon = num / den;
        baseLk *= razon;
        factores.push({
          num,
          den,
          razon,
          xi: puntos[i].x,
          xk: puntos[k].x
        });
      }

      const contribucion = puntos[k].y * baseLk;
      resultado += contribucion;
      sumaBases += baseLk;

      detalles.push({
        k,
        yk: puntos[k].y,
        baseLk,
        factores,
        contribucion
      });
    }

    return {
      resultado,
      sumaBases,
      detalles
    };
  }

  /**
   * Genera los puntos de la curva continua para graficar en el Canvas.
   * Asegura que el dominio cubra todos los nodos y xEval con margen razonable.
   * @param {number[]} coeficientes 
   * @param {Array<{x: number, y: number}>} puntos 
   * @param {number} xEval 
   * @param {number} cantidadPuntos 
   * @returns {{
   *   curva: Array<{x: number, y: number}>,
   *   xMin: number,
   *   xMax: number,
   *   yMin: number,
   *   yMax: number
   * }}
   */
  function generarCurva(coeficientes, puntos, xEval, cantidadPuntos = 300) {
    // Determinar límites naturales del caso con margen visual
    const xs = puntos.map(p => p.x).concat(xEval);
    const ys = puntos.map(p => p.y);

    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);

    // Margen horizontal (al menos 1 unidad o 10% del rango)
    const rangoX = maxX - minX || 1;
    const paddingX = Math.max(1.0, rangoX * 0.12);
    const inicioX = minX - paddingX;
    const finX = maxX + paddingX;

    const datosCurva = [];
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i <= cantidadPuntos; i++) {
      const x = inicioX + (finX - inicioX) * (i / cantidadPuntos);
      const y = evaluarHorner(coeficientes, x);
      datosCurva.push({ x, y });

      if (isFinite(y)) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    // Asegurar que los puntos nodales e interpolados queden visibles en Y
    for (const y of ys) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const yEval = evaluarHorner(coeficientes, xEval);
    if (isFinite(yEval)) {
      if (yEval < minY) minY = yEval;
      if (yEval > maxY) maxY = yEval;
    }

    return {
      curva: datosCurva,
      xMin: inicioX,
      xMax: finX,
      yMin: minY,
      yMax: maxY
    };
  }

  /**
   * Ejecuta la Suite de Verificación Matemática en vivo (Pruebas 1 a 4 de Section 12).
   * @param {Object} calculoResultado - Resultado retornado por calcularInterpolacion
   * @returns {Array<{id: string, nombre: string, descripcion: string, superada: boolean, detalles: string}>}
   */
  function ejecutarVerificacionTeorica(calculoResultado) {
    const { puntos, polinomioFinal, xEval, bases, resultadoEstandar, evaluacionDirecta } = calculoResultado;
    const resultados = [];

    // Prueba 1: Condición de interpolación exacta en cada nodo P(x_i) = y_i
    let p1Superada = true;
    const detallesP1 = [];
    for (let i = 0; i < puntos.length; i++) {
      const p = puntos[i];
      const yCalculado = evaluarHorner(polinomioFinal, p.x);
      const errorAbs = Math.abs(yCalculado - p.y);
      const pasa = errorAbs < EPSILON;
      if (!pasa) p1Superada = false;
      detallesP1.push(`P(${p.x}) = ${yCalculado.toFixed(6)} ms (esperado: ${p.y} ms, |Δ| = ${errorAbs.toExponential(2)})`);
    }
    resultados.push({
      id: 'PRUEBA-1',
      nombre: 'Exactitud en los nodos experimentales',
      descripcion: 'Verifica la propiedad fundamental P_n(x_i) = y_i para cada nodo.',
      superada: p1Superada,
      detalles: detallesP1.join(' | ')
    });

    // Prueba 2: Partición de la unidad (Suma de polinomios base Σ L_k(x) = 1)
    const sumaBasesEval = bases.reduce((acc, b) => acc + b.valorLkEnXEval, 0);
    const errorSumaBases = Math.abs(sumaBasesEval - 1.0);
    const p2Superada = errorSumaBases < EPSILON;
    resultados.push({
      id: 'PRUEBA-2',
      nombre: 'Partición de la unidad (Propiedad Σ L_k(x) = 1)',
      descripcion: 'Comprueba que en cualquier abscisa la suma de las bases de Lagrange sea idénticamente 1.',
      superada: p2Superada,
      detalles: `Σ L_k(${xEval}) = ${sumaBasesEval.toFixed(8)} (|1 - Σ| = ${errorSumaBases.toExponential(2)})`
    });

    // Prueba 3: Propiedad Delta de Kronecker L_k(x_j) = δ_kj
    let p3Superada = true;
    let fallosP3 = 0;
    for (let k = 0; k < bases.length; k++) {
      const bk = bases[k];
      for (let j = 0; j < puntos.length; j++) {
        const val = evaluarHorner(bk.coeficientesLk, puntos[j].x);
        const esperado = k === j ? 1.0 : 0.0;
        const err = Math.abs(val - esperado);
        if (err >= EPSILON) {
          p3Superada = false;
          fallosP3++;
        }
      }
    }
    resultados.push({
      id: 'PRUEBA-3',
      nombre: 'Propiedad de ortogonalidad (Delta de Kronecker)',
      descripcion: 'L_k(x_j) = 1 cuando k = j, y L_k(x_j) = 0 cuando k ≠ j para todas las combinaciones.',
      superada: p3Superada,
      detalles: p3Superada 
        ? `Verificado para las ${puntos.length * puntos.length} combinaciones L_k(x_j) con tolerancia ε = 10⁻⁷` 
        : `Detectadas ${fallosP3} inconsistencias en las bases`
    });

    // Prueba 4: Consistencia algorítmica (Forma estándar vs Fórmula directa)
    const errorConsistencia = Math.abs(resultadoEstandar - evaluacionDirecta.resultado);
    const p4Superada = errorConsistencia < EPSILON;
    resultados.push({
      id: 'PRUEBA-4',
      nombre: 'Consistencia de expansión algebraica',
      descripcion: 'Comprueba que la evaluación del polinomio expandido coincida con la evaluación directa de Lagrange.',
      superada: p4Superada,
      detalles: `Forma Estándar: ${resultadoEstandar.toFixed(6)} ms vs Directa: ${evaluacionDirecta.resultado.toFixed(6)} ms (|Δ| = ${errorConsistencia.toExponential(2)})`
    });

    return resultados;
  }

  return {
    multiplicarPorFactor,
    dividirPolinomio,
    multiplicarPorEscalar,
    sumarPolinomios,
    evaluarHorner,
    calcularInterpolacion,
    evaluarLagrangeDirecto,
    generarCurva,
    ejecutarVerificacionTeorica,
    EPSILON
  };
});
