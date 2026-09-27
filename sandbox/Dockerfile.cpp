FROM gcc:14

WORKDIR /code

RUN mkdir -p /code /workspace \
    && useradd -m sandbox \
    && chown -R sandbox:sandbox /code /workspace

USER sandbox

CMD ["bash"]