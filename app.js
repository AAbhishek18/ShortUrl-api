
const express = require('express');
const bodyParser = require('body-parser');
const route = require('./routes/route')
const mongoose = require('mongoose');
require('dotenv').config();//to use the .env file
const app = express();

app.use(bodyParser.json());//parse json data. This is a middleware. It will be executed before the route is executed.
app.use(bodyParser.urlencoded({ extended: true }));// the urlencoded method within body-parser tells body-parser to extract
                                                   // data from the <form> element and add them to the body property in the 
                                                   //request object.

mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true//useNewUrlParser is a property of the object that we pass to the connect method.
})//connect to the database.The connect method returns a promise. So we can use then and catch to handle the promise.

    .then(() => console.log("MongoDb is connected"))//if the promise is resolved then this will be executed.
    .catch(err => console.log(err))//if the promise is rejected then this will be executed.

    

app.use('/', route);//use the route.js file for all the routes. This is a middleware. 
app.all("*", (req, res) => {
  res.status(404).json({ status: false, message: "API not found" });
});
app.listen(process.env.PORT || 3000, function () {
    console.log('Express app running on port' + (process.env.PORT || 3000))
});//listen to the port 3000
