'use strict'

var TextNode = module.exports = function(text) {
  TextNode.super_.call(this)

  this.type = 'TextNode'
  this.allowBreak = true

  this.text     = text
  this.style    = text.style
  this.children = this.text.children.map(function(child) {
    return child.createNode()
  })
}

require('../utils').inherits(TextNode, require('./base'))

TextNode.prototype.mustUpdate = function(cursor) {
  for (var i = 0, len = this.children.length; i < len; ++i) {
    if (this.children[i].mustUpdate(cursor)) {
      return true
    }
  }

  return false
}

TextNode.prototype.endCompute = function(cursor) {
  if (this.children.length) {
    // cursor.y -= this.children[this.children.length - 1].height
  }

  return cursor
}

var LineBreakNode = require('./linebreak')

TextNode.prototype._compute = function(cursor) {
  this.x = cursor.x
  var y = this.y = cursor.y
  this.width  = cursor.width
  this.height = 0

  var line  = []
  var spaceLeft = cursor.width
  var isLastLine = false

  var self = this
  var renderLine = function() {
    if (!line.length) {
      return
    }

    var left = cursor.x

    var height = Math.max.apply(Math, line.map(function(word) {
      return word.word.height
    }))

    var emptySpace = cursor.width - line.map(function(word, i) {
      return word.word.width + (i > 0 ? word.word.spacing : 0)
    }).reduce(function(lhs, rhs) {
      return lhs + rhs
    }, 0)

    var count = line.length
    var spacing = 0

    // alignement
    switch (self.text.style.textAlign) {
      case 'right':
        left += emptySpace
        break
      case 'center':
        left += cursor.width / 2 - (cursor.width - emptySpace) / 2
        break
      case 'justify':
        if (isLastLine && emptySpace / cursor.width > .2) {
          break
        }
        spacing = emptySpace / (count - 1)
        break
    }

    line[0].isFirst = true
    line[line.length - 1].isLast = true

    line.forEach(function(word, i) {
      var width = word.word.width + word.word.spacing + spacing

      var w = word.setBoundingBox(left, cursor.y, width, height)
      left = left
      left += width
    }, this)

    self.height += height
    y -= height

    line.length = 0
    spaceLeft = cursor.width
    isLastLine = false
  }

  this.children.forEach(function(word, i) {
    if (word.type === 'PageBreakNode') {
      return
    } else if (word.type === 'LineBreakNode') {
      isLastLine = true

      if (line.length) {
        renderLine()
      } else {
        word.isEmptyLine = true
        self.height += word.linebreak.height
        y -= word.linebreak.height
      }
      return
    }

    var wordWidth = word.word.width
    if (i > 0) wordWidth += word.word.spacing

    if (line.length > 0 && (spaceLeft - wordWidth) < 0) {
      renderLine()
    }

    spaceLeft -= wordWidth
    line.push(word)
  }, this)

  isLastLine = true
  renderLine()
}

var WordNode = require('./word')

TextNode.prototype.begin = function(doc, parent) {
  doc.BT()
  WordNode.prototype.buildStyle.call(this, doc, parent)
}

TextNode.prototype.end = function(doc) {
  doc.ET()
}