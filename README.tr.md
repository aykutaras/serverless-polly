# AWS Serverless ve NLP Bölüm 1 - Lambda ve Polly ile Text-to-Speech

## Giriş

*Başka dilde oku: [English](README.md)*

AWS ile NLP çözümleri serimizin birincisinde Amazon'un [Polly](https://aws.amazon.com/polly/), [Lambda](https://aws.amazon.com/lambda/), [API Gateway](https://aws.amazon.com/api-gateway/), [S3](https://aws.amazon.com/s3/) ve [DynamoDB](https://aws.amazon.com/dynamodb/) araçlarını ve Javascript ES7 kullanarak hiç bir sunucu kurulumu gerektirmeden tamamen asenkron çalışan bir web uygulaması hazırlayacağız.

Serverless-Polly, AWS üzerinde sunucusuz olarak çalışabilen bir "Text-to-Speech" uygulamasıdır. Static bir web sayfası üzerinden aldığı metni Lambda yardımı ile DynamoDB veritabanına kaydeder (newpost). Daha sonra DynamoDB Streams sayesinde yeni eklenen kayıt başka bir Lambda fonksiyonuna (convertaudio) iletir. İletilen kayıt, belirtilen dil ve okuması istenen kişiye göre Polly servisine yollanıp bir s3 bucket'ına mp3 formatında muhafaza edilir. Kaydedilen ses dosyalarına yine aynı web uygulaması üzerinden erişim sağlanır (getpost).

Servislerin ve uygulamanın deployment süreçlerini de yine "[Infrastructure as Code](https://en.wikipedia.org/wiki/Infrastructure_as_Code)" prensiplerine bağlı kalarak script'ler ile hazırlayacağız. Burada yardımımıza [Amazon CloudFormation](https://aws.amazon.com/cloudformation/)  ve [Serverless Framework](https://serverless.com/) koşacak.

Yazının detaylarına inmeden çalışan uygulamayı görmek isterseniz yapmanız gereken şey oldukça basit:

1. AWS hesabı ve AccessKey ve Secret'a sahip bir user
2. Node.js v8.11.1
3. `npm install serverless -g`
4. `npm install`
5. `serverless deploy`
6. API Gateway endpoint'ini `static/scripts.js` dosyasına ekle
7. `static/` klasörünü oluşturulan static bucket'a yükle `aws s3 sync --acl public-read static/ s3://S3BUCKETNAME`

![InstallationGif](https://i.imgur.com/iBRROtd.gif)

## Servis Diagramı
Kullanılan servislerin tümü AWS tarafından sağlanan `as a service` çözümlerdir. Bu çözümlerin hazırlanan uygulamada nasıl yer alacağına karar vermekse tabi ki yazılımcıya kalıyor. Uygulamanın örnek servis diagramını aşağıda görebilirsiniz:

![Service Diagram](https://raw.githubusercontent.com/AWSTalks/serverless-polly/master/ServerlessPolly.png)

Sırayla kullanılan servisleri incelemek gerekirse:

### CloudFront
[Cloudfront](https://aws.amazon.com/cloudfront/) Amazon'un CDN cözümü. Bu servisi static web uygulamalarını kıtalar arası hızlı bir şekilde host edebilmek için kullanılır. S3 bucket'ları ile entegrasyonu sayesinde uygulamanın statik web sayfalasını ve ses dosyalarını CloudFront üzerinden yayınlanabilir. Detaylarına bu yazıda değinmeyeceğiz.

### S3 (Simple Storage Service)
[S3](https://aws.amazon.com/s3/) Amazon'un nesne depolama çözümü. Polly uygulamasında hem static web uygulamasını hem de Polly ile seslendirilmiş mp3 dosyalarını tutmak için kullanılıyor. S3 servisinin avantajı oldukça ucuz olması ve cloudfront ile entegrasyonu. Ayrıca ekstra bir sunucu maliyeti getirmeden static web uygulamalarını host ediyor olması ve uptime'ının %99.99 seviyelerinde olması en büyük artıları.

### Api Gateway
[Api Gateway](https://aws.amazon.com/api-gateway/), Amazon'un servislerin ve sunucuların HTTP üzerinden haberleşmesini sağlayan serverless çözümü. Klasik Api Gateway'lerden (Zuul, Spring Rest Controller, vs.) en büyük farkı herhangi bir sunucu gerektirmediği için kolaylıkla ayağa kaldırıp istediğiniz sistemleri dış dünyaya açabilmeniz.

Polly web uygulaması, statik bir SPA uygulaması olduğu için asıl logic amazon tarafında barınıyor. SPA uygulaması ajax ile Api Gateway'de bulunan iki tane endpoint'e erişerek gerekli işlemleri yapıyor.

`GET /GetPost` endpoint'i, daha önceden hazırlanmış Polly kayıtlarını listeler.

`POST /NewPost` endpoint'i, yeni eklenmesini istediğimiz metinlerin backend'e iletilmesini sağlar.

Api Gateway, bu iki endpoint'ten alınan isteklerin işlenebilmesi için Lambda fonksiyonlarına iletir.

### Lambda
[Lambda](https://aws.amazon.com/lambda/) Amazon'un FaaS (Function as a Service) çözümü. Herhangi bir sunucuya ihtiyaç duymadan, scalable, event-driven uygulamalar yazılmasına olanak sağlayan bir servis. Şu an Node.js (JavaScript), Python, Java (Java 8 destekliyor), C# (.NET Core) ve Go dilleri ile uygulamalar yazmayı destekliyor.

Polly uygulamasında, Javascript ile yazılmış 3 tane Lambda fonksiyonunu kullanacağız.

1. **GetPost Lambda:** Önceden işlenmiş olan kayıtları DynamoDB'den çekerek web sayfası üzerinde gösterimini sağlar.
2. **NewPost Lambda:** Yeni bir metin bilgisi alarak işlenmesi için DynamoDB veritabanına kaydeder.
3. **ConvertAudio Lambda:** DynamoDB'ye eklenen yeni metni Polly ile haberleşerek MP3'e çevirir ve S3'e kaydeder.

### DynamoDB
Yine serverless altyapısında barınan bir başka servis olan [DynamoDB](https://aws.amazon.com/dynamodb/) Amazon'un NoSQL çözümü. Aynı Lambda gibi auto-scale özelliği sayesinde gelen yüke göre donanım ihtiyaçlarını arka planda yükseltip alçaltabilen bir veritabanı olması en büyük avantajlarından. Ayrıca Streams özelliği sayesinde tablolarda yapılan değişiklikleri Lambda fonksiyonlarına event olarak iletebilir.

#### DynamoDB Streams
DynamoDB, Amazon'un diğer servisleri ile haberleşebilmesi için Streams isminde bir hizmet sunuyor. DynamoDB Streams sayesinde tablolarda yapılan her değişiklik (ekleme, silme veya düzenleme) bir message stream'e daha sonra işlenmek üzere iletilir. Daha sonra bu stream'leri ister kendi sunucularınız üzerinden isterseniz de Lambda gibi çözümlere event olarak ileterek kullanabilirsiniz.

Polly uygulamasında yeni eklenen her metin bir stream ile bir Lambda fonksiyonuna iletilir. Bu sayede uyglama asenkron bir yapıda çalışır (metnin mp3'e çevrilmesi beklenmez).

### Polly
Amazon'un metinlerin sesleştirilmesini sağlamak için sunduğu, yine serverless ekosisteminde bulunan çözümü. [Polly](https://aws.amazon.com/polly/) kullanıcı açısından oldukça basit bir arayüz sunuyor.

1. Metni gir
2. Seslendirmesini istediğin kişiyi seç (Bir çok dil için birden fazla ses sanatçısı bulunuyor)
3. Seslendirilmiş metni, AudioStream olarak geri al

## Uygulama
### Node.js
Bu yazı yazıldığı zaman AWS Lambda Node.js için v8.10 versiyonunu destekliyordu. Bu sebeple Javascript ile geliştirilen uygulamaların Node.js v8.11.1'e göre derlenmesine dikkat edilmesi gerekiyor. Javascript Webpack module yükleyicisi ve Babel compiler'ı bu konuda oldukça yardımcı oluyor. Eğer derlemeyi yaptığınız node sürümü v8.11.1 ise Javascript Babel ve Webpack sayesinde otomatik olarak bu versiyona göre kendisini derliyor.

#### Babel
Babel, javascript dünyasında her yeni gelen versiyonun tüm browserlarda ve node.js versiyonlarında çalışmamasından dolayı ortaya çıkmış bir compiler. Kısaca babel uygulamaları hangi javascript versiyonu ile yazarsanız yazın istediğiniz herhangi bir javascript sürümüne göre -kodu optimize ederek- derlenmesini sağlıyor.

Polly `.babelrc`

```
{
  "plugins": ["transform-runtime"],
  "presets": ["env"]
}
```

`.babelrc` dosyası babel'in javascript'i nasıl derleyeceğini belirliyor. Burada `presets` kısmındaki `env` değeri babel'in javascript'in en güncel versiyonuna göre işlem yapmasını sağlar.

#### WebPack
WebPack, modüler olarak geliştirilen Javascript kodlarının birbirleri ile iletişimini sağlıyor. Bunun yanında kodun küçültülmesi gibi özellikleri de kendi içinde barındırıyor. Bunun dışında javascript dosyalarının babel ile compile edilmesini de yine WebPack otomatize ediyor. WebPack dosyalar arasındaki ilişkileri belirleyip bunlara göre gereksinimleri birleştiriyor ve  babel ile compile edilmiş javascript dosyaları sunuyor.

WebPack'in modülleri düzgün tanıyabilmesi için `webpack.config.js` isminde bir dosya oluşturup nasıl çalışması gerektiğinin belirtilmesi gerekiyor.

Polly `webpack.config.js`

```
const path = require('path');
// eslint-disable-next-line import/no-unresolved
const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  externals: [nodeExternals()],
  module: {
    loaders: [{
      test: /\.js$/,
      loaders: ['babel-loader'],
      include: __dirname,
      exclude: /node_modules/,
    }],
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
};
```

Bu konfigürasyon dosyası, serverless framework ile ilgili gereksinimleri ekliyor, javascript dosyalarının babel ile compile edilmesi gerektiğini belirtiyor ve javascript dependency structure'ının commonjs kütüphanesi ile çözümlenmesini sağlıyor.
 
#### AWS Node.js SDK
Node.js ile Amazon servislerini kullanmak için Amazon'un Node.js SDK'sı oldukça büyük kolaylık sağlıyor. Amazon'un sunduğu tüm servisler için hem Javascript hem de Typescript'i destekliyor. Bir kaç örnek vermek gerekirse;

DynamoDB'den kayıtları okumak için:

```
const docClient = new AWS.DynamoDB.DocumentClient();
const params = { TableName: process.env.tableName };
let scanData = await docClient.scan(params).promise();
```

Polly ile metni ses verisine dönüştürmek için:

```
async function polly(postId, voice, text) {
    const polly = new AWS.Polly();
    const params = {
        OutputFormat: "mp3",
        Text: text,
        TextType: "text",
        VoiceId: voice
    };

    const data = await polly.synthesizeSpeech(params).promise();
    const stream = data.AudioStream; // Voice as an AudioStream
}
```

Oluşturulan ses verisini S3'e mp3 formatında yüklemek içinse:

```
async function upload(postId, stream) {
    const s3 = new AWS.S3();
    const params = {
        Bucket: process.env.audioBucket,
        Key: postId + ".mp3",
        Body: stream,
        ACL: 'public-read'
    };

    await s3.upload(params).promise();
}
```

AWS Node.js SDK hem callback hem de promise yapısını destekliyor. Burada promise yapısı sayesinde Javascript async await özelliğini kullanmaya olanak sağlıyor.

#### Yazılım Mimarisi
Polly uygulaması üç adet javascript dosyasından oluşuyor. Javascript ES7 async await mimarisini de kullanarak tamamen asenkron bir yapıda çalışmaktadır. Her bir js dosyası webpack ve babel yardımı ile compile oluyor ve üç adet lambda fonksiyonunu çalıştırmak için kullanılıyor.

`/static` klasörü içerisinde S3'e upload edilmek üzere SPA bir Web UI bulunmakta. Bu web uygulaması gelen request'i jquery kullanarak Api Gateway'e iletiyor ve response'a göre yeni kaydı bir tabloya ekliyor.

Burada dikkat edilmesi gereken bir nokta uygulama deploy edildikten sonra `script.js` dosyasının ilk satırındaki `var API_ENDPOINT = "https://APIURL/dev/"` kısmındaki APIURL yerine gerçek Api Gateway URL'inin yazılması.

**newpost.js** Seslendirilmek istenen metni işlenmesi için DynamoDB'ye kaydeden lambda fonksiyonu. AWS Node.js SDK'sının DynamoDB için `put` method'u bulunuyor bu method json formatında bir Item objesi alıp DynamoDB'ye kaydediyor. DynamoDB NoSQL bir veritabanı olduğu için `id` barındıran herhangi bir json objesini içerisine kaydedebiliyor. 

```
    const params = {
        TableName: process.env.tableName,
        Item: {
            "id": uuid(),
            "voice": event.voice,
            "text": event.text,
            "status": false
        }
    };
```
DynamoDB'ye kaydedilen verileri işleyebilmemiz için bize 4 adet parametre gerekli:

- `id` DynamoDB'deki PrimaryKey'imiz. DynamoDB bu key ile kendi sharding vs mekanizmalarını yönetiyor, aynı şekilde her bir kayıtın unique olmasını da bu değer sağlıyor.
- `voice` Polly'nin seslendirmeyi yaparken hangi kişiyi kullanacağını belirten değer. Yazdığımız metnin diline göre bir veya daha fazla kişi belirleyebiliyoruz.
- `text` Seslendirilmesini istediğimiz metin.
- `status` Seslendirme işlemi asenkron olduğu için bir kayıt ilk eklendiğinde henüz seslendirme işlemi tamamlanmamış oluyor. Bu flag seslendirmenin tamamlanıp tamamlanmadığını belirtiyor. Eğer seslendirme tamamlanmışsa `url` alanına mp3 dosyasının URL'i ekleniyor.

**getpost.js** DynamoDB'ye kaydettiğimiz verileri çekmek için kullanılan Lambda fonksiyonu. DynamoDB 2 çeşit query fonksiyonu bulunduruyor `scan` ve `get`. 

DynamoDB get operasyonu sadece primary key ve varsa sort key ile dataların çekilebilmesini sağlar. Bu sayede DynamoDB'den index'lenmiş datayı çok hızlı bir şekilde alınabilir.

DynamoDB scan operasyonu ise istediğiniz gibi bir arama kriteri belirlemenizi sağlar. Get'e göre dezavantajı ise tüm tabloyu tarayarak verileri bulması ve performans açısından oldukça yavaş olmasıdır.

**convertaudio.js** DynamoDB'ye eklediğimiz metinlerin Polly ile ses stream'lerine dönüştürüldüğü daha sonra da S3 bucket'ına atıldığı Lambda fonksiyonu.

Bu fonksiyonu sadece DynamoDB stream'lerini dinliyor. DynamoDB Streams, Lambda ile event yoluyla haberleşiyor ve yeni gelen kaydın tüm bilgilerini iletiyor. Bu aşamada tekrar DynamoDB'ye bir query operasyonu yapmılmasına gerek kalmıyor.

Lambda yeni bir kayıt geldiyse voice ve text fieldlarını kullanarak Polly ile haberleşiyor. Polly bu değerleri alıp istenen bir ses formatına dönüştürme işlemini yapıyor. Polly bu yazı yazıldığında mp3, ogg vorbis ve pcm formatlarını destekliyordu. Polly'nın metni ses verisine dönüştürme işlemi `synthesizeSpeech` fonksiyonu ile gerçekleştiriliyor. `synthesizeSpeech` fonksiyonu eğer dönüştürme gerçekliştiyse cevap olarak bir AudioStream döndürüyor.

Polly'den dönen AudioStream objesini dilersek bir browser üzerinde çalıştırabileceğimiz gibi, bir S3 bucket'ına göndererek kalıcı hale de getirebiliyoruz. S3 `upload` fonksiyonu bir Stream objesini alıp istenilen bir formatta kaydedebiliyor. Polly'den gelen AudioStream objesini bu şekilde S3'e public olarak DynamoDB'deki `id`'si ile kaydediyor.

Daha sonra Lambda fonksiyonu, oluşturulan mp3 dosyasının adresini DynamoDB tablosunun `url` alanını güncelleyerek web uygulamasından dinlenebilmesi için kaydediyor. Verinin DynamoDB'deki primary key'i ile bir `update` operasyonu yapılıyor ve Lambda fonksiyonu kendini kapatıyor.

Javascript ES7'nin avantajlarını da kullanarak buradaki tüm süreci asenkron bir hale getirdiğimiz için response süresini olabildiğince kısarak Lambda'nin çalışma süresini de düşürmüş olduk. Bu durum Lambda fiyatlandırılırken daha az maliyetle çalışmasına da katkıda bulunmuş oldu.

### Serverless Framework
[Serverless Framework](https://serverless.com/) Amazon, Google Cloud ve Azure üzerinde FaaS uygulamalarını kolay bir şekilde ayarlayıp deploy etmenizi sağlayan bir framework. Serverless sayesinde mikro fonksiyonlarınızın ve diğer serverless servislerinizin oluşturulması ve ayarlamalarını kod'a dökerek CI/CD prensiplerine uygun serverless uygulamalar geliştirebilirsiniz.

Serverless hangi fonksiyonların ve servislerin kurulacağını `serverless.yml` dosyasını okuyarak anlıyor. AWS için okuduğu yml dosyasını CloudFormation template'ine dönüştürerek kurulumların ve deploymentların AWS altyapısında oluşturulmasını sağlıyor.

Polly uygulamasında kullanılan tüm Amazon servislerini ve konfigürasyonlarını `serverless.yml` dosyası altında inceleyebilirsiniz. Basit düzeyde AWS IAM ve AWS CloudFormation bilgisi gerekmekte olduğunu şimdiden belirtelim.

#### CloudFormation
[CloudFormation](https://aws.amazon.com/cloudformation/) AWS ekosisteminin Infrastructure as Code için geliştirdiği bir çözüm. Puppet, Chef ve Ansible bir alternatif olarak düşünebilirsiniz. CloudFormation için yml veya json formatında hazırladığınız template dosyaları sayesinde AWS üzerindeki tüm servisleri otomatize edebiliyorsunuz. Serverless Framework AWS servisleri için kendi yml dosyasını CloudFormation template yml dosyasına dönüştürerek servis kurulumlarını Amazon'un yapmasını sağlıyor.

Polly uygulamasında kullandığımız `serverless.yml` dosyası ilk başta oldukça karışık gelebilir. Fakat aslında oldukça basit bir yapıya sahip.

`provider:` ile başlayan bölüm genel lambda uygulamalarının özelliklerini belirtmektedir. Lambda fonksiyonlarımızın hangi node.js versiyonu ile çalışacağını, hangi region'da bulunacağını, ne kadar memory limiti olacağını ve hangi servislere erişim izinlerinin olacağını bu bölümde belirtiyoruz.

```
provider:
  name: aws
  runtime: nodejs8.10
  stage: dev
  region: eu-west-1
  memorySize: 128
  iamRoleStatements:
    - Effect: "Allow"
      Action:
        - "s3:PutObject"
        - "s3:PutObjectAcl"
      Resource:
        Fn::Join:
          - ""
          -
            - "arn:aws:s3:::"
            - Ref : AudioBucket
            - "/*"
    - Effect: "Allow"
      Action:
        - "dynamodb:DeleteItem"
        - "dynamodb:GetItem"
        - "dynamodb:PutItem"
        - "dynamodb:Scan"
        - "dynamodb:UpdateItem"
        - "dynamodb:GetRecords"
        - "dynamodb:GetShardIterator"
        - "dynamodb:DescribeStream"
        - "dynamodb:ListStreams"
      Resource:
        - 'Fn::Join':
          - ':'
          -
            - 'arn:aws:dynamodb'
            - Ref: 'AWS::Region'
            - Ref: 'AWS::AccountId'
            - 'Fn::Join':
              - ""
              -
                - 'table/'
                - Ref: PollyTable
    - Effect: "Allow"
      Action:
        - "polly:*"
      Resource: "*"
```

Burada Polly uygulaması için Node.js 8.10 kullanacağımızı, 128 mb memory limiti olduğunu ve eu-west-1 region'ında bulunacağını belirtiyoruz. Ayrıca IAM role'leri ile de S3'e yazma, DynamoDB'ye okuma ve yazma ve Polly servisine de tam yetki veriyoruz.

`functions:` Her bir lambda fonksiyonlarımızın detaylarını barındıran bölüm. Lambda fonksiyonlarının isimlerini, başlangıç noktasının hangi dosyadaki hangi fonksiyon olacağını, environment değişkenlerini ve nerelerden event alabileceğini burada belirliyoruz. Ayrıca Api Gateway ayarlarımızıda her bir fonksiyon için burada ayarlıyoruz. 

```
functions:
  getpost:
    handler: getpost.main
    description: Gets posts from dynamodb
    events:
      - http:
          method: get
          path: /
          integration: lambda
          cors: true
          request:
            passThrough: WHEN_NO_MATCH
            parameters:
              querystrings:
                postId: true
            template:
              application/json: '{ "postId" : "$input.params(''postId'')" }'
          response:
            headers:
              Content-Type: "'application/json'"
    environment:
      tableName:
        Ref: PollyTable
  newpost:
    handler: newpost.main
    description: Adds new posts to dynamodb
    events:
      - http:
          method: post
          path: /
          integration: lambda
          cors: true
          request:
            passThrough: WHEN_NO_MATCH
            template:
              application/json: ''
          response:
            headers:
              Content-Type: "'application/json'"
    environment:
      tableName:
        Ref: PollyTable
  convertaudio:
    handler: convertaudio.main
    description: Converts text to mp3 voices throught Polly
    events:
      - stream:
          type: dynamodb
          batchSize: 1
          arn:
            Fn::GetAtt:
              - PollyTable
              - StreamArn
    environment:
      tableName:
        Ref: PollyTable
      audioBucket:
        Ref: AudioBucket
      region: ${self:provider.region}
```

Burada her bir Lambda fonksiyonunu tek tek oluşturup erişmelerini istediğimiz method'ları belirtiyoruz. Daha sonra `getpost` ve `newpost` fonksiyonlarına Api Gateway event'lerini ekliyoruz. Api Gateway event'lerini eklerken Api Gateway'in `application/json` content-type'ını ve http method'larını da ayarlıyoruz. `convertaudio` fonksiyonu dynamodb streams'den event'lerini alacağı için hangi dynamodb tablosunu dinlemesi gerektiğini de yine burada belirledik.

`resources:` bölümü Serverless Framework'ün cloud özelindeki ayarlamaları yaptığı kısım. Burada yazılan tüm kod'lar direk CloudFormation'ın template'inin içine giriyor.

```
resources:
  Resources:
    PollyTable:
      Type: AWS::DynamoDB::Table
      Properties:
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
        StreamSpecification:
          StreamViewType: NEW_AND_OLD_IMAGES
        ProvisionedThroughput:
          ReadCapacityUnits: 1
          WriteCapacityUnits: 1
    StaticBucket:
      Type: AWS::S3::Bucket
      Properties:
        AccessControl: PublicRead
        WebsiteConfiguration:
          IndexDocument: index.html
          ErrorDocument: index.html
    AudioBucket:
      Type: AWS::S3::Bucket
      Properties:
        AccessControl: PublicRead
```

Burada bir adet DynamoDB tablomuz ve iki adet S3 bucket'ımız olacağını belirtiyoruz.

## Sonuç
Bu yazımızda Serverless Framework kullanarak AWS Lambda ve AWS Polly ile metinleri seslendirmek için bir uygulama yaptık. Serverless mimari ve güncel konseptleri de ele alarak hazırladığımız uygulama sayesinde herhangi bir sunucuya ihtiyaç duymadan performanslı ve stabil bir uygulama yazmanın ne kadar kolay olduğunu görebilirsiniz. Fiyatlandırma açısından da 7/24 ayakta duran bir sunucudan çok daha az maliyetli olduğunu belirtelim.

* Lambda fonksiyonları için aylık 1 milyon request ve 400,000 GB/sn işlem bedava
* Api Gateway için 1 milyon request $3.50
* S3 için GB başına $0.0023
* Polly için 1 milyon karakter için $4.00

En düşük EC2 instance'ının aylık $8.00 olduğunu düşünürsek uygulamanın çok daha düşük bir maliyetle çalıştığını görebilirsiniz.

Yazının ikinci bölümünde AWS transcribe ile yazılan metni istenilen dile çevirerek bu şekilde bir seslendirme yapılmasını sağlayacağız.

Çalışan uygulama örneği:

![PollyUI](http://gifly.com/media_gifly/o/N/M/i/b/oNMi.gif)
