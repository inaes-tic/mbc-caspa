# MBC Caspa #

Caspa es una applicación construida bajo el modelo [CRUD](http://es.wikipedia.org/wiki/CRUD)
con Backbone.js, Twitter Bootstrap, Node.js, Express, Knockout,
FFMPEG, MLT, Redis y MongoDB.

La applicación permite:

* Navegar una lista de medios almacenada en su disco rigido
* Agregar, Editar y Borrrar medios
* Crear playlists con medios
* Programar playlists a traves del calendario

El codigo esta basado en el trabajo de [Node Cellar](http://nodecellar.coenraets.org) por @coenraets

# Licencia #

AGPL v3.

# requerimientos #

+ gettext

```shell
   apt-get install gettext
```

+ node > 0.8

```shell
   apt-get install nodejs
```

Ver en [joyent wiki](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)

+ npm

```shell
   apt-get install npm
```

+ mongodb

```shell
   apt-get install mongodb
```
Si queres soporte para mongodb Text Search necesitas mongodb = 2.4 y
activarlo en el archivo de configuración:

```
echo "setParameter = textSearchEnabled=true" >> /etc/mongodb.conf
```

+ redis

```shell
   apt-get install redis-server
```

+ ffmpeg
```shell
   apt-get install ffmpeg
```

+ todo junto

```shell
   sudo apt-get install gettext npm nodejs mongodb redis-server ffmpeg
```

# Instalación #

```shell
   git clone http://github.com/inaes-tic/mbc-caspa
   cd mbc-caspa
   make
```
Clonando este proyecto y corriendo make deberia instalar todo lo necesario
para correr la aplicación en http://localhost:3000
