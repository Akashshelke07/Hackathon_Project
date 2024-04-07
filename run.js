var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var compiler = require("compilex");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
//const fs = require("fs");
dotenv.config()
// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function runpt(prompt) {
  // For text-only input, use the gemini-pro model
  const model = genAI.getGenerativeModel({ model: "gemini-pro"});
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return text;
}

var app = express();
app.use(bodyParser.json());
app.use("/codemirror",express.static(__dirname + "/codemirror"))
app.use(express.static(__dirname + '/public'));
var options = {stats:true};
compiler.init(options);
app.get("/",function(req,res){
    res.sendFile(__dirname + "/index.html");
});

app.post("/compilecode",async function(req,res){
    var code = req.body.code;
    var input = req.body.input;
    var envData = {OS:"windows",cmd:"g++",options:{timeout:10000}};
    if (input!=""){
        var prompt = (code + `\n given that the input of to the code was ${input} , find and keep track of all the data structures in the code such as arrays or linked list. go through the code line by line and keep track of all changes to the data structures throughout the execution of the code. return a response strictly in this JSON format:
        {"put name of data structure here":[array of all the values in the data structure]}
        if some values are absent , fill in 'null' in place of missing values, and you are NOT allowed to use any special characters in your response other that the ones present in the format.`);
    }
    else{
        var prompt = (code + `\n find and keep track of all the data structures in the code such as arrays or linked list. go through the code line by line and keep track of all changes to the data structures throughout the execution of the code. return a response strictly in this JSON format:

        {"put name of data structure here":[array of all the values in the data structure]}
        if some values are absent , fill in 'null' in place of missing values, and you are NOT allowed to use any special characters in your response other that the ones present in the format.`);
    }
    var response = await runpt(prompt);
    if (input){
        compiler.compileCPPWithInput(envData,code,input, async function(data){
            data.resp = await response;
            console.log(data.resp);
            if(data.output) {
                res.send(data);
            }
            else{
                res.send({output:"Error- Invalid input"})
            }
        });
    }
    else{
        compiler.compileCPP(envData,code,async function(data){
            data.resp = await response;
            if(data.output) {
                res.send(data);
            }
            else{
                console.log(data)
                res.send({output:"Error"})
            }
        });
    }
});

app.post("/askgemini", async function(req,res){
     var qry = req.body.ask
     console.log(qry)
     rr = await runpt(qry)
     output = {
        response:rr
     }
     res.send(output)
 })

 app.post("/codehelp", async function(req,res){
    var code = req.body.code
    rr = await runpt(code+`\n what is wrong with this code`)
    output = {
       response:rr
    }
    res.send(output)
})


app.get("/fullStat",function(req,res){
    compiler.fullStat(function(data){
        res.send(data);
    });
});

app.listen(8000);

compiler.flush(function(){
    console.log("temp files flushed");
});