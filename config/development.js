var path = require('path'),
    cwd  = process.cwd();
  
module.exports = {
    Caspa: {
        name: 'MBC Playout {mlt edition}',
        description: 'A simple Playout server built with magic and love',
        MediaDB: {
            dbName: "mediadb",
            dbHost: "localhost",
            dbPort: 27017,
        },
        Dirs: {
            pub : path.join(cwd, 'public'),
            views : path.join(cwd, 'views') ,
            styles : path.join(cwd, 'styles'),
            models : path.join(cwd, 'models'),
            vendor : path.join(cwd, 'vendor'),
            uploads: path.join(cwd, 'public', 'uploads', 'incoming'),
            screenshots: path.join(cwd, 'public','sc'),
            scrape : path.join(cwd, 'videos'),
        },
        Others: {
            timezone: 'UTC',
        }
    }
}
