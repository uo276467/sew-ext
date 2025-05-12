class Pregunta {
  constructor(texto, respuestas, correcta) {
    this.texto = texto;
    this.respuestas = respuestas;
    this.correcta = correcta;
  }

  generarHTML(index) {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = `${index + 1}. ${this.texto}`;
    fieldset.appendChild(legend);

    this.respuestas.forEach((respuesta, i) => {
      const label = document.createElement("label");
      label.style.display = "block";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `pregunta-${index}`;
      input.value = i;

      label.appendChild(input);
      label.appendChild(document.createTextNode(respuesta));
      fieldset.appendChild(label);
    });

    return fieldset;
  }

  esCorrecta(respuestaSeleccionada) {
    return parseInt(respuestaSeleccionada) === this.correcta;
  }
}

class Juego {
  constructor(datosPreguntas) {
    this.preguntas = datosPreguntas.map(
      (p) => new Pregunta(p.texto, p.respuestas, p.correcta)
    );
    this.section = document.querySelector("section");
    this.form = document.createElement("form");
    this.boton = null;

    this.crearPreguntas();
    this.crearBotonEnviar();
    this.section.appendChild(this.form);
  }

  crearPreguntas() {
    this.preguntas.forEach((pregunta, i) => {
      const preguntaHTML = pregunta.generarHTML(i);
      this.form.appendChild(preguntaHTML);
    });
  }

  crearBotonEnviar() {
    this.boton = document.createElement("button");
    this.boton.type = "button";
    this.boton.textContent = "Enviar respuestas";
    this.boton.addEventListener("click", () => this.mostrarResultado());
    this.form.appendChild(this.boton);
  }

  mostrarResultado() {
    let correctas = 0;
    this.preguntas.forEach((pregunta, i) => {
      const seleccion = this.form.querySelector(
        `input[name="pregunta-${i}"]:checked`
      );
      if (seleccion && pregunta.esCorrecta(seleccion.value)) {
        correctas++;
      }
    });

    const resultado = document.createElement("p");
    resultado.textContent = `Has acertado ${correctas} de ${this.preguntas.length} preguntas.`;

    const anteriorResultado = this.form.querySelector("p.resultado");
    if (anteriorResultado) {
      anteriorResultado.replaceWith(resultado);
    } else {
      resultado.classList.add("resultado");
      this.form.insertBefore(resultado, this.boton);
    }
    this.boton.disabled = true;
  }
}

const datosPreguntas = [
  {
    texto: "¿Sobre qué concejo asturiano es la temática de esta página web?",
    respuestas: ["Gijón", "Mieres", "Oviedo", "Avilés", "Langreo"],
    correcta: 1,
  },
  {
    texto:
      "¿A cuántos enlaces puedes hacer click en el menú de navegación superior?",
    respuestas: ["5", "6", "7", "8", "9"],
    correcta: 3,
  },
  {
    texto:
      "¿Cuántas imágenes hay en el carrusel de imágenes de la sección 'Inicio'?",
    respuestas: ["1", "2", "3", "4", "5"],
    correcta: 4,
  },
  {
    texto: "¿Cuál de las siguientes es un plato típico de Mieres?",
    respuestas: ["Pulpo", "Tortilla", "Jamón", "Arveyos con jamón", "Paella"],
    correcta: 3,
  },
  {
    texto: "¿Cuál de los siguientes es un restaurande ubicado en Mieres?",
    respuestas: [
      "La Taberna de Mieres",
      "El Chigre de Mieres",
      "La Mendiga",
      "El Restaurante de Mieres",
      "La Sidrería de Mieres",
    ],
    correcta: 2,
  },
  {
    texto:
      "¿Qué información sobre las rutas turísticas NO aparece se muestra en la sección 'Rutas'?",
    respuestas: ["Nombre", "Descripción", "Agencia", "Dificultad", "Duración"],
    correcta: 3,
  },
  {
    texto:
      "¿Para cuántos días se muestra información meteorológica en Mieres en la sección 'Meteorología'?",
    respuestas: ["1", "6", "7", "8", "9"],
    correcta: 3,
  },
  {
    texto:
      "¿Cuántos recursos turísticos hay disponibles para reservar en la sección 'Reservas'?",
    respuestas: ["1", "2", "3", "4", "5"],
    correcta: 4,
  },
  {
    texto:
      "¿Sobre qué apartado del menú de navegación NO hay información en la sección 'Ayuda'?",
    respuestas: ["Gastronomía", "Ayuda", "Rutas", "Reservas", "Juego"],
    correcta: 1,
  },
  {
    texto: "¿Cúantas preguntas tiene este test?",
    respuestas: ["5", "10", "15", "20", "25"],
    correcta: 1,
  },
];

new Juego(datosPreguntas);
