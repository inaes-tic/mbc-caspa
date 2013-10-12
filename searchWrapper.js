module.exports = function(middleware) {
    var _ = require('underscore');

    // cache up all this, it's just syntactical
    var collection = middleware.collection;
    var options = middleware.options;
    var db = middleware.db;
    var colname = middleware.colname;

    var ret = function(req, res, next) {
        var crud = {
            read: function() {
                if (req.model._id) {
                    middleware(req, res, next);
                } else {
                    var data = {
                        query: {},
                        page: 0,
                        per_page: 0,
                        total_pages: null,
                        total_entries: null,
                        sort_by: { $natural: -1 },
                        order: '',
                        fields: {},
                        criteria: {},
                        distinct: '',
                        max_items: 100
                    };
                    var query = {};
                    var expressions = [];

                    if ('data' in req.options) {
                        data  = _.defaults(req.options.data, data);
                    }

                    query = _.omit(data.query, ['text', 'criteria']);

                    // validations
                    if(options.search) {
                        if(data.fields) {
                            _.map(data.fields, function(field) {
                                var ok = _.contains(options.search.facets, field);
                                if (!ok) {
                                    res.end({'error':'Facet field is not valid - read ' + field});
                                }
                            });
                        }
                        _.map(_.keys(query), function(key) {
                            var ok = _.contains(options.search.facets, key);
                            if (!ok) {
                                res.end({'error':'query field is not valid - read ' + key});
                            }
                        });

                        if(_.has(options.search, 'criteria') && _.has(data.query, 'criteria')) {
                            var criteria_keys   = _.keys(data.query.criteria);
                            var criteria_values = _.values(data.query.criteria);
                            var options_keys    = _.keys(options.search.criteria);
                            var options_values  = _.values(options.search.criteria);

                            if (!(_.difference(criteria_keys, options_keys))) {
                                res.end({'error':'criteria is not valid - read ' + criteria_keys });
                            }

                            if(!(_.every(criteria_values, function(val) { return _.isArray(val); }))) {
                                res.end({'error':'criteria is not an array - read '});
                            }
                        }

                        data.max_items = options.search.max_facets;
                    }

                    //Creating criterias from collection search config and request data
                    if(_.has(data.query, 'criteria')) {
                        var criteria = _.reduce(data.query.criteria, function(memo, criteria, key) {
                            var replace_str = "%value%";
                            var options_key = options.search.criteria[key];
                            _.forEach(criteria, function(param) {
                                options_key = options_key.replace(replace_str, param);
                            });
                            return _.extend(memo, JSON.parse(options_key));
                        }, {});
                        _.extend(query, criteria);
                    }

                    //XXX maybe this is not bests option for all cases
                    //check if value is Numeric to change type for search
                    query = _.object( _.keys(query), _.map(query, function(val) {
                        var is_num = !isNaN(parseFloat(val)) && isFinite(val)
                        return (is_num) ? Number(val) : val;
                    }));

                    //Generating prjection to show in mongo way {field1: 1, field2: 1}
                    var fields = _.object(data.fields, _.map(data.fields, function(i) { return 1; }));

                    var sort = data.sort_by;
                    if(data.sort_by && data.order) {
                        sort[data.sort_by] = data.order;
                    }

                    var limit = data.per_page || data.max_items;
                    var skip = data.page * data.per_page;

                    var getParameterObj = { getParameter:1, textSearchEnabled:1 };
                    db.admin.command(getParameterObj, function(err, result) {
                        if(err) res.end({'error':'An error has occurred on read ' + err});
                        if(!result.documents[0].textSearchEnabled && _.has(data.query,'text')) {
                            _.forEach(options.search.fulltext, function(field) {
                                var obj= {};
                                obj[field] = new RegExp(data.query.text, "i");
                                expressions.push(obj);
                            });
                            _.extend(query, {$or: expressions})
                        }

                        if(data.distinct) {
                            // aggregation for distinct sorted by occurrence
                            var group_id = "$"+data.distinct
                            var aggregation = [
                                { $match: query },
                                { $group: {
                                    _id: group_id,
                                    qty:{ $sum: 1 },
                                }},
                                { $sort:
                                    { qty: -1 }
                                },
                                { $limit: limit },
                                { $skip: skip },
                            ];
                            collection.aggregate(aggregation, function(err,results) {
                                if(err) res.end({'error':'An error has occurred on distinct - read ' + err});
                                var items = _.pluck(results,'_id');
                                res.end([ { total_entries: items.length }, items]);
                            });
                        }

                        if(result.documents[0].textSearchEnabled && _.has(data.query, 'text')) {
                            db.command({
                                "text": colname,
                                search: data.query.text,
                                limit: limit,
                                filter: query,
                                project: fields
                            },
                            {},
                            function(err, result) {
                                if(err) res.end({'error':'An error has occurred on fulltext: ' + data.query.text + ' q:' +query + ' limit:' + limit });
                                var items = _.pluck(result.results, 'obj');
                                res.end([ { total_entries: items.length }, items]);
                            });
                        } else {
                            var q = collection.find(query, fields).limit(limit).skip(skip).sort(sort);
                            q.count(function(err, total) {
                                if (err) {
                                    res.end({'error':'An error has occurred on count - read ' + err});
                                } else {
                                    q.toArray(function (err, items) {
                                        if (err) {
                                            res.end({'error':'An error has occurred on read ' + err});
                                        } else {
                                            res.end([ { total_entries: total }, items]);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
        };

        if (!crud[req.method]) return middleware(req, res, next);
        crud[req.method]();
    }

    return ret;
};
