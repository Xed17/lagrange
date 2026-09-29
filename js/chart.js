/**
 * Módulo de Visualización Gráfica en Canvas HTML5 Nativo
 * Renderiza la curva polinómica continua, los nodos experimentales y el punto interpolado.
 * 100% nativo, sin dependencias externas, adaptado para pantallas Retina/HiDPI,
 * con retícula académica, ejes rotulados con unidades y cursor interactivo con tooltip.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LagrangeChart = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class LagrangeCanvasChart {
    /**
     * @param {HTMLCanvasElement} canvasElement 
     * @param {Object} options 
     */
    constructor(canvasElement, options = {}) {
      if (!canvasElement) throw new Error('Se requiere un elemento canvas válido.');
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext('2d');
      this.options = Object.assign({
        padding: { top: 40, right: 40, bottom: 60, left: 70 },
        colors: {
          background: '#ffffff',
          grid: '#e2e8f0',
          gridSub: '#f1f5f9',
          axes: '#334155',
          text: '#475569',
          curve: '#2563eb', // Azul académico
          curveGlow: 'rgba(37, 99, 235, 0.15)',
          nodePoint: '#1e3a8a',
          nodeBorder: '#ffffff',
          interpolatedPoint: '#dc2626', // Rojo carmesí
          interpolatedGlow: 'rgba(220, 38, 38, 0.2)',
          crosshair: '#94a3b8',
          tooltipBg: '#0f172a',
          tooltipText: '#ffffff'
        },
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        mathFontFamily: "'STIX Two Text', 'Latin Modern Math', 'Times New Roman', serif"
      }, options);

      this.datosCurva = [];
      this.puntos = [];
      this.puntoEval = null;
      this.coeficientes = [];
      this.bounds = { xMin: 0, xMax: 14, yMin: 0, yMax: 180 };
      this.hoverState = { active: false, x: 0, y: 0, dataX: null, dataY: null };

      this._initEvents();
      this.resize();
    }

    _initEvents() {
      const handleMove = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
        if (clientX === null || clientY === null) return;

        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;

        // Comprobar si el cursor está dentro del área de trazado
        const pad = this.options.padding;
        const w = rect.width;
        const h = rect.height;

        if (canvasX >= pad.left && canvasX <= w - pad.right &&
            canvasY >= pad.top && canvasY <= h - pad.bottom) {
          const dataX = this.pixelToX(canvasX, w);
          // Evaluar polinomio en dataX
          let dataY = null;
          if (this.coeficientes && this.coeficientes.length > 0 && root.LagrangeCore) {
            dataY = root.LagrangeCore.evaluarHorner(this.coeficientes, dataX);
          }

          this.hoverState = {
            active: true,
            x: canvasX,
            y: canvasY,
            dataX,
            dataY
          };
        } else {
          this.hoverState.active = false;
        }

        this.render();
      };

      const handleLeave = () => {
        this.hoverState.active = false;
        this.render();
      };

      this.canvas.addEventListener('mousemove', handleMove);
      this.canvas.addEventListener('mouseleave', handleLeave);
      this.canvas.addEventListener('touchstart', handleMove, { passive: true });
      this.canvas.addEventListener('touchmove', handleMove, { passive: true });
      this.canvas.addEventListener('touchend', handleLeave);

      // Observador de redimensionamiento automático
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.resize();
          this.render();
        });
        this.resizeObserver.observe(this.canvas);
      } else {
        window.addEventListener('resize', () => {
          this.resize();
          this.render();
        });
      }
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = Math.max(300, Math.floor(rect.width || this.canvas.parentElement.clientWidth || 600));
      const displayHeight = Math.max(260, Math.floor(rect.height || 420));

      this.canvas.width = displayWidth * dpr;
      this.canvas.height = displayHeight * dpr;

      this.width = displayWidth;
      this.height = displayHeight;
      this.dpr = dpr;

      this.ctx.resetTransform && this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
    }

    /**
     * Actualiza los datos de la gráfica y redibuja.
     * @param {Object} payload 
     */
    updateData({ puntos, xEval, yEval, coeficientes, datosCurva, bounds }) {
      this.puntos = puntos || [];
      this.puntoEval = (xEval !== undefined && yEval !== undefined) ? { x: xEval, y: yEval } : null;
      this.coeficientes = coeficientes || [];
      this.datosCurva = datosCurva || [];

      if (bounds) {
        // Añadir margen visual del 10% en Y
        const ySpan = (bounds.yMax - bounds.yMin) || 10;
        const padY = Math.max(5, ySpan * 0.12);
        this.bounds = {
          xMin: bounds.xMin,
          xMax: bounds.xMax,
          yMin: Math.max(0, bounds.yMin - padY), // Latencia típicamente >= 0
          yMax: bounds.yMax + padY
        };
      }

      this.render();
    }

    xToPixel(x, width) {
      const pad = this.options.padding;
      const plotWidth = width - pad.left - pad.right;
      return pad.left + ((x - this.bounds.xMin) / (this.bounds.xMax - this.bounds.xMin)) * plotWidth;
    }

    yToPixel(y, height) {
      const pad = this.options.padding;
      const plotHeight = height - pad.top - pad.bottom;
      return height - pad.bottom - ((y - this.bounds.yMin) / (this.bounds.yMax - this.bounds.yMin)) * plotHeight;
    }

    pixelToX(px, width) {
      const pad = this.options.padding;
      const plotWidth = width - pad.left - pad.right;
      return this.bounds.xMin + ((px - pad.left) / plotWidth) * (this.bounds.xMax - this.bounds.xMin);
    }

    pixelToY(py, height) {
      const pad = this.options.padding;
      const plotHeight = height - pad.top - pad.bottom;
      return this.bounds.yMin + ((height - pad.bottom - py) / plotHeight) * (this.bounds.yMax - this.bounds.yMin);
    }

    /**
     * Dibuja todos los componentes de la gráfica científica.
     */
    render() {
      const { ctx, width, height, options } = this;
      if (!ctx || !width || !height) return;

      const pad = options.padding;
      const plotW = width - pad.left - pad.right;
      const plotH = height - pad.top - pad.bottom;

      // 1. Limpiar fondo
      ctx.fillStyle = options.colors.background;
      ctx.fillRect(0, 0, width, height);

      // 2. Dibujar retícula y marcas
      this._drawGrid(ctx, width, height, plotW, plotH);

      // 3. Dibujar curva del polinomio P(x)
      if (this.datosCurva && this.datosCurva.length > 1) {
        this._drawCurve(ctx, width, height);
      }

      // 4. Dibujar líneas de proyección del punto interpolado
      if (this.puntoEval) {
        this._drawInterpolatedPoint(ctx, width, height);
      }

      // 5. Dibujar nodos experimentales
      if (this.puntos && this.puntos.length > 0) {
        this._drawNodes(ctx, width, height);
      }

      // 6. Dibujar crosshair y tooltip al mover el cursor
      if (this.hoverState.active && this.hoverState.dataY !== null) {
        this._drawHoverTooltip(ctx, width, height);
      }
    }

    _drawGrid(ctx, w, h, plotW, plotH) {
      const pad = this.options.padding;
      const colors = this.options.colors;
      const { xMin, xMax, yMin, yMax } = this.bounds;

      ctx.save();

      // Cálculo de intervalos agradables (nice numbers)
      const xRange = xMax - xMin;
      const yRange = yMax - yMin;
      const xStep = this._calculateNiceStep(xRange, 7);
      const yStep = this._calculateNiceStep(yRange, 6);

      const xStart = Math.ceil(xMin / xStep) * xStep;
      const yStart = Math.ceil(yMin / yStep) * yStep;

      ctx.font = `11px ${this.options.fontFamily}`;
      ctx.fillStyle = colors.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Líneas verticales (X)
      for (let x = xStart; x <= xMax; x += xStep) {
        const px = this.xToPixel(x, w);
        if (px < pad.left || px > w - pad.right) continue;

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(px, pad.top);
        ctx.lineTo(px, h - pad.bottom);
        ctx.stroke();

        // Etiqueta del eje X
        ctx.setLineDash([]);
        ctx.fillText(Number(x.toFixed(2)).toString(), px, h - pad.bottom + 8);
      }

      // Líneas horizontales (Y)
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let y = yStart; y <= yMax; y += yStep) {
        const py = this.yToPixel(y, h);
        if (py < pad.top || py > h - pad.bottom) continue;

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(pad.left, py);
        ctx.lineTo(w - pad.right, py);
        ctx.stroke();

        // Etiqueta del eje Y
        ctx.setLineDash([]);
        ctx.fillText(Number(y.toFixed(1)).toString(), pad.left - 10, py);
      }

      // Ejes principales perimetrales (Caja científica / Cartesian box)
      ctx.strokeStyle = colors.axes;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(pad.left, pad.top, plotW, plotH);

      // Títulos de ejes con unidades
      ctx.save();
      ctx.fillStyle = colors.axes;
      ctx.font = `600 12px ${this.options.fontFamily}`;
      
      // Eje X: Memoria asignada (GB)
      ctx.textAlign = 'center';
      ctx.fillText('Memoria RAM asignada x (GB)', pad.left + plotW / 2, h - 18);

      // Eje Y: Latencia (ms) rotada
      ctx.translate(20, pad.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('Latencia de respuesta y (ms)', 0, 0);
      ctx.restore();

      ctx.restore();
    }

    _calculateNiceStep(range, targetTicks) {
      const rawStep = range / targetTicks;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
      const normalized = rawStep / magnitude;

      let nice = 1;
      if (normalized > 1.5 && normalized <= 3.5) nice = 2;
      else if (normalized > 3.5 && normalized <= 7.5) nice = 5;
      else if (normalized > 7.5) nice = 10;

      return nice * magnitude;
    }

    _drawCurve(ctx, w, h) {
      const pad = this.options.padding;
      const colors = this.options.colors;
      const pts = this.datosCurva;

      ctx.save();
      // Clip al área de trazado
      ctx.beginPath();
      ctx.rect(pad.left, pad.top, w - pad.left - pad.right, h - pad.top - pad.bottom);
      ctx.clip();

      // Trazo de la curva
      ctx.beginPath();
      let primerPunto = true;
      for (let i = 0; i < pts.length; i++) {
        const px = this.xToPixel(pts[i].x, w);
        const py = this.yToPixel(pts[i].y, h);

        if (isNaN(px) || isNaN(py)) continue;

        if (primerPunto) {
          ctx.moveTo(px, py);
          primerPunto = false;
        } else {
          ctx.lineTo(px, py);
        }
      }

      ctx.strokeStyle = colors.curve;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
    }

    _drawNodes(ctx, w, h) {
      const pad = this.options.padding;
      const colors = this.options.colors;

      this.puntos.forEach((p, idx) => {
        const px = this.xToPixel(p.x, w);
        const py = this.yToPixel(p.y, h);

        if (px < pad.left || px > w - pad.right || py < pad.top || py > h - pad.bottom) return;

        ctx.save();
        // Círculo exterior blanco para contraste
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = colors.nodeBorder;
        ctx.fill();

        // Círculo interior azul oscuro
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = colors.nodePoint;
        ctx.fill();

        // Etiqueta del nodo
        ctx.font = `600 11px ${this.options.fontFamily}`;
        ctx.fillStyle = colors.nodePoint;
        ctx.textAlign = 'left';
        ctx.fillText(`(${p.x}, ${p.y})`, px + 8, py - 6);

        ctx.restore();
      });
    }

    _drawInterpolatedPoint(ctx, w, h) {
      const pad = this.options.padding;
      const colors = this.options.colors;
      const p = this.puntoEval;

      const px = this.xToPixel(p.x, w);
      const py = this.yToPixel(p.y, h);

      if (px < pad.left || px > w - pad.right || py < pad.top || py > h - pad.bottom) return;

      ctx.save();

      // Líneas de proyección punteadas a los ejes
      ctx.strokeStyle = colors.interpolatedPoint;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);

      // Hacia el eje X
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, h - pad.bottom);
      ctx.stroke();

      // Hacia el eje Y
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(pad.left, py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Resplandor del punto interpolado
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fillStyle = colors.interpolatedGlow;
      ctx.fill();

      // Borde blanco
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Círculo rojo central
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = colors.interpolatedPoint;
      ctx.fill();

      // Etiqueta distintiva con cajita
      const labelText = `P(${p.x}) = ${p.y.toFixed(2)} ms`;
      ctx.font = `bold 12px ${this.options.fontFamily}`;
      const textMetrics = ctx.measureText(labelText);
      const boxW = textMetrics.width + 14;
      const boxH = 22;
      let boxX = px + 12;
      let boxY = py - 28;

      if (boxX + boxW > w - pad.right) boxX = px - boxW - 12;
      if (boxY < pad.top) boxY = py + 10;

      // Caja de fondo
      ctx.fillStyle = '#fef2f2'; // Fondo suave rojizo
      ctx.strokeStyle = colors.interpolatedPoint;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(boxX, boxY, boxW, boxH, 4) : ctx.rect(boxX, boxY, boxW, boxH);
      ctx.fill();
      ctx.stroke();

      // Texto de la etiqueta
      ctx.fillStyle = colors.interpolatedPoint;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, boxX + 7, boxY + boxH / 2);

      ctx.restore();
    }

    _drawHoverTooltip(ctx, w, h) {
      const pad = this.options.padding;
      const colors = this.options.colors;
      const { dataX, dataY } = this.hoverState;

      const px = this.xToPixel(dataX, w);
      const py = this.yToPixel(dataY, h);

      if (px < pad.left || px > w - pad.right || py < pad.top || py > h - pad.bottom) return;

      ctx.save();

      // Crosshair lines
      ctx.strokeStyle = colors.crosshair;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      ctx.beginPath();
      ctx.moveTo(px, pad.top);
      ctx.lineTo(px, h - pad.bottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pad.left, py);
      ctx.lineTo(w - pad.right, py);
      ctx.stroke();

      ctx.setLineDash([]);

      // Punto en la curva
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = colors.curve;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Tooltip flotante oscuro
      const line1 = `Memoria: ${dataX.toFixed(2)} GB`;
      const line2 = `Latencia: ${dataY.toFixed(2)} ms`;
      ctx.font = `500 11px ${this.options.fontFamily}`;
      const w1 = ctx.measureText(line1).width;
      const w2 = ctx.measureText(line2).width;
      const ttW = Math.max(w1, w2) + 16;
      const ttH = 42;

      let ttX = px + 12;
      let ttY = py - ttH - 8;
      if (ttX + ttW > w - pad.right) ttX = px - ttW - 12;
      if (ttY < pad.top) ttY = py + 12;

      ctx.fillStyle = colors.tooltipBg;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(ttX, ttY, ttW, ttH, 6) : ctx.rect(ttX, ttY, ttW, ttH);
      ctx.fill();

      ctx.fillStyle = colors.tooltipText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(line1, ttX + 8, ttY + 6);
      ctx.fillText(line2, ttX + 8, ttY + 22);

      ctx.restore();
    }
  }

  return {
    LagrangeCanvasChart
  };
});
