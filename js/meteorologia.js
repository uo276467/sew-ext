class Meteorologia {
  constructor() {
    this.latitud = "43.252608";
    this.longitud = "-5.771945";
    this.cargarDatos();
  }
  cargarDatos() {
    const tipo = "&mode=xml";
    const unidades = "&units=metric";
    const idioma = "&lang=es";
    const apikey = "b174d383f6fbf3768e2ab4c0519b4738";
    const days = "&cnt=8";
    const url =
      "https://api.openweathermap.org/data/2.5/forecast/daily?lat=" +
      this.latitud +
      "&lon=" +
      this.longitud +
      tipo +
      idioma +
      unidades +
      days +
      "&appid=" +
      apikey;

    const iconoUrl = "https://openweathermap.org/img/wn/";
    const iconoFormat = "@2x.png";

    $.ajax({
      dataType: "xml",
      url: url,
      method: "GET",
      success: function cargarDatos(xml) {
        const $xml = $(xml);
        const $forecast = $xml.find("forecast");

        $forecast.find("time").each(function (index) {
          const $time = $(this);
          const temperatureMin = $time.find("temperature").attr("min");
          const temperatureMax = $time.find("temperature").attr("max");
          const temperatureUnit = $time.find("temperature").attr("unit");
          const humidityValue = $time.find("humidity").attr("value");
          const humidityUnit = $time.find("humidity").attr("unit");
          const precipitationValue = $time.find("precipitation").attr("value");
          const iconName = $time.find("symbol").attr("name");
          const iconCode = $time.find("symbol").attr("var");

          var stringDatos = "";
          if (index == 0) {
            stringDatos += "<article><h3>Tiempo para hoy </h3>";
          } else {
            stringDatos += "<article><h3>Predicción día " + index + "</h3>";
          }
          stringDatos += "<table>";
          stringDatos +=
            "<tr><th scope='col' id='min" + index + "'>Temperatura mínima</th>";
          stringDatos +=
            "<th scope='col' id='max" + index + "'>Temperatura máxima</th>";
          stringDatos += "<th id='humedad" + index + "'>Humedad</th>";
          stringDatos +=
            "<th scope='col' id='precipitacion" +
            index +
            "'>Precipitación</th></tr>";

          stringDatos +=
            "<tr><td headers='min" +
            index +
            "'>" +
            temperatureMin +
            " grados " +
            temperatureUnit +
            "</td>";
          stringDatos +=
            "<td headers='max" +
            index +
            "'>" +
            temperatureMax +
            " grados " +
            temperatureUnit +
            "</td>";
          stringDatos +=
            "<td headers='humedad" +
            index +
            "'>" +
            humidityValue +
            " " +
            humidityUnit +
            "</td>";
          if (precipitationValue === undefined) {
            stringDatos += "<td>No disponible</td></tr>";
          } else {
            stringDatos +=
              "<td headers='precipitacion" +
              index +
              "'>" +
              precipitationValue +
              "</td></tr>";
          }
          stringDatos += "</table>";

          stringDatos += "<figure>";
          stringDatos +=
            "<img src='" +
            iconoUrl +
            iconCode +
            iconoFormat +
            "' alt='" +
            iconName +
            index +
            "'>";
          stringDatos += "<figcaption>" + iconName + "</figcaption>";
          stringDatos += "</figure>";

          stringDatos += "</article>";

          $("section").append(stringDatos);
        });
      },
      error: function () {
        $("h3").html(
          "¡Tenemos problemas! No puedo obtener XML de <a href='http://openweathermap.org'>OpenWeatherMap</a>"
        );
      },
    });
  }
}
var meteorologia = new Meteorologia();
