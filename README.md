# Generador de parciales

Página para maestros. Se pega el contenido de las clases, se eligen las series y los puntos, y salen el examen, el resuelto en rojo y el temario de estudio, listos para imprimir o bajar en Word.

Se usa en https://tunuba.github.io/generador-parciales/

## Cómo se usa

1. Datos del examen. Todo con selectores, El Saber No.1 o No.2 con su logo, la materia, el grado, el parcial o examen final y el bloque. El parcial va en una hoja y el examen final en dos.
2. Contenido de las clases. Se pega el texto o se suben archivos .txt, .docx, .pptx o .pdf con texto.
3. Series. Se marcan las que van y los puntos se reparten solos, con menos y más para moverlos. Van al menos dos series por hoja. Las preguntas salen de la forma del texto, por eso conviene escribir los conceptos en lista, uno por renglón, como `Evaporación. El calor del Sol convierte el agua en vapor.`, y los pasos numerados.
4. Resultado. Examen, resuelto y temario. Se baja el Word, se imprime o se guarda en PDF.

## Reglas que cuida

- Las respuestas no quedan en orden. La selección múltiple reparte a, b, c y d sin tres iguales seguidas, el parear lleva dos conceptos de más y ninguna letra cae en su fila, ningún paso queda en su lugar y el banco de palabras no sigue el orden de las oraciones.
- Completar y Parear no van juntas.
- Ninguna serie se parte entre dos hojas y el espacio que sobra se llena con renglones para responder.
- Avisa cuando la respuesta de una pregunta sale escrita en otra.

## Archivos

- `index.html`, `estilo.css` y `app.js` son la página.
- `motor.js` tiene las series, lo que se le pide a la IA, la revisión de lo que devuelve y la mezcla de respuestas.
- `basico.js` arma las series sin IA.
- `hoja.js` dibuja las hojas y las reparte y `word.js` arma el .docx.

La máquina propone y el maestro revisa. Hay que leer el resuelto completo antes de imprimir.
