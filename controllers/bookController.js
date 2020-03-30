var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookInstance');
const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var async = require('async');

exports.index = (req, res, next) => {   
    async.parallel({
        book_count: function(callback) {
            Book.count({}, callback); // Pass an empty object as match condition to find all documents of this collection
        },
        book_instance_count: function(callback) {
            BookInstance.count({}, callback);
        },
        book_instance_available_count: function(callback) {
            BookInstance.count({status:'Available'}, callback);
        },
        author_count: function(callback) {
            Author.count({}, callback);
        },
        genre_count: function(callback) {
            Genre.count({}, callback);
        },
    }, function(err, results) {
        res.render('index', { title: 'Local Library Home', error: err, data: results });
    });
};

// 显示完整的藏书列表
exports.book_list = (req, res, next) => {
  Book.find({}, 'title author')
    .populate('author')
    .exec(function (err, list_books) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('book_list', { title: 'Book List', book_list: list_books });
    });
    
};

// 为每种藏书显示详细信息的页面
exports.book_detail = (req, res, next) => {
  async.parallel({
    book: callback => {
      Book.findById(req.params.id)
      .populate('author')
      .populate('genre')
      .exec(callback)
    },
    book_instance: callback => {
      BookInstance
        .find({book: req.params.id})
        .exec(callback)
    }
  },(err,results) => {
    if(err){
      return next(err)
    }
    if(results.book == null){
      const err = new Error('Book not found')
      err.status = 404
      return next(err)
    }
    res.render('book_detail',{title: 'Title', book: results.book, book_instances: results.book_instance})
  })
};

// 由 GET 显示创建藏书的表单
exports.book_create_get = (req, res, next) => {
 // get all authors and genres, which we can use for adding to our book
 async.parallel({
   authors: callback => {
     Author.find(callback)
   },
   genres: callback => {
     Genre.find(callback)
   }
 }, (err, results) => {
   if(err) {
     return next(err)
   }
   res.render('book_form', {
     title: 'Create Book', 
     authors: results.authors, 
     genres: results.genres,
    })
 })
};

// 由 POST 处理藏书创建操作
exports.book_create_post = [
  // convert the genre to an array
  (req, res, next) => {
    if(!(req.body.genre instanceof Author)) {
      if(typeof req.body.genre === 'undefined') {
        req.body.genre = []
      } else {
        req.body.genre = new Array(req.body.genre)
      }  
    }
    next()
  },

  // validate fields
  body('title', 'Title must not be empty.').isLength({ min: 1 }).trim(),
  body('author', 'Author must not be empty.').isLength({ min: 1 }).trim(),
  body('summary', 'Summary must not be empty.').isLength({ min: 1 }).trim(),
  body('isbn', 'ISBN must not be empty').isLength({ min: 1 }).trim(),

  // sanitize fields (using wildcard)
  sanitizeBody('*').trim().escape(),
  sanitizeBody('genre.*').escape(),

  // process request after validation and sanitization
  (req, res, next) => {
    // extract the validation errors from a request
    const errors = validationResult(req)

    // create a book object with escaped and trimmed data
    const { title, author, summary, isbn, genre } = req.body
    let book = new Book({
      title,
      author,
      summary,
      isbn,
      genre
    })

    if(!errors.isEmpty()) {
      // There are errors, render form again with sanitized values/error messages.
      // get all authors and genres from form.
      async.parallel({
        authors: callback => {
          Author.find(callback)
        },
        genres: callback => {
          Genre.find(callback)
        }
      }, (err, results) => {
        if(err) {
          return next(err)
        }
        // mark our selected genres as checked.
        results.genres = results.genres.map(genre => {
          if(book.genre.includes(genre._id)) {
            genre.checked = true
          } 
        })
        res.render('book_form', {
          title: 'Create Book',
          authors: results.authors,
          genres: results.genres,
          book: book,
          errors: errors.array(),
        })
      })
      return
    } else {
      // data from form is valid, save book.
      book.save(err => {
        if(err) {
          return next(err)
        }
        // successful - redirect to new book record.
        res.redirect(book.url)
      })
    }
  }
]

// 由 GET 显示删除藏书的表单
exports.book_delete_get = (req, res, next) => {
  async.parallel({
    book: callback => {
      Book
        .findById(req.params.id)
        .exec(callback)
    },
    book_bookInstances: callback => {
      BookInstance
        .find({book: req.params.id})
        .exec(callback)
    }
  }, (err, results) => {
    if(err) {
      return next(err)
    }
    if(results.book == null) {
      res.redirect('/catalog/books')
    }
    res.render('book_delete', {
      title: 'Delete Book',
      book: results.book,
      book_bookInstances: results.book_bookInstances
    })
  })
};

// 由 POST 处理藏书删除操作
exports.book_delete_post = (req, res, next) => {
  async.parallel({
    book: callback => {
      Book
        .findById(req.body.bookId)
        .exec(callback)
    },
    book_bookInstances: callback => {
      BookInstance
        .find({book: req.body.bookId})
        .exec(callback)
    }
  }, (err, results) => {
    if(err) {
      return next(err)
    }
    if(results.book_bookInstances.length) {
      res.render('book_delete', {
        title: 'Delete Book',
        book: results.book,
        book_bookInstances: results.book_bookInstances
      })
      return
    } else {
      Book.findByIdAndRemove(req.body.bookId, err => {
        if(err) {
          return next(err)
        }
        res.redirect('/catalog/books')
      })
    }
  })
};

// 由 GET 显示更新藏书的表单
exports.book_update_get = (req, res, next) => {
  // get book, authors and genres for form.
  async.parallel({
    book: callback => {
      Book
        .findById(req.params.id)
        .populate('author')
        .populate('genre')
        .exec(callback)
    },
    authors: callback => {
      Author.find(callback)
    },
    genres: callback => {
      Genre.find(callback)
    }
  }, (err, results) => {
    if(err) {
      return next(err)
    }
    if(results.book == null) {
      // no results
      let err = new Error('Book not found')
      err.status = 404
      return next(err)
    }
    // success
    // mark our selected genres as checked.
    results.genres = results.genres.map(genre => {
      if(results.book.genre.some(item => item._id.toString() === genre._id.toString())) {
        genre.checked = true
      }
      return genre
    })
    
    res.render('book_form', {
      title: 'Update Book',
      authors: results.authors,
      genres: results.genres,
      book: results.book
    })
  })
};

// 由 POST 处理藏书更新操作
exports.book_update_post = [
  // conver the genre to an array
  (req, res, next) => {
    if(!(req.body.genre instanceof Array)) {
      if(typeof req.body.genre === 'undefined') {
        req.body.genre = []
      } else {
        req.body.genre = new Array(req.body.genre)
      }
    }
    next()
  },

  // validate fields
  body('title', 'Title must not be empty.').isLength({ min: 1 }).trim(),
  body('author', 'Author must not be empty.').isLength({ min: 1 }).trim(),
  body('summary', 'Summary must not be empty.').isLength({ min: 1 }).trim(),
  body('isbn', 'ISBN must not be empty').isLength({ min: 1 }).trim(),

  // sanitize fields
  sanitizeBody('title').trim().escape(),
  sanitizeBody('author').trim().escape(), 
  sanitizeBody('summary').trim().escape(),
  sanitizeBody('isbn').trim().escape(),
  sanitizeBody('genre.*').trim().escape(),

  // process request after validation and sanitization.
  (req, res, next) => {
    // extract the validation errors from a request.
    const errors = validationResult(req)

    // create a Book object with escaped/trimmed data and old id.
    const { title, author, summary, isbn, genre } = req.body
    let book = new Book(
      {
        title,
        author,
        summary,
        isbn,
        genre: (typeof req.body.genre === 'undefined') ? [] : genre,
        _id: req.params.id, // this is required, or a new ID will be assigned!
      }
    )
    if(!errors.isEmpty()) {
      // there are errors, render form again with sanitized values/errors message.
      // get all authors and genres for form.
      async.parallel({
        authors: callback => {
          Author.find(callback)
        },
        genres: callback => {
          Genre.find(callback)
        }
      }, (err, results) => {
        if(err) {
          return next(err)
        }
        // mark out selected genres as checked.
        results.genres = results.genres.map(genre => {
          if(book.genre.includes(genre._id)) {
            genre.checked = true
          }
          return genre
        })
        res.render('book_form', {
          title: 'Update Book',
          authors: results.authors,
          genres: results.genres,
          book,
          errors: errors.array()
        })
      })
      return
    } else {
      // data from form is valid, update the record.
      Book.findByIdAndUpdate(req.params.id, book, {}, (err, theBook) => {
        if(err) {
          return next(err)
        }
        // successful - redirect to book detail page.
        res.redirect(theBook.url)
      })
    }
  }
]