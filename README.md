## 部署到 heroku

1. 注册下载 heroku cli
2. heroku login
3. heroku create <name>
4. heroku config:set NODE_ENV='production'
5. heroku heroku config:set MONGODB_URI=<your_DB_URI>
6. git push heroku master
7. heroku open
