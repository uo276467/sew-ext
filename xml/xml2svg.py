import xml.etree.ElementTree as ET

def parse_xml_and_generate_svg(xml_path):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    rutas = root.findall("ruta")
    
    width, height = 800, 400
    margin = 50
    colors = ['blue', 'red', 'green']
    
    svg_elements = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        f'<rect width="{width}" height="{height}" fill="white" stroke="black"/>'
    ]
    
    svg_elements.append(f'<line x1="{margin}" y1="{margin}" x2="{margin}" y2="{height - margin}" stroke="black" />')  # Eje Y
    svg_elements.append(f'<line x1="{margin}" y1="{height - margin}" x2="{width - margin}" y2="{height - margin}" stroke="black" />')  # Eje X
    
    for i, ruta in enumerate(rutas):
        svg_elements = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
            f'<rect width="{width}" height="{height}" fill="white" stroke="black"/>',
            f'<line x1="{margin}" y1="{margin}" x2="{margin}" y2="{height - margin}" stroke="black" />',  # Eje Y
            f'<line x1="{margin}" y1="{height - margin}" x2="{width - margin}" y2="{height - margin}" stroke="black" />'  # Eje X
        ]

        svg_path = f"perfil{i + 1}.svg"
        hitos = ruta.find("hitos").findall("hito")
        distancias = []
        altitudes = []
        cumulative_distance = 0

        for hito in hitos:
            distancia = hito.find("distancia").get("valor")
            altitud = hito.find("coordenadas").get("altitud")
            
            if distancia and altitud:
                cumulative_distance += float(distancia)
                distancias.append(cumulative_distance)
                altitudes.append(float(altitud))

        if distancias and altitudes:
            max_distance = max(distancias)
            min_altitude = min(altitudes)
            max_altitude = max(altitudes)

            def scale_x(x):
                return margin + (x / max_distance) * (width - 2 * margin)

            def scale_y(y):
                return height - margin - ((y - min_altitude) / (max_altitude - min_altitude)) * (height - 2 * margin)

            points = " ".join(f"{scale_x(x)},{scale_y(y)}" for x, y in zip(distancias, altitudes))
            svg_elements.append(f'<polyline points="{points}" fill="none" stroke="{colors[i % len(colors)]}" stroke-width="2"/>')

        svg_elements.append('</svg>')

        with open(svg_path, "w") as svg_file:
            svg_file.write("\n".join(svg_elements))

        print(f"SVG generado en: {svg_path}")

if __name__ == "__main__":
    xml_file = "rutas.xml"
    parse_xml_and_generate_svg(xml_file)


