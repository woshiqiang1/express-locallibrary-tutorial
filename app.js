const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const dotenv = require('dotenv');
dotenv.config()

const compression = require('compression');
const helmet = require('helmet');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const catalogRouter = require('./routes/catalog');

const app = express();

// 设置 Mongoose 连接
const mongoose = require('mongoose')
const mongoDB = process.env.MONGODB_URI || `mongodb+srv://${process.env.DB}@cluster0-8ecsa.mongodb.net/local_library?retryWrites=true`
mongoose.connect(mongoDB,{useNewUrlParser: true})
mongoose.Promise = global.Promise
const db = mongoose.connection
db.on('error', console.log.bind(console, 'MongoDB 连接错误：'))


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Logger
app.use(logger('dev'));

app.use(helmet()); // 添加了对大多数站点有意义的可用标头子集,避免被常见漏洞攻击

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression()); //Compress all routes 
app.use(express.static(path.join(__dirname, 'public')));


// Router
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/catalog', catalogRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
