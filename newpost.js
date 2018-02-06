import AWS from "aws-sdk"
import uuid from "uuid/v4"

// eslint-disable-next-line import/prefer-default-export
export const main = async (event, context, callback) => {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: process.env.tableName,
        Item: {
            "id": uuid(),
            "voice": event.voice,
            "text": event.text,
            "status": false
        }
    };
    
    let putResponse = await docClient.put(params).promise();
    var response = {
        "statusCode": 200,
        "body": {"postId": params.Item.id},
        "isBase64Encoded": false
    };

    callback(null, response);
};
