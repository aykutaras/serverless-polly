// eslint-disable-next-line import/prefer-default-export
export const hello = (event, context, callback) => {
  const p = new Promise((resolve) => {
    resolve('success');
  });

  p.then(() => callback(null, {
      message: 'Go Serverless Webpack (Ecma Script) v1.0! First module!',
      event,
    }))
    .catch(e => callback(e));
};

//const AWS = require("aws-sdk");
//
//exports.handler = (event, context, callback) => {
//    const docClient = new AWS.DynamoDB.DocumentClient();
//    const postId = event.postId;
//    const params = {
//        TableName: "aaras-polly"
//    };
//
//    if (postId !== '*') {
//        params.Key = {
//            "id": postId
//        };
//        
//        docClient.get(params, function(err, data) {
//            if (err) {
//                callback("Unable to read item. Error JSON:" + JSON.stringify(err, null, 2), null);
//            } else {
//                var response = {
//                    "statusCode": 200,
//                    "body": [data.Item],
//                    "isBase64Encoded": false
//                };
//                
//                callback(null, response);
//            }
//        });
//    } else {
//        docClient.scan(params, function(err, data) {
//            if (err) {
//                callback("Unable to read item. Error JSON:" + JSON.stringify(err, null, 2), null);
//            } else {
//                var response = {
//                    "statusCode": 200,
//                    "body": data.Items,
//                    "isBase64Encoded": false
//                };
//                
//                callback(null, response);
//            }
//        });
//    }
//};
