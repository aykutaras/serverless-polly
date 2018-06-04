# AWS Serverless and NLP Part 1 - Text-to-Speech with Lambda and Polly

## Prologue

*Read this in [Türkçe](README.tr.md).*

This is the first part of our NLP with AWS series. We are going to develop a web application without using any server or container but only AWS Serverless services. We are going to use [Polly](https://aws.amazon.com/polly/), [Lambda](https://aws.amazon.com/lambda/), [API Gateway](https://aws.amazon.com/api-gateway/), [S3](https://aws.amazon.com/s3/) ve [DynamoDB](https://aws.amazon.com/dynamodb/) and Javascript ES7 as backend language.

Serverless-Polly is a "Text-to-Speech" application runs entirely under AWS Serverless tools. It gets a text from a static web UI and saves it to DynamoDB through a Lambda function (newpost). After record has been saved, it is sent to a new Lambda function (convertaudio) via DynamoDB Streams. This record then sent to Polly to get a speech audio stream and that stream saved to an S3 bucket for later use. 3rd lambda function (getpost) is used for getting these processed mp3 files to same static web UI.

For the deployment of serviecs and web application, we are going to follow "[Infrastructure as Code](https://en.wikipedia.org/wiki/Infrastructure_as_Code)" principles. [Amazon CloudFormation](https://aws.amazon.com/cloudformation/) and [Serverless Framework](https://serverless.com/) will help to make sure all these services deployed correctly.

Before we get to the details, it is really easy to install and run the project. You just need to do:

1. Create an AWS account and create a user that has AccessKey and Secret
2. Node.js v8.11.1
3. Open a terminal window and type
4. `npm install serverless -g`
5. `npm install`
6. `serverless deploy`
7. Update API Gateway endpoint inside `static/scripts.js`
8. Upload `static/` folder to newly created S3 bucket via `aws s3 sync --acl public-read static/ s3://S3BUCKETNAME`

![InstallationGif](https://i.imgur.com/iBRROtd.gif)

Live application example:

![PollyUI](http://gifly.com/media_gifly/o/N/M/i/b/oNMi.gif)

## Service Diagram
All services that we have used in this project are AWS's `as a service` solutions. All the infrastructure are handled by AWS but of course architecture and usage's of these services needs to be the responsibility of the developer. You can find the service diagram of application below:

![Service Diagram](https://raw.githubusercontent.com/AWSTalks/serverless-polly/master/ServerlessPolly.png)