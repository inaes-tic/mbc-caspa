# MBC Playout {mlt edition} #

"Media Cellar" es una applicación simple construida bajo el modelo
[[CRUD|http://es.wikipedia.org/wiki/CRUD]] con Backbone.js, Twitter
Bootstrap, Node.js, Express, Now.js, FFMPEG, MLT y MongoDB.

La applicación permite navegar una lista de medios almacenada en su disco
rigido, y organizarlo como playlist para que se consuma por el servidor de
playout Melted.

El codigo esta basado en el trabajo de [Node Cellar](http://nodecellar.coenraets.org) por @coenraets

# Licencia #

AGPL v3.

# requerimientos #

+ npm
```shell
   apt-get install npm  
```
+ node > 0.6.4
```shell
   apt-get install nodejs
```
# Instalación #

```shell
   git clone http://github.com/inaes-tic/mbc-playout
   cd mbc-playout
   make
```
tendria que levantar la app en http://localhost:3000
