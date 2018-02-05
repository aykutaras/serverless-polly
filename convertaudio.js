// eslint-disable-next-line import/prefer-default-export
export const hello = (event, context, cb) => {
  const p = new Promise((resolve) => {
    resolve('success');
  });
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless Webpack (Ecma Script) v1.0! Second module!',
      input: event,
    }),
  };
  p
    .then(() => cb(null, response))
    .catch(e => cb(e));
};

//const AWS = require('aws-sdk');
//
//exports.handler = (event, context, callback) => {
//    const record = event.Records[0];
//    if (record.eventName !== "INSERT") {
//        callback(null, {"success": false});
//    }
//    
//    const post = record.dynamodb.NewImage;
//    polly(post.id.S, post.voice.S, post.text.S);
//    callback(null, {"success": true});
//};
//
//function polly(postId, voice, text) {
//    var polly = new AWS.Polly();
//    var params = {
//        OutputFormat: "mp3",
//        Text: text,
//        TextType: "text",
//        VoiceId: voice
//    };
//    
//    polly.synthesizeSpeech(params, function(err, data) {
//        if (err) {
//            console.log(err, err.stack); // an error occurred
//        } else {
//            console.log(data);           // successful response
//            const stream = data.AudioStream;
//            upload(postId, stream);
//        }
//    /*
//    data = {
//    AudioStream: <Binary String>, 
//    ContentType: "audio/mpeg", 
//    RequestCharacters: 37
//    }
//    */
//    });
//}
//
//function upload(postId, stream) {
//    const s3 = new AWS.S3();
//    
//    var params = {
//        Bucket: 'aaras-test-mp3',
//        Key: postId + ".mp3",
//        Body: stream,
//        ACL: 'public-read'
//    };
//    
//    s3.upload(params, function(err, data) {
//        console.log(err, data);
//    });
//    
//    activate(postId);
//}
//
//function activate(postId) {
//    const docClient = new AWS.DynamoDB.DocumentClient();
//    const params = {
//        TableName: "aaras-polly",
//        Key: {
//            "id": postId
//        },
//        UpdateExpression: "set #st = :s, #u = :u",
//        ExpressionAttributeNames:{
//            "#st": "status",
//            "#u": "url"
//        },
//        ExpressionAttributeValues:{
//            ":s":true,
//            ":u": "https://s3-eu-west-1.amazonaws.com/aaras-test-mp3/" + postId + ".mp3"
//        },
//        ReturnValues:"UPDATED_NEW"
//    };
//    
//    docClient.update(params, function(err, data) {
//        console.log(err, data);
//    });
//}
