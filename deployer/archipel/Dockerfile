###########################
# Archipel chain build step
###########################
FROM rust:buster as builder-chain
WORKDIR /root/  
COPY ./chain .
RUN	apt-get -y update; \
	apt-get install -y --no-install-recommends \
		g++ libssl-dev gcc clang libclang-dev make \
		git pkg-config curl time rhash python
RUN ./scripts/init.sh && cargo build --release
RUN ./target/release/archipel build-spec --chain template > archipelTemplateSpec.json
RUN ./target/release/archipel build-spec --chain template --raw > archipelTemplateSpecRaw.json

###########################
# Build subkey tool step
###########################
RUN rustup install stable
RUN cargo +stable install --force --git https://github.com/paritytech/substrate subkey

####################################
# Create Archipel docker image
####################################
FROM node:10-buster
WORKDIR /root/

####################################
# import chain build
####################################
RUN mkdir chain
COPY --from=builder-chain /root/target/release/archipel ./chain
COPY --from=builder-chain /root/archipelTemplateSpec.json ./chain
COPY --from=builder-chain /root/archipelTemplateSpecRaw.json ./chain
COPY --from=builder-chain /usr/local/cargo/bin/subkey /usr/local/bin/

# Add debian unstable repo for wireguard packages
RUN echo "deb http://deb.debian.org/debian/ unstable main" > /etc/apt/sources.list.d/unstable-wireguard.list && \
    printf 'Package: *\nPin: release a=unstable\nPin-Priority: 90\n' > /etc/apt/preferences.d/limit-unstable

# Installing necessary packages
RUN	apt-get -y update && \
	apt-get install -y --no-install-recommends \
		libssl-dev curl supervisor jq build-essential \
		wireguard-tools iptables net-tools procps && \
	echo "resolvconf resolvconf/linkify-resolvconf boolean false" | debconf-set-selections && \
    apt install -y resolvconf && \
    apt clean

####################################
# import orchestrator
####################################
WORKDIR /usr/src/app  
COPY orchestrator/package*.json ./
COPY orchestrator/ .
RUN npm install

WORKDIR /root/

####################################
# import scripts and supervisord conf  
####################################
COPY ./deployer/archipel/start-chain.sh /usr/local/bin/
COPY ./deployer/archipel/start-orchestrator.sh /usr/local/bin/
COPY ./deployer/archipel/start-wireguard.sh /usr/local/bin/
COPY ./deployer/archipel/supervisord.conf /etc/supervisord/

RUN chmod +x /usr/local/bin/start-chain.sh
RUN chmod +x /usr/local/bin/start-orchestrator.sh
RUN chmod +x /usr/local/bin/start-wireguard.sh

EXPOSE 51820/udp

ENTRYPOINT ["supervisord","-c","/etc/supervisord/supervisord.conf"]
