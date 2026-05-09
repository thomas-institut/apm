## Collatex

Starting in January 2025, APM uses Collatex's internal webserver. This is faster than
running the executable directly.

Since Collatex does not work properly with any other Java version except Java 8 and that 
version is not readily available in modern Ubuntu versions, it is better to run it with Amazon 
Corretto. 

There are two options:

1. Download Amazon Corretto as a tar file from Amazon, unpack it and 
   run Collatex's JAR file with the java executable in there:
  ```
   /path/to/amazon/corretto/bin/java -jar collatex-tools-1.7.1.jar --http
  ```
2. Run the docker container built with the Dockerfile provided here:
  ```   
  docker build -t collatex-http .
  docker run -dp 127.0.0.1:7369:7369 collatex-http
   ```

### Urls

* Corretto website: https://aws.amazon.com/corretto/
  * Corretto package: https://corretto.aws/downloads/latest/amazon-corretto-8-x64-linux-jdk.tar.gz
* Collatex website: https://collatex.net/
  * Collatex jar file: https://oss.sonatype.org/service/local/repositories/releases/content/eu/interedition/collatex-tools/1.7.1/collatex-tools-1.7.1.jar