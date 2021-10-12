const mongoose = require("mongoose");
const user = require("./user");

const memorySchema = new mongoose.Schema({
    creator: {
        type: String,
        unique: true,
        min: 5,
        max: 30
    },
    title: {
        type: String,
        min: 5,
        max: 30
    },
    message:  {
        type: String,
        minlength:5,
        maxlength:80
      },
    // imageName: String 
    userData: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
});


module.exports = mongoose.model("Memory", memorySchema);

// creator: joi.string().min(5).max(30),
//         title: joi.string().min(5).max(30),
//         message: joi.string().min(5).max(80),