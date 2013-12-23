var _           = require('underscore'),
    everyauth   = require ('everyauth'),
    bcrypt      = require('bcrypt'),
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
            var promise
            , errors = [];
            if (!login) errors.push('Missing login.');
            if (!password) errors.push('Missing password.');
            if (errors.length) return errors;

            var user = self.collection.findWhere ({login: login});
            if (!user) {
                errors.push('User with login ' + login + ' does not exist.');
                return errors;
            }

            promise = this.Promise();
            bcrypt.compare(password, user.get('hash'), function (err, didSucceed) {
                if (err) {
                    return promise.fail(err);
                    errors.push('Wrong password.');
                    return promise.fulfill(errors);
                }
                if (didSucceed) {
                    return promise.fulfill(user.toJSON());
                }
                errors.push('Wrong password.');
                return promise.fulfill(errors);
            });

            return promise;
        })
        .getRegisterPath('/register')
        .postRegisterPath('/register')
        .registerView('login.jade')
        .registerLocals({
            title: 'Register',
            name: 'Register',
        })
        .validateRegistration( function (attrs, errors) {
            var login = attrs.login;
            var user = self.collection.findWhere ({login: login});
            if (user) errors.push('Login already taken');
            return errors;
        })
        .registerUser( function (attrs) {
            var password = attrs.password;

            delete attrs['password']; // Don't store password
            var salt = bcrypt.genSaltSync(10);
            attrs.hash = bcrypt.hashSync(password, salt);

            var user = self.collection.create (attrs, {wait: true});
            if (!user)
                return user;

            return user.toJSON();
        })

        .loginSuccessRedirect('/')
        .registerSuccessRedirect('/');
};

