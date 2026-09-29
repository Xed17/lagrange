# Interpolador de Lagrange para Latencia en Microservicios

Aplicación web interactiva de análisis numérico para estimar y modelar la latencia de respuesta $y$ (ms) de microservicios en función de la memoria RAM asignada $x$ (GB), utilizando el **Método de Interpolación Polinómica de Lagrange**.

---

## 1. Contexto del Problema y Caso Benchmark

En arquitecturas distribuidas y entornos de microservicios en la nube, el tiempo de respuesta varía de forma no lineal respecto al aprovisionamiento de recursos de cómputo y memoria. Se recopilaron 4 mediciones experimentales en un entorno de pruebas:

| Nodo | Memoria RAM $x_i$ (GB) | Latencia de Respuesta $y_i$ (ms) |
|:---:|:---:|:---:|
| $(x_0, y_0)$ | **2** | **150** |
| $(x_1, y_1)$ | **4** | **85** |
| $(x_2, y_2)$ | **8** | **50** |
| $(x_3, y_3)$ | **12** | **70** |

**Objetivo:** Estimar con alta fidelidad matemática la latencia esperada para una asignación intermedia de **$x_{\text{eval}} = 6\text{ GB}$**.

---

## 2. Fundamentación Teórica y Formulación

### 2.1 Teorema de Existencia y Unicidad de Lagrange
Dados $n + 1$ puntos con abscisas distintas ($x_i \neq x_j$ para todo $i \neq j$), existe un único polinomio $P_n(x)$ de grado a lo sumo $n$ tal que $P_n(x_i) = y_i$.

El polinomio se define como la combinación lineal:
$$P_n(x) = \sum_{k=0}^{n} y_k L_k(x)$$

Donde cada polinomio base de Lagrange $L_k(x)$ se expresa como el producto de cocientes:
$$L_k(x) = \prod_{\substack{i=0 \\ i \neq k}}^{n} \frac{x - x_i}{x_k - x_i} = \frac{\prod_{i \neq k} (x - x_i)}{\prod_{i \neq k} (x_k - x_i)}$$

### 2.2 Denominadores del Caso de 4 Nodos
- **$d_0$**: $(2 - 4)(2 - 8)(2 - 12) = (-2)(-6)(-10) = -120$
- **$d_1$**: $(4 - 2)(4 - 8)(4 - 12) = (2)(-4)(-8) = +64$
- **$d_2$**: $(8 - 2)(8 - 4)(8 - 12) = (6)(4)(-4) = -96$
- **$d_3$**: $(12 - 2)(12 - 4)(12 - 8) = (10)(8)(4) = +320$

### 2.3 Polinomio Canónico Estándar Expandido
Tras realizar el producto de binomios y agrupar por potencias:
$$P_3(x) = -0.223958x^3 + 7.093750x^2 - 68.791667x + 261.000000$$

### 2.4 Evaluación en $x = 6\text{ GB}$
- $L_0(6) = \frac{(6-4)(6-8)(6-12)}{-120} = \frac{24}{-120} = -0.20$
- $L_1(6) = \frac{(6-2)(6-8)(6-12)}{64} = \frac{48}{64} = +0.75$
- $L_2(6) = \frac{(6-2)(6-4)(6-12)}{-96} = \frac{-48}{-96} = +0.50$
- $L_3(6) = \frac{(6-2)(6-4)(6-8)}{320} = \frac{-16}{320} = -0.05$

$$\sum_{k=0}^3 L_k(6) = -0.20 + 0.75 + 0.50 - 0.05 = 1.000000 \quad \text{(Partición de la unidad)}$$

$$P_3(6) = 150(-0.20) + 85(0.75) + 50(0.50) + 70(-0.05) = -30 + 63.75 + 25 - 3.5 = \mathbf{55.25\text{ ms}}$$

---

## 3. Complejidad Algorítmica

1. **Construcción de los Polinomios Base:**
   Para $n$ nodos, cada base $L_k(x)$ involucra un producto sobre los $n - 1$ nodos restantes. El algoritmo utiliza dos bucles anidados:
   $$\text{Complejidad temporal: } \mathcal{O}(n^2)$$
2. **Evaluación Polinómica:**
   Para evaluar $P_n(x)$ en cualquier punto de la curva o en $x_{\text{eval}}$, se aplica el **Esquema de Horner**, reduciendo las multiplicaciones a:
   $$\text{Complejidad de evaluación: } \mathcal{O}(n)$$

---

## 4. Arquitectura del Software

El código se encuentra organizado de forma modular, sin frameworks pesados ni dependencias externas:

```text
lagrange/
├── index.html          # Estructura semántica accesible con MathML/CSS formal
├── README.md           # Memoria técnica y documentación del proyecto
├── assets/
│   └── icon.svg        # Ícono vectorial académico de la aplicación
├── css/
│   └── styles.css      # Hoja de estilos con estética editorial paper universitario
└── js/
    ├── validation.js   # Validación RF-02 (tipos, unicidad de abscisas xi, límites)
    ├── lagrange.js     # Motor matemático O(n^2), álgebra de polinomios y Horner
    ├── formatter.js    # Formateador matemático tipográfico en HTML/CSS nativo
    ├── chart.js        # Motor de gráfica en Canvas HTML5 nativo con cursor y tooltips
    └── app.js          # Controlador principal y gestión de eventos del DOM
```

---

## 5. Suite de Verificación Matemática en Tiempo Real

La aplicación incluye un panel en vivo que evalúa automáticamente 4 teoremas y condiciones numéricas con tolerancia $\varepsilon = 10^{-7}$:

1. **Exactitud Nodal:** Comprueba que $|P_n(x_i) - y_i| < \varepsilon$ para cada nodo ingresado.
2. **Partición de la Unidad:** Verifica que $\left|\sum_{k=0}^n L_k(x_{\text{eval}}) - 1\right| < \varepsilon$.
3. **Delta de Kronecker:** Valida que $L_k(x_j) = 1$ cuando $k = j$ y $L_k(x_j) = 0$ cuando $k \neq j$.
4. **Consistencia de Expansión:** Corrobora que la evaluación directa del algoritmo de Lagrange sea numéricamente idéntica a la evaluación del polinomio expandido mediante el método de Horner.

---

## 6. Instrucciones de Ejecución

La aplicación está diseñada para operar **100% de manera autónoma y offline**.

### Opción 1: Abrir directamente en el navegador
Haga doble clic en el archivo `index.html` o ábralo desde su navegador preferido (Chrome, Firefox, Edge, Safari). No requiere conexión a internet ni servidor web.

### Opción 2: Usar un servidor local ligero
Si desea ejecutarlo con un servidor web local:
```bash
# Con Python 3
python -m http.server 8080

# O con Node.js npx serve
npx serve .
```
Luego ingrese a `http://localhost:8080`.
