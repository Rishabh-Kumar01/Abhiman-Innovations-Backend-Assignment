FROM node:18

WORKDIR /usr/src/app

# Install dependencies
RUN apt-get update && apt-get install -y netcat-traditional dos2unix

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client (but skip migrations here)
RUN npx prisma generate

# Copy scripts
COPY scripts ./scripts/

# Copy the rest of the app
COPY . .

# Fix line endings
RUN dos2unix ./scripts/wait-for-services.sh && \
    chmod +x ./scripts/wait-for-services.sh


# Startup script (include migrations here)
RUN echo "#!/bin/bash\n\
npx prisma migrate deploy\n\
npm start" > /usr/src/app/startup.sh && \
    chmod +x /usr/src/app/startup.sh

EXPOSE 3000

ENTRYPOINT []
CMD ["./scripts/wait-for-services.sh", "./startup.sh"]