# Generador de parciales

Página para maestros. Se pega el contenido de las clases, se eligen las series y los puntos, y salen el examen, el resuelto en rojo y el temario de estudio, listos para imprimir o bajar en Word.

Se usa en https://tunuba.github.io/generador-parciales/

## Cómo se usa

1. Datos del examen. Todo con selectores, El Saber No.1 o No.2 con su logo, la materia, el grado, el parcial o examen final y el bloque. El parcial va en una hoja y el examen final en dos.
2. Contenido de las clases. Se pega el texto o se suben archivos .txt, .docx, .pptx o .pdf con texto.
3. Series. Se tocan las que van o las que se quitan, y todo se acomoda solo (app.js, `acomodar`). Las series, los puntos y las hojas se mueven para que siempre cuadre, y una línea dice qué se movió y por qué. Reglas que respeta, al menos dos series por hoja, Completar y Parear no van juntas, la suma da el punteo, y cada serie sale de verdad con el texto pegado (se prueba armando el examen, y se prefiere la mezcla donde ninguna respuesta se ve escrita en otra serie). Si el examen no cabe en las hojas, al crear se prueba otra mezcla y después una hoja más.
   Las preguntas salen de la forma del texto. Sirven las listas `Evaporación. El calor del Sol convierte el agua en vapor.`, los pasos numerados y también los párrafos corridos, de donde se sacan definiciones (`El lenguaje es la capacidad...`, `un emisor, que es quien transmite el mensaje`) y grupos (`elementos, como el mensaje, el canal y el código`). Ordenar pasos solo sale si el texto trae pasos.
   El texto se limpia solo antes de leerlo (basico.js, `prepararTexto`). Sirve lo que el maestro tenga a la mano, la respuesta de ChatGPT con negritas y títulos, un PDF con renglones cortados, un mensaje de WhatsApp sin puntos, un texto en mayúsculas, un cuestionario con `R//`, o las diapositivas de una presentación (se quitan el pie que se repite, los videos, las instrucciones para el que faltó y las tareas de la clase, y los quizzes con opciones A, B, C y D y su respuesta correcta pasan tal cual a Selección múltiple). Si el texto no alcanza para el punteo pedido, sale el examen más grande que sí se puede y lo dice. Si no cabe en las hojas, primero se reparten otra vez los puntos entre las mismas series.
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
