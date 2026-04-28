FROM matrixdotorg/synapse:latest

USER root
RUN apt-get update && apt-get install -y gettext-base curl && rm -rf /var/lib/apt/lists/*

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8008

ENTRYPOINT ["/start.sh"]
