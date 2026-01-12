// Express: framework para crear un servidor y rutas fácilmente
const express = require("express");

// Multer: permite recibir archivos (como .docx) desde formularios
const multer = require("multer");

// Mammoth: convierte documentos .docx (Word) a HTML
const mammoth = require("mammoth");

// fs (File System): para leer y borrar archivos en el sistema
const fs = require("fs");

// JSDOM: nos deja manipular el HTML como si estuviéramos en un navegador
const { JSDOM } = require("jsdom");

// js-beautify: formatea el HTML para que quede bonito y legible
const beautify = require("js-beautify");

// Creamos la app de Express
const app = express();

// Configuramos Multer para guardar archivos subidos temporalmente en la carpeta "uploads"
const upload = multer({ dest: "uploads/" });

// Servimos archivos estáticos desde la carpeta "public" (por ejemplo un index.html)
app.use(express.static("public"));

// Permitimos que Express entienda contenido en formato JSON (para recibir y enviar datos)
app.use(express.json());


/** Limpia el HTML */
function limpiarHTML(html) {
  // Elimina atributos de estilo (style="...")
  return html
    .replace(/style=(["'])(.*?)\1/gi, "")
    // Elimina atributos de clase (class="...")
    .replace(/class=(["'])(.*?)\1/gi, "")
    // Elimina atributos de idioma (lang="...")
    .replace(/lang=(["'])(.*?)\1/gi, "")
    // Elimina etiquetas <span> pero mantiene su contenido interior
    .replace(/<span[^>]*>(.*?)<\/span>/gi, "$1")
    // Elimina párrafos vacíos o con solo espacios o &nbsp;
    .replace(/<p>(&nbsp;|\s)*<\/p>/gi, "")
    // Quita espacios en blanco al inicio y final del texto
    .trim();
}

/** Convierte un texto a formato título */
function toTitleCase(str) {
  // Convierte todo el texto a minúsculas y luego pone en mayúscula la primera letra de cada palabra
  return str.toLowerCase().replace(/\b\p{L}/gu, c => c.toUpperCase());
}

/** Aplica jerarquía y estilo al HTML */
function convertirHTML(html) {
  // Crea un documento DOM temporal a partir del HTML recibido
  const dom = new JSDOM(`<body>${html}</body>`);
  // Referencia al documento y al cuerpo del HTML
  const doc = dom.window.document;
  const body = doc.body;

  // Recorre todos los elementos dentro del <body>
  [...body.querySelectorAll("*")].forEach(node => {
    const tag = node.tagName.toUpperCase(); // Obtiene el nombre de la etiqueta (H1, P, etc.)
    const text = node.textContent.trim();   // Obtiene el texto dentro de la etiqueta
    const insideListOrTable = node.closest("li, td"); // Comprueba si está dentro de una lista o tabla

    // Solo modifica si tiene texto y no está dentro de lista/tabla
    if (!insideListOrTable && text.length > 0) {
      let newNode; // Aquí se guardará el nuevo nodo transformado

      switch (tag) {
        case "H1":
          // Convierte <h1> en <h3> y pone el texto en mayúsculas y negrita
          newNode = doc.createElement("h3");
          newNode.innerHTML = `<strong>${text.toUpperCase()}</strong>`;
          node.replaceWith(newNode);
          break;

        case "H2":
          // Convierte <h2> en <h4>
          newNode = doc.createElement("h4");
          newNode.innerHTML = `<strong>${text.toUpperCase()}</strong>`;
          node.replaceWith(newNode);
          break;

        case "H3":
          // Convierte <h3> en <h5>
          newNode = doc.createElement("h5");
          newNode.innerHTML = `<strong>${text.toUpperCase()}</strong>`;
          node.replaceWith(newNode);
          break;

        case "H4":
          // Convierte <h4> en <h6>
          newNode = doc.createElement("h6");
          newNode.innerHTML = `<strong>${text.toUpperCase()}</strong>`;
          node.replaceWith(newNode);
          break;

        case "H5":
          // Convierte <h5> en párrafo con negrita y subrayado
          newNode = doc.createElement("p");
          newNode.innerHTML = `<b><u>${toTitleCase(text)}</u></b>`;
          node.replaceWith(newNode);
          break;

        case "H6":
          // Convierte <h6> en párrafo con negrita
          newNode = doc.createElement("p");
          newNode.innerHTML = `<b>${toTitleCase(text)}</b>`;
          node.replaceWith(newNode);
          break;

        case "H7":
          // Convierte <h7> en párrafo subrayado
          newNode = doc.createElement("p");
          newNode.innerHTML = `<u>${toTitleCase(text)}</u>`;
          node.replaceWith(newNode);
          break;

        case "P":
          // Si el párrafo parece una subdivisión o es corto, lo subraya
          if (/^subdivisi/i.test(text) || text.length < 60) {
            newNode = doc.createElement("p");
            newNode.innerHTML = `<u>${toTitleCase(text)}</u>`;
            node.replaceWith(newNode);
          }
          break;

        default:
          break;
      }
    }
  });

  // Recorre todos los párrafos del documento
  [...body.querySelectorAll("p")].forEach(p => {
    const img = p.querySelector("img"); // Busca una imagen dentro del párrafo
    if (img) {
      // Centra el párrafo
      p.style.textAlign = "center";
      // Añade márgenes arriba y abajo
      p.style.margin = "10px 0";
      // Ajusta la imagen para que no se salga del ancho disponible
      img.style.maxWidth = "100%";
      // Mantiene la proporción
      img.style.height = "auto";
      // Hace que se comporte como un bloque alineable
      img.style.display = "inline-block";
    }
  });

  // Devuelve el HTML con sangrías y formato legible
  return beautify.html(body.innerHTML, {
    indent_size: 2,           // Tamaño de la sangría
    preserve_newlines: true,  // Conserva los saltos de línea
    wrap_line_length: 120     // Longitud máxima por línea
  });
}

/** Convierte un archivo DOCX a HTML */
async function convertDocx(buffer) {
  // Configuramos las opciones para Mammoth
  const options = {
    // Define cómo se mapean los estilos de Word a etiquetas HTML
    styleMap: [
      "Heading1 => h1",
      "Heading2 => h2",
      "Heading3 => h3",
      "Heading4 => h4",
      "Heading5 => h5",
      "Heading6 => h6",
      "Heading7 => h7"
    ],
    // Convierte las imágenes a base64 para incrustarlas directamente en el HTML
    convertImage: mammoth.images.inline(async image => {
      const base64 = await image.read("base64"); // Lee la imagen como cadena base64
      const ext = image.contentType.split("/")[1] || "png"; // Obtiene la extensión (png, jpg...)

      let altText = image.altText || ""; // Obtiene el texto alternativo, si existe
      altText = altText.replace(/El contenido generado por IA.*$/i, "").trim(); // Limpia texto automático

      // Devuelve un objeto con el src y alt listos para insertarse en HTML
      return {
        src: `data:image/${ext};base64,${base64}`,
        alt: altText
      };
    })
  };

  // Convierte el archivo Word a HTML usando Mammoth
  const result = await mammoth.convertToHtml({ buffer }, options);

  // Limpia el HTML de estilos innecesarios
  const cleaned = limpiarHTML(result.value);

  // Aplica formato jerárquico y estético
  const mapped = convertirHTML(cleaned);

  // Devuelve el HTML final
  return mapped;
}

/** Recibe un archivo, lo convierte a HTML y responde al cliente */
app.post("/api/convert", upload.single("docx"), async (req, res) => {
  try {
    const buffer = fs.readFileSync(req.file.path); // Lee el archivo subido
    const html = await convertDocx(buffer);        // Convierte a HTML
    fs.unlinkSync(req.file.path);                  // Borra el archivo temporal
    res.json({ html });                            // Devuelve el resultado en formato JSON
  } catch (err) {
    console.error("💥 Error procesando el DOCX:", err); // Muestra el error en consola
    res.status(500).json({ error: err.message });       // Envía error al cliente
  }
});

//---------------------------------------------------------------
// INICIO DEL SERVIDOR
//---------------------------------------------------------------
// Escuchamos en el puerto 3000
app.listen(3000, () => console.log("🚀 Servidor en http://localhost:3000"));
