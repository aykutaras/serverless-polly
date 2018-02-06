import AWS from "aws-sdk"

// eslint-disable-next-line import/prefer-default-export
export const main = async (event, context, cb) => {
    const record = event.Records[0];
    if (record.eventName !== "INSERT") {
        callback(null, {"success": false});
    }
    
    const post = record.dynamodb.NewImage;
    await polly(post.id.S, post.voice.S, post.text.S);
    callback(null, {"success": true});
};

async function polly(postId, voice, text) {
    const polly = new AWS.Polly();
    const params = {
        OutputFormat: "mp3",
        Text: text,
        TextType: "text",
        VoiceId: voice
    };
    
    const data = await polly.synthesizeSpeech(params).promise();
    const stream = data.AudioStream;
    await upload(postId, stream);
}

async function upload(postId, stream) {
    const s3 = new AWS.S3();
    
    const params = {
        Bucket: process.env.audioBucket,
        Key: postId + ".mp3",
        Body: stream,
        ACL: 'public-read'
    };
    
    console.log('uploading');
    await s3.upload(params).promise();   
    await activate(postId);
}

async function activate(postId) {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: process.env.tableName,
        Key: {
            "id": postId
        },
        UpdateExpression: "set #st = :s, #u = :u",
        ExpressionAttributeNames:{
            "#st": "status",
            "#u": "url"
        },
        ExpressionAttributeValues:{
            ":s":true,
            ":u": "https://s3-" + process.env.region + ".amazonaws.com/" + process.env.audioBucket + "/" + postId + ".mp3"
        },
        ReturnValues:"UPDATED_NEW"
    };
    
    console.log('updating');
    await docClient.update(params).promise();
}
