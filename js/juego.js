class Pregunta {
  constructor(texto, respuestas, correcta, juego, indice) {
    this.texto = texto;
    this.juego = juego;
    this.respuestasTexto = respuestas;
    this.correcta = correcta;
    this.article = document.createElement("article");
    this.indice = indice;
    this.respuestas = [];
  }

  crearElemento() {
    let h3 = document.createElement("h3");
    h3.textContent = this.texto;
    this.article.appendChild(h3);

    let fieldset = document.createElement("fieldset");
    let legend = document.createElement("legend");
    legend.textContent = "Opciones de respuesta";
    fieldset.appendChild(legend);

    for (let j = 1; j <= 5; j++) {
      let p = document.createElement("p");
      let label = document.createElement("label");
      let input = document.createElement("input");
      input.type = "radio";
      input.name = `pregunta_${this.indice}`;
      input.value = j;
      input.addEventListener("change", () => this.juego.verificarRespuestas());
      label.textContent = this.respuestasTexto[j - 1];
      label.prepend(input);
      p.appendChild(label);
      fieldset.appendChild(p);
      this.respuestas.push({ input, label });
    }

    this.article.appendChild(fieldset);
    return this.article;
  }

  obtenerRespuestaSeleccionada() {
    return this.respuestas.find((r) => r.input.checked);
  }

  deshabilitarRespuestas() {
    this.respuestas.forEach((r) => (r.input.disabled = true));
  }

  mostrarResultado(correcta) {
    this.resultado.textContent = correcta ? "Correcta" : "Incorrecta";
  }
}

class Juego {
  constructor(datosPreguntas) {
    this.section = document.querySelector("section");

    this.preguntas = [];
    this.crearPreguntas(datosPreguntas);
    this.crearPuntuacion();
  }

  crearPreguntas(datosPreguntas) {
    for (let i = 0; i < 10; i++) {
      let pregunta = new Pregunta(
        datosPreguntas[i].texto,
        datosPreguntas[i].respuestas,
        datosPreguntas[i].correcta,
        this,
        i
      );
      this.preguntas.push(pregunta);
      this.section.appendChild(pregunta.crearElemento());
    }
  }

  crearPuntuacion() {
    this.articlePuntuacion = document.createElement("article");
    this.puntuacionTexto = document.createElement("p");
    this.articlePuntuacion.appendChild(this.puntuacionTexto);
    this.section.appendChild(this.articlePuntuacion);
  }

  verificarRespuestas() {
    if (this.preguntas.every((p) => p.obtenerRespuestaSeleccionada())) {
      this.calcularPuntuacion();
    }
  }

  calcularPuntuacion() {
    let puntuacion = 0;
    for (let pregunta of this.preguntas) {
      let respuestaSeleccionada = pregunta.obtenerRespuestaSeleccionada();
      let esCorrecta =
        parseInt(respuestaSeleccionada.input.value) === pregunta.correcta;
      if (esCorrecta) {
        puntuacion++;
      }
      pregunta.deshabilitarRespuestas();
      pregunta.mostrarResultado(esCorrecta);
    }
    this.puntuacionTexto.textContent = `Tu puntuación es ${puntuacion} de 10.`;
  }
}

const datosPreguntas = [
  {
    texto: "Sobre qué concejo asturiano es la temática de esta página web?",
    respuestas: ["Gijón", "Mieres", "Oviedo", "Avilés", "Langreo"],
    correcta: 2,
  },
  {
    texto: "¿Cuál de las siguientes es un plato típico de Mieres?",
    respuestas: ["Pulpo", "Tortilla", "Jamón", "Arveyos con jamón", "Paella"],
    correcta: 4,
  },
  {
    texto:
      "¿A cuántos enlaces puedes hacer click en el menú de navegación superior?",
    respuestas: ["5", "6", "7", "8", "9"],
    correcta: 4,
  },
  {
    texto:
      "¿Para qué número de días se muestra información meteorológica en Mieres en la sección 'Meteorología'?",
    respuestas: ["1", "6", "7", "8", "9"],
    correcta: 4,
  },
  {
    texto: "¿Cúantas preguntas tiene este test?",
    respuestas: ["5", "10", "15", "20", "25"],
    correcta: 2,
  },
  {
    texto:
      "¿Qué información sobre las rutas turísticas NO aparece en el archivo xml?",
    respuestas: ["Nombre", "Descripción", "Agencia", "Dificultad", "Duración"],
    correcta: 4,
  },
  {
    texto:
      "¿Cuántos recursos turísticos hay disponibles para reservar en la sección 'Reservas'?",
    respuestas: ["1", "2", "3", "4", "5"],
    correcta: 5,
  },
  {
    texto: "¿Cuál de los siguientes es un restaurande de Mieres?",
    respuestas: [
      "La Taberna de Mieres",
      "El Chigre de Mieres",
      "La Mendiga",
      "El Restaurante de Mieres",
      "La Sidrería de Mieres",
    ],
    correcta: 3,
  },
  {
    texto: "¿Cuántas imágenes hay en el carrusel?",
    respuestas: ["1", "2", "3", "4", "5"],
    correcta: 5,
  },
  {
    texto:
      "¿Sobre qué apartado del menú de navegación no hay información en la sección 'Ayuda'?",
    respuestas: ["Gastronomía", "Ayuda", "Rutas", "Reservas", "Juego"],
    correcta: 2,
  },
];

new Juego(datosPreguntas);
