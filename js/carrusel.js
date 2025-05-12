class Carrusel {
  constructor() {
    this.rutas = [
      "multimedia/imagenes/mapa.webp",
      "multimedia/imagenes/hitos1_1.webp",
      "multimedia/imagenes/hitos1_2.webp",
      "multimedia/imagenes/hitos1_4.webp",
      "multimedia/imagenes/hitos2_1.webp",
    ];
    this.index = 0;
    this.maxIndex = this.rutas.length - 1;
    this.crearEstructura();
    this.agregarEventos();
    this.actualizar();
  }

  crearEstructura() {
    let main = $("main");
    let section = $("<section>").appendTo(main);
    let article = $("<article>").appendTo(section);
    $("<h2>").text("Carrusel de imágenes").appendTo(this.article);
    this.next = $("<button>").text(">").appendTo(article);
    this.prev = $("<button>").text("<").appendTo(article);
    this.rutas.forEach((imagen, index) => {
      let img = $("<img>");
      img.attr("src", imagen);
      img.attr("alt", imagen);
      if (index !== 0) {
        img.attr("loading", "lazy"); // Carga lazy para mejorar rendimiento
      }
      img.appendTo(article);
    });
    this.imagenes = $("img");
  }

  agregarEventos() {
    this.next.click(() => this.siguiente());
    this.prev.click(() => this.anterior());
  }

  siguiente() {
    console.log("siguiente");
    console.log("index actual: " + this.index);
    if (this.index === this.maxIndex) {
      this.index = 0;
    } else {
      this.index++;
    }
    console.log("index actualizado: " + this.index);
    this.actualizar();
  }

  anterior() {
    console.log("anterior");
    console.log("index actual: " + this.index);
    if (this.index === 0) {
      this.index = this.maxIndex;
    } else {
      this.index--;
    }
    console.log("index actualizado: " + this.index);
    this.actualizar();
  }

  actualizar() {
    this.imagenes.each((indx, img) => {
      const trans = 100 * (indx - this.index);
      $(img).css("transform", `translateX(${trans}%)`);
    });
  }
}

new Carrusel();

class Noticias {
  constructor() {
    this.cargarNoticias();
  }
  cargarNoticias() {
    const apikey = "pub_76900315d17c6cebfd419d881720d84435d31";
    const keywords = "asturias";
    const country = "es";
    const language = "es";
    let url = "https://newsdata.io/api/1/news?apikey=" + apikey;
    url += "&q=" + keywords;
    url += "&country=" + country;
    url += "&language=" + language;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          this.mostrarNoticias(data.results.slice(0, 5));
        }
      })
      .catch((error) => console.error("Error al obtener las noticias:", error));
  }

  mostrarNoticias(noticias) {
    let section = $("<section>").append("<h2>Últimas Noticias</h2>");

    noticias.forEach((noticia) => {
      let article = $("<article>");
      let titulo = $("<h3>").text(noticia.title);
      let enlace = $("<a>")
        .attr("href", noticia.link)
        .attr("target", "_blank")
        .text("Leer más");

      article.append(titulo, enlace);

      section.append(article);
    });

    $("section").last().after(section);
  }
}
var meteorologia = new Noticias();
