# AnaLisaMe: análisis de sentimiento en español

**AnaLisaMe** es una aplicación web full-stack que clasifica textos en español como **positivos, negativos o neutrales**, junto con un porcentaje de confianza. Usa un modelo de lenguaje preentrenado (RoBERTuito) servido por una API en FastAPI, con una interfaz en React.

## 📸 Demostración

<p align="center">
  <img src="./imgs/home_light.png" width="500" style="display: inline-block; margin: 1%;" alt="Demostración de la app 1">
  <img src="./imgs/home_dark.png" width="500" style="display: inline-block; margin: 1%;" alt="Demostración de la app 2">
</p>

<p align="center">
  <img src="./imgs/a_normal_carga.png" width="500" style="display: inline-block; margin: 1%;" alt="Demostración de la app 3">
  <img src="./imgs/a_normal_res.png" width="500" style="display: inline-block; margin: 1%;" alt="Demostración de la app 4">
</p>

<p align="center">
  <img src="./imgs/a_extendido.png" width="500" style="display: inline-block; margin: 1%;" alt="Demostración de la app 5">
  <img src="./imgs/a_ext_res.png" width="500" style="display: inline-block; margin: 1%;" alt="Demostración de la app 6">
</p>

## ✨ Características

* 🔍 **Análisis de sentimiento** de textos en español con un modelo RoBERTa (Hugging Face Transformers).
* ⚡ **Dos modos de análisis:**
  * **Normal:** escribes o pegas un texto y obtienes su sentimiento.
  * **Extendido:** subes un archivo `.json` o `.txt` con varios textos (por ejemplo, comentarios de un foro) y obtienes un resumen por sentimiento y el detalle de cada texto.
* ✂️ **Textos largos:** los textos de más de 465 caracteres se dividen en partes, se analiza cada una y se muestra un resultado general.
* 🛡️ **Validación de entradas:** se rechazan los textos sin palabras (solo símbolos o números), tanto en el frontend como en la API.
* 🌓 **Modo claro y modo nocturno.**
* 💻 **Funciona en CPU:** no requiere una GPU. Si tienes una GPU NVIDIA compatible, puedes instalar PyTorch con soporte CUDA para acelerar el análisis (ver más abajo).

## 🛠️ Tecnologías utilizadas

* **Backend:** Python, FastAPI, Uvicorn
* **IA:** PyTorch (CPU o GPU), Hugging Face Transformers
* **Frontend:** React + Vite, Axios
* **Modelo:** [pysentimiento/robertuito-sentiment-analysis](https://huggingface.co/pysentimiento/robertuito-sentiment-analysis) (modelo para análisis de sentimiento en español)

## 📋 Requisitos previos

* [Git](https://git-scm.com/)
* [Python](https://www.python.org/) 3.10 o superior (probado con 3.12)
* [Node.js](https://nodejs.org/) (versión LTS reciente) y npm
* Conexión a internet en la primera ejecución: el modelo (unos 400-500 MB) se descarga de Hugging Face y queda guardado en la caché local.

## 🚀 Instalación y configuración local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/analisis-sentimiento.git
cd analisis-sentimiento
```

### 2. Configurar el backend

Entra a la carpeta del backend y crea un entorno virtual:

```bash
cd backend
python3 -m venv venv
```

> En Windows usa `python` en lugar de `python3`. En Ubuntu/WSL, si falla la creación del entorno, instala antes `python3-venv` con `sudo apt install python3-venv`.

Activa el entorno virtual:

* Linux / macOS / WSL:

  ```bash
  source venv/bin/activate
  ```

* Windows (PowerShell):

  ```powershell
  .\venv\Scripts\Activate.ps1
  ```

  Si PowerShell indica que la ejecución de scripts está deshabilitada, ejecuta primero `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` y vuelve a activar el entorno.

#### Instalar PyTorch (elige **una** opción)

PyTorch se instala **antes** que el resto de las dependencias y por separado, porque existen versiones distintas según tu hardware. La versión con soporte para GPU pesa varios GB; la de CPU es mucho más liviana.

**Opción A: solo CPU** *(recomendada si no tienes una GPU NVIDIA, si es antigua o con poca memoria, o si prefieres una instalación liviana)*

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

Para el uso normal de esta aplicación, la CPU suele alcanzar.

**Opción B: GPU NVIDIA (CUDA)**

1. Entra a [pytorch.org/get-started/locally](https://pytorch.org/get-started/locally/).
2. Elige *Stable*, tu sistema operativo, *Pip*, *Python* y la versión de CUDA que sea compatible con tu tarjeta.
3. Copia y ejecuta el comando que te muestra la página. Tiene esta forma (el número `XXX` depende de la versión de CUDA que elijas):

   ```bash
   pip install torch --index-url https://download.pytorch.org/whl/cuXXX
   ```

> Las versiones de CUDA que ofrece PyTorch cambian con el tiempo, y no todas las tarjetas antiguas son compatibles con las más nuevas. Por eso es mejor generar el comando desde la página oficial.

Para comprobar qué versión quedó instalada:

```bash
python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```

Si aparece `True` al final, PyTorch detecta tu GPU; con `False`, usará la CPU. La aplicación usa la GPU automáticamente cuando está disponible.

#### Instalar el resto de las dependencias

```bash
pip install -r requirements.txt
```

#### Iniciar el servidor

```bash
uvicorn main:app --reload
```

La API queda disponible en `http://localhost:8000`, y su documentación interactiva en `http://localhost:8000/docs`. En la primera ejecución se descarga el modelo, por lo que el arranque puede tardar.

### 3. Configurar el frontend

En otra terminal, desde la raíz del proyecto:

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173` en tu navegador.

> El frontend se comunica con la API en `http://localhost:8000` (configurado en `frontend/services/sentiment.service.js`), y la API acepta peticiones desde `http://localhost:5173`. Si cambias algún puerto, actualiza ambos lugares.

## 🧭 Uso

* **Análisis normal:** escribe o pega un texto y presiona **Analizar**.
* **Análisis extendido:** presiona **Análisis extendido**, elige un archivo y obtén el resumen y el detalle de cada texto. Formatos aceptados:

  * `.json`: una lista de textos, o de objetos con un campo `texto` (y, opcionalmente, `id`).

    ```json
    [
      { "id": 1, "texto": "Me encantó el producto" },
      { "id": 2, "texto": "Llegó roto y nadie responde" }
    ]
    ```

  * `.txt`: un texto por línea.

### Límites

| Qué | Límite |
| --- | --- |
| Caracteres por parte | 465 (los textos más largos se dividen automáticamente) |
| Partes por texto | 20 |
| Textos por archivo | 200 |
| Tamaño del archivo | 1 MB |

## 🔌 API

`POST /api/sentiment/batch`

```json
{ "textos": ["Me encantó", "Muy malo"] }
```

Respuesta (en el mismo orden que la entrada; los textos sin palabras analizables devuelven un campo `error` en lugar de `etiqueta` y `confianza`):

```json
{
  "resultados": [
    { "texto": "Me encantó", "etiqueta": "Positivo", "confianza": 0.97 },
    { "texto": "Muy malo", "etiqueta": "Negativo", "confianza": 0.91 }
  ]
}
```

La API acepta hasta 64 textos por petición, de hasta 500 caracteres cada uno.

## ⚠️ Limitaciones

* El modelo se entrenó principalmente con mensajes cortos y coloquiales, así que rinde mejor con ese tipo de texto.
* No siempre detecta el sarcasmo ni la ironía.
* Los resultados son estimaciones, no verdades absolutas. Una confianza baja indica que el modelo no está seguro.
* Solo funciona con textos en español.

## 📁 Estructura del proyecto

```
analisis-sentimiento/
├── backend/
│   ├── main.py            # API (FastAPI)
│   ├── inference.py       # carga del modelo y análisis por lotes
│   └── requirements.txt
└── frontend/
    ├── services/          # llamadas a la API (Axios)
    └── src/               # interfaz (React)
```

## 🙏 Créditos

* Modelo: [pysentimiento/robertuito-sentiment-analysis](https://huggingface.co/pysentimiento/robertuito-sentiment-analysis), del proyecto [pysentimiento](https://github.com/pysentimiento/pysentimiento). Revisa las condiciones de uso del modelo en su página.
* [Hugging Face Transformers](https://huggingface.co/docs/transformers) y [PyTorch](https://pytorch.org/).

---

© 2026 Araceli Maldonado. Todos los derechos reservados.