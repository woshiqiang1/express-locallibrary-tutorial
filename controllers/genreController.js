const Genre = require('../models/genre');
const Book = require('../models/book');
const async = require('async');
const { body, validationResult } = require('express-validator/check')
const { sanitizeBody } = require('express-validator/filter')

// 显示完整的藏书种类列表
exports.genre_list = (req, res, next) => {
  Genre.find()
  .populate('book')
  .exec((err, genre_list) => {
    if(err){
      return next(err)
    }
    res.render('genre_list', { title: 'Genre List', genre_list});
  })
};

// 为每一类藏书显示详细信息的页面
exports.genre_detail = (req, res, next) => {
  async.parallel(
    {
      genre: callback => {
        Genre.findById(req.params.id)
        .exec(callback)
      },
      genre_books: callback => {
        Book.find({
          genre: req.params.id
        })
        .exec(callback)
      }
    },
    (err, results) => {
      if(err){
        return next(err)
      }
      if(results.genre == null){
        var err = new Error('Genre not found')
        err.status = 404
        return next(err)
      }
      res.render('genre_detail', {title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books})
    }
    )
};

// 由 GET 显示创建藏书种类的表单
exports.genre_create_get = (req, res, next) => {
  res.render('genre_form', { title: 'Create Genre' })
};

// 由 POST 处理藏书种类创建操作
exports.genre_create_post = [
  // validate that the name field is not empty
  body('name', 'Genre name required').isLength({ min: 1 }).trim(),

  // sanitize (trim and escape) the name field
  // trim去除首尾空格，escape转译危险代码注入
  sanitizeBody('name').trim().escape(),

  // process request after validation and sanitization
  (req, res, next) => {
    // extract the validation errors from a request
    const errors = validationResult(req)

    // create a genre object with escaped and trimmed data
    let genre = new Genre(
      {name: req.body.name}
    )

    if(!errors.isEmpty()) {
      // there are errors. Render the form again with sanitized values/error message.
      res.render('genre_form', { 
        title: 'Create Genre', 
        genre: genre, 
        errors: errors.array() 
      })
      return
    } else {
      // data from form is valid
      // check if Genre with same name already exists
      Genre
        .findOne({ 'name': req.body.name })
        .exec((err, found_genre) => {
          if(err) {
            return next(err)
          }
          if(found_genre) {
            // Genre exists, redirect to its detail page
            res.redirect(found_genre.url)
          } else {
            genre.save(err => {
              if(err) {
                return next(err)
              }
              res.redirect(genre.url)
            })
          }
        })
    }
  }
]

// 由 GET 显示删除藏书种类的表单
exports.genre_delete_get = (req, res) => {
  async.parallel({
    genre: callback => {
      Genre
        .findById(req.params.id)
        .exec(callback)
    },
    genre_books: callback => {
      Book
        .find({genre: req.params.id})
        .exec(callback)
    }
  }, (err, results) => {
    if(err) {
      return next(err)
    }
    res.render('genre_delete', {
      title: 'Delete Genre',
      genre: results.genre,
      genre_books: results.genre_books
    })
  })
};

// 由 POST 处理藏书种类删除操作
exports.genre_delete_post = (req, res, next) => {
  async.parallel({
    genre: callback => {
      Genre
        .findById(req.body.genreId)
        .exec(callback)
    },
    genre_books: callback => {
      Book
        .find({genre: req.body.genreId})
        .exec(callback)
    }
  }, (err, results) => {
    if(err) {
      return next(err)
    }
    if(results.genre_books.length) {
      res.render('genre_delete', {
        title: 'Delete Genre',
        genre: results.genre,
        genre_books: results.genre_books
      })
    } else {
      Genre.findByIdAndRemove(req.body.genreId, err => {
        if(err) {
          return next(err)
        }
        res.redirect('/catalog/genres')
      })
    }
  }) 
};

// 由 GET 显示更新藏书种类的表单
exports.genre_update_get = (req, res, next) => {
  Genre
    .findById(req.params.id)
    .exec((err, genre) => {
      if(err) {
        return next(err)
      }
      res.render('genre_form', {
        title: 'Update Genre',
        genre
      })
    })
};

// 由 POST 处理藏书种类更新操作
exports.genre_update_post = [
    // validate that the name field is not empty
    body('name', 'Genre name required').isLength({ min: 1 }).trim(),

    // sanitize (trim and escape) the name field
    // trim去除首尾空格，escape转译危险代码注入
    sanitizeBody('name').trim().escape(),

    (req, res, next) => {
      const errors = validationResult(req)
      let genre = new Genre(
        {
          name: req.body.name,
          _id: req.params.id
        },
      )
      if(!errors.isEmpty()) {
        // there are errors. Render the form again with sanitized values/error message.
        res.render('genre_form', { 
          title: 'Create Genre', 
          genre: genre, 
          errors: errors.array() 
        })
        return
      } else {
        Genre
        .findOne({ 'name': req.body.name })
        .exec((err, found_genre) => {
          if(err) {
            return next(err)
          }
          if(found_genre) {
            // Genre exists, redirect to its detail page
            res.redirect(found_genre.url)
          } else {
            Genre.findByIdAndUpdate(req.params.id, genre, {}, (err, theOne) => {
              if(err) {
                return next(err)
              }
              res.redirect(theOne.url)
            })
          }
        })
      }
    }
]