const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const moment = require("moment");
const fileType = require("file-type");
const sha1 = require("sha1");

exports.handler = function(event, context, callback) {
  console.log(event["test-only"]);
  if (event.token != process.env.slashCommandToken && !event["test-only"]) {
    return context.fail("Unauthorized request");
  }
  let base64String;

  if (typeof(event.text) !== 'undefined' && event.text !== null && event.text !== "") {
    require("request")(
      {
        url: event.text,
        encoding: "binary"
      },
      function(e, r, b) {
        if (typeof r === "undefined") {
          return context.fail("failed to parse image url");
        }
        var type = r.headers["content-type"];
        var prefix = "data:" + type + ";base64,";
        var base64 = new Buffer(b, "binary").toString("base64");
        var dataURI = prefix + base64;
        if (dataURI.length > 0) {
          console.log(dataURI.length, "dataURI length");
        }
        base64String = base64;
        // let request = event.body;
        // //get the request
        // let base64String = request.base64String;
        // pass to buffer
        let buffer = new Buffer(base64String, "base64");
        console.log(buffer);
        let fileMime = fileType(buffer);
        // check if it's a file?
        if (fileMime === null) {
          return context.fail("The string is not a file type");
        }

        let file = getFile(fileMime, buffer);
        console.log(file);
        let params = file.params;
        s3.putObject(params, function(err, data) {
          if (err) {
            callback(err + " was returned as error");
          }
          context.succeed("File URL: " + file.uploadFile.full_path);
        });
      }
    );
  }
  else {
    s3.getObject({
      Key: 'potatoes-french-mourning-funny-162971.jpeg',
      Bucket: 'slack-command-file-bucket',
    }, function(err, data) {
      if (err) {
        return context.fail('falied to retrieve object');
      }
      else {
        context.succeed(data.ETag);
      }
    })
  }
};

function getFile(fileMime, buffer) {
  let fileExt = fileMime.ext;
  let hash = sha1(new Buffer(new Date().toString()));
  //let now = moment().format("YYYY-MM-DD HH:mm:ss");

  let filePath = hash + "/";
  let fileName = Date.now() + "." + fileExt;
  let fileFullName = filePath + fileName;
  let fileFullPath =
    "https://s3-us-west-2.amazonaws.com/slack-command-file-bucket/" + fileFullName;

  let params = {
    Bucket: "slack-command-file-bucket",
    Key: fileFullName,
    Body: buffer,
    ACL: "public-read"
  };

  let uploadFile = {
    size: buffer.toString("ascii").length,
    type: fileMime.mime,
    name: fileName,
    full_path: fileFullPath
  };

  return {
    params: params,
    uploadFile: uploadFile
  };
}
