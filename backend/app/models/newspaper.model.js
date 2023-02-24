const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')
const aggregatePaginate = require('mongoose-aggregate-paginate-v2')
const mongooseDelete = require('mongoose-delete')

const NewspaperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      minLength: 3,
      maxlength: 40,
      required: true,
      unique: true,
      trim: true
    },
    id: {
      type: Number
    },
    isPaymentCompany: {
      type: Boolean,
      default: false,
      index: true
    },
    link: {
      type: String
    },
    languages: {
      type: Array
    },
    abstract: {
      type: String
    },
    publisherId: {
      type: Number
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

NewspaperSchema.plugin(mongoosePaginate)
NewspaperSchema.plugin(aggregatePaginate)
NewspaperSchema.plugin(mongooseDelete, { overrideMethods: 'all' })

module.exports = mongoose.model('Newspaper', NewspaperSchema)
