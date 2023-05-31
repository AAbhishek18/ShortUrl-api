const urlModel = require("../models/urlModel");
//const validUrl = require('valid-url')
const shortid = require("shortid");
const redis = require("redis");
const { promisify } = require("util");

const redisClient = redis.createClient(
  19320,
  "redis-19320.c264.ap-south-1-1.ec2.cloud.redislabs.com",

  { no_ready_check: true }
);
redisClient.auth("35zXXWrSnq5xQyBtcnFGXO7xPUU2653f", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis...");
});

//Connection setup for redis
// The promisify function is a utility function in Node.js 
//that allows you to convert a callback-based function to a Promise-based function.
const SET_ASYNC = promisify(redisClient.SET).bind(redisClient); 
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

// validation checking function

const isValid = function (value) {
  if (typeof value === "undeurlFound" || value === "null") return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  return true;
};
const isValidRequestBody = function (requestBody) {
  return Object.keys(requestBody).length > 0;
};

//post/url/shorten

const urlShortner = async function (req, res) {
  try {
    //long url validation from client side
    let data = req.body;
    if (!isValidRequestBody(data)) {
      return res.status(400).send({ status: false, msg: "pls provide lonUrl" });
    } else {
      //if long url is valid then check in database
      let longUrl = req.body.longUrl;
      if (!longUrl) {
        return res
          .status(400)
          .send({ status: false, msg: "pls provide long url" });
      }
      if (!longUrl.includes("//")) {
        return res
          .status(400)
          .send({ status: false, message: "Enter valid url" });
      }
      //s
      const urlParts = longUrl.split("//");
      const scheme = urlParts[0];
      const uri = urlParts[1];

      //let shortenedUrlDtails
      if (!uri.includes(".")) {
        res.status(400).send({ status: false, message: "Invalid Url " });
      }
      if (
        !(
          (scheme == "http:" || scheme == "https:") &&
          urlParts[0].trim().length &&
          urlParts[1].trim()
        )
      ) {
        return res
          .status(400)
          .send({ status: false, msg: "pls provide valid long url link" });
      }
      // long url getting that is already exist in cache (Redis)
      let cachedlinkdata = await GET_ASYNC(`${req.body.longUrl}`);
      if (cachedlinkdata) {
        let change = JSON.parse(cachedlinkdata);
        return res.status(201).send({ status: true, data: change });
      }
      // long url getting that is already exist in database
      let urlFound = await urlModel
        .findOne({ longUrl: longUrl })
        .select({ createdAt: 0, updatedAt: 0, __v: 0, _id: 0 });

      //set the data in redis
      if (urlFound) {
        await SET_ASYNC(`${req.body.longUrl}`, JSON.stringify(urlFound));
        return res.status(200).send({ status: true, data: urlFound });
      } else {
        //create a short url
        const baseUrl = "http://localhost:3000";
        let urlCode = shortid.generate().toLowerCase();
        let shortUrl = baseUrl + "/" + urlCode;
        let urls = { longUrl, shortUrl, urlCode }; // object

        await urlModel.create(urls); //save data in database

        // save data in redis
        let createdUrl = await urlModel
          .findOne({ urlCode: urlCode })
          .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 });
        await SET_ASYNC(`${req.params.urlCode}`, JSON.stringify(createdUrl)); //coverting json object to string
        return res.status(201).send({ status: true,message:"Shorten URL Generated", data: createdUrl });
      }
    }
  } catch (error) {
    //catch error
    return res.status(500).send({
      status: false,
      error: error.message,
    });
  }
};

//GET /:urlCode

const getUrl = async function (req, res) {
  try {
    let urlCode = req.params.urlCode; //get url code from client side

    //check  url code is valid or not from client side
    if (!isValid(urlCode)) {
      return res
        .status(400)
        .send({ status: false, messege: "Please Use A Valid Link" });
    } else {
      let cacheddata = await GET_ASYNC(`${req.params.urlCode}`); //get data from redis
      if (cacheddata) {
        let changetype = JSON.parse(cacheddata); //coverting string to json object
        return res.status(200).redirect(changetype.longUrl);
      }
      //url code getting from database
      let foundUrl = await urlModel.findOne({ urlCode: urlCode });
      if (foundUrl) {
        await SET_ASYNC(`${req.params.urlCode}`, JSON.stringify(foundUrl)); //coverting json object to string and save in redis
        return res.status(200).redirect(foundUrl.longUrl); //redirect to long url
      } else {
        res.status(404).send({ status: false, messege: "invalid urlCode" });
      }
    }
  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};
//exporting function
module.exports = { urlShortner, getUrl };
