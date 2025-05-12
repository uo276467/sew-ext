<?php
session_start();
ob_start();
class DataManager {
    private $server;
    private $user;
    private $pass;
    private $dbname;
    private $conn;

    public function __construct() {
        $this->server = "localhost";
        $this->user = "DBUSER2025";
        $this->pass = "DBPWD2025";
        $this->dbname = "reservas";

        $this->conn = new mysqli($this->server, $this->user, $this->pass);

        if ($this->conn->connect_error) {
            die("Error de conexión: " . $this->conn->connect_error);
        }

        if (!$this->databaseExists()) {
            $this->createDatabase();
        }else {
            $this->conn->select_db($this->dbname);
        }
    }
    private function databaseExists() {
        $query = "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$this->dbname'";
        $result = $this->conn->query($query);
        return $result->num_rows > 0;
    }

    public function dropDatabase(){
        $query = "DROP DATABASE IF EXISTS $this->dbname";
        if ($this->conn->query($query) === TRUE) {
            echo "<p>Base de datos '$this->dbname' eliminada con éxito.</p>";
        } else {
            die("Error al eliminar la base de datos: " . $this->conn->error);
        }
    }

    public function createDatabase() {
        $query = "CREATE DATABASE $this->dbname COLLATE utf8_spanish_ci";
        if ($this->conn->query($query) === TRUE) {
            $this->conn->select_db($this->dbname);
            $this->createTables();
            $this->insertDataFromCsv('./datos.csv');
        } else {
            die("Error al crear la base de datos: " . $this->conn->error);
        }
    }
    public function createTables() {
        $sqlFilePath = 'reservas.sql';
        
        $sqlContent = file_get_contents($sqlFilePath);
        
        $queries = array_filter(array_map('trim', explode(';', $sqlContent)));
        
        foreach ($queries as $query) {
            if (!empty($query)) {
                if ($this->conn->query($query) !== TRUE) {
                    echo "<p>Error al ejecutar la consulta: " . $this->conn->error . "</p>";
                }
            }
        }
    }
    public function insertDataFromCsv($csvFilePath) {
        if (!file_exists($csvFilePath)) {
            die("Error: El archivo CSV no existe.");
        }
    
        $file = fopen($csvFilePath, 'r');
        if (!$file) {
            die("Error: No se pudo abrir el archivo CSV.");
        }
    
        while (($line = fgetcsv($file, 1000, ";")) !== false) {
            if ($line[0] === 'recursos_turisticos') {
                // Inserta en la tabla recursos_turisticos
                $stmt = $this->conn->prepare("INSERT INTO recursos_turisticos (nombre, descripcion, precio, fecha_inicio, fecha_fin, limite_ocupacion) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("ssdssi", $line[1], $line[2], $line[3], $line[4], $line[5], $line[6]);
                if (!$stmt->execute()) {
                    die("Error al insertar recurso turístico: " . $this->conn->error);
                }
            }else if ($line[0] === 'usuarios') {
                // Inserta en la tabla usuarios
                $stmt = $this->conn->prepare("INSERT INTO usuarios (nombre, email, contraseña) VALUES (?, ?, ?)");
                $hashedPassword = password_hash($line[3], PASSWORD_BCRYPT);
                $stmt->bind_param("sss", $line[1], $line[2], $hashedPassword);
                if (!$stmt->execute()) {
                    die("Error al insertar recurso turístico: " . $this->conn->error);
                }
            }
        }
    
        fclose($file);
    }
    public function emailExiste($email) {
        $stmt = $this->conn->prepare("SELECT id FROM usuarios WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->num_rows > 0;
    }

    public function createUser($nombre, $email, $contraseña) {
        if ($this->emailExiste($email)) {
            return "Ya existe una cuenta registrada con ese email.";
        }
        $hashedPassword = password_hash($contraseña, PASSWORD_BCRYPT);
        $stmt = $this->conn->prepare("INSERT INTO usuarios (nombre, email, contraseña) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $nombre, $email, $hashedPassword);
        if ($stmt->execute()) {
            $_SESSION['usuario_id'] = $this->conn->insert_id;
            $_SESSION['email'] = $email;
            $_SESSION['nombre'] = $nombre;
            return true;
        }
        return "Error al registrar el usuario.";
    }

    public function validarUsuario($email, $contraseña) {
        $stmt = $this->conn->prepare("SELECT id, nombre, contraseña FROM usuarios WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows == 1) {
            $user = $result->fetch_assoc();
            if (password_verify($contraseña, $user['contraseña'])) {
                $_SESSION['usuario_id'] = $user['id'];
                $_SESSION['email'] = $email;
                $_SESSION['nombre'] = $user['nombre'];
                return true;
            }
        }
        return false;
    }

    public function getRecursosTuristicos() {
        $query = "
            SELECT 
                rt.*, 
                (rt.limite_ocupacion - COALESCE(SUM(r.n_plazas), 0)) AS plazas_disponibles
            FROM recursos_turisticos rt
            LEFT JOIN reservas r ON rt.id = r.recurso_id AND r.anulada = FALSE
            GROUP BY rt.id
        ";
        $result = $this->conn->query($query);
        
        if ($result->num_rows > 0) {
            return $result->fetch_all(MYSQLI_ASSOC);
        }
        return [];
    }
    private function getPlazasDisponibles($recurso_id) {
        $query = "SELECT limite_ocupacion - COALESCE(SUM(n_plazas), 0) AS plazas_disponibles 
                  FROM recursos_turisticos 
                  LEFT JOIN reservas ON recursos_turisticos.id = reservas.recurso_id AND reservas.anulada = FALSE 
                  WHERE recursos_turisticos.id = ? 
                  GROUP BY recursos_turisticos.id";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $recurso_id);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        return $result ? $result['plazas_disponibles'] : 0;
    }
    public function createReserva($recurso_id, $n_plazas) {
        if (!isset($_SESSION['usuario_id'])) return "Error: Usuario no autenticado.";
        $usuario_id = $_SESSION['usuario_id'];

        $plazas_disponibles = $this->getPlazasDisponibles($recurso_id);
        if ($n_plazas > $plazas_disponibles) {
            return "Error: No hay suficientes plazas disponibles.";
        }

        $stmt = $this->conn->prepare("INSERT INTO reservas (usuario_id, recurso_id, n_plazas) VALUES (?, ?, ?)");
        $stmt->bind_param("iii", $usuario_id, $recurso_id, $n_plazas);

        if ($stmt->execute()) {
            $reserva_id = $this->conn->insert_id;
            $stmt = $this->conn->prepare("INSERT INTO pagos (reserva_id, cantidad) SELECT ?, precio * ? FROM recursos_turisticos WHERE id = ?");
            $stmt->bind_param("iii", $reserva_id, $n_plazas, $recurso_id);
            if ($stmt->execute()) return "Reserva creada con éxito.";
        }
        return "Error al crear la reserva: " . $this->conn->error;
    }
    public function getReservasUsuario() {
        if (!isset($_SESSION['usuario_id'])) return "Error: Usuario no autenticado.";
        $usuario_id = $_SESSION['usuario_id'];

        $stmt = $this->conn->prepare("SELECT r.id, rt.nombre, r.n_plazas, (r.n_plazas * rt.precio) AS costo_total FROM reservas r JOIN recursos_turisticos rt ON r.recurso_id = rt.id WHERE r.usuario_id = ? AND r.anulada = FALSE");
        $stmt->bind_param("i", $usuario_id);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function anularReserva($reserva_id) {
        $stmt = $this->conn->prepare("UPDATE reservas SET anulada = TRUE WHERE id = ?");
        $stmt->bind_param("i", $reserva_id);
        return $stmt->execute();
    }
}


$manager = new DataManager();
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (isset($_POST["crear_usuario"])) {
        $respuesta = $manager->createUser($_POST["nombre"], $_POST["email"], $_POST["contraseña"]);
        if ($respuesta !== true) {
            $mensaje_registro = $respuesta;
        }
    } elseif (isset($_POST["iniciar_sesion"])) {
        $login_exitoso = $manager->validarUsuario($_POST["email"], $_POST["contraseña"]);
        if (!$login_exitoso) {
            $mensaje_login = "Credenciales incorrectas. Por favor, intenta nuevamente.";
        }
    } elseif (isset($_POST["reservar_recurso"])) {
        $mensaje_reserva = $manager->createReserva($_POST["recurso_id"], $_POST["n_plazas"]);
        $id_recurso_afectado = $_POST["recurso_id"];
    } elseif (isset($_POST["ver_reservas"])) {
        $reservas = $manager->getReservasUsuario();
        if ($reservas === "Error: Usuario no autenticado.") {
            $mensaje_reservas_usuario = $reservas;
        } elseif (is_array($reservas) && empty($reservas)) {
            $mensaje_reservas_usuario = "Aún no has realizado ninguna reserva.";
        }
    } elseif (isset($_POST["anular_reserva"])) {
        $manager->anularReserva($_POST["reserva_id"]);
    } elseif (isset($_POST["logout"])) {
        session_destroy();
        header("Location: " . $_SERVER['PHP_SELF']);
        exit;
    }
}
?>
<!DOCTYPE HTML>

<html lang="es">
<head>
    <meta charset="UTF-8" />
    <title>Mieres: reservas</title>
    <link rel="icon" href="../multimedia/imagenes/favicon.ico">


    <meta name="author" content="Daniel Suárez de la roza"/>
    <meta name="description" content="descripción del documento"/>
    <meta name="keywords" content="Mieres, reservas"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

    <link rel="stylesheet" type="text/css" href="../estilo/estilo.css" />
    <link rel="stylesheet" type="text/css" href="../estilo/layout.css" />
</head>

<body>
    <main>
        <header>
            <h1><a href="../index.html">Mieres</a></h1>
            <nav>
                <a href="../index.html">Inicio</a>
                <a href="../gastronomia.html">Gastronomia</a>
                <a href="../rutas.html">Rutas</a>
                <a href="../meteorologia.html">Meteorología</a>
                <a href="../juego.html">Juego</a>
                <a href="reservas.php" class="activo">Reservas</a>
                <a href="../ayuda.html" >Ayuda</a>
            </nav>
        </header>
        
        <p>Estás en: Reservas</p>

        <section>
            <h2>Reservas de Recursos Turísticos</h2>
            <?php if (!isset($_SESSION['usuario_id'])): ?>
                <h3>Iniciar Sesión</h3>
                <form method="POST" action="#">
                    <label>Email:</label>
                    <input type="email" name="email" required>
                    <label>Contraseña:</label>
                    <input type="password" name="contraseña" required>
                    <button type="submit" name="iniciar_sesion">Entrar</button>
                </form>
                <?php if (!empty($mensaje_login)): ?>
                    <p><?= htmlspecialchars($mensaje_login) ?></p>
                <?php endif; ?>

                <h3>Registrar Usuario</h3>
                <form method="POST" action="#">
                    <label>Nombre:</label>
                    <input type="text" name="nombre" required>
                    <label>Email:</label>
                    <input type="email" name="email" required>
                    <label>Contraseña:</label>
                    <input type="password" name="contraseña" required>
                    <button type="submit" name="crear_usuario">Registrar</button>
                </form>
                <?php if (!empty($mensaje_registro)): ?>
                    <p><?= htmlspecialchars($mensaje_registro) ?></p>
                <?php endif; ?>
            <?php else: ?>
                <p>Bienvenido, <?php echo htmlspecialchars($_SESSION['nombre']); ?></p>
                <form method="POST" style="display:inline">
                    <button type="submit" name="logout">Cerrar sesión</button>
                </form>
            <?php endif; ?>
            <h3>Recursos Turísticos Disponibles</h3>
            <ul>
                <?php
                    $recursos = $manager->getRecursosTuristicos();
                    foreach ($recursos as $recurso): ?>
                        <li><article>
                            <h4><?= htmlspecialchars($recurso['nombre']) ?></h4>
                            <p><?= htmlspecialchars($recurso['descripcion']) ?></p>
                            <p>Precio: <?= $recurso['precio'] ?>€</p>
                            <p>Fecha: <?= $recurso['fecha_inicio'] ?> - <?= $recurso['fecha_fin'] ?></p>
                            <p>Plazas disponibles: <?= $recurso['plazas_disponibles'] ?></p>
                            <?php if (isset($_SESSION['usuario_id'])): ?>
                                <form method="POST" action="#">
                                    <input type="hidden" name="recurso_id" value="<?= $recurso['id'] ?>">
                                    <label>Número de plazas:</label>
                                    <input type="number" name="n_plazas" min="1" required>
                                    <button type="submit" name="reservar_recurso">Reservar</button>
                                </form>
                            <?php else: ?>
                                <p>Inicia sesión para reservar.</p>
                            <?php endif; ?>
                            <?php if (isset($mensaje_reserva) && $id_recurso_afectado == $recurso['id']): ?>
                                <p><?= $mensaje_reserva ?></p>
                            <?php endif; ?>
                        </article></li>
                <?php endforeach; ?>
            </ul>
        </section>
        <aside>
        <h2>Ver reservas</h2>
        <?php if (isset($_SESSION['usuario_id'])): ?>
            <form method="POST" action="#">
                <button type="submit" name="ver_reservas">Ver Reservas</button>
            </form>
            <?php
            if (isset($mensaje_reservas_usuario)) {
                echo "<p>$mensaje_reservas_usuario</p>";
            } elseif (!empty($reservas)) {
                foreach ($reservas as $reserva) {
                    echo "<article>";
                    echo "<p>Recurso: {$reserva['nombre']}</p>";
                    echo "<p>Plazas reservadas: {$reserva['n_plazas']}</p>";
                    echo "<p>Importe total: {$reserva['costo_total']}€</p>";
                    echo "<form method='POST' action='#'>";
                    echo "<input type='hidden' name='reserva_id' value='{$reserva['id']}'>";
                    echo "<button type='submit' name='anular_reserva'>Anular</button>";
                    echo "</form>";
                    echo "</article>";
                }
            }
            ?>
        <?php else: ?>
            <p>Inicia sesión para ver tus reservas.</p>
        <?php endif; ?>
        </aside>
    </main>
</body>
</html>