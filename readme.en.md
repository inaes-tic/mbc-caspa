# MBC Caspa #

Caspa is [CRUD](http://en.wikipedia.org/wiki/Create,_read,_update_and_delete)
application built with with Backbone.js, Twitter Bootstrap, Node.js,
Express, Knockout, FFMPEG, MLT, Redis and MongoDB.

The application allows you to:

* Browse through a list of medias stored on your hard drive
* Add, update, and delete medias
* Make medias playlists
* Schedule through a calendar playlists

it is heavily based on [Node Cellar](http://nodecellar.coenraets.org) by @coenraets

# License #

AGPL v3.

# requirements #

+ gettext

```shell
   apt-get install gettext
```

+ npm

```shell
   apt-get install npm
```
+ node > 0.8

```shell
   apt-get install nodejs
```

+ mongodb

```shell
   apt-get install mongodb
```

+ redis

```shell
   apt-get install redis-server
```

+ ffmpeg
```shell
   apt-get install ffmpeg
```

+ alltoogethernow

```shell
   sudo apt-get install gettext npm nodejs mongodb redis-server ffmpeg
```

# Installing #

```shell
   git clone http://github.com/inaes-tic/mbc-caspa
   cd mbc-caspa
   make
```
cloning this module and runing make should install all required submodules,
npm install, and get a server working on http://localhost:3000


