/**
 * Controlador Principal de la Aplicación
 * Conecta los módulos de validación, motor matemático, formateo y gráfica en canvas.
 * Administra el estado interactivo, la edición dinámica de nodos y el caso benchmark.
 */

(function () {
  'use strict';

  // Caso de estudio original del enunciado
  const CASO_BENCHMARK = [
    { x: 2, y: 150 },
    { x: 4, y: 85 },
    { x: 8, y: 50 },
    { x: 12, y: 70 }
  ];
  const X_EVAL_DEFAULT = 6;

  // Estado reactivo de la aplicación
  let puntosActuales = JSON.parse(JSON.stringify(CASO_BENCHMARK));
  let chartInstance = null;

  // Referencias a elementos del DOM
  const dom = {
    form: document.getElementById('lagrangeForm'),
    nodesTableBody: document.getElementById('nodesTableBody'),
    btnAddNode: document.getElementById('btnAddNode'),
    btnResetCase: document.getElementById('btnResetCase'),
    btnCalculate: document.getElementById('btnCalculate'),
    inputXEval: document.getElementById('inputXEval'),
    validationAlert: document.getElementById('validationAlert'),
    validationErrorsList: document.getElementById('validationErrorsList'),
    nodesCountBadge: document.getElementById('nodesCountBadge'),
    metricValue: document.getElementById('metricValue'),
    metricXEval: document.getElementById('metricXEval'),
    polynomialRendered: document.getElementById('polynomialRendered'),
    canvas: document.getElementById('lagrangeCanvas'),
    basePolynomialsContainer: document.getElementById('basePolynomialsContainer'),
    evaluationBreakdownContainer: document.getElementById('evaluationBreakdownContainer'),
    verificationGrid: document.getElementById('verificationGrid'),
    evalStepXLabel: document.getElementById('evalStepXLabel')
  };

  /**
   * Inicializa la aplicación.
   */
  function init() {
    // Inicializar componente de gráfica en Canvas
    if (window.LagrangeChart && window.LagrangeChart.LagrangeCanvasChart) {
      chartInstance = new window.LagrangeChart.LagrangeCanvasChart(dom.canvas);
    }

    renderTableRows();
    bindEvents();

    // Ejecutar cálculo inicial con el caso benchmark
    ejecutarCalculo();
  }

  /**
   * Renderiza las filas de la tabla de nodos.
   */
  function renderTableRows() {
    dom.nodesTableBody.innerHTML = '';
    const total = puntosActuales.length;

    puntosActuales.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.index = idx;

      tr.innerHTML = `
        <td>
          <span class="badge-base-sm">x<sub>${idx}</sub>, y<sub>${idx}</sub></span>
        </td>
        <td>
          <input type="number" step="any" min="0" class="node-input input-x" data-index="${idx}" data-campo="x" value="${p.x}" required aria-label="Memoria x_${idx}">
        </td>
        <td>
          <input type="number" step="any" min="0" class="node-input input-y" data-index="${idx}" data-campo="y" value="${p.y}" required aria-label="Latencia y_${idx}">
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn-remove-node" data-index="${idx}" title="Eliminar este nodo" ${total <= 2 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </td>
      `;

      dom.nodesTableBody.appendChild(tr);
    });

    dom.nodesCountBadge.textContent = `${total} nodos (Polinomio Grado ${total - 1})`;
  }

  /**
   * Vincula los listeners de eventos.
   */
  function bindEvents() {
    // Agregar nuevo nodo
    dom.btnAddNode.addEventListener('click', () => {
      const ultimo = puntosActuales[puntosActuales.length - 1];
      const nuevoX = ultimo ? ultimo.x + 2 : 2;
      const nuevoY = ultimo ? Math.max(10, Math.round(ultimo.y * 0.9)) : 100;

      puntosActuales.push({ x: nuevoX, y: nuevoY });
      renderTableRows();
      ejecutarCalculo();
    });

    // Restablecer caso benchmark original
    dom.btnResetCase.addEventListener('click', () => {
      puntosActuales = JSON.parse(JSON.stringify(CASO_BENCHMARK));
      dom.inputXEval.value = X_EVAL_DEFAULT;
      renderTableRows();
      limpiarErroresVisuales();
      ejecutarCalculo();
    });

    // Delegación de eventos para inputs y botones de eliminar en la tabla
    dom.nodesTableBody.addEventListener('input', (e) => {
      const target = e.target;
      if (target.classList.contains('node-input')) {
        const idx = parseInt(target.dataset.index, 10);
        const campo = target.dataset.campo;
        const val = target.value;
        puntosActuales[idx][campo] = val === '' ? '' : Number(val);
        target.classList.remove('input-error');
      }
    });

    dom.nodesTableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-node');
      if (btn && puntosActuales.length > 2) {
        const idx = parseInt(btn.dataset.index, 10);
        puntosActuales.splice(idx, 1);
        renderTableRows();
        ejecutarCalculo();
      }
    });

    // Cambio en x_eval
    dom.inputXEval.addEventListener('input', () => {
      dom.inputXEval.classList.remove('input-error');
    });

    // Envío del formulario
    dom.form.addEventListener('submit', (e) => {
      e.preventDefault();
      ejecutarCalculo();
    });
  }

  /**
   * Lee los datos actuales de los inputs de la tabla.
   */
  function leerDatosFormulario() {
    const filas = dom.nodesTableBody.querySelectorAll('tr');
    const puntos = [];

    filas.forEach((tr, idx) => {
      const inputX = tr.querySelector('.input-x');
      const inputY = tr.querySelector('.input-y');
      puntos.push({
        x: inputX ? inputX.value : '',
        y: inputY ? inputY.value : '',
        index: idx
      });
    });

    const xEvalRaw = dom.inputXEval.value;

    return { puntos, xEvalRaw };
  }

  /**
   * Limpia los avisos y bordes de error en la UI.
   */
  function limpiarErroresVisuales() {
    dom.validationAlert.classList.remove('visible');
    dom.validationErrorsList.innerHTML = '';
    const errorInputs = dom.form.querySelectorAll('.input-error');
    errorInputs.forEach(el => el.classList.remove('input-error'));
  }

  /**
   * Muestra la lista de errores de validación.
   */
  function mostrarErrores(errores, campoErrores) {
    dom.validationErrorsList.innerHTML = '';
    errores.forEach(err => {
      const li = document.createElement('li');
      li.textContent = err;
      dom.validationErrorsList.appendChild(li);
    });
    dom.validationAlert.classList.add('visible');

    // Resaltar campos específicos
    if (campoErrores) {
      campoErrores.forEach(item => {
        const selector = `.node-input.input-${item.campo}[data-index="${item.index}"]`;
        const input = dom.nodesTableBody.querySelector(selector);
        if (input) {
          input.classList.add('input-error');
        }
      });
    }
  }

  /**
   * Ejecuta el proceso completo de validación, cálculo matemático, formateo y renderizado.
   */
  function ejecutarCalculo() {
    limpiarErroresVisuales();

    const { puntos, xEvalRaw } = leerDatosFormulario();

    // 1. Validar entrada
    const validacion = window.LagrangeValidation.validarEntrada(puntos, xEvalRaw);

    if (!validacion.esValido) {
      mostrarErrores(validacion.errores, validacion.campoErrores);
      return;
    }

    const { puntos: puntosValidados, xEval } = validacion;

    // 2. Ejecutar cálculo con el motor de Lagrange
    const resultado = window.LagrangeCore.calcularInterpolacion(puntosValidados, xEval);

    // 3. Actualizar Hero Card de resultados
    dom.metricValue.textContent = window.LagrangeFormatter.formatearNumero(resultado.resultadoEstandar, 4);
    dom.metricXEval.textContent = xEval.toString();
    dom.evalStepXLabel.textContent = xEval.toString();

    // Formatear polinomio estándar
    const poliHTML = window.LagrangeFormatter.formatearPolinomioHTML(resultado.polinomioFinal, 'x', 6);
    dom.polynomialRendered.innerHTML = `<var>P</var><sub>${resultado.grado}</sub>(<var>x</var>) = ${poliHTML}`;

    // 4. Renderizar tarjetas de desarrollo de cada base L_k(x)
    dom.basePolynomialsContainer.innerHTML = '';
    resultado.bases.forEach((base, k) => {
      const baseHTML = window.LagrangeFormatter.generarDesarrolloLkHTML(base, k);
      dom.basePolynomialsContainer.insertAdjacentHTML('beforeend', baseHTML);
    });

    // 5. Renderizar desglose de evaluación paso a paso
    const evalHTML = window.LagrangeFormatter.generarDesarrolloEvaluacionHTML(resultado);
    dom.evaluationBreakdownContainer.innerHTML = evalHTML;

    // 6. Actualizar gráfica continua en Canvas
    const datosCurva = window.LagrangeCore.generarCurva(resultado.polinomioFinal, puntosValidados, xEval, 300);
    if (chartInstance) {
      chartInstance.updateData({
        puntos: puntosValidados,
        xEval,
        yEval: resultado.resultadoEstandar,
        coeficientes: resultado.polinomioFinal,
        datosCurva: datosCurva.curva,
        bounds: {
          xMin: datosCurva.xMin,
          xMax: datosCurva.xMax,
          yMin: datosCurva.yMin,
          yMax: datosCurva.yMax
        }
      });
    }

    // 7. Ejecutar y renderizar Suite de Verificación Teórica (Pruebas 1 a 4)
    const verificaciones = window.LagrangeCore.ejecutarVerificacionTeorica(resultado);
    renderizarVerificaciones(verificaciones);
  }

  /**
   * Renderiza el estado de las 4 pruebas de verificación matemática.
   */
  function renderizarVerificaciones(pruebas) {
    dom.verificationGrid.innerHTML = '';

    pruebas.forEach(p => {
      const item = document.createElement('div');
      item.className = `verification-item ${p.superada ? 'passed' : 'failed'}`;

      item.innerHTML = `
        <div>
          <div class="verification-header">
            <span class="verification-id">${p.id}</span>
            <span class="verification-title">${p.nombre}</span>
          </div>
          <div class="verification-desc">${p.descripcion}</div>
          <div class="verification-details">${p.detalles}</div>
        </div>
        <div>
          <span class="badge-status ${p.superada ? 'pass' : 'fail'}">
            ${p.superada ? '✓ Superada' : '✗ Fallida'}
          </span>
        </div>
      `;

      dom.verificationGrid.appendChild(item);
    });
  }

  // Iniciar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
