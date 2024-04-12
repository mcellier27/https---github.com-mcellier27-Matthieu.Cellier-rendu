CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  about VARCHAR(500),
  price FLOAT
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(40),
  password VARCHAR(20),
  mail VARCHAR(40)
);


INSERT INTO products (name, about, price) VALUES
  ('My first game', 'This is an awesome game', '60')

  INSERT INTO users (name, password, mail) VALUES
  ('Matthieu', 'bonjour', 'blabla@gmail.com')
