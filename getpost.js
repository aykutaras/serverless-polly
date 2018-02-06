import AWS from "aws-sdk";

// eslint-disable-next-line import/prefer-default-export
export const main = async (event, context, callback) => {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const postId = event.postId;
    const params = {
        TableName: process.env.tableName
    };

    if (postId !== '*') {
        params.Key = {
            "id": postId
        };
        
        let data = await docClient.get(params).promise();
        var response = {
            "statusCode": 200,
            "body": [data.Item],
            "isBase64Encoded": false
        };

        callback(null, response);
    } else {
        let scanData = await docClient.scan(params).promise();
        var response = {
            "statusCode": 200,
            "body": scanData.Items,
            "isBase64Encoded": false
        };

        callback(null, response);
    }
};
