require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("CONNECTED TO DATABASE!");
};


module.exports=connectDB;