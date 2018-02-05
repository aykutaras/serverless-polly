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

//const AWS = require("aws-sdk");
//
//exports.handler = (event, context, callback) => {
//    const docClient = new AWS.DynamoDB.DocumentClient();
//    const params = {
//        TableName: "aaras-polly",
//        Item: {
//            "id": getRandomInt(9999999).toString(),
//            "voice": event.voice,
//            "text": event.text,
//            "status": false
//        }
//    };
//    
//    docClient.put(params, function(err, data) {
//        if (err) {
//            callback("Unable to read item. Error JSON:" + JSON.stringify(err, null, 2), null);
//        } else {
//            var response = {
//                "statusCode": 200,
//                "body": {"postId": params.Item.id},
//                "isBase64Encoded": false
//            };
//            
//            callback(null, response);
//        }
//    });
//    
//    publishToSns(params.Item.id);
//};
//
//function getRandomInt(max) {
//  return Math.floor(Math.random() * Math.floor(max));
//}
//
//function publishToSns(postId) {
//    const sns = new AWS.SNS();
//    
//    const params = {
//        "TopicArn": "arn:aws:sns:eu-west-1:052915121878:aaras-polly",
//        "Message": postId
//    }
//    sns.publish(params, function (err, data) {
//        console.log(err);
//        console.log(data);
//    });
//}
