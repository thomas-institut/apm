## Collatex

Starting in January 2025, APM will use Collatex's internal webserver. This is faster than
running the executable directly.

Since Collatex does not work properly with any other Java version except Java 8 and that 
version is not readily available in modern Ubuntu versions, it is better to run it with Amazon 
Corretto. 
 
Either download Amazon Corretto as tar file from https://aws.amazon.com/corretto/, unpack it and 
run Collatex's JAR file with the java executable in there:

`/path/to/amazon/corretto/bin/java -jar collatex-tools-1.7.1.jar --http`

Or, run the docker container built with the Dockerfile provided here:
  
`docker build -t collatex-http .`

`docker run -dp 127.0.0.1:7369:7369 collatex-http`