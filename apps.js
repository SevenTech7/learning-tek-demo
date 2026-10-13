window.LEARNING_TEK_REGISTRY = {
  "version": 1,
  "modoPublico": true,
  "entornos": [
    {
      "id": "demo",
      "nombre": "Demostración",
      "descripcion": "Versiones de prueba publicadas. No guardan nada."
    }
  ],
  "apps": [
    {
      "id": "sistema-authoring",
      "nombre": "Sistema de Autoría",
      "categoria": "Autoría",
      "descripcion": "Editor visual de cursos: árbol de unidades y páginas, lienzo con arrastrar y soltar, biblioteca de recursos y vista previa con el mismo player que verá el alumno.",
      "stack": [
        "React + Vite",
        "FastAPI",
        "PostgreSQL",
        "Azure Blob/Queue"
      ],
      "entornos": {
        "demo": {
          "url": "./autoria/",
          "acceso": [
            {
              "rol": "Autor",
              "usuario": "usuariodemo@example.com",
              "clave": "Abc123!"
            }
          ],
          "notaPublica": "Demostración con un curso de ejemplo: arma páginas arrastrando componentes y míralas en la vista previa. Nada se guarda: al recargar vuelve al ejemplo."
        }
      },
      "codigo": {
        "privado": true
      }
    },
    {
      "id": "tekleaf",
      "nombre": "TekLeaf",
      "categoria": "Publicación",
      "descripcion": "Convierte PDF, HTML paginado e imágenes en libros flipbook HTML5 autocontenidos: web, ZIP, offline o embebido en otra página.",
      "stack": [
        "Node 22, sin dependencias",
        "Poppler",
        "ImageMagick",
        "Chromium"
      ],
      "entornos": {
        "demo": {
          "url": "./tekleaf/",
          "notaPublica": "Abre un libro de ejemplo o convierte tu propio PDF (hasta 6 páginas y 1 MB). La conversión ocurre en tu navegador: el archivo no se sube a ningún servidor."
        }
      },
      "codigo": {
        "privado": true
      }
    },
    {
      "id": "plataforma-educativa",
      "nombre": "Plataforma Educativa",
      "categoria": "Aprendizaje",
      "descripcion": "Portal del colegio: biblioteca y lector, aula, tareas y evaluaciones, asistencia, boletín, panel de familia y tutor con IA.",
      "stack": [
        "React PWA",
        "Hono (Node 22)",
        "PostgreSQL + RLS",
        "Azure"
      ],
      "entornos": {
        "demo": {
          "url": "./plataforma/",
          "acceso": [
            {
              "rol": "Alumna",
              "usuario": "valeria.rojas",
              "clave": "demo-maqueta"
            },
            {
              "rol": "Docente",
              "usuario": "marcos.aliaga",
              "clave": "demo-maqueta"
            },
            {
              "rol": "Familia",
              "usuario": "rosa.mamani",
              "clave": "demo-maqueta"
            },
            {
              "rol": "Dirección",
              "usuario": "carlos.mendoza",
              "clave": "demo-maqueta"
            }
          ],
          "notaPublica": "Entra como alumna, docente, familia o dirección con la barra inferior, o escribiendo uno de estos usuarios (la clave no se valida: sirve cualquiera). Los datos son inventados y no se guardan en ningún servidor: lo que haces solo vive en esta pestaña."
        }
      }
    }
  ]
};
