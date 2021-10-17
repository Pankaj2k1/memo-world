if(process.env.NODE_ENV !=="production"){
    require('dotenv').config();
}
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
const flash = require('connect-flash');
const User = require('./models/user');
const Memory = require('./models/memory');

const app = express();

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SECRET || 'hey there',
    resave: false,
    saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

const { storage } = require('./utils/cloudinary')
const upload = multer({ storage });

const DB=process.env.DB_HOST;

mongoose.connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connection to DB established'));

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login", { error: req.flash('error') });
});

app.get("/register", function (req, res) {
    res.render("register", { error: req.flash('error') });
});

app.post("/register", async function (req, res) {
    let err = '';
    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) {
        err = 'All the fields must be filled to proceed'
    } else if (password.length < 5) {
        err = 'Sorry the password must be at least 5 characters long'
    } else if (username.length < 3) {
        err = 'Sorry the username must be at least 3 characters long'
    } else {
        const alreadyUser = await User.findOne({ username: username });
        if (alreadyUser) {
            err = 'Username already Used !'
        } else {
            const registerUser = await User.register({ username: username }, password);
            req.login(registerUser, errr => {
                if (errr) {
                    err = "Sorry,Something went wrong ! Please Try again !";
                    req.flash('error',errr);
                    res.redirect("/register");
                } else {
                    passport.authenticate("local")(req, res, function () {
                        res.redirect("/memories");
                    });
                }
            });
        }
    }
    if (err != '') {
        req.flash('error', err);
        res.redirect('/register');
    }
});

// let JoiSchema = joi.object({
//     username: joi.string().min(5).max(30).required(),
//     password: joi.string().min(5).max(15).required(),
// }).options({ abortEarly: false });

// let result = JoiSchema.validate(req.body);
// if (result.error) {
//     console.log(result.error.message);
//     res.redirect("/register");
// }
// else {
// User.register({ username: result.value.username }, result.value.password, function (err, user) {
//     if (err) {
//         console.log(err);
//         res.redirect("/register");
//     }
//     else {
//         passport.authenticate("local")(req, res, function () {
//             res.redirect("/memories");
//         });
//     }
// });
// }

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    passport.authenticate("local", { failureRedirect: '/login', failureFlash: true })(req, res, function () {
        res.redirect("/memories");
    });
});

app.get("/memories", function (req, res) {

    if (req.isAuthenticated()) {
        Memory.find({ "message": { $ne: null } }, function (err, foundMemos) {
            if (err) {
                req.flash('error', err.message + " Try Again !");
                res.redirect("/login");
            } else {
                if (foundMemos) {
                    res.render("memories", { userWithMemories: foundMemos, headingMemo: "Welcome to Memo-World" });
                }
            }
        })
    }
    else {
        req.flash('error', 'You are not Logged-In !')
        res.redirect("/login");
    }
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

const checkAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.flash('error', 'You are not Logged-in!');
        res.redirect('/login');
    }
}

app.get("/submit", checkAuthenticated, function (req, res) {
    res.render("submit", { error: req.flash('error') });
})

app.post("/submitmemo", upload.single('memo-image'),checkAuthenticated, function (req, res) {
    const userMemo = {
        creator: req.body.creator,
        title: req.body.title,
        message: req.body.memory
    };
    let JoiSchema = joi.object({
        creator: joi.string().min(3).max(30).required(),
        title: joi.string().min(4).max(40).required(),
        message: joi.string().min(10).max(160).required()
    });

    let result = JoiSchema.validate(userMemo);
    if (result.error) {
        req.flash('error', result.error.details[0].message)
        res.redirect("/submit");
    }
    else {
        if (req.file) {
            userMemo.imagePath = req.file.path;
        }
        const newMemo = new Memory(userMemo);
        newMemo.save(function (err) {
            if (err) {
                res.send(err);
            } else {
                User.findById(req.user.id, function (err, foundUser) {
                    foundUser.userMemory.push(newMemo);
                    foundUser.save(function () {
                        res.redirect("/memories");
                    });
                });
            }
        });
    }
});
//     const newMemo = new Memory({
//         creator: req.body.creator,
//         title: req.body.title,
//         message: req.body.memory
//     });
//     if (req.file) {
//         newMemo.imagePath = req.file.path;
//     }
//     newMemo.save(function(err){
//         if (err) {
//             console.log(err);
//             res.redirect("/submit");
//         } else {
//             User.findById(req.user.id, function (err, foundUser) {
//                 foundUser.userMemory.push(newMemo);
//                 foundUser.save(function () {
//                     res.redirect("/memories");
//                 });
//             });
//             console.log(newMemo);
//         }
//     });
// });

async function fetchMemories(ids) {
    try {
        let arr = [];
        for (let userID of ids) {
            let foundMemory = await Memory.find({ "_id": userID });
            arr.push(foundMemory[0]);
        }
        return arr;
    }
    catch (e) {
        console.log(e);
        res.redirect("/memories/my-memories");
    }
}
app.get("/memories/my-memories", checkAuthenticated, async function (req, res) {
    let headingText = "";
    let userMemories = [];
    try {
        const foundUser = await User.findById(req.user.id);
        const memoryIds = foundUser.userMemory;

        if (memoryIds.length == 0) {
            headingText = "No Memories Saved";
        } else {
            headingText = "My Memories";
            userMemories = await fetchMemories(memoryIds);
        }
        res.render("memories", { userWithMemories: userMemories, headingMemo: headingText });
    }
    catch (e) {
        req.flash('error','Something went Wrong ! Please Try Again !');
        res.redirect("/login");
    }
});

app.post("/delete",checkAuthenticated, async function (req, res) {
    try {
        const deleteMemoId = req.body.deleteMemo;
        const UserDeleteMemory = await Memory.findByIdAndDelete(deleteMemoId);

        User.findById(req.user.id, function (err, foundUser) {
            let id = foundUser.userMemory.indexOf(deleteMemoId);
            const idDeleted = foundUser.userMemory.splice(id, 1);
            foundUser.save();
            res.redirect("/memories/my-memories");
        });

    }
    catch (e) {
        req.flash('error','Something went Wrong ! Please Try Again !');
        res.redirect("/login");
    }
});

app.get('/memories/search',checkAuthenticated,function(req,res){
    res.redirect('/memories');
})

app.post("/memories/search",checkAuthenticated, async function (req, res) {
    let searchedMemories = [];
    let i = 0;
    const allMemories = await Memory.find();
    
    allMemories.forEach((memo) => {
        if (memo.title.toLowerCase().includes(req.body.searchData.toLowerCase())) {
            searchedMemories.push(memo);
            ++i;
        }
    })
    let heading = "";
    if (i == 0) {  heading = "No results Found"; }
    else { heading = i + " Results found"; }

    res.render("memories", { userWithMemories: searchedMemories, headingMemo: heading });
});

app.listen(process.env.PORT || 3000, function () {
    console.log("Server started on port 3000");
});
