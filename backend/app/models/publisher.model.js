const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')
const aggregatePaginate = require('mongoose-aggregate-paginate-v2')
const mongooseDelete = require('mongoose-delete')

const PublisherSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      minLength: 3,
      maxlength: 40,
      required: true,
      unique: true,
      trim: true
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

PublisherSchema.plugin(mongoosePaginate)
PublisherSchema.plugin(aggregatePaginate)
PublisherSchema.plugin(mongooseDelete, { overrideMethods: 'all' })

module.exports = mongoose.model('Publisher', PublisherSchema)
