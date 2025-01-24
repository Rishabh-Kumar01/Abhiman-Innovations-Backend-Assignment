# Real-time Polling System

A real-time polling system built with Node.js, Express, PostgreSQL, Kafka, and
Socket.IO. The system allows users to create polls, vote on them, and get
real-time updates when votes are cast.

## Features

- Create polls with multiple options
- Real-time vote updates using Socket.IO
- Kafka integration for vote processing
- Automatic poll expiration
- View poll results with vote percentages
- Get top polls by vote count
- Docker support for easy deployment

## Technologies Used

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- Apache Kafka
- Socket.IO
- Docker
- Docker Compose

## Project Structure

```
polling-system/
├── src/
│   ├── config/
│   │   ├── kafka.js
│   │   └── socket.js
│   ├── controllers/
│   │   └── pollController.js
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── repositories/
│   │   └── pollRepository.js
│   ├── services/
│   │   └── pollService.js
│   ├── consumers/
│   │   └── pollConsumer.js
│   ├── producers/
│   │   └── pollProducer.js
│   ├── cron/
│   │   └── pollExpirationCron.js
│   ├── utils/
│   │   └── error.js
│   ├── routes/
│   |   └── pollRoutes.js
|   └──server.js
├── prisma/
│   └── schema.prisma
├── scripts/
│   └── wait-for-services.sh
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env
└── package.json
```

## Architecture

The project follows a clean architecture pattern with:

1. **Controllers**: Handle HTTP and WebSocket requests
2. **Services**: Contain business logic
3. **Repositories**: Handle database operations
4. **Producers/Consumers**: Manage Kafka message processing
5. **Real-time Updates**: Socket.IO for live vote counts

## Prerequisites

- Docker
- Docker Compose
- Node.js v18+ 

## Installation

1. Clone the repository:

```bash
git clone https://github.com/Rishabh-Kumar01/Abhiman-Innovations-Backend-Assignment-By-Rishabh-Kumar.git
cd Abhiman-Innovations-Backend-Assignment-By-Rishabh-Kumar
```

2. Create a `.env` file:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/polling_db
KAFKA_BROKERS=kafka:9092
KAFKA_TOPIC=poll-votes
```

3. Free up required ports (3000, 5432, 2181, 9092)

- On Linux:
```bash
# Identify process using port
sudo lsof -i :<port_number>

# Terminate process
sudo kill <PID>
# Or force terminate
sudo kill -9 <PID>
```

- On Windows:
```bash
# Identify process using port
netstat -ano | findstr :<port_number>

# Terminate process
taskkill /PID <PID> /F
```

4. Build and start the containers:

```bash
docker-compose up -d
```

## API Documentation

### Create Poll

- **POST** `/polls`

```json
{
  "userId": 1,
  "question": "What's your favorite programming language?",
  "options": ["JavaScript", "Python", "Java", "C++"],
  "expiresAt": "2025-02-23T00:00:00.000Z"
}
```

### Vote on Poll

- **POST** `/polls/:pollId/vote`

```json
{
  "userId": 2,
  "optionId": 1
}
```

### Get Poll Results

- **GET** `/polls/:pollId`

### Get Top Polls

- **GET** `/leaderboard`

## Socket.IO Events

### Join Poll Room

```javascript
socket.emit("join-poll", pollId);
```

### Listen for Updates

```javascript
socket.on("poll-update", (pollData) => {
  console.log("Poll updated:", pollData);
});

socket.on("viewers-update", ({ count }) => {
  console.log("Current viewers:", count);
});
```

## Testing with Postman

1. Connect to Socket.IO:

```
ws://localhost:3000
```

2. Join a poll room:

![Click on the send button to join the room](image.png)

- 1 is the poll ID and join-poll is the event name in the image above.

3. Add Events:

![Add Events in the Events tab](image-1.png)

- Add poll-update and viewers-update events in the Events tab like in the image
  above.

4. Make a vote request:

```
POST http://localhost:3000/api/polls/1/vote
{
    "userId": 2,
    "optionId": 1
}
```

5. Leave a poll room:

![Click on the send button to leave the room]({65475690-9454-4F60-8D93-B6EDADB5A8D0}.png)

- 1 is the poll Id and leave-poll is the event name in the image above.

## Docker Commands

Start services:

```bash
docker-compose up -d
```

Stop services:

```bash
docker-compose down
```

View logs:

```bash
docker-compose logs -f
```

Rebuild services:

```bash
docker-compose up -d --build
```

## Database Management

Run migrations:

```bash
docker-compose exec app npx prisma migrate deploy
```

Reset database:

```bash
docker-compose exec app npx prisma migrate reset
```
