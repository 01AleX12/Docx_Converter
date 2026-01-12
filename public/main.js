// Obtenemos el formulario donde el usuario sube el archivo
const form = document.getElementById("uploadForm");

// Contenedor donde se mostrará el resultado
const resultContainer = document.getElementById("result-container");

// Elemento donde se pondrá el HTML convertido
const result = document.getElementById("result");

// Botón para copiar el resultado al portapapeles
const copyBtn = document.getElementById("copyBtn");


/**
 * Evento que envia el formulario
 */
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // Evita que la página se recargue al enviar el formulario

  // Obtenemos el archivo seleccionado por el usuario
  const file = document.getElementById("docx").files[0];

  // Si no se seleccionó ningún archivo, mostramos un aviso
  if (!file) return alert("Selecciona un archivo .docx");

  // Creamos un objeto FormData para enviar el archivo al servidor
  const formData = new FormData();
  formData.append("docx", file); // “docx” debe coincidir con el nombre del campo del backend

  // Mostramos un mensaje de “Procesando...” mientras se convierte
  resultContainer.style.display = "block";
  result.textContent = "Procesando...";

  try {
    // Enviamos la petición POST al servidor con el archivo .docx
    const res = await fetch("/api/convert", {
      method: "POST",
      body: formData, // enviamos el archivo en el cuerpo de la petición
    });

    // Si el servidor devuelve un error (por ejemplo 500 o 404)
    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}`);
    }

    // Obtenemos la respuesta como texto (porque puede no ser JSON válido)
    const text = await res.text();
    let data;

    // Intentamos convertir la respuesta a JSON
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ No se pudo parsear JSON:", text);
      throw new Error("El servidor devolvió un formato inesperado");
    }

    // Si el backend envía un mensaje de error, lo mostramos
    if (data.error) {
      result.textContent = "⚠️ Error: " + data.error;
    } else {
      // Si todo salió bien, mostramos el HTML con formato bonito
      result.textContent = formatHTML(data.html || "");
    }

  } catch (err) {
    // Si algo falla (por ejemplo, el servidor no responde)
    console.error("💥 Error en fetch:", err);
    result.textContent = "💥 Error: " + err.message;
  }
});


/**
 * Funcion para formatear el html con sangrias
 */
function formatHTML(html) {
  let indent = 0; // controla cuántos espacios dejamos por nivel

  return html
    .replace(/></g, ">\n<") // añadimos saltos de línea entre etiquetas
    .split("\n") // dividimos el HTML por líneas
    .map((line) => {
      // Si la línea cierra una etiqueta (</...), reducimos la sangría
      if (line.match(/^<\/\w/)) indent -= 2;
      if (indent < 0) indent = 0;

      // Añadimos los espacios (sangría)
      const formatted = " ".repeat(indent) + line;

      // Si la línea abre una nueva etiqueta (por ejemplo <div>), aumentamos sangría
      if (line.match(/^<\w[^>]*[^\/]>$/) && !line.includes("</")) indent += 2;

      return formatted;
    })
    .join("\n"); // juntamos todo en un texto final
}


/**
 * funcion para copiar el html
 */
copyBtn.addEventListener("click", () => {
  // Obtenemos el texto que se muestra en el resultado
  const text = result.textContent;

  // Usamos la API del navegador para copiarlo al portapapeles
  navigator.clipboard.writeText(text)
    .then(() => {
      // Cambiamos el texto del botón temporalmente
      copyBtn.textContent = "Copiado";

      // Pasado 1,5 segundos, volvemos al texto original
      setTimeout(() => (copyBtn.textContent = "Copiar"), 1500);
    })
    .catch((err) => {
      // Si algo falla (por permisos o navegador), mostramos un aviso
      console.error("Error al copiar:", err);
      alert("No se pudo copiar el texto.");
    });
});
