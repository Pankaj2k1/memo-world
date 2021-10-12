require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require("path");
const joi = require("joi");
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const multer = require('multer');
const User = require('./models/user');
const Memory = require('./models/memory');

const app = express();

const DB="mongodb+srv://admin-pankaj:Pg01062001@cluster0.ktsqd.mongodb.net/userDB";
//GITHUBBBBB
//database= username=admin-pankaj
//                  password=Pg01062001
// display "wrong id or password try again" when wrong data  //USE FLASH
// display invalid username or password when invalid data      //USE FLASH
// IMPROVE css+looks(all pages)
//use oAuth to get google button
//use joi to validate memo-form data
//put delete button on (my memories) page cards
//check if async await can be used or not to load cards(all PAGES )
//my-memories loading early before code running

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "Memories Fun app",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public/images/memory-images'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage })

mongoose.connect(DB, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    // useFindAndModify: false,
    useUnifiedTopology: true
  }).then(() => console.log('Connection to DB established'));

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login", { message: "Invalid Username or Password ! Try Again !" });
    //FLASH
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", function (req, res) {

    let JoiSchema = joi.object({
        username: joi.string().min(5).max(30).required(),
        password: joi.string().min(5).max(15).required(),
    }).options({ abortEarly: false });

    let result = JoiSchema.validate(req.body);
    if (result.error) {
        res.redirect("/register");
        console.log(result.error.details[0].message);
        //FLASH
    }
    else {
        User.register({ username: result.value.username }, result.value.password, function (err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            }
            else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/memories");
                });
            }
        });
    }
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    passport.authenticate("local", { failureRedirect: '/login', failureFlash: true })(req, res, function () {
        res.redirect("/memories");
    });
});

//     req.login(user, function (err) {
//         if (err) {
//             console.log(err);
//             res.redirect("/login");
//             //FLASH
//         } else {
//             res.redirect("/memories");
//         }
//     });

app.get("/memories", function (req, res) {

    if (req.isAuthenticated()) {
        Memory.find({ "message": { $ne: null } }, function (err, foundMemos) {
            if (err) {
                console.log(err);
            } else {
                if (foundMemos) {
                    res.render("memories", { userWithMemories: foundMemos, headingMemo: "Welcome to Memo-World" });
                }
            }
        })
    }
    else {
        res.redirect("/login");
    }
});


app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.get("/submit", function (req, res) {
    res.render("submit");
})

app.post("/submitmemo", upload.single('memo-image'), function (req, res) {
 
    let JoiSchema = joi.object({
        creator: joi.string().min(3).max(20).required(),
        title: joi.string().min(4).max(40),
        message: joi.string().min(10).max(80)
    });
    
    let result = JoiSchema.validate(req.body);
    if (result.error) {
        res.redirect("/submit");
        console.log(result + "      User Error=" + result.error.details[0].message);
        //FLASH
    }
    else {
        result.save(function (err) {
            if (err) {
                res.send(err);
            } else {
                User.findById(req.user.id, function (err, foundUser) {
                    foundUser.userMemory.push(req.body);
                    foundUser.save(function () {
                        res.redirect("/memories");
                    });
                });
            }
        });
    }

    // const newMemo = new Memory({
    //     creator: req.body.creator,
    //     title: req.body.title,
    //     message: req.body.memory,
    // });

    // newMemo.save(function (err) {
    //     if (err) {
    //         res.send(err);
    //     } else {
    //         User.findById(req.user.id, function (err, foundUser) {
    //             foundUser.userMemory.push(newMemo);
    //             foundUser.save(function () {
    //                 res.redirect("/memories");
    //             });
    //         });
    //     }
    // });
});


app.get("/memories/my-memories", function (req, res) {
    let userMemories = [];
    let headingText="";
    User.findById(req.user.id, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            const memoryIds = foundUser.userMemory;
            console.log("user memory IDS=" + memoryIds);

            if (memoryIds.length == 0) {
                headingText="No Memories Saved :(";
                //display no memory found, give create option 
            } else {
                headingText="My Memories";
                memoryIds.forEach((memoId) => {
                    Memory.findById(memoId, function (err, result) {                  //loop
                        userMemories.push(result);
                        console.log("UserMemories in loop=" + userMemories);
                    });
                });
            }
        }
    });
    console.log("UserMemories=" + userMemories);
    res.render("memories", { userWithMemories: userMemories, headingMemo: headingText });
    
});

app.listen(3000, function () {
    console.log("Server started on port 3000");
});

