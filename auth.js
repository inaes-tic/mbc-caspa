var _           = require('underscore'),
    everyauth   = require ('everyauth'),
    mbc         = require('mbc-common'),
    Auth        = require("mbc-common/models/Auth"),
    collections = mbc.config.Common.Collections,
    logger      = mbc.logger().addLogger('caspa_auth');

var auth = module.exports = exports = function (backends) {
    var self = this;
    this.everyauth = everyauth;

    this.collection = new Auth.UserList();

    backends.register_sync (this.collection, 'user');
    this.collection.fetch();

    everyauth.debug = true;

    everyauth.everymodule.userPkey('_id');
    everyauth.everymodule
        .findUserById( function (id, callback) {
            var user = self.collection.get (id);
            if (user) {
                return callback(null, user.toJSON());
            }

            var err = "TypeError in reverse user mapping";
            logger.error ('error in auth: ' + err, id);
            return callback(err, null);
        });

    everyauth
        .password
        .loginWith('login')
        .getLoginPath('/login')
        .postLoginPath('/login')
        .loginView('login.jade')
        .loginLocals( function (req, res, done) {
            setTimeout( function () {
                done(null, {
                    title: 'Async login',
                    name: 'Login',
                });
            }, 200);
        })
        .authenticate( function (login, password) {
            var errors = [];
            logger.info ('authing', login, password);
            if (!login) errors.push('Missing login');
            if (!password) errors.push('Missing password');
            if (errors.length) return errors;
            var user = self.collection.findWhere ({login: login});
            logger.info ('auth ok: returning user id:', user, login);
            if (!user) return ['Login failed'];
            if (user.get('password') !== password) return ['Login failed'];
            return user.attributes;
        })

        .getRegisterPath('/register')
        .postRegisterPath('/register')
        .registerView('login.jade')
        .registerLocals({
            title: 'Register',
            name: 'Register',

        })
        .validateRegistration( function (newUserAttrs, errors) {
            var login = newUserAttrs.login;
            var user = self.collection.findWhere ({login: login});
            if (user) errors.push('Login already taken');
            return errors;
        })
        .registerUser( function (newUserAttrs) {
            var user =  self.collection.create (newUserAttrs);
            console.log ('user is: ', user);
            return user.toJSON();
        })

        .loginSuccessRedirect('/')
        .registerSuccessRedirect('/');
};

