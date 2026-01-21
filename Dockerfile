FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

COPY migrations/001_create_schema.sql /docker-entrypoint-initdb.d/001_create_schema.sql

CMD ["sh", "-c", "until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do sleep 1; done && psql postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME -f /docker-entrypoint-initdb.d/001_create_schema.sql && node src/index.js"]
