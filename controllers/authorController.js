const Author = require("../models/author")
const Book = require('../models/book')
const async = require('async')
const { body, validationResult } = require('express-validator/check')
const { sanitizeBody }  = require('express-validator/filter')

// 显示完整的作者列表
exports.author_list = (req, res, next) => {
  Author.find()
        .sort([['family_name', 'ascending']])
        .exec((err, list_authors) => {
          if(err){
            return next(err)
          }
          res.render('author_list', { title: 'Author List', author_list: list_authors })
        })
};

// 为每位作者显示详细信息
exports.author_detail = (req, res, next) => {
  async.parallel({
    author: callback => {
      Author.findById(req.params.id)
            .exec(callback)
    },
    author_books: callback => {
      Book.find({author: req.params.id}, 'title summary')
          .exec(callback)
    }
  }, (err, results) => {
    if(err){
      return next(err)
    }
    if(results.author == null){
      let err = new Error('Author not found')
      err.status = 404
      return next(err)
    }
    res.render('author_detail', {title: 'Author Detail', author: results.author, author_books: results.author_books})
  })
};

// 由 GET 显示创建作者的表单
exports.author_create_get = (req, res) => {
  res.render('author_form', { title: 'Create Author' })
};

// 由 POST 处理作者创建操作
exports.author_create_post = [
  // valid fields
  body('first_name')
    .isLength({ min: 1 })
    .trim()
    .withMessage('First name must be specified.'),
  body('family_name')
    .isLength({ min: 1 })
    .trim()
    .withMessage('Family name must be specified.'),
  body('date_of_birth', 'Invalid date of birth')
    .optional({ checkFalsy: true }) 
    .isISO8601(),
  body('date_of_death', 'Invalid date of death')
    .optional({ checkFalsy: true }) 
    .isISO8601(), 
    
  // sanitize fields
  sanitizeBody('first_name').trim().escape(),
  sanitizeBody('family_name').trim().escape(),
  sanitizeBody('date_of_birth').toDate(),
  sanitizeBody('date_of_death').toDate(),
  
  // process request after validation and sanitization
  (req, res, next) => {
    // extract the validation errors from a request
    const errors = validationResult(req)
    if(!errors.isEmpty()) {
      // there errors, Render form again with sanitize values/errors message
      res.render('author_form', { 
        title: 'Create Author', 
        author: req.body, 
        errors: errors.array() 
      })
      return
    } else {
      // data from form is valid
      // create an Author object with escaped and trimmed data
      const { first_name, family_name, date_of_birth, date_of_death } = req.body
      let author = new Author(
        {
          first_name,
          family_name,
          date_of_birth,
          date_of_death
      })
      author.save(err => {
        if(err) {
          return next(err)
        }
        // successful - redirect to new author record
        res.redirect(author.url)
      })
    }
  }
]

// 由 GET 显示删除作者的表单
exports.author_delete_get = (req, res) => {
  async.parallel({
    author: callback => {
      Author
        .findById(req.params.id)
        .exec(callback)
    },
    author_books: callback => {
      Book
        .find({ author: req.params.id })
        .exec(callback)
    }
  }, (err, results) => {
    if(err) {
      return next(err)
    }
    if(results.author == null) {
      res.redirect('/catalog/authors')
    }
    // successful, so render.
    res.render('author_delete', {
      title: 'Delete Author',
      author: results.author,
      author_books: results.author_books
    })
  })
};

// 由 POST 处理作者删除操作
exports.author_delete_post = (req, res, next) => {
  async.parallel({
    author: callback => {
      Author
        .findById(req.body.authorid)
        .exec(callback)
    },
    author_books: callback => {
      Book
        .find({ author: req.body.authorid })
        .exec(callback)
    }
  }, (err, results) => {
    if(err) {
      return next(err)
    }
    if(results.authors_books.length > 0) {
      // author has books, render in same way as for get route
      res.render('author_delete', {
        title: 'Delete Author',
        author: results.author,
        author_books: results.author_books
      })
      return   
    } else {
      // author has no books, delete object and redirect to the list of authors.
      Author.findByIdAndRemove(req.body.authorid, err => {
        if(err) {
          return next(err)
        }
        // success - go to author list
        res.redirect('/catalog/authors')
      })
    }
  })
};

// 由 GET 显示更新作者的表单
exports.author_update_get = (req, res, next) => {
  Author
    .findById(req.params.id)
    .exec((err, author) => {
      if(err) {
        return next(err)
      }
      if(author == null) {
        let err = new Error('Author not found')
        err.status = 404
        return next(err)
      }
      res.render('author_form', {
        title: 'Update Author',
        author
      })
    })
};

// 由 POST 处理作者更新操作
exports.author_update_post = [
  // valid fields
  body('first_name')
    .isLength({ min: 1 })
    .trim()
    .withMessage('First name must be specified.'),
  body('family_name')
    .isLength({ min: 1 })
    .trim()
    .withMessage('Family name must be specified.'),
  body('date_of_birth', 'Invalid date of birth')
    .optional({ checkFalsy: true }) 
    .isISO8601(),
  body('date_of_death', 'Invalid date of death')
    .optional({ checkFalsy: true }) 
    .isISO8601(), 
   
  // sanitize fields
  sanitizeBody('first_name').trim().escape(),
  sanitizeBody('family_name').trim().escape(),
  sanitizeBody('date_of_birth').toDate(),
  sanitizeBody('date_of_death').toDate(),

  (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()) {
      res.render('author_form', { 
        title: 'Update Author', 
        author: req.body, 
        errors: errors.array() 
      })
      return
    } else {
      const { first_name, family_name, date_of_birth, date_of_death } = req.body
      let author = new Author(
        {
          first_name,
          family_name,
          date_of_birth,
          date_of_death,
          _id: req.params.id
      })
      Author.findByIdAndUpdate(req.params.id, author, {}, (err, theOne) => {
        if(err) {
          return next(err)
        }
        res.redirect(theOne.url)
      })
    }
  }
]