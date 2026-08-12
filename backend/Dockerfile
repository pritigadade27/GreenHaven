# Green Haven API — container image for Render (or any Docker host).
#
# Two stages: the first compiles with Maven, the second keeps only the finished
# jar on a small JRE. Shipping the build tools would roughly triple the image
# and put a compiler on a public server for no reason.

# ---------- stage 1: build ----------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Dependencies are copied and resolved on their own first. Docker caches this
# layer, so editing source code does not re-download the whole dependency tree.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# ---------- stage 2: run ----------
FROM eclipse-temurin:17-jre
WORKDIR /app

# Runs as a non-root user. A container process does not need root, and if the
# application is ever compromised this limits what the attacker inherits.
RUN useradd --system --uid 1001 greenhaven
COPY --from=build /app/target/*.jar app.jar

# Uploaded photographs. On a free host this is ephemeral — see DEPLOYMENT.md.
RUN mkdir -p /app/uploads && chown -R greenhaven:greenhaven /app
USER greenhaven

# Render supplies $PORT; application.properties reads it, defaulting to 8080.
EXPOSE 8080

# MaxRAMPercentage rather than a fixed -Xmx: the JVM then sizes its heap from
# whatever the container is actually given, which on a 512 MB free tier is the
# difference between starting and being killed.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-jar", "app.jar"]
