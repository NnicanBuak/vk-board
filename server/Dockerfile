FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["./entrypoint.sh"]
