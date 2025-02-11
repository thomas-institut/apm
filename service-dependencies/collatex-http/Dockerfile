#
# Dockerfile to generate a docker image that runs Collatex in its default port 7369
#
# Created: 2025-01-02
#
FROM amazoncorretto:8-alpine-jre
LABEL authors="Rafael Nájera"
WORKDIR /opt/collatex
# Get collatex from the official distribution
ADD https://oss.sonatype.org/service/local/repositories/releases/content/eu/interedition/collatex-tools/1.7.1/collatex-tools-1.7.1.jar .
EXPOSE 7369
# Run collatex's internal web server
CMD ["java", "-jar" , "./collatex-tools-1.7.1.jar", "--http"]
