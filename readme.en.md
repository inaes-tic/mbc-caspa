# MBC Playout {mlt edition} #

"Media Cellar" is a sample CRUD application built with with Backbone.js,
Twitter Bootstrap, Node.js, Express, Now.js, FFMPEG, MLT and MongoDB.

The application allows you to browse through a list of medias stored on your
hard drive. you can as well as add, update, and delete medias.

it's heavily based on [Node Cellar](http://nodecellar.coenraets.org) by @coenraets

But we release the changes as AGPL v3.

# requirements #

+ npm

```shell
   apt-get install npm  
```
+ node > 0.6.4

```shell
   apt-get install nodejs
```

# Installing #

cloning this module and runing make should install all required submodules,
npm install, and get a server working on http://localhost:3000

```shell
   git clone http://github.com/inaes-tic/mbc-playout
   cd mbc-playout
   make
```
