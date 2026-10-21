# Generador de parciales

Página para maestros. Se pega el contenido de las clases, se eligen las series y los puntos, y salen el examen, el resuelto en rojo y el temario de estudio, listos para imprimir o bajar en Word.

Se usa en https://tunuba.github.io/generador-parciales/

## Cómo se usa

1. Datos del examen, con el colegio, la materia, el grado, cuántas hojas lleva y el punteo total.
2. Contenido de las clases. Se pega el texto o se suben archivos .txt, .docx, .pptx o .pdf con texto.
3. Series. Se marcan las que van y cuántos puntos vale cada una. Van al menos dos series por hoja.
4. Cómo se arma.
   - Básico, sin IA. Sale al instante y no necesita internet ni cuentas. Saca las preguntas de la forma del texto, por eso conviene escribir los conceptos en lista, uno por renglón, como `Evaporación. El calor del Sol convierte el agua en vapor.`, y los pasos numerados.
   - Con IA conectada. Redacta preguntas mejores y de razonar. Sirve cualquier IA compatible con OpenAI, en la computadora (Jan, Ollama, LM Studio) o por internet con clave (Groq, Gemini, OpenAI).
5. Resultado. Examen, resuelto y temario. Se baja el Word, se imprime o se guarda en PDF.

## Reglas que cuida

- Las respuestas no quedan en orden. La selección múltiple reparte a, b, c y d sin tres iguales seguidas, el parear lleva dos conceptos de más y ninguna letra cae en su fila, ningún paso queda en su lugar y el banco de palabras no sigue el orden de las oraciones.
- Completar y Parear no van juntas.
- Ninguna serie se parte entre dos hojas y el espacio que sobra se llena con renglones para responder.
- Avisa cuando la respuesta de una pregunta sale escrita en otra.

## Conectar una IA en la computadora

La página corre en el navegador y le habla directo a la IA. La IA tiene que aceptar conexiones de esta página.

- Jan. En Settings, Local API Server, encender el servidor (puerto 1337) y dejar CORS activado.
- Ollama. Antes de abrirlo, crear la variable de entorno `OLLAMA_ORIGINS` con el valor `https://tunuba.github.io` y volver a abrir Ollama.
- LM Studio. En Developer, encender el servidor y activar Enable CORS.

El navegador puede preguntar si la página puede usar la red local. Hay que darle Permitir.

## Archivos

- `index.html`, `estilo.css` y `app.js` son la página.
- `motor.js` tiene las series, lo que se le pide a la IA, la revisión de lo que devuelve y la mezcla de respuestas.
- `basico.js` arma las series sin IA.
- `hoja.js` dibuja las hojas y las reparte, `word.js` arma el .docx y `ia.js` habla con la IA.

La máquina propone y el maestro revisa. Hay que leer el resuelto completo antes de imprimir.
