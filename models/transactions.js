const mongoose=require("mongoose");
const transactionSchema=mongoose.Schema({
id:{
type:Number,
require:true
},
title:{
type:String,
require:true
},
price:{
type:Number,
require:true
},
description:{
type:String,
require:true
},
category:{
type:String,
require:true
},
image:{
type:String,
require:true
},
sold:{
type:Boolean,
require:true
},
dateOfSale:{
type:Date,
require:true
},
})
const Transaction=mongoose.model("Transaction",transactionSchema);
module.exports=Transaction;
