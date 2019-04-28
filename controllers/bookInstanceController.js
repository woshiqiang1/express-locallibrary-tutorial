const BookInstance = require('../models/bookInstance');

// 显示完整的藏书副本列表
exports.bookinstance_list = (req, res, next) => {
  BookInstance.find()
    .populate('book')
    .exec(function (err, list_bookInstances) {
      if (err) { return next(err); }
      // Successful, so render
      res.render('bookInstance_list', { title: 'Book Instance List', bookInstance_list: list_bookInstances });
    });
};

// 为藏书的每一本副本显示详细信息的页面
exports.bookinstance_detail = (req, res) => {
  res.send('未实现：藏书副本详细信息：' + req.params.id);
};

// 由 GET 显示创建藏书副本的表单
exports.bookinstance_create_get = (req, res) => {
  res.send('未实现：藏书副本创建表单的 GET');
};

// 由 POST 处理藏书副本创建操作
exports.bookinstance_create_post = (req, res) => {
  res.send('未实现：创建藏书副本的 POST');
};

// 由 GET 显示删除藏书副本的表单
exports.bookinstance_delete_get = (req, res) => {
  res.send('未实现：藏书副本删除表单的 GET');
};

// 由 POST 处理藏书副本删除操作
exports.bookinstance_delete_post = (req, res) => {
  res.send('未实现：删除藏书副本的 POST');
};

// 由 GET 显示更新藏书副本的表单
exports.bookinstance_update_get = (req, res) => {
  res.send('未实现：藏书副本更新表单的 GET');
};

// 由 POST 处理藏书副本更新操作
exports.bookinstance_update_post = (req, res) => {
  res.send('未实现：更新藏书副本的 POST');
};