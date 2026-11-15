FROM debian:forky-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN printf 'deb http://deb.debian.org/debian trixie main\n' > /etc/apt/sources.list.d/cab-trixie.list \
 && apt-get update \
 && mkdir -p /etc/postgresql-common \
 && printf 'create_main_cluster = false\n' > /etc/postgresql-common/createcluster.conf \
 && apt-get install -y --no-install-recommends postgresql postgresql-17 postgresql-18 postgresql-common python3.13 ca-certificates libtinfo6 libstdc++6 \
 && rm -rf /var/lib/apt/lists/*
ENV PYTHONPATH=/cab/src:/usr/lib/cab/python-vendor
WORKDIR /cab
CMD ["/usr/bin/python3.13", "-B", "tests/postgresql_migration.py"]
