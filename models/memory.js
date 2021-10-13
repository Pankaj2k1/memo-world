const mongoose = require("mongoose");
const user = require("./user");

const memorySchema = new mongoose.Schema({
    creator: String,
    title: String,
    message: String,
    imagePath: String,
    userData: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
});

module.exports = mongoose.model("Memory", memorySchema);
