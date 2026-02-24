const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions:
    process.env.NODE_ENV === 'production'
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      : {}
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected');
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
