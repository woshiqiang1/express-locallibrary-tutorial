const BookInstance = require('../models/bookInstance')
const Book = require('../models/book')
const { body, validationResult } = require('express-validator/check')
const { sanitizeBody } = require('express-validator/filter')
const async = require('async')

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
exports.bookinstance_detail = (req, res, next) => {
  BookInstance
    .findById(req.params.id)
    .populate('book')
    .exec((err, bookInstance) => {
      if(err) {
        return next(err)
      }
      if(bookInstance == null) {
        var err = new Error('Book copy not found')
        err.status = 404;
        return next(err)
      }
      res.render('bookInstance_detail', { title: 'Book:', bookInstance: bookInstance })
    })
};

// 由 GET 显示创建藏书副本的表单
exports.bookinstance_create_get = (req, res, next) => {
  Book
    .find({}, 'title')
    .exec((err, books) => {
      if(err) {
        return next(err)
      }
      // Successful, so render
      res.render('bookInstance_form', {
        title: 'Create BookInstance',
        bookList: books,
      })
    })
};

// 由 POST 处理藏书副本创建操作
exports.bookinstance_create_post = [
  // validate fields
  body('book', 'Book must be specified').isLength({ min: 1 }).trim(),
  body('imprint', 'Imprint must be specified').isLength({ min: 1 }).trim(),
  body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

  // sanitize fields
  sanitizeBody('book').trim().escape(),
  sanitizeBody('imprint').trim().escape(),
  sanitizeBody('status').trim().escape(),
  sanitizeBody('due_back').toDate(),

  // process request after validation and sanitization.
  (req, res, next) => {
    // extract the validation errors from a request.
    const errors = validationResult(req)

    // create a BookInstance object with escaped and trimmed data.
    const { book, imprint, status, due_back } = req.body
    let bookInstance = new BookInstance({
      book,
      imprint,
      status,
      due_back
    })

    if(!errors.isEmpty()) {
      // there are errors, render form again with sanitized values and error messages.
      Book
        .find({}, 'title')
        .exec((err, books) => {
          if(err) {
            return next(err)
          }
          // Successful, so render.
          res.render('bookInstance_form', { 
            title: 'Create BookInstance',
            bookList: books,
            selected_book: bookInstance.book_id,
            errors: errors.array(),
            bookInstance  
          })
        })
        return
    } else {
      // data from form is valid.
      bookInstance.save(err => {
        if(err) {
          return next(err)
        }
        // successful - redirect to new record.
        res.redirect(bookInstance.url)
      })
    }
  }
]
// 由 GET 显示删除藏书副本的表单
exports.bookinstance_delete_get = (req, res) => {
  BookInstance
    .findById(req.params.id)
    .populate('book')
    .exec((err, bookInstance) => {
      res.render('bookInstance_delete', {
        title: 'Delete BookInstance',
        bookInstance,
      })
    })
};

// 由 POST 处理藏书副本删除操作
exports.bookinstance_delete_post = (req, res, next) => {
  BookInstance
    .findByIdAndRemove(req.body.bookInstanceId, err => {
      if(err) {
        return next(err)
      }
      res.redirect('/catalog/bookinstances')
    })
};

// 由 GET 显示更新藏书副本的表单
exports.bookinstance_update_get = (req, res, next) => {
  async.parallel({
    bookInstance: callback => {
      BookInstance
        .findById(req.params.id)
        .populate('book')
        .exec(callback)
    },
    books: callback => {
      Book
        .find({}, 'title')
        .exec(callback)
    }
  }, (err, results) => {
    if(err) {
      return next(err)
    }
    if(results.bookInstance == null) {
      let err = new Error('bookInstance not found')
      err.status = 404
      return next(err)
    }

    res.render('bookInstance_form', {
      title: 'Update BookInstacne',
      bookList: results.books,
      bookInstance: results.bookInstance  
    })
  })
};

// 由 POST 处理藏书副本更新操作
exports.bookinstance_update_post = [
  // validate fields
  body('book', 'Book must be specified').isLength({ min: 1 }).trim(),
  body('imprint', 'Imprint must be specified').isLength({ min: 1 }).trim(),
  body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

  // sanitize fields
  sanitizeBody('book').trim().escape(),
  sanitizeBody('imprint').trim().escape(),
  sanitizeBody('status').trim().escape(),
  sanitizeBody('due_back').toDate(),

  (req, res, next) => {
    const errors = validationResult(req)
    const { book, imprint, status, due_back } = req.body
    let bookInstance = new BookInstance({
      book,
      imprint,
      status,
      due_back,
      _id: req.params.id,
    })
    if(!errors.isEmpty()) {
      Book
      .find({}, 'title')
      .exec((err, books) => {
        if(err) {
          return next(err)
        }
        // Successful, so render.
        res.render('bookInstance_form', { 
          title: 'Create BookInstance',
          bookList: books,
          selected_book: bookInstance.book_id,
          errors: errors.array(),
          bookInstance  
        })
      })
      return
    } else {
      BookInstance.findByIdAndUpdate(req.params.id, bookInstance, {}, (err, theOne) => {
        if(err) {
          return next(err)
        }
        res.redirect(theOne.url)  
      })
    }
  }
]