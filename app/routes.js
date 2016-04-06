module.exports = function(app, passport) {


    //Home Page
    //If user is logged in, pass in message to change navbar buttons accordingly
    //If not, then pass in proper message
    app.get('/', function(req, res) {
        var topUsers = require('../queries/topUsers');  
        var topRecipes = require('../queries/topRecipes');
        var async = require("async");

        async.parallel([
                function(callback){
                    var userdata = topUsers();
                    userdata.exec(function(err, users){
                        if(err){
                            callback(err)
                        }else{
                            callback(null, users);
                        }
                    })
                },
                function(callback){
                var recipedata = topRecipes();
                recipedata.exec(function(err, users){
                    if(err){
                        callback(err)
                    }else{
                        callback(null, users);
                    }
                })
            },
            ],
            function(err, results){
                if(err){
                    console.log('error')
                }else{
                    console.log(results)
                    if (req.isAuthenticated())
                        res.render('index.ejs', { user: req.user ,
                            userResults: results[0],
                            recipeResults: results[1],
                            message: 'loggedin' } ); // load the index.ejs file
                    else{
                        res.render('index.ejs', { user: req.user , 
                            userResults: results[0],
                            recipeResults: results[1],
                            message: 'notloggedin' } );
                }
            }
        }
        )
        
    });


    //Login
    //If already logged in, redirect automatically to homepage
    app.get('/login', function(req, res) {
        console.log(req.user)
        if (req.isAuthenticated())
            res.redirect('/');
        else
            res.render('login.ejs', { message: req.flash('loginMessage') });
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', 
        failureRedirect : '/login', 
        failureFlash : true 
    }));


    app.get('/signup', function(req, res) {

        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    app.get('/about', function(req, res) {

        if (req.isAuthenticated())
            res.render('about.ejs', { message: 'loggedin'} );
        else
            res.render('about.ejs', { message: 'notloggedin'} );

    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/profile', 
        failureRedirect : '/signup',
        failureFlash : true 
    }));


    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });


    app.get('/profile', isLoggedIn, function(req, res) {
        //console.log("request: " + Object.keys(req));
        var Recipe = require('../app/models/recipes');
        var userID = req.user._id;

                Recipe.find({'author_id' : userID}, function(err, wanted_recipes) {

                    if(err)
                        return done(err);

                    if(!wanted_recipes){

                        res.render('profile.ejs', { user : req.user});
                    }
                    else {

                        res.render('profile.ejs', { user : req.user , recipes : wanted_recipes});
                    }

                });
    });

    app.get('/editprofile', isLoggedIn, function(req, res) {
        res.render('editprofile.ejs', {user : req.user });
    });

    app.post('/editprofile', function (req, res) {

        var User = require('../app/models/user');

        User.findOne({ 'email' :  req.user.email }, function(err, user) {
            var current = req.user ;
            var body = req.body;
            console.log(body);
            if(body.firstname!="")
                current.firstname = body.firstname;
            if(body.lastname!="")
                current.lastname = body.lastname;
            if(body.email!="")
                current.email=body.email;
            if(body.phonenumber!="")
                current.phonenumber=body.phonenumber;
            if(body.streetaddress!="")
                current.streetaddress=body.streetaddress;
            if(body.city!="")
                current.city=body.city;
            if(body.province!="")
                current.province=body.province;
            if(body.postalcode!="")
                current.postalcode=body.postalcode;
            if(body.country!="")
                current.country=body.country;
            if(body.cuisine1!="")
                current.fav_cuisine[0] = body.cuisine1;
            if(body.cuisine2!="")
                current.fav_cuisine[1] = body.cuisine2;
            if(body.cuisine3!="")
                current.fav_cuisine[2]=body.cuisine3;

            current.markModified('fav_cuisine');

            current.save(function(err) {
                if (err)
                    console.log('didnt save');
            });

        });

        setTimeout(function(){ res.redirect('/profile'); }, 200);

        
    });

    app.get('/changepass', isLoggedIn, function(req, res) {
        res.render('changepass.ejs', { user : req.user , message: "" });
    });

    app.get('/changepass2', isLoggedIn, function(req, res) {
        res.render('changepass.ejs', { user : req.user  , message: "Current password is incorrect" });
    });

    app.post('/changepass', function (req, res) {

        var User = require('../app/models/user');

        var already = false;

        User.findOne({ 'email' :  req.user.email }, function(err, user) {

            var current = req.user ;
            var body = req.body;

            if (!user.fb_id){

                if (!user.validPassword(body.oldpassword))

                    already = true;

            } else {

                current.password = req.user.generateHash(body.newpassword);

                req.user.save(function(err) {
                    if (err)
                    throw err;
                });
            }

            if(already==false){
                setTimeout(function(){res.redirect('/profile');}, 200);
            } else
                res.redirect('/changepass2');
        });
    });

    app.get('/userprofile/:email', function(req, res) {

        var user = req.params.email;

        var User = require('../app/models/user');

        var Recipe = require('../app/models/recipes');

        User.findOne({ 'email' :  user }, function(err, wanted_user) {

            if (err)
                return done(err);

            if (!wanted_user)
                return res.status(404).send('Sorry, user not found');
            
            else{

                var userID = wanted_user._id;

                Recipe.find({'author_id' : userID}, function(err, wanted_recipes) {

                    if(err)
                        return done(err);

                    if(!wanted_recipes){

                        if (req.isAuthenticated())
                            res.render('userprofile.ejs', { user: wanted_user , message: 'loggedin' , recipes : 'no' } );
                        else
                            res.render('userprofile.ejs', { user: wanted_user , message: 'notloggedin' , recipes : 'no' } );
                    }
                    else {
                        console.log(wanted_recipes);
                        if (req.isAuthenticated())
                            res.render('userprofile.ejs', { user: wanted_user , message: 'loggedin' , recipes: wanted_recipes} );
                        else
                            res.render('userprofile.ejs', { user: wanted_user , message: 'notloggedin', recipes: wanted_recipes} );
                    }

                });
            }
        });
    });

    app.get('/recipe/:_id', function(req, res) {
        var User = require('../app/models/user');
        var Recipe = require('../app/models/recipes');
        var recipe_id = req.params._id;
        var user = req.user;
        var searchRecipe = require('../queries/searchRecipe');
        var findRecipe = require('../queries/findRecipe');
        var findAuthor = require('../queries/findRecipeAuthor');
        var searchRecipe = require('../queries/searchRecipe');
        var async = require('async')

        async.parallel([
            //recommendations based on user preferences
            function(callback){
                if(req.user){
                if(req.user.fav_cuisine==0){
                    callback(null, null)
                }
                else{
                    console.log(typeof(req.user.fav_cuisine))
                var recipedata = searchRecipe(req.user.fav_cuisine);
                recipedata.exec(function(err, recipes){
                    if(err){
                        callback(err)
                    }else{
                        callback(null, recipes);
                    }
                })
                } 
                }
                else{callback(null,null)}  
            },
            //find the recipe
            function(callback){
                var recipedata = findRecipe(recipe_id);
                recipedata.exec(function(err, recipe){
                    if(err){
                        callback(err)
                    }else{
                        callback(null, recipe);
                    }
                })
            },
            //find author of recipe
            function(callback){
                var author = findAuthor(recipe_id)
                author.exec(function(err, author){
                    if(err){
                        callback(err)
                    }else{
                        callback(null, author.author_id);
                    }
                })
            }

            ],
            function(err, results){
                if(err){
                    console.log('err')
                }
                else{
                    if (req.isAuthenticated())
                        res.render('recipes.ejs', 
                            { user: results[2] , 
                                message: 'loggedin', 
                                recipe: results[1],
                                recommended: results[0] } );
                    else{
                        res.render('recipes.ejs', 
                            { user: results[2] , 
                                message: 'notloggedin', 
                                recipe: results[1],
                                recommended: results[0] }
                                 )

                    }
                }
            }
        )
    });

    app.get('/newrecipe', function(req, res) {
        var User = require('../app/models/user');
        var Recipe = require('../app/models/recipes');
        if (req.isAuthenticated()) 
            res.render('newrecipe.ejs', { message: 'loggedin' });
        else 
            res.render('newrecipe.ejs', { message: 'notloggedin' });
    });

    app.post('/newrecipe', function(req, res) {
        var Recipe = require('../app/models/recipes');
        var Increment = require('../app/models/identitycounters')
        Recipe.findOne({ 'userID' : req.user._id }, function(err, recipe) {

            if (err)
                return done(err);

            Increment.findOne({ 'val' : 0 }, function(err, increment) {
                var newRecipe = new Recipe();
                newRecipe._id = increment.current;
                increment.current = increment.current + 1;
                increment.save();
                newRecipe.author_id = req.user._id;
                newRecipe.name = req.body.name;
                newRecipe.cuisine = req.body.cuisine;
                newRecipe.category = req.body.category;
                newRecipe.cost = req.body.cost;
                newRecipe.description = req.body.description;

                var ingredients = req.body.ingredients;
                newRecipe.ingredients = ingredients.split(",");
        
                newRecipe.save(function(err) {
                    if (err)
                        throw err;
                    res.render('newrecipe.ejs', { message: 'done'});
                });
            });
                
        });
    });

    app.get('/orders', function(req, res) {
        var User = require('../app/models/user');
        var Recipe = require('../app/models/recipes');
        var Order = require('../app/models/order');

        if (req.isAuthenticated()){
            var userID = req.user._id;
                Order.find({'user_id' : userID}).populate('recipe_id').exec(function(err, recipeResults) { 
                    res.render('orderhistory.ejs', { message: 'loggedin', recipeResults : recipeResults });
                });
        } else {
            res.render('orderhistory.ejs', { message: 'notloggedin' });
        }
    });

    app.post('/addToOrder/:recipe', function(req, res) {
        var User = require('../app/models/user');
        var Recipe = require('../app/models/recipes');
        var Order = require('../app/models/order');

        if (req.isAuthenticated()) {
            var recipeID = req.params.recipe;
            var userID = req.user._id;
            var newOrder = new Order();
            newOrder.user_id = userID;
            newOrder.recipe_id = recipeID;
            newOrder.save(function(err) {
                if (err)
                    throw err;
                Order.find({'user_id' : userID}).populate('recipe_id').exec(function(err, recipeResults) { 
                    var totalCost = 0;
                    for (var i=0;i<recipeResults.length;i++) {
                        totalCost = totalCost + recipeResults[i].recipe_id.cost;
                    }
                    res.render('orderhistory.ejs', { message: 'loggedin', recipeResults : recipeResults, 'totalCost' : totalCost });
                });
            });
        }
        else  {
            res.render('orderhistory.ejs', { message: 'notloggedinOrder' });
        }
    });


    app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect : '/profile',
            failureRedirect : '/'
        }));
        
    // Reviewing
    app.get('/review/:recipe', function(req, res) {
        
        var recipeID = req.params.recipe;
        
        var Recipe = require('../app/models/recipes');

        Recipe.findOne({ '_id' :  recipeID }, function(err, recipe) {

            if (err)
                return done(err);

            if (!recipe)
                return res.status(404).send('Sorry, recipe not found');
            else{
                if (req.isAuthenticated())
                    res.render('review.ejs', { recipe: recipe, message:''} );
                else
                    res.render('about.ejs', { message: 'notloggedin'} );
            }
        });  
    })
    
    app.post('/review/:recipe', function(req, res){

        var recipeID = req.params.recipe;
        var Recipe = require('../app/models/recipes');
console.log("Rating: " + req.body.rating);
        Recipe.findOne({ '_id' : recipeID }, function(err, recipe) {

            if (!req.isAuthenticated() || req.user == null) {
                res.redirect('about.ejs', { message: 'notloggedin'} );
            } else if (err) {
                return res.status(404).send('Sorry, recipe not found');
            } else if (req.body.rating == 0 || req.body.details.length <= 0 || req.body.title.length <= 0) {
                res.render('review.ejs', { recipe: recipe, message: 'Please select a star rating' });
            } 
            
            var userID = req.user._id;
            
            var Review = require('../app/models/reviews');
    
            Review.findOne({ 'userID' : userID, 'recipeID' : recipeID}, function(err, review) {
           
                //check if recipe already exists
                if (review) {
                    res.render('review.ejs', { recipe: recipe, message: 'You have already submitted a review for this recipe' });
                }
                else {

                    // if there is no prior review
                    // create the review
                    var newReview = new Review();
            
                    newReview.type = 'Recipe';
                    newReview.recipeID = recipeID;
                    newReview.userID = userID;
                    newReview.score = req.body.rating;
                    newReview.title = req.body.title;
                    newReview.comment = req.body.details;
            
                    newReview.save(function(err) {
                        if (err)
                            res.render('review.ejs', { recipe: recipe, message: err });
                        res.render('review.ejs', { recipe: recipe, message: 'success' });
                    });
                }
            });
        });
    });
    
    // Retrieving reviews
    app.get('/:recipe/reviews/:lastID?', function(req, res) {
        
        var recipeID = req.params.recipe;
        var lastID = req.params.lastID;
        
        if (!lastID) {
            lastID = null;
        }
        console.log(recipeID +" " + lastID);
        var Recipe = require('../app/models/recipes');
        var User = require('../app/models/user');

        Recipe.findOne({ '_id' :  recipeID }, function(err, recipe) {

            if (err)
                return done(err);

            if (!recipe) {
                return res.status(404).send('Sorry, recipe not found');
            } else {
                
                // Found Recipe         
                // Now fetch reviews for recipe
                var reviewsAfterID = require('../queries/reviewsAfterID');  
                var async = require("async");
                
                async.parallel([
                        function(callback){
                            var reviewData = reviewsAfterID(recipeID, lastID);
                            reviewData.exec(function(err, reviews){
                                if(err){
                                    callback(err)
                                }else{
                                    callback(null, reviews);
                                }
                            })
                        }
                        // TODO QUERY and FETCH Rating stats as well
                    ],
                    function(err, results){
                                                
                        var reviewsToReturn;
                        
                        if (err) {
                            return res.status(404).send(err);
                        } else {
                            reviewsToReturn = results;
                        }
         
                        if (req.isAuthenticated()) {
                            return res.json(JSON.stringify(reviewsToReturn))
                        } else {
                            return res.json(JSON.stringify(reviewsToReturn))
                        }   
                    }
                )       
            }
        });  
    });

    app.get('/search', function(req, res){
        var query = req.param('query');
        var searchUser = require('../queries/searchUser');  
        var searchRecipe = require('../queries/searchRecipe');
        var async = require("async");
        //code adapted from 
        //http://www.kdelemme.com/2014/07/28/read-multiple-collections-mongodb-avoid-callback-hell/
        //http://justinklemm.com/node-js-async-tutorial/
        
        //query the different collections parallel to eachother
        async.parallel([
            //query Users collection
            function(callback){
                var userdata = searchUser(query);
                userdata.exec(function(err, users){
                    if(err){
                        callback(err)
                    }else{
                        callback(null, users);
                    }
                })
            },
            //query Recipes collection
            function(callback){
                var recipeData = searchRecipe(query);
                recipeData.exec(function(err, recipes){
                    if(err){
                        callback(err)
                    }else{
                        callback(null, recipes);
                    }
                })

            }
            ],
            //callback functionn that has user results in 0, and recipe results
            // in 1
            function(err, results){
                if(err){
                    console.log('error')
                }else{
                    console.log(results[0], results[1]);
                    if(query){
                        res.render('search.ejs', {
                            user: req.user,
                            userResults: results[0],
                            recipeResults: results[1]
                        })
                    }else{
                        res.render('search.ejs', {
                            user: req.user,
                            userResults: null,
                            recipeResults: null
                        })
                    }
                   
                }
            }

        );
    
    });

    
};

function isLoggedIn(req, res, next) {

    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}
