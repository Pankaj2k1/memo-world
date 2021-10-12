const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const Memory=require('./memory');

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    userMemory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Memory"
        }
    ]
});


userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);


