var path = require('path'),
    cwd  = process.cwd();
  
module.exports = {
    Caspa: {
        Info: {
            name: 'General UI Caspa config',
            description: 'fine tune all configuration',
        },
        Branding: {
            Info: {
                name: 'Branding',
                description: 'Application info',
            },
            name: 'MBC Playout {mlt edition}',
            description: 'A simple Playout server built with magic and love',
        },
        MediaDB: {
            Info: {
                name: 'Database',
                description: 'Authentication params',
            },
            dbName: "mediadb",
            dbHost: "localhost",
            dbPort: 27017,
        },
        Dirs: {
            Info: {
                name: 'Directories',
                description: 'All directories configurables in app',
            },
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
            Info: {
                name: 'Others',
                description: 'Any other configuration',
            },
            timezone: 'UTC',
        },
    },
    Mosto: {
        Info: {
            name: 'General UI Mosto config',
            description: 'fine tune all configuration ',
        },
        Branding: {
            Info: {
                name: 'Branding',
                description: 'Application info',
            },
            name: 'MBC Mosto',
            description: 'MBC Playout\'s playlist juggler',
        },
    },
    Common: {
        Info: {
            name: 'General UI Common config',
            description: 'Fine tune all configuration',
        },
        Branding: {
            Info: {
                name: 'Branding',
                description: 'Application info',
            },
            name: 'MBC Common',
            description: 'Common code for mbc-playout and mbc-mosto',
        },
    },
}
