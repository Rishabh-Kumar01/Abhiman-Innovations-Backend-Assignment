FROM node:18

WORKDIR /usr/src/app

# Install netcat and dos2unix
RUN apt-get update && apt-get install -y netcat-traditional dos2unix

COPY package*.json ./
COPY prisma ./prisma/
COPY scripts ./scripts/

RUN npm install

COPY . .

# Fix line endings and make script executable
RUN dos2unix ./scripts/wait-for-services.sh && \
    chmod +x ./scripts/wait-for-services.sh

RUN npx prisma generate

# Add migration commands
RUN echo "#!/bin/bash\n\
npx prisma migrate deploy\n\
npm start" > /usr/src/app/startup.sh && \
chmod +x /usr/src/app/startup.sh

EXPOSE 3000

ENTRYPOINT []

CMD ["./scripts/wait-for-services.sh", "./startup.sh"]