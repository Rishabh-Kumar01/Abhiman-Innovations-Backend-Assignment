FROM node:18

WORKDIR /usr/src/app

# Install netcat
RUN apt-get update && apt-get install -y netcat-traditional

COPY package*.json ./
COPY prisma ./prisma/
COPY scripts ./scripts/

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["./scripts/wait-for-services.sh", "npm", "start"]

