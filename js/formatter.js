/**
 * Módulo de Formateo Matemático y Tipográfico
 * Renderiza expresiones algebraicas, fracciones visuales, superíndices y desarrollos
 * paso a paso utilizando HTML semántico y CSS estilizado (100% nativo, sin KaTeX ni MathJax).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LagrangeFormatter = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Formatea un número decimal de manera legible y compacta.
   * Evita notación científica innecesaria y limpia ceros sobrantes.
   * @param {number} valor 
   * @param {number} decimales 
   * @returns {string}
   */
  function formatearNumero(valor, decimales = 4) {
    if (valor === undefined || valor === null || isNaN(valor)) return '—';
    if (Math.abs(valor) < 1e-12) return '0';
    if (Number.isInteger(valor)) return valor.toString();

    // Redondear a 'decimales' lugares
    const factor = Math.pow(10, decimales);
    const redondeado = Math.round(valor * factor) / factor;
    return redondeado.toFixed(decimales).replace(/\.?0+$/, '');
  }

  /**
   * Formatea un polinomio en notación algebraica estándar descendente:
   * a_n x^n + a_{n-1} x^{n-1} + ... + a_1 x + a_0
   * @param {number[]} coeficientes - Coeficientes en potencias ascendentes [a0, a1, ..., an]
   * @param {string} variable - Nombre de la variable ('x')
   * @param {number} decimales - Precisión de redondeo
   * @returns {string} HTML con superíndices y signos formateados
   */
  function formatearPolinomioHTML(coeficientes, variable = 'x', decimales = 6) {
    if (!coeficientes || coeficientes.length === 0) return '0';
    const n = coeficientes.length - 1;
    let partes = [];

    for (let exp = n; exp >= 0; exp--) {
      const coef = coeficientes[exp];
      if (Math.abs(coef) < 1e-10 && n > 0) continue; // Omitir términos cero

      const signo = coef < 0 ? '−' : '+';
      const absCoef = Math.abs(coef);
      let numStr = formatearNumero(absCoef, decimales);

      // Si el coeficiente es 1 y la potencia > 0, no mostrar '1x'
      let terminoVar = '';
      if (exp > 1) {
        terminoVar = `<var>${variable}</var><sup>${exp}</sup>`;
        if (numStr === '1') numStr = '';
      } else if (exp === 1) {
        terminoVar = `<var>${variable}</var>`;
        if (numStr === '1') numStr = '';
      }

      partes.push({
        signo,
        esNegativo: coef < 0,
        coefStr: numStr,
        terminoVar,
        esPrimero: partes.length === 0
      });
    }

    if (partes.length === 0) return '0';

    let html = '';
    partes.forEach((p, idx) => {
      if (idx === 0) {
        html += (p.esNegativo ? '− ' : '') + p.coefStr + p.terminoVar;
      } else {
        html += ` <span class="math-op">${p.signo}</span> ` + p.coefStr + p.terminoVar;
      }
    });

    return `<span class="math-expr">${html}</span>`;
  }

  /**
   * Genera una fracción matemática visual en HTML.
   * @param {string} numeradorHTML 
   * @param {string} denominadorHTML 
   * @returns {string}
   */
  function crearFraccionHTML(numeradorHTML, denominadorHTML) {
    return `<span class="math-frac"><span class="math-num">${numeradorHTML}</span><span class="math-den">${denominadorHTML}</span></span>`;
  }

  /**
   * Genera el desarrollo completo en HTML de un polinomio base L_k(x).
   * Muestra la fórmula simbólica, la sustitución de factores y la forma estándar.
   * @param {Object} base - Objeto base generado por LagrangeCore.calcularInterpolacion
   * @param {number} k - Índice del nodo
   * @returns {string} HTML del desarrollo de L_k(x)
   */
  function generarDesarrolloLkHTML(base, k) {
    const { nodo, denominador, factoresDenominador, factoresNumerador, coeficientesLk } = base;

    // 1. Numerador simbólico (x - xi)
    const numSimb = factoresNumerador.map(f => `(<var>x</var> − ${f.xi})`).join('');

    // 2. Denominador simbólico (xk - xi)
    const denSimb = factoresDenominador.map(f => `(${f.xk} − ${f.xi})`).join('');

    // 3. Denominador numérico multiplicado
    const denFactoresNum = factoresDenominador.map(f => {
      const val = f.diferencia;
      return val < 0 ? `(${val})` : `${val}`;
    }).join(' · ');

    // 4. Fracción inicial y simplificada
    const fraccionSimbolica = crearFraccionHTML(numSimb, denSimb);
    const fraccionCalculada = crearFraccionHTML(numSimb, `${denFactoresNum} = <strong>${denominador}</strong>`);

    // 5. Polinomio expandido de L_k(x)
    const poliExpandido = formatearPolinomioHTML(coeficientesLk, 'x', 6);

    return `
      <div class="math-step-card">
        <div class="math-step-header">
          <span class="badge-base">L<sub>${k}</sub>(<var>x</var>)</span>
          <span class="node-coords">Nodo (<var>x</var><sub>${k}</sub> = ${nodo.x}, <var>y</var><sub>${k}</sub> = ${nodo.y} ms)</span>
        </div>
        <div class="math-step-body">
          <div class="math-equation-row">
            <span class="eq-lhs"><var>L</var><sub>${k}</sub>(<var>x</var>) =</span>
            <span class="eq-rhs">${fraccionSimbolica}</span>
          </div>
          <div class="math-equation-row">
            <span class="eq-lhs">Sustitución:</span>
            <span class="eq-rhs">${fraccionCalculada}</span>
          </div>
          <div class="math-equation-row">
            <span class="eq-lhs">Forma expandida:</span>
            <span class="eq-rhs"><var>L</var><sub>${k}</sub>(<var>x</var>) = ${poliExpandido}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Genera el desglose paso a paso de la evaluación en x_eval.
   * Muestra la sustitución directa en cada base L_k(x_eval) y la suma ponderada.
   * @param {Object} calculo 
   * @returns {string} HTML del desarrollo numérico en x_eval
   */
  function generarDesarrolloEvaluacionHTML(calculo) {
    const { bases, xEval, resultadoEstandar, evaluacionDirecta, polinomioFinal } = calculo;
    const n = bases.length;

    let filasBases = '';
    let sumaTerminosStr = [];
    let sumaValoresNum = [];

    evaluacionDirecta.detalles.forEach((det, k) => {
      const bk = bases[k];
      const yk = det.yk;
      const lkVal = det.baseLk;
      const contrib = det.contribucion;

      // Factores de numerador evaluados: (xEval - xi)
      const numFactores = det.factores.map(f => {
        const diff = f.num;
        return diff < 0 ? `(${formatearNumero(diff, 4)})` : `${formatearNumero(diff, 4)}`;
      }).join(' · ');

      // Factores de denominador: (xk - xi)
      const denFactores = det.factores.map(f => {
        const diff = f.den;
        return diff < 0 ? `(${formatearNumero(diff, 4)})` : `${formatearNumero(diff, 4)}`;
      }).join(' · ');

      const numProd = det.factores.reduce((acc, f) => acc * f.num, 1);
      const denProd = bk.denominador;

      const fracEval = crearFraccionHTML(
        `${numFactores} = ${formatearNumero(numProd, 4)}`,
        `${denFactores} = ${formatearNumero(denProd, 4)}`
      );

      filasBases += `
        <tr class="eval-row">
          <td><span class="badge-base-sm">L<sub>${k}</sub>(${xEval})</span></td>
          <td class="eval-fraction-cell">${fracEval}</td>
          <td class="eval-val"><strong>${formatearNumero(lkVal, 6)}</strong></td>
          <td class="eval-weight">${formatearNumero(yk, 2)} ms</td>
          <td class="eval-contribution"><strong>${formatearNumero(contrib, 6)} ms</strong></td>
        </tr>
      `;

      sumaTerminosStr.push(`${formatearNumero(yk, 2)}(${formatearNumero(lkVal, 4)})`);
      sumaValoresNum.push(formatearNumero(contrib, 4));
    });

    const sumaFormulaPonderada = sumaTerminosStr.join(' + ').replace(/\+ -/g, '− ');
    const sumaValoresPonderada = sumaValoresNum.join(' + ').replace(/\+ -/g, '− ');

    return `
      <div class="eval-table-wrapper">
        <table class="academic-table eval-table">
          <thead>
            <tr>
              <th>Base L<sub>k</sub></th>
              <th>Sustitución en el cociente de Lagrange</th>
              <th>Valor L<sub>k</sub>(${xEval})</th>
              <th>Latencia <var>y</var><sub>k</sub></th>
              <th>Contribución <var>y</var><sub>k</sub>·L<sub>k</sub>(${xEval})</th>
            </tr>
          </thead>
          <tbody>
            ${filasBases}
          </tbody>
          <tfoot>
            <tr class="eval-footer-row">
              <td colspan="2"><strong>Propiedad de partición de la unidad:</strong></td>
              <td><strong>Σ L<sub>k</sub>(${xEval}) = ${formatearNumero(evaluacionDirecta.sumaBases, 6)}</strong></td>
              <td><strong>Total:</strong></td>
              <td><strong class="total-highlight">${formatearNumero(evaluacionDirecta.resultado, 6)} ms</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="math-eval-summary-box">
        <h4 class="summary-subtitle">Suma de productos de interpolación:</h4>
        <div class="math-equation-row">
          <span class="eq-lhs"><var>P</var><sub>${n - 1}</sub>(${xEval}) =</span>
          <span class="eq-rhs">${sumaFormulaPonderada}</span>
        </div>
        <div class="math-equation-row">
          <span class="eq-lhs"><var>P</var><sub>${n - 1}</sub>(${xEval}) =</span>
          <span class="eq-rhs">${sumaValoresPonderada} = <mark class="eval-mark">${formatearNumero(evaluacionDirecta.resultado, 4)} ms</mark></span>
        </div>
      </div>
    `;
  }

  return {
    formatearNumero,
    formatearPolinomioHTML,
    crearFraccionHTML,
    generarDesarrolloLkHTML,
    generarDesarrolloEvaluacionHTML
  };
});
